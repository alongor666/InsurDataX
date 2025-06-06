
"use client";

import type { ChartDataItem } from '@/data/types';
import type { RankingMetricKey } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { ChartAiSummary } from '@/components/shared/chart-ai-summary';
import { BarChartHorizontal, Palette } from 'lucide-react';
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, TooltipProps, ResponsiveContainer, LabelList, Cell } from "recharts"; // Added Cell
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

const valueFormatterForLabelList = (value: number, metricConfig?: { value: RankingMetricKey, label: string }): string => {
  if (value === undefined || value === null || isNaN(value)) return "N/A";
  if (!metricConfig?.label) return Math.round(value).toLocaleString();

  const label = metricConfig.label.toLowerCase();

  if (label.includes('(%)')) { // Percentage
    return `${value.toFixed(1)}%`;
  } else if (label.includes('单均保费') && label.includes('(元)')) { // 单均保费 (元)
    return `${Math.round(value)} 元`;
  } else if (label.includes('案均赔款') && label.includes('(元)')) { // 案均赔款 (元)
    return `${Math.round(value)} 元`;
  } else if (label.includes('(万元)')) { // Amount in 万元
    return `${Math.round(value)} 万`;
  } else if (label.includes('(件)')) { // Count
    return `${Math.round(value)} 件`;
  }
  return Math.round(value).toString();
};

const xAxisTickFormatter = (value: number, metricConfig?: { value: RankingMetricKey, label: string }): string => {
  if (value === undefined || value === null || isNaN(value)) return "0";
  if (!metricConfig?.label) return value.toLocaleString();
  
  const label = metricConfig.label.toLowerCase();

  if (label.includes('(%)')) {
    return `${value.toFixed(0)}%`;
  } else if ((label.includes('单均保费') || label.includes('案均赔款')) && label.includes('(元)')) { 
    if (value === 0) return "0";
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}百万`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}千`;
    return `${value.toFixed(0)}`; 
  } else if (label.includes('(万元)')) { 
    if (value === 0) return "0";
    if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(1)}亿`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}千万`;
    return `${value.toFixed(0)}`; 
  } else if (label.includes('(件)')) {
    return value.toLocaleString(undefined, {maximumFractionDigits: 0});
  }
  return value.toLocaleString(undefined, {maximumFractionDigits: 0}); 
};


const CustomTooltip = ({ active, payload, label, selectedMetricKey, availableMetricsList }: TooltipProps<ValueType, NameType> & { selectedMetricKey?: RankingMetricKey, availableMetricsList?: { value: RankingMetricKey, label: string }[] }) => {
  if (active && payload && payload.length && selectedMetricKey && availableMetricsList) {
    const metricConfig = availableMetricsList.find(m => m.value === selectedMetricKey);
    const value = payload[0].value as number;
    
    let formattedValue;
    const metricLabel = metricConfig?.label.toLowerCase() || "";

    if (metricLabel.includes('(%)')) { // Percentage
        formattedValue = `${value.toFixed(1)}%`;
    } else if (metricLabel.includes('单均保费') && metricLabel.includes('(元)')) { // 单均保费 (元)
        formattedValue = `${Math.round(value)} 元`;
    } else if (metricLabel.includes('案均赔款') && metricLabel.includes('(元)')) { // 案均赔款 (元)
        formattedValue = `${Math.round(value)} 元`;
    } else if (metricLabel.includes('(万元)')) { // Amount in 万元
        formattedValue = `${value.toFixed(2)} 万元`; // Tooltip can show more precision
    } else if (metricLabel.includes('(件)')) { // Count
        formattedValue = `${Math.round(value)} 件`;
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
  const yAxisWidth = hasData ? Math.max(...data.map(d => d.name.length * 8), 100) : 100; 


  return (
    <SectionWrapper title="水平条形图排名" icon={BarChartHorizontal} actionButton={metricSelector}>
      {!hasData ? (
        <p className="text-muted-foreground h-[450px] flex items-center justify-center">选择指标以查看排名数据。</p>
      ): (
        <div className="h-[450px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={data} layout="vertical" margin={{ top: 5, right: 80, left: 10, bottom: 20 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis 
                    type="number" 
                    tickFormatter={(value) => xAxisTickFormatter(value, selectedMetricConfig)} 
                    axisLine={false} 
                    tickLine={false} 
                    domain={[0, 'dataMax + dataMax * 0.05']}
                    className="text-xs"
                    label={{ value: selectedMetricConfig?.label.match(/\(([^)]+)\)/)?.[1] || "", position: 'insideBottomRight', offset: -15, dy: 10, fontSize:11 }}
                />
                <YAxis 
                    dataKey="name" 
                    type="category" 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="hsl(var(--foreground))" 
                    width={yAxisWidth} 
                    tick={{fontSize: 12, dy:2}} 
                    interval={0}
                />
                <ChartTooltip 
                    content={<CustomTooltip selectedMetricKey={selectedMetric} availableMetricsList={availableMetrics}/>} 
                    cursor={{fill: 'hsl(var(--muted))'}}
                />
                <Bar dataKey={selectedMetric} radius={[0, 4, 4, 0]}>
                    <LabelList 
                        dataKey={selectedMetric} 
                        position="right" 
                        formatter={(val: number) => valueFormatterForLabelList(val, selectedMetricConfig)}
                        className="fill-foreground text-xs font-medium" 
                        offset={5}
                    />
                    {data.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color || 'hsl(var(--chart-1))'} />
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

