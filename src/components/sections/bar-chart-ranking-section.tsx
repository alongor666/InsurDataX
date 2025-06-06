

"use client";

import type { ChartDataItem } from '@/data/types';
import type { ProcessedDataForPeriod, RankingMetricKey } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { ChartAiSummary } from '@/components/shared/chart-ai-summary';
import { BarChartHorizontal, Palette } from 'lucide-react';
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, TooltipProps, ResponsiveContainer, LabelList } from "recharts";
import type {NameType, ValueType} from 'recharts/types/component/DefaultTooltipContent';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BarChartRankingSectionProps {
  data: ChartDataItem[];
  availableMetrics: { value: RankingMetricKey, label: string }[];
  onMetricChange: (metric: RankingMetricKey) => void;
  selectedMetric: RankingMetricKey;
  aiSummary: string | null;
  isAiSummaryLoading: boolean;
  onGenerateAiSummary: () => Promise<void>;
}

const xAxisTickFormatter = (value: number): string => {
  if (value === 0) return "0";
  if (Math.abs(value) >= 10000) { // 亿
    return `${(value / 10000).toFixed(1)}亿`;
  }
  if (Math.abs(value) >= 1000) { // 千万
    return `${(value / 1000).toFixed(0)}千万`;
  }
  return `${value.toFixed(0)}万`; // 万 (assuming input 'value' for ticks is already in '万元' scale from chart data)
};

const valueFormatterForLabelList = (value: number, metricConfig?: { value: RankingMetricKey, label: string }): string => {
  if (value === undefined || value === null || isNaN(value)) return "N/A";
  if (!metricConfig) return value.toLocaleString();

  const label = metricConfig.label;

  if (label.includes('(%)')) return `${value.toFixed(1)}%`;
  if (label.includes('(件)')) return value.toLocaleString(undefined, {maximumFractionDigits: 0}) + "件";
  if (label.includes('(元)')) {
    if (Math.abs(value) >= 1000000) return `${(value/1000000).toFixed(1)}百万`;
    return value.toLocaleString(undefined, {maximumFractionDigits:0}) + "元";
  }
  
  // Default for (万元) or other monetary values not explicitly元
  if (label.includes('(万元)')) {
    if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(1)}亿`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}千万`;
    return `${value.toFixed(2)}万`; // Keep precision for smaller 万 values
  }
  
  return value.toLocaleString(undefined, {maximumFractionDigits: 2}); // Generic fallback
};


const CustomTooltip = ({ active, payload, label, selectedMetricKey, availableMetricsList }: TooltipProps<ValueType, NameType> & { selectedMetricKey?: RankingMetricKey, availableMetricsList?: { value: RankingMetricKey, label: string }[] }) => {
  if (active && payload && payload.length && selectedMetricKey && availableMetricsList) {
    const metricConfig = availableMetricsList.find(m => m.value === selectedMetricKey);
    const value = payload[0].value as number;
    const formattedValue = valueFormatterForLabelList(value, metricConfig);
    
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        <p className="text-xs text-muted-foreground">
          {metricConfig?.label || payload[0].name}: {formattedValue}
        </p>
      </div>
    );
  }
  return null;
};


export function BarChartRankingSection({ 
  data, 
  availableMetrics, 
  onMetricChange, 
  selectedMetric,
  aiSummary,
  isAiSummaryLoading,
  onGenerateAiSummary
}: BarChartRankingSectionProps) {
  
  const selectedMetricConfig = availableMetrics.find(m => m.value === selectedMetric);

  const chartConfig = { 
    [selectedMetric]: {
      label: selectedMetricConfig?.label || selectedMetric,
    },
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

  const hasData = data && data.length > 0;

  return (
    <SectionWrapper title="水平条形图排名" icon={BarChartHorizontal} actionButton={metricSelector}>
      {!hasData ? (
        <p className="text-muted-foreground h-[300px] flex items-center justify-center">选择指标以查看排名数据。</p>
      ): (
        <div className="h-[350px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <RechartsBarChart data={data} layout="vertical" margin={{ top: 5, right: 50, left: 30, bottom: 5 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis 
                type="number" 
                tickFormatter={xAxisTickFormatter} 
                axisLine={false} 
                tickLine={false} 
                domain={[0, 'dataMax + dataMax * 0.1']}
              />
              <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" width={110} tick={{fontSize: 12}}/>
              <ChartTooltip 
                content={<CustomTooltip selectedMetricKey={selectedMetric} availableMetricsList={availableMetrics}/>} 
                cursor={{fill: 'hsl(var(--muted))'}}
              />
              <Bar dataKey={selectedMetric} radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                    <LabelList 
                      key={`label-${index}`}
                      dataKey={selectedMetric} 
                      position="right" 
                      formatter={(val: number) => valueFormatterForLabelList(val, selectedMetricConfig)}
                      className="fill-foreground text-xs" 
                    />
                ))}
                 {data.map((entry, index) => (
                    // @ts-ignore Recharts fill prop can accept a function for conditional coloring per bar, but here color is direct from data
                    <Bar key={`cell-${index}`} dataKey={selectedMetric} fill={entry.color || 'hsl(var(--chart-1))'} />
                ))}
              </Bar>
            </RechartsBarChart>
          </ChartContainer>
        </div>
      )}
       <ChartAiSummary
        summary={aiSummary}
        isLoading={isAiSummaryLoading}
        onGenerateSummary={onGenerateAiSummary}
        hasData={hasData}
        chartTypeLabel="排名图"
      />
    </SectionWrapper>
  );
}

