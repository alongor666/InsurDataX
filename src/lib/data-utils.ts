
import type { ProcessedDataForPeriod, Kpi, V4PeriodData, V4BusinessDataEntry, V4PeriodTotals, AggregatedBusinessMetrics, AnalysisMode } from '@/data/types';
import { DollarSign, FileText, Percent, Briefcase, Zap, Activity, ShieldCheck, Landmark, Users, Ratio, Search } from 'lucide-react';
import { businessLineIcons } from '@/data/mock-data'; // Assuming this is still needed for icons

export const formatCurrency = (value: number | undefined | null, displayUnit: '万元' | '元' = '万元'): string => {
  if (value === undefined || isNaN(value) || value === null) return 'N/A';
  if (displayUnit === '万元') {
    return `${value.toFixed(2)} 万元`;
  } else { // displayUnit === '元'
    return `${new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)} 元`;
  }
};

export const formatNumber = (value: number | undefined | null): string => {
  if (value === undefined || isNaN(value) || value === null) return 'N/A';
  return new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

export const formatPercentage = (value: number | undefined | null, decimals: number = 2): string => {
  if (value === undefined || isNaN(value) || value === null) return 'N/A';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Calculates derived metrics for a single business entry based on its YTD values.
 * This forms the basis for aggregation or period-over-period calculation.
 */
const calculateBaseMetricsForSingleEntry = (entry: V4BusinessDataEntry): AggregatedBusinessMetrics => {
  const premium_written = entry.premium_written || 0;
  const premium_earned = entry.premium_earned || 0;
  const total_loss_amount = entry.total_loss_amount || 0;
  const expense_amount_raw = entry.expense_amount_raw || 0;
  const claim_count = entry.claim_count || 0;
  const policy_count_earned = entry.policy_count_earned || 0;
  const avg_premium_per_policy_json = entry.avg_premium_per_policy; 

  const policy_count = (avg_premium_per_policy_json && avg_premium_per_policy_json !== 0 && premium_written !==0)
    ? (premium_written * 10000) / avg_premium_per_policy_json
    : 0;

  const loss_ratio = premium_earned !== 0 ? (total_loss_amount / premium_earned) * 100 : 0;
  const expense_ratio = premium_written !== 0 ? (expense_amount_raw / premium_written) * 100 : 0;
  const variable_cost_ratio = loss_ratio + expense_ratio;
  const premium_earned_ratio = premium_written !== 0 ? (premium_earned / premium_written) * 100 : 0;
  const claim_frequency = policy_count_earned !== 0 ? (claim_count / policy_count_earned) * 100 : 0;
  const avg_premium_per_policy = policy_count !== 0 ? (premium_written * 10000) / policy_count : 0; 
  const avg_loss_per_case = claim_count !== 0 ? (total_loss_amount * 10000) / claim_count : 0; 
  const expense_amount = premium_written * (expense_ratio / 100);

  // New calculation logic based on user request
  const marginal_contribution_ratio = 100 - variable_cost_ratio;
  const marginal_contribution_amount = premium_earned * (marginal_contribution_ratio / 100);

  return {
    premium_written,
    premium_earned,
    total_loss_amount,
    expense_amount_raw,
    policy_count: Math.round(policy_count), // 件数取整
    claim_count: Math.round(claim_count), // 件数取整
    policy_count_earned: Math.round(policy_count_earned), // 件数取整
    avg_commercial_index: entry.avg_commercial_index,
    loss_ratio,
    expense_ratio,
    variable_cost_ratio,
    premium_earned_ratio,
    claim_frequency,
    avg_premium_per_policy,
    avg_loss_per_case,
    expense_amount,
    marginal_contribution_ratio,
    marginal_contribution_amount,
  };
};

/**
 * Aggregates business data for a period and calculates metrics.
 * Handles 'cumulative' (YTD) and 'periodOverPeriod' (当周发生额) logic.
 */
const aggregateAndCalculateMetrics = (
  periodBusinessDataEntries: V4BusinessDataEntry[], // Raw YTD entries for the period and selected business types
  analysisMode: AnalysisMode,
  previousPeriodBusinessDataEntries?: V4BusinessDataEntry[] // Raw YTD entries for the *previous* period (for PoP calc)
): AggregatedBusinessMetrics => {
  
  let dataToProcess: V4BusinessDataEntry[] = periodBusinessDataEntries;

  if (analysisMode === 'periodOverPeriod' && previousPeriodBusinessDataEntries) {
    dataToProcess = periodBusinessDataEntries.map(currentEntry => {
      const prevEntry = previousPeriodBusinessDataEntries.find(pe => pe.business_type === currentEntry.business_type);
      
      // If no previous entry, "current period actual" is the YTD value for base amounts.
      // Rates and averages will be recalculated based on these actuals.
      const actual_premium_written = (currentEntry.premium_written || 0) - (prevEntry?.premium_written || 0);
      const actual_premium_earned = (currentEntry.premium_earned || 0) - (prevEntry?.premium_earned || 0);
      const actual_total_loss_amount = (currentEntry.total_loss_amount || 0) - (prevEntry?.total_loss_amount || 0);
      const actual_expense_amount_raw = (currentEntry.expense_amount_raw || 0) - (prevEntry?.expense_amount_raw || 0);
      const actual_claim_count = (currentEntry.claim_count || 0) - (prevEntry?.claim_count || 0);
      const actual_policy_count_earned = (currentEntry.policy_count_earned || 0) - (prevEntry?.policy_count_earned || 0);

      // For PoP, we construct a temporary V4BusinessDataEntry with these "actual" values
      // so that calculateBaseMetricsForSingleEntry can derive PoP policy_count, rates, and averages.
      return {
        ...currentEntry, // Keep original avg_premium_per_policy for policy_count derivation, and avg_commercial_index
        premium_written: actual_premium_written,
        premium_earned: actual_premium_earned,
        total_loss_amount: actual_total_loss_amount,
        expense_amount_raw: actual_expense_amount_raw,
        claim_count: actual_claim_count,
        policy_count_earned: actual_policy_count_earned,
        // JSON pre-calculated rates/averages are YTD, so set them to null to force recalculation for PoP
        loss_ratio: null, 
        expense_ratio: null,
        variable_cost_ratio: null,
        premium_earned_ratio: null,
        claim_frequency: null,
        avg_loss_per_case: null, 
      };
    });
  }

  // Calculate metrics for each entry (now either YTD or PoP base values)
  const individualMetricsArray = dataToProcess.map(entry => calculateBaseMetricsForSingleEntry(entry));

  // If only one business type is effectively selected
  if (individualMetricsArray.length === 1) {
    const singleMetrics = individualMetricsArray[0];
    if (analysisMode === 'cumulative') { // Use JSON pre-calcs if cumulative and single line
      const originalEntry = periodBusinessDataEntries[0];
      return {
        ...singleMetrics, // Use recalculated for consistency and derived values
        loss_ratio: originalEntry.loss_ratio ?? singleMetrics.loss_ratio,
        expense_ratio: originalEntry.expense_ratio ?? singleMetrics.expense_ratio,
        variable_cost_ratio: originalEntry.variable_cost_ratio ?? singleMetrics.variable_cost_ratio,
        premium_earned_ratio: originalEntry.premium_earned_ratio ?? singleMetrics.premium_earned_ratio,
        claim_frequency: originalEntry.claim_frequency ?? singleMetrics.claim_frequency,
        // avg_premium_per_policy is already handled by calculateBaseMetricsForSingleEntry from originalEntry's avg_premium_per_policy
        avg_loss_per_case: originalEntry.avg_loss_per_case ?? singleMetrics.avg_loss_per_case,
        avg_commercial_index: originalEntry.avg_commercial_index, // Always direct
        // New marginals will be based on potentially overridden ratios above
        marginal_contribution_ratio: 100 - (originalEntry.variable_cost_ratio ?? singleMetrics.variable_cost_ratio),
        marginal_contribution_amount: (originalEntry.premium_earned || singleMetrics.premium_earned) * ((100 - (originalEntry.variable_cost_ratio ?? singleMetrics.variable_cost_ratio))/100)
      };
    }
    return singleMetrics; // For PoP single line, all are recalculated
  }

  // Aggregation for multiple business types
  const aggregated = individualMetricsArray.reduce((acc, metrics) => {
    acc.premium_written += metrics.premium_written;
    acc.premium_earned += metrics.premium_earned;
    acc.total_loss_amount += metrics.total_loss_amount;
    acc.expense_amount_raw += metrics.expense_amount_raw;
    acc.policy_count += metrics.policy_count;
    acc.claim_count += metrics.claim_count;
    acc.policy_count_earned += metrics.policy_count_earned;
    return acc;
  }, {
    premium_written: 0, premium_earned: 0, total_loss_amount: 0, expense_amount_raw: 0,
    policy_count: 0, claim_count: 0, policy_count_earned: 0,
  });

  const agg_loss_ratio = aggregated.premium_earned !== 0 ? (aggregated.total_loss_amount / aggregated.premium_earned) * 100 : 0;
  const agg_expense_ratio = aggregated.premium_written !== 0 ? (aggregated.expense_amount_raw / aggregated.premium_written) * 100 : 0;
  const agg_variable_cost_ratio = agg_loss_ratio + agg_expense_ratio;
  const agg_premium_earned_ratio = aggregated.premium_written !== 0 ? (aggregated.premium_earned / aggregated.premium_written) * 100 : 0;
  const agg_claim_frequency = aggregated.policy_count_earned !== 0 ? (aggregated.claim_count / aggregated.policy_count_earned) * 100 : 0;
  const agg_avg_premium_per_policy = aggregated.policy_count !== 0 ? (aggregated.premium_written * 10000) / aggregated.policy_count : 0;
  const agg_avg_loss_per_case = aggregated.claim_count !== 0 ? (aggregated.total_loss_amount * 10000) / aggregated.claim_count : 0;
  const agg_expense_amount = aggregated.premium_written * (agg_expense_ratio / 100);

  // New calculation logic for aggregated marginals
  const agg_marginal_contribution_ratio = 100 - agg_variable_cost_ratio;
  const agg_marginal_contribution_amount = aggregated.premium_earned * (agg_marginal_contribution_ratio / 100);

  return {
    premium_written: aggregated.premium_written,
    premium_earned: aggregated.premium_earned,
    total_loss_amount: aggregated.total_loss_amount,
    expense_amount_raw: aggregated.expense_amount_raw,
    policy_count: Math.round(aggregated.policy_count), // 件数取整
    claim_count: Math.round(aggregated.claim_count), // 件数取整
    policy_count_earned: Math.round(aggregated.policy_count_earned), // 件数取整
    avg_commercial_index: undefined, // Not aggregated

    loss_ratio: agg_loss_ratio,
    expense_ratio: agg_expense_ratio,
    variable_cost_ratio: agg_variable_cost_ratio,
    premium_earned_ratio: agg_premium_earned_ratio,
    claim_frequency: agg_claim_frequency,
    avg_premium_per_policy: agg_avg_premium_per_policy,
    avg_loss_per_case: agg_avg_loss_per_case,
    expense_amount: agg_expense_amount,
    marginal_contribution_ratio: agg_marginal_contribution_ratio,
    marginal_contribution_amount: agg_marginal_contribution_amount,
  };
};

/**
 * Processes V4 data for a selected period, analysis mode, and business types.
 */
export const processDataForSelectedPeriod = (
  allV4Data: V4PeriodData[],
  selectedPeriodId: string,
  analysisMode: AnalysisMode,
  selectedBusinessTypes: string[]
): ProcessedDataForPeriod[] => {
  const currentPeriod = allV4Data.find(p => p.period_id === selectedPeriodId);
  if (!currentPeriod) return [];

  const momPeriodId = currentPeriod.comparison_period_id_mom;
  const momPeriod = momPeriodId ? allV4Data.find(p => p.period_id === momPeriodId) : undefined;

  const yoyPeriodId = currentPeriod.comparison_period_id_yoy;
  const yoyPeriod = yoyPeriodId ? allV4Data.find(p => p.period_id === yoyPeriodId) : undefined;
  
  const filterBusinessData = (period?: V4PeriodData): V4BusinessDataEntry[] => {
    if (!period || !period.business_data) return [];
    const relevantData = period.business_data.filter(bd => bd.business_type !== "合计");
    if (selectedBusinessTypes.length === 0) return relevantData;
    return relevantData.filter(bd => selectedBusinessTypes.includes(bd.business_type));
  };

  const currentRawBusinessData = filterBusinessData(currentPeriod);
  const momRawBusinessDataForPoP = filterBusinessData(momPeriod); // For PoP base calc
  const momRawBusinessDataForComparison = filterBusinessData(momPeriod); // For MoM comparison (always YTD based)
  const yoyRawBusinessDataForComparison = filterBusinessData(yoyPeriod); // For YoY comparison (always YTD based)

  const currentAggregatedMetrics = aggregateAndCalculateMetrics(
    currentRawBusinessData,
    analysisMode,
    analysisMode === 'periodOverPeriod' ? momRawBusinessDataForPoP : undefined
  );
  
  const momAggregatedMetrics = momPeriod ? aggregateAndCalculateMetrics(momRawBusinessDataForComparison, 'cumulative') : null;
  const yoyAggregatedMetrics = yoyPeriod ? aggregateAndCalculateMetrics(yoyRawBusinessDataForComparison, 'cumulative') : null;
  
  const businessLineName = selectedBusinessTypes.length === 0 || selectedBusinessTypes.length > 1 
                           ? "合计" 
                           : selectedBusinessTypes[0];
  const businessLineId = businessLineName; 

  const premium_share = (currentPeriod.totals_for_period?.total_premium_written_overall && currentPeriod.totals_for_period.total_premium_written_overall !== 0 && currentAggregatedMetrics.premium_written !== undefined)
    ? (currentAggregatedMetrics.premium_written / currentPeriod.totals_for_period.total_premium_written_overall) * 100
    : 0;

  // Populate ProcessedDataForPeriod, mainly for DataTableSection compatibility
  // DataTableSection will need to be updated to use currentMetrics, momMetrics, yoyMetrics directly for changes.
  // The change fields here are illustrative and will be calculated in calculateKpis or DataTable
  const processedEntry: ProcessedDataForPeriod = {
    businessLineId,
    businessLineName,
    icon: businessLineIcons[businessLineName] || Users, // Default icon
    currentMetrics: currentAggregatedMetrics,
    momMetrics: momAggregatedMetrics,
    yoyMetrics: yoyAggregatedMetrics,
    premium_written: currentAggregatedMetrics.premium_written,
    total_loss_amount: currentAggregatedMetrics.total_loss_amount,
    policy_count: currentAggregatedMetrics.policy_count,
    loss_ratio: currentAggregatedMetrics.loss_ratio,
    expense_ratio: currentAggregatedMetrics.expense_ratio,
    variable_cost_ratio: currentAggregatedMetrics.variable_cost_ratio,
    premium_share: premium_share,
  };

  return [processedEntry];
};


const calculateChangeAndType = (current?: number | null, previous?: number | null, higherIsBetter: boolean = true): { percent?: number, absolute?: number, type: Kpi['changeType'] } => {
  if (current === undefined || previous === undefined || current === null || previous === null || isNaN(current) || isNaN(previous)) {
    return { type: 'neutral' };
  }
  const absolute = current - previous;
  let percent: number | undefined;
  if (previous !== 0) {
    percent = (absolute / Math.abs(previous)) * 100;
  } else if (current !== 0) { // Previous is 0, current is not
    percent = current > 0 ? Infinity : -Infinity; // Represent large change
  } else { // Both are 0
    percent = 0;
  }

  let type: Kpi['changeType'] = 'neutral';
  if (absolute > 0) type = higherIsBetter ? 'positive' : 'negative';
  if (absolute < 0) type = higherIsBetter ? 'negative' : 'positive';
  
  return { percent, absolute, type };
};


export const calculateKpis = (
  processedData: ProcessedDataForPeriod[], 
  overallTotalsForPeriod?: V4PeriodTotals | null
): Kpi[] => {
  if (!processedData || processedData.length === 0) return [];
  
  const data = processedData[0]; 
  const current = data.currentMetrics;
  const mom = data.momMetrics;
  const yoy = data.yoyMetrics;

  if (!current) return [];

  const formatChange = (change: { percent?: number, absolute?: number, type: Kpi['changeType'] }, unit: '万元' | '元' | '%' | '件' = '%', higherIsBetterForColor: boolean = true) => {
    let changePercentStr, changeAbsStr;
    if (change.percent !== undefined && isFinite(change.percent)) { // Check for Infinity
        changePercentStr = formatPercentage(change.percent, 2); // Use 2 decimal places for change %
    } else if (change.percent === Infinity) {
        changePercentStr = "+∞%";
    } else if (change.percent === -Infinity) {
        changePercentStr = "-∞%";
    }

    if (change.absolute !== undefined) {
        if (unit === '万元' || unit === '元') changeAbsStr = formatCurrency(change.absolute, unit);
        else if (unit === '%') changeAbsStr = formatPercentage(change.absolute, 2); // Rate changes in pp
        else if (unit === '件') changeAbsStr = formatNumber(Math.round(change.absolute)); //件数取整
        else changeAbsStr = formatNumber(change.absolute);
    }
    
    let effectiveChangeType = change.type;
    if (unit === '%' && !higherIsBetterForColor) { // Invert color logic for rates where lower is better
        if (change.absolute && change.absolute > 0) effectiveChangeType = 'negative';
        else if (change.absolute && change.absolute < 0) effectiveChangeType = 'positive';
    }


    return { change: changePercentStr, changeAbsolute: changeAbsStr, changeType: effectiveChangeType };
  };
  
  // MoM Changes
  const premWrittenMomChg = calculateChangeAndType(current.premium_written, mom?.premium_written);
  const premEarnedMomChg = calculateChangeAndType(current.premium_earned, mom?.premium_earned);
  const lossAmtMomChg = calculateChangeAndType(current.total_loss_amount, mom?.total_loss_amount); // higherIsBetter = false in formatChange
  const expenseAmtMomChg = calculateChangeAndType(current.expense_amount, mom?.expense_amount); // higherIsBetter = false
  const policyCntMomChg = calculateChangeAndType(current.policy_count, mom?.policy_count);
  
  const lossRatioMomChg = calculateChangeAndType(current.loss_ratio, mom?.loss_ratio); // higherIsBetter = false
  const expenseRatioMomChg = calculateChangeAndType(current.expense_ratio, mom?.expense_ratio); // higherIsBetter = false
  const varCostRatioMomChg = calculateChangeAndType(current.variable_cost_ratio, mom?.variable_cost_ratio); // higherIsBetter = false
  const premEarnRatioMomChg = calculateChangeAndType(current.premium_earned_ratio, mom?.premium_earned_ratio);
  const claimFreqMomChg = calculateChangeAndType(current.claim_frequency, mom?.claim_frequency); // higherIsBetter = false
  const avgPremPolMomChg = calculateChangeAndType(current.avg_premium_per_policy, mom?.avg_premium_per_policy);
  const avgLossCaseMomChg = calculateChangeAndType(current.avg_loss_per_case, mom?.avg_loss_per_case); // higherIsBetter = false
  
  const marginalContribAmtMomChg = calculateChangeAndType(current.marginal_contribution_amount, mom?.marginal_contribution_amount);
  const marginalContribRatioMomChg = calculateChangeAndType(current.marginal_contribution_ratio, mom?.marginal_contribution_ratio);
  
  // YoY Changes
  const premWrittenYoyChg = calculateChangeAndType(current.premium_written, yoy?.premium_written);
  const premEarnedYoyChg = calculateChangeAndType(current.premium_earned, yoy?.premium_earned);
  const lossAmtYoyChg = calculateChangeAndType(current.total_loss_amount, yoy?.total_loss_amount); // higherIsBetter = false
  const expenseAmtYoyChg = calculateChangeAndType(current.expense_amount, yoy?.expense_amount); // higherIsBetter = false
  const policyCntYoyChg = calculateChangeAndType(current.policy_count, yoy?.policy_count);

  const lossRatioYoyChg = calculateChangeAndType(current.loss_ratio, yoy?.loss_ratio); // higherIsBetter = false
  const expenseRatioYoyChg = calculateChangeAndType(current.expense_ratio, yoy?.expense_ratio); // higherIsBetter = false
  const varCostRatioYoyChg = calculateChangeAndType(current.variable_cost_ratio, yoy?.variable_cost_ratio); // higherIsBetter = false
  const premEarnRatioYoyChg = calculateChangeAndType(current.premium_earned_ratio, yoy?.premium_earned_ratio);
  const claimFreqYoyChg = calculateChangeAndType(current.claim_frequency, yoy?.claim_frequency); // higherIsBetter = false
  const avgPremPolYoyChg = calculateChangeAndType(current.avg_premium_per_policy, yoy?.avg_premium_per_policy);
  const avgLossCaseYoyChg = calculateChangeAndType(current.avg_loss_per_case, yoy?.avg_loss_per_case); // higherIsBetter = false

  const marginalContribAmtYoyChg = calculateChangeAndType(current.marginal_contribution_amount, yoy?.marginal_contribution_amount);
  const marginalContribRatioYoyChg = calculateChangeAndType(current.marginal_contribution_ratio, yoy?.marginal_contribution_ratio);
  
  const kpis: Kpi[] = [
    {
      id: 'marginal_contribution_ratio', title: '边际贡献率', value: formatPercentage(current.marginal_contribution_ratio), rawValue: current.marginal_contribution_ratio,
      ...formatChange(marginalContribRatioMomChg, '%', true),
      yoyChange: formatChange(marginalContribRatioYoyChg, '%', true).change, yoyChangeAbsolute: formatChange(marginalContribRatioYoyChg, '%', true).changeAbsolute, yoyChangeType: formatChange(marginalContribRatioYoyChg, '%', true).changeType,
      icon: Ratio,
    },
    {
      id: 'variable_cost_ratio', title: '变动成本率', value: formatPercentage(current.variable_cost_ratio), rawValue: current.variable_cost_ratio,
      ...formatChange(varCostRatioMomChg, '%', false),
      yoyChange: formatChange(varCostRatioYoyChg, '%', false).change, yoyChangeAbsolute: formatChange(varCostRatioYoyChg, '%', false).changeAbsolute, yoyChangeType: formatChange(varCostRatioYoyChg, '%', false).changeType,
      icon: Zap, isBorderRisk: current.variable_cost_ratio !== undefined && current.variable_cost_ratio > 90,
    },
    {
      id: 'expense_ratio', title: '费用率', value: formatPercentage(current.expense_ratio), rawValue: current.expense_ratio,
      ...formatChange(expenseRatioMomChg, '%', false),
      yoyChange: formatChange(expenseRatioYoyChg, '%', false).change, yoyChangeAbsolute: formatChange(expenseRatioYoyChg, '%', false).changeAbsolute, yoyChangeType: formatChange(expenseRatioYoyChg, '%', false).changeType,
      icon: Briefcase, isOrangeRisk: current.expense_ratio !== undefined && current.expense_ratio > 14.5,
    },
    {
      id: 'loss_ratio', title: '满期赔付率', value: formatPercentage(current.loss_ratio), rawValue: current.loss_ratio,
      ...formatChange(lossRatioMomChg, '%', false),
      yoyChange: formatChange(lossRatioYoyChg, '%', false).change, yoyChangeAbsolute: formatChange(lossRatioYoyChg, '%', false).changeAbsolute, yoyChangeType: formatChange(lossRatioYoyChg, '%', false).changeType,
      icon: Percent, isRisk: current.loss_ratio !== undefined && current.loss_ratio > 70, description: "基于已报告赔款",
    },
    {
      id: 'marginal_contribution_amount', title: '边贡额', value: formatCurrency(current.marginal_contribution_amount), rawValue: current.marginal_contribution_amount,
      ...formatChange(marginalContribAmtMomChg, '万元', true),
      yoyChange: formatChange(marginalContribAmtYoyChg, '万元', true).change, yoyChangeAbsolute: formatChange(marginalContribAmtYoyChg, '万元', true).changeAbsolute, yoyChangeType: formatChange(marginalContribAmtYoyChg, '万元', true).changeType,
      icon: Landmark,
    },
    {
      id: 'premium_written', title: '保费', value: formatCurrency(current.premium_written), rawValue: current.premium_written,
      ...formatChange(premWrittenMomChg, '万元', true),
      yoyChange: formatChange(premWrittenYoyChg, '万元', true).change, yoyChangeAbsolute: formatChange(premWrittenYoyChg, '万元', true).changeAbsolute, yoyChangeType: formatChange(premWrittenYoyChg, '万元', true).changeType,
      icon: DollarSign,
    },
    {
      id: 'expense_amount', title: '费用', value: formatCurrency(current.expense_amount), rawValue: current.expense_amount,
      ...formatChange(expenseAmtMomChg, '万元', false),
      yoyChange: formatChange(expenseAmtYoyChg, '万元', false).change, yoyChangeAbsolute: formatChange(expenseAmtYoyChg, '万元', false).changeAbsolute, yoyChangeType: formatChange(expenseAmtYoyChg, '万元', false).changeType,
      icon: Briefcase,
    },
    {
      id: 'total_loss_amount', title: '赔款', value: formatCurrency(current.total_loss_amount), rawValue: current.total_loss_amount,
      ...formatChange(lossAmtMomChg, '万元', false),
      yoyChange: formatChange(lossAmtYoyChg, '万元', false).change, yoyChangeAbsolute: formatChange(lossAmtYoyChg, '万元', false).changeAbsolute, yoyChangeType: formatChange(lossAmtYoyChg, '万元', false).changeType,
      icon: ShieldCheck,
    },
    {
      id: 'premium_earned', title: '满期保费', value: formatCurrency(current.premium_earned), rawValue: current.premium_earned,
      ...formatChange(premEarnedMomChg, '万元', true),
      yoyChange: formatChange(premEarnedYoyChg, '万元', true).change, yoyChangeAbsolute: formatChange(premEarnedYoyChg, '万元', true).changeAbsolute, yoyChangeType: formatChange(premEarnedYoyChg, '万元', true).changeType,
      icon: DollarSign,
    },
    {
      id: 'premium_earned_ratio', title: '保费满期率', value: formatPercentage(current.premium_earned_ratio), rawValue: current.premium_earned_ratio,
       ...formatChange(premEarnRatioMomChg, '%', true),
      yoyChange: formatChange(premEarnRatioYoyChg, '%', true).change, yoyChangeAbsolute: formatChange(premEarnRatioYoyChg, '%', true).changeAbsolute, yoyChangeType: formatChange(premEarnRatioYoyChg, '%', true).changeType,
      icon: Ratio,
    },
    {
      id: 'avg_premium_per_policy', title: '单均保费', value: formatCurrency(current.avg_premium_per_policy, '元'), rawValue: current.avg_premium_per_policy,
       ...formatChange(avgPremPolMomChg, '元', true), // Assuming higher avg premium is better
      yoyChange: formatChange(avgPremPolYoyChg, '元', true).change, yoyChangeAbsolute: formatChange(avgPremPolYoyChg, '元', true).changeAbsolute, yoyChangeType: formatChange(avgPremPolYoyChg, '元', true).changeType,
      icon: FileText,
    },
    {
      id: 'policy_count', title: '保单件数', value: formatNumber(Math.round(current.policy_count)), rawValue: Math.round(current.policy_count),
      ...formatChange(policyCntMomChg, '件', true),
      yoyChange: formatChange(policyCntYoyChg, '件', true).change, yoyChangeAbsolute: formatChange(policyCntYoyChg, '件', true).changeAbsolute, yoyChangeType: formatChange(policyCntYoyChg, '件', true).changeType,
      icon: FileText,
    },
    {
      id: 'premium_share', title: '保费占比', value: formatPercentage(data.premium_share), rawValue: data.premium_share,
      change: undefined, changeAbsolute: undefined, changeType: 'neutral', 
      yoyChange: undefined, yoyChangeAbsolute: undefined, yoyChangeType: 'neutral',
      icon: Users,
    },
    {
      id: 'avg_commercial_index', title: '自主系数', 
      value: current.avg_commercial_index !== undefined && current.avg_commercial_index !== null ? current.avg_commercial_index.toFixed(4) : "N/A", // Format to 4 decimal places as per example
      rawValue: current.avg_commercial_index,
      change: undefined, changeAbsolute: undefined, changeType: 'neutral',
      yoyChange: undefined, yoyChangeAbsolute: undefined, yoyChangeType: 'neutral',
      icon: Search,
    },
    {
      id: 'claim_frequency', title: '满期出险率', value: formatPercentage(current.claim_frequency), rawValue: current.claim_frequency,
      ...formatChange(claimFreqMomChg, '%', false),
      yoyChange: formatChange(claimFreqYoyChg, '%', false).change, yoyChangeAbsolute: formatChange(claimFreqYoyChg, '%', false).changeAbsolute, yoyChangeType: formatChange(claimFreqYoyChg, '%', false).changeType,
      icon: Activity,
    },
    {
      id: 'avg_loss_per_case', title: '案均赔款', value: formatCurrency(current.avg_loss_per_case, '元'), rawValue: current.avg_loss_per_case,
      ...formatChange(avgLossCaseMomChg, '元', false), // Assuming lower avg loss per case is better
      yoyChange: formatChange(avgLossCaseYoyChg, '元', false).change, yoyChangeAbsolute: formatChange(avgLossCaseYoyChg, '元', false).changeAbsolute, yoyChangeType: formatChange(avgLossCaseYoyChg, '元', false).changeType,
      icon: ShieldCheck,
    },
  ];
  
  return kpis;
};
