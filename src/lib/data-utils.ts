
import type { BusinessLine, MonthlyData, AnalysisMode, ProcessedDataForPeriod, Kpi, ChartDataItem, BubbleChartDataItem } from '@/data/types';
import { format, subMonths, startOfYear, endOfMonth, differenceInMonths, startOfMonth } from 'date-fns';
import { DollarSign, FileText, Percent, Briefcase, Zap, TrendingUp, TrendingDown, Activity } from 'lucide-react'; // Added Briefcase, Zap

export const formatCurrency = (value: number | undefined): string => {
  if (value === undefined) return 'N/A';
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

export const formatNumber = (value: number | undefined): string => {
  if (value === undefined) return 'N/A';
  return new Intl.NumberFormat('zh-CN').format(value);
};

export const formatPercentage = (value: number | undefined, decimals: number = 1): string => {
  if (value === undefined || isNaN(value)) return 'N/A';
  return `${value.toFixed(decimals)}%`;
};

const getPeriodData = (monthlyData: MonthlyData[] | undefined, from: Date, to: Date): MonthlyData[] => {
  if (!monthlyData) return [];
  const fromMonthStr = format(from, 'yyyy-MM');
  const toMonthStr = format(to, 'yyyy-MM');
  return monthlyData.filter(d => d.date >= fromMonthStr && d.date <= toMonthStr);
};

const sumMonthlyData = (data: MonthlyData[]): number => data.reduce((sum, item) => sum + item.value, 0);

const getLastMonthData = (monthlyData: MonthlyData[] | undefined, to: Date): MonthlyData | undefined => {
  if (!monthlyData) return undefined;
  const toMonthStr = format(to, 'yyyy-MM');
  return monthlyData.find(d => d.date === toMonthStr);
};

export const processDataForRange = (
  businessLines: BusinessLine[],
  analysisMode: AnalysisMode,
  currentFrom: Date,
  currentTo: Date
): ProcessedDataForPeriod[] => {
  return businessLines.map(line => {
    // Using original mock data field names here, then mapping/mocking to V4.0 ProcessedDataForPeriod fields
    const currentPeriodPremiumData = getPeriodData(line.data.premium, currentFrom, currentTo);
    const currentPeriodClaimsData = getPeriodData(line.data.claims, currentFrom, currentTo);
    const currentPeriodPoliciesData = getPeriodData(line.data.policies, currentFrom, currentTo);

    let premium_written_val = 0;
    let total_loss_amount_val = 0;
    let policy_count_val = 0;
    
    // Temporary derived/mocked values for new V4.0 fields
    let premium_earned_val = 0; 
    let expense_amount_raw_val = 0;

    let premium_writtenChange: number | undefined = undefined;
    let total_loss_amountChange: number | undefined = undefined;
    let policy_countChange: number | undefined = undefined;
    let premium_earnedChange: number | undefined = undefined;
    let expense_amount_rawChange: number | undefined = undefined;
    let loss_ratioChange: number | undefined = undefined;
    let expense_ratioChange: number | undefined = undefined;
    let variable_cost_ratioChange: number | undefined = undefined;


    if (analysisMode === 'cumulative') {
      premium_written_val = sumMonthlyData(currentPeriodPremiumData);
      total_loss_amount_val = sumMonthlyData(currentPeriodClaimsData);
      policy_count_val = sumMonthlyData(currentPeriodPoliciesData);
      
      // Mocking for cumulative
      premium_earned_val = premium_written_val * 0.95; // Assume 95% earned ratio for mock
      expense_amount_raw_val = premium_written_val * 0.15; // Assume 15% expense for mock

    } else { // periodOverPeriod (Month-over-Month logic for "当周表现")
      const currentMonthPremiumWritten = getLastMonthData(line.data.premium, currentTo)?.value ?? 0;
      const currentMonthTotalLossAmount = getLastMonthData(line.data.claims, currentTo)?.value ?? 0;
      const currentMonthPolicyCount = getLastMonthData(line.data.policies, currentTo)?.value ?? 0;
      
      premium_written_val = currentMonthPremiumWritten;
      total_loss_amount_val = currentMonthTotalLossAmount;
      policy_count_val = currentMonthPolicyCount;

      // Mocking for current month
      premium_earned_val = premium_written_val * 0.95; 
      expense_amount_raw_val = premium_written_val * 0.15;


      const prevTo = subMonths(currentTo, 1);
      const prevMonthPremiumWritten = getLastMonthData(line.data.premium, prevTo)?.value ?? 0;
      const prevMonthTotalLossAmount = getLastMonthData(line.data.claims, prevTo)?.value ?? 0;
      const prevMonthPolicyCount = getLastMonthData(line.data.policies, prevTo)?.value ?? 0;
      
      // Mocking for prev month for change calculation
      const prevMonthPremiumEarned = prevMonthPremiumWritten * 0.95;
      const prevMonthExpenseAmountRaw = prevMonthPremiumWritten * 0.15;
      
      if (prevMonthPremiumWritten !== 0) premium_writtenChange = ((currentMonthPremiumWritten - prevMonthPremiumWritten) / prevMonthPremiumWritten) * 100;
      if (prevMonthTotalLossAmount !== 0) total_loss_amountChange = ((currentMonthTotalLossAmount - prevMonthTotalLossAmount) / prevMonthTotalLossAmount) * 100;
      if (prevMonthPolicyCount !== 0) policy_countChange = ((currentMonthPolicyCount - prevMonthPolicyCount) / prevMonthPolicyCount) * 100;
      if (prevMonthPremiumEarned !== 0) premium_earnedChange = ((premium_earned_val - prevMonthPremiumEarned) / prevMonthPremiumEarned) * 100;
      if (prevMonthExpenseAmountRaw !== 0) expense_amount_rawChange = ((expense_amount_raw_val - prevMonthExpenseAmountRaw) / prevMonthExpenseAmountRaw) * 100;

      const currentLossRatioVal = premium_earned_val !== 0 ? (total_loss_amount_val / premium_earned_val) * 100 : 0;
      const prevLossRatioVal = prevMonthPremiumEarned !== 0 ? (prevMonthTotalLossAmount / prevMonthPremiumEarned) * 100 : 0;
      if (prevLossRatioVal !== 0 && currentLossRatioVal !== 0) {
        loss_ratioChange = ((currentLossRatioVal - prevLossRatioVal) / Math.abs(prevLossRatioVal)) * 100;
      } else if (currentLossRatioVal !==0 && prevLossRatioVal === 0) {
        loss_ratioChange = currentLossRatioVal === 0 ? 0 : 100;
      }

      const currentExpenseRatioVal = premium_written_val !== 0 ? (expense_amount_raw_val / premium_written_val) * 100 : 0;
      const prevExpenseRatioVal = prevMonthPremiumWritten !== 0 ? (prevMonthExpenseAmountRaw / prevMonthPremiumWritten) * 100 : 0;
      if (prevExpenseRatioVal !== 0 && currentExpenseRatioVal !== 0) {
        expense_ratioChange = ((currentExpenseRatioVal - prevExpenseRatioVal) / Math.abs(prevExpenseRatioVal)) * 100;
      } else if (currentExpenseRatioVal !==0 && prevExpenseRatioVal === 0) {
        expense_ratioChange = currentExpenseRatioVal === 0 ? 0 : 100;
      }
      
      const currentVariableCostRatioVal = currentLossRatioVal + currentExpenseRatioVal;
      const prevVariableCostRatioVal = prevLossRatioVal + prevExpenseRatioVal;
       if (prevVariableCostRatioVal !== 0 && currentVariableCostRatioVal !== 0) {
        variable_cost_ratioChange = ((currentVariableCostRatioVal - prevVariableCostRatioVal) / Math.abs(prevVariableCostRatioVal)) * 100;
      } else if (currentVariableCostRatioVal !==0 && prevVariableCostRatioVal === 0) {
        variable_cost_ratioChange = currentVariableCostRatioVal === 0 ? 0 : 100;
      }
    }
    
    const loss_ratio_val = premium_earned_val !== 0 ? (total_loss_amount_val / premium_earned_val) * 100 : 0;
    const expense_ratio_val = premium_written_val !== 0 ? (expense_amount_raw_val / premium_written_val) * 100 : 0;
    const variable_cost_ratio_val = loss_ratio_val + expense_ratio_val;

    return {
      businessLineId: line.id,
      businessLineName: line.name,
      icon: line.icon,
      premium_written: premium_written_val,
      premium_earned: premium_earned_val,
      total_loss_amount: total_loss_amount_val,
      expense_amount_raw: expense_amount_raw_val,
      policy_count: policy_count_val,
      loss_ratio: loss_ratio_val,
      expense_ratio: expense_ratio_val,
      variable_cost_ratio: variable_cost_ratio_val,
      premium_writtenChange,
      premium_earnedChange,
      total_loss_amountChange,
      expense_amount_rawChange,
      policy_countChange,
      loss_ratioChange,
      expense_ratioChange,
      variable_cost_ratioChange,
    };
  });
};

export const calculateKpis = (processedData: ProcessedDataForPeriod[], analysisMode: AnalysisMode): Kpi[] => {
  const sumField = (field: keyof ProcessedDataForPeriod) => processedData.reduce((sum, d) => sum + (d[field] as number || 0), 0);

  const totalPremiumWritten = sumField('premium_written');
  const totalPremiumEarned = sumField('premium_earned');
  const totalLossAmount = sumField('total_loss_amount');
  const totalExpenseAmountRaw = sumField('expense_amount_raw');
  const totalPolicyCount = sumField('policy_count');

  const aggregatedLossRatio = totalPremiumEarned !== 0 ? (totalLossAmount / totalPremiumEarned) * 100 : 0;
  const aggregatedExpenseRatio = totalPremiumWritten !== 0 ? (totalExpenseAmountRaw / totalPremiumWritten) * 100 : 0;
  const aggregatedVariableCostRatio = aggregatedLossRatio + aggregatedExpenseRatio;

  let totalPremiumWrittenChange: number | undefined = undefined;
  let aggregatedLossRatioChange: number | undefined = undefined;
  let aggregatedExpenseRatioChange: number | undefined = undefined;
  let aggregatedVariableCostRatioChange: number | undefined = undefined;
  let totalPolicyCountChange: number | undefined = undefined;

  if (analysisMode === 'periodOverPeriod' && processedData.length > 0) {
    const calculateAggregateChange = (currentAggValue: number, changeField: keyof ProcessedDataForPeriod, baseField: keyof ProcessedDataForPeriod) => {
      let prevAggValue = 0;
      for (const d of processedData) {
        const changePercent = d[changeField] as number ?? 0;
        const currentVal = d[baseField] as number || 0;
        if (1 + changePercent / 100 !== 0) {
           prevAggValue += currentVal / (1 + changePercent / 100);
        } else {
            prevAggValue += currentVal; // If change is -100%, effectively previous was 0 or current is 0
        }
      }
      if (prevAggValue !== 0 && currentAggValue !== 0) return ((currentAggValue - prevAggValue) / Math.abs(prevAggValue)) * 100;
      if (currentAggValue !== 0 && prevAggValue === 0) return 100; // Or some indicator
      return undefined;
    };
    
    totalPremiumWrittenChange = calculateAggregateChange(totalPremiumWritten, 'premium_writtenChange', 'premium_written');
    totalPolicyCountChange = calculateAggregateChange(totalPolicyCount, 'policy_countChange', 'policy_count');

    // For ratios, the change calculation based on individual line changes is more complex.
    // We'll use the pre-calculated individual line ratio changes to derive an approximate aggregate change.
    // This is an estimation. Accurate aggregate ratio change requires sum of prev numerators and denominators.
    // For simplicity now, we'll take an average or weighted average if possible, or use a placeholder for PoP change for ratios.

    // Calculate previous period aggregate values to correctly determine PoP change for ratios
    let prevTotalLossAmount = 0;
    let prevTotalPremiumEarned = 0;
    let prevTotalExpenseAmountRaw = 0;
    let prevTotalPremiumWritten = 0;

    for (const d of processedData) {
      const tlaChange = d.total_loss_amountChange ?? 0;
      const peChange = d.premium_earnedChange ?? 0;
      const earChange = d.expense_amount_rawChange ?? 0;
      const pwChange = d.premium_writtenChange ?? 0;

      if (1 + tlaChange/100 !== 0) prevTotalLossAmount += d.total_loss_amount / (1 + tlaChange/100); else prevTotalLossAmount += d.total_loss_amount;
      if (1 + peChange/100 !== 0) prevTotalPremiumEarned += d.premium_earned / (1 + peChange/100); else prevTotalPremiumEarned += d.premium_earned;
      if (1 + earChange/100 !== 0) prevTotalExpenseAmountRaw += d.expense_amount_raw / (1 + earChange/100); else prevTotalExpenseAmountRaw += d.expense_amount_raw;
      if (1 + pwChange/100 !== 0) prevTotalPremiumWritten += d.premium_written / (1 + pwChange/100); else prevTotalPremiumWritten += d.premium_written;
    }
    
    const prevAggLossRatio = prevTotalPremiumEarned !== 0 ? (prevTotalLossAmount / prevTotalPremiumEarned) * 100 : 0;
    if (prevAggLossRatio !== 0 && aggregatedLossRatio !==0) aggregatedLossRatioChange = ((aggregatedLossRatio - prevAggLossRatio) / Math.abs(prevAggLossRatio)) * 100;
    else if (aggregatedLossRatio !==0 && prevAggLossRatio === 0) aggregatedLossRatioChange = 100;
    
    const prevAggExpenseRatio = prevTotalPremiumWritten !== 0 ? (prevTotalExpenseAmountRaw / prevTotalPremiumWritten) * 100 : 0;
    if (prevAggExpenseRatio !== 0 && aggregatedExpenseRatio !== 0) aggregatedExpenseRatioChange = ((aggregatedExpenseRatio - prevAggExpenseRatio) / Math.abs(prevAggExpenseRatio)) * 100;
    else if (aggregatedExpenseRatio !== 0 && prevAggExpenseRatio === 0) aggregatedExpenseRatioChange = 100;

    const prevAggVariableCostRatio = prevAggLossRatio + prevAggExpenseRatio;
    if (prevAggVariableCostRatio !== 0 && aggregatedVariableCostRatio !== 0) aggregatedVariableCostRatioChange = ((aggregatedVariableCostRatio - prevAggVariableCostRatio) / Math.abs(prevAggVariableCostRatio)) * 100;
    else if (aggregatedVariableCostRatio !== 0 && prevAggVariableCostRatio === 0) aggregatedVariableCostRatioChange = 100;

  }
  
  const placeholderYoyChange = "+3.5%"; // YoY data not available in current mock structure
  const placeholderYoyChangeType = 'positive';
  const placeholderNegativeYoyChange = "-2.1%";

  return [
    {
      id: 'premium_written',
      title: '跟单保费',
      value: formatCurrency(totalPremiumWritten),
      rawValue: totalPremiumWritten,
      change: totalPremiumWrittenChange !== undefined ? formatPercentage(totalPremiumWrittenChange) : undefined,
      changeType: totalPremiumWrittenChange === undefined ? 'neutral' : totalPremiumWrittenChange > 0 ? 'positive' : 'negative',
      yoyChange: placeholderYoyChange, 
      yoyChangeType: placeholderYoyChangeType,
      icon: DollarSign,
    },
    {
      id: 'policy_count',
      title: '保单数量',
      value: formatNumber(totalPolicyCount),
      rawValue: totalPolicyCount,
      change: totalPolicyCountChange !== undefined ? formatPercentage(totalPolicyCountChange) : undefined,
      changeType: totalPolicyCountChange === undefined ? 'neutral' : totalPolicyCountChange > 0 ? 'positive' : 'negative',
      yoyChange: placeholderYoyChange,
      yoyChangeType: placeholderYoyChangeType,
      icon: FileText,
    },
    {
      id: 'loss_ratio',
      title: '满期赔付率',
      value: formatPercentage(aggregatedLossRatio),
      rawValue: aggregatedLossRatio,
      change: aggregatedLossRatioChange !== undefined ? formatPercentage(aggregatedLossRatioChange) : undefined,
      changeType: aggregatedLossRatioChange === undefined ? 'neutral' : aggregatedLossRatioChange > 0 ? 'negative' : 'positive', // Higher LR is negative
      yoyChange: placeholderNegativeYoyChange, // Assume YoY LR also negative if increased
      yoyChangeType: 'negative',
      icon: Percent,
      isRisk: aggregatedLossRatio > 70,
    },
    {
      id: 'expense_ratio',
      title: '费用率',
      value: formatPercentage(aggregatedExpenseRatio),
      rawValue: aggregatedExpenseRatio,
      change: aggregatedExpenseRatioChange !== undefined ? formatPercentage(aggregatedExpenseRatioChange) : undefined,
      changeType: aggregatedExpenseRatioChange === undefined ? 'neutral' : aggregatedExpenseRatioChange > 0 ? 'negative' : 'positive', // Higher ER is negative
      yoyChange: placeholderNegativeYoyChange, // Assume YoY ER also negative if increased
      yoyChangeType: 'negative',
      icon: Briefcase,
      isRisk: aggregatedExpenseRatio > 14.5,
    },
    {
      id: 'variable_cost_ratio',
      title: '变动成本率',
      value: formatPercentage(aggregatedVariableCostRatio),
      rawValue: aggregatedVariableCostRatio,
      change: aggregatedVariableCostRatioChange !== undefined ? formatPercentage(aggregatedVariableCostRatioChange) : undefined,
      changeType: aggregatedVariableCostRatioChange === undefined ? 'neutral' : aggregatedVariableCostRatioChange > 0 ? 'negative' : 'positive', // Higher VCR is negative
      yoyChange: placeholderNegativeYoyChange, // Assume YoY VCR also negative if increased
      yoyChangeType: 'negative',
      icon: Zap,
      isRisk: aggregatedVariableCostRatio > 90,
    },
  ];
};

export const prepareTrendData = (
  businessLines: BusinessLine[],
  selectedMetricKey: keyof MetricData | keyof ProcessedDataForPeriod, // Can be from raw data or processed data
  from: Date,
  to: Date
): ChartDataItem[] => {
  const dataMap = new Map<string, { name: string, [key: string]: number | string }>();
  const monthDiff = differenceInMonths(endOfMonth(to), startOfMonth(from)) + 1;
  const labels: string[] = [];
  let currentDateIter = startOfMonth(from);
  for(let i = 0; i < monthDiff; i++) {
    labels.push(format(currentDateIter, 'yyyy-MM'));
    currentDateIter = subMonths(currentDateIter, -1); // Increment month
  }
  
  labels.forEach(dateStr => {
    dataMap.set(dateStr, { name: dateStr });
  });

  businessLines.forEach(line => {
    // Determine if selectedMetricKey is from original BusinessLine.data or needs to be derived like in ProcessedDataForPeriod
    // For simplicity, assume selectedMetricKey directly maps to BusinessLine.data fields like 'premium', 'claims', 'policies' for now
    // or it's one of the calculated ratios on BusinessLine.data.lossRatio
    
    let metricSeries: MonthlyData[] | undefined;
    if (selectedMetricKey === 'premium_written') metricSeries = line.data.premium;
    else if (selectedMetricKey === 'total_loss_amount') metricSeries = line.data.claims;
    else if (selectedMetricKey === 'policy_count') metricSeries = line.data.policies;
    else if (selectedMetricKey === 'loss_ratio' && line.data.lossRatio) metricSeries = line.data.lossRatio;
    // Add more mappings if TrendAnalysis needs to show premium_earned, expense_amount_raw etc. directly from monthly data
    // This would require line.data to be richer or for prepareTrendData to do its own monthly processing.

    if (metricSeries) {
      const periodData = getPeriodData(metricSeries, from, to);
      periodData.forEach(monthData => {
        if (dataMap.has(monthData.date)) {
          const entry = dataMap.get(monthData.date)!;
          entry[line.name] = monthData.value;
        }
      });
    }
  });
  
  labels.forEach(dateStr => {
    const entry = dataMap.get(dateStr)!;
    businessLines.forEach(line => {
      if(!entry[line.name]) {
        entry[line.name] = 0; // Fill missing values with 0
      }
    });
  });
  
  return Array.from(dataMap.values()).sort((a, b) => (a.name as string).localeCompare(b.name as string));
};


export const prepareBubbleChartData = (processedData: ProcessedDataForPeriod[]): BubbleChartDataItem[] => {
  return processedData.map(d => ({
    id: d.businessLineId,
    name: d.businessLineName,
    x: d.premium_written, 
    y: d.loss_ratio, 
    z: d.policy_count, 
  }));
};

export const prepareBarRankData = (
  processedData: ProcessedDataForPeriod[],
  rankingMetric: keyof Pick<ProcessedDataForPeriod, 'premium_written' | 'total_loss_amount' | 'policy_count' | 'loss_ratio'>
): ChartDataItem[] => {
  return [...processedData]
    .sort((a, b) => (b[rankingMetric] as number) - (a[rankingMetric] as number))
    .map(d => ({
      name: d.businessLineName,
      [rankingMetric]: d[rankingMetric] as number, // Ensure value is number
    }));
};


export const getDateRangeByValue = (value: string): { from: Date, to: Date } => {
  const to = new Date(); // Represents the end of the most recent period
  let from = new Date();

  switch (value) {
    case '3m': // Last 3 full months. If today is Jun 15, it means Mar, Apr, May.
      from = startOfMonth(subMonths(to, 2));
      break;
    case '6m': // Last 6 full months
      from = startOfMonth(subMonths(to, 5));
      break;
    case '12m': // Last 12 full months
      from = startOfMonth(subMonths(to, 11));
      break;
    case 'ytd': // From start of current year to end of most recent full month (or current month if preferred)
      from = startOfYear(to);
      break;
    default: // Default to 3m
      from = startOfMonth(subMonths(to, 2));
  }
  // Ensure 'to' is end of month for consistency, or current date if more "up-to-date" is needed.
  // For monthly data, endOfMonth(to) makes sense.
  return { from: startOfMonth(from), to: endOfMonth(to) };
};

