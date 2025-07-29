import { promises as fs } from "fs";
import path from "path";

export type SuiteListItem = {
  suiteId: string;
  name: string;
  description?: string;
  filePath: string;
};

export function getVisualizerDataRoot() {
  return path.join(process.cwd(), "data", "bench-results");
}

export function getBenchTestsRoot() {
  return path.join(process.cwd(), "..", "bench", "tests");
}

export async function pathExists(p: string) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function listTestSuites(): Promise<SuiteListItem[]> {
  const testsRoot = getBenchTestsRoot();
  if (!(await pathExists(testsRoot))) return [];
  const entries = await fs.readdir(testsRoot, { withFileTypes: true });
  const out: SuiteListItem[] = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".json")) continue;
    const filePath = path.join(testsRoot, e.name);
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const json = JSON.parse(raw) as {
        name?: string;
        description?: string;
        id?: string;
      };
      const base = path.basename(e.name, ".json");
      const suiteId = json.id && json.id.trim().length > 0 ? json.id : base;
      out.push({
        suiteId,
        name: json.name || base,
        description: json.description,
        filePath,
      });
    } catch {}
  }
  return out.sort((a, b) => a.suiteId.localeCompare(b.suiteId));
}

export async function listVersions(suiteId: string): Promise<string[]> {
  const root = path.join(getVisualizerDataRoot(), suiteId);
  if (!(await pathExists(root))) return [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  const versions = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  // Prefer most recent-looking first by lexical; YYYY-MM-DD sorts fine
  return versions.sort((a, b) => b.localeCompare(a));
}

export async function listSummaries(
  suiteId: string,
  version: string
): Promise<string[]> {
  const dir = path.join(getVisualizerDataRoot(), suiteId, version);
  if (!(await pathExists(dir))) return [];
  const files = await fs.readdir(dir).catch(() => []);
  return files
    .filter((f) => f.startsWith("summary-") && f.endsWith(".json"))
    .sort((a, b) => b.localeCompare(a));
}

export async function readSummary(
  suiteId: string,
  version: string,
  filename?: string
) {
  const summaries = await listSummaries(suiteId, version);
  if (summaries.length === 0) return null;
  const file =
    filename && summaries.includes(filename) ? filename : summaries[0];
  const full = path.join(getVisualizerDataRoot(), suiteId, version, file);
  const raw = await fs.readFile(full, "utf-8");
  const json = JSON.parse(raw);
  return { file, data: json } as { file: string; data: any };
}

export async function generateAllParams() {
  const root = getVisualizerDataRoot();
  if (!(await pathExists(root)))
    return [] as Array<{ suiteId: string; version: string }>;
  const suites = await fs.readdir(root, { withFileTypes: true });
  const params: Array<{ suiteId: string; version: string }> = [];
  for (const s of suites) {
    if (!s.isDirectory()) continue;
    const suiteId = s.name;
    const versions = await listVersions(suiteId);
    for (const v of versions) params.push({ suiteId, version: v });
  }
  return params;
}
