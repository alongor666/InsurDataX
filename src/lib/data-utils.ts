
import type { ProcessedDataForPeriod, Kpi, V4PeriodData, V4BusinessDataEntry, V4PeriodTotals, AggregatedBusinessMetrics, AnalysisMode } from '@/data/types';
import { DollarSign, FileText, Percent, Briefcase, Zap, Activity, ShieldCheck, Landmark, Users, Ratio, Search } from 'lucide-react';
import { businessLineIcons } from '@/data/mock-data';

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
  return new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(value));
};

export const formatPercentage = (value: number | undefined | null, decimals: number = 2): string => {
  if (value === undefined || isNaN(value) || value === null) return 'N/A';
  return `${value.toFixed(decimals)}%`;
};

// Calculates all metrics for a single business entry based on its *provided* base values.
// If used for YTD, entry contains YTD base values.
// If used for PoP, entry might contain "actual" (delta) base values, and all rates/avgs are recalculated.
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

  // These are always recalculated from the provided base amounts in 'entry'
  const loss_ratio = premium_earned !== 0 ? (total_loss_amount / premium_earned) * 100 : 0;
  const expense_ratio = premium_written !== 0 ? (expense_amount_raw / premium_written) * 100 : 0;
  const premium_earned_ratio = premium_written !== 0 ? (premium_earned / premium_written) * 100 : 0;
  const claim_frequency = policy_count_earned !== 0 ? (claim_count / policy_count_earned) * 100 : 0;
  const avg_loss_per_case = claim_count !== 0 ? (total_loss_amount * 10000) / claim_count : 0;
  const avg_premium_per_policy_recalc = policy_count !== 0 ? (premium_written * 10000) / policy_count : 0;

  // Dependent metrics also recalculated based on above
  const variable_cost_ratio = loss_ratio + expense_ratio;
  const expense_amount = premium_written * (expense_ratio / 100);
  const marginal_contribution_ratio = 100 - variable_cost_ratio;
  const marginal_contribution_amount = premium_earned * (marginal_contribution_ratio / 100);

  return {
    premium_written,
    premium_earned,
    total_loss_amount,
    expense_amount_raw,
    policy_count: Math.round(policy_count),
    claim_count: Math.round(claim_count),
    policy_count_earned: Math.round(policy_count_earned),
    avg_commercial_index: entry.avg_commercial_index, // Always direct from entry (YTD or null for PoP)
    
    loss_ratio,
    expense_ratio,
    variable_cost_ratio,
    premium_earned_ratio,
    claim_frequency,
    avg_premium_per_policy: avg_premium_per_policy_recalc, // Use the recalculated one
    avg_loss_per_case,
    expense_amount,
    marginal_contribution_ratio,
    marginal_contribution_amount,
  };
};


export const aggregateAndCalculateMetrics = (
  periodBusinessDataEntries: V4BusinessDataEntry[], // Raw YTD entries for the period and selected business types
  analysisMode: AnalysisMode,
  previousPeriodBusinessDataEntries?: V4BusinessDataEntry[] // Raw YTD entries for the *previous* period (for PoP calc)
): AggregatedBusinessMetrics => {
  
  let dataToProcess: V4BusinessDataEntry[] = periodBusinessDataEntries;

  if (analysisMode === 'periodOverPeriod' && previousPeriodBusinessDataEntries) {
    dataToProcess = periodBusinessDataEntries.map(currentEntry => {
      const prevEntry = previousPeriodBusinessDataEntries.find(pe => pe.business_type === currentEntry.business_type);
      
      const actual_premium_written = (currentEntry.premium_written || 0) - (prevEntry?.premium_written || 0);
      const actual_premium_earned = (currentEntry.premium_earned || 0) - (prevEntry?.premium_earned || 0);
      const actual_total_loss_amount = (currentEntry.total_loss_amount || 0) - (prevEntry?.total_loss_amount || 0);
      const actual_expense_amount_raw = (currentEntry.expense_amount_raw || 0) - (prevEntry?.expense_amount_raw || 0);
      const actual_claim_count = (currentEntry.claim_count || 0) - (prevEntry?.claim_count || 0);
      const actual_policy_count_earned = (currentEntry.policy_count_earned || 0) - (prevEntry?.policy_count_earned || 0);

      return {
        ...currentEntry, 
        premium_written: actual_premium_written,
        premium_earned: actual_premium_earned,
        total_loss_amount: actual_total_loss_amount,
        expense_amount_raw: actual_expense_amount_raw,
        claim_count: actual_claim_count,
        policy_count_earned: actual_policy_count_earned,
        // avg_commercial_index for PoP should be based on current YTD if not derivable otherwise
        // Set pre-calculated rates/averages to null to force recalculation by calculateBaseMetricsForSingleEntry
        loss_ratio: null, 
        expense_ratio: null,
        variable_cost_ratio: null,
        premium_earned_ratio: null,
        claim_frequency: null,
        avg_loss_per_case: null,
        // avg_premium_per_policy from original entry is still needed by calculateBaseMetricsForSingleEntry to derive PoP policy_count
      };
    });
  }

  const individualMetricsArray = dataToProcess.map(entry => calculateBaseMetricsForSingleEntry(entry));

  if (individualMetricsArray.length === 1) {
    const singleCalculatedMetrics = individualMetricsArray[0];
    const originalJsonEntry = periodBusinessDataEntries[0]; // The original YTD entry from JSON

    if (analysisMode === 'cumulative') {
      // For cumulative single line, prioritize JSON pre-calcs if available and valid numbers
      // Base amounts and avg_commercial_index are taken from originalJsonEntry's YTD values
      // policy_count is derived by calculateBaseMetricsForSingleEntry using originalJsonEntry.avg_premium_per_policy
      const result: AggregatedBusinessMetrics = {
        premium_written: originalJsonEntry.premium_written || 0,
        premium_earned: originalJsonEntry.premium_earned || 0,
        total_loss_amount: originalJsonEntry.total_loss_amount || 0,
        expense_amount_raw: originalJsonEntry.expense_amount_raw || 0,
        claim_count: Math.round(originalJsonEntry.claim_count || 0),
        policy_count_earned: Math.round(originalJsonEntry.policy_count_earned || 0),
        avg_commercial_index: originalJsonEntry.avg_commercial_index,
        
        // policy_count is derived based on originalJsonEntry.premium_written and originalJsonEntry.avg_premium_per_policy
        // This happens inside calculateBaseMetricsForSingleEntry, so singleCalculatedMetrics.policy_count is correct
        policy_count: singleCalculatedMetrics.policy_count,
        
        // Use JSON pre-calculated rates/averages if they exist and are numbers
        loss_ratio: typeof originalJsonEntry.loss_ratio === 'number' ? originalJsonEntry.loss_ratio : singleCalculatedMetrics.loss_ratio,
        expense_ratio: typeof originalJsonEntry.expense_ratio === 'number' ? originalJsonEntry.expense_ratio : singleCalculatedMetrics.expense_ratio,
        premium_earned_ratio: typeof originalJsonEntry.premium_earned_ratio === 'number' ? originalJsonEntry.premium_earned_ratio : singleCalculatedMetrics.premium_earned_ratio,
        claim_frequency: typeof originalJsonEntry.claim_frequency === 'number' ? originalJsonEntry.claim_frequency : singleCalculatedMetrics.claim_frequency,
        avg_loss_per_case: typeof originalJsonEntry.avg_loss_per_case === 'number' ? originalJsonEntry.avg_loss_per_case : singleCalculatedMetrics.avg_loss_per_case,
        // avg_premium_per_policy: use the value from JSON as per spec "可以直接使用 JSON 中提供的该业务类型的预计算值"
        avg_premium_per_policy: typeof originalJsonEntry.avg_premium_per_policy === 'number' ? originalJsonEntry.avg_premium_per_policy : singleCalculatedMetrics.avg_premium_per_policy,
      };

      // Recalculate dependent metrics based on the (potentially JSON-sourced) values
      result.variable_cost_ratio = result.loss_ratio + result.expense_ratio; // Uses potentially overridden ratios
      result.expense_amount = result.premium_written * (result.expense_ratio / 100); // Uses potentially overridden expense_ratio
      result.marginal_contribution_ratio = 100 - result.variable_cost_ratio;
      result.marginal_contribution_amount = result.premium_earned * (result.marginal_contribution_ratio / 100);
      
      return result;
    }
    // For PoP single line, all metrics are recalculated based on "actual" base values by calculateBaseMetricsForSingleEntry
    return singleCalculatedMetrics; 
  }

  // Aggregation for multiple business types
  const aggregated = individualMetricsArray.reduce((acc, metrics) => {
    acc.premium_written += metrics.premium_written;
    acc.premium_earned += metrics.premium_earned;
    acc.total_loss_amount += metrics.total_loss_amount;
    acc.expense_amount_raw += metrics.expense_amount_raw;
    acc.policy_count += metrics.policy_count; // Already rounded
    acc.claim_count += metrics.claim_count; // Already rounded
    acc.policy_count_earned += metrics.policy_count_earned; // Already rounded
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

  const agg_marginal_contribution_ratio = 100 - agg_variable_cost_ratio;
  const agg_marginal_contribution_amount = aggregated.premium_earned * (agg_marginal_contribution_ratio / 100);

  return {
    premium_written: aggregated.premium_written,
    premium_earned: aggregated.premium_earned,
    total_loss_amount: aggregated.total_loss_amount,
    expense_amount_raw: aggregated.expense_amount_raw,
    policy_count: Math.round(aggregated.policy_count),
    claim_count: Math.round(aggregated.claim_count),
    policy_count_earned: Math.round(aggregated.policy_count_earned),
    avg_commercial_index: undefined, 

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

export const processDataForSelectedPeriod = (
  allV4Data: V4PeriodData[],
  selectedPeriodId: string,
  analysisMode: AnalysisMode,
  selectedBusinessTypes: string[] // Empty array means "合计" (aggregate all)
): ProcessedDataForPeriod[] => {
  const currentPeriod = allV4Data.find(p => p.period_id === selectedPeriodId);
  if (!currentPeriod) return [];

  const momPeriodId = currentPeriod.comparison_period_id_mom;
  const momOriginalPeriod = momPeriodId ? allV4Data.find(p => p.period_id === momPeriodId) : undefined;
  
  const yoyPeriodId = currentPeriod.comparison_period_id_yoy;
  const yoyOriginalPeriod = yoyPeriodId ? allV4Data.find(p => p.period_id === yoyPeriodId) : undefined;
  
  const filterBusinessDataEntries = (periodData?: V4PeriodData): V4BusinessDataEntry[] => {
    if (!periodData || !periodData.business_data) return [];
    const individualLines = periodData.business_data.filter(bd => bd.business_type !== "合计");
    if (selectedBusinessTypes.length === 0) return individualLines; // For "合计", use all individual lines for aggregation
    return individualLines.filter(bd => selectedBusinessTypes.includes(bd.business_type));
  };

  // Get raw YTD data for the current period, filtered by selected business types (or all if none selected)
  const currentPeriodFilteredYtdEntries = filterBusinessDataEntries(currentPeriod);
  
  // For PoP calculation, we need the previous period's YTD data, also filtered by the same business types
  const momPeriodFilteredYtdEntriesForPoP = momOriginalPeriod ? filterBusinessDataEntries(momOriginalPeriod) : undefined;

  // Calculate current metrics based on analysis mode
  const currentAggregatedMetrics = aggregateAndCalculateMetrics(
    currentPeriodFilteredYtdEntries,
    analysisMode,
    // Pass previous period's YTD only if mode is PoP, for delta calculation inside aggregateAndCalculateMetrics
    analysisMode === 'periodOverPeriod' ? momPeriodFilteredYtdEntriesForPoP : undefined 
  );
  
  // For MoM and YoY comparison, metrics are *always* calculated based on the YTD values of the comparison period
  const momPeriodFilteredYtdEntriesForComparison = momOriginalPeriod ? filterBusinessDataEntries(momOriginalPeriod) : undefined;
  const momAggregatedMetrics = momPeriodFilteredYtdEntriesForComparison 
    ? aggregateAndCalculateMetrics(momPeriodFilteredYtdEntriesForComparison, 'cumulative') 
    : null;

  const yoyPeriodFilteredYtdEntriesForComparison = yoyOriginalPeriod ? filterBusinessDataEntries(yoyOriginalPeriod) : undefined;
  const yoyAggregatedMetrics = yoyPeriodFilteredYtdEntriesForComparison
    ? aggregateAndCalculateMetrics(yoyPeriodFilteredYtdEntriesForComparison, 'cumulative')
    : null;
  
  const businessLineName = selectedBusinessTypes.length === 0 || currentPeriodFilteredYtdEntries.length > 1 
                           ? "合计" 
                           : (currentPeriodFilteredYtdEntries[0]?.business_type || "未知");
  const businessLineId = businessLineName; 

  const premium_share = (currentPeriod.totals_for_period?.total_premium_written_overall && currentPeriod.totals_for_period.total_premium_written_overall !== 0 && currentAggregatedMetrics.premium_written !== undefined)
    ? (currentAggregatedMetrics.premium_written / currentPeriod.totals_for_period.total_premium_written_overall) * 100
    : 0;

  const processedEntry: ProcessedDataForPeriod = {
    businessLineId,
    businessLineName,
    icon: businessLineIcons[businessLineName] || Users, 
    currentMetrics: currentAggregatedMetrics,
    momMetrics: momAggregatedMetrics,
    yoyMetrics: yoyAggregatedMetrics,
    premium_share: premium_share,
    // Deprecated direct fields - these should be accessed via currentMetrics in components
    premium_written: currentAggregatedMetrics.premium_written,
    total_loss_amount: currentAggregatedMetrics.total_loss_amount,
    policy_count: currentAggregatedMetrics.policy_count,
    loss_ratio: currentAggregatedMetrics.loss_ratio,
    expense_ratio: currentAggregatedMetrics.expense_ratio,
    variable_cost_ratio: currentAggregatedMetrics.variable_cost_ratio,
  };

  return [processedEntry]; // Return as an array, even if it's just the "合计"
};


const calculateChangeAndType = (current?: number | null, previous?: number | null, higherIsBetter: boolean = true): { percent?: number, absolute?: number, type: Kpi['changeType'] } => {
  if (current === undefined || previous === undefined || current === null || previous === null || isNaN(current) || isNaN(previous)) {
    return { type: 'neutral' };
  }
  const absolute = current - previous;
  let percent: number | undefined;
  if (previous !== 0) {
    percent = (absolute / Math.abs(previous)) * 100;
  } else if (current !== 0) { 
    percent = current > 0 ? Infinity : -Infinity; 
  } else { 
    percent = 0;
  }

  let type: Kpi['changeType'] = 'neutral';
  if (absolute > 0) type = higherIsBetter ? 'positive' : 'negative';
  if (absolute < 0) type = higherIsBetter ? 'negative' : 'positive';
  
  return { percent, absolute, type };
};


export const calculateKpis = (
  processedData: ProcessedDataForPeriod[], 
  overallTotalsForPeriod?: V4PeriodTotals | null // This is now available via currentPeriod.totals_for_period in page.tsx
): Kpi[] => {
  if (!processedData || processedData.length === 0) return [];
  
  const data = processedData[0]; // Assuming processedData[0] is the "合计" or selected single line data
  const current = data.currentMetrics;
  const mom = data.momMetrics; // These are YTD values of the MoM period
  const yoy = data.yoyMetrics; // These are YTD values of the YoY period

  if (!current) return [];

  const formatChange = (changeResult: { percent?: number, absolute?: number, type: Kpi['changeType'] }, unit: '万元' | '元' | '%' | '件' = '%', higherIsBetterForColorIndicator: boolean = true, isRateChange: boolean = false) => {
    let changePercentStr, changeAbsStr;

    if (changeResult.percent !== undefined && isFinite(changeResult.percent)) {
        changePercentStr = formatPercentage(changeResult.percent, 2);
    } else if (changeResult.percent === Infinity) {
        changePercentStr = "+∞%";
    } else if (changeResult.percent === -Infinity) {
        changePercentStr = "-∞%";
    }

    if (changeResult.absolute !== undefined) {
        if (unit === '万元' ) changeAbsStr = formatCurrency(changeResult.absolute, '万元');
        else if (unit === '元') changeAbsStr = formatCurrency(changeResult.absolute, '元');
        else if (unit === '%') changeAbsStr = formatPercentage(changeResult.absolute, 2); // For rate changes (percentage points)
        else if (unit === '件') changeAbsStr = formatNumber(Math.round(changeResult.absolute));
        else changeAbsStr = formatNumber(changeResult.absolute);
    }
    
    // Determine color type based on whether higher is better FOR THE KPI ITSELF,
    // not for the change.
    let effectiveChangeType = changeResult.type;
    if (isRateChange) { // For rates, positive absolute change is an increase.
        if (changeResult.absolute !== undefined && changeResult.absolute !== 0) {
             effectiveChangeType = higherIsBetterForColorIndicator ? 
                                 (changeResult.absolute > 0 ? 'positive' : 'negative') : 
                                 (changeResult.absolute > 0 ? 'negative' : 'positive');
        } else {
            effectiveChangeType = 'neutral';
        }
    }


    return { change: changePercentStr, changeAbsolute: changeAbsStr, changeType: effectiveChangeType };
  };
  
  // MoM Changes (comparison is current vs. momMetrics (which are YTD of prev period))
  const premWrittenMomChg = calculateChangeAndType(current.premium_written, mom?.premium_written, true);
  const premEarnedMomChg = calculateChangeAndType(current.premium_earned, mom?.premium_earned, true);
  const lossAmtMomChg = calculateChangeAndType(current.total_loss_amount, mom?.total_loss_amount, false);
  const expenseAmtMomChg = calculateChangeAndType(current.expense_amount, mom?.expense_amount, false);
  const policyCntMomChg = calculateChangeAndType(current.policy_count, mom?.policy_count, true);
  
  const lossRatioMomChg = calculateChangeAndType(current.loss_ratio, mom?.loss_ratio, false);
  const expenseRatioMomChg = calculateChangeAndType(current.expense_ratio, mom?.expense_ratio, false);
  const varCostRatioMomChg = calculateChangeAndType(current.variable_cost_ratio, mom?.variable_cost_ratio, false);
  const premEarnRatioMomChg = calculateChangeAndType(current.premium_earned_ratio, mom?.premium_earned_ratio, true);
  const claimFreqMomChg = calculateChangeAndType(current.claim_frequency, mom?.claim_frequency, false);
  const avgPremPolMomChg = calculateChangeAndType(current.avg_premium_per_policy, mom?.avg_premium_per_policy, true);
  const avgLossCaseMomChg = calculateChangeAndType(current.avg_loss_per_case, mom?.avg_loss_per_case, false);
  
  const marginalContribAmtMomChg = calculateChangeAndType(current.marginal_contribution_amount, mom?.marginal_contribution_amount, true);
  const marginalContribRatioMomChg = calculateChangeAndType(current.marginal_contribution_ratio, mom?.marginal_contribution_ratio, true);
  
  // YoY Changes
  const premWrittenYoyChg = calculateChangeAndType(current.premium_written, yoy?.premium_written, true);
  const premEarnedYoyChg = calculateChangeAndType(current.premium_earned, yoy?.premium_earned, true);
  const lossAmtYoyChg = calculateChangeAndType(current.total_loss_amount, yoy?.total_loss_amount, false); 
  const expenseAmtYoyChg = calculateChangeAndType(current.expense_amount, yoy?.expense_amount, false);
  const policyCntYoyChg = calculateChangeAndType(current.policy_count, yoy?.policy_count, true);

  const lossRatioYoyChg = calculateChangeAndType(current.loss_ratio, yoy?.loss_ratio, false);
  const expenseRatioYoyChg = calculateChangeAndType(current.expense_ratio, yoy?.expense_ratio, false);
  const varCostRatioYoyChg = calculateChangeAndType(current.variable_cost_ratio, yoy?.variable_cost_ratio, false);
  const premEarnRatioYoyChg = calculateChangeAndType(current.premium_earned_ratio, yoy?.premium_earned_ratio, true);
  const claimFreqYoyChg = calculateChangeAndType(current.claim_frequency, yoy?.claim_frequency, false);
  const avgPremPolYoyChg = calculateChangeAndType(current.avg_premium_per_policy, yoy?.avg_premium_per_policy, true);
  const avgLossCaseYoyChg = calculateChangeAndType(current.avg_loss_per_case, yoy?.avg_loss_per_case, false);

  const marginalContribAmtYoyChg = calculateChangeAndType(current.marginal_contribution_amount, yoy?.marginal_contribution_amount, true);
  const marginalContribRatioYoyChg = calculateChangeAndType(current.marginal_contribution_ratio, yoy?.marginal_contribution_ratio, true);
  
  const kpis: Kpi[] = [
    { // 边际贡献率 (综合类) - Higher is better
      id: 'marginal_contribution_ratio', title: '边际贡献率', value: formatPercentage(current.marginal_contribution_ratio), rawValue: current.marginal_contribution_ratio,
      ...formatChange(marginalContribRatioMomChg, '%', true, true),
      yoyChange: formatChange(marginalContribRatioYoyChg, '%', true, true).change, yoyChangeAbsolute: formatChange(marginalContribRatioYoyChg, '%', true, true).changeAbsolute, yoyChangeType: formatChange(marginalContribRatioYoyChg, '%', true, true).changeType,
      icon: Ratio,
    },
    { // 变动成本率 (综合类) - Lower is better
      id: 'variable_cost_ratio', title: '变动成本率', value: formatPercentage(current.variable_cost_ratio), rawValue: current.variable_cost_ratio,
      ...formatChange(varCostRatioMomChg, '%', false, true),
      yoyChange: formatChange(varCostRatioYoyChg, '%', false, true).change, yoyChangeAbsolute: formatChange(varCostRatioYoyChg, '%', false, true).changeAbsolute, yoyChangeType: formatChange(varCostRatioYoyChg, '%', false, true).changeType,
      icon: Zap, isBorderRisk: current.variable_cost_ratio !== undefined && current.variable_cost_ratio > 90,
    },
    { // 费用率 (费用类) - Lower is better
      id: 'expense_ratio', title: '费用率', value: formatPercentage(current.expense_ratio), rawValue: current.expense_ratio,
      ...formatChange(expenseRatioMomChg, '%', false, true),
      yoyChange: formatChange(expenseRatioYoyChg, '%', false, true).change, yoyChangeAbsolute: formatChange(expenseRatioYoyChg, '%', false, true).changeAbsolute, yoyChangeType: formatChange(expenseRatioYoyChg, '%', false, true).changeType,
      icon: Briefcase, isOrangeRisk: current.expense_ratio !== undefined && current.expense_ratio > 14.5,
    },
    { // 满期赔付率 (赔付类) - Lower is better
      id: 'loss_ratio', title: '满期赔付率', value: formatPercentage(current.loss_ratio), rawValue: current.loss_ratio,
      ...formatChange(lossRatioMomChg, '%', false, true),
      yoyChange: formatChange(lossRatioYoyChg, '%', false, true).change, yoyChangeAbsolute: formatChange(lossRatioYoyChg, '%', false, true).changeAbsolute, yoyChangeType: formatChange(lossRatioYoyChg, '%', false, true).changeType,
      icon: Percent, isRisk: current.loss_ratio !== undefined && current.loss_ratio > 70, description: "基于已报告赔款",
    },
    { // 边贡额 (综合类) - Higher is better
      id: 'marginal_contribution_amount', title: '边贡额', value: formatCurrency(current.marginal_contribution_amount), rawValue: current.marginal_contribution_amount,
      ...formatChange(marginalContribAmtMomChg, '万元', true, false),
      yoyChange: formatChange(marginalContribAmtYoyChg, '万元', true, false).change, yoyChangeAbsolute: formatChange(marginalContribAmtYoyChg, '万元', true, false).changeAbsolute, yoyChangeType: formatChange(marginalContribAmtYoyChg, '万元', true, false).changeType,
      icon: Landmark,
    },
    { // 跟单保费 (保费类) - Higher is better
      id: 'premium_written', title: '保费', value: formatCurrency(current.premium_written), rawValue: current.premium_written,
      ...formatChange(premWrittenMomChg, '万元', true, false),
      yoyChange: formatChange(premWrittenYoyChg, '万元', true, false).change, yoyChangeAbsolute: formatChange(premWrittenYoyChg, '万元', true, false).changeAbsolute, yoyChangeType: formatChange(premWrittenYoyChg, '万元', true, false).changeType,
      icon: DollarSign,
    },
    { // 费用(额) (费用类) - Lower is better
      id: 'expense_amount', title: '费用', value: formatCurrency(current.expense_amount), rawValue: current.expense_amount,
      ...formatChange(expenseAmtMomChg, '万元', false, false),
      yoyChange: formatChange(expenseAmtYoyChg, '万元', false, false).change, yoyChangeAbsolute: formatChange(expenseAmtYoyChg, '万元', false, false).changeAbsolute, yoyChangeType: formatChange(expenseAmtYoyChg, '万元', false, false).changeType,
      icon: Briefcase, // Using briefcase as a general expense icon
    },
    { // 总赔款 (赔付类) - Lower is better
      id: 'total_loss_amount', title: '赔款', value: formatCurrency(current.total_loss_amount), rawValue: current.total_loss_amount,
      ...formatChange(lossAmtMomChg, '万元', false, false),
      yoyChange: formatChange(lossAmtYoyChg, '万元', false, false).change, yoyChangeAbsolute: formatChange(lossAmtYoyChg, '万元', false, false).changeAbsolute, yoyChangeType: formatChange(lossAmtYoyChg, '万元', false, false).changeType,
      icon: ShieldCheck,
    },
    { // 满期保费 (保费类) - Higher is better
      id: 'premium_earned', title: '满期保费', value: formatCurrency(current.premium_earned), rawValue: current.premium_earned,
      ...formatChange(premEarnedMomChg, '万元', true, false),
      yoyChange: formatChange(premEarnedYoyChg, '万元', true, false).change, yoyChangeAbsolute: formatChange(premEarnedYoyChg, '万元', true, false).changeAbsolute, yoyChangeType: formatChange(premEarnedYoyChg, '万元', true, false).changeType,
      icon: DollarSign, // Using DollarSign, can be differentiated if needed
    },
    { // 保费满期率 (保费类) - Higher is better
      id: 'premium_earned_ratio', title: '保费满期率', value: formatPercentage(current.premium_earned_ratio), rawValue: current.premium_earned_ratio,
       ...formatChange(premEarnRatioMomChg, '%', true, true),
      yoyChange: formatChange(premEarnRatioYoyChg, '%', true, true).change, yoyChangeAbsolute: formatChange(premEarnRatioYoyChg, '%', true, true).changeAbsolute, yoyChangeType: formatChange(premEarnRatioYoyChg, '%', true, true).changeType,
      icon: Ratio,
    },
    { // 单均保费 (保费类) - Generally, higher is better but context dependent
      id: 'avg_premium_per_policy', title: '单均保费', value: formatCurrency(current.avg_premium_per_policy, '元'), rawValue: current.avg_premium_per_policy,
       ...formatChange(avgPremPolMomChg, '元', true, false), 
      yoyChange: formatChange(avgPremPolYoyChg, '元', true, false).change, yoyChangeAbsolute: formatChange(avgPremPolYoyChg, '元', true, false).changeAbsolute, yoyChangeType: formatChange(avgPremPolYoyChg, '元', true, false).changeType,
      icon: FileText,
    },
    { // 保单数量 (保单类) - Higher is better
      id: 'policy_count', title: '保单件数', value: formatNumber(current.policy_count), rawValue: current.policy_count,
      ...formatChange(policyCntMomChg, '件', true, false),
      yoyChange: formatChange(policyCntYoyChg, '件', true, false).change, yoyChangeAbsolute: formatChange(policyCntYoyChg, '件', true, false).changeAbsolute, yoyChangeType: formatChange(policyCntYoyChg, '件', true, false).changeType,
      icon: FileText,
    },
    { // 保费占比 (占比类) - Context dependent, no direct good/bad change
      id: 'premium_share', title: '保费占比', value: formatPercentage(data.premium_share), rawValue: data.premium_share,
      // MoM/YoY for share is complex, depends on overall market change. For now, no change shown.
      change: undefined, changeAbsolute: undefined, changeType: 'neutral', 
      yoyChange: undefined, yoyChangeAbsolute: undefined, yoyChangeType: 'neutral',
      icon: Users,
    },
    { // 自主系数 (综合类) - Context dependent (closer to 1 might be target), no aggregation.
      id: 'avg_commercial_index', title: '自主系数', 
      value: current.avg_commercial_index !== undefined && current.avg_commercial_index !== null ? current.avg_commercial_index.toFixed(4) : "N/A", 
      rawValue: current.avg_commercial_index,
      // Change for avg_commercial_index is tricky as it's not summed. 
      // Displaying change for "合计" might be misleading if it's based on non-aggregated values.
      // For now, no change for '合计' view, can be added for single line view if needed.
      change: undefined, changeAbsolute: undefined, changeType: 'neutral',
      yoyChange: undefined, yoyChangeAbsolute: undefined, yoyChangeType: 'neutral',
      icon: Search,
    },
    { // 满期出险率 (赔付类) - Lower is better
      id: 'claim_frequency', title: '满期出险率', value: formatPercentage(current.claim_frequency), rawValue: current.claim_frequency,
      ...formatChange(claimFreqMomChg, '%', false, true),
      yoyChange: formatChange(claimFreqYoyChg, '%', false, true).change, yoyChangeAbsolute: formatChange(claimFreqYoyChg, '%', false, true).changeAbsolute, yoyChangeType: formatChange(claimFreqYoyChg, '%', false, true).changeType,
      icon: Activity,
    },
    { // 案均赔款 (赔付类) - Lower is better
      id: 'avg_loss_per_case', title: '案均赔款', value: formatCurrency(current.avg_loss_per_case, '元'), rawValue: current.avg_loss_per_case,
      ...formatChange(avgLossCaseMomChg, '元', false, false), 
      yoyChange: formatChange(avgLossCaseYoyChg, '元', false, false).change, yoyChangeAbsolute: formatChange(avgLossCaseYoyChg, '元', false, false).changeAbsolute, yoyChangeType: formatChange(avgLossCaseYoyChg, '元', false, false).changeType,
      icon: ShieldCheck,
    },
  ];
  
  return kpis;
};

export function exportToCSV(data: ProcessedDataForPeriod[], analysisMode: AnalysisMode, fileName: string = "车险数据导出.csv") {
    if (!data || data.length === 0) {
        console.warn("No data to export.");
        return;
    }

    const headers = [
        "业务线ID", "业务线名称",
        "跟单保费(万元)", "满期保费(万元)", "总赔款(万元)", "费用(额)(万元)",
        "保单数量(件)", "赔案数量(件)", "满期保单(件)",
        "单均保费(元)", "案均赔款(元)", "自主系数",
        "满期赔付率(%)", "费用率(%)", "变动成本率(%)", "保费满期率(%)", "满期出险率(%)",
        "边际贡献率(%)", "边贡额(万元)", "保费占比(%)"
    ];

    if (analysisMode === 'periodOverPeriod') {
        const momHeaders = [
            "跟单保费环比(%)", "跟单保费环比绝对值(万元)",
            "总赔款环比(%)", "总赔款环比绝对值(万元)",
            "保单数量环比(%)", "保单数量环比绝对值(件)",
            "满期赔付率环比(pp)", "满期赔付率环比绝对值(pp)", // pp for percentage points
            "费用率环比(pp)", "费用率环比绝对值(pp)"
        ];
        headers.push(...momHeaders);
    }
    
    const rows = data.map(item => {
        const current = item.currentMetrics;
        const mom = item.momMetrics;
        
        const row = [
            item.businessLineId, item.businessLineName,
            current.premium_written.toFixed(2), current.premium_earned.toFixed(2), current.total_loss_amount.toFixed(2), current.expense_amount.toFixed(2),
            Math.round(current.policy_count), Math.round(current.claim_count), Math.round(current.policy_count_earned),
            current.avg_premium_per_policy.toFixed(0), current.avg_loss_per_case.toFixed(0), current.avg_commercial_index?.toFixed(4) || "N/A",
            current.loss_ratio.toFixed(2), current.expense_ratio.toFixed(2), current.variable_cost_ratio.toFixed(2), current.premium_earned_ratio.toFixed(2), current.claim_frequency.toFixed(2),
            current.marginal_contribution_ratio.toFixed(2), current.marginal_contribution_amount.toFixed(2), item.premium_share?.toFixed(2) || "N/A"
        ];

        if (analysisMode === 'periodOverPeriod' && mom) {
            const premWrittenChange = calculateChangeAndType(current.premium_written, mom.premium_written);
            const lossAmtChange = calculateChangeAndType(current.total_loss_amount, mom.total_loss_amount);
            const policyCntChange = calculateChangeAndType(current.policy_count, mom.policy_count);
            const lossRatioChange = calculateChangeAndType(current.loss_ratio, mom.loss_ratio);
            const expenseRatioChange = calculateChangeAndType(current.expense_ratio, mom.expense_ratio);

            row.push(
                premWrittenChange.percent?.toFixed(2) || "N/A", premWrittenChange.absolute?.toFixed(2) || "N/A",
                lossAmtChange.percent?.toFixed(2) || "N/A", lossAmtChange.absolute?.toFixed(2) || "N/A",
                policyCntChange.percent?.toFixed(2) || "N/A", Math.round(policyCntChange.absolute || 0).toString(),
                lossRatioChange.percent?.toFixed(2) || "N/A", lossRatioChange.absolute?.toFixed(2) || "N/A",
                expenseRatioChange.percent?.toFixed(2) || "N/A", expenseRatioChange.absolute?.toFixed(2) || "N/A"
            );
        } else if (analysisMode === 'periodOverPeriod') {
             row.push(...Array(10).fill("N/A")); // Push N/A for MoM columns if no mom data
        }
        return row.join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // \uFEFF for BOM to ensure Excel opens UTF-8 correctly
        + headers.join(",") + "\n"
        + rows.join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link); 
    link.click();
    document.body.removeChild(link);
}

    