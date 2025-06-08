
"use client";

import type { ParetoChartDataItem, ParetoChartMetricKey } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { ChartAiSummary } from '@/components/shared/chart-ai-summary';
import { AreaChart as AreaChartIcon, Palette } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Placeholder for Recharts components - will be added in next step
// import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer Cell } from 'recharts';


interface ParetoChartSectionProps {
  data: ParetoChartDataItem[];
  availableMetrics: { value: ParetoChartMetricKey, label: string }[];
  selectedMetric: ParetoChartMetricKey;
  onMetricChange: (metric: ParetoChartMetricKey) => void;
  aiSummary: string | null;
  isAiSummaryLoading: boolean;
  onGenerateAiSummary: () => Promise<void>;
}

export function ParetoChartSection({
  data,
  availableMetrics,
  selectedMetric,
  onMetricChange,
  aiSummary,
  isAiSummaryLoading,
  onGenerateAiSummary,
}: ParetoChartSectionProps) {

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

  const hasData = data && data.length > 0;

  return (
    <SectionWrapper title="帕累托图分析" icon={AreaChartIcon} actionButton={metricSelector}>
      {!hasData ? (
        <p className="text-muted-foreground h-[350px] flex items-center justify-center">
          选择指标以查看帕累托图数据，或当前条件下无数据。
        </p>
      ) : (
        <div className="h-[350px] w-full">
          {/* Placeholder for Recharts ComposedChart */}
          <div className="flex items-center justify-center h-full text-muted-foreground">
            帕累托图表将在此处渲染 (待实现 Recharts)。
          </div>
        </div>
      )}
      <ChartAiSummary
        summary={aiSummary}
        isLoading={isAiSummaryLoading}
        onGenerateSummary={onGenerateAiSummary}
        hasData={hasData}
        chartTypeLabel="帕累托图"
      />
    </SectionWrapper>
  );
}
