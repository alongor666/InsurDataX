
"use client";

import type { ParetoChartDataItem, ParetoChartMetricKey, AnalysisMode } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { ChartAiSummary } from '@/components/shared/chart-ai-summary';
import { AreaChart as AreaChartIcon, Palette } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'; 
import type { TooltipProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { formatDisplayValue } from '@/lib/data-utils';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ParetoChartSectionProps {
  data: ParetoChartDataItem[];
  availableMetrics: { value: ParetoChartMetricKey, label: string }[];
  selectedMetric: ParetoChartMetricKey;
  onMetricChange: (metric: ParetoChartMetricKey) => void;
  analysisMode: AnalysisMode;
  currentPeriodLabel: string;
  filters: any;
}

const METRIC_FORMAT_RULES_FOR_CHARTS: Record<string, { type: string, originalUnit?: string }> = {
  'premium_written': { type: 'integer_wanyuan', originalUnit: '万元' },
  'premium_earned': { type: 'integer_wanyuan', originalUnit: '万元' },
  'total_loss_amount': { type: 'integer_wanyuan', originalUnit: '万元' },
  'expense_amount': { type: 'integer_wanyuan', originalUnit: '万元' },
  'marginal_contribution_amount': { type: 'integer_wanyuan', originalUnit: '万元' },
  'policy_count': { type: 'integer_count', originalUnit: '件' },
  'claim_count': { type: 'integer_count', originalUnit: '件' },
  'policy_count_earned': { type: 'integer_count', originalUnit: '件' },
};

const CustomTooltipContent = ({ active, payload, label, selectedMetricKey, availableMetricsList }: TooltipProps<ValueType, NameType> & { selectedMetricKey?: ParetoChartMetricKey, availableMetricsList?: { value: ParetoChartMetricKey, label: string }[] }) => {
  if (active && payload && payload.length && selectedMetricKey && availableMetricsList) {
    const dataPoint = payload[0]?.payload as ParetoChartDataItem; 

    const metricConfig = availableMetricsList.find(m => m.value === selectedMetricKey);

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[220px]">
        <p className="text-sm font-medium text-foreground mb-1">{dataPoint.name}</p>
        {payload.map((pItem, index) => (
          <div key={index} className="text-xs text-muted-foreground">
            {pItem.dataKey === 'value' && metricConfig && (
              <span>{metricConfig.label}: {formatDisplayValue(pItem.value as number, selectedMetricKey)}</span>
            )}
            {pItem.dataKey === 'cumulativePercentage' && (
              <span>累计占比: {(pItem.value as number).toFixed(1)}%</span>
            )}
          </div>
        ))}
        {dataPoint.vcr !== undefined && 
          <p className="text-xs mt-1" style={{color: dataPoint.color}}>
              变动成本率: {formatDisplayValue(dataPoint.vcr, 'variable_cost_ratio')}
          </p>
        }
      </div>
    );
  }
  return null;
};

const yAxisValueTickFormatter = (value: number, metricKey: ParetoChartMetricKey): string => {
  const ruleType = METRIC_FORMAT_RULES_FOR_CHARTS[metricKey]?.type;
  if ((ruleType === 'integer_wanyuan' || ruleType === 'integer_yuan') && Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if ((ruleType === 'integer_wanyuan' || ruleType === 'integer_yuan') && Math.abs(value) >= 1000) return (value / 1000).toFixed(0) + 'K';
  return formatDisplayValue(value, metricKey);
};


export function ParetoChartSection({
  data,
  availableMetrics,
  selectedMetric,
  onMetricChange,
  analysisMode,
  currentPeriodLabel,
  filters,
}: ParetoChartSectionProps) {
  const { toast } = useToast();
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false);

  const hasData = data && data.length > 0;

  const handleGenerateAiSummary = async () => {
    if (!hasData) return;
    setIsAiSummaryLoading(true);
    setAiSummary(null);

    const analyzedMetricLabel = availableMetrics.find(m => m.value === selectedMetric)?.label || selectedMetric;

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowName: 'generateParetoAnalysis',
          inputData: {
            chartDataJson: JSON.stringify(data),
            analyzedMetric: analyzedMetricLabel,
            analysisMode,
            currentPeriodLabel,
            filtersJson: JSON.stringify(filters)
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI分析生成失败');
      }

      const result = await response.json();
      setAiSummary(result.summary);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        variant: "destructive",
        title: "AI 分析失败",
        description: errorMessage,
      });
      console.error("AI summary generation failed:", errorMessage);
    } finally {
      setIsAiSummaryLoading(false);
    }
  };

  const metricSelector = (
    <div className="flex items-center space-x-2">
      <Palette className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedMetric} onValueChange={(value) => onMetricChange(value as ParetoChartMetricKey)}>
        <SelectTrigger className="w-[200px] h-9 text-xs">
          <SelectValue placeholder="选择帕累托指标" />
        </SelectTrigger>
        <SelectContent>
          {availableMetrics.map(metric => (
            <SelectItem key={metric.value} value={metric.value} className="text-xs">{metric.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const selectedMetricConfig = availableMetrics.find(m => m.value === selectedMetric);
  const chartConfig = {
      value: { label: selectedMetricConfig?.label || selectedMetric, color: "hsl(var(--chart-1))" }, 
      cumulativePercentage: { label: "累计占比 (%)", color: "hsl(var(--chart-2))" }
  };
  
  let yAxisValueLabel = "";
  const selectedMetricOriginalUnit = METRIC_FORMAT_RULES_FOR_CHARTS[selectedMetric]?.originalUnit;
  if (selectedMetricOriginalUnit && selectedMetricOriginalUnit !== 'none') {
      yAxisValueLabel = `(${selectedMetricOriginalUnit})`;
  }


  return (
    <SectionWrapper title="帕累托图分析 (80/20法则)" icon={AreaChartIcon} actionButton={metricSelector}>
      {!hasData ? (
        <p className="text-muted-foreground h-[350px] flex items-center justify-center">
          选择指标以查看帕累托图数据，或当前条件下无数据。
        </p>
      ) : (
        <div className="h-[400px] w-full"> 
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}> 
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }} 
                    height={70} 
                    interval={0} 
                />
                <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    stroke="hsl(var(--chart-1))" 
                    tickFormatter={(val) => yAxisValueTickFormatter(val, selectedMetric)}
                    label={{ value: yAxisValueLabel, angle: -90, position: 'insideLeft', offset: -5, fontSize: 12 }}
                />
                <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke="hsl(var(--chart-2))" 
                    domain={[0, 100]} 
                    tickFormatter={(value) => `${value}%`} 
                    label={{ value: "累计占比 (%)", angle: 90, position: 'insideRight', offset: -5, fontSize: 12 }}
                />
                <ChartTooltip 
                    content={<CustomTooltipContent selectedMetricKey={selectedMetric} availableMetricsList={availableMetrics} />}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <ChartLegend content={<ChartLegendContent />} verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}} />
                <Bar dataKey="value" yAxisId="left" name={chartConfig.value?.label || selectedMetric} barSize={20}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || 'hsl(var(--chart-1))'} />
                  ))}
                   <LabelList 
                        dataKey="value" 
                        position="top" 
                        formatter={(val: number) => formatDisplayValue(val, selectedMetric)}
                        className="fill-foreground text-xs font-medium" 
                        offset={5}
                    />
                </Bar>
                <Line 
                    type="monotone" 
                    dataKey="cumulativePercentage" 
                    yAxisId="right" 
                    strokeWidth={2} 
                    stroke="hsl(var(--chart-2))" 
                    dot={{ r: 3, fill: 'hsl(var(--chart-2))', strokeWidth: 0 }}
                    name={chartConfig.cumulativePercentage.label}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      )}
       <ChartAiSummary
          summary={aiSummary}
          isLoading={isAiSummaryLoading}
          onGenerateSummary={handleGenerateAiSummary}
          hasData={hasData}
          chartTypeLabel="帕累托图"
        />
    </SectionWrapper>
  );
}
