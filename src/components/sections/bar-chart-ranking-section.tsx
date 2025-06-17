
"use client";

import type { ChartDataItem } from '@/data/types';
import type { RankingMetricKey } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { ChartAiSummary } from '@/components/shared/chart-ai-summary';
import { BarChartHorizontal, Palette } from 'lucide-react';
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, TooltipProps, ResponsiveContainer, LabelList, Cell } from "recharts";
import type {NameType, ValueType} from 'recharts/types/component/DefaultTooltipContent';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDisplayValue } from '@/lib/data-utils'; 

interface BarChartRankingSectionProps {
  data: ChartDataItem[];
  availableMetrics: { value: RankingMetricKey, label: string }[];
  onMetricChange: (metric: RankingMetricKey) => void;
  selectedMetric: RankingMetricKey;
  aiSummary: string | null;
  isAiSummaryLoading: boolean;
  onGenerateAiSummary: () => Promise<void>;
}

const valueFormatterForLabelList = (value: number, metricKey: RankingMetricKey): string => {
  return formatDisplayValue(value, metricKey);
};

const xAxisTickFormatter = (value: number, metricKey: RankingMetricKey): string => {
  const ruleType = (METRIC_FORMAT_RULES_FOR_CHARTS as any)[metricKey]?.type;
  if(ruleType === 'percentage' && Math.abs(value) > 1000) return (value/1000).toFixed(0) + 'k%'; 
  if ((ruleType === 'integer_wanyuan' || ruleType === 'integer_yuan') && Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if ((ruleType === 'integer_wanyuan' || ruleType === 'integer_yuan') && Math.abs(value) >= 1000) return (value / 1000).toFixed(0) + 'K';
  
  return formatDisplayValue(value, metricKey);
};

const METRIC_FORMAT_RULES_FOR_CHARTS: Record<string, { type: string, originalUnit?: string }> = {
  'loss_ratio': { type: 'percentage' },
  'expense_ratio': { type: 'percentage' },
  'variable_cost_ratio': { type: 'percentage' },
  'premium_earned_ratio': { type: 'percentage' },
  'claim_frequency': { type: 'percentage' },
  'marginal_contribution_ratio': { type: 'percentage' },
  'premium_share': { type: 'percentage' },
  'avg_commercial_index': { type: 'decimal_3' },
  'avg_premium_per_policy': { type: 'integer_yuan', originalUnit: '元' },
  'avg_loss_per_case': { type: 'integer_yuan', originalUnit: '元' },
  'premium_written': { type: 'integer_wanyuan', originalUnit: '万元' },
  'premium_earned': { type: 'integer_wanyuan', originalUnit: '万元' },
  'total_loss_amount': { type: 'integer_wanyuan', originalUnit: '万元' },
  'expense_amount': { type: 'integer_wanyuan', originalUnit: '万元' },
  'marginal_contribution_amount': { type: 'integer_wanyuan', originalUnit: '万元' },
  'policy_count': { type: 'integer_count', originalUnit: '件' },
  'claim_count': { type: 'integer_count', originalUnit: '件' },
  'policy_count_earned': { type: 'integer_count', originalUnit: '件' },
};


const CustomTooltip = ({ active, payload, label, selectedMetricKey, availableMetricsList }: TooltipProps<ValueType, NameType> & { selectedMetricKey?: RankingMetricKey, availableMetricsList?: { value: RankingMetricKey, label: string }[] }) => {
  if (active && payload && payload.length && selectedMetricKey && availableMetricsList) {
    const metricConfig = availableMetricsList.find(m => m.value === selectedMetricKey);
    const value = payload[0].value as number;
    
    const formattedValue = formatDisplayValue(value, selectedMetricKey);
    
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[150px]">
        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        <p className="text-xs text-muted-foreground">
          {metricConfig?.label || payload[0].name}: {formattedValue}
        </p>
        {(payload[0].payload as ChartDataItem).vcr !== undefined && 
            <p className="text-xs" style={{color: (payload[0].payload as ChartDataItem).color}}>
                变动成本率 (YTD): {formatDisplayValue(((payload[0].payload as ChartDataItem).vcr as number), 'variable_cost_ratio')}
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
  const chartConfig = { [selectedMetric]: { label: selectedMetricConfig?.label || selectedMetric } };

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
  const yAxisWidth = hasData ? Math.max(...data.map(d => d.name.length * 8), 100, 120) : 120; 

  let xAxisLabelContent = "";
  const selectedMetricOriginalUnit = METRIC_FORMAT_RULES_FOR_CHARTS[selectedMetric]?.originalUnit;
  if (selectedMetricOriginalUnit && selectedMetricOriginalUnit !== 'none') {
      xAxisLabelContent = `(${selectedMetricOriginalUnit})`;
  }


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
                    tickFormatter={(value) => xAxisTickFormatter(value, selectedMetric)} 
                    axisLine={false} 
                    tickLine={false} 
                    domain={[0, 'dataMax + dataMax * 0.05']}
                    className="text-xs"
                    label={{ value: xAxisLabelContent, position: 'insideBottomRight', offset: -15, dy: 10, fontSize:11 }}
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
                        formatter={(val: number) => valueFormatterForLabelList(val, selectedMetric)}
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

