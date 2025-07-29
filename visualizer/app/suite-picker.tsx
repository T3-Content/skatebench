"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BenchmarkCharts from "@/components/benchmark-charts";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function SuitePicker({
  suites,
  latestBySuite,
}: {
  suites: { suiteId: string; name: string; description?: string }[];
  latestBySuite: Record<string, { data: any } | null>;
}) {
  const router = useRouter();
  const search = useSearchParams();

  const defaultSuite = suites[0]?.suiteId;
  const selectedSuite = search.get("suite") || defaultSuite;
  const selectedData = useMemo(
    () => latestBySuite[selectedSuite!],
    [latestBySuite, selectedSuite]
  );

  const dropdown = (
    <div className="absolute right-4 top-4 z-10">
      <Select
        value={selectedSuite}
        onValueChange={(v) => {
          const params = new URLSearchParams(search.toString());
          params.set("suite", v);
          router.replace("?" + params.toString(), { scroll: false });
        }}
      >
        <SelectTrigger className="w-56 border-neutral-700 bg-neutral-900/70 text-neutral-100">
          <SelectValue placeholder="Select suite" />
        </SelectTrigger>
        <SelectContent className="border-neutral-700 bg-neutral-900/95 text-neutral-100">
          {suites.map((s) => (
            <SelectItem
              key={s.suiteId}
              value={s.suiteId}
              className="text-neutral-100"
            >
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (!selectedData) {
    return (
      <div className="relative mx-auto max-w-7xl px-4 py-12">
        {dropdown}
        <p className="text-neutral-500">
          No results copied yet for this suite.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {dropdown}
      <BenchmarkCharts data={selectedData.data} />
    </div>
  );
}
