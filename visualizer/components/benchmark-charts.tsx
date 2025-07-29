"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Trophy,
  DollarSign,
  Clock,
  Target,
  TrendingUp,
  Filter,
  ChevronDown,
  Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ScatterChart,
  Scatter,
  Cell,
  LabelList,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useIsMobile } from "@/hooks/use-mobile";

const SkateboardSVG = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"svg">) => (
  <svg
    viewBox="0 0 1200 1200"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="m1115.3 454.92c86.906-103.12 81.844-257.9-15.234-354.98-97.125-97.031-251.86-102.14-354.98-15.234l-18.75-18.703c-8.8125-8.8125-23.062-8.8125-31.875 0l-135.89 135.89c-8.8125 8.8125-8.8125 23.062 0 31.875l18.047 18.047-324.79 324.79-18.047-18.047c-8.8125-8.8125-23.062-8.8125-31.875 0l-135.89 135.89c-8.8125 8.8125-8.8125 23.062 0 31.875l18.703 18.703c-86.906 103.17-81.797 257.9 15.281 354.98 97.078 97.078 251.86 102.14 354.98 15.234l18.703 18.703c8.8125 8.8125 23.062 8.8125 31.875 0l135.89-135.89c8.8125-8.8125 8.8125-23.062 0-31.875l-18.047-18.047 324.84-324.84 18.047 18.047c8.8125 8.8125 23.062 8.8125 31.875 0l135.89-135.89c8.8125-8.8125 8.8125-23.062 0-31.875zm-321-321-17.203-17.203c85.406-69.422 211.6-64.359 291.1 15.094 79.5 79.5 84.516 205.69 15.094 291.1l-17.203-17.203c-8.8125-8.8125-23.062-8.8125-31.875 0l-18.047 18.047-239.9-239.9 18.047-18.047c8.8125-8.8125 8.8125-23.062 0-31.875zm-85.969 117.89 36.047-36.047 239.9 239.9-36.047 36.047zm123.1 186.84-18.047 18.047c-19.312 19.312-50.719 19.312-70.031 0s-19.312-50.719 0-70.031l18.047-18.047zm-121.03-324.84 36.047 36.047-104.02 104.02-36.047-36.047zm-492.56 492.56 36.047 36.047-54 54 0.046875-0.046875-50.109 50.109-36.047-36.047zm273.84 341.81-36.047 36.047-239.9-239.86 36.047-36.047zm-123.1-186.84 18.047-18.047c19.312-19.312 50.719-19.312 70.031 0s-19.312 50.719 0 70.031l-18.047 18.047zm37.125 304.74 17.203 17.203c-85.406 69.422-211.6 64.359-291.1-15.094-79.5-79.5-84.516-205.69-15.094-291.1l17.203 17.203c8.8125 8.8125 23.062 8.8125 31.875 0l18.047-18.047 239.9 239.9-18.047 18.047c-8.8125 8.8125-8.7656 23.062 0 31.875zm83.906 20.109-36.094-36.094c79.828-79.828 100.41-100.41 104.02-104.02l0.14062 0.14062c0.79688 0.79688 6.1875 6.1875 35.906 35.906zm408.71-512.72 18.047 18.047-324.84 324.79-18.047-18.047c-8.8125-8.8125 23.062-8.8125 31.875 0l-18.047 18.047-53.062-53.062 18.047-18.047c36.891-36.891 36.891-96.891 0-133.78-36.891-36.891-96.891-36.891-133.78 0l-18.047 18.047-53.062-53.062 18.047-18.047c8.8125-8.8125 8.8125-23.062 0-31.875l-18.047-18.047 324.84-324.84 18.047 18.047c8.8125 8.8125 23.062 8.8125 31.875 0l18.047-18.047 53.062 53.062-18.047 18.047c-36.891 36.891-36.891 96.891 0 133.78 36.891 36.891 96.891 36.891 133.78 0l18.047-18.047 53.062 53.062-18.047 18.047c-8.8125 8.8594-8.8125 23.109 0 31.922zm83.859 20.156-36.047-36.047 104.02-104.02 36.047 36.047z"
      fill="currentColor"
      stroke="inherit"
    />
  </svg>
);

interface ModelData {
  model: string;
  correct: number;
  incorrect: number;
  errors: number;
  totalTests: number;
  successRate: number;
  errorRate: number;
  averageDuration: number;
  totalCost: number;
  averageCostPerTest: number;
}

function withAlpha(color: string, alpha: number) {
  if (color.startsWith("hsl("))
    return color.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
  if (color.startsWith("rgb("))
    return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  return color;
}

function getGradientId(prefix: string, model: string) {
  return `${prefix}-${model.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function currency(n: number) {
  return `$${n.toFixed(2)}`;
}

function barValueLabel(suffix: string, decimals: number) {
  return (props: any) => {
    const x = Number(props?.x ?? 0);
    const y = Number(props?.y ?? 0);
    const width = Number(props?.width ?? 0);
    const value = Number(props?.value ?? 0);
    const cx = x + width / 2;
    const cy = y - 6;
    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        className="pointer-events-none text-xs font-medium fill-neutral-300"
      >
        {value.toFixed(decimals)}
        {suffix}
      </text>
    );
  };
}

function barValueLabelHorizontal(suffix: string, decimals: number) {
  return (props: any) => {
    const x = Number(props?.x ?? 0);
    const y = Number(props?.y ?? 0);
    const width = Number(props?.width ?? 0);
    const height = Number(props?.height ?? 0);
    const value = Number(props?.value ?? 0);
    const cx = x + width + 6;
    const cy = y + height / 2;
    return (
      <text
        x={cx}
        y={cy}
        dy={3}
        textAnchor="start"
        className="pointer-events-none text-xs font-medium fill-neutral-300"
      >
        {value.toFixed(decimals)}
        {suffix}
      </text>
    );
  };
}

function barValueLabelHorizontalSmart(
  suffix: string,
  decimals: number,
  maxValue: number
) {
  return (props: any) => {
    const x = Number(props?.x ?? 0);
    const y = Number(props?.y ?? 0);
    const width = Number(props?.width ?? 0);
    const height = Number(props?.height ?? 0);
    const value = Number(props?.value ?? 0);
    const ratio = maxValue > 0 ? value / maxValue : 0;
    const inside = ratio >= 0.75;
    const tx = inside ? x + width - 6 : x + width + 6;
    const anchor: any = inside ? "end" : "start";
    const cls = inside
      ? "pointer-events-none text-[10px] font-medium fill-neutral-50"
      : "pointer-events-none text-[10px] font-medium fill-neutral-300";
    return (
      <text
        x={tx}
        y={y + height / 2}
        dy={3}
        textAnchor={anchor}
        className={cls}
      >
        {value.toFixed(decimals)}
        {suffix}
      </text>
    );
  };
}

function truncateLabel(input: unknown, max = 14) {
  const label = String(input ?? "");
  if (label.length <= max) return label;
  return label.slice(0, Math.max(1, max - 1)) + "…";
}

export default function BenchmarkCharts({
  data,
  suiteControl,
}: {
  data: { rankings: ModelData[]; metadata: any };
  suiteControl?: React.ReactNode;
}) {
  const { rankings, metadata } = data;

  const [selectedModels, setSelectedModels] = useState<string[]>(
    rankings.map((m) => m.model)
  );

  const router = useRouter();
  const search = useSearchParams();
  const urlChart = (search.get("chart") || "accuracy") as
    | "accuracy"
    | "cost"
    | "speed"
    | "combined";
  const [tab, setTab] = useState<"accuracy" | "cost" | "speed" | "combined">(
    urlChart
  );
  useEffect(() => {
    if (urlChart !== tab) setTab(urlChart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlChart]);

  const filteredRankings = rankings.filter((m) =>
    selectedModels.includes(m.model)
  );

  const isMobile = useIsMobile();
  const mobileBarHeight = Math.max(320, filteredRankings.length * 36 + 120);

  const totalTestsPerModel = rankings[0]?.totalTests ?? 0;

  const successRateData = filteredRankings
    .map((m) => ({
      model: m.model,
      successRate: Number(m.successRate.toFixed(1)),
      correct: m.correct,
      total: m.totalTests,
    }))
    .sort((a, b) => b.successRate - a.successRate);

  const costData = filteredRankings
    .map((m) => ({
      model: m.model,
      totalCost: Number(m.totalCost.toFixed(4)),
    }))
    .sort((a, b) => a.totalCost - b.totalCost);

  const speedData = filteredRankings
    .map((m) => ({
      model: m.model,
      duration: Number((m.averageDuration / 1000).toFixed(2)),
      durationMs: m.averageDuration,
    }))
    .sort((a, b) => a.duration - b.duration);

  const performanceData = filteredRankings.map((m) => ({
    model: m.model.replace(/-/g, " "),
    originalModel: m.model,
    successRate: m.successRate,
    totalCost: m.totalCost,
    duration: m.averageDuration / 1000,
  }));

  const getModelColor = (modelName: string) => {
    const colors = [
      "hsl(0, 75%, 60%)",
      "hsl(20, 85%, 60%)",
      "hsl(40, 90%, 60%)",
      "hsl(60, 85%, 55%)",
      "hsl(90, 75%, 55%)",
      "hsl(140, 70%, 50%)",
      "hsl(190, 75%, 55%)",
      "hsl(220, 80%, 60%)",
      "hsl(260, 75%, 65%)",
      "hsl(300, 70%, 65%)",
      "hsl(330, 70%, 60%)",
      "hsl(280, 60%, 62%)",
    ];
    const index = rankings.findIndex((r) => r.model === modelName);
    return colors[(index + colors.length) % colors.length];
  };

  const handleModelToggle = (modelName: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelName)
        ? prev.filter((m) => m !== modelName)
        : [...prev, modelName]
    );
  };
  const handleSelectAll = () => setSelectedModels(rankings.map((m) => m.model));
  const handleDeselectAll = () => setSelectedModels([]);

  const costMax = Math.max(0, ...costData.map((d) => d.totalCost));
  const speedMax = Math.max(0, ...speedData.map((d) => d.duration));

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-neutral-950 text-neutral-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_800px_at_10%_0%,rgba(59,130,246,0.18),transparent_70%),radial-gradient(1200px_800px_at_90%_0%,rgba(34,197,94,0.14),transparent_70%),radial-gradient(900px_700px_at_50%_100%,rgba(234,88,12,0.14),transparent_70%)]" />

      <header className="relative mx-auto max-w-7xl px-4 pt-6 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SkateboardSVG className="h-10 w-10 stroke-neutral-100" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                SkateBench
              </h1>
              <p className="mt-1 max-w-prose text-xs text-neutral-300 sm:text-sm">
                {metadata?.testSuite || "Benchmark"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-neutral-800/60 text-neutral-200"
            >
              {metadata?.totalModels ?? rankings.length} models
            </Badge>
            {metadata?.timestamp ? (
              <Badge
                variant="outline"
                className="border-neutral-700 text-neutral-300"
              >
                <Calendar className="mr-1 h-3.5 w-3.5" />
                {new Date(metadata.timestamp).toLocaleString()}
              </Badge>
            ) : null}
            {suiteControl ? <div className="ml-2">{suiteControl}</div> : null}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 pb-16">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            const nv = v as "accuracy" | "cost" | "speed" | "combined";
            setTab(nv);
            const params = new URLSearchParams(search.toString());
            params.set("chart", nv);
            router.replace("?" + params.toString(), { scroll: false });
          }}
          className="space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="max-w-full overflow-x-auto overflow-y-hidden whitespace-nowrap rounded-xl border border-neutral-800 bg-neutral-900/70 p-1">
              <TabsTrigger
                value="accuracy"
                className="flex items-center gap-2 rounded-md px-4 py-2 text-neutral-300 data-[state=active]:bg-green-600 data-[state=active]:text-white"
              >
                <Target className="h-4 w-4" /> Accuracy
              </TabsTrigger>
              <TabsTrigger
                value="cost"
                className="flex items-center gap-2 rounded-md px-4 py-2 text-neutral-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <DollarSign className="h-4 w-4" /> Cost
              </TabsTrigger>
              <TabsTrigger
                value="speed"
                className="flex items-center gap-2 rounded-md px-4 py-2 text-neutral-300 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Clock className="h-4 w-4" /> Speed
              </TabsTrigger>
              <TabsTrigger
                value="combined"
                className="flex items-center gap-2 rounded-md px-4 py-2 text-neutral-300 data-[state=active]:bg-orange-600 data-[state=active]:text-white"
              >
                <TrendingUp className="h-4 w-4" /> Combined
              </TabsTrigger>
            </TabsList>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-neutral-700 bg-neutral-900/60 text-white hover:bg-neutral-800 sm:w-auto"
                >
                  <Filter className="mr-2 h-4 w-4" /> Models (
                  {selectedModels.length}/{rankings.length})
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-96 border-neutral-700 bg-neutral-900/95 text-white backdrop-blur">
                <DropdownMenuLabel className="text-neutral-200">
                  Select models
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-neutral-700" />
                <div className="flex gap-2 p-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSelectAll}
                    className="flex-1 border-neutral-600 bg-neutral-800 hover:bg-neutral-700"
                  >
                    Select all
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDeselectAll}
                    className="flex-1 border-neutral-600 bg-neutral-800 hover:bg-neutral-700"
                  >
                    Clear
                  </Button>
                </div>
                <DropdownMenuSeparator className="bg-neutral-700" />
                <ScrollArea className="h-80">
                  {rankings.map((m) => (
                    <DropdownMenuItem
                      key={m.model}
                      className="group flex items-center gap-3 py-2 hover:bg-neutral-800 focus:bg-neutral-800"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Checkbox
                        id={m.model}
                        checked={selectedModels.includes(m.model)}
                        onCheckedChange={() => handleModelToggle(m.model)}
                        className="border-neutral-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: getModelColor(m.model) }}
                        />
                        <label
                          htmlFor={m.model}
                          className="cursor-pointer truncate text-sm text-neutral-200"
                        >
                          {m.model}
                        </label>
                      </div>
                      <Badge className="ml-auto bg-neutral-800 text-neutral-200">
                        {m.successRate.toFixed(1)}%
                      </Badge>
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <TabsContent value="accuracy">
            <Card className="border-neutral-800 bg-neutral-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Trophy className="h-5 w-5 text-green-400" /> Success rate by
                  model
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  Percentage of correct answers out of {totalTestsPerModel}{" "}
                  tests per model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    successRate: {
                      label: "Success Rate",
                      color: "hsl(142, 76%, 36%)",
                    },
                  }}
                  className="h-[420px] sm:h-[520px] w-full"
                  style={isMobile ? { height: mobileBarHeight } : undefined}
                >
                  <BarChart
                    data={successRateData}
                    layout={isMobile ? "vertical" : "horizontal"}
                    margin={
                      isMobile
                        ? { top: 10, right: 24, left: 140, bottom: 24 }
                        : { top: 10, right: 24, left: 12, bottom: 64 }
                    }
                  >
                    <defs>
                      {successRateData.map((d) => {
                        const base = getModelColor(d.model);
                        const id = getGradientId("sr", d.model);
                        return (
                          <linearGradient
                            key={id}
                            id={id}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={withAlpha(base, 0.95)}
                            />
                            <stop
                              offset="100%"
                              stopColor={withAlpha(base, 0.55)}
                            />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#303341" />
                    {isMobile ? (
                      <>
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          label={{
                            value: "Success Rate (%)",
                            position: "insideBottom",
                            offset: -10,
                            fill: "#9ca3af",
                          }}
                          stroke="#9ca3af"
                        />
                        <YAxis
                          type="category"
                          dataKey="model"
                          width={12}
                          tick={{ fontSize: 12, fill: "#9ca3af" }}
                          tickFormatter={(v: string) => truncateLabel(v)}
                          stroke="#9ca3af"
                        />
                      </>
                    ) : (
                      <>
                        <XAxis
                          dataKey="model"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          fontSize={12}
                          stroke="#9ca3af"
                        />
                        <YAxis
                          label={{
                            value: "Success Rate (%)",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#9ca3af",
                          }}
                          domain={[0, 100]}
                          stroke="#9ca3af"
                        />
                      </>
                    )}
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: any) => [`${value}% Success Rate`]}
                      labelFormatter={(label: string) => `Model: ${label}`}
                    />
                    <Bar
                      dataKey="successRate"
                      radius={isMobile ? [0, 6, 6, 0] : [6, 6, 0, 0]}
                    >
                      <LabelList
                        dataKey="successRate"
                        position={isMobile ? "right" : "top"}
                        content={
                          isMobile
                            ? barValueLabelHorizontalSmart("%", 1, 100)
                            : barValueLabel("%", 1)
                        }
                      />
                      {successRateData.map((entry) => (
                        <Cell
                          key={entry.model}
                          fill={`url(#${getGradientId("sr", entry.model)})`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cost">
            <Card className="border-neutral-800 bg-neutral-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white">
                  <DollarSign className="h-5 w-5 text-blue-400" /> Cost
                  efficiency by model
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  Average cost per test in cents (lower is better)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    totalCost: {
                      label: "Cost per Test",
                      color: "hsl(217, 91%, 60%)",
                    },
                  }}
                  className="h-[420px] sm:h-[520px] w-full"
                  style={isMobile ? { height: mobileBarHeight } : undefined}
                >
                  <BarChart
                    data={costData}
                    layout={isMobile ? "vertical" : "horizontal"}
                    margin={
                      isMobile
                        ? { top: 10, right: 24, left: 140, bottom: 24 }
                        : { top: 10, right: 24, left: 12, bottom: 64 }
                    }
                  >
                    <defs>
                      {costData.map((d) => {
                        const base = getModelColor(d.model);
                        const id = getGradientId("ct", d.model);
                        return (
                          <linearGradient
                            key={id}
                            id={id}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={withAlpha(base, 0.95)}
                            />
                            <stop
                              offset="100%"
                              stopColor={withAlpha(base, 0.55)}
                            />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#303341" />
                    {isMobile ? (
                      <>
                        <XAxis
                          type="number"
                          label={{
                            value: "Cost to run tests",
                            position: "insideBottom",
                            offset: -10,
                            fill: "#9ca3af",
                          }}
                          stroke="#9ca3af"
                        />
                        <YAxis
                          type="category"
                          dataKey="model"
                          width={12}
                          tick={{ fontSize: 12, fill: "#9ca3af" }}
                          tickFormatter={(v: string) => truncateLabel(v)}
                          stroke="#9ca3af"
                        />
                      </>
                    ) : (
                      <>
                        <XAxis
                          dataKey="model"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          fontSize={12}
                          stroke="#9ca3af"
                        />
                        <YAxis
                          label={{
                            value: "Cost per Test (¢)",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#9ca3af",
                          }}
                          stroke="#9ca3af"
                        />
                      </>
                    )}
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: any) => [
                        `Avg cost: \$${value} per test`,
                      ]}
                      labelFormatter={(label: string) => `Model: ${label}`}
                    />
                    <Bar
                      dataKey="totalCost"
                      radius={isMobile ? [0, 6, 6, 0] : [6, 6, 0, 0]}
                    >
                      <LabelList
                        dataKey="totalCost"
                        position={isMobile ? "right" : "top"}
                        content={
                          isMobile
                            ? barValueLabelHorizontalSmart("", 2, costMax || 1)
                            : barValueLabel("", 2)
                        }
                      />
                      {costData.map((entry) => (
                        <Cell
                          key={entry.model}
                          fill={`url(#${getGradientId("ct", entry.model)})`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="speed">
            <Card className="border-neutral-800 bg-neutral-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Clock className="h-5 w-5 text-purple-400" /> Response speed
                  by model
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  Average response time in seconds (lower is better)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    duration: {
                      label: "Response Time",
                      color: "hsl(262, 83%, 58%)",
                    },
                  }}
                  className="h-[420px] sm:h-[520px] w-full"
                  style={isMobile ? { height: mobileBarHeight } : undefined}
                >
                  <BarChart
                    data={speedData}
                    layout={isMobile ? "vertical" : "horizontal"}
                    margin={
                      isMobile
                        ? { top: 10, right: 24, left: 140, bottom: 24 }
                        : { top: 10, right: 24, left: 12, bottom: 64 }
                    }
                  >
                    <defs>
                      {speedData.map((d) => {
                        const base = getModelColor(d.model);
                        const id = getGradientId("sp", d.model);
                        return (
                          <linearGradient
                            key={id}
                            id={id}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={withAlpha(base, 0.95)}
                            />
                            <stop
                              offset="100%"
                              stopColor={withAlpha(base, 0.55)}
                            />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#303341" />
                    {isMobile ? (
                      <>
                        <XAxis
                          type="number"
                          label={{
                            value: "Response Time (s)",
                            position: "insideBottom",
                            offset: -10,
                            fill: "#9ca3af",
                          }}
                          stroke="#9ca3af"
                        />
                        <YAxis
                          type="category"
                          dataKey="model"
                          width={12}
                          tick={{ fontSize: 12, fill: "#9ca3af" }}
                          tickFormatter={(v: string) => truncateLabel(v)}
                          stroke="#9ca3af"
                        />
                      </>
                    ) : (
                      <>
                        <XAxis
                          dataKey="model"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          fontSize={12}
                          stroke="#9ca3af"
                        />
                        <YAxis
                          label={{
                            value: "Response Time (s)",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#9ca3af",
                          }}
                          stroke="#9ca3af"
                        />
                      </>
                    )}
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: any) => [
                        `Average response time: ${value} seconds`,
                      ]}
                      labelFormatter={(label: string) => `Model: ${label}`}
                    />
                    <Bar
                      dataKey="duration"
                      radius={isMobile ? [0, 6, 6, 0] : [6, 6, 0, 0]}
                    >
                      <LabelList
                        dataKey="duration"
                        position={isMobile ? "right" : "top"}
                        content={
                          isMobile
                            ? barValueLabelHorizontalSmart(
                                "s",
                                2,
                                speedMax || 1
                              )
                            : barValueLabel("s", 2)
                        }
                      />
                      {speedData.map((entry) => (
                        <Cell
                          key={entry.model}
                          fill={`url(#${getGradientId("sp", entry.model)})`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="combined">
            <Card className="border-neutral-800 bg-neutral-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white">
                  <TrendingUp className="h-5 w-5 text-orange-400" /> Performance
                  vs total cost
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  Top‑left is ideal: higher accuracy, lower total cost
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    successRate: {
                      label: "Success Rate",
                      color: "hsl(142, 76%, 36%)",
                    },
                  }}
                  className="h-[420px] sm:h-[520px] w-full"
                  style={isMobile ? { height: 360 } : undefined}
                >
                  <ScatterChart
                    margin={{
                      top: 10,
                      right: isMobile ? 12 : 120,
                      left: 12,
                      bottom: isMobile ? 16 : 32,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#303341" />
                    <XAxis
                      type="number"
                      dataKey="totalCost"
                      name="Total Cost"
                      label={{
                        value: "Total Cost ($)",
                        position: "insideBottom",
                        offset: -20,
                        fill: "#9ca3af",
                      }}
                      stroke="#9ca3af"
                      domain={[0, "auto"]}
                      tickFormatter={(tick) => tick.toFixed(2)}
                    />
                    <YAxis
                      type="number"
                      dataKey="successRate"
                      name="Success Rate"
                      unit="%"
                      label={{
                        value: "Success Rate (%)",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#9ca3af",
                      }}
                      stroke="#9ca3af"
                      domain={[0, 100]}
                    />
                    <ChartTooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload as any;
                          return (
                            <div className="rounded-lg border border-white/10 bg-neutral-900/95 p-3 text-neutral-100 shadow-xl">
                              <p className="font-semibold">{d.model}</p>
                              <p className="text-sm text-neutral-300">
                                Success: {d.successRate.toFixed(1)}%
                              </p>
                              <p className="text-sm text-neutral-300">
                                Total cost: {currency(d.totalCost)}
                              </p>
                              <p className="text-sm text-neutral-300">
                                Time: {d.duration.toFixed(2)}s
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter data={performanceData} isAnimationActive={false}>
                      {performanceData.map((entry) => (
                        <Cell
                          key={entry.originalModel}
                          fill={getModelColor(entry.originalModel)}
                        />
                      ))}
                      {!isMobile ? (
                        <LabelList
                          dataKey="model"
                          content={({ x, y, value }: any) => {
                            const nx =
                              (typeof x === "number" ? x : Number(x)) || 0;
                            const ny =
                              (typeof y === "number" ? y : Number(y)) || 0;
                            return (
                              <text
                                x={nx + 10}
                                y={ny}
                                dy={4}
                                textAnchor="left"
                                className="pointer-events-none text-xs font-medium fill-neutral-200"
                                style={{
                                  textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                                }}
                              >
                                {String(value)}
                              </text>
                            );
                          }}
                        />
                      ) : null}
                    </Scatter>
                  </ScatterChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
