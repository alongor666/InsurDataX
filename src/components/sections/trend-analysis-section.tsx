
"use client";

import type { ChartDataItem } from '@/data/types'; 
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { ChartAiSummary } from '@/components/shared/chart-ai-summary';
import { LineChart as LucideLineChart, Palette } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart as RechartsLineChart, XAxis, YAxis, TooltipProps } from "recharts";
import type {NameType, ValueType} from 'recharts/types/component/DefaultTooltipContent';
import { useMemo } from 'react'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TrendMetricKey } from '@/data/types'; 
import { formatDisplayValue } from '@/lib/data-utils'; // Import the new formatter

interface TrendAnalysisSectionProps {
  data: ChartDataItem[];
  availableMetrics: { value: TrendMetricKey, label: string }[]; 
  onMetricChange: (metric: TrendMetricKey) => void; 
  selectedMetric: TrendMetricKey; 
  aiSummary: string | null;
  isAiSummaryLoading: boolean;
  onGenerateAiSummary: () => Promise<void>;
}

const CustomTooltip = ({ active, payload, label, metricId }: TooltipProps<ValueType, NameType> & { metricId: TrendMetricKey }) => {
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
                {formatDisplayValue(entry.value as number | undefined, metricId)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};


export function TrendAnalysisSection({ 
  data, 
  availableMetrics, 
  onMetricChange, 
  selectedMetric,
  aiSummary,
  isAiSummaryLoading,
  onGenerateAiSummary 
}: TrendAnalysisSectionProps) {
  
  const businessLineNames = useMemo(() => {
    if (!data || data.length === 0) return [];
    const keys = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'name' && key !== 'date' && key !== 'color' && typeof item[key] === 'number') { 
          keys.add(key);
        }
      });
    });
    return Array.from(keys);
  }, [data]);
  
  const chartConfig = useMemo(() => {
    return businessLineNames.reduce((acc, name, index) => {
      const dataPointForLine = data.find(d => d[name] !== undefined);
      acc[name] = {
        label: name, 
        color: dataPointForLine?.color || `hsl(var(--chart-${(index % 5) + 1}))`,
      };
      return acc;
    }, {} as any);
  }, [businessLineNames, data]);

  const yAxisFormatter = (value: number) => {
    // Axis ticks should also use the global formatter, but might need abbreviation for large numbers.
    // formatDisplayValue handles the core decimal/percentage formatting.
    // The Y-axis label (passed to YAxis component) will give unit context.
    const ruleType = (METRIC_FORMAT_RULES_FOR_CHARTS as any)[selectedMetric]?.type;
    if(ruleType === 'percentage' && Math.abs(value) > 1000) return (value/1000).toFixed(0) + 'k%';
    if ((ruleType === 'integer_wanyuan' || ruleType === 'integer_yuan') && Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if ((ruleType === 'integer_wanyuan' || ruleType === 'integer_yuan') && Math.abs(value) >= 1000) return (value / 1000).toFixed(0) + 'K';
    return formatDisplayValue(value, selectedMetric);
  };
  
  // For YAxis label context
  const selectedMetricConfig = availableMetrics.find(m => m.value === selectedMetric);
  let yAxisLabel = "";
  if (selectedMetricConfig) {
      const match = selectedMetricConfig.label.match(/\(([^)]+)\)/);
      if (match && match[1]) {
          yAxisLabel = `(${match[1]})`;
      }
  }


  const metricSelector = (
    <div className="flex items-center space-x-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedMetric} onValueChange={(value) => onMetricChange(value as TrendMetricKey)}>
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

  const hasData = data && data.length > 0 && businessLineNames.length > 0;

  return (
    <SectionWrapper title="趋势分析" icon={LucideLineChart} actionButton={metricSelector}>
      {!hasData ? (
        <p className="text-muted-foreground h-[300px] flex items-center justify-center">选择指标以查看趋势数据，或当前条件下无趋势数据。</p>
      ) : (
        <div className="h-[350px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => typeof value === 'string' ? value.slice(-5) : value} />
              <YAxis 
                tickFormatter={yAxisFormatter} 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8} 
                label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }}
              />
              <ChartTooltip content={<CustomTooltip metricId={selectedMetric} />} />
              <ChartLegend content={<ChartLegendContent />} />
              {businessLineNames.map((lineName, index) => (
                <Line
                  key={lineName}
                  dataKey={lineName}
                  type="monotone"
                  stroke={data.find(d => d[lineName] !== undefined)?.color || chartConfig[lineName]?.color}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </RechartsLineChart>
          </ChartContainer>
        </div>
      )}
      <ChartAiSummary
        summary={aiSummary}
        isLoading={isAiSummaryLoading}
        onGenerateSummary={onGenerateAiSummary}
        hasData={hasData}
        chartTypeLabel="趋势图"
      />
    </SectionWrapper>
  );
}

// Re-define or import METRIC_FORMAT_RULES_FOR_CHARTS if it's specific to charts
// For simplicity, assume a similar structure is available or can be derived
const METRIC_FORMAT_RULES_FOR_CHARTS: Record<string, { type: string, originalUnit?: string }> = {
  'loss_ratio': { type: 'percentage' },
  'expense_ratio': { type: 'percentage' },
  'variable_cost_ratio': { type: 'percentage' },
  'premium_earned_ratio': { type: 'percentage' },
  'claim_frequency': { type: 'percentage' },
  'marginal_contribution_ratio': { type: 'percentage' },
  'avg_commercial_index': { type: 'decimal_3' },
  'avg_premium_per_policy': { type: 'integer_yuan', originalUnit: '元' },
  'avg_loss_per_case': { type: 'integer_yuan', originalUnit: '元' },
  'premium_written': { type: 'integer_wanyuan', originalUnit: '万元' },
  'premium_earned': { type: 'integer_wanyuan', originalUnit: '万元' },
  'total_loss_amount': { type: 'integer_wanyuan', originalUnit: '万元' },
  'expense_amount': { type: 'integer_wanyuan', originalUnit: '万元' },
  'marginal_contribution_amount': { type: 'integer_wanyuan', originalUnit: '万元' },
  'policy_count': { type: 'integer_count', originalUnit: '件' },
   'policy_count_earned': { type: 'integer_count', originalUnit: '件' },
   'claim_count': { type: 'integer_count', originalUnit: '件' },
};
