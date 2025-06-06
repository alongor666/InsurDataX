
import type { ProcessedDataForPeriod, Kpi, ChartDataItem, BubbleChartDataItem, V4PeriodData, V4BusinessDataEntry, V4PeriodTotals } from '@/data/types';
import { DollarSign, FileText, Percent, Briefcase, Zap, Activity, TrendingUp, TrendingDown, Minus, ShieldCheck, Landmark, Users, Ratio, Search } from 'lucide-react';

export const formatCurrency = (value: number | undefined, unit: '万元' | '元' = '万元'): string => {
  if (value === undefined || isNaN(value)) return 'N/A';
  const num = unit === '元' ? value : value * 10000;
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num).replace('¥', '');
};

export const formatNumber = (value: number | undefined): string => {
  if (value === undefined || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('zh-CN').format(value);
};

export const formatPercentage = (value: number | undefined, decimals: number = 1): string => {
  if (value === undefined || isNaN(value)) return 'N/A';
  return `${value.toFixed(decimals)}%`;
};

// This function is a placeholder and will be replaced by V4 data processing logic
export const processDataForRange = (
  businessLinesInput: any[], // This will be V4PeriodData in the future
  analysisMode: any,
  currentFrom: any,
  currentTo: any
): ProcessedDataForPeriod[] => {
  // This function's old logic based on monthly mock data is no longer relevant
  // It needs to be entirely rewritten to process V4PeriodData, calculate "当周发生额",
  // and handle aggregation based on selected business types.
  // For now, returning an empty array or minimal structure to avoid breaking page.tsx too much.
  console.warn("processDataForRange in data-utils.ts is a placeholder and needs full V4 implementation.");
  return [];
};


const calculateChangeAndAbs = (current: number | undefined, previous: number | undefined): { change?: number, absolute?: number } => {
  if (current === undefined || previous === undefined || isNaN(current) || isNaN(previous)) {
    return {};
  }
  const absolute = current - previous;
  let change: number | undefined;
  if (previous !== 0) {
    change = (absolute / Math.abs(previous)) * 100;
  } else if (current !== 0) {
    change = 100; // Or Infinity, or handle as a special case string
  } else {
    change = 0;
  }
  return { change, absolute };
};


export const calculateKpis = (
  processedData: ProcessedDataForPeriod[],
  analysisMode: string, // Keep 'string' for now, will be AnalysisMode
  currentPeriodTotals?: V4PeriodTotals // For "保费占比"
): Kpi[] => {
  if (!processedData || processedData.length === 0) return [];

  // Aggregate values from processedData (which should already be aggregated or for a single line)
  // For KPIs, we usually display aggregated values unless a single business line is selected.
  // Assuming processedData contains a single entry which is the aggregated data for selected lines.
  // If processedData can contain multiple lines, this aggregation logic needs to be more robust here.
  // For now, let's assume processedData[0] is the "合计" or the single selected line.

  const aggData = processedData.reduce((acc, d) => {
    acc.premium_written += (d.premium_written || 0);
    acc.premium_earned += (d.premium_earned || 0);
    acc.total_loss_amount += (d.total_loss_amount || 0);
    acc.expense_amount_raw += (d.expense_amount_raw || 0);
    acc.policy_count += (d.policy_count || 0);
    acc.claim_count += (d.claim_count || 0);
    acc.policy_count_earned += (d.policy_count_earned || 0);

    // For changes, we need to correctly aggregate previous values too.
    // This simplified aggregation of changes might not be perfectly accurate for ratios.
    // For now, take the first item's change if available, assuming it's already aggregated.
    if (acc.premium_writtenChange === undefined) acc.premium_writtenChange = d.premium_writtenChange;
    if (acc.premium_earnedChange === undefined) acc.premium_earnedChange = d.premium_earnedChange;
    if (acc.total_loss_amountChange === undefined) acc.total_loss_amountChange = d.total_loss_amountChange;
    if (acc.expense_amount_rawChange === undefined) acc.expense_amount_rawChange = d.expense_amount_rawChange;
    if (acc.policy_countChange === undefined) acc.policy_countChange = d.policy_countChange;
    if (acc.claim_countChange === undefined) acc.claim_countChange = d.claim_countChange;
    if (acc.policy_count_earnedChange === undefined) acc.policy_count_earnedChange = d.policy_count_earnedChange;

    return acc;
  }, {
    premium_written: 0, premium_earned: 0, total_loss_amount: 0, expense_amount_raw: 0,
    policy_count: 0, claim_count: 0, policy_count_earned: 0,
    premium_writtenChange: undefined as number | undefined,
    premium_earnedChange: undefined as number | undefined,
    total_loss_amountChange: undefined as number | undefined,
    expense_amount_rawChange: undefined as number | undefined,
    policy_countChange: undefined as number | undefined,
    claim_countChange: undefined as number | undefined,
    policy_count_earnedChange: undefined as number | undefined,
  });

  const {
    premium_written, premium_earned, total_loss_amount, expense_amount_raw,
    policy_count, claim_count = 0, policy_count_earned = 0
  } = aggData;

  // --- Calculate aggregated metric values ---
  const loss_ratio = premium_earned !== 0 ? (total_loss_amount / premium_earned) * 100 : 0;
  const expense_ratio = premium_written !== 0 ? (expense_amount_raw / premium_written) * 100 : 0;
  const variable_cost_ratio = loss_ratio + expense_ratio;
  const expense_amount = premium_written * (expense_ratio / 100); // 费用额 (万元)
  
  const premium_earned_ratio = premium_written !== 0 ? (premium_earned / premium_written) * 100 : 0;
  const avg_premium_per_policy = policy_count !== 0 ? (premium_written * 10000 / policy_count) : 0; // 元
  const claim_frequency = policy_count_earned !== 0 ? (claim_count / policy_count_earned) * 100 : 0;
  const avg_loss_per_case = claim_count !== 0 ? (total_loss_amount * 10000 / claim_count) : 0; // 元

  const marginal_contribution_amount = premium_earned - total_loss_amount - expense_amount; // 边贡额 (万元)
  const marginal_contribution_ratio = premium_earned !== 0 ? (marginal_contribution_amount / premium_earned) * 100 : 0; // 边际贡献率 (%)

  const premium_share = (currentPeriodTotals?.total_premium_written_overall && currentPeriodTotals.total_premium_written_overall !== 0)
    ? (premium_written / currentPeriodTotals.total_premium_written_overall) * 100
    : 0;

  // --- Calculate PoP changes and absolute values ---
  // Helper to calculate previous value based on current and change percentage
  const getPreviousValue = (current: number, changePercent?: number) => {
    if (changePercent === undefined || isNaN(changePercent)) return undefined;
    if (1 + changePercent / 100 === 0) return current !== 0 ? Infinity : 0; // Avoid division by zero, if current is non-zero and change is -100%, prev was huge
    return current / (1 + changePercent / 100);
  };
  
  // --- Aggregate PoP changes. This part needs careful V4 implementation with previous period sums.
  // The following is a simplified placeholder for changes based on aggregated current values and first item's change percentages.
  // A more accurate method involves summing previous period's base values.
  // For now, we use the aggregated change percentages from aggData which is a simplification.
  
  const prev_premium_written = getPreviousValue(premium_written, aggData.premium_writtenChange);
  const prev_premium_earned = getPreviousValue(premium_earned, aggData.premium_earnedChange);
  const prev_total_loss_amount = getPreviousValue(total_loss_amount, aggData.total_loss_amountChange);
  const prev_expense_amount_raw = getPreviousValue(expense_amount_raw, aggData.expense_amount_rawChange);
  const prev_policy_count = getPreviousValue(policy_count, aggData.policy_countChange);
  const prev_claim_count = getPreviousValue(claim_count, aggData.claim_countChange);
  const prev_policy_count_earned = getPreviousValue(policy_count_earned, aggData.policy_count_earnedChange);

  const pw_chg = calculateChangeAndAbs(premium_written, prev_premium_written);
  const pe_chg = calculateChangeAndAbs(premium_earned, prev_premium_earned);
  const tla_chg = calculateChangeAndAbs(total_loss_amount, prev_total_loss_amount);
  const ear_chg = calculateChangeAndAbs(expense_amount_raw, prev_expense_amount_raw); // For expense_amount itself
  const pc_chg = calculateChangeAndAbs(policy_count, prev_policy_count);
  const cc_chg = calculateChangeAndAbs(claim_count, prev_claim_count);
  const pce_chg = calculateChangeAndAbs(policy_count_earned, prev_policy_count_earned);
  
  const prev_loss_ratio = prev_premium_earned !== undefined && prev_premium_earned !== 0 ? (prev_total_loss_amount! / prev_premium_earned) * 100 : 0;
  const lr_chg = calculateChangeAndAbs(loss_ratio, prev_loss_ratio);

  const prev_expense_ratio = prev_premium_written !== undefined && prev_premium_written !== 0 ? (prev_expense_amount_raw! / prev_premium_written) * 100 : 0;
  const er_chg = calculateChangeAndAbs(expense_ratio, prev_expense_ratio);
  
  const prev_variable_cost_ratio = prev_loss_ratio + prev_expense_ratio;
  const vcr_chg = calculateChangeAndAbs(variable_cost_ratio, prev_variable_cost_ratio);
  
  const prev_expense_amount = prev_premium_written !== undefined ? prev_premium_written * (prev_expense_ratio / 100) : undefined;
  const ea_chg = calculateChangeAndAbs(expense_amount, prev_expense_amount);

  const prev_premium_earned_ratio = prev_premium_written !== undefined && prev_premium_written !== 0 ? (prev_premium_earned! / prev_premium_written) * 100 : 0;
  const per_chg = calculateChangeAndAbs(premium_earned_ratio, prev_premium_earned_ratio);

  const prev_avg_premium_per_policy = prev_policy_count !== undefined && prev_policy_count !== 0 ? (prev_premium_written! * 10000 / prev_policy_count) : 0;
  const app_chg = calculateChangeAndAbs(avg_premium_per_policy, prev_avg_premium_per_policy);

  const prev_claim_frequency = prev_policy_count_earned !== undefined && prev_policy_count_earned !== 0 ? (prev_claim_count! / prev_policy_count_earned) * 100 : 0;
  const cf_chg = calculateChangeAndAbs(claim_frequency, prev_claim_frequency);

  const prev_avg_loss_per_case = prev_claim_count !== undefined && prev_claim_count !== 0 ? (prev_total_loss_amount! * 10000 / prev_claim_count) : 0;
  const alc_chg = calculateChangeAndAbs(avg_loss_per_case, prev_avg_loss_per_case);

  const prev_marginal_contribution_amount = (prev_premium_earned !== undefined && prev_total_loss_amount !== undefined && prev_expense_amount !== undefined) ? prev_premium_earned - prev_total_loss_amount - prev_expense_amount : undefined;
  const mca_chg = calculateChangeAndAbs(marginal_contribution_amount, prev_marginal_contribution_amount);

  const prev_marginal_contribution_ratio = (prev_premium_earned !== undefined && prev_premium_earned !== 0 && prev_marginal_contribution_amount !== undefined) ? (prev_marginal_contribution_amount / prev_premium_earned) * 100 : 0;
  const mcr_chg = calculateChangeAndAbs(marginal_contribution_ratio, prev_marginal_contribution_ratio);

  // Placeholder for YoY changes
  const placeholderYoyChange = "+0.0%"; 
  const placeholderYoyChangeAbs = "0";
  const placeholderYoyChangeType = 'neutral';
  
  const kpis: Kpi[] = [
    // Column 1
    {
      id: 'marginal_contribution_ratio', title: '边际贡献率', value: formatPercentage(marginal_contribution_ratio), rawValue: marginal_contribution_ratio,
      change: mcr_chg.change !== undefined ? formatPercentage(mcr_chg.change) : undefined,
      changeAbsolute: mcr_chg.absolute !== undefined ? formatPercentage(mcr_chg.absolute, 2) : undefined, // Rate change is in pp
      changeType: mcr_chg.change === undefined ? 'neutral' : mcr_chg.change > 0 ? 'positive' : 'negative',
      yoyChange: placeholderYoyChange, yoyChangeAbsolute: placeholderYoyChangeAbs, yoyChangeType: placeholderYoyChangeType,
      icon: Ratio,
    },
    {
      id: 'variable_cost_ratio', title: '变动成本率', value: formatPercentage(variable_cost_ratio), rawValue: variable_cost_ratio,
      change: vcr_chg.change !== undefined ? formatPercentage(vcr_chg.change) : undefined,
      changeAbsolute: vcr_chg.absolute !== undefined ? formatPercentage(vcr_chg.absolute, 2) : undefined,
      changeType: vcr_chg.change === undefined ? 'neutral' : vcr_chg.change > 0 ? 'negative' : 'positive',
      yoyChange: placeholderYoyChange, yoyChangeAbsolute: placeholderYoyChangeAbs, yoyChangeType: placeholderYoyChangeType,
      icon: Zap, isBorderRisk: variable_cost_ratio > 90,
    },
    {
      id: 'expense_ratio', title: '费用率', value: formatPercentage(expense_ratio), rawValue: expense_ratio,
      change: er_chg.change !== undefined ? formatPercentage(er_chg.change) : undefined,
      changeAbsolute: er_chg.absolute !== undefined ? formatPercentage(er_chg.absolute, 2) : undefined,
      changeType: er_chg.change === undefined ? 'neutral' : er_chg.change > 0 ? 'negative' : 'positive',
      yoyChange: placeholderYoyChange, yoyChangeAbsolute: placeholderYoyChangeAbs, yoyChangeType: placeholderYoyChangeType,
      icon: Briefcase, isOrangeRisk: expense_ratio > 14.5,
    },
    {
      id: 'loss_ratio', title: '满期赔付率', value: formatPercentage(loss_ratio), rawValue: loss_ratio,
      change: lr_chg.change !== undefined ? formatPercentage(lr_chg.change) : undefined,
      changeAbsolute: lr_chg.absolute !== undefined ? formatPercentage(lr_chg.absolute, 2) : undefined,
      changeType: lr_chg.change === undefined ? 'neutral' : lr_chg.change > 0 ? 'negative' : 'positive',
      yoyChange: placeholderYoyChange, yoyChangeAbsolute: placeholderYoyChangeAbs, yoyChangeType: placeholderYoyChangeType,
      icon: Percent, isRisk: loss_ratio > 70, description: "基于已报告赔款",
    },
    // Column 2
    {
      id: 'marginal_contribution_amount', title: '边贡额', value: formatCurrency(marginal_contribution_amount), rawValue: marginal_contribution_amount,
      change: mca_chg.change !== undefined ? formatPercentage(mca_chg.change) : undefined,
      changeAbsolute: mca_chg.absolute !== undefined ? formatCurrency(mca_chg.absolute) : undefined,
      changeType: mca_chg.change === undefined ? 'neutral' : mca_chg.change > 0 ? 'positive' : 'negative',
      yoyChange: placeholderYoyChange, yoyChangeAbsolute: placeholderYoyChangeAbs, yoyChangeType: placeholderYoyChangeType,
      icon: Landmark,
    },
    {
      id: 'premium_written', title: '保费', value: formatCurrency(premium_written), rawValue: premium_written,
      change: pw_chg.change !== undefined ? formatPercentage(pw_chg.change) : undefined,
      changeAbsolute: pw_chg.absolute !== undefined ? formatCurrency(pw_chg.absolute) : undefined,
      changeType: pw_chg.change === undefined ? 'neutral' : pw_chg.change > 0 ? 'positive' : 'negative',
      yoyChange: placeholderYoyChange, yoyChangeAbsolute: placeholderYoyChangeAbs, yoyChangeType: placeholderYoyChangeType,
      icon: DollarSign,
    },
    {
      id: 'expense_amount', title: '费用', value: formatCurrency(expense_amount), rawValue: expense_amount,
      change: ea_chg.change !== undefined ? formatPercentage(ea_chg.change) : undefined,
      changeAbsolute: ea_chg.absolute !== undefined ? formatCurrency(ea_chg.absolute) : undefined,
      changeType: ea_chg.change === undefined ? 'neutral' : ea_chg.change > 0 ? 'negative' : 'positive', // Higher expense is negative
      yoyChange: placeholderYoyChange, yoyChangeAbsolute: placeholderYoyChangeAbs, yoyChangeType: placeholderYoyChangeType,
      icon: Briefcase, // Using briefcase again, could find another
    },
    {
      id: 'total_loss_amount', title: '赔款', value: formatCurrency(total_loss_amount), rawValue: total_loss_amount,
      change: tla_chg.change !== undefined ? formatPercentage(tla_chg.change) : undefined,
      changeAbsolute: tla_chg.absolute !== undefined ? formatCurrency(tla_chg.absolute) : undefined,
      changeType: tla_chg.change === undefined ? 'neutral' : tla_chg.change > 0 ? 'negative' : 'positive', // Higher loss is negative
      yoyChange: placeholderYoyChange, yoyChangeAbsolute: placeholderYoyChangeAbs, yoyChangeType: placeholderYoyChangeType,
      icon: ShieldCheck, // Changed icon
    },
    // Column 3
    {
      id: 'premium_earned', title: '满期保费', value: formatCurrency(premium_earned), rawValue: premium_earned,
      change: pe_chg.change !== undefined ? formatPercentage(pe_chg.change) : undefined,
      changeAbsolute: pe_chg.absolute !== undefined ? formatCurrency(pe_chg.absolute) : undefined,
      changeType: pe_chg.change === undefined ? 'neutral' : pe_chg.change > 0 ? 'positive' : 'negative',
      yoyChange: placeholderYoyChange, yoyChangeAbsolute: placeholderYoyChangeAbs, yoyChangeType: placeholderYoyChangeType,
      icon: DollarSign,
    },
    {
      id: 'premium_earned_ratio', title: '保费满期率', value: formatPercentage(premium_earned_ratio), rawValue: premium_earned_ratio,
      change: per_chg.change !== undefined ? formatPercentage(per_chg.change) : undefined,
      changeAbsolute: per_chg.absolute !== undefined ? formatPercentage(per_chg.absolute, 2) : undefined,
      changeType: per_chg.change === undefined ? 'neutral' : per_chg.change > 0 ? 'positive' : 'negative',
      yoyChange: placeholderYoyChange, yoyChangeAbsolute: placeholderYoyChangeAbs, yoyChangeType: placeholderYoyChangeType,
      icon: Ratio,
    },
    {
      id: 'avg_premium_per_policy', title: '单均保费', value: formatCurrency(avg_premium_per_policy, '元'), rawValue: avg_premium_per_policy,
      change: app_chg.change !== undefined ? formatPercentage(app_chg.change) : undefined,
      changeAbsolute: app_chg.absolute !== undefined ? formatCurrency(app_chg.absolute, '元') : undefined,
      changeType: app_chg.change === undefined ? 'neutral' : app_chg.change > 0 ? 'positive' : 'negative', // Typically higher is better
      yoyChange: placeholderYoyChange, yoyChangeAbsolute: placeholderYoyChangeAbs, yoyChangeType: placeholderYoyChangeType,
      icon: FileText,
    },
    {
      id: 'policy_count', title: '保单件数', value: formatNumber(policy_count), rawValue: policy_count,
      change: pc_chg.change !== undefined ? formatPercentage(pc_chg.change) : undefined,
      changeAbsolute: pc_chg.absolute !== undefined ? formatNumber(pc_chg.absolute) : undefined,
      changeType: pc_chg.change === undefined ? 'neutral' : pc_chg.change > 0 ? 'positive' : 'negative',
      yoyChange: placeholderYoyChange, yoyChangeAbsolute: placeholderYoyChangeAbs, yoyChangeType: placeholderYoyChangeType,
      icon: FileText,
    },
    // Column 4
    {
      id: 'premium_share', title: '保费占比', value: formatPercentage(premium_share), rawValue: premium_share,
      // Change for share needs careful definition of previous share
      change: undefined, changeAbsolute: undefined, changeType: 'neutral',
      yoyChange: placeholderYoyChange, yoyChangeAbsolute: placeholderYoyChangeAbs, yoyChangeType: placeholderYoyChangeType,
      icon: Users,
    },
    {
      id: 'avg_commercial_index', title: '自主系数', value: "N/A", // Placeholder, needs logic for single vs aggregated
      rawValue: undefined, // Placeholder
      change: undefined, changeAbsolute: undefined, changeType: 'neutral',
      yoyChange: placeholderYoyChange, yoyChangeAbsolute: placeholderYoyChangeAbs, yoyChangeType: placeholderYoyChangeType,
      icon: Search,
    },
    {
      id: 'claim_frequency', title: '满期出险率', value: formatPercentage(claim_frequency), rawValue: claim_frequency,
      change: cf_chg.change !== undefined ? formatPercentage(cf_chg.change) : undefined,
      changeAbsolute: cf_chg.absolute !== undefined ? formatPercentage(cf_chg.absolute, 2) : undefined,
      changeType: cf_chg.change === undefined ? 'neutral' : cf_chg.change > 0 ? 'negative' : 'positive', // Higher is worse
      yoyChange: placeholderYoyChange, yoyChangeAbsolute: placeholderYoyChangeAbs, yoyChangeType: placeholderYoyChangeType,
      icon: Activity,
    },
    {
      id: 'avg_loss_per_case', title: '案均赔款', value: formatCurrency(avg_loss_per_case, '元'), rawValue: avg_loss_per_case,
      change: alc_chg.change !== undefined ? formatPercentage(alc_chg.change) : undefined,
      changeAbsolute: alc_chg.absolute !== undefined ? formatCurrency(alc_chg.absolute, '元') : undefined,
      changeType: alc_chg.change === undefined ? 'neutral' : alc_chg.change > 0 ? 'negative' : 'positive', // Higher is usually worse
      yoyChange: placeholderYoyChange, yoyChangeAbsolute: placeholderYoyChangeAbs, yoyChangeType: placeholderYoyChangeType,
      icon: ShieldCheck,
    },
  ];

  // Ensure correct risk flags are set
  kpis.forEach(kpi => {
    if (kpi.id === 'loss_ratio') kpi.isRisk = (kpi.rawValue ?? 0) > 70;
    if (kpi.id === 'expense_ratio') kpi.isOrangeRisk = (kpi.rawValue ?? 0) > 14.5;
    if (kpi.id === 'variable_cost_ratio') kpi.isBorderRisk = (kpi.rawValue ?? 0) > 90;
  });
  
  return kpis;
};


export const prepareTrendData = (
  businessLines: any[], // This will be V4PeriodData[]
  selectedMetricKey: any, // TrendMetricKey
  from: Date, // Not used with V4 period_id system
  to: Date // Not used with V4 period_id system
): ChartDataItem[] => {
  // This function needs to be rewritten for V4 data.
  // It should iterate through a series of V4PeriodData objects,
  // process them (for "当周发生额" if needed), and extract the selectedMetricKey
  // for each business line over the periods.
  console.warn("prepareTrendData in data-utils.ts is a placeholder and needs full V4 implementation.");
  return [];
};


export const prepareBubbleChartData = (processedData: ProcessedDataForPeriod[]): BubbleChartDataItem[] => {
   if (!processedData || processedData.length === 0) return [];
  return processedData.map(d => ({
    id: d.businessLineId,
    name: d.businessLineName,
    // Bubble chart expects x, y, z. We need to map specific fields from ProcessedDataForPeriod.
    // For example, x: premium_written, y: loss_ratio, z: policy_count
    // This mapping should ideally be configurable or based on user selection.
    // For now, using placeholders:
    x: d.premium_written || 0,
    y: d.loss_ratio || 0,
    z: d.policy_count || 0,
  }));
};

export const prepareBarRankData = (
  processedData: ProcessedDataForPeriod[],
  rankingMetric: keyof Pick<ProcessedDataForPeriod, 'premium_written' | 'total_loss_amount' | 'policy_count' | 'loss_ratio' | 'expense_ratio' | 'variable_cost_ratio'>
): ChartDataItem[] => {
  if (!processedData || processedData.length === 0) return [];
  return [...processedData]
    .sort((a, b) => (b[rankingMetric] as number || 0) - (a[rankingMetric] as number || 0))
    .map(d => ({
      name: d.businessLineName,
      [rankingMetric]: d[rankingMetric] as number || 0,
    }));
};

// This function is part of the old date-based system and will be replaced or removed.
export const getDateRangeByValue = (value: string): { from: Date, to: Date } => {
  console.warn("getDateRangeByValue is deprecated and part of old date-based system.");
  const to = new Date();
  let from = new Date();
  return { from, to };
};
