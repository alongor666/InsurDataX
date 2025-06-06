
"use client";

import type { BubbleChartDataItem } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { ChartAiSummary } from '@/components/shared/chart-ai-summary';
import { ScatterChart as LucideScatterChart } from 'lucide-react'; 
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { CartesianGrid, Scatter, ScatterChart as RechartsScatterChart, XAxis, YAxis, ZAxis, TooltipProps, Legend } from "recharts";
import type {NameType, ValueType} from 'recharts/types/component/DefaultTooltipContent';
import { useMemo } from 'react';

interface BubbleChartSectionProps {
  data: BubbleChartDataItem[];
  aiSummary: string | null;
  isAiSummaryLoading: boolean;
  onGenerateAiSummary: () => Promise<void>;
}

const chartColorKeys = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];

const CustomTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[200px]">
        <p className="text-sm font-medium text-foreground mb-1">{data.name}</p>
        <p className="text-xs text-muted-foreground">保费 (X): {typeof data.x === 'number' ? data.x.toLocaleString(undefined, {maximumFractionDigits: 2}) : data.x} 万元</p>
        <p className="text-xs text-muted-foreground">赔付率 (Y): {typeof data.y === 'number' ? `${data.y.toFixed(1)}%` : data.y}</p>
        <p className="text-xs text-muted-foreground">保单数 (大小): {typeof data.z === 'number' ? data.z.toLocaleString() : data.z}</p>
      </div>
    );
  }
  return null;
};

export function BubbleChartSection({ data, aiSummary, isAiSummaryLoading, onGenerateAiSummary }: BubbleChartSectionProps) {
  
  const uniqueBusinessLines = useMemo(() => {
    if (!data || data.length === 0) return [];
    const lines = new Map<string, { id: string; name: string }>();
    data.forEach(item => {
      if (item && item.id && item.name && !lines.has(item.id)) { 
        lines.set(item.id, { id: item.id, name: item.name });
      }
    });
    return Array.from(lines.values());
  }, [data]);

  const chartConfig = useMemo(() => {
    if (!uniqueBusinessLines || uniqueBusinessLines.length === 0) return {};
    return uniqueBusinessLines.reduce((acc, line, index) => {
      acc[line.id] = { 
        label: line.name,
        color: `hsl(var(--${chartColorKeys[index % chartColorKeys.length]}))`,
      };
      return acc;
    }, {} as any);
  }, [uniqueBusinessLines]);

  const hasData = data && data.length > 0 && uniqueBusinessLines.length > 0;

  const xDomain = hasData ? [0, Math.max(...data.map(item => item.x)) * 1.1] : [0,1];
  const yDomain = hasData ? [0, Math.max(...data.map(item => item.y)) * 1.1] : [0,1];
  
  const xAxisFormatter = (value: number) => {
    if (value >= 10000) return `${(value / 10000).toFixed(1)}亿`; // If premium is in 万
    if (value >= 1000) return `${(value / 1000).toFixed(0)}千万`;
    return `${value.toFixed(0)}万`;
  };
  
  const yAxisFormatter = (value: number) => `${value.toFixed(0)}%`;


  return (
    <SectionWrapper title="对比气泡图" icon={LucideScatterChart}>
       <p className="text-xs text-muted-foreground mb-2">X轴: 跟单保费 (万元), Y轴: 满期赔付率 (%), 气泡大小: 保单数量</p>
      {!hasData ? (
         <p className="text-muted-foreground h-[300px] flex items-center justify-center">暂无数据生成气泡图。</p>
      ) : (
        <div className="h-[350px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
              <RechartsScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="跟单保费" unit="万元" domain={xDomain} tickFormatter={xAxisFormatter} label={{ value: "跟单保费 (万元)", position: 'insideBottomRight', offset: -15, fontSize: 12 }} />
                <YAxis type="number" dataKey="y" name="满期赔付率" unit="%" domain={yDomain} tickFormatter={yAxisFormatter} label={{ value: "满期赔付率 (%)", angle: -90, position: 'insideLeft', offset:0, fontSize: 12 }}/>
                <ZAxis type="number" dataKey="z" range={[100, 1000]} name="保单数" />
                <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                <Legend formatter={(value, entry) => {
                   const businessLine = uniqueBusinessLines.find(bl => bl.id === entry.payload?.id);
                   return businessLine ? businessLine.name : value;
                }}/>
                {uniqueBusinessLines.map((line, index) => (
                  <Scatter 
                    key={line.id} 
                    name={line.name} 
                    data={data.filter(d => d.id === line.id)} 
                    fill={`hsl(var(--${chartColorKeys[index % chartColorKeys.length]}))`} 
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
