
"use client";

import type { ChartDataItem } from '@/data/types'; // Removed BusinessLine import as it's not directly used here for metrics type
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { LineChart as LucideLineChart, Palette } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart as RechartsLineChart, XAxis, YAxis, TooltipProps } from "recharts";
import type {NameType, ValueType} from 'recharts/types/component/DefaultTooltipContent';
import { useMemo } from 'react'; // Changed from useState to useMemo for derived values
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Removed: import { mockBusinessLines } from '@/data/mock-data'; 
import { cn } from '@/lib/utils';
import type { ProcessedDataForPeriod, TrendMetricKey as V4TrendMetricKey } from '@/data/types'; // Using V4 type for metric keys

interface TrendAnalysisSectionProps {
  data: ChartDataItem[];
  availableMetrics: { value: V4TrendMetricKey, label: string }[]; // Use V4TrendMetricKey
  onMetricChange: (metric: V4TrendMetricKey) => void; // Use V4TrendMetricKey
  selectedMetric: V4TrendMetricKey; // Use V4TrendMetricKey
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


export function TrendAnalysisSection({ data, availableMetrics, onMetricChange, selectedMetric }: TrendAnalysisSectionProps) {
  
  const businessLineNames = useMemo(() => {
    if (!data || data.length === 0) return [];
    const keys = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'name' && key !== 'date' && typeof item[key] === 'number') { // Assuming 'name' or 'date' is the x-axis key
          keys.add(key);
        }
      });
    });
    return Array.from(keys);
  }, [data]);
  
  const chartConfig = useMemo(() => {
    return businessLineNames.reduce((acc, name, index) => {
      acc[name] = {
        label: name,
        color: `hsl(var(--${chartColorKeys[index % chartColorKeys.length]}))`,
      };
      return acc;
    }, {} as any);
  }, [businessLineNames]);


  const yAxisFormatter = (value: number) => {
    // TODO: Make this sensitive to selectedMetric (e.g. if it's a percentage)
    // For now, keeping generic formatting
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    if (selectedMetric === 'loss_ratio' || selectedMetric === 'expense_ratio' || selectedMetric === 'variable_cost_ratio') return `${value.toFixed(1)}%`;
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


  if (!data || data.length === 0 || businessLineNames.length === 0) {
    return (
      <SectionWrapper title="趋势分析" icon={LucideLineChart} actionButton={metricSelector}>
        <p className="text-muted-foreground h-[300px] flex items-center justify-center">选择指标以查看趋势数据，或当前条件下无趋势数据。</p>
      </SectionWrapper>
    );
  }
  
  return (
    <SectionWrapper title="趋势分析" icon={LucideLineChart} actionButton={metricSelector}>
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
    </SectionWrapper>
  );
}

