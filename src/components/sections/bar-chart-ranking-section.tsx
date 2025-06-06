
"use client";

import type { ChartDataItem } from '@/data/types';
import type { ProcessedDataForPeriod, RankingMetricKey } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { ChartAiSummary } from '@/components/shared/chart-ai-summary';
import { BarChartHorizontal, Palette } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent } from "@/components/ui/chart"; // ChartLegend & Content not used for Bar
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

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const metricConfig = availableMetricsForTooltip.find(m => m.value === payload[0].dataKey);
    const unit = metricConfig?.value.includes('ratio') ? '%' : (metricConfig?.value === 'policy_count' ? '件' : '万元');
    const value = typeof payload[0].value === 'number' 
        ? (unit === '%' ? payload[0].value.toFixed(1) : payload[0].value.toLocaleString(undefined, {maximumFractionDigits: unit === '万元' ? 2:0})) 
        : payload[0].value;

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        <p className="text-xs text-muted-foreground">
          {payload[0].name}: {value}{unit}
        </p>
      </div>
    );
  }
  return null;
};

// Temporary store for available metrics for tooltip, should ideally come from props or context
const availableMetricsForTooltip: { value: RankingMetricKey, label: string }[] = [
  { value: 'premium_written', label: '跟单保费' },
  { value: 'total_loss_amount', label: '总赔款' },
  { value: 'policy_count', label: '保单数量' },
  { value: 'loss_ratio', label: '满期赔付率' },
  { value: 'expense_ratio', label: '费用率' },
  { value: 'variable_cost_ratio', label: '变动成本率'}
];


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
      color: "hsl(var(--chart-1))",
    },
  };

  const valueFormatter = (value: number) => {
    if (!selectedMetricConfig) return value.toString();
    if (selectedMetricConfig.value.includes('ratio')) return `${value.toFixed(1)}%`;
    if (selectedMetricConfig.value === 'policy_count') return value.toLocaleString();
    // Default to 万元 for other monetary values
    if (value >= 10000) return `${(value / 10000).toFixed(1)}亿`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}千万`;
    return value.toFixed(2); // For 万元
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
              <XAxis type="number" tickFormatter={valueFormatter} axisLine={false} tickLine={false} domain={[0, 'dataMax + 10']}/>
              <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" width={110} tick={{fontSize: 12}}/>
              <ChartTooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--muted))'}}/>
              <Bar dataKey={selectedMetric} fill="var(--color-selectedMetric)" radius={[0, 4, 4, 0]}>
                   <LabelList dataKey={selectedMetric} position="right" formatter={valueFormatter} className="fill-foreground text-xs" />
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
