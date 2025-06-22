
"use client";

import type { ShareChartDataItem, ShareChartMetricKey, AnalysisMode } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { ChartAiSummary } from '@/components/shared/chart-ai-summary';
import { PieChart as PieChartIconLucide, Palette } from 'lucide-react'; 
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDisplayValue } from '@/lib/data-utils';
import type { TooltipProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ShareChartSectionProps {
  data: ShareChartDataItem[];
  availableMetrics: { value: ShareChartMetricKey, label: string }[];
  selectedMetric: ShareChartMetricKey;
  onMetricChange: (metric: ShareChartMetricKey) => void;
  analysisMode: AnalysisMode;
  currentPeriodLabel: string;
  filters: any;
}

const CustomTooltipContent = ({ active, payload, coordinate, selectedMetricKey, availableMetricsList }: TooltipProps<ValueType, NameType> & { selectedMetricKey?: ShareChartMetricKey, availableMetricsList?: { value: ShareChartMetricKey, label: string }[] }) => {
  if (active && payload && payload.length && selectedMetricKey && availableMetricsList) {
    const dataItem = payload[0].payload as ShareChartDataItem;
    const metricConfig = availableMetricsList.find(m => m.value === selectedMetricKey);
    
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[180px]">
        <p className="text-sm font-medium text-foreground mb-1">{dataItem.name}</p>
        <p className="text-xs text-muted-foreground">
          {metricConfig?.label || '数值'}: {formatDisplayValue(dataItem.value, selectedMetricKey)}
        </p>
        <p className="text-xs text-muted-foreground">
          占比: {dataItem.percentage !== undefined ? dataItem.percentage.toFixed(1) + '%' : '-'}
        </p>
        {dataItem.vcr !== undefined && 
          <p className="text-xs" style={{color: dataItem.color}}>
              变动成本率: {formatDisplayValue(dataItem.vcr, 'variable_cost_ratio')}
          </p>
        }
      </div>
    );
  }
  return null;
};

const CustomShareChartLegend = (props: any) => {
  const { payload } = props; 
  if (!payload || payload.length === 0) return null;

  const itemsPerColumn = 5;
  const numColumns = 3;
  const columns: Array<Array<any>> = Array.from({ length: numColumns }, () => []);

  payload.forEach((entry: any, index: number) => {
    const columnIndex = Math.floor(index / itemsPerColumn);
    if (columnIndex < numColumns && columns[columnIndex].length < itemsPerColumn) {
      columns[columnIndex].push(entry);
    }
  });

  return (
    <div className="grid grid-cols-3 gap-x-3 mt-3 text-xs text-muted-foreground">
      {columns.map((columnItems, colIdx) => (
        <div key={`legend-col-${colIdx}`} className="flex flex-col space-y-0.5">
          {columnItems.map((entry, entryIdx) => (
            <div key={`legend-item-${colIdx}-${entryIdx}`} className="flex items-center truncate py-0.5">
              <span
                className="mr-1.5 inline-block h-2 w-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span 
                className="truncate hover:overflow-visible hover:whitespace-normal" 
                title={`${entry.payload?.name || entry.value} (${(entry.payload?.percentage || 0).toFixed(1)}%)`}
              >
                {entry.payload?.name || entry.value} ({(entry.payload?.percentage || 0).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};


export function ShareChartSection({
  data,
  availableMetrics,
  selectedMetric,
  onMetricChange,
  analysisMode,
  currentPeriodLabel,
  filters,
}: ShareChartSectionProps) {
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
          flowName: 'generateShareChartAnalysis',
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
        const errorText = await response.text();
        let errorMessage = `AI 服务错误 (状态: ${response.status})`;
        try {
          // Attempt to parse the error text as JSON for a more specific message
          const jsonError = JSON.parse(errorText);
          errorMessage = jsonError.error || jsonError.details || errorMessage;
        } catch (e) {
          // If parsing fails, it's likely an HTML error page.
          console.error("AI API returned non-JSON error response for Share Chart:", errorText);
        }
        throw new Error(errorMessage);
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
      <Select value={selectedMetric} onValueChange={(value) => onMetricChange(value as ShareChartMetricKey)}>
        <SelectTrigger className="w-[200px] h-9 text-xs">
          <SelectValue placeholder="选择占比指标" />
        </SelectTrigger>
        <SelectContent>
          {availableMetrics.map(metric => (
            <SelectItem key={metric.value} value={metric.value} className="text-xs">{metric.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const chartConfig = {}; 

  const outerRadiusResponsive = hasData ? Math.min(150, (Math.min(typeof window !== 'undefined' ? window.innerWidth : 800, typeof window !== 'undefined' ? window.innerHeight : 600) * 0.25)) : 120;

  return (
    <SectionWrapper title="占比分析图" icon={PieChartIconLucide} actionButton={metricSelector}>
      {!hasData ? (
        <p className="text-muted-foreground h-[450px] flex items-center justify-center">
          选择指标以查看占比数据，或当前条件下无数据。
        </p>
      ) : (
        <div className="h-[450px] w-full"> 
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 10, right: 20, bottom: 5, left: 20 }}> 
                <RechartsTooltip 
                    content={<CustomTooltipContent selectedMetricKey={selectedMetric} availableMetricsList={availableMetrics} />} 
                    cursor={{ strokeDasharray: '3 3' }} 
                />
                <Pie
                  data={data}
                  cx="50%"
                  cy="45%" 
                  labelLine={false} 
                  label={false} 
                  outerRadius={outerRadiusResponsive} 
                  innerRadius={outerRadiusResponsive * 0.4}
                  fill="#8884d8"
                  dataKey="percentage" 
                  nameKey="name"      
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || `hsl(var(--chart-${(index % 5) + 1}))`} />
                  ))}
                </Pie>
                <RechartsLegend 
                    content={<CustomShareChartLegend />}
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{paddingTop: '10px', paddingBottom: '0px', lineHeight: '1.2'}} 
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      )}
      <ChartAiSummary
        summary={aiSummary}
        isLoading={isAiSummaryLoading}
        onGenerateSummary={handleGenerateAiSummary}
        hasData={hasData}
        chartTypeLabel="占比图"
      />
    </SectionWrapper>
  );
}
