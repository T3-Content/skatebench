"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import {
  DollarSign,
  Clock,
  TrendingUp,
  ChevronDown,
} from "lucide-react";
import benchmarkData from "../data/benchmark-results.json";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
      d="m1115.3 454.92c86.906-103.12 81.844-257.9-15.234-354.98-97.125-97.031-251.86-102.14-354.98-15.234l-18.75-18.703c-8.8125-8.8125-23.062-8.8125-31.875 0l-135.89 135.89c-8.8125 8.8125-8.8125 23.062 0 31.875l18.047 18.047-324.79 324.79-18.047-18.047c-8.8125-8.8125-23.062-8.8125-31.875 0l-135.89 135.89c-8.8125 8.8125-8.8125 23.062 0 31.875l18.703 18.703c-86.906 103.17-81.797 257.9 15.281 354.98 97.078 97.078 251.86 102.14 354.98 15.234l18.703 18.703c8.8125 8.8125 23.062 8.8125 31.875 0l135.89-135.89c8.8125-8.8125 8.8125-23.062 0-31.875l-18.047-18.047 324.84-324.84 18.047 18.047c8.8125 8.8125 23.062 8.8125 31.875 0l135.89-135.89c8.8125-8.8125 8.8125-23.062 0-31.875zm-321-321-17.203-17.203c85.406-69.422 211.6-64.359 291.1 15.094 79.5 79.5 84.516 205.69 15.094 291.1l-17.203-17.203c-8.8125-8.8125-23.062-8.8125-31.875 0l-18.047 18.047-239.9-239.9 18.047-18.047c8.8125-8.8125 8.8125-23.062 0-31.875zm-85.969 117.89 36.047-36.047 239.9 239.9-36.047 36.047zm123.1 186.84-18.047 18.047c-19.312 19.312-50.719 19.312-70.031 0s-19.312-50.719 0-70.031l18.047-18.047zm-121.03-324.84 36.047 36.047-104.02 104.02-36.047-36.047zm-492.56 492.56 36.047 36.047-54 54 0.046875-0.046875-50.109 50.109-36.047-36.047zm273.84 341.81-36.047 36.047-239.9-239.86 36.047-36.047zm-123.1-186.84 18.047-18.047c19.312-19.312 50.719-19.312 70.031 0s19.312 50.719 0 70.031l-18.047 18.047zm37.125 304.74 17.203 17.203c-85.406 69.422-211.6 64.359-291.1-15.094-79.5-79.5-84.516-205.69-15.094-291.1l17.203 17.203c8.8125 8.8125 23.062 8.8125 31.875 0l18.047-18.047 239.9 239.9-18.047 18.047c-8.8125 8.8125-8.7656 23.062 0 31.875zm83.906 20.109-36.094-36.094c79.828-79.828 100.41-100.41 104.02-104.02l0.14062 0.14062c0.79688 0.79688 6.1875 6.1875 35.906 35.906zm408.71-512.72 18.047 18.047-324.84 324.79-18.047-18.047c-8.8125-8.8125-23.062-8.8125-31.875 0l-18.047 18.047-53.062-53.062 18.047-18.047c36.891-36.891 36.891-96.891 0-133.78-36.891-36.891-96.891-36.891-133.78 0l-18.047 18.047-53.062-53.062 18.047-18.047c8.8125-8.8125 8.8125-23.062 0-31.875l104.02-104.02 36.047 36.047 18.047-18.047c8.8125-8.8125 23.062-8.8125 31.875 0zm-271.78 271.73-36.047-36.047 104.02-104.02 36.047 36.047zm235.73-235.73-36.047-36.047 104.02-104.02 36.047 36.047z"
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
    const inside = ratio >= 0.75; // place inside for longer bars
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

export default function BenchmarkVisualizer() {
  const { rankings, metadata } = benchmarkData as {
    rankings: ModelData[];
    metadata: any;
  };

  const [selectedModels, setSelectedModels] = useState<string[]>(
    rankings
      .map((m) => m.model)
      .filter(
        (model) =>
          ![
            "gemini-3-flash-low",
            "gpt-5-default",
            "gpt-5-mini",
            "gpt-5-minimal",
            "gpt-oss-120b-high",
            "gpt-5.1-high",
          ].includes(model)
      )
  );

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
    const topThree = rankings.slice(0, 3).map((r) => r.model);
    
    if (topThree.includes(modelName)) {
      if (topThree[0] === modelName) return "hsl(var(--safety-green))";
      if (topThree[1] === modelName) return "hsl(var(--electric-blue))";
      if (topThree[2] === modelName) return "hsl(var(--hazard-orange))";
    }

    return "hsl(var(--muted-foreground) / 0.5)";
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
    <div className="relative min-h-screen overflow-x-hidden bg-[#050505] text-neutral-100 selection:bg-orange-500/30">
      <div className="noise-overlay" />
      <div className="grid-background absolute inset-0 pointer-events-none" />
      
      <header className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-8 border-b border-white/5">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 blur-2xl bg-orange-500/20 rounded-full" />
              <SkateboardSVG className="relative h-16 w-16 stroke-white fill-white" />
            </div>
            <div>
              <h1 className="stencil-text text-4xl sm:text-6xl tracking-tighter leading-none">
                SKATE<span className="text-orange-500">BENCH</span>
              </h1>
              <p className="mt-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-neutral-500">
                <span className="h-2 w-2 bg-orange-500 animate-pulse rounded-full" />
                Data / {metadata?.testSuite || "Benchmark"}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2 font-mono text-[10px] uppercase tracking-tighter text-neutral-500">
            <div className="flex gap-4">
              <span>System: ONLINE</span>
              <span>Models: {metadata?.totalModels ?? rankings.length}</span>
            </div>
            {metadata?.timestamp && (
              <span>Last Sync: {new Date(metadata.timestamp).toISOString()}</span>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-12">
        <Tabs defaultValue="accuracy" className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
            <TabsList className="bg-transparent h-auto p-0 gap-8">
              <TabsTrigger
                value="accuracy"
                className="stencil-text text-sm p-0 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-green-500 border-b-2 border-transparent data-[state=active]:border-green-500 transition-none"
              >
                Accuracy
              </TabsTrigger>
              <TabsTrigger
                value="cost"
                className="stencil-text text-sm p-0 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-blue-500 border-b-2 border-transparent data-[state=active]:border-blue-500 transition-none"
              >
                Cost
              </TabsTrigger>
              <TabsTrigger
                value="speed"
                className="stencil-text text-sm p-0 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-purple-500 border-b-2 border-transparent data-[state=active]:border-purple-500 transition-none"
              >
                Speed
              </TabsTrigger>
              <TabsTrigger
                value="combined"
                className="stencil-text text-sm p-0 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-orange-500 border-b-2 border-transparent data-[state=active]:border-orange-500 transition-none"
              >
                Matrix
              </TabsTrigger>
            </TabsList>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="font-mono text-[10px] uppercase border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800"
                >
                  Filter Models [{selectedModels.length}/{rankings.length}]
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 border-neutral-800 bg-neutral-950 text-white backdrop-blur-xl">
                <div className="flex gap-2 p-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSelectAll}
                    className="flex-1 text-[10px] uppercase font-mono hover:bg-white/5"
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDeselectAll}
                    className="flex-1 text-[10px] uppercase font-mono hover:bg-white/5"
                  >
                    Clear
                  </Button>
                </div>
                <DropdownMenuSeparator className="bg-white/5" />
                <ScrollArea className="h-80">
                  {rankings.map((m) => (
                    <DropdownMenuItem
                      key={m.model}
                      className="flex items-center gap-3 py-2 px-4 focus:bg-white/5 cursor-pointer"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Checkbox
                        id={m.model}
                        checked={selectedModels.includes(m.model)}
                        onCheckedChange={() => handleModelToggle(m.model)}
                        className="border-neutral-700 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                      />
                      <label
                        htmlFor={m.model}
                        className="flex-1 truncate font-mono text-[11px] text-neutral-400 cursor-pointer"
                      >
                        {m.model}
                      </label>
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <TabsContent value="accuracy" className="mt-0">
            <div className="glass-card relative overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="stencil-text text-2xl">Accuracy Distribution</h2>
                    <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
                      Success rate based on {totalTestsPerModel} technical trick definitions
                    </p>
                  </div>
                </div>
                
                <ChartContainer
                  config={{
                    successRate: {
                      label: "Success Rate",
                      color: "hsl(var(--safety-green))",
                    },
                  }}
                  className="h-[500px] w-full"
                  style={isMobile ? { height: mobileBarHeight } : undefined}
                >
                  <BarChart
                    data={successRateData}
                    layout={isMobile ? "vertical" : "horizontal"}
                    margin={{ top: 20, right: 30, left: isMobile ? 120 : 0, bottom: isMobile ? 20 : 60 }}
                  >
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis
                      dataKey={isMobile ? "successRate" : "model"}
                      type={isMobile ? "number" : "category"}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#666", fontSize: 10, fontFamily: "var(--font-mono)" }}
                      angle={isMobile ? 0 : -45}
                      textAnchor={isMobile ? "start" : "end"}
                      height={isMobile ? 30 : 80}
                    />
                    <YAxis
                      dataKey={isMobile ? "model" : "successRate"}
                      type={isMobile ? "category" : "number"}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#666", fontSize: 10, fontFamily: "var(--font-mono)" }}
                      domain={[0, 100]}
                      width={isMobile ? 100 : 40}
                    />
                    <ChartTooltip
                      cursor={{ fill: "rgba(255,255,255,0.02)" }}
                      content={<ChartTooltipContent className="bg-neutral-950 border-neutral-800 font-mono text-[10px]" />}
                    />
                    <Bar
                      dataKey="successRate"
                      radius={[2, 2, 0, 0]}
                      barSize={isMobile ? 20 : 30}
                    >
                      {successRateData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getModelColor(entry.model)}
                          className="transition-all duration-300 hover:opacity-80"
                        />
                      ))}
                      <LabelList
                        dataKey="successRate"
                        position={isMobile ? "right" : "top"}
                        content={isMobile 
                          ? barValueLabelHorizontalSmart("%", 0, 100) 
                          : barValueLabel("%", 0)}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cost" className="mt-0">
            <div className="glass-card relative overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="stencil-text text-2xl">Cost Efficiency</h2>
                    <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
                      Average cost per test in cents (lower is better)
                    </p>
                  </div>
                </div>
                
                <ChartContainer
                  config={{
                    totalCost: {
                      label: "Cost per Test",
                      color: "hsl(var(--electric-blue))",
                    },
                  }}
                  className="h-[500px] w-full"
                  style={isMobile ? { height: mobileBarHeight } : undefined}
                >
                  <BarChart
                    data={costData}
                    layout={isMobile ? "vertical" : "horizontal"}
                    margin={{ top: 20, right: 30, left: isMobile ? 120 : 0, bottom: isMobile ? 20 : 60 }}
                  >
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis
                      dataKey={isMobile ? "totalCost" : "model"}
                      type={isMobile ? "number" : "category"}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#666", fontSize: 10, fontFamily: "var(--font-mono)" }}
                      angle={isMobile ? 0 : -45}
                      textAnchor={isMobile ? "start" : "end"}
                      height={isMobile ? 30 : 80}
                    />
                    <YAxis
                      dataKey={isMobile ? "model" : "totalCost"}
                      type={isMobile ? "category" : "number"}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#666", fontSize: 10, fontFamily: "var(--font-mono)" }}
                      width={isMobile ? 100 : 40}
                    />
                    <ChartTooltip
                      cursor={{ fill: "rgba(255,255,255,0.02)" }}
                      content={<ChartTooltipContent className="bg-neutral-950 border-neutral-800 font-mono text-[10px]" />}
                    />
                    <Bar
                      dataKey="totalCost"
                      radius={[2, 2, 0, 0]}
                      barSize={isMobile ? 20 : 30}
                    >
                      {costData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getModelColor(entry.model)}
                          className="transition-all duration-300 hover:opacity-80"
                        />
                      ))}
                      <LabelList
                        dataKey="totalCost"
                        position={isMobile ? "right" : "top"}
                        content={isMobile 
                          ? barValueLabelHorizontalSmart("", 2, costMax || 1) 
                          : barValueLabel("", 2)}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="speed" className="mt-0">
            <div className="glass-card relative overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="stencil-text text-2xl">Response Latency</h2>
                    <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
                      Average response time in seconds (lower is better)
                    </p>
                  </div>
                </div>
                
                <ChartContainer
                  config={{
                    duration: {
                      label: "Latency",
                      color: "hsl(var(--hazard-orange))",
                    },
                  }}
                  className="h-[500px] w-full"
                  style={isMobile ? { height: mobileBarHeight } : undefined}
                >
                  <BarChart
                    data={speedData}
                    layout={isMobile ? "vertical" : "horizontal"}
                    margin={{ top: 20, right: 30, left: isMobile ? 120 : 0, bottom: isMobile ? 20 : 60 }}
                  >
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis
                      dataKey={isMobile ? "duration" : "model"}
                      type={isMobile ? "number" : "category"}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#666", fontSize: 10, fontFamily: "var(--font-mono)" }}
                      angle={isMobile ? 0 : -45}
                      textAnchor={isMobile ? "start" : "end"}
                      height={isMobile ? 30 : 80}
                    />
                    <YAxis
                      dataKey={isMobile ? "model" : "duration"}
                      type={isMobile ? "category" : "number"}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#666", fontSize: 10, fontFamily: "var(--font-mono)" }}
                      width={isMobile ? 100 : 40}
                    />
                    <ChartTooltip
                      cursor={{ fill: "rgba(255,255,255,0.02)" }}
                      content={<ChartTooltipContent className="bg-neutral-950 border-neutral-800 font-mono text-[10px]" />}
                    />
                    <Bar
                      dataKey="duration"
                      radius={[2, 2, 0, 0]}
                      barSize={isMobile ? 20 : 30}
                    >
                      {speedData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getModelColor(entry.model)}
                          className="transition-all duration-300 hover:opacity-80"
                        />
                      ))}
                      <LabelList
                        dataKey="duration"
                        position={isMobile ? "right" : "top"}
                        content={isMobile 
                          ? barValueLabelHorizontalSmart("s", 1, speedMax || 1) 
                          : barValueLabel("s", 1)}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="combined" className="mt-0">
            <div className="glass-card relative overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="stencil-text text-2xl">Value Matrix</h2>
                    <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
                      Top-left is ELITE: High Accuracy, Low Cost
                    </p>
                  </div>
                </div>
                
                <ChartContainer
                  config={{
                    successRate: {
                      label: "Accuracy",
                      color: "hsl(var(--safety-green))",
                    },
                  }}
                  className="h-[500px] w-full"
                >
                  <ScatterChart
                    margin={{ top: 20, right: isMobile ? 20 : 120, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.03)" />
                    
                    <XAxis
                      type="number"
                      dataKey="totalCost"
                      name="Total Cost"
                      scale="log"
                      domain={[0.05, 20]}
                      ticks={[0.1, 0.5, 1, 5, 10, 20]}
                      tickFormatter={(val) => `$${val}`}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#666", fontSize: 10, fontFamily: "var(--font-mono)" }}
                      label={{ value: "TOTAL COST ($) LOG SCALE", position: "insideBottom", offset: -20, fill: "#444", fontSize: 10, fontFamily: "var(--font-mono)" }}
                    />
                    <YAxis
                      type="number"
                      dataKey="successRate"
                      name="Success Rate"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#666", fontSize: 10, fontFamily: "var(--font-mono)" }}
                      domain={[0, 100]}
                      label={{ value: "ACCURACY (%)", angle: -90, position: "insideLeft", offset: 10, fill: "#444", fontSize: 10, fontFamily: "var(--font-mono)" }}
                    />
                    <ChartTooltip
                      cursor={{ strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.1)" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload as any;
                          return (
                            <div className="glass-card p-4 font-mono text-[10px]">
                              <p className="stencil-text text-sm mb-2 text-orange-500">{d.model}</p>
                              <div className="space-y-1 text-neutral-400">
                                <p>ACCURACY: {d.successRate.toFixed(1)}%</p>
                                <p>TOTAL COST: {currency(d.totalCost)}</p>
                                <p>LATENCY: {d.duration.toFixed(2)}s</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter data={performanceData} isAnimationActive={false}>
                      {performanceData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getModelColor(entry.originalModel)}
                          className="transition-opacity duration-300 hover:opacity-70 cursor-crosshair"
                        />
                      ))}
                      {!isMobile && (
                        <LabelList
                          dataKey="model"
                          content={({ x, y, value }: any) => {
                            const nx = (typeof x === "number" ? x : Number(x)) || 0;
                            const ny = (typeof y === "number" ? y : Number(y)) || 0;
                            return (
                              <text
                                x={nx + 12}
                                y={ny}
                                dy={4}
                                className="pointer-events-none font-mono text-[10px] fill-neutral-300 uppercase font-bold"
                              >
                                {truncateLabel(value, 16)}
                              </text>
                            );
                          }}
                        />
                      )}
                    </Scatter>
                  </ScatterChart>
                </ChartContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Technical Footer Details */}
        <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-8 font-mono text-[10px] text-neutral-600 uppercase">
          <div>
            <span className="block text-neutral-400 mb-1">Source</span>
            <span>SkateBench Alpha v0.1</span>
          </div>
          <div>
            <span className="block text-neutral-400 mb-1">Engine</span>
            <span>Next.js + Recharts</span>
          </div>
          <div>
            <span className="block text-neutral-400 mb-1">Data Points</span>
            <span>{rankings.length * totalTestsPerModel} Tests Run</span>
          </div>
          <div className="text-right">
            <span className="block text-neutral-400 mb-1">Status</span>
            <span className="text-green-500">Live Feed Verified</span>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
      <div className="scanline" />
    </div>
  );
}
