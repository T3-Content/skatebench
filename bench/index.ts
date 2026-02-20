import {
  modelsToRun,
  type RunnableModel,
  MAX_CONCURRENCY,
  TEST_RUNS_PER_MODEL,
  TIMEOUT_SECONDS,
  OUTPUT_DIRECTORY,
  STAGGER_DELAY_MS,
} from "./constants";
import { generateText } from "ai";
import { mkdir, writeFile, readdir, readFile as fsReadFile } from "fs/promises";
import { existsSync } from "fs";
import { join, basename, extname, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

export type TestCase = {
  prompt: string;
  answers: string[];
  negative_answers?: string[];
};

export type TestSuite = {
  id?: string;
  name: string;
  description?: string;
  system_prompt: string;
  tests: TestCase[];
};

type WorkItem = {
  model: RunnableModel;
  system_prompt: string;
  prompt: string;
  answers: string[];
  negative_answers?: string[];
  originalTestIndex: number;
};

type PreviousResultEntry = {
  model: string;
  prompt: string;
  expectedAnswers: string[];
  negativeAnswers?: string[];
  text: string;
  correct?: boolean;
  duration?: number;
  cost?: number;
  completionTokens?: number;
  sourceFile: string;
  systemPrompt?: string;
};

export type RunnerPlanEvent = {
  type: "plan";
  totals: Record<string, { total: number; execute: number; reuse: number }>;
};

export type RunnerStartEvent = {
  type: "start";
  model: string;
};

export type RunnerDoneEvent = {
  type: "done";
  model: string;
  duration: number;
  correct: boolean;
  cost: number;
  completionTokens: number;
};

export type RunnerErrorEvent = {
  type: "error";
  model: string;
  duration: number;
  error: string;
};

export type RunnerReuseEvent = {
  type: "reuse";
  model: string;
  duration: number;
  correct: boolean;
  cost: number;
  completionTokens: number;
};

export type RunnerEvent =
  | RunnerPlanEvent
  | RunnerStartEvent
  | RunnerDoneEvent
  | RunnerErrorEvent
  | RunnerReuseEvent;

function computeSuiteId(
  suiteFilePathOrId: string | undefined,
  suiteName: string
) {
  if (suiteFilePathOrId && suiteFilePathOrId.trim().length > 0)
    return suiteFilePathOrId;
  return suiteName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function computeTestSignature(input: {
  system_prompt: string;
  prompt: string;
  answers: string[];
  negative_answers?: string[];
}) {
  const normalized = {
    system_prompt: input.system_prompt.trim(),
    prompt: input.prompt.trim(),
    answers: [...input.answers].map((a) => a.trim().toLowerCase()).sort(),
    negative_answers: (input.negative_answers || [])
      .map((a) => a.trim().toLowerCase())
      .sort(),
  };
  return JSON.stringify(normalized);
}

function signatureHash(signature: string) {
  return createHash("sha1").update(signature).digest("hex").slice(0, 12);
}

function safeFilename(str: string) {
  return str.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isCorrect(input: {
  answers: string[];
  negative_answers?: string[];
  result: string;
}) {
  const resultLower = input.result.toLowerCase();

  if (input.negative_answers) {
    if (
      input.negative_answers.some((answer) =>
        resultLower.includes(answer.toLowerCase())
      )
    ) {
      return false;
    }
  }
  return input.answers.some((answer) =>
    resultLower.includes(answer.toLowerCase())
  );
}

async function runTest(input: {
  model: RunnableModel;
  system_prompt: string;
  prompt: string;
  answers: string[];
  negative_answers?: string[];
  originalTestIndex: number;
  silent?: boolean;
}) {
  const { model, system_prompt, prompt, answers, negative_answers, silent } =
    input;

  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Test timeout")),
      TIMEOUT_SECONDS * 1000
    );
  });

  async function internal__testRun() {
    const testResult = await generateText({
      model: model.llm,
      system: system_prompt,
      prompt,

      temperature: 1.0,
      providerOptions: {
        ...model.providerOptions,
        // openrouter: {
        //   reasoning: {
        //     max_tokens: 2048,
        //   },
        // },
        // xai: {
        //   reasoningEffort: "high",
        // },
      },
    });

    const correctness = isCorrect({
      answers,
      negative_answers,
      result: testResult.text,
    });

    let cost = 0;
    if (testResult.providerMetadata) {
      console.log("PROVIDER METADATA", testResult.providerMetadata);
      const openrouterMeta = testResult.providerMetadata.openrouter as any;
      if (openrouterMeta?.usage) {
        // Add upstream cost for when we BYOK
        if (openrouterMeta.usage.costDetails?.upstreamInferenceCost) {
          cost += openrouterMeta.usage.costDetails.upstreamInferenceCost;
        } else if (openrouterMeta.usage.cost) {
          cost += openrouterMeta.usage.cost;
        } else {
          // console.log("No usage data found from OpenRouter", openrouterMeta);
        }
      } else {
        // console.log("USAGE DATA?", testResult.providerMetadata.openrouter);
      }
    }

    // Get completion tokens - prefer provider-specific metadata if available
    let completionTokens = testResult.usage?.outputTokens ?? 0;
    if (testResult.providerMetadata?.google) {
      const googleMeta = testResult.providerMetadata.google as any;
      if (
        googleMeta?.usageMetadata?.candidatesTokenCount &&
        googleMeta?.usageMetadata?.thoughtsTokenCount
      ) {
        completionTokens =
          googleMeta.usageMetadata.candidatesTokenCount +
          googleMeta.usageMetadata.thoughtsTokenCount;
      }
    }

    return {
      model: model.name,
      prompt,
      result: testResult,
      correct: correctness,
      cost,
      completionTokens,
    };
  }

  try {
    const result = await Promise.race([internal__testRun(), timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return result;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    if (!silent) console.error(`Test failed for model ${model.name}:`, error);
    throw error;
  }
}

function extractTextFromStoredResult(resultObj: any): string | undefined {
  if (!resultObj) return undefined;
  if (typeof resultObj.text === "string") return resultObj.text;
  if (resultObj.result && typeof resultObj.result.text === "string")
    return resultObj.result.text;
  return undefined;
}

async function findPreviousResultsForSuite(options: {
  suiteId: string;
  suite: TestSuite;
  version?: string;
}): Promise<Map<string, PreviousResultEntry[]>> {
  const { suiteId, suite, version } = options;
  const resultsRoot = OUTPUT_DIRECTORY;
  const map = new Map<string, PreviousResultEntry[]>();

  async function walk(dir: string): Promise<string[]> {
    const acc: string[] = [];
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          acc.push(...(await walk(full)));
        } else if (
          entry.isFile() &&
          entry.name.endsWith(".json") &&
          !entry.name.startsWith("summary-")
        ) {
          acc.push(full);
        }
      }
    } catch {}
    return acc;
  }

  const suiteDirForVersion = join(
    resultsRoot,
    suiteId,
    version || "unversioned"
  );

  const discoveredJsonFiles = new Set<string>();
  {
    const files = await walk(suiteDirForVersion).catch(() => []);
    files.forEach((f) => discoveredJsonFiles.add(f));
  }

  for (const file of discoveredJsonFiles) {
    try {
      const raw = await fsReadFile(file, "utf-8");
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.results || !Array.isArray(parsed.results))
        continue;

      const suiteNameInFile: string | undefined = parsed.metadata?.testSuite;
      const versionInFile: string | null = parsed.metadata?.version ?? null;
      if (suiteNameInFile && suiteNameInFile !== suite.name) continue;
      if ((version || null) !== versionInFile) continue;

      for (const r of parsed.results) {
        const prompt: string | undefined = r.prompt;
        const expectedAnswers: string[] | undefined = r.expectedAnswers;
        const negativeAnswers: string[] | undefined =
          r.negativeAnswers || r.negative_answers;
        const model: string | undefined = r.model;
        const text = extractTextFromStoredResult(r.result);
        if (!prompt || !expectedAnswers || !model || !text) continue;

        const signature = computeTestSignature({
          system_prompt: suite.system_prompt,
          prompt,
          answers: expectedAnswers,
          negative_answers: negativeAnswers,
        });

        const entry: PreviousResultEntry = {
          model,
          prompt,
          expectedAnswers,
          negativeAnswers,
          text,
          correct: r.result?.correct ?? r.correct,
          duration: r.duration,
          cost: r.cost,
          completionTokens: r.completionTokens,
          sourceFile: file,
        };
        const list = map.get(signature) || [];
        list.push(entry);
        map.set(signature, list);
      }
    } catch {}
  }

  // Also include per-run cache files, namespaced by version
  const cacheDir = join(
    resultsRoot,
    "cache",
    suiteId,
    version || "unversioned"
  );
  const cacheFiles = await walk(cacheDir).catch(() => []);
  for (const file of cacheFiles) {
    try {
      const raw = await fsReadFile(file, "utf-8");
      const parsed = JSON.parse(raw);

      const model: string | undefined = parsed.model;
      const prompt: string | undefined = parsed.prompt;
      const expectedAnswers: string[] | undefined =
        parsed.answers || parsed.expectedAnswers;
      const negativeAnswers: string[] | undefined =
        parsed.negative_answers || parsed.negativeAnswers;
      const systemPrompt: string | undefined =
        parsed.system_prompt || parsed.systemPrompt;
      const text = extractTextFromStoredResult(parsed.result) || parsed.text;

      // Skip non-usable entries (e.g., errors or missing fields)
      if (!model || !prompt || !expectedAnswers || !text) continue;

      const signature = computeTestSignature({
        system_prompt: systemPrompt || suite.system_prompt,
        prompt,
        answers: expectedAnswers,
        negative_answers: negativeAnswers,
      });

      // Safety: if the cache contains system prompt and it differs from the current suite, surface an error
      if (systemPrompt && systemPrompt !== suite.system_prompt) {
        throw new Error(
          `Cached entry system prompt mismatch for ${basename(
            file
          )}. Expected current suite system prompt. Delete '${join(
            resultsRoot,
            "cache",
            suiteId,
            version || "unversioned"
          )}' to reset cache.`
        );
      }

      const entry: PreviousResultEntry = {
        model,
        prompt,
        expectedAnswers,
        negativeAnswers,
        text,
        correct: parsed.result?.correct ?? parsed.correct,
        duration: parsed.duration,
        cost: parsed.cost,
        completionTokens: parsed.completionTokens,
        sourceFile: file,
        systemPrompt,
      };
      const list = map.get(signature) || [];
      list.push(entry);
      map.set(signature, list);
    } catch (e) {
      // If a mismatch error was thrown above, rethrow to stop the run
      if (e instanceof Error) throw e;
      // Otherwise ignore malformed cache files
    }
  }

  return map;
}

function generateMarkdownReport(
  results: Array<{
    model: string;
    testIndex: number;
    runNumber: number;
    prompt: string;
    expectedAnswers: string[];
    negativeAnswers?: string[];
    result?: any;
    error?: string;
    duration: number;
  }>,
  metadata: any,
  suite: TestSuite
): string {
  let markdown = `# ${metadata.testSuite} - Test Results\n\n`;

  markdown += `**Date:** ${new Date(metadata.timestamp).toLocaleString()}\n`;
  markdown += `**Version:** ${metadata.version || "(none)"}\n`;
  markdown += `**Total Tests:** ${metadata.totalTests}\n`;
  markdown += `**Successful:** ${metadata.successful}\n`;
  markdown += `**Failed:** ${metadata.failed}\n`;
  markdown += `**Models:** ${metadata.models.join(", ")}\n\n`;

  const testGroups = results.reduce((acc, result) => {
    if (!acc[result.testIndex]) {
      acc[result.testIndex] = [];
    }
    acc[result.testIndex].push(result);
    return acc;
  }, {} as Record<number, typeof results>);

  Object.entries(testGroups)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .forEach(([testIndex, testResults]) => {
      const firstResult = testResults[0];

      markdown += `## Test ${parseInt(testIndex) + 1}\n\n`;
      markdown += `**Prompt:** "${firstResult.prompt}"\n\n`;
      markdown += `**Expected answers:** ${firstResult.expectedAnswers
        .map((a) => `"${a}"`)
        .join(", ")}\n\n`;

      const testData = suite.tests[parseInt(testIndex)];
      if (testData.negative_answers && testData.negative_answers.length > 0) {
        markdown += `**Negative answers (automatic fail):** ${testData.negative_answers
          .map((a) => `"${a}"`)
          .join(", ")}\n\n`;
      }

      const sortedResults = testResults.sort((a, b) => {
        if (a.model !== b.model) {
          return a.model.localeCompare(b.model);
        }
        return a.runNumber - b.runNumber;
      });

      sortedResults.forEach((result) => {
        if (result.error) {
          markdown += `**${result.model} answer ${result.runNumber}:** ❌ Error: ${result.error}\n\n`;
        } else if (result.result) {
          const rawAnswer =
            result.result.text ||
            result.result.result?.text ||
            "No text response";
          const answer = rawAnswer.trim().replace(/\s+/g, " ");
          const isCorrect = result.result.correct || false;
          const status = isCorrect ? "✅" : "❌";
          markdown += `**${result.model} answer ${result.runNumber}:** ${status} "${answer}"\n\n`;
        }
      });

      markdown += "---\n\n";
    });

  return markdown;
}

export type TestRunnerOptions = {
  suite: TestSuite;
  suiteFilePath?: string;
  version?: string;
  onEvent?: (event: RunnerEvent) => void;
  silent?: boolean;
};

async function writeCacheEntry(params: {
  suiteId: string;
  suiteName: string;
  version?: string;
  model: string;
  runNumber: number;
  testIndex: number;
  system_prompt: string;
  prompt: string;
  answers: string[];
  negative_answers?: string[];
  duration: number;
  cost: number;
  completionTokens: number;
  result?: { text?: string; correct?: boolean };
}) {
  const {
    suiteId,
    suiteName,
    version,
    model,
    runNumber,
    testIndex,
    system_prompt,
    prompt,
    answers,
    negative_answers,
    duration,
    cost,
    completionTokens,
    result,
  } = params;

  const signature = computeTestSignature({
    system_prompt,
    prompt,
    answers,
    negative_answers,
  });
  const sigHash = signatureHash(signature);

  const dir = join(
    OUTPUT_DIRECTORY,
    "cache",
    suiteId,
    version || "unversioned"
  );
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${safeFilename(
    model
  )}__run${runNumber}__${sigHash}__${ts}.json`;
  const filePath = join(dir, filename);

  const payload = {
    cacheVersion: 1,
    timestamp: new Date().toISOString(),
    suiteId,
    suiteName,
    version: version || null,
    model,
    runNumber,
    testIndex,
    system_prompt,
    prompt,
    answers,
    negative_answers,
    duration,
    cost,
    completionTokens,
    signature,
    result: result ? { text: result.text, correct: result.correct } : undefined,
  };

  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
  return filePath;
}

export async function testRunner(options: TestRunnerOptions) {
  const { suite, suiteFilePath, version, onEvent, silent } = options;
  const suiteId = computeSuiteId(
    suite.id ||
      (suiteFilePath
        ? basename(suiteFilePath, extname(suiteFilePath))
        : undefined),
    suite.name
  );

  if (!silent)
    console.log(
      `Starting test runner for suite "${suite.name}" (id: ${suiteId}) with ${suite.tests.length} tests, ${modelsToRun.length} models, ${TEST_RUNS_PER_MODEL} runs each`
    );
  if (!silent)
    console.log(
      `Concurrency limit: ${MAX_CONCURRENCY}, Timeout: ${TIMEOUT_SECONDS}s, Version: ${
        version || "(none)"
      }`
    );

  const workQueue: WorkItem[] = [];

  suite.tests.forEach((test, testIndex) => {
    modelsToRun.map((model) => {
      workQueue.push({
        model,
        system_prompt: suite.system_prompt,
        prompt: test.prompt,
        answers: test.answers,
        negative_answers: test.negative_answers,
        originalTestIndex: testIndex,
      });
    });
  });

  type TestRun = {
    type: "execute" | "reuse";
    model: RunnableModel;
    system_prompt: string;
    prompt: string;
    answers: string[];
    negative_answers?: string[];
    runNumber: number;
    testIndex: number;
    reuseFrom?: PreviousResultEntry;
  };

  const previousMap = await findPreviousResultsForSuite({
    suiteId,
    suite,
    version,
  });

  const results: Array<{
    model: string;
    testIndex: number;
    runNumber: number;
    prompt: string;
    expectedAnswers: string[];
    negativeAnswers?: string[];
    result?: any;
    error?: string;
    duration: number;
    cost: number;
    completionTokens: number;
  }> = [];

  const itemsByTest = workQueue.reduce((acc, item) => {
    const idx = item.originalTestIndex;
    (acc[idx] ||= []).push(item);
    return acc;
  }, {} as Record<number, WorkItem[]>);

  const planTotals: Record<
    string,
    { total: number; execute: number; reuse: number }
  > = {};
  for (const m of modelsToRun)
    planTotals[m.name] = { total: 0, execute: 0, reuse: 0 };
  const sortedTestIndicesForPlan = Object.keys(itemsByTest)
    .map((k) => parseInt(k))
    .sort((a, b) => a - b);
  for (const testIndex of sortedTestIndicesForPlan) {
    const items = itemsByTest[testIndex]!;
    for (const item of items) {
      const signature = computeTestSignature({
        system_prompt: item.system_prompt,
        prompt: item.prompt,
        answers: item.answers,
        negative_answers: item.negative_answers,
      });
      const prev = previousMap.get(signature) || [];
      const prevForModel = prev.filter((p) => p.model === item.model.name);
      const reuseCount = Math.min(TEST_RUNS_PER_MODEL, prevForModel.length);
      const executeCount = TEST_RUNS_PER_MODEL - reuseCount;
      planTotals[item.model.name].total += TEST_RUNS_PER_MODEL;
      planTotals[item.model.name].reuse += reuseCount;
      planTotals[item.model.name].execute += executeCount;
    }
  }
  onEvent?.({ type: "plan", totals: planTotals });

  async function processJobQueue(jobQueue: TestRun[]) {
    async function worker(): Promise<void> {
      while (jobQueue.length > 0) {
        const testRun = jobQueue.shift();
        if (!testRun) break;

        const startTime = Date.now();

        try {
          if (testRun.type === "reuse" && testRun.reuseFrom) {
            // Safety check: ensure cached entry matches current test definition
            const r = testRun.reuseFrom;
            if (
              r.systemPrompt &&
              (r.systemPrompt !== testRun.system_prompt ||
                r.prompt !== testRun.prompt ||
                JSON.stringify(r.expectedAnswers) !==
                  JSON.stringify(testRun.answers) ||
                JSON.stringify(r.negativeAnswers || []) !==
                  JSON.stringify(testRun.negative_answers || []))
            ) {
              throw new Error(
                `Cached result mismatch for model ${r.model} test ${
                  testRun.testIndex + 1
                }.${testRun.runNumber} from ${basename(r.sourceFile)}`
              );
            }

            const duration =
              (testRun.reuseFrom?.duration ?? 0) || Date.now() - startTime;
            const reused = testRun.reuseFrom;
            const text = reused.text;
            const correct = isCorrect({
              answers: testRun.answers,
              negative_answers: testRun.negative_answers,
              result: text,
            });

            results.push({
              model: reused.model,
              testIndex: testRun.testIndex,
              runNumber: testRun.runNumber,
              prompt: testRun.prompt,
              expectedAnswers: testRun.answers,
              negativeAnswers: testRun.negative_answers,
              result: {
                text,
                correct,
                reused: true,
                sourceFile: reused.sourceFile,
              },
              duration,
              cost: reused.cost || 0,
              completionTokens: reused.completionTokens || 0,
            });

            onEvent?.({
              type: "reuse",
              model: reused.model,
              duration,
              correct,
              cost: reused.cost || 0,
              completionTokens: reused.completionTokens || 0,
            });
            if (!silent)
              console.log(
                `↺ Reused result for test ${testRun.testIndex + 1}.${
                  testRun.runNumber
                } on ${reused.model} from ${basename(reused.sourceFile)}`
              );
          } else {
            onEvent?.({ type: "start", model: testRun.model.name });
            if (!silent)
              console.log(
                `Running test ${testRun.testIndex + 1}.${
                  testRun.runNumber
                } for ${testRun.model.name}`
              );
            const runResult = await runTest({
              model: testRun.model,
              system_prompt: testRun.system_prompt,
              prompt: testRun.prompt,
              answers: testRun.answers,
              negative_answers: testRun.negative_answers,
              originalTestIndex: testRun.testIndex,
              silent,
            });
            const duration = Date.now() - startTime;

            results.push({
              model: testRun.model.name,
              testIndex: testRun.testIndex,
              runNumber: testRun.runNumber,
              prompt: testRun.prompt,
              expectedAnswers: testRun.answers,
              negativeAnswers: testRun.negative_answers,
              result: runResult,
              duration,
              cost: (runResult as any).cost || 0,
              completionTokens: (runResult as any).completionTokens || 0,
            });

            // Write to per-run cache immediately
            try {
              await writeCacheEntry({
                suiteId,
                suiteName: suite.name,
                version,
                model: testRun.model.name,
                runNumber: testRun.runNumber,
                testIndex: testRun.testIndex,
                system_prompt: testRun.system_prompt,
                prompt: testRun.prompt,
                answers: testRun.answers,
                negative_answers: testRun.negative_answers,
                duration,
                cost: (runResult as any).cost || 0,
                completionTokens: (runResult as any).completionTokens || 0,
                result: {
                  text:
                    (runResult as any).result?.text || (runResult as any).text,
                  correct: (runResult as any).correct,
                },
              });
            } catch (e) {
              if (!silent)
                console.warn(
                  `Failed to write cache for ${testRun.model.name} test ${
                    testRun.testIndex + 1
                  }.${testRun.runNumber}:`,
                  e
                );
            }

            onEvent?.({
              type: "done",
              model: testRun.model.name,
              duration,
              correct: (runResult as any).correct ?? false,
              cost: (runResult as any).cost || 0,
              completionTokens: (runResult as any).completionTokens || 0,
            });
            if (!silent)
              console.log(
                `✓ Completed test ${testRun.testIndex + 1}.${
                  testRun.runNumber
                } for ${testRun.model.name} in ${duration}ms`
              );
          }
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          results.push({
            model: testRun.model.name,
            testIndex: testRun.testIndex,
            runNumber: testRun.runNumber,
            prompt: testRun.prompt,
            expectedAnswers: testRun.answers,
            negativeAnswers: testRun.negative_answers,
            error: errorMessage,
            duration,
            cost: 0,
            completionTokens: 0,
          });

          // Note: Errors are NOT cached so they will be retried on next run

          onEvent?.({
            type: "error",
            model: testRun.model.name,
            duration,
            error: errorMessage,
          });
          if (!silent)
            console.log(
              `✗ Failed test ${testRun.testIndex + 1}.${
                testRun.runNumber
              } for ${testRun.model.name}: ${errorMessage}`
            );
        } finally {
        }
      }
    }

    const workerCount = Math.min(MAX_CONCURRENCY, jobQueue.length);
    const workers = Array.from({ length: workerCount }, (_, i) =>
      new Promise<void>((resolve) =>
        setTimeout(() => resolve(), i * STAGGER_DELAY_MS)
      ).then(() => worker())
    );

    await Promise.all(workers);
  }

  const sortedTestIndices = Object.keys(itemsByTest)
    .map((k) => parseInt(k))
    .sort((a, b) => a - b);

  // Pre-build separate queues for cached (reuse) vs fresh (execute)
  const reuseJobs: TestRun[] = [];
  const executeJobs: TestRun[] = [];

  for (const testIndex of sortedTestIndices) {
    const items = itemsByTest[testIndex]!;

    for (const item of items) {
      const signature = computeTestSignature({
        system_prompt: item.system_prompt,
        prompt: item.prompt,
        answers: item.answers,
        negative_answers: item.negative_answers,
      });
      const prev = previousMap.get(signature) || [];
      const prevForModel = prev.filter((p) => p.model === item.model.name);

      const reuseCount = Math.min(TEST_RUNS_PER_MODEL, prevForModel.length);
      for (let i = 1; i <= reuseCount; i++) {
        reuseJobs.push({
          type: "reuse",
          model: item.model,
          system_prompt: item.system_prompt,
          prompt: item.prompt,
          answers: item.answers,
          negative_answers: item.negative_answers,
          runNumber: i,
          testIndex,
          reuseFrom: prevForModel[i - 1],
        });
      }
      for (let i = reuseCount + 1; i <= TEST_RUNS_PER_MODEL; i++) {
        executeJobs.push({
          type: "execute",
          model: item.model,
          system_prompt: item.system_prompt,
          prompt: item.prompt,
          answers: item.answers,
          negative_answers: item.negative_answers,
          runNumber: i,
          testIndex,
        });
      }
    }
  }

  // Sort to provide a fair interleave: by run number, then test index, then model name
  const fairSort = (a: TestRun, b: TestRun) => {
    if (a.runNumber !== b.runNumber) return a.runNumber - b.runNumber;
    if (a.testIndex !== b.testIndex) return a.testIndex - b.testIndex;
    if (a.model.name !== b.model.name)
      return a.model.name.localeCompare(b.model.name);
    return 0;
  };
  reuseJobs.sort(fairSort);
  executeJobs.sort(fairSort);

  // Preload all reuse jobs before starting any execution
  if (reuseJobs.length > 0) {
    if (!silent)
      console.log(
        `Preloading ${reuseJobs.length} cached result${
          reuseJobs.length === 1 ? "" : "s"
        }…`
      );
    for (const testRun of reuseJobs) {
      const startTime = Date.now();
      try {
        const r = testRun.reuseFrom!;
        // Safety check: ensure cached entry matches current test definition
        if (
          r.systemPrompt &&
          (r.systemPrompt !== testRun.system_prompt ||
            r.prompt !== testRun.prompt ||
            JSON.stringify(r.expectedAnswers) !==
              JSON.stringify(testRun.answers) ||
            JSON.stringify(r.negativeAnswers || []) !==
              JSON.stringify(testRun.negative_answers || []))
        ) {
          throw new Error(
            `Cached result mismatch for model ${r.model} test ${
              testRun.testIndex + 1
            }.${testRun.runNumber} from ${basename(r.sourceFile)}`
          );
        }

        const duration = (r.duration ?? 0) || Date.now() - startTime;
        const text = r.text;
        const correct = isCorrect({
          answers: testRun.answers,
          negative_answers: testRun.negative_answers,
          result: text,
        });

        results.push({
          model: r.model,
          testIndex: testRun.testIndex,
          runNumber: testRun.runNumber,
          prompt: testRun.prompt,
          expectedAnswers: testRun.answers,
          negativeAnswers: testRun.negative_answers,
          result: {
            text,
            correct,
            reused: true,
            sourceFile: r.sourceFile,
          },
          duration,
          cost: r.cost || 0,
          completionTokens: r.completionTokens || 0,
        });

        onEvent?.({
          type: "reuse",
          model: r.model,
          duration,
          correct,
          cost: r.cost || 0,
          completionTokens: r.completionTokens || 0,
        });
        if (!silent)
          console.log(
            `↺ Reused result for test ${testRun.testIndex + 1}.${
              testRun.runNumber
            } on ${r.model} from ${basename(r.sourceFile)}`
          );
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        results.push({
          model: testRun.model.name,
          testIndex: testRun.testIndex,
          runNumber: testRun.runNumber,
          prompt: testRun.prompt,
          expectedAnswers: testRun.answers,
          negativeAnswers: testRun.negative_answers,
          error: errorMessage,
          duration,
          cost: 0,
          completionTokens: 0,
        });

        // Note: Errors are NOT cached so they will be retried on next run

        onEvent?.({
          type: "error",
          model: testRun.model.name,
          duration,
          error: errorMessage,
        });
        if (!silent)
          console.log(
            `✗ Failed test ${testRun.testIndex + 1}.${testRun.runNumber} for ${
              testRun.model.name
            }: ${errorMessage}`
          );
      }
    }
  }

  if (!silent)
    console.log(
      `Scheduling ${executeJobs.length} execution${
        executeJobs.length === 1 ? "" : "s"
      } across ${suite.tests.length} tests and ${modelsToRun.length} models`
    );

  await processJobQueue(executeJobs);

  if (!silent)
    console.log(`\nTest runner completed. Total results: ${results.length}`);

  const correct = results.filter((r) => !r.error && r.result?.correct).length;
  const incorrect = results.filter(
    (r) => !r.error && !r.result?.correct
  ).length;
  const errors = results.filter((r) => r.error).length;
  if (!silent)
    console.log(
      `Correct: ${correct}, Incorrect: ${incorrect}, Errors: ${errors}`
    );

  try {
    const suiteDir = join(OUTPUT_DIRECTORY, suiteId, version || "unversioned");
    if (!existsSync(suiteDir)) {
      await mkdir(suiteDir, { recursive: true });
      if (!silent) console.log(`Created output directory: ${suiteDir}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `test-results-${timestamp}.json`;
    const filepath = join(suiteDir, filename);

    const outputData = {
      metadata: {
        timestamp: new Date().toISOString(),
        totalTests: results.length,
        correct,
        incorrect,
        errors,
        successful: correct,
        failed: incorrect + errors,
        config: {
          maxConcurrency: MAX_CONCURRENCY,
          testRunsPerModel: TEST_RUNS_PER_MODEL,
          timeoutSeconds: TIMEOUT_SECONDS,
        },
        testSuite: suite.name,
        suiteId,
        version: version || null,
        models: modelsToRun.map((m) => m.name),
      },
      results,
    };

    await writeFile(filepath, JSON.stringify(outputData, null, 2), "utf-8");
    if (!silent) console.log(`Results saved to: ${filepath}`);

    const markdownFilename = `test-results-${timestamp}.md`;
    const markdownFilepath = join(suiteDir, markdownFilename);
    const markdownContent = generateMarkdownReport(
      results,
      outputData.metadata,
      suite
    );

    await writeFile(markdownFilepath, markdownContent, "utf-8");
    if (!silent) console.log(`Markdown report saved to: ${markdownFilepath}`);

    const summaryFilename = `summary-${timestamp}.json`;
    const summaryFilepath = join(suiteDir, summaryFilename);

    const modelStats = results.reduce(
      (acc, result) => {
        if (!acc[result.model]) {
          acc[result.model] = {
            correct: 0,
            incorrect: 0,
            errors: 0,
            totalDuration: 0,
            totalTests: 0,
            totalCost: 0,
            totalCompletionTokens: 0,
          };
        }
        acc[result.model].totalTests++;
        if (result.error) {
          acc[result.model].errors++;
        } else if (result.result?.correct) {
          acc[result.model].correct++;
        } else {
          acc[result.model].incorrect++;
        }
        acc[result.model].totalDuration += result.duration;
        acc[result.model].totalCost += result.cost;
        acc[result.model].totalCompletionTokens += result.completionTokens;
        return acc;
      },
      {} as Record<
        string,
        {
          correct: number;
          incorrect: number;
          errors: number;
          totalDuration: number;
          totalTests: number;
          totalCost: number;
          totalCompletionTokens: number;
        }
      >
    );

    const modelRankings = Object.entries(modelStats)
      .map(([modelName, stats]) => ({
        model: modelName,
        correct: stats.correct,
        incorrect: stats.incorrect,
        errors: stats.errors,
        totalTests: stats.totalTests,
        successRate:
          stats.totalTests > 0 ? (stats.correct / stats.totalTests) * 100 : 0,
        errorRate:
          stats.totalTests > 0 ? (stats.errors / stats.totalTests) * 100 : 0,
        averageDuration:
          stats.totalTests > 0
            ? Math.round(stats.totalDuration / stats.totalTests)
            : 0,
        totalCost: stats.totalCost,
        averageCostPerTest:
          stats.totalTests > 0 ? stats.totalCost / stats.totalTests : 0,
        totalCompletionTokens: stats.totalCompletionTokens,
        tokensPerSecond:
          stats.totalDuration > 0
            ? stats.totalCompletionTokens / (stats.totalDuration / 1000)
            : 0,
      }))
      .sort((a, b) => {
        if (b.successRate !== a.successRate) {
          return b.successRate - a.successRate;
        }
        return a.averageDuration - b.averageDuration;
      });

    const summaryData = {
      rankings: modelRankings,
      metadata: {
        timestamp: new Date().toISOString(),
        totalModels: modelRankings.length,
        totalTestsRun: results.length,
        overallCorrect: correct,
        overallIncorrect: incorrect,
        overallErrors: errors,
        overallSuccessRate:
          results.length > 0 ? (correct / results.length) * 100 : 0,
        overallErrorRate:
          results.length > 0 ? (errors / results.length) * 100 : 0,
        totalCost: results.reduce((sum, result) => sum + result.cost, 0),
        averageCostPerTest:
          results.length > 0
            ? results.reduce((sum, result) => sum + result.cost, 0) /
              results.length
            : 0,
        config: {
          maxConcurrency: MAX_CONCURRENCY,
          testRunsPerModel: TEST_RUNS_PER_MODEL,
          timeoutSeconds: TIMEOUT_SECONDS,
        },
        testSuite: suite.name,
        suiteId,
        version: version || null,
      },
    };

    await writeFile(
      summaryFilepath,
      JSON.stringify(summaryData, null, 2),
      "utf-8"
    );
    if (!silent) console.log(`Summary saved to: ${summaryFilepath}`);

    // Update visualizer data
    try {
      const benchDir = dirname(fileURLToPath(import.meta.url));
      const visualizerDataPath = join(
        benchDir,
        "..",
        "visualizer",
        "data",
        "benchmark-results.json"
      );
      await writeFile(
        visualizerDataPath,
        JSON.stringify(summaryData, null, 2),
        "utf-8"
      );
      if (!silent)
        console.log(`Visualizer data updated at: ${visualizerDataPath}`);
    } catch (e) {
      if (!silent) console.warn("Failed to update visualizer data:", e);
    }
  } catch (error) {
    if (!silent) console.error("Failed to save results to file:", error);
  }

  return results;
}

export async function loadSuiteFromFile(filePath: string): Promise<TestSuite> {
  const raw = await fsReadFile(filePath, "utf-8");
  const json = JSON.parse(raw);
  return json as TestSuite;
}
