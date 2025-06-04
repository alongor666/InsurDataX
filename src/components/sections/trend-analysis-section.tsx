"use client";

import type { ChartDataItem, BusinessLine } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { LineChart as LucideLineChart, Palette } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart as RechartsLineChart, XAxis, YAxis, TooltipProps } from "recharts";
import type {NameType, ValueType} from 'recharts/types/component/DefaultTooltipContent';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockBusinessLines } from '@/data/mock-data'; // To get line names for colors
import { cn } from '@/lib/utils';


interface TrendAnalysisSectionProps {
  data: ChartDataItem[];
  availableMetrics: { value: keyof BusinessLine['data'], label: string }[];
  onMetricChange: (metric: keyof BusinessLine['data']) => void;
  selectedMetric: keyof BusinessLine['data'];
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
  
  const businessLineNames = mockBusinessLines.map(bl => bl.name);
  const chartConfig = businessLineNames.reduce((acc, name, index) => {
    acc[name] = {
      label: name,
      color: `hsl(var(--${chartColorKeys[index % chartColorKeys.length]}))`,
    };
    return acc;
  }, {} as any);


  const yAxisFormatter = (value: number) => {
    if (selectedMetric === 'lossRatio') return `${value}%`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const metricSelector = (
    <div className="flex items-center space-x-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedMetric} onValueChange={(value) => onMetricChange(value as keyof BusinessLine['data'])}>
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


  if (!data || data.length === 0) {
    return (
      <SectionWrapper title="趋势分析" icon={LucideLineChart} actionButton={metricSelector}>
        <p className="text-muted-foreground h-[300px] flex items-center justify-center">选择指标以查看趋势数据。</p>
      </SectionWrapper>
    );
  }
  
  return (
    <SectionWrapper title="趋势分析" icon={LucideLineChart} actionButton={metricSelector}>
      <div className="h-[350px] w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value.slice(-5)} />
            <YAxis tickFormatter={yAxisFormatter} tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<CustomTooltip />} />
            <ChartLegend content={<ChartLegendContent />} />
            {businessLineNames.map((lineName, index) => (
              <Line
                key={lineName}
                dataKey={lineName}
                type="monotone"
                stroke={`hsl(var(--${chartColorKeys[index % chartColorKeys.length]}))`}
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
