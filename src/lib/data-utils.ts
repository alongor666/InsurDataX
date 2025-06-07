
import type { ProcessedDataForPeriod, Kpi, V4PeriodData, V4BusinessDataEntry, V4PeriodTotals, AggregatedBusinessMetrics, AnalysisMode, PeriodOption } from '@/data/types';

// Helper to define formatting rules for each metric ID
type MetricFormatType = 'percentage' | 'decimal_3' | 'integer_yuan' | 'integer_wanyuan' | 'integer_count' | 'integer_generic';

interface MetricFormatRule {
  type: MetricFormatType;
}

const METRIC_FORMAT_RULES: Record<string, MetricFormatRule> = {
  'loss_ratio': { type: 'percentage' },
  'expense_ratio': { type: 'percentage' },
  'variable_cost_ratio': { type: 'percentage' },
  'premium_earned_ratio': { type: 'percentage' },
  'claim_frequency': { type: 'percentage' },
  'marginal_contribution_ratio': { type: 'percentage' },
  'premium_share': { type: 'percentage' },
  'avg_commercial_index': { type: 'decimal_3' },
  'avg_premium_per_policy': { type: 'integer_yuan' },
  'avg_loss_per_case': { type: 'integer_yuan' },
  'premium_written': { type: 'integer_wanyuan' },
  'premium_earned': { type: 'integer_wanyuan' },
  'total_loss_amount': { type: 'integer_wanyuan' },
  'expense_amount': { type: 'integer_wanyuan' },
  'marginal_contribution_amount': { type: 'integer_wanyuan' },
  'policy_count': { type: 'integer_count' },
  'claim_count': { type: 'integer_count' },
  'policy_count_earned': { type: 'integer_count' },
};

export const formatDisplayValue = (
  rawValue: number | undefined | null,
  metricId: string
): string => {
  if (rawValue === undefined || rawValue === null || isNaN(rawValue)) {
    return '-';
  }

  const rule = METRIC_FORMAT_RULES[metricId];

  if (!rule) {
    return new Intl.NumberFormat('zh-CN').format(Math.round(rawValue));
  }

  switch (rule.type) {
    case 'percentage':
      return `${rawValue.toFixed(1)}%`;
    case 'decimal_3':
      return rawValue.toFixed(3);
    case 'integer_yuan':
    case 'integer_wanyuan':
    case 'integer_count':
    case 'integer_generic':
      return new Intl.NumberFormat('zh-CN').format(Math.round(rawValue));
    default:
      return new Intl.NumberFormat('zh-CN').format(Math.round(rawValue));
  }
};

export const getDynamicColorByVCR = (vcr: number | undefined | null): string => {
  if (vcr === undefined || vcr === null || isNaN(vcr)) return 'hsl(var(--muted))';

  const greenHue = 130, greenSat = 60;
  const blueHue = 205, blueSat = 70;
  const redHue = 0, redSat = 75;

  const L_deep = 35;
  const L_light = 60;

  let hue, sat, light;

  if (vcr < 88) {
    hue = greenHue; sat = greenSat;
    const vcr_green_lower_bound = 60;
    const vcr_green_upper_bound = 87.99;
    const normalizedVcr = Math.max(0, Math.min(1, (vcr - vcr_green_lower_bound) / (vcr_green_upper_bound - vcr_green_lower_bound)));
    light = L_deep + (1 - normalizedVcr) * (L_light - L_deep);
  } else if (vcr >= 88 && vcr < 92) {
    hue = blueHue; sat = blueSat;
    const vcr_blue_lower_bound = 88;
    const vcr_blue_upper_bound = 91.99;
    const normalizedVcr = Math.max(0, Math.min(1, (vcr - vcr_blue_lower_bound) / (vcr_blue_upper_bound - vcr_blue_lower_bound)));
    light = L_deep + (1-normalizedVcr) * (L_light - L_deep);
  } else {
    hue = redHue; sat = redSat;
    const vcr_red_lower_bound = 92;
    const vcr_red_upper_bound = 130;
    const normalizedVcr = Math.max(0, Math.min(1, (vcr - vcr_red_lower_bound) / (vcr_red_upper_bound - vcr_red_lower_bound)));
    light = L_deep + normalizedVcr * (L_light - L_deep);
  }

  light = Math.round(Math.max(L_deep - 5, Math.min(L_light + 5, light)));

  return `hsl(${hue}, ${sat}%, ${light}%)`;
};

const calculateBaseMetricsForSingleEntry = (entry: V4BusinessDataEntry, isPopMode: boolean = false): AggregatedBusinessMetrics => {
  const premium_written = entry.premium_written || 0;
  const premium_earned = entry.premium_earned || 0;
  const total_loss_amount = entry.total_loss_amount || 0;
  const expense_amount_raw = entry.expense_amount_raw || 0;
  const claim_count_raw = entry.claim_count || 0;
  const policy_count_earned_raw = entry.policy_count_earned || 0;

  const avg_premium_per_policy_json_ytd = entry.avg_premium_per_policy;

  const policy_count = (avg_premium_per_policy_json_ytd && avg_premium_per_policy_json_ytd !== 0 && premium_written !==0)
    ? (premium_written * 10000) / avg_premium_per_policy_json_ytd
    : 0;

  const loss_ratio_calc = premium_earned !== 0 ? (total_loss_amount / premium_earned) * 100 : 0;
  const expense_ratio_calc = premium_written !== 0 ? (expense_amount_raw / premium_written) * 100 : 0;
  
  // VCR = ER + LR
  const variable_cost_ratio_calc = expense_ratio_calc + loss_ratio_calc;
  // MCR = 100% - VCR
  const marginal_contribution_ratio_calc = 100 - variable_cost_ratio_calc;
  // MCA = PE * MCR
  const marginal_contribution_amount_calc = premium_earned * (marginal_contribution_ratio_calc / 100);

  const premium_earned_ratio_calc = premium_written !== 0 ? (premium_earned / premium_written) * 100 : 0;
  const claim_frequency_calc = policy_count_earned_raw !== 0 ? (claim_count_raw / policy_count_earned_raw) * 100 : 0;
  const avg_loss_per_case_calc = claim_count_raw !== 0 ? (total_loss_amount * 10000) / claim_count_raw : 0;
  const avg_premium_per_policy_recalc = policy_count !== 0 ? (premium_written * 10000) / policy_count : 0;
  const expense_amount_calc = premium_written * (expense_ratio_calc / 100);

  return {
    premium_written,
    premium_earned,
    total_loss_amount,
    expense_amount_raw,
    policy_count: Math.round(policy_count),
    claim_count: Math.round(claim_count_raw),
    policy_count_earned: Math.round(policy_count_earned_raw),
    avg_commercial_index: entry.avg_commercial_index,
    
    loss_ratio: loss_ratio_calc,
    expense_ratio: expense_ratio_calc,
    variable_cost_ratio: variable_cost_ratio_calc,
    
    premium_earned_ratio: premium_earned_ratio_calc,
    claim_frequency: claim_frequency_calc,
    avg_premium_per_policy: avg_premium_per_policy_recalc,
    avg_loss_per_case: avg_loss_per_case_calc,
    expense_amount: expense_amount_calc,
    
    marginal_contribution_ratio: marginal_contribution_ratio_calc,
    marginal_contribution_amount: marginal_contribution_amount_calc,
  };
};

export const aggregateAndCalculateMetrics = (
  periodBusinessDataEntries: V4BusinessDataEntry[],
  analysisMode: AnalysisMode,
  originalYtdEntriesForPeriod: V4BusinessDataEntry[], // All original entries for the current period
  previousPeriodYtdEntries?: V4BusinessDataEntry[] // All original entries for the previous period (for PoP)
): AggregatedBusinessMetrics => {

  let dataToProcess: V4BusinessDataEntry[] = periodBusinessDataEntries;
  // For PoP mode, calculate period-over-period values for base amounts first
  if (analysisMode === 'periodOverPeriod' && previousPeriodYtdEntries) {
    dataToProcess = periodBusinessDataEntries.map(currentYtdEntry => {
      const prevYtdEntry = previousPeriodYtdEntries.find(pe => pe.business_type === currentYtdEntry.business_type);
      const originalCurrentYtdEntryForPoP = originalYtdEntriesForPeriod.find(e => e.business_type === currentYtdEntry.business_type) || currentYtdEntry;

      return {
        ...currentYtdEntry,
        premium_written: (currentYtdEntry.premium_written || 0) - (prevYtdEntry?.premium_written || 0),
        premium_earned: (currentYtdEntry.premium_earned || 0) - (prevYtdEntry?.premium_earned || 0),
        total_loss_amount: (currentYtdEntry.total_loss_amount || 0) - (prevYtdEntry?.total_loss_amount || 0),
        expense_amount_raw: (currentYtdEntry.expense_amount_raw || 0) - (prevYtdEntry?.expense_amount_raw || 0),
        claim_count: (currentYtdEntry.claim_count || 0) - (prevYtdEntry?.claim_count || 0),
        policy_count_earned: (currentYtdEntry.policy_count_earned || 0) - (prevYtdEntry?.policy_count_earned || 0),
        avg_premium_per_policy: originalCurrentYtdEntryForPoP.avg_premium_per_policy, // Use YTD for policy count derivation
        // Nullify pre-calculated rates as they need re-computation for PoP
        loss_ratio: null, expense_ratio: null, variable_cost_ratio: null, premium_earned_ratio: null, claim_frequency: null, avg_loss_per_case: null,
      };
    });
  }

  // Handle single business type in cumulative mode (prioritize JSON values if valid)
  if (periodBusinessDataEntries.length === 1 && analysisMode === 'cumulative') {
    const singleEntry = periodBusinessDataEntries[0];
    const originalJsonEntry = originalYtdEntriesForPeriod.find(e => e.business_type === singleEntry.business_type) || singleEntry;
    const useJsonValues = true; // Flag to control usage of JSON pre-calculated values

    const calculatedBase = calculateBaseMetricsForSingleEntry(originalJsonEntry, false);

    const single_premium_written = typeof originalJsonEntry.premium_written === 'number' ? originalJsonEntry.premium_written : calculatedBase.premium_written;
    const single_premium_earned = typeof originalJsonEntry.premium_earned === 'number' ? originalJsonEntry.premium_earned : calculatedBase.premium_earned;
    const single_total_loss_amount = typeof originalJsonEntry.total_loss_amount === 'number' ? originalJsonEntry.total_loss_amount : calculatedBase.total_loss_amount;
    const single_expense_amount_raw = typeof originalJsonEntry.expense_amount_raw === 'number' ? originalJsonEntry.expense_amount_raw : calculatedBase.expense_amount_raw;
    const single_policy_count = calculatedBase.policy_count; // Always derive policy count
    const single_claim_count = typeof originalJsonEntry.claim_count === 'number' ? Math.round(originalJsonEntry.claim_count) : calculatedBase.claim_count;
    const single_policy_count_earned = typeof originalJsonEntry.policy_count_earned === 'number' ? Math.round(originalJsonEntry.policy_count_earned) : calculatedBase.policy_count_earned;
    
    // Expense Ratio (based on premium_written)
    const single_er = (typeof originalJsonEntry.expense_ratio === 'number' && !isNaN(originalJsonEntry.expense_ratio) && useJsonValues)
      ? originalJsonEntry.expense_ratio
      : (single_premium_written !== 0 ? (single_expense_amount_raw / single_premium_written) * 100 : 0);

    // Loss Ratio (based on premium_earned)
    const single_lr = (typeof originalJsonEntry.loss_ratio === 'number' && !isNaN(originalJsonEntry.loss_ratio) && useJsonValues)
      ? originalJsonEntry.loss_ratio
      : (single_premium_earned !== 0 ? (single_total_loss_amount / single_premium_earned) * 100 : 0);
    
    // Variable Cost Ratio = ER + LR
    const single_vcr = single_er + single_lr;
    // Marginal Contribution Ratio = 100% - VCR
    const single_mcr = 100 - single_vcr;
    // Marginal Contribution Amount = Premium Earned * MCR
    const single_mca = single_premium_earned * (single_mcr / 100);

    const single_premium_earned_ratio = (typeof originalJsonEntry.premium_earned_ratio === 'number' && !isNaN(originalJsonEntry.premium_earned_ratio) && useJsonValues)
      ? originalJsonEntry.premium_earned_ratio
      : (single_premium_written !== 0 ? (single_premium_earned / single_premium_written) * 100 : 0);

    const single_claim_frequency = (typeof originalJsonEntry.claim_frequency === 'number' && !isNaN(originalJsonEntry.claim_frequency) && useJsonValues)
      ? originalJsonEntry.claim_frequency
      : (single_policy_count_earned !== 0 ? (single_claim_count / single_policy_count_earned) * 100 : 0);
    
    const single_avg_premium_per_policy = (typeof originalJsonEntry.avg_premium_per_policy === 'number' && !isNaN(originalJsonEntry.avg_premium_per_policy) && useJsonValues)
      ? originalJsonEntry.avg_premium_per_policy
      : (single_policy_count !== 0 ? (single_premium_written * 10000) / single_policy_count : 0);
      
    const single_avg_loss_per_case = (typeof originalJsonEntry.avg_loss_per_case === 'number' && !isNaN(originalJsonEntry.avg_loss_per_case) && useJsonValues)
      ? originalJsonEntry.avg_loss_per_case
      : (single_claim_count !== 0 ? (single_total_loss_amount * 10000) / single_claim_count : 0);
      
    const single_expense_amount = single_premium_written * (single_er / 100);


    return {
      premium_written: single_premium_written,
      premium_earned: single_premium_earned,
      total_loss_amount: single_total_loss_amount,
      expense_amount_raw: single_expense_amount_raw,
      policy_count: single_policy_count,
      claim_count: single_claim_count,
      policy_count_earned: single_policy_count_earned,
      avg_commercial_index: typeof originalJsonEntry.avg_commercial_index === 'number' ? originalJsonEntry.avg_commercial_index : calculatedBase.avg_commercial_index,
      
      loss_ratio: single_lr,
      expense_ratio: single_er,
      variable_cost_ratio: single_vcr,
      
      premium_earned_ratio: single_premium_earned_ratio,
      claim_frequency: single_claim_frequency,
      avg_premium_per_policy: single_avg_premium_per_policy,
      avg_loss_per_case: single_avg_loss_per_case,
      expense_amount: single_expense_amount,
      
      marginal_contribution_ratio: single_mcr,
      marginal_contribution_amount: single_mca,
    };
  }

  // AGGREGATION LOGIC (multi-select, "全部业务" cumulative, or any PoP mode)
  const aggregatedSums = dataToProcess.reduce((acc, entry) => {
    acc.premium_written_sum += (entry.premium_written || 0);
    acc.premium_earned_sum += (entry.premium_earned || 0);
    acc.total_loss_amount_sum += (entry.total_loss_amount || 0);
    acc.expense_amount_raw_sum += (entry.expense_amount_raw || 0);
    acc.claim_count_sum += (entry.claim_count || 0);
    acc.policy_count_earned_sum += (entry.policy_count_earned || 0);
    
    // For policy_count derivation in aggregate, we need avg_premium_per_policy from original YTD if available
    // This is complex if mixing PoP and YTD concepts for policy count.
    // Sticking to deriving policy count based on YTD avg_premium_per_policy for consistency in how policy count is estimated.
    const originalEntryForPolicyDerivation = originalYtdEntriesForPeriod.find(o => o.business_type === entry.business_type) || entry;
    const tempMetricsForPolicyCount = calculateBaseMetricsForSingleEntry(originalEntryForPolicyDerivation, analysisMode === 'periodOverPeriod');
    acc.policy_count_derived_sum += tempMetricsForPolicyCount.policy_count;

    return acc;
  }, {
    premium_written_sum: 0, premium_earned_sum: 0, total_loss_amount_sum: 0, expense_amount_raw_sum: 0,
    claim_count_sum: 0, policy_count_earned_sum: 0, policy_count_derived_sum: 0
  });

  const agg_premium_written = aggregatedSums.premium_written_sum;
  const agg_premium_earned = aggregatedSums.premium_earned_sum;
  const agg_total_loss_amount = aggregatedSums.total_loss_amount_sum;
  const agg_expense_amount_raw = aggregatedSums.expense_amount_raw_sum;
  const agg_policy_count = Math.round(aggregatedSums.policy_count_derived_sum);
  const agg_claim_count = Math.round(aggregatedSums.claim_count_sum);
  const agg_policy_count_earned = Math.round(aggregatedSums.policy_count_earned_sum);

  // Expense Ratio (based on premium_written)
  const agg_expense_ratio = agg_premium_written !== 0 ? (agg_expense_amount_raw / agg_premium_written) * 100 : 0;

  // Loss Ratio (based on premium_earned)
  const agg_loss_ratio = agg_premium_earned !== 0 ? (agg_total_loss_amount / agg_premium_earned) * 100 : 0;
  
  // Variable Cost Ratio = ER + LR
  const agg_variable_cost_ratio = agg_expense_ratio + agg_loss_ratio;
  
  // Marginal Contribution Ratio = 100% - VCR
  const agg_marginal_contribution_ratio = 100 - agg_variable_cost_ratio;
  
  // Marginal Contribution Amount = Premium Earned * MCR
  const agg_marginal_contribution_amount = agg_premium_earned * (agg_marginal_contribution_ratio / 100);

  // Other aggregated metrics
  const agg_premium_earned_ratio = agg_premium_written !== 0 ? (agg_premium_earned / agg_premium_written) * 100 : 0;
  const agg_claim_frequency = agg_policy_count_earned !== 0 ? (agg_claim_count / agg_policy_count_earned) * 100 : 0;
  const agg_avg_premium_per_policy = agg_policy_count !== 0 ? (agg_premium_written * 10000) / agg_policy_count : 0;
  const agg_avg_loss_per_case = agg_claim_count !== 0 ? (agg_total_loss_amount * 10000) / agg_claim_count : 0;
  const agg_expense_amount = agg_premium_written * (agg_expense_ratio / 100); // Uses display ER

  return {
    premium_written: agg_premium_written,
    premium_earned: agg_premium_earned,
    total_loss_amount: agg_total_loss_amount,
    expense_amount_raw: agg_expense_amount_raw,
    policy_count: agg_policy_count,
    claim_count: agg_claim_count,
    policy_count_earned: agg_policy_count_earned,
    avg_commercial_index: undefined, // Not applicable for aggregated view

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

const filterRawBusinessData = (
  periodData: V4PeriodData | undefined,
  selectedTypes: string[]
): V4BusinessDataEntry[] => {
  if (!periodData?.business_data) return [];
  const individualLines = periodData.business_data.filter(
    bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total'
  );
  if (selectedTypes.length === 0) {
    return individualLines; // "全部业务" means all individual lines
  }
  return individualLines.filter(bd => selectedTypes.includes(bd.business_type));
};

export const processDataForSelectedPeriod = (
  allV4Data: V4PeriodData[],
  selectedPeriodId: string,
  selectedComparisonPeriodKey: string | null, 
  analysisMode: AnalysisMode,
  selectedBusinessTypes: string[]
): ProcessedDataForPeriod[] => {
  const currentPeriodData = allV4Data.find(p => p.period_id === selectedPeriodId);
  if (!currentPeriodData) return [];

  let momEquivalentPeriodData: V4PeriodData | undefined;
  let yoyEquivalentPeriodData: V4PeriodData | undefined;

  if (selectedComparisonPeriodKey) {
    momEquivalentPeriodData = allV4Data.find(p => p.period_id === selectedComparisonPeriodKey);
    yoyEquivalentPeriodData = undefined; 
  } else {
    const momPeriodId = currentPeriodData.comparison_period_id_mom;
    momEquivalentPeriodData = momPeriodId ? allV4Data.find(p => p.period_id === momPeriodId) : undefined;

    const yoyPeriodId = currentPeriodData.comparison_period_id_yoy;
    yoyEquivalentPeriodData = yoyPeriodId ? allV4Data.find(p => p.period_id === yoyPeriodId) : undefined;
  }

  const currentPeriodFilteredYtdEntries = filterRawBusinessData(currentPeriodData, selectedBusinessTypes);
  const originalYtdEntriesForCurrentPeriod = (currentPeriodData.business_data || []).filter(
    bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total'
  );

  const momPeriodFilteredYtdEntriesForPoPBase = momEquivalentPeriodData ? filterRawBusinessData(momEquivalentPeriodData, selectedBusinessTypes) : undefined;
  const originalYtdMomEntries = momEquivalentPeriodData ? (momEquivalentPeriodData.business_data || []).filter(
    bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total'
  ) : [];


  const currentAggregatedMetrics = aggregateAndCalculateMetrics(
    currentPeriodFilteredYtdEntries,
    analysisMode,
    originalYtdEntriesForCurrentPeriod, 
    analysisMode === 'periodOverPeriod' ? momPeriodFilteredYtdEntriesForPoPBase : undefined
  );

  const momAggregatedMetrics = momEquivalentPeriodData
    ? aggregateAndCalculateMetrics(
        filterRawBusinessData(momEquivalentPeriodData, selectedBusinessTypes), 
        'cumulative', 
        originalYtdMomEntries 
      )
    : null;

  const yoyAggregatedMetrics = yoyEquivalentPeriodData 
    ? aggregateAndCalculateMetrics(
        filterRawBusinessData(yoyEquivalentPeriodData, selectedBusinessTypes),
        'cumulative',
        (yoyEquivalentPeriodData.business_data || []).filter(bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total')
      )
    : null;

  let derivedBusinessLineName: string;
  const allAvailableBusinessTypesInCurrentPeriod = originalYtdEntriesForCurrentPeriod.map(bt => bt.business_type);

  if (selectedBusinessTypes.length === 1) {
    derivedBusinessLineName = selectedBusinessTypes[0];
  } else if (selectedBusinessTypes.length > 0 && selectedBusinessTypes.length < allAvailableBusinessTypesInCurrentPeriod.length) {
    derivedBusinessLineName = "自定义合计";
  } else { 
    derivedBusinessLineName = "合计";
  }
  const businessLineId = derivedBusinessLineName;

  const premium_share = (currentPeriodData.totals_for_period?.total_premium_written_overall && currentPeriodData.totals_for_period.total_premium_written_overall !== 0 && currentAggregatedMetrics.premium_written !== undefined)
    ? (currentAggregatedMetrics.premium_written / currentPeriodData.totals_for_period.total_premium_written_overall) * 100
    : 0;

  const processedEntry: ProcessedDataForPeriod = {
    businessLineId,
    businessLineName: derivedBusinessLineName,
    icon: derivedBusinessLineName === "合计" || derivedBusinessLineName === "自定义合计" ? 'Users' : 'ShieldCheck',
    currentMetrics: currentAggregatedMetrics,
    momMetrics: momAggregatedMetrics, 
    yoyMetrics: selectedComparisonPeriodKey ? null : yoyAggregatedMetrics, 
    premium_share: premium_share,
    vcr_color: getDynamicColorByVCR(currentAggregatedMetrics.variable_cost_ratio),
    premium_written: currentAggregatedMetrics.premium_written,
    total_loss_amount: currentAggregatedMetrics.total_loss_amount,
    policy_count: currentAggregatedMetrics.policy_count,
    loss_ratio: currentAggregatedMetrics.loss_ratio,
    expense_ratio: currentAggregatedMetrics.expense_ratio,
    variable_cost_ratio: currentAggregatedMetrics.variable_cost_ratio,
    premium_writtenChange: momAggregatedMetrics && momAggregatedMetrics.premium_written !== 0 && currentAggregatedMetrics.premium_written !== undefined ? (currentAggregatedMetrics.premium_written - momAggregatedMetrics.premium_written) / Math.abs(momAggregatedMetrics.premium_written) * 100 : (currentAggregatedMetrics.premium_written !== 0 && currentAggregatedMetrics.premium_written !== undefined ? Infinity : 0),
    total_loss_amountChange: momAggregatedMetrics && momAggregatedMetrics.total_loss_amount !== 0 && currentAggregatedMetrics.total_loss_amount !== undefined ? (currentAggregatedMetrics.total_loss_amount - momAggregatedMetrics.total_loss_amount) / Math.abs(momAggregatedMetrics.total_loss_amount) * 100 : (currentAggregatedMetrics.total_loss_amount !== 0 && currentAggregatedMetrics.total_loss_amount !== undefined ? Infinity : 0),
    policy_countChange: momAggregatedMetrics && momAggregatedMetrics.policy_count !== 0 && currentAggregatedMetrics.policy_count !== undefined ? (currentAggregatedMetrics.policy_count - momAggregatedMetrics.policy_count) / Math.abs(momAggregatedMetrics.policy_count) * 100 : (currentAggregatedMetrics.policy_count !== 0 && currentAggregatedMetrics.policy_count !== undefined ? Infinity : 0),
    loss_ratioChange: momAggregatedMetrics && currentAggregatedMetrics.loss_ratio !== undefined && momAggregatedMetrics.loss_ratio !== undefined ? currentAggregatedMetrics.loss_ratio - momAggregatedMetrics.loss_ratio : undefined,
    expense_ratioChange: momAggregatedMetrics && currentAggregatedMetrics.expense_ratio !== undefined && momAggregatedMetrics.expense_ratio !== undefined ? currentAggregatedMetrics.expense_ratio - momAggregatedMetrics.expense_ratio : undefined,
  };

  return [processedEntry];
};

export function calculateChangeAndType (current?: number | null, previous?: number | null, higherIsBetter: boolean = true): { percent?: number, absolute?: number, type: Kpi['primaryChangeType'] } {
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

  let type: Kpi['primaryChangeType'] = 'neutral';
  const epsilon = 0.00001; 
  if (absolute > epsilon) type = higherIsBetter ? 'positive' : 'negative';
  if (absolute < -epsilon) type = higherIsBetter ? 'negative' : 'positive';

  return { percent, absolute, type };
};

const formatKpiChangeValues = (
    changeResult: { percent?: number, absolute?: number, type: Kpi['primaryChangeType'] },
    metricIdForAbsFormat: string,
    isRateChange: boolean = false, 
    valueHigherIsBetterForColor: boolean = true 
) => {
    let changePercentStr, changeAbsStr;

    if (changeResult.percent !== undefined && isFinite(changeResult.percent)) {
        changePercentStr = `${changeResult.percent.toFixed(1)}%`;
    } else if (changeResult.percent === Infinity) {
        changePercentStr = "+∞%";
    } else if (changeResult.percent === -Infinity) {
        changePercentStr = "-∞%";
    }

    if (changeResult.absolute !== undefined) {
        if (isRateChange) { 
            changeAbsStr = `${changeResult.absolute.toFixed(1)} pp`;
        } else {
            const formattedAbs = formatDisplayValue(Math.abs(changeResult.absolute), metricIdForAbsFormat);
            if (changeResult.absolute > 0.00001) changeAbsStr = `+${formattedAbs}`;
            else if (changeResult.absolute < -0.00001) changeAbsStr = `-${formattedAbs}`;
            else changeAbsStr = formattedAbs; 
        }
    }
    
    let effectiveChangeType = changeResult.type; 
    if (changeResult.absolute !== undefined) {
        const epsilon = 0.00001; 
        if (Math.abs(changeResult.absolute) > epsilon) { 
             if (changeResult.absolute > 0) { 
                effectiveChangeType = valueHigherIsBetterForColor ? 'positive' : 'negative';
             } else { 
                effectiveChangeType = valueHigherIsBetterForColor ? 'negative' : 'positive';
             }
        } else {
            effectiveChangeType = 'neutral';
        }
    }

    return { change: changePercentStr, changeAbsolute: changeAbsStr, type: effectiveChangeType };
};


export const calculateKpis = (
  processedData: ProcessedDataForPeriod[],
  overallTotalsForPeriod: V4PeriodTotals | undefined | null,
  analysisMode: AnalysisMode,
  selectedBusinessTypes: string[],
  activePeriodId: string,
  selectedComparisonPeriodKey: string | null, 
  allPeriodOptions: PeriodOption[] 
): Kpi[] => {
  if (!activePeriodId) {
    console.error("calculateKpis: activePeriodId is required but was not provided.");
    return [];
  }
  if (!processedData || processedData.length === 0) return [];

  const data = processedData[0];
  const current = data.currentMetrics;
  const primaryComparisonMetrics = data.momMetrics; 
  const secondaryComparisonMetrics = selectedComparisonPeriodKey ? null : data.yoyMetrics; 

  if (!current) return [];

  let primaryComparisonLabel = "环比";
  if (selectedComparisonPeriodKey) {
    const compPeriodLabel = allPeriodOptions.find(p => p.value === selectedComparisonPeriodKey)?.label;
    primaryComparisonLabel = compPeriodLabel ? `对比 ${compPeriodLabel}` : "对比所选周期";
  }
  const secondaryComparisonLabel = selectedComparisonPeriodKey ? undefined : "同比";


  const createKpiComparisonFields = (
    currentValue: number | undefined | null,
    comparisonValue: number | undefined | null,
    metricId: string,
    valueHigherIsBetter: boolean,
    isRateMetric: boolean 
  ): { change?: string; changeAbsolute?: string; type: Kpi['primaryChangeType'] } => {
    if (metricId === 'avg_commercial_index' && !(selectedBusinessTypes && selectedBusinessTypes.length === 1)) {
      return { type: 'neutral' }; 
    }
    const changeDetails = calculateChangeAndType(currentValue, comparisonValue, valueHigherIsBetter);
    const formattedChanges = formatKpiChangeValues(changeDetails, metricId, isRateMetric, valueHigherIsBetter);
    return { change: formattedChanges.change, changeAbsolute: formattedChanges.changeAbsolute, type: formattedChanges.type };
  };


  let premWrittenIsGrowthGood = true;
  if (current.variable_cost_ratio !== undefined && current.variable_cost_ratio >= 92) {
      premWrittenIsGrowthGood = false;
  }
  const primaryPremWrittenChanges = createKpiComparisonFields(current.premium_written, primaryComparisonMetrics?.premium_written, 'premium_written', premWrittenIsGrowthGood, false);
  const secondaryPremWrittenChanges = secondaryComparisonMetrics
    ? createKpiComparisonFields(current.premium_written, secondaryComparisonMetrics?.premium_written, 'premium_written', premWrittenIsGrowthGood, false)
    : { type: 'neutral' as Kpi['primaryChangeType']};


  let rawAvgCommercialIndex: number | undefined | null = undefined;
  if (selectedBusinessTypes && selectedBusinessTypes.length === 1 && analysisMode === 'cumulative') {
      const currentV4PeriodDataGlobal = (globalThis as any).allV4DataForKpiWorkaround?.find((p: V4PeriodData) => p.period_id === activePeriodId);
      if (currentV4PeriodDataGlobal) {
          const singleLineJsonEntry = currentV4PeriodDataGlobal.business_data.find((bd: V4BusinessDataEntry) => bd.business_type === selectedBusinessTypes[0]);
          if (singleLineJsonEntry?.avg_commercial_index !== undefined && singleLineJsonEntry.avg_commercial_index !== null && !isNaN(singleLineJsonEntry.avg_commercial_index)) {
              rawAvgCommercialIndex = singleLineJsonEntry.avg_commercial_index;
          } else if (current.avg_commercial_index !== undefined && current.avg_commercial_index !== null){ 
              rawAvgCommercialIndex = current.avg_commercial_index;
          }
      } else if (current.avg_commercial_index !== undefined && current.avg_commercial_index !== null) {
         rawAvgCommercialIndex = current.avg_commercial_index;
      }
  } else if (current.avg_commercial_index !== undefined && current.avg_commercial_index !== null && selectedBusinessTypes.length === 0 && analysisMode === 'cumulative'){
     rawAvgCommercialIndex = current.avg_commercial_index; 
  }


  const kpis: Kpi[] = [
    {
      id: 'marginal_contribution_ratio', title: '边际贡献率', value: formatDisplayValue(current.marginal_contribution_ratio, 'marginal_contribution_ratio'), rawValue: current.marginal_contribution_ratio, icon: 'Ratio',
      primaryComparisonLabel, ...createKpiComparisonFields(current.marginal_contribution_ratio, primaryComparisonMetrics?.marginal_contribution_ratio, 'marginal_contribution_ratio', true, true),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.marginal_contribution_ratio, secondaryComparisonMetrics.marginal_contribution_ratio, 'marginal_contribution_ratio', true, true) : {}),
    },
    {
      id: 'variable_cost_ratio', title: '变动成本率', value: formatDisplayValue(current.variable_cost_ratio, 'variable_cost_ratio'), rawValue: current.variable_cost_ratio, icon: 'Zap', isBorderRisk: current.variable_cost_ratio !== undefined && current.variable_cost_ratio >= 90,
      primaryComparisonLabel, ...createKpiComparisonFields(current.variable_cost_ratio, primaryComparisonMetrics?.variable_cost_ratio, 'variable_cost_ratio', false, true),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.variable_cost_ratio, secondaryComparisonMetrics.variable_cost_ratio, 'variable_cost_ratio', false, true) : {}),
    },
    {
      id: 'expense_ratio', title: '费用率', value: formatDisplayValue(current.expense_ratio, 'expense_ratio'), rawValue: current.expense_ratio, icon: 'Percent', isOrangeRisk: current.expense_ratio !== undefined && current.expense_ratio > 14.5,
      primaryComparisonLabel, ...createKpiComparisonFields(current.expense_ratio, primaryComparisonMetrics?.expense_ratio, 'expense_ratio', false, true),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.expense_ratio, secondaryComparisonMetrics.expense_ratio, 'expense_ratio', false, true) : {}),
    },
    {
      id: 'loss_ratio', title: '满期赔付率', value: formatDisplayValue(current.loss_ratio, 'loss_ratio'), rawValue: current.loss_ratio, icon: 'ShieldCheck', isRisk: current.loss_ratio !== undefined && current.loss_ratio > 70, description: "基于已报告赔款",
      primaryComparisonLabel, ...createKpiComparisonFields(current.loss_ratio, primaryComparisonMetrics?.loss_ratio, 'loss_ratio', false, true),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.loss_ratio, secondaryComparisonMetrics.loss_ratio, 'loss_ratio', false, true) : {}),
    },
    {
      id: 'marginal_contribution_amount', title: '边贡额', value: formatDisplayValue(current.marginal_contribution_amount, 'marginal_contribution_amount'), rawValue: current.marginal_contribution_amount, icon: 'Landmark',
      primaryComparisonLabel, ...createKpiComparisonFields(current.marginal_contribution_amount, primaryComparisonMetrics?.marginal_contribution_amount, 'marginal_contribution_amount', true, false),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.marginal_contribution_amount, secondaryComparisonMetrics.marginal_contribution_amount, 'marginal_contribution_amount', true, false) : {}),
    },
    {
      id: 'premium_written', title: '保费', value: formatDisplayValue(current.premium_written, 'premium_written'), rawValue: current.premium_written, icon: 'DollarSign',
      primaryComparisonLabel, primaryChange: primaryPremWrittenChanges.change, primaryChangeAbsolute: primaryPremWrittenChanges.changeAbsolute, primaryChangeType: primaryPremWrittenChanges.type,
      secondaryComparisonLabel, secondaryChange: secondaryPremWrittenChanges.change, secondaryChangeAbsolute: secondaryPremWrittenChanges.changeAbsolute, secondaryChangeType: secondaryPremWrittenChanges.type,
    },
    {
      id: 'expense_amount', title: '费用', value: formatDisplayValue(current.expense_amount, 'expense_amount'), rawValue: current.expense_amount, icon: 'Briefcase',
      primaryComparisonLabel, ...createKpiComparisonFields(current.expense_amount, primaryComparisonMetrics?.expense_amount, 'expense_amount', false, false),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.expense_amount, secondaryComparisonMetrics.expense_amount, 'expense_amount', false, false) : {}),
    },
    {
      id: 'total_loss_amount', title: '赔款', value: formatDisplayValue(current.total_loss_amount, 'total_loss_amount'), rawValue: current.total_loss_amount, icon: 'ShieldAlert',
      primaryComparisonLabel, ...createKpiComparisonFields(current.total_loss_amount, primaryComparisonMetrics?.total_loss_amount, 'total_loss_amount', false, false),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.total_loss_amount, secondaryComparisonMetrics.total_loss_amount, 'total_loss_amount', false, false) : {}),
    },
    {
      id: 'premium_earned', title: '满期保费', value: formatDisplayValue(current.premium_earned, 'premium_earned'), rawValue: current.premium_earned, icon: 'FileText',
      primaryComparisonLabel, ...createKpiComparisonFields(current.premium_earned, primaryComparisonMetrics?.premium_earned, 'premium_earned', true, false),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.premium_earned, secondaryComparisonMetrics.premium_earned, 'premium_earned', true, false) : {}),
    },
    {
      id: 'premium_earned_ratio', title: '保费满期率', value: formatDisplayValue(current.premium_earned_ratio, 'premium_earned_ratio'), rawValue: current.premium_earned_ratio, icon: 'Ratio',
      primaryComparisonLabel, ...createKpiComparisonFields(current.premium_earned_ratio, primaryComparisonMetrics?.premium_earned_ratio, 'premium_earned_ratio', true, true),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.premium_earned_ratio, secondaryComparisonMetrics.premium_earned_ratio, 'premium_earned_ratio', true, true) : {}),
    },
    {
      id: 'avg_premium_per_policy', title: '单均保费', value: formatDisplayValue(current.avg_premium_per_policy, 'avg_premium_per_policy'), rawValue: current.avg_premium_per_policy, icon: 'FileText',
      primaryComparisonLabel, ...createKpiComparisonFields(current.avg_premium_per_policy, primaryComparisonMetrics?.avg_premium_per_policy, 'avg_premium_per_policy', true, false),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.avg_premium_per_policy, secondaryComparisonMetrics.avg_premium_per_policy, 'avg_premium_per_policy', true, false) : {}),
    },
    {
      id: 'policy_count', title: '保单件数', value: formatDisplayValue(current.policy_count, 'policy_count'), rawValue: current.policy_count, icon: 'FileText',
      primaryComparisonLabel, ...createKpiComparisonFields(current.policy_count, primaryComparisonMetrics?.policy_count, 'policy_count', true, false),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.policy_count, secondaryComparisonMetrics.policy_count, 'policy_count', true, false) : {}),
    },
    {
      id: 'premium_share', title: '保费占比', value: formatDisplayValue(data.premium_share, 'premium_share'), rawValue: data.premium_share, icon: 'Users',
      primaryComparisonLabel: undefined, primaryChange: undefined, primaryChangeAbsolute: undefined, primaryChangeType: 'neutral',
      secondaryComparisonLabel: undefined, secondaryChange: undefined, secondaryChangeAbsolute: undefined, secondaryChangeType: 'neutral',
    },
    {
      id: 'avg_commercial_index', title: '自主系数', 
      value: formatDisplayValue(rawAvgCommercialIndex, 'avg_commercial_index'), 
      rawValue: rawAvgCommercialIndex, icon: 'Search',
      primaryComparisonLabel: undefined, primaryChange: undefined, primaryChangeAbsolute: undefined, primaryChangeType: 'neutral',
      secondaryComparisonLabel: undefined, secondaryChange: undefined, secondaryChangeAbsolute: undefined, secondaryChangeType: 'neutral',
    },
    {
      id: 'claim_frequency', title: '满期出险率', value: formatDisplayValue(current.claim_frequency, 'claim_frequency'), rawValue: current.claim_frequency, icon: 'Activity',
      primaryComparisonLabel, ...createKpiComparisonFields(current.claim_frequency, primaryComparisonMetrics?.claim_frequency, 'claim_frequency', false, true),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.claim_frequency, secondaryComparisonMetrics.claim_frequency, 'claim_frequency', false, true) : {}),
    },
    {
      id: 'avg_loss_per_case', title: '案均赔款', value: formatDisplayValue(current.avg_loss_per_case, 'avg_loss_per_case'), rawValue: current.avg_loss_per_case, icon: 'DollarSign',
      primaryComparisonLabel, ...createKpiComparisonFields(current.avg_loss_per_case, primaryComparisonMetrics?.avg_loss_per_case, 'avg_loss_per_case', false, false),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.avg_loss_per_case, secondaryComparisonMetrics.avg_loss_per_case, 'avg_loss_per_case', false, false) : {}),
    },
  ];
  return kpis;
};

export function setGlobalV4DataForKpiWorkaround(allV4Data: V4PeriodData[]) {
  (globalThis as any).allV4DataForKpiWorkaround = allV4Data;
}

export function exportToCSV(
    data: ProcessedDataForPeriod[],
    analysisMode: AnalysisMode,
    fileName: string = "车险数据导出.csv",
    selectedComparisonPeriodKey: string | null,
    allPeriodOptions: PeriodOption[]
) {
    if (!data || data.length === 0) {
        console.warn("No data to export.");
        return;
    }

    let comparisonLabelForHeader = "环比";
    if (selectedComparisonPeriodKey) {
        const compPeriod = allPeriodOptions.find(p => p.value === selectedComparisonPeriodKey);
        if (compPeriod) {
            comparisonLabelForHeader = `对比${compPeriod.label}`;
        } else {
            comparisonLabelForHeader = "对比所选周期";
        }
    }


    const headers = [
        "业务线ID", "业务线名称",
        "跟单保费(万元)", "满期保费(万元)", "总赔款(万元)", "费用(额)(万元)",
        "保单数量(件)", "赔案数量(件)", "满期保单(件)",
        "单均保费(元)", "案均赔款(元)", "自主系数",
        "满期赔付率(%)", "费用率(%)", "变动成本率(%)", "保费满期率(%)", "满期出险率(%)",
        "边际贡献率(%)", "边贡额(万元)", "保费占比(%)"
    ];

    const primaryCompHeaders = [
        `跟单保费${comparisonLabelForHeader}(%)`, `跟单保费${comparisonLabelForHeader}绝对值(万元)`,
        `总赔款${comparisonLabelForHeader}(%)`, `总赔款${comparisonLabelForHeader}绝对值(万元)`,
        `保单数量${comparisonLabelForHeader}(%)`, `保单数量${comparisonLabelForHeader}绝对值(件)`,
        `满期赔付率${comparisonLabelForHeader}(pp)`,
        `费用率${comparisonLabelForHeader}(pp)`
    ];
    
    let csvHeaders = [...headers];

    if (analysisMode === 'periodOverPeriod' || selectedComparisonPeriodKey) {
        csvHeaders.push(...primaryCompHeaders);
    }
    
    if (!selectedComparisonPeriodKey) { 
        const yoyHeaders = [
            "跟单保费同比(%)", "跟单保费同比绝对值(万元)",
            "总赔款同比(%)", "总赔款同比绝对值(万元)",
        ];
        csvHeaders.push(...yoyHeaders);
    }


    const rows = data.map(item => {
        const current = item.currentMetrics;
        const primaryComp = item.momMetrics; 
        const secondaryComp = selectedComparisonPeriodKey ? null : item.yoyMetrics;
        const selectedBusinessTypes = (globalThis as any)._selectedBusinessTypesForExport || []; // Hack to get selected types

        const rowDataNumbers: (number | string | undefined | null)[] = [
            item.businessLineId, item.businessLineName,
            current.premium_written, current.premium_earned, current.total_loss_amount, current.expense_amount,
            current.policy_count, current.claim_count, current.policy_count_earned,
            current.avg_premium_per_policy, current.avg_loss_per_case, 
            (selectedBusinessTypes.length === 1 && analysisMode === 'cumulative' ? current.avg_commercial_index : undefined), 
            current.loss_ratio, current.expense_ratio, current.variable_cost_ratio, current.premium_earned_ratio, current.claim_frequency,
            current.marginal_contribution_ratio, current.marginal_contribution_amount, item.premium_share
        ];
        
        if (analysisMode === 'periodOverPeriod' || selectedComparisonPeriodKey) {
            if (primaryComp) {
                const premWrittenChange = calculateChangeAndType(current.premium_written, primaryComp.premium_written, true);
                const lossAmtChange = calculateChangeAndType(current.total_loss_amount, primaryComp.total_loss_amount, false);
                const policyCntChange = calculateChangeAndType(current.policy_count, primaryComp.policy_count, true);
                const lossRatioChange = calculateChangeAndType(current.loss_ratio, primaryComp.loss_ratio, false);
                const expenseRatioChange = calculateChangeAndType(current.expense_ratio, primaryComp.expense_ratio, false);
                
                rowDataNumbers.push(
                    premWrittenChange.percent, premWrittenChange.absolute,
                    lossAmtChange.percent, lossAmtChange.absolute,
                    policyCntChange.percent, policyCntChange.absolute,
                    lossRatioChange.absolute, 
                    expenseRatioChange.absolute 
                );
            } else {
                rowDataNumbers.push("-", "-", "-", "-", "-", "-", "-", "-");
            }
        }


        if (!selectedComparisonPeriodKey && secondaryComp) { 
            const premWrittenYoYChange = calculateChangeAndType(current.premium_written, secondaryComp.premium_written, true);
            const lossAmtYoYChange = calculateChangeAndType(current.total_loss_amount, secondaryComp.total_loss_amount, false);
            rowDataNumbers.push(
                premWrittenYoYChange.percent, premWrittenYoYChange.absolute,
                lossAmtYoYChange.percent, lossAmtYoYChange.absolute
            );
        } else if (!selectedComparisonPeriodKey) { 
             rowDataNumbers.push("-", "-", "-", "-"); 
        }


        const rowDataStrings = rowDataNumbers.map(val => {
            if (val === undefined || val === null || (typeof val === 'number' && isNaN(val))) return "-";
            if (typeof val === 'number') {
                 const isRateLike = headers[rowDataNumbers.indexOf(val)]?.includes('(%)') || headers[rowDataNumbers.indexOf(val)]?.includes('(pp)');
                 if (isRateLike) return val.toFixed(4); 
                 if (headers[rowDataNumbers.indexOf(val)]?.includes('万元') || headers[rowDataNumbers.indexOf(val)]?.includes('元')) return val.toFixed(4);
                 return val.toString(); 
            }
            return String(val).replace(/,/g, ';'); 
        });

        return rowDataStrings.join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + csvHeaders.join(",") + "\n"
        + rows.join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Temporary hack to pass selectedBusinessTypes to exportToCSV
// This should ideally be passed as a parameter if possible
export function setSelectedBusinessTypesForExport(types: string[]) {
  (globalThis as any)._selectedBusinessTypesForExport = types;
}

