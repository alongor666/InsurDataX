
"use client";

import type { ChartDataItem } from '@/data/types';
import type { RankingMetricKey } from '@/data/types'; // Removed ProcessedDataForPeriod as it's not directly used here for props
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

// Formatter for X-axis ticks, aiming for "万", "千万", "亿"
const xAxisTickFormatter = (value: number, metricConfig?: { value: RankingMetricKey, label: string }): string => {
  if (value === 0) return "0";
  
  // Default to '万' for amounts if not specified, or if it's a count/percentage
  let unitIsYuan = false;
  let unitIsPercent = false;
  let unitIsJian = false;

  if (metricConfig?.label) {
    if (metricConfig.label.includes('(元)')) unitIsYuan = true;
    if (metricConfig.label.includes('(%)')) unitIsPercent = true;
    if (metricConfig.label.includes('(件)')) unitIsJian = true;
  }
  
  if (unitIsPercent) return `${value.toFixed(0)}%`;
  if (unitIsJian) return `${value.toLocaleString(undefined, {maximumFractionDigits: 0})} 件`;

  let displayValue = value;
  if (unitIsYuan) displayValue = value / 10000; // Convert 元 to 万元 for axis scaling

  if (Math.abs(displayValue) >= 10000) { // 亿
    return `${(displayValue / 10000).toFixed(1)}亿`;
  }
  if (Math.abs(displayValue) >= 1000) { // 千万
    return `${(displayValue / 1000).toFixed(0)}千万`;
  }
  if (Math.abs(displayValue) > 0) { // 万
     return `${displayValue.toFixed(0)}万`;
  }
  return `${displayValue.toFixed(0)}`; // Default for smaller numbers or when unit is '万元'
};


const valueFormatterForLabelList = (value: number, metricConfig?: { value: RankingMetricKey, label: string }): string => {
  if (value === undefined || value === null || isNaN(value)) return "N/A";
  if (!metricConfig?.label) return Math.round(value).toLocaleString();

  const label = metricConfig.label;

  if (label.includes('(%)')) return `${Math.round(value)}%`;
  if (label.includes('(件)')) return `${Math.round(value)} 件`;
  
  let displayValue = value;
  let suffix = "";

  if (label.includes('(元)')) {
    displayValue = value / 10000; // Convert to 万 for display
    suffix = " 万";
  } else if (label.includes('(万元)')) {
    suffix = " 万";
  }
  // For other types (like ratios not in %), keep original value but round
  
  return `${Math.round(displayValue)}${suffix}`;
};


const CustomTooltip = ({ active, payload, label, selectedMetricKey, availableMetricsList }: TooltipProps<ValueType, NameType> & { selectedMetricKey?: RankingMetricKey, availableMetricsList?: { value: RankingMetricKey, label: string }[] }) => {
  if (active && payload && payload.length && selectedMetricKey && availableMetricsList) {
    const metricConfig = availableMetricsList.find(m => m.value === selectedMetricKey);
    const value = payload[0].value as number;
    // Use a more generic formatter for tooltip to show more precision if needed
    let formattedValue;
    if (metricConfig?.label.includes('(%)')) {
        formattedValue = `${value.toFixed(1)}%`;
    } else if (metricConfig?.label.includes('(件)')) {
        formattedValue = `${value.toLocaleString(undefined, {maximumFractionDigits: 0})} 件`;
    } else if (metricConfig?.label.includes('(元)')) {
        formattedValue = `${value.toLocaleString(undefined, {maximumFractionDigits: 0})} 元`;
    } else if (metricConfig?.label.includes('(万元)')) {
        formattedValue = `${value.toFixed(2)} 万元`;
    } else {
        formattedValue = value.toLocaleString(undefined, {maximumFractionDigits: 2});
    }
    
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[150px]">
        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        <p className="text-xs text-muted-foreground">
          {metricConfig?.label || payload[0].name}: {formattedValue}
        </p>
        {(payload[0].payload as ChartDataItem).vcr !== undefined && 
            <p className="text-xs" style={{color: (payload[0].payload as ChartDataItem).color}}>
                VCR: {((payload[0].payload as ChartDataItem).vcr as number).toFixed(1)}%
            </p>
        }
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
      // Color is now driven by data.color, so chartConfig color is less critical here
    },
  };

  const metricSelector = (
    <div className="flex items-center space-x-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedMetric} onValueChange={(value) => onMetricChange(value as RankingMetricKey)}>
            <SelectTrigger className="w-[200px] h-9 text-xs">
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
        <p className="text-muted-foreground h-[400px] flex items-center justify-center">选择指标以查看排名数据。</p>
      ): (
        <div className="h-[450px] w-full"> {/* Increased height */}
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={data} layout="vertical" margin={{ top: 5, right: 80, left: 30, bottom: 5 }} barCategoryGap="25%"> {/* Increased right margin, adjusted barCategoryGap */}
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis 
                    type="number" 
                    tickFormatter={(value) => xAxisTickFormatter(value, selectedMetricConfig)} 
                    axisLine={false} 
                    tickLine={false} 
                    domain={[0, 'dataMax + dataMax * 0.1']}
                    className="text-xs"
                />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" width={120} tick={{fontSize: 12}} interval={0}/>
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
                        className="fill-foreground text-xs font-medium" 
                        offset={5}
                        />
                    ))}
                    {data.map((entry, index) => (
                        // @ts-ignore This should correctly access the color from the entry
                        <Bar key={`cell-${index}`} fill={entry.color || 'hsl(var(--chart-1))'} />
                    ))}
                </Bar>
                </RechartsBarChart>
            </ResponsiveContainer>
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
