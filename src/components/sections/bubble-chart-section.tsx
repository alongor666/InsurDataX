
"use client";

import type { BubbleChartDataItem, BubbleMetricKey } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { ChartAiSummary } from '@/components/shared/chart-ai-summary';
import { ScatterChart as LucideScatterChart, Palette } from 'lucide-react'; 
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { CartesianGrid, Scatter, ScatterChart as RechartsScatterChart, XAxis, YAxis, ZAxis, TooltipProps } from "recharts";
import type {NameType, ValueType} from 'recharts/types/component/DefaultTooltipContent';
import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDisplayValue } from '@/lib/data-utils'; 

interface BubbleChartSectionProps {
  data: BubbleChartDataItem[];
  availableMetrics: { value: BubbleMetricKey, label: string }[];
  selectedXAxisMetric: BubbleMetricKey;
  onXAxisMetricChange: (metric: BubbleMetricKey) => void;
  selectedYAxisMetric: BubbleMetricKey;
  onYAxisMetricChange: (metric: BubbleMetricKey) => void;
  selectedSizeMetric: BubbleMetricKey;
  onSizeMetricChange: (metric: BubbleMetricKey) => void;
  aiSummary: string | null;
  isAiSummaryLoading: boolean;
  onGenerateAiSummary: () => Promise<void>;
}

const CustomTooltip = ({ active, payload, xAxisMetric, yAxisMetric, sizeMetric, availableMetricsList }: TooltipProps<ValueType, NameType> & { xAxisMetric: BubbleMetricKey, yAxisMetric: BubbleMetricKey, sizeMetric: BubbleMetricKey, availableMetricsList: { value: BubbleMetricKey, label: string }[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as BubbleChartDataItem;
    const xAxisConfig = availableMetricsList.find(m => m.value === xAxisMetric);
    const yAxisConfig = availableMetricsList.find(m => m.value === yAxisMetric);
    const sizeConfig = availableMetricsList.find(m => m.value === sizeMetric);

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[200px]">
        <p className="text-sm font-medium text-foreground mb-1">{data.name}</p>
        <p className="text-xs text-muted-foreground">{xAxisConfig?.label || 'X'}: {formatDisplayValue(data.x, xAxisMetric)}</p>
        <p className="text-xs text-muted-foreground">{yAxisConfig?.label || 'Y'}: {formatDisplayValue(data.y, yAxisMetric)}</p>
        <p className="text-xs text-muted-foreground">{sizeConfig?.label || 'Size'}: {formatDisplayValue(data.z, sizeMetric)}</p>
        {data.vcr !== undefined && <p className="text-xs" style={{color: data.color}}>VCR: {formatDisplayValue(data.vcr, 'variable_cost_ratio')}</p>}
      </div>
    );
  }
  return null;
};

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


export function BubbleChartSection({ 
  data, 
  availableMetrics,
  selectedXAxisMetric, onXAxisMetricChange,
  selectedYAxisMetric, onYAxisMetricChange,
  selectedSizeMetric, onSizeMetricChange,
  aiSummary,
  isAiSummaryLoading,
  onGenerateAiSummary
}: BubbleChartSectionProps) {
  
  const uniqueBusinessLines = useMemo(() => {
    if (!data || data.length === 0) return [];
    const lines = new Map<string, { id: string; name: string; color?: string }>();
    data.forEach(item => {
      if (item && item.id && item.name && !lines.has(item.id)) { 
        lines.set(item.id, { id: item.id, name: item.name, color: item.color });
      }
    });
    return Array.from(lines.values());
  }, [data]);

  const chartConfig = useMemo(() => {
    if (!uniqueBusinessLines || uniqueBusinessLines.length === 0) return {};
    return uniqueBusinessLines.reduce((acc, line) => {
      acc[line.id] = { 
        label: line.name,
        color: line.color || `hsl(var(--muted))`, 
      };
      return acc;
    }, {} as any);
  }, [uniqueBusinessLines]);

  const hasData = data && data.length > 0 && uniqueBusinessLines.length > 0;

  const getMetricLabelAndUnit = (metricKey: BubbleMetricKey): { label: string, unit: string } => {
    const config = availableMetrics.find(m => m.value === metricKey);
    const label = config?.label || metricKey;
    const unitMatch = label.match(/\(([^)]+)\)/);
    const unit = unitMatch && unitMatch[1] ? `(${unitMatch[1]})` : "";
    return { label, unit };
  };
  
  const xAxisInfo = getMetricLabelAndUnit(selectedXAxisMetric);
  const yAxisInfo = getMetricLabelAndUnit(selectedYAxisMetric);
  const sizeMetricLabel = getMetricLabelAndUnit(selectedSizeMetric).label;


  const formatAxisTick = (value: number, metricKey: BubbleMetricKey) => {
    const ruleType = (METRIC_FORMAT_RULES_FOR_CHARTS as any)[metricKey]?.type;
    if(ruleType === 'percentage' && Math.abs(value) > 1000) return (value/1000).toFixed(0) + 'k%';
    if ((ruleType === 'integer_wanyuan' || ruleType === 'integer_yuan') && Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if ((ruleType === 'integer_wanyuan' || ruleType === 'integer_yuan') && Math.abs(value) >= 1000) return (value / 1000).toFixed(0) + 'K';
    return formatDisplayValue(value, metricKey);
  };
  
  const xDomain = hasData ? [0, Math.max(...data.map(item => item.x), 0) * 1.1] : [0,1];
  const yDomain = hasData ? [0, Math.max(...data.map(item => item.y), 0) * 1.1] : [0,1];

  const metricSelectors = (
    <div className="flex flex-wrap items-center gap-2 md:gap-4">
      <div className="flex items-center space-x-1">
        <Palette className="h-3 w-3 text-muted-foreground" />
        <label htmlFor="x-axis-metric" className="text-xs text-muted-foreground">X轴:</label>
        <Select value={selectedXAxisMetric} onValueChange={onXAxisMetricChange}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{availableMetrics.map(m => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-1">
        <Palette className="h-3 w-3 text-muted-foreground" />
        <label htmlFor="y-axis-metric" className="text-xs text-muted-foreground">Y轴:</label>
        <Select value={selectedYAxisMetric} onValueChange={onYAxisMetricChange}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{availableMetrics.map(m => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-1">
        <Palette className="h-3 w-3 text-muted-foreground" />
        <label htmlFor="size-metric" className="text-xs text-muted-foreground">大小:</label>
        <Select value={selectedSizeMetric} onValueChange={onSizeMetricChange}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{availableMetrics.map(m => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <SectionWrapper title="对比气泡图" icon={LucideScatterChart} actionButton={metricSelectors}>
      {!hasData ? (
         <p className="text-muted-foreground h-[300px] flex items-center justify-center">暂无数据生成气泡图，或请选择指标。</p>
      ) : (
        <div className="h-[350px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
              <RechartsScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name={xAxisInfo.label} 
                  domain={xDomain} 
                  tickFormatter={(val) => formatAxisTick(val, selectedXAxisMetric)} 
                  label={{ value: xAxisInfo.unit, position: 'insideBottom', offset: -15, fontSize: 12 }} 
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name={yAxisInfo.label} 
                  domain={yDomain} 
                  tickFormatter={(val) => formatAxisTick(val, selectedYAxisMetric)}
                  label={{ value: yAxisInfo.unit, angle: -90, position: 'insideLeft', offset: 0, fontSize: 12 }}
                />
                <ZAxis type="number" dataKey="z" range={[100, 1000]} name={sizeMetricLabel} />
                <ChartTooltip 
                    cursor={{ strokeDasharray: '3 3' }} 
                    content={<CustomTooltip xAxisMetric={selectedXAxisMetric} yAxisMetric={selectedYAxisMetric} sizeMetric={selectedSizeMetric} availableMetricsList={availableMetrics} />} 
                />
                {uniqueBusinessLines.map((line) => (
                  <Scatter 
                    key={line.id} 
                    name={line.name} 
                    data={data.filter(d => d.id === line.id)} 
                    fill={line.color || chartConfig[line.id]?.color}
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

