
"use client";

import type { ChartDataItem } from '@/data/types'; 
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { ChartAiSummary } from '@/components/shared/chart-ai-summary';
import { LineChart as LucideLineChart, Palette } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart as RechartsLineChart, XAxis, YAxis, TooltipProps } from "recharts";
import type {NameType, ValueType} from 'recharts/types/component/DefaultTooltipContent';
import { useMemo } from 'react'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TrendMetricKey as V4TrendMetricKey } from '@/data/types'; 

interface TrendAnalysisSectionProps {
  data: ChartDataItem[];
  availableMetrics: { value: V4TrendMetricKey, label: string }[]; 
  onMetricChange: (metric: V4TrendMetricKey) => void; 
  selectedMetric: V4TrendMetricKey; 
  aiSummary: string | null;
  isAiSummaryLoading: boolean;
  onGenerateAiSummary: () => Promise<void>;
}

const chartColorKeys = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-1 gap-1.5">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center gap-1.5">
               <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: entry.color }}/>
              <p className="text-xs text-muted-foreground">{entry.name}:</p>
              <p className="text-xs font-medium text-foreground">
                {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};


export function TrendAnalysisSection({ 
  data, 
  availableMetrics, 
  onMetricChange, 
  selectedMetric,
  aiSummary,
  isAiSummaryLoading,
  onGenerateAiSummary 
}: TrendAnalysisSectionProps) {
  
  const businessLineNames = useMemo(() => {
    if (!data || data.length === 0) return [];
    const keys = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'name' && key !== 'date' && typeof item[key] === 'number') { 
          keys.add(key);
        }
      });
    });
    return Array.from(keys);
  }, [data]);
  
  const chartConfig = useMemo(() => {
    return businessLineNames.reduce((acc, name, index) => {
      acc[name] = {
        label: name, // In a multi-line trend, 'name' would be the business line.
        color: `hsl(var(--${chartColorKeys[index % chartColorKeys.length]}))`,
      };
      return acc;
    }, {} as any);
  }, [businessLineNames]);


  const yAxisFormatter = (value: number) => {
    const selectedMetricConfig = availableMetrics.find(m => m.value === selectedMetric);
    if (selectedMetricConfig && (
        selectedMetricConfig.value.includes('ratio') || 
        selectedMetricConfig.value.includes('frequency')
        )) {
        return `${value.toFixed(1)}%`;
    }
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const metricSelector = (
    <div className="flex items-center space-x-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedMetric} onValueChange={(value) => onMetricChange(value as V4TrendMetricKey)}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
            <SelectValue placeholder="选择指标" />
            </SelectTrigger>
            <SelectContent>
            {availableMetrics.map(metric => (
                <SelectItem key={metric.value} value={metric.value} className="text-xs">{metric.label}</SelectItem>
            ))}
            </SelectContent>
        </Select>
    </div>
  );


  const hasData = data && data.length > 0 && businessLineNames.length > 0;

  return (
    <SectionWrapper title="趋势分析" icon={LucideLineChart} actionButton={metricSelector}>
      {!hasData ? (
        <p className="text-muted-foreground h-[300px] flex items-center justify-center">选择指标以查看趋势数据，或当前条件下无趋势数据。</p>
      ) : (
        <div className="h-[350px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => typeof value === 'string' ? value.slice(-5) : value} />
              <YAxis tickFormatter={yAxisFormatter} tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<CustomTooltip />} />
              <ChartLegend content={<ChartLegendContent />} />
              {businessLineNames.map((lineName, index) => (
                <Line
                  key={lineName}
                  dataKey={lineName}
                  type="monotone"
                  stroke={chartConfig[lineName]?.color || `hsl(var(--${chartColorKeys[index % chartColorKeys.length]}))`}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </RechartsLineChart>
          </ChartContainer>
        </div>
      )}
      <ChartAiSummary
        summary={aiSummary}
        isLoading={isAiSummaryLoading}
        onGenerateSummary={onGenerateAiSummary}
        hasData={hasData}
        chartTypeLabel="趋势图"
      />
    </SectionWrapper>
  );
}
