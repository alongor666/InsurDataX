
"use client";

import type { ChartDataItem } from '@/data/types'; 
import { SectionWrapper } from '@/components/shared/section-wrapper';
// ChartAiSummary removed
import { LineChart as LucideLineChart, Palette, BarChart2 } from 'lucide-react'; 
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { CartesianGrid, Line, Bar, LineChart as RechartsLineChart, BarChart as RechartsBarChart, XAxis, YAxis, TooltipProps, Cell, LabelList } from "recharts"; 
import type {NameType, ValueType} from 'recharts/types/component/DefaultTooltipContent';
import { useMemo } from 'react'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TrendMetricKey, AnalysisMode } from '@/data/types'; 
import { formatDisplayValue } from '@/lib/data-utils'; 
import { formatPeriodLabelForAxis, formatPeriodLabelForTooltip } from '@/lib/date-formatters';

interface TrendAnalysisSectionProps {
  data: ChartDataItem[];
  availableMetrics: { value: TrendMetricKey, label: string }[]; 
  onMetricChange: (metric: TrendMetricKey) => void; 
  selectedMetric: TrendMetricKey; 
  analysisMode: AnalysisMode; 
  // AI props removed
  // aiSummary: string | null;
  // isAiSummaryLoading: boolean;
  // onGenerateAiSummary: () => Promise<void>;
}

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


const getMetricChartType = (metricId: TrendMetricKey): 'line' | 'bar' => {
  const rule = METRIC_FORMAT_RULES_FOR_CHARTS[metricId as string];
  if (rule) {
    switch (rule.type) {
      case 'percentage':
      case 'decimal_3': 
        return 'line';
      case 'integer_yuan':
      case 'integer_wanyuan':
      case 'integer_count':
      case 'integer_generic': 
        return 'bar';
      default:
        return 'line'; 
    }
  }
  return 'line'; 
};

const RenderCustomizedDot = (props: any) => {
  const { cx, cy, payload } = props; 
  if (payload && typeof payload.vcr === 'number' && payload.color) {
    return <circle cx={cx} cy={cy} r={4} fill={payload.color} strokeWidth={1} stroke="hsl(var(--background))" />;
  }
  return <circle cx={cx} cy={cy} r={3} fill={props.stroke || 'hsl(var(--chart-1))'} strokeWidth={0} />;
};


const CustomTooltip = ({ active, payload, label, metricId, analysisModeForTooltip }: TooltipProps<ValueType, NameType> & { metricId: TrendMetricKey, analysisModeForTooltip: AnalysisMode }) => {
  if (active && payload && payload.length) {
    const ruleForSelectedMetric = METRIC_FORMAT_RULES_FOR_CHARTS[metricId];
    const formattedLabel = typeof label === 'string' ? formatPeriodLabelForTooltip(label) : label;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-1 gap-1.5">
          <p className="text-sm font-medium text-foreground">{formattedLabel}</p>
          {payload.map((entry, index) => {
            let displayValue = "";
            const value = entry.value as number | undefined;

            if (analysisModeForTooltip === 'periodOverPeriod' && ruleForSelectedMetric?.type === 'percentage' && typeof value === 'number') {
              displayValue = `${value.toFixed(1)} pp`;
            } else {
              displayValue = formatDisplayValue(value, metricId);
            }

            return (
              <div key={`item-${index}`} className="flex items-center gap-1.5">
                 <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: entry.payload?.color || entry.color }}/>
                <p className="text-xs text-muted-foreground">{entry.name}:</p>
                <p className="text-xs font-medium text-foreground">{displayValue}</p>
              </div>
            );
          })}
           {payload[0].payload.vcr !== undefined && 
            <p className="text-xs" style={{color: payload[0].payload.color}}>
                变动成本率 (YTD): {formatDisplayValue(payload[0].payload.vcr, 'variable_cost_ratio')}
            </p>
           }
        </div>
      </div>
    );
  }
  return null;
};

const valueFormatterForLabelList = (value: number, metricKey: TrendMetricKey): string => {
  return formatDisplayValue(value, metricKey);
};


export function TrendAnalysisSection({ 
  data, 
  availableMetrics, 
  onMetricChange, 
  selectedMetric,
  analysisMode,
  // aiSummary, // Removed
  // isAiSummaryLoading, // Removed
  // onGenerateAiSummary // Removed
}: TrendAnalysisSectionProps) {
  
  const businessLineNames = useMemo(() => {
    if (!data || data.length === 0) return [];
    const keys = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'name' && key !== 'date' && key !== 'color' && key !== 'vcr' && typeof item[key] === 'number') { 
          keys.add(key);
        }
      });
    });
    return Array.from(keys);
  }, [data]);
  
  const chartConfig = useMemo(() => {
    return businessLineNames.reduce((acc, name, index) => {
      const lastDataPointForLine = data.length > 0 ? data[data.length -1] : null;
      acc[name] = {
        label: name, 
        color: lastDataPointForLine?.color || `hsl(var(--chart-${(index % 5) + 1}))`,
      };
      return acc;
    }, {} as any);
  }, [businessLineNames, data]);

  const yAxisFormatter = (value: number) => {
    const ruleForSelectedMetric = METRIC_FORMAT_RULES_FOR_CHARTS[selectedMetric];
    if (analysisMode === 'periodOverPeriod' && ruleForSelectedMetric?.type === 'percentage') {
        return value.toFixed(1); 
    }
    
    if ((ruleForSelectedMetric?.type === 'integer_wanyuan' || ruleForSelectedMetric?.type === 'integer_yuan') && Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if ((ruleForSelectedMetric?.type === 'integer_wanyuan' || ruleForSelectedMetric?.type === 'integer_yuan') && Math.abs(value) >= 1000) return (value / 1000).toFixed(0) + 'K';
    
    return formatDisplayValue(value, selectedMetric);
  };
  
  const selectedMetricConfig = availableMetrics.find(m => m.value === selectedMetric);
  let yAxisLabel = "";
  if (selectedMetricConfig) {
      const ruleForSelectedMetricInCharts = METRIC_FORMAT_RULES_FOR_CHARTS[selectedMetric];
      if (analysisMode === 'periodOverPeriod' && ruleForSelectedMetricInCharts?.type === 'percentage') {
          yAxisLabel = "(pp)";
      } else {
          const match = selectedMetricConfig.label.match(/\(([^)]+)\)/);
          if (match && match[1]) {
              yAxisLabel = `(${match[1]})`;
          }
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

  const chartType = getMetricChartType(selectedMetric);
  const ChartIcon = chartType === 'line' ? LucideLineChart : BarChart2;
  const hasData = data && data.length > 0 && businessLineNames.length > 0;

  return (
    <SectionWrapper title="趋势分析" icon={ChartIcon} actionButton={metricSelector}>
      {!hasData ? (
        <p className="text-muted-foreground h-[300px] flex items-center justify-center">选择指标以查看趋势数据，或当前条件下无趋势数据。</p>
      ) : (
        <div className="h-[350px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            {chartType === 'line' ? (
              <RechartsLineChart data={data} margin={{ top: 5, right: 60, left: 5, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={10} 
                  tickFormatter={(value) => typeof value === 'string' ? formatPeriodLabelForAxis(value) : value} 
                  interval={data.length > 12 ? Math.floor(data.length / 10) : 0}
                  angle={analysisMode === 'cumulative' ? 0 : (data.length > 6 ? -30 : 0)}
                  dy={analysisMode === 'cumulative' ? 5 : (data.length > 6 ? 10 : 5)}
                  className="text-xs"
                />
                <YAxis 
                  tickFormatter={yAxisFormatter} 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8} 
                  label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }}
                  className="text-xs"
                />
                <ChartTooltip content={<CustomTooltip metricId={selectedMetric} analysisModeForTooltip={analysisMode} />} cursor={{stroke: 'hsl(var(--muted))'}}/>
                <ChartLegend content={<ChartLegendContent />} wrapperStyle={{paddingTop: '10px'}} />
                {businessLineNames.map((lineName) => (
                  <Line
                    key={lineName}
                    dataKey={lineName}
                    type="monotone"
                    stroke={chartConfig[lineName]?.color} 
                    strokeWidth={2.5}
                    dot={<RenderCustomizedDot />}
                    activeDot={{ r: 6, strokeWidth: 1, fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))' }}
                  />
                ))}
              </RechartsLineChart>
            ) : ( 
              <RechartsBarChart data={data} margin={{ top: 20, right: 60, left: 5, bottom: 40 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={10} 
                  tickFormatter={(value) => typeof value === 'string' ? formatPeriodLabelForAxis(value) : value} 
                  interval={data.length > 12 ? Math.floor(data.length / 10) : 0}
                  angle={analysisMode === 'cumulative' ? 0 : (data.length > 6 ? -30 : 0)}
                  dy={analysisMode === 'cumulative' ? 5 : (data.length > 6 ? 10 : 5)}
                  className="text-xs"
                />
                <YAxis 
                    tickFormatter={yAxisFormatter} 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }}
                    className="text-xs"
                />
                <ChartTooltip content={<CustomTooltip metricId={selectedMetric} analysisModeForTooltip={analysisMode} />} cursor={{fill: 'hsl(var(--muted))'}}/>
                <ChartLegend content={<ChartLegendContent />} wrapperStyle={{paddingTop: '10px'}}/>
                {businessLineNames.map((barName) => (
                  <Bar key={barName} dataKey={barName} radius={[4, 4, 0, 0]} >
                     {data.map((entry, index) => (
                        <Cell key={`cell-${index}-${entry.name}`} fill={entry.color || chartConfig[barName]?.color || 'hsl(var(--chart-1))'} />
                      ))}
                      <LabelList
                        dataKey={barName}
                        position="top"
                        formatter={(val: number) => valueFormatterForLabelList(val, selectedMetric)}
                        className="fill-foreground text-xs font-medium"
                        offset={5}
                      />
                  </Bar>
                ))}
              </RechartsBarChart>
            )}
          </ChartContainer>
        </div>
      )}
      {/* ChartAiSummary removed */}
    </SectionWrapper>
  );
}

    