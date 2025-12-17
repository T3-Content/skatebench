#!/usr/bin/env node
import React, { useEffect, useMemo, useState } from "react";
import { render, Box, Text, useApp } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readdir, readFile } from "fs/promises";
import {
  loadSuiteFromFile,
  testRunner,
  type TestSuite,
  type RunnerEvent,
} from "./index";

function ensureRefUnref(stream: any) {
  if (!stream) return stream;
  if (typeof stream.ref !== "function") stream.ref = () => {};
  if (typeof stream.unref !== "function") stream.unref = () => {};
  return stream;
}

const stdin = ensureRefUnref(process.stdin as any);
const stdout = ensureRefUnref(process.stdout as any);
const stderr = ensureRefUnref(process.stderr as any);

function useBenchRoot() {
  const here = fileURLToPath(import.meta.url);
  return dirname(here);
}

async function findTestSuites(testsDir: string) {
  const entries = await readdir(testsDir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && e.name.endsWith(".json"));
  const suites: Array<{ filePath: string; suite: TestSuite }> = [];
  for (const f of files) {
    try {
      const filePath = join(testsDir, f.name);
      const raw = await readFile(filePath, "utf-8");
      const json = JSON.parse(raw) as TestSuite;
      if (json && json.name && Array.isArray(json.tests)) {
        suites.push({ filePath, suite: json });
      }
    } catch {}
  }
  return suites;
}

function formatDefaultVersion() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type ModelStats = {
  total: number;
  executeTotal: number;
  reuseTotal: number;
  reuseCompleted: number;
  executedStarted: number;
  executedDone: number;
  executedErrors: number;
  executedDurationSumMs: number;
  executedMaxDurationMs: number;
  correctCount: number;
  incorrectCount: number;
  costSum: number;
  completionTokensSum: number;
};

function ProgressBar({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const width =
    typeof (stdout as any).columns === "number"
      ? Math.max(20, Math.min(60, (stdout as any).columns - 30))
      : 40;
  const ratio = total > 0 ? completed / total : 0;
  const filled = Math.round(width * ratio);
  const empty = width - filled;
  const percent = total > 0 ? Math.floor(ratio * 100) : 0;
  const filledStr = "█".repeat(filled);
  const emptyStr = "░".repeat(empty);
  return (
    <Text>
      [<Text color="green">{filledStr}</Text>
      <Text color="gray">{emptyStr}</Text>] <Text color="cyan">{percent}%</Text>{" "}
      (<Text color="green">{completed}</Text>/<Text color="white">{total}</Text>{" "}
      completed)
    </Text>
  );
}

function pad(str: string, width: number) {
  if (str.length === width) return str;
  if (str.length < width) return str.padEnd(width, " ");
  if (width <= 1) return str.slice(0, width);
  return str.slice(0, Math.max(0, width - 1)) + "…";
}

function padLeft(str: string, width: number) {
  if (str.length === width) return str;
  if (str.length < width) return str.padStart(width, " ");
  return str.slice(-width);
}

function pctColor(p: number) {
  if (p >= 80) return "green" as const;
  if (p >= 50) return "yellow" as const;
  return "red" as const;
}

const App: React.FC = () => {
  const benchRoot = useBenchRoot();
  const testsDir = useMemo(() => join(benchRoot, "tests"), [benchRoot]);
  const { exit } = useApp();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suites, setSuites] = useState<
    Array<{ filePath: string; suite: TestSuite }>
  >([]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [version, setVersion] = useState<string>(formatDefaultVersion());
  const [stage, setStage] = useState<"pickSuite" | "version" | "running">(
    "pickSuite"
  );

  const [modelOrder, setModelOrder] = useState<string[]>([]);
  const [stats, setStats] = useState<Record<string, ModelStats>>({});

  useEffect(() => {
    (async () => {
      try {
        const found = await findTestSuites(testsDir);
        setSuites(found);
        setLoading(false);
      } catch (e) {
        setError((e as Error).message);
        setLoading(false);
      }
    })();
  }, [testsDir]);

  useEffect(() => {
    if (stage === "running" && selectedIndex != null) {
      (async () => {
        const entry = suites[selectedIndex];
        const suite = await loadSuiteFromFile(entry.filePath);

        await testRunner({
          suite,
          suiteFilePath: entry.filePath,
          version,
          silent: true,
          onEvent: (event: RunnerEvent) => {
            if (event.type === "plan") {
              const order = Object.keys(event.totals);
              setModelOrder(order);
              setStats(
                order.reduce((acc, name) => {
                  const t = event.totals[name];
                  acc[name] = {
                    total: t.total,
                    executeTotal: t.execute,
                    reuseTotal: t.reuse,
                    reuseCompleted: 0,
                    executedStarted: 0,
                    executedDone: 0,
                    executedErrors: 0,
                    executedDurationSumMs: 0,
                    executedMaxDurationMs: 0,
                    correctCount: 0,
                    incorrectCount: 0,
                    costSum: 0,
                    completionTokensSum: 0,
                  };
                  return acc;
                }, {} as Record<string, ModelStats>)
              );
            } else if (event.type === "start") {
              setStats((prev) => ({
                ...prev,
                [event.model]: {
                  ...prev[event.model],
                  executedStarted: prev[event.model].executedStarted + 1,
                },
              }));
            } else if (event.type === "done") {
              console.log("DONE", event);
              setStats((prev) => ({
                ...prev,
                [event.model]: {
                  ...prev[event.model],
                  executedDone: prev[event.model].executedDone + 1,
                  executedDurationSumMs:
                    prev[event.model].executedDurationSumMs + event.duration,
                  executedMaxDurationMs: Math.max(
                    prev[event.model].executedMaxDurationMs,
                    event.duration
                  ),
                  correctCount:
                    prev[event.model].correctCount + (event.correct ? 1 : 0),
                  incorrectCount:
                    prev[event.model].incorrectCount + (!event.correct ? 1 : 0),
                  costSum: prev[event.model].costSum + (event.cost || 0),
                  completionTokensSum:
                    prev[event.model].completionTokensSum +
                    (event.completionTokens || 0),
                },
              }));
            } else if (event.type === "error") {
              setStats((prev) => ({
                ...prev,
                [event.model]: {
                  ...prev[event.model],
                  executedErrors: prev[event.model].executedErrors + 1,
                  executedDurationSumMs:
                    prev[event.model].executedDurationSumMs + event.duration,
                  executedMaxDurationMs: Math.max(
                    prev[event.model].executedMaxDurationMs,
                    event.duration
                  ),
                },
              }));
            } else if (event.type === "reuse") {
              setStats((prev) => ({
                ...prev,
                [event.model]: {
                  ...prev[event.model],
                  reuseCompleted: prev[event.model].reuseCompleted + 1,
                  executedDurationSumMs:
                    prev[event.model].executedDurationSumMs +
                    (event.duration || 0),
                  executedMaxDurationMs: Math.max(
                    prev[event.model].executedMaxDurationMs,
                    event.duration || 0
                  ),
                  correctCount:
                    prev[event.model].correctCount + (event.correct ? 1 : 0),
                  incorrectCount:
                    prev[event.model].incorrectCount + (!event.correct ? 1 : 0),
                  costSum: prev[event.model].costSum + (event.cost || 0),
                  completionTokensSum:
                    prev[event.model].completionTokensSum +
                    (event.completionTokens || 0),
                },
              }));
            }
          },
        });
        // Keep the final UI as-is and exit the app
        exit();
      })();
    }
  }, [stage, selectedIndex, suites, version, exit]);

  if (loading) {
    return (
      <Box>
        <Text>Scanning tests…</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (stage === "pickSuite") {
    if (suites.length === 0) {
      return (
        <Box flexDirection="column">
          <Text>No test suites found in {testsDir}</Text>
        </Box>
      );
    }
    return (
      <Box flexDirection="column">
        <Text>Select a test suite:</Text>
        <SelectInput
          items={suites.map((s, idx) => ({
            key: String(idx),
            value: idx,
            label: `${s.suite.name}${
              s.suite.description ? ` — ${s.suite.description}` : ""
            }`,
          }))}
          onSelect={(item: any) => {
            setSelectedIndex(item.value as number);
            setStage("version");
          }}
        />
      </Box>
    );
  }

  if (stage === "version") {
    return (
      <Box flexDirection="column">
        <Text>Version label (press Enter to start):</Text>
        <Box marginTop={1}>
          <TextInput
            value={version}
            onChange={setVersion}
            onSubmit={() => setStage("running")}
          />
        </Box>
      </Box>
    );
  }

  if (stage === "running") {
    const picked = selectedIndex != null ? suites[selectedIndex] : null;

    const totals = modelOrder.reduce(
      (acc, name) => {
        const s = stats[name];
        if (!s) return acc;
        acc.total += s.total;
        acc.completed += s.reuseCompleted + s.executedDone + s.executedErrors;
        acc.errors += s.executedErrors;
        acc.running += Math.max(
          0,
          s.executedStarted - s.executedDone - s.executedErrors
        );
        acc.correct += s.correctCount;
        acc.incorrect += s.incorrectCount;
        acc.durationSumMs += s.executedDurationSumMs;
        acc.durationDenom +=
          s.reuseCompleted + s.executedDone + s.executedErrors;
        acc.costSum += s.costSum;
        acc.costDenom += s.reuseCompleted + s.executedDone; // cost recorded for completed, not for errors
        acc.completionTokensSum += s.completionTokensSum;
        acc.tokensDenom += s.reuseCompleted + s.executedDone;
        return acc;
      },
      {
        total: 0,
        completed: 0,
        errors: 0,
        running: 0,
        correct: 0,
        incorrect: 0,
        durationSumMs: 0,
        durationDenom: 0,
        costSum: 0,
        costDenom: 0,
        completionTokensSum: 0,
        tokensDenom: 0,
      }
    );

    const header = [
      "Model",
      "Tests",
      "% Right",
      "Errors",
      "Running Tests",
      "Avg Cost",
      "Avg Tokens",
      "TPS",
      "Avg Duration",
      "Slowest",
    ];

    const rows = modelOrder.map((name) => {
      const s = stats[name];
      const completed = s ? s.reuseCompleted + s.executedDone : 0;
      const denom = s ? s.total : 0;
      const err = s ? s.executedErrors : 0;
      const run = s
        ? Math.max(0, s.executedStarted - s.executedDone - s.executedErrors)
        : 0;
      const answered = s ? s.correctCount + s.incorrectCount : 0;
      const pct =
        answered > 0 ? Math.round((s!.correctCount / answered) * 100) : null;
      const avgCount = s
        ? s.reuseCompleted + s.executedDone + s.executedErrors
        : 0;
      const avgSec =
        avgCount > 0 ? s!.executedDurationSumMs / avgCount / 1000 : null;
      const slowSec =
        s && s.executedMaxDurationMs > 0
          ? s.executedMaxDurationMs / 1000
          : null;
      const costDenom = s ? s.reuseCompleted + s.executedDone : 0;
      const avgCost = costDenom > 0 ? s!.costSum / costDenom : null;
      const tokensDenom = s ? s.reuseCompleted + s.executedDone : 0;
      const avgTokens =
        tokensDenom > 0
          ? Math.round(s!.completionTokensSum / tokensDenom)
          : null;
      // TPS = total completion tokens / total duration in seconds
      const tpsDurationSec = s ? s.executedDurationSumMs / 1000 : 0;
      const tps =
        tpsDurationSec > 0 ? s!.completionTokensSum / tpsDurationSec : null;
      return {
        model: name,
        done: `${completed}/${denom}`,
        correct: pct === null ? "-" : `${pct}%`,
        err: err === 0 ? "-" : String(err),
        run: run === 0 ? "-" : String(run),
        avgCost: avgCost === null ? "-" : `$${avgCost.toFixed(4)}`,
        avgTokens: avgTokens === null ? "-" : avgTokens.toLocaleString(),
        tps: tps === null ? "-" : tps.toFixed(1),
        avg: avgSec === null ? "-" : `${avgSec.toFixed(2)}s`,
        slow: slowSec === null ? "-" : `${slowSec.toFixed(2)}s`,
        pct,
      };
    });

    const widths = {
      model: Math.max(header[0].length, ...rows.map((r) => r.model.length)),
      done: Math.max(header[1].length, ...rows.map((r) => r.done.length)),
      correct: Math.max(header[2].length, ...rows.map((r) => r.correct.length)),
      err: Math.max(header[3].length, ...rows.map((r) => r.err.length)),
      run: Math.max(header[4].length, ...rows.map((r) => r.run.length)),
      avgCost: Math.max(header[5].length, ...rows.map((r) => r.avgCost.length)),
      avgTokens: Math.max(
        header[6].length,
        ...rows.map((r) => r.avgTokens.length)
      ),
      tps: Math.max(header[7].length, ...rows.map((r) => r.tps.length)),
      avg: Math.max(header[8].length, ...rows.map((r) => r.avg.length)),
      slow: Math.max(header[9].length, ...rows.map((r) => r.slow.length)),
    };

    const overallAnswered = totals.correct + totals.incorrect;
    const overallPct =
      overallAnswered > 0
        ? Math.round((totals.correct / overallAnswered) * 100)
        : null;
    const overallAvgSec =
      totals.durationDenom > 0
        ? totals.durationSumMs / totals.durationDenom / 1000
        : null;

    return (
      <Box flexDirection="column">
        <Text>
          Running <Text color="magentaBright">{picked?.suite.name}</Text> @
          version <Text color="cyan">{version}</Text>…
        </Text>

        <Box flexDirection="column" marginTop={1}>
          <Text>
            <Text underline color="whiteBright">
              {pad(header[0], widths.model)}
            </Text>
            {"  "}
            <Text underline color="whiteBright">
              {pad(header[1], widths.done)}
            </Text>
            {"  "}
            <Text underline color="whiteBright">
              {pad(header[2], widths.correct)}
            </Text>
            {"  "}
            <Text underline color="whiteBright">
              {pad(header[3], widths.err)}
            </Text>
            {"  "}
            <Text underline color="whiteBright">
              {pad(header[4], widths.run)}
            </Text>
            {"  "}
            <Text underline color="whiteBright">
              {pad(header[5], widths.avgCost)}
            </Text>
            {"  "}
            <Text underline color="whiteBright">
              {pad(header[6], widths.avgTokens)}
            </Text>
            {"  "}
            <Text underline color="whiteBright">
              {pad(header[7], widths.tps)}
            </Text>
            {"  "}
            <Text underline color="whiteBright">
              {pad(header[8], widths.avg)}
            </Text>
            {"  "}
            <Text underline color="whiteBright">
              {pad(header[9], widths.slow)}
            </Text>
          </Text>
          {rows.map((r) => (
            <Text key={r.model}>
              <Text color="whiteBright">{pad(r.model, widths.model)}</Text>
              {"  "}
              <Text color="white">{padLeft(r.done, widths.done)}</Text>
              {"  "}
              <Text color={r.pct == null ? "gray" : pctColor(r.pct)}>
                {padLeft(r.correct, widths.correct)}
              </Text>
              {"  "}
              <Text color={r.err === "-" ? "gray" : "red"}>
                {padLeft(r.err, widths.err)}
              </Text>
              {"  "}
              <Text color={r.run === "-" ? "gray" : "yellow"}>
                {padLeft(r.run, widths.run)}
              </Text>
              {"  "}
              <Text color={r.avgCost === "-" ? "gray" : "green"}>
                {padLeft(r.avgCost, widths.avgCost)}
              </Text>
              {"  "}
              <Text color={r.avgTokens === "-" ? "gray" : "blue"}>
                {padLeft(r.avgTokens, widths.avgTokens)}
              </Text>
              {"  "}
              <Text color={r.tps === "-" ? "gray" : "blueBright"}>
                {padLeft(r.tps, widths.tps)}
              </Text>
              {"  "}
              <Text color={r.avg === "-" ? "gray" : "cyan"}>
                {padLeft(r.avg, widths.avg)}
              </Text>
              {"  "}
              <Text color={r.slow === "-" ? "gray" : "magenta"}>
                {padLeft(r.slow, widths.slow)}
              </Text>
            </Text>
          ))}
        </Box>

        <Box marginTop={1}>
          <ProgressBar completed={totals.completed} total={totals.total} />
        </Box>
        <Box marginTop={1}>
          <Text>
            Overall: <Text color="green">{totals.completed}</Text>/
            <Text color="white">{totals.total}</Text> done •{" "}
            <Text color={overallPct == null ? "gray" : pctColor(overallPct)}>
              {overallPct == null ? "-" : `${overallPct}%`}
            </Text>{" "}
            correct • <Text color="red">{totals.errors || "-"}</Text> errors •{" "}
            <Text color="yellow">{totals.running || "-"}</Text> running •{" "}
            <Text color={overallAvgSec == null ? "gray" : "cyan"}>
              {overallAvgSec == null ? "-" : `${overallAvgSec.toFixed(2)}s`}
            </Text>{" "}
            avg duration •{" "}
            <Text color="green">${totals.costSum.toFixed(4)}</Text> total cost
          </Text>
        </Box>
      </Box>
    );
  }

  return null;
};

render(<App />, { stdin, stdout, stderr });
