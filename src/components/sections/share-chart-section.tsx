
"use client";

import type { ShareChartDataItem, ShareChartMetricKey } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { ChartAiSummary } from '@/components/shared/chart-ai-summary';
import { PieChart as PieChartIconLucide, Palette } from 'lucide-react'; // Renamed to avoid conflict with Recharts component
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDisplayValue } from '@/lib/data-utils';
import type { TooltipProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface ShareChartSectionProps {
  data: ShareChartDataItem[];
  availableMetrics: { value: ShareChartMetricKey, label: string }[];
  selectedMetric: ShareChartMetricKey;
  onMetricChange: (metric: ShareChartMetricKey) => void;
  aiSummary: string | null;
  isAiSummaryLoading: boolean;
  onGenerateAiSummary: () => Promise<void>;
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
              VCR: {formatDisplayValue(dataItem.vcr, 'variable_cost_ratio')}
          </p>
        }
      </div>
    );
  }
  return null;
};


export function ShareChartSection({
  data,
  availableMetrics,
  selectedMetric,
  onMetricChange,
  aiSummary,
  isAiSummaryLoading,
  onGenerateAiSummary,
}: ShareChartSectionProps) {

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

  const hasData = data && data.length > 0;
  const chartConfig = {}; // PieChart doesn't use chartConfig in the same way line/bar does for lines/bars

  // Outer radius for the pie chart
  const outerRadius = 120;


  return (
    <SectionWrapper title="占比分析图" icon={PieChartIconLucide} actionButton={metricSelector}>
      {!hasData ? (
        <p className="text-muted-foreground h-[350px] flex items-center justify-center">
          选择指标以查看占比数据，或当前条件下无数据。
        </p>
      ) : (
        <div className="h-[350px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <RechartsTooltip 
                    content={<CustomTooltipContent selectedMetricKey={selectedMetric} availableMetricsList={availableMetrics} />} 
                    cursor={{ strokeDasharray: '3 3' }} 
                />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={outerRadius}
                  fill="#8884d8"
                  dataKey="percentage" // Value for pie slice size
                  nameKey="name"      // Value for legend and tooltip name
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5 + 25; // Position label outside
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    const percentageDisplay = (percent * 100).toFixed(1);
                    // Only display label if percentage is significant enough
                    if (parseFloat(percentageDisplay) < 3) return null; 

                    return (
                      <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">
                        {`${name} (${percentageDisplay}%)`}
                      </text>
                    );
                  }}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || `hsl(var(--chart-${(index % 5) + 1}))`} />
                  ))}
                </Pie>
                <RechartsLegend 
                    wrapperStyle={{fontSize: '12px', paddingTop: '20px'}} 
                    iconSize={10}
                    formatter={(value, entry) => {
                        const { color } = entry;
                        const dataEntry = data.find(d => d.name === value);
                        const percentage = dataEntry ? dataEntry.percentage.toFixed(1) : '0.0';
                        return <span style={{ color }}>{value} ({percentage}%)</span>;
                    }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      )}
      <ChartAiSummary
        summary={aiSummary}
        isLoading={isAiSummaryLoading}
        onGenerateSummary={onGenerateAiSummary}
        hasData={hasData}
        chartTypeLabel="占比图"
      />
    </SectionWrapper>
  );
}
