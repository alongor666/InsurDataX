"use client";

import type { ChartDataItem, BusinessLine } from '@/data/types';
import type { ProcessedDataForPeriod } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { BarChartHorizontal, Palette } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, TooltipProps, ResponsiveContainer, LabelList } from "recharts";
import type {NameType, ValueType} from 'recharts/types/component/DefaultTooltipContent';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type RankingMetricKey = keyof Pick<ProcessedDataForPeriod, 'premium' | 'claims' | 'policies' | 'lossRatio'>;

interface BarChartRankingSectionProps {
  data: ChartDataItem[];
  availableMetrics: { value: RankingMetricKey, label: string }[];
  onMetricChange: (metric: RankingMetricKey) => void;
  selectedMetric: RankingMetricKey;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        <p className="text-xs text-muted-foreground">
          {payload[0].name}: {typeof payload[0].value === 'number' ? payload[0].value.toLocaleString() : payload[0].value}
          {payload[0].name === 'lossRatio' ? '%' : ''}
        </p>
      </div>
    );
  }
  return null;
};

export function BarChartRankingSection({ data, availableMetrics, onMetricChange, selectedMetric }: BarChartRankingSectionProps) {
  
  const chartConfig = {
    [selectedMetric]: {
      label: availableMetrics.find(m => m.value === selectedMetric)?.label || selectedMetric,
      color: "hsl(var(--chart-1))",
    },
  };

  const valueFormatter = (value: number) => {
    if (selectedMetric === 'lossRatio') return `${value.toFixed(1)}%`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const metricSelector = (
    <div className="flex items-center space-x-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedMetric} onValueChange={(value) => onMetricChange(value as RankingMetricKey)}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
            <SelectValue placeholder="选择排名指标" />
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
      <SectionWrapper title="水平条形图排名" icon={BarChartHorizontal} actionButton={metricSelector}>
        <p className="text-muted-foreground h-[300px] flex items-center justify-center">选择指标以查看排名数据。</p>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper title="水平条形图排名" icon={BarChartHorizontal} actionButton={metricSelector}>
      <div className="h-[350px] w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <RechartsBarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={valueFormatter} axisLine={false} tickLine={false}/>
            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" width={100} tick={{fontSize: 12}}/>
            <ChartTooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--muted))'}}/>
            <Bar dataKey={selectedMetric} fill="var(--color-selectedMetric)" radius={4}>
                 <LabelList dataKey={selectedMetric} position="right" formatter={valueFormatter} className="fill-foreground text-xs" />
            </Bar>
          </RechartsBarChart>
        </ChartContainer>
      </div>
    </SectionWrapper>
  );
}

