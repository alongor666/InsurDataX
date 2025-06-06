
"use client";

import type { BubbleChartDataItem, BubbleMetricKey } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { ChartAiSummary } from '@/components/shared/chart-ai-summary';
import { ScatterChart as LucideScatterChart, Palette } from 'lucide-react'; 
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { CartesianGrid, Scatter, ScatterChart as RechartsScatterChart, XAxis, YAxis, ZAxis, TooltipProps, Legend } from "recharts";
import type {NameType, ValueType} from 'recharts/types/component/DefaultTooltipContent';
import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BubbleChartSectionProps {
  data: BubbleChartDataItem[];
  availableMetrics: { value: BubbleMetricKey, label: string }[];
  selectedXAxisMetric: BubbleMetricKey;
  onXAxisMetricChange: (metric: BubbleMetricKey) => void;
  selectedYAxisMetric: BubbleMetricKey;
  onYAxisMetricChange: (metric: BubbleMetricKey) => void;
  selectedSizeMetric: BubbleMetricKey;
  onSizeMetricChange: (metric: BubbleMetricKey) => void;
  aiSummary: string | null;
  isAiSummaryLoading: boolean;
  onGenerateAiSummary: () => Promise<void>;
}

const CustomTooltip = ({ active, payload, label, xAxisMetricLabel, yAxisMetricLabel, sizeMetricLabel }: TooltipProps<ValueType, NameType> & { xAxisMetricLabel?: string, yAxisMetricLabel?: string, sizeMetricLabel?: string }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as BubbleChartDataItem;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[200px]">
        <p className="text-sm font-medium text-foreground mb-1">{data.name}</p>
        <p className="text-xs text-muted-foreground">{xAxisMetricLabel || 'X'}: {typeof data.x === 'number' ? data.x.toLocaleString(undefined, {maximumFractionDigits: 2}) : data.x}</p>
        <p className="text-xs text-muted-foreground">{yAxisMetricLabel || 'Y'}: {typeof data.y === 'number' ? (yAxisMetricLabel?.includes('%') ? data.y.toFixed(1) + '%' : data.y.toLocaleString(undefined, {maximumFractionDigits:2})) : data.y}</p>
        <p className="text-xs text-muted-foreground">{sizeMetricLabel || 'Size'}: {typeof data.z === 'number' ? data.z.toLocaleString() : data.z}</p>
        {data.vcr !== undefined && <p className="text-xs" style={{color: data.color}}>VCR: {data.vcr.toFixed(1)}%</p>}
      </div>
    );
  }
  return null;
};

export function BubbleChartSection({ 
  data, 
  availableMetrics,
  selectedXAxisMetric, onXAxisMetricChange,
  selectedYAxisMetric, onYAxisMetricChange,
  selectedSizeMetric, onSizeMetricChange,
  aiSummary, isAiSummaryLoading, onGenerateAiSummary 
}: BubbleChartSectionProps) {
  
  const uniqueBusinessLines = useMemo(() => {
    if (!data || data.length === 0) return [];
    const lines = new Map<string, { id: string; name: string; color?: string }>();
    data.forEach(item => {
      if (item && item.id && item.name && !lines.has(item.id)) { 
        lines.set(item.id, { id: item.id, name: item.name, color: item.color });
      }
    });
    return Array.from(lines.values());
  }, [data]);

  // Chart config is now primarily for legend labels, colors are data-driven
  const chartConfig = useMemo(() => {
    if (!uniqueBusinessLines || uniqueBusinessLines.length === 0) return {};
    return uniqueBusinessLines.reduce((acc, line) => {
      acc[line.id] = { 
        label: line.name,
        color: line.color || `hsl(var(--muted))`, // Fallback color
      };
      return acc;
    }, {} as any);
  }, [uniqueBusinessLines]);

  const hasData = data && data.length > 0 && uniqueBusinessLines.length > 0;

  const getMetricLabel = (metricKey: BubbleMetricKey) => availableMetrics.find(m => m.value === metricKey)?.label || metricKey;
  
  const xAxisLabel = getMetricLabel(selectedXAxisMetric);
  const yAxisLabel = getMetricLabel(selectedYAxisMetric);
  const sizeMetricLabel = getMetricLabel(selectedSizeMetric);

  const formatAxisTick = (value: number, metricKey: BubbleMetricKey) => {
    const label = getMetricLabel(metricKey);
    if (label.includes('%')) return `${value.toFixed(0)}%`;
    if (label.includes('(元)')) {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}百万`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}千`;
      return value.toFixed(0);
    }
    if (label.includes('(万元)')) {
        if (value >= 10000) return `${(value / 10000).toFixed(1)}亿`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}千万`;
        return value.toFixed(0);
    }
    return value.toLocaleString(undefined, {maximumFractionDigits: 0});
  };
  
  const xDomain = hasData ? [0, Math.max(...data.map(item => item.x)) * 1.1] : [0,1];
  const yDomain = hasData ? [0, Math.max(...data.map(item => item.y)) * 1.1] : [0,1];

  const metricSelectors = (
    <div className="flex flex-wrap items-center gap-2 md:gap-4">
      <div className="flex items-center space-x-1">
        <Palette className="h-3 w-3 text-muted-foreground" />
        <label htmlFor="x-axis-metric" className="text-xs text-muted-foreground">X轴:</label>
        <Select value={selectedXAxisMetric} onValueChange={onXAxisMetricChange}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{availableMetrics.map(m => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-1">
        <Palette className="h-3 w-3 text-muted-foreground" />
        <label htmlFor="y-axis-metric" className="text-xs text-muted-foreground">Y轴:</label>
        <Select value={selectedYAxisMetric} onValueChange={onYAxisMetricChange}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{availableMetrics.map(m => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-1">
        <Palette className="h-3 w-3 text-muted-foreground" />
        <label htmlFor="size-metric" className="text-xs text-muted-foreground">大小:</label>
        <Select value={selectedSizeMetric} onValueChange={onSizeMetricChange}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{availableMetrics.map(m => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <SectionWrapper title="对比气泡图" icon={LucideScatterChart} actionButton={metricSelectors}>
      {!hasData ? (
         <p className="text-muted-foreground h-[300px] flex items-center justify-center">暂无数据生成气泡图，或请选择指标。</p>
      ) : (
        <div className="h-[400px] w-full"> {/* Increased height to accommodate legend */}
          <ChartContainer config={chartConfig} className="h-full w-full">
              <RechartsScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name={xAxisLabel} 
                  domain={xDomain} 
                  tickFormatter={(val) => formatAxisTick(val, selectedXAxisMetric)} 
                  label={{ value: xAxisLabel, position: 'insideBottomRight', offset: -15, fontSize: 12 }} 
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name={yAxisLabel} 
                  domain={yDomain} 
                  tickFormatter={(val) => formatAxisTick(val, selectedYAxisMetric)}
                  label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset:0, fontSize: 12 }}
                />
                <ZAxis type="number" dataKey="z" range={[100, 1000]} name={sizeMetricLabel} />
                <ChartTooltip 
                    cursor={{ strokeDasharray: '3 3' }} 
                    content={<CustomTooltip xAxisMetricLabel={xAxisLabel} yAxisMetricLabel={yAxisLabel} sizeMetricLabel={sizeMetricLabel}/>} 
                />
                <Legend 
                  formatter={(value, entry) => chartConfig[entry.payload?.id as string]?.label || value}
                  wrapperStyle={{ paddingTop: "20px" }}
                />
                {uniqueBusinessLines.map((line) => (
                  <Scatter 
                    key={line.id} 
                    name={line.name} 
                    data={data.filter(d => d.id === line.id)} 
                    fill={line.color || chartConfig[line.id]?.color}
                  />
                ))}
              </RechartsScatterChart>
          </ChartContainer>
        </div>
      )}
      <ChartAiSummary
        summary={aiSummary}
        isLoading={isAiSummaryLoading}
        onGenerateSummary={onGenerateAiSummary}
        hasData={hasData}
        chartTypeLabel="气泡图"
      />
    </SectionWrapper>
  );
}
