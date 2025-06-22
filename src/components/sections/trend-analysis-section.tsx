
"use client";

import type { ChartDataItem } from '@/data/types'; 
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { ChartAiSummary } from '@/components/shared/chart-ai-summary';
import { LineChart as LucideLineChart, Palette, BarChart2 } from 'lucide-react'; 
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { CartesianGrid, Line, Bar, LineChart as RechartsLineChart, BarChart as RechartsBarChart, XAxis, YAxis, TooltipProps, Cell, LabelList, ResponsiveContainer } from "recharts"; 
import type {NameType, ValueType} from 'recharts/types/component/DefaultTooltipContent';
import { useMemo, useState } from 'react'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TrendMetricKey, AnalysisMode } from '@/data/types'; 
import { formatDisplayValue } from '@/lib/data-utils'; 
import { parsePeriodLabelToYearWeek, getWeekDateObjects, formatPeriodLabelForTooltip } from '@/lib/date-formatters';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface TrendAnalysisSectionProps {
  data: ChartDataItem[];
  availableMetrics: { value: TrendMetricKey, label: string }[]; 
  onMetricChange: (metric: TrendMetricKey) => void; 
  selectedMetric: TrendMetricKey; 
  analysisMode: AnalysisMode; 
  currentPeriodLabel: string;
  filters: any;
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

const CustomXAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const periodLabel = payload.value;
  
  const parsed = parsePeriodLabelToYearWeek(periodLabel);
  if (parsed) {
    const dates = getWeekDateObjects(parsed.year, parsed.week);
    if (dates) {
      const weekLabel = `W${parsed.week}`;
      const dateRangeLabel = `${format(dates.start, 'MMdd')}-${format(dates.end, 'MMdd')}`;
      return (
        <g transform={`translate(${x},${y})`}>
          <text x={0} y={0} dy={16} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11px">
            <tspan x="0" dy="0em" className="font-medium">{weekLabel}</tspan>
            <tspan x="0" dy="1.4em">{dateRangeLabel}</tspan>
          </text>
        </g>
      );
    }
  }

  // Fallback for any label that can't be parsed
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11px">
        {periodLabel}
      </text>
    </g>
  );
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

const valueFormatterForLabelList = (value: number | undefined | null, metricKey: TrendMetricKey): string => {
  return formatDisplayValue(value, metricKey);
};

const CustomBarLabel = (props: any) => {
  const { x, y, width, height, value, metricKey } = props;
  
  if (value === null || value === undefined) {
    return null;
  }

  const formattedValue = valueFormatterForLabelList(value, metricKey);
  const isNegative = value < 0;
  
  const yPosition = isNegative ? y + height + 12 : y - 5;

  return (
    <text x={x + width / 2} y={yPosition} fill="hsl(var(--foreground))" className="text-xs font-medium" textAnchor="middle">
      {formattedValue}
    </text>
  );
};


export function TrendAnalysisSection({ 
  data, 
  availableMetrics, 
  onMetricChange, 
  selectedMetric,
  analysisMode,
  currentPeriodLabel,
  filters
}: TrendAnalysisSectionProps) {
  const { toast } = useToast();
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false);
  
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

  const hasData = data && data.length > 0 && businessLineNames.length > 0;

  const handleGenerateAiSummary = async () => {
    if (!hasData) return;
    setIsAiSummaryLoading(true);
    setAiSummary(null);

    const selectedMetricLabel = availableMetrics.find(m => m.value === selectedMetric)?.label || selectedMetric;

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowName: 'generateTrendAnalysis',
          inputData: {
            chartDataJson: JSON.stringify(data),
            selectedMetric: selectedMetricLabel,
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
          console.error("AI API returned non-JSON error response for Trend Chart:", errorText);
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
  
  const interval = (analysisMode === 'periodOverPeriod' && data.length > 7) || (analysisMode === 'cumulative' && data.length > 15) ? Math.floor(data.length / 7) : 0;

  return (
    <SectionWrapper title="趋势分析" icon={ChartIcon} actionButton={metricSelector}>
      {!hasData ? (
        <p className="text-muted-foreground h-[300px] flex items-center justify-center">选择指标以查看趋势数据，或当前条件下无趋势数据。</p>
      ) : (
        <div className="h-[350px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            {chartType === 'line' ? (
              <ResponsiveContainer>
                <RechartsLineChart data={data} margin={{ top: 5, right: 40, left: 10, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={<CustomXAxisTick />}
                    height={80}
                    axisLine={false}
                    tickLine={false}
                    interval={interval}
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
              </ResponsiveContainer>
            ) : ( 
              <ResponsiveContainer>
                <RechartsBarChart data={data} margin={{ top: 20, right: 40, left: 10, bottom: 80 }} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                  <XAxis 
                    dataKey="name" 
                    tick={<CustomXAxisTick />}
                    height={80}
                    axisLine={false}
                    tickLine={false}
                    interval={interval}
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
                            content={<CustomBarLabel metricKey={selectedMetric} />}
                        />
                    </Bar>
                  ))}
                </RechartsBarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
        </div>
      )}
      <ChartAiSummary
        summary={aiSummary}
        isLoading={isAiSummaryLoading}
        onGenerateSummary={handleGenerateAiSummary}
        hasData={hasData}
        chartTypeLabel="趋势图"
      />
    </SectionWrapper>
  );
}
