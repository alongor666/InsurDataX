
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
              变动成本率: {formatDisplayValue(dataItem.vcr, 'variable_cost_ratio')}
          </p>
        }
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value, percentage }: any) => {
  if (percentage < 3) return null; // Only show label if percentage is >= 3%

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  // Increase label radius to position labels further outside the pie, adjust multiplier as needed
  const labelRadius = outerRadius * 1.15; 
  const x = cx + labelRadius * Math.cos(-midAngle * RADIAN);
  const y = cy + labelRadius * Math.sin(-midAngle * RADIAN);
  const percentageDisplay = (percent * 100).toFixed(1);

  return (
    <text
      x={x}
      y={y}
      fill="hsl(var(--foreground))"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs"
    >
      {`${name} (${percentageDisplay}%)`}
    </text>
  );
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
  const chartConfig = {}; 

  const outerRadius = hasData ? Math.min(150, (Math.min(window.innerWidth, window.innerHeight) * 0.3)) : 120;


  return (
    <SectionWrapper title="占比分析图" icon={PieChartIconLucide} actionButton={metricSelector}>
      {!hasData ? (
        <p className="text-muted-foreground h-[350px] flex items-center justify-center">
          选择指标以查看占比数据，或当前条件下无数据。
        </p>
      ) : (
        <div className="h-[400px] w-full"> {/* Increased height for labels */}
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 30, right: 50, bottom: 30, left: 50 }}> {/* Added more margin for labels */}
                <RechartsTooltip 
                    content={<CustomTooltipContent selectedMetricKey={selectedMetric} availableMetricsList={availableMetrics} />} 
                    cursor={{ strokeDasharray: '3 3' }} 
                />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={true} // Show label lines for outside labels
                  label={renderCustomizedLabel}
                  outerRadius={outerRadius * 0.7} // Make pie smaller to leave room for labels
                  fill="#8884d8"
                  dataKey="percentage" 
                  nameKey="name"      
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || `hsl(var(--chart-${(index % 5) + 1}))`} />
                  ))}
                </Pie>
                <RechartsLegend 
                    wrapperStyle={{fontSize: '12px', paddingTop: '10px', paddingBottom: '10px'}} 
                    iconSize={10}
                    align="center"
                    verticalAlign="bottom"
                    formatter={(value, entry) => {
                        const { color } = entry;
                        const dataEntry = data.find(d => d.name === value);
                        const percentage = dataEntry ? dataEntry.percentage.toFixed(1) : '0.0';
                        return <span style={{ color: color || 'hsl(var(--foreground))' }} className="truncate max-w-[150px] inline-block">{value} ({percentage}%)</span>;
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

