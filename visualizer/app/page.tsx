import { listTestSuites, listVersions, readSummary } from "@/lib/results";
import BenchmarkCharts from "@/components/benchmark-charts";
import SuitePicker from "./suite-picker";

export default async function Home() {
  const suites = await listTestSuites();

  // Build latest data per suite for quick switching without rebuilding client logic.
  const latestBySuite: Record<string, { data: any } | null> = {};
  for (const s of suites) {
    const versions = await listVersions(s.suiteId);
    const latestVersion = versions[0];
    if (!latestVersion) {
      latestBySuite[s.suiteId] = null;
      continue;
    }
    const summary = await readSummary(s.suiteId, latestVersion);
    latestBySuite[s.suiteId] = summary ? { data: summary.data } : null;
  }

  return (
    <div className="relative">
      <SuitePicker suites={suites} latestBySuite={latestBySuite} />
    </div>
  );
}
