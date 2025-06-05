import type { BusinessLine, MonthlyData, AnalysisMode, ProcessedDataForPeriod, Kpi, ChartDataItem, BubbleChartDataItem } from '@/data/types';
import { format, subMonths, startOfYear, endOfMonth, differenceInMonths, startOfMonth } from 'date-fns';
import { DollarSign, FileText, TrendingUp, TrendingDown, Percent, AlertTriangle, Activity, Users, BarChart, ShieldCheck, Briefcase, Zap } from 'lucide-react';

export const formatCurrency = (value: number | undefined): string => {
  if (value === undefined) return 'N/A';
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

export const formatNumber = (value: number | undefined): string => {
  if (value === undefined) return 'N/A';
  return new Intl.NumberFormat('zh-CN').format(value);
};

export const formatPercentage = (value: number | undefined, decimals: number = 1): string => {
  if (value === undefined) return 'N/A';
  return `${value.toFixed(decimals)}%`;
};

const getPeriodData = (monthlyData: MonthlyData[], from: Date, to: Date): MonthlyData[] => {
  const fromMonthStr = format(from, 'yyyy-MM');
  const toMonthStr = format(to, 'yyyy-MM');
  return monthlyData.filter(d => d.date >= fromMonthStr && d.date <= toMonthStr);
};

const sumMonthlyData = (data: MonthlyData[]): number => data.reduce((sum, item) => sum + item.value, 0);

const getLastMonthData = (monthlyData: MonthlyData[], to: Date): MonthlyData | undefined => {
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
    const currentPeriodPremiumData = getPeriodData(line.data.premium, currentFrom, currentTo);
    const currentPeriodClaimsData = getPeriodData(line.data.claims, currentFrom, currentTo);
    const currentPeriodPoliciesData = getPeriodData(line.data.policies, currentFrom, currentTo);

    let premium = 0;
    let claims = 0;
    let policies = 0;
    let premiumChange: number | undefined = undefined;
    let claimsChange: number | undefined = undefined;
    let policiesChange: number | undefined = undefined;
    let lossRatioChange: number | undefined = undefined;

    if (analysisMode === 'cumulative') {
      premium = sumMonthlyData(currentPeriodPremiumData);
      claims = sumMonthlyData(currentPeriodClaimsData);
      policies = sumMonthlyData(currentPeriodPoliciesData);
    } else { // periodOverPeriod (Month-over-Month logic)
      const currentMonthPremium = getLastMonthData(line.data.premium, currentTo)?.value ?? 0;
      const currentMonthClaims = getLastMonthData(line.data.claims, currentTo)?.value ?? 0;
      const currentMonthPolicies = getLastMonthData(line.data.policies, currentTo)?.value ?? 0;
      
      premium = currentMonthPremium;
      claims = currentMonthClaims;
      policies = currentMonthPolicies;

      const prevTo = subMonths(currentTo, 1);
      const prevMonthPremium = getLastMonthData(line.data.premium, prevTo)?.value ?? 0;
      const prevMonthClaims = getLastMonthData(line.data.claims, prevTo)?.value ?? 0;
      const prevMonthPolicies = getLastMonthData(line.data.policies, prevTo)?.value ?? 0;
      
      if (prevMonthPremium !== 0) premiumChange = ((currentMonthPremium - prevMonthPremium) / prevMonthPremium) * 100;
      if (prevMonthClaims !== 0) claimsChange = ((currentMonthClaims - prevMonthClaims) / prevMonthClaims) * 100;
      if (prevMonthPolicies !== 0) policiesChange = ((currentMonthPolicies - prevMonthPolicies) / prevMonthPolicies) * 100;

      const currentLossRatio = premium !== 0 ? (claims / premium) * 100 : 0;
      const prevLossRatio = prevMonthPremium !== 0 ? (prevMonthClaims / prevMonthPremium) * 100 : 0;
      if (prevLossRatio !== 0 && currentLossRatio !== 0) { // Ensure prevLossRatio is not zero before division
        lossRatioChange = ((currentLossRatio - prevLossRatio) / Math.abs(prevLossRatio)) * 100;
      } else if (currentLossRatio !==0 && prevLossRatio === 0) {
        lossRatioChange = 100; // Or some indicator of significant change from zero
      }

    }
    
    const lossRatio = premium !== 0 ? (claims / premium) * 100 : 0;

    return {
      businessLineId: line.id,
      businessLineName: line.name,
      icon: line.icon,
      premium,
      claims,
      policies,
      lossRatio,
      premiumChange,
      claimsChange,
      policiesChange,
      lossRatioChange,
    };
  });
};

export const calculateKpis = (processedData: ProcessedDataForPeriod[], analysisMode: AnalysisMode): Kpi[] => {
  const totalPremium = processedData.reduce((sum, d) => sum + d.premium, 0);
  const totalClaims = processedData.reduce((sum, d) => sum + d.claims, 0);
  const totalPolicies = processedData.reduce((sum, d) => sum + d.policies, 0);
  const overallLossRatio = totalPremium !== 0 ? (totalClaims / totalPremium) * 100 : 0;

  let totalPremiumChange: number | undefined = undefined;
  let overallLossRatioChange: number | undefined = undefined;

  if (analysisMode === 'periodOverPeriod' && processedData.length > 0 && totalPremium !== 0) {
    const prevTotalPremium = processedData.reduce((sum, d) => sum + (d.premium / (1 + (d.premiumChange ?? 0)/100)),0);
    if(prevTotalPremium !== 0) totalPremiumChange = ((totalPremium - prevTotalPremium) / prevTotalPremium) * 100;

    const prevTotalClaims = processedData.reduce((sum, d) => sum + (d.claims / (1 + (d.claimsChange ?? 0)/100)),0);
    const prevOverallLossRatio = prevTotalPremium !== 0 ? (prevTotalClaims / prevTotalPremium) * 100 : 0;

    if (prevOverallLossRatio !== 0 && overallLossRatio !== 0) {
       overallLossRatioChange = ((overallLossRatio - prevOverallLossRatio) / Math.abs(prevOverallLossRatio)) * 100;
    } else if (overallLossRatio !== 0 && prevOverallLossRatio === 0) {
       overallLossRatioChange = 100; // Or some large number to indicate change from zero
    }
  }
  
  // Placeholder YoY data - will be properly calculated with V4.0 data model
  const placeholderYoyChange = "+3.5%";
  const placeholderYoyChangeType = 'positive';
  const placeholderNegativeYoyChange = "-2.1%";
  const placeholderNegativeYoyChangeType = 'negative';


  return [
    {
      id: 'totalPremium',
      title: '总保费',
      value: formatCurrency(totalPremium),
      rawValue: totalPremium,
      change: totalPremiumChange !== undefined ? formatPercentage(totalPremiumChange) : undefined,
      changeType: totalPremiumChange === undefined ? 'neutral' : totalPremiumChange > 0 ? 'positive' : 'negative',
      yoyChange: placeholderYoyChange, 
      yoyChangeType: placeholderYoyChangeType,
      icon: DollarSign,
    },
    {
      id: 'totalClaims',
      title: '总赔付额',
      value: formatCurrency(totalClaims),
      rawValue: totalClaims,
      // Assuming claims change calculation would be similar to premium if needed
      yoyChange: placeholderNegativeYoyChange,
      yoyChangeType: placeholderNegativeYoyChangeType,
      icon: Activity,
    },
    {
      id: 'totalPolicies',
      title: '总保单数',
      value: formatNumber(totalPolicies),
      rawValue: totalPolicies,
      yoyChange: placeholderYoyChange,
      yoyChangeType: placeholderYoyChangeType,
      icon: FileText,
    },
    {
      id: 'overallLossRatio',
      title: '综合赔付率', // This will be treated as '满期赔付率' for highlighting
      value: formatPercentage(overallLossRatio),
      rawValue: overallLossRatio,
      change: overallLossRatioChange !== undefined ? formatPercentage(overallLossRatioChange) : undefined,
      changeType: overallLossRatioChange === undefined ? 'neutral' : overallLossRatioChange > 0 ? 'negative' : 'positive',
      yoyChange: placeholderNegativeYoyChange,
      yoyChangeType: 'negative', // Higher YoY loss ratio is negative
      icon: Percent,
      isRisk: overallLossRatio > 70,
    },
    // Placeholder KPIs for testing new highlighting rules
    {
      id: 'expenseRatio',
      title: '费用率',
      value: formatPercentage(15.0), // To trigger > 14.5%
      rawValue: 15.0,
      change: "+0.5%",
      changeType: 'negative', // Higher expense ratio is negative
      yoyChange: "+1.0%",
      yoyChangeType: 'negative',
      icon: Briefcase,
      isRisk: 15.0 > 14.5,
    },
    {
      id: 'variableCostRatio',
      title: '变动成本率',
      value: formatPercentage(92.0), // To trigger > 90%
      rawValue: 92.0,
      change: "-1.2%",
      changeType: 'positive', // Lower variable cost ratio is positive
      yoyChange: "+0.8%",
      yoyChangeType: 'negative',
      icon: Zap,
      isRisk: 92.0 > 90,
    },
  ];
};

export const prepareTrendData = (
  businessLines: BusinessLine[],
  selectedMetric: keyof BusinessLine['data'],
  from: Date,
  to: Date
): ChartDataItem[] => {
  const dataMap = new Map<string, { name: string, [key: string]: number | string }>();
  const monthDiff = differenceInMonths(endOfMonth(to), startOfMonth(from)) + 1;
  const labels: string[] = [];
  let currentDate = startOfMonth(from);
  for(let i = 0; i < monthDiff; i++) {
    labels.push(format(currentDate, 'yyyy-MM'));
    currentDate = subMonths(currentDate, -1); // Increment month
  }
  
  labels.forEach(dateStr => {
    dataMap.set(dateStr, { name: dateStr });
  });

  businessLines.forEach(line => {
    const metricSeries = line.data[selectedMetric];
    if (metricSeries) {
      const periodData = getPeriodData(metricSeries as MonthlyData[], from, to);
      periodData.forEach(monthData => {
        if (dataMap.has(monthData.date)) {
          const entry = dataMap.get(monthData.date)!;
          entry[line.name] = monthData.value;
        }
      });
    }
  });
  
  // Fill missing values with 0 or previous value for smoother chart - simple 0 fill for now
  labels.forEach(dateStr => {
    const entry = dataMap.get(dateStr)!;
    businessLines.forEach(line => {
      if(!entry[line.name]) {
        entry[line.name] = 0;
      }
    });
  });
  
  return Array.from(dataMap.values()).sort((a, b) => (a.name as string).localeCompare(b.name as string));
};


export const prepareBubbleChartData = (processedData: ProcessedDataForPeriod[]): BubbleChartDataItem[] => {
  return processedData.map(d => ({
    id: d.businessLineId,
    name: d.businessLineName,
    x: d.premium, // Example: Premium on X-axis
    y: d.lossRatio, // Example: Loss Ratio on Y-axis
    z: d.policies, // Example: Number of Policies as bubble size
  }));
};

export const prepareBarRankData = (
  processedData: ProcessedDataForPeriod[],
  rankingMetric: keyof Pick<ProcessedDataForPeriod, 'premium' | 'claims' | 'policies' | 'lossRatio'>
): ChartDataItem[] => {
  return [...processedData]
    .sort((a, b) => b[rankingMetric] - a[rankingMetric])
    .map(d => ({
      name: d.businessLineName,
      [rankingMetric]: d[rankingMetric],
    }));
};


export const getDateRangeByValue = (value: string): { from: Date, to: Date } => {
  const to = new Date();
  let from = new Date();

  switch (value) {
    case '3m':
      from.setMonth(to.getMonth() - 2);
      from.setDate(1);
      break;
    case '6m':
      from.setMonth(to.getMonth() - 5);
      from.setDate(1);
      break;
    case '12m':
      from.setMonth(to.getMonth() - 11);
      from.setDate(1);
      break;
    case 'ytd':
      from = startOfYear(to);
      break;
    default: // Default to 3m
      from.setMonth(to.getMonth() - 2);
      from.setDate(1);
  }
  return { from: startOfMonth(from), to: endOfMonth(to) };
};
