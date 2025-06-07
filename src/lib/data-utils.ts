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
    // Fallback for metrics without specific rules: round and format with thousand separators
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
      // For all integer types, round first, then format.
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
    const vcr_red_upper_bound = 130; // Assuming VCR won't go excessively high for color scaling
    const normalizedVcr = Math.max(0, Math.min(1, (vcr - vcr_red_lower_bound) / (vcr_red_upper_bound - vcr_red_lower_bound)));
    light = L_deep + normalizedVcr * (L_light - L_deep);
  }

  light = Math.round(Math.max(L_deep - 5, Math.min(L_light + 5, light))); // Clamp lightness

  return `hsl(${hue}, ${sat}%, ${light}%)`;
};


// The 11 "original display metrics" as per user's latest definition + 2 essential base fields from JSON
const elevenSourceDisplayMetricKeys: (keyof V4BusinessDataEntry)[] = [
    'premium_written', 'avg_premium_per_policy', 'premium_earned', 
    'claim_frequency', 'claim_count', 'avg_loss_per_case', 
    'total_loss_amount', 'loss_ratio', 'expense_ratio', 
    'variable_cost_ratio', 'avg_commercial_index'
];
// Base raw values from JSON needed for calculations, especially for aggregation.
const baseJsonFieldsToSum: (keyof V4BusinessDataEntry)[] = [
    'premium_written', 'premium_earned', 'total_loss_amount', 
    'expense_amount_raw', 'claim_count', 'policy_count_earned'
];


export const aggregateAndCalculateMetrics = (
  periodBusinessDataEntries: V4BusinessDataEntry[], // Data for selected business types (YTD or PoP base values)
  analysisMode: AnalysisMode,
  originalYtdEntriesForPeriod: V4BusinessDataEntry[], // All original YTD entries for the current period (used for single type direct sourcing)
  previousPeriodYtdEntries?: V4BusinessDataEntry[] // All original YTD entries for the comparison period (for PoP calculation)
): AggregatedBusinessMetrics => {

  const metrics: Partial<AggregatedBusinessMetrics> = {};

  const isSingleTypeCumulative = periodBusinessDataEntries.length === 1 && analysisMode === 'cumulative';

  if (isSingleTypeCumulative) {
    // Path 1: Single Business Type & Cumulative Mode - Prioritize direct use of JSON pre-calculated values for the 11 metrics.
    const singleEntryJson = originalYtdEntriesForPeriod.find(e => e.business_type === periodBusinessDataEntries[0].business_type);

    if (singleEntryJson) {
      // Directly source or fallback calculate for the 11 "original display metrics"
      metrics.premium_written = singleEntryJson.premium_written ?? 0;
      metrics.premium_earned = singleEntryJson.premium_earned ?? 0;
      metrics.total_loss_amount = singleEntryJson.total_loss_amount ?? 0;
      metrics.claim_count = singleEntryJson.claim_count ?? 0;
      // policy_count_earned is a base field, directly from JSON for single type
      metrics.policy_count_earned = singleEntryJson.policy_count_earned ?? 0; 
      // expense_amount_raw is a base field
      const expense_amount_raw_single = singleEntryJson.expense_amount_raw ?? 0;
      metrics.expense_amount_raw = expense_amount_raw_single;


      metrics.avg_premium_per_policy = singleEntryJson.avg_premium_per_policy !== null && !isNaN(Number(singleEntryJson.avg_premium_per_policy)) 
                                        ? Number(singleEntryJson.avg_premium_per_policy) 
                                        : ( (metrics.premium_written && ( (metrics.premium_written * 10000) / (singleEntryJson.avg_premium_per_policy && singleEntryJson.avg_premium_per_policy !== 0 ? (metrics.premium_written*10000 / singleEntryJson.avg_premium_per_policy) : 0 ) ) ) ? Number(singleEntryJson.avg_premium_per_policy) : 0); // fallback for policy_count calc if needed
      
      // Policy count for single type, derived using sourced/fallback avg_premium_per_policy
      const policy_count_single_derived = (metrics.avg_premium_per_policy && metrics.avg_premium_per_policy !== 0 && metrics.premium_written)
                                        ? (metrics.premium_written * 10000) / metrics.avg_premium_per_policy
                                        : 0;
      metrics.policy_count = Math.round(policy_count_single_derived);


      metrics.avg_loss_per_case = singleEntryJson.avg_loss_per_case !== null && !isNaN(Number(singleEntryJson.avg_loss_per_case)) 
                                    ? Number(singleEntryJson.avg_loss_per_case) 
                                    : (metrics.claim_count && metrics.claim_count !== 0 ? (metrics.total_loss_amount! * 10000) / metrics.claim_count : 0);
      
      metrics.avg_commercial_index = singleEntryJson.avg_commercial_index ?? undefined;

      metrics.expense_ratio = singleEntryJson.expense_ratio !== null && !isNaN(Number(singleEntryJson.expense_ratio))
                                ? Number(singleEntryJson.expense_ratio)
                                : (metrics.premium_written !== 0 ? (expense_amount_raw_single / metrics.premium_written) * 100 : 0);

      metrics.loss_ratio = singleEntryJson.loss_ratio !== null && !isNaN(Number(singleEntryJson.loss_ratio))
                            ? Number(singleEntryJson.loss_ratio)
                            : (metrics.premium_earned !== 0 ? (metrics.total_loss_amount! / metrics.premium_earned) * 100 : 0);
      
      metrics.claim_frequency = singleEntryJson.claim_frequency !== null && !isNaN(Number(singleEntryJson.claim_frequency))
                                ? Number(singleEntryJson.claim_frequency)
                                : (metrics.policy_count_earned !== 0 && metrics.claim_count ? (metrics.claim_count / metrics.policy_count_earned) * 100 : 0);

      // For variable_cost_ratio, even if in JSON, it's recalculated if its components (ER, LR) are taken/recalculated, to ensure consistency with the sum rule.
      // However, user rule: if single type, use JSON. So, take VCR from JSON if present.
      metrics.variable_cost_ratio = singleEntryJson.variable_cost_ratio !== null && !isNaN(Number(singleEntryJson.variable_cost_ratio))
                                      ? Number(singleEntryJson.variable_cost_ratio)
                                      : (metrics.expense_ratio + metrics.loss_ratio); // Fallback if VCR not in JSON

    } else {
      // Should not happen if periodBusinessDataEntries[0] is valid, but as a failsafe, calculate all.
      // This block implies the JSON entry for the single selected business_type was not found in originalYtdEntriesForPeriod
      // which would be an issue with data loading or filtering.
      // For now, assume singleEntryJson is found and proceed with derived calculations based on it.
      // If singleEntryJson is truly null, all metrics would effectively become 0 or NaN.
      // A more robust error handling or logging might be needed here in a production app.
    }
  } else {
    // Path 2: Aggregate (Multi-select OR "All Types" OR any PoP mode) - Recalculate all metrics based on summed base fields.
    let dataToSum = periodBusinessDataEntries;
    if (analysisMode === 'periodOverPeriod' && previousPeriodYtdEntries) {
        dataToSum = periodBusinessDataEntries.map(currentYtdEntry => {
            const prevYtdEntry = previousPeriodYtdEntries.find(pe => pe.business_type === currentYtdEntry.business_type);
            // We need the original YTD avg_premium_per_policy from the *current* period for policy count derivation in PoP, not the PoP of avg_premium_per_policy
            const originalCurrentYtdEntryForPolicyDerivation = originalYtdEntriesForPeriod.find(e => e.business_type === currentYtdEntry.business_type) || currentYtdEntry;

            return {
                ...currentYtdEntry, // keep business_type etc.
                premium_written: (currentYtdEntry.premium_written || 0) - (prevYtdEntry?.premium_written || 0),
                premium_earned: (currentYtdEntry.premium_earned || 0) - (prevYtdEntry?.premium_earned || 0),
                total_loss_amount: (currentYtdEntry.total_loss_amount || 0) - (prevYtdEntry?.total_loss_amount || 0),
                expense_amount_raw: (currentYtdEntry.expense_amount_raw || 0) - (prevYtdEntry?.expense_amount_raw || 0),
                claim_count: (currentYtdEntry.claim_count || 0) - (prevYtdEntry?.claim_count || 0),
                policy_count_earned: (currentYtdEntry.policy_count_earned || 0) - (prevYtdEntry?.policy_count_earned || 0),
                // Pass through the YTD avg_premium_per_policy for policy count derivation, not the PoP of this average.
                avg_premium_per_policy: originalCurrentYtdEntryForPolicyDerivation.avg_premium_per_policy,
                // Nullify pre-calculated rates as they need re-computation for PoP
                loss_ratio: null, expense_ratio: null, variable_cost_ratio: null, premium_earned_ratio: null, claim_frequency: null, avg_loss_per_case: null, avg_commercial_index: null,
            };
        });
    }
    
    const sums = dataToSum.reduce((acc, entry) => {
        baseJsonFieldsToSum.forEach(key => {
          const val = entry[key];
          if (typeof val === 'number' && !isNaN(val)) {
            acc[key] = (acc[key] || 0) + val;
          } else if (acc[key] === undefined) {
            acc[key] = 0; // Initialize if undefined from first entry
          }
        });
        // For policy count derivation in aggregate, we need sum of YTD avg_premium_per_policy * (PoP premium_written / YTD premium_written) or similar weighting if strict.
        // Simpler: sum derived policy counts for PoP.
        // For PoP, policy count derivation: Use PoP premium_written and YTD avg_premium_per_policy for EACH line, then sum derived PoP policy_counts.
        if (analysisMode === 'periodOverPeriod') {
            const ytdAvgPremium = entry.avg_premium_per_policy; // This is passed as YTD from current period in dataToSum map
            const popPremiumWritten = entry.premium_written; // This is already PoP diff
            if (ytdAvgPremium && ytdAvgPremium !== 0 && popPremiumWritten) {
                 acc.derived_pop_policy_count_sum = (acc.derived_pop_policy_count_sum || 0) + (popPremiumWritten * 10000 / ytdAvgPremium);
            }
        }
        return acc;
    }, {} as Record<keyof V4BusinessDataEntry | "derived_pop_policy_count_sum", number>);

    metrics.premium_written = sums.premium_written ?? 0;
    metrics.premium_earned = sums.premium_earned ?? 0;
    metrics.total_loss_amount = sums.total_loss_amount ?? 0;
    const expense_amount_raw_agg = sums.expense_amount_raw ?? 0;
    metrics.expense_amount_raw = expense_amount_raw_agg;
    metrics.claim_count = Math.round(sums.claim_count ?? 0);
    metrics.policy_count_earned = Math.round(sums.policy_count_earned ?? 0);

    if (analysisMode === 'periodOverPeriod') {
        metrics.policy_count = Math.round(sums.derived_pop_policy_count_sum ?? 0);
    } else { // Cumulative Aggregate
        // Policy count for cumulative aggregate: Sum of individual lines' YTD policy counts.
        // Each individual line's YTD policy count is derived from its YTD premium_written and YTD avg_premium_per_policy.
        let cumulative_derived_policy_count_sum = 0;
        dataToSum.forEach(entry => { // dataToSum contains YTD entries here
            const pw = entry.premium_written || 0;
            const app = entry.avg_premium_per_policy;
            if (app && app !== 0 && pw) {
                cumulative_derived_policy_count_sum += (pw * 10000 / app);
            }
        });
        metrics.policy_count = Math.round(cumulative_derived_policy_count_sum);
    }
    
    metrics.expense_ratio = metrics.premium_written !== 0 ? (expense_amount_raw_agg / metrics.premium_written) * 100 : 0;
    metrics.loss_ratio = metrics.premium_earned !== 0 ? (metrics.total_loss_amount / metrics.premium_earned) * 100 : 0;
    metrics.claim_frequency = metrics.policy_count_earned !== 0 && metrics.claim_count ? (metrics.claim_count / metrics.policy_count_earned) * 100 : 0;
    
    metrics.avg_premium_per_policy = metrics.policy_count !== 0 && metrics.premium_written ? (metrics.premium_written * 10000) / metrics.policy_count : 0;
    metrics.avg_loss_per_case = metrics.claim_count !== 0 && metrics.total_loss_amount ? (metrics.total_loss_amount * 10000) / metrics.claim_count : 0;
    
    metrics.variable_cost_ratio = (metrics.expense_ratio || 0) + (metrics.loss_ratio || 0); // Strictly sum of components
    metrics.avg_commercial_index = undefined; // Not applicable for aggregate/PoP
  }

  // Calculate "truly derived" metrics based on the 11 (now 12 with PCE) core metrics determined above.
  // Ensure all inputs to these calculations are numbers, default to 0 if not.
  const current_premium_written = Number(metrics.premium_written) || 0;
  const current_premium_earned = Number(metrics.premium_earned) || 0;
  const current_avg_premium_per_policy = Number(metrics.avg_premium_per_policy) || 0;
  const current_expense_ratio = Number(metrics.expense_ratio) || 0;
  const current_variable_cost_ratio = Number(metrics.variable_cost_ratio) || 0;

  // policy_count might have already been set if single type, otherwise calculate for aggregate
  // For single type, policy_count was already derived based on its specific avg_premium_per_policy.
  // For aggregate/PoP, policy_count was calculated based on summed PW and re-calculated APP or summed derived PoP PCs.
  // So, metrics.policy_count should be populated correctly at this point.
  if (metrics.policy_count === undefined) { // Should be set, but as a safeguard for aggregate
      metrics.policy_count = (current_avg_premium_per_policy !== 0 && current_premium_written !== 0)
          ? Math.round((current_premium_written * 10000) / current_avg_premium_per_policy)
          : 0;
  }


  metrics.expense_amount = current_premium_written * (current_expense_ratio / 100);
  
  metrics.premium_earned_ratio = current_premium_written !== 0 
    ? (current_premium_earned / current_premium_written) * 100 
    : 0;

  metrics.marginal_contribution_ratio = 100 - current_variable_cost_ratio;
  metrics.marginal_contribution_amount = current_premium_earned * (metrics.marginal_contribution_ratio / 100);

  return metrics as AggregatedBusinessMetrics;
};


const filterRawBusinessData = (
  periodData: V4PeriodData | undefined,
  selectedTypes: string[]
): V4BusinessDataEntry[] => {
  if (!periodData?.business_data) return [];
  // Filter out any "合计" or "total" type entries from the raw data list for processing individual lines
  const individualLines = periodData.business_data.filter(
    bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total'
  );

  if (selectedTypes.length === 0) { // "全部业务" implies all individual lines
    return individualLines;
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

  // Determine which period data to use for comparison (momMetrics)
  if (selectedComparisonPeriodKey) { // User selected a custom comparison period
    momEquivalentPeriodData = allV4Data.find(p => p.period_id === selectedComparisonPeriodKey);
    yoyEquivalentPeriodData = undefined; // No YoY comparison if custom comparison is active
  } else { // Default: use mom_id for环比 (momMetrics) and yoy_id for 同比 (yoyMetrics)
    const momPeriodId = currentPeriodData.comparison_period_id_mom;
    momEquivalentPeriodData = momPeriodId ? allV4Data.find(p => p.period_id === momPeriodId) : undefined;

    const yoyPeriodId = currentPeriodData.comparison_period_id_yoy;
    yoyEquivalentPeriodData = yoyPeriodId ? allV4Data.find(p => p.period_id === yoyPeriodId) : undefined;
  }
  
  const originalYtdEntriesForCurrentPeriod = (currentPeriodData.business_data || []).filter(
    bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total'
  );
  const currentPeriodFilteredBusinessEntries = filterRawBusinessData(currentPeriodData, selectedBusinessTypes);


  let previousPeriodYtdForPoPBase: V4BusinessDataEntry[] | undefined = undefined;
  if (analysisMode === 'periodOverPeriod' && momEquivalentPeriodData) {
      previousPeriodYtdForPoPBase = filterRawBusinessData(momEquivalentPeriodData, selectedBusinessTypes);
  }

  const currentAggregatedMetrics = aggregateAndCalculateMetrics(
    currentPeriodFilteredBusinessEntries, // These are YTD for cumulative, or become base for PoP calculation inside aggregate...
    analysisMode,
    originalYtdEntriesForCurrentPeriod, // Full list of current period's YTD entries for single-type sourcing
    analysisMode === 'periodOverPeriod' ? previousPeriodYtdForPoPBase : undefined // YTD entries of actual previous period for PoP base
  );
  
  // For momMetrics (comparison), always calculate in 'cumulative' mode from its own YTD data
  const momAggregatedMetrics = momEquivalentPeriodData
    ? aggregateAndCalculateMetrics(
        filterRawBusinessData(momEquivalentPeriodData, selectedBusinessTypes), 
        'cumulative', // Calculate comparison period's metrics in cumulative from its YTD
        (momEquivalentPeriodData.business_data || []).filter(bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total')
      )
    : null;

  // For yoyMetrics, always calculate in 'cumulative' mode from its own YTD data
  const yoyAggregatedMetrics = (yoyEquivalentPeriodData && !selectedComparisonPeriodKey) // Only if no custom comparison
    ? aggregateAndCalculateMetrics(
        filterRawBusinessData(yoyEquivalentPeriodData, selectedBusinessTypes),
        'cumulative',
        (yoyEquivalentPeriodData.business_data || []).filter(bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total')
      )
    : null;


  let derivedBusinessLineName: string;
  // Get all unique, non-total business types present in the current period's original data
  const allAvailableIndividualBusinessTypesInCurrentPeriod = Array.from(new Set(
      originalYtdEntriesForCurrentPeriod.map(bt => bt.business_type)
  ));

  if (selectedBusinessTypes.length === 1 && allAvailableIndividualBusinessTypesInCurrentPeriod.includes(selectedBusinessTypes[0])) {
    derivedBusinessLineName = selectedBusinessTypes[0];
  } else if (selectedBusinessTypes.length > 0 && selectedBusinessTypes.length < allAvailableIndividualBusinessTypesInCurrentPeriod.length) {
    derivedBusinessLineName = "自定义合计"; // User selected a subset (multiple but not all)
  } else { 
    // This covers (selectedBusinessTypes.length === 0) OR (selectedBusinessTypes includes all available individual types)
    derivedBusinessLineName = "合计";
  }
  const businessLineId = derivedBusinessLineName; // Can be business type name, "自定义合计", or "合计"

  const premium_share = (currentPeriodData.totals_for_period?.total_premium_written_overall && currentPeriodData.totals_for_period.total_premium_written_overall !== 0 && currentAggregatedMetrics.premium_written !== undefined)
    ? (currentAggregatedMetrics.premium_written / currentPeriodData.totals_for_period.total_premium_written_overall) * 100
    : 0;


  const processedEntry: ProcessedDataForPeriod = {
    businessLineId,
    businessLineName: derivedBusinessLineName,
    icon: derivedBusinessLineName === "合计" || derivedBusinessLineName === "自定义合计" ? 'Users' : 'ShieldCheck', // Example icon logic
    
    currentMetrics: currentAggregatedMetrics,
    momMetrics: momAggregatedMetrics, // This is the primary comparison (custom or default 环比)
    yoyMetrics: yoyAggregatedMetrics, // This is secondary (default 同比), null if custom comparison active

    // Populate top-level metrics for direct table display (redundant but might simplify table component)
    premium_written: currentAggregatedMetrics.premium_written,
    total_loss_amount: currentAggregatedMetrics.total_loss_amount,
    policy_count: currentAggregatedMetrics.policy_count,
    loss_ratio: currentAggregatedMetrics.loss_ratio,
    expense_ratio: currentAggregatedMetrics.expense_ratio,
    variable_cost_ratio: currentAggregatedMetrics.variable_cost_ratio,
    premium_share: premium_share,
    vcr_color: getDynamicColorByVCR(currentAggregatedMetrics.variable_cost_ratio),

    // Change percentages (can be derived in component or here for convenience)
    // These changes are always against momMetrics (primary comparison)
    premium_writtenChange: momAggregatedMetrics?.premium_written !== undefined && momAggregatedMetrics.premium_written !== 0 && currentAggregatedMetrics.premium_written !== undefined 
        ? (currentAggregatedMetrics.premium_written - momAggregatedMetrics.premium_written) / Math.abs(momAggregatedMetrics.premium_written) * 100 
        : (currentAggregatedMetrics.premium_written !== 0 && currentAggregatedMetrics.premium_written !== undefined ? Infinity : 0),
    total_loss_amountChange: momAggregatedMetrics?.total_loss_amount !== undefined && momAggregatedMetrics.total_loss_amount !== 0 && currentAggregatedMetrics.total_loss_amount !== undefined
        ? (currentAggregatedMetrics.total_loss_amount - momAggregatedMetrics.total_loss_amount) / Math.abs(momAggregatedMetrics.total_loss_amount) * 100
        : (currentAggregatedMetrics.total_loss_amount !== 0 && currentAggregatedMetrics.total_loss_amount !== undefined ? Infinity : 0),
    policy_countChange: momAggregatedMetrics?.policy_count !== undefined && momAggregatedMetrics.policy_count !== 0 && currentAggregatedMetrics.policy_count !== undefined
        ? (currentAggregatedMetrics.policy_count - momAggregatedMetrics.policy_count) / Math.abs(momAggregatedMetrics.policy_count) * 100
        : (currentAggregatedMetrics.policy_count !== 0 && currentAggregatedMetrics.policy_count !== undefined ? Infinity : 0),
    loss_ratioChange: momAggregatedMetrics?.loss_ratio !== undefined && currentAggregatedMetrics.loss_ratio !== undefined 
        ? currentAggregatedMetrics.loss_ratio - momAggregatedMetrics.loss_ratio 
        : undefined, // Absolute change for rates (pp)
    expense_ratioChange: momAggregatedMetrics?.expense_ratio !== undefined && currentAggregatedMetrics.expense_ratio !== undefined
        ? currentAggregatedMetrics.expense_ratio - momAggregatedMetrics.expense_ratio 
        : undefined, // Absolute change for rates (pp)
  };

  return [processedEntry]; // Still returning array for consistency, though it's one aggregate entry
};



export function calculateChangeAndType (current?: number | null, previous?: number | null, higherIsBetter: boolean = true): { percent?: number, absolute?: number, type: Kpi['primaryChangeType'] } {
  if (current === undefined || previous === undefined || current === null || previous === null || isNaN(current) || isNaN(previous)) {
    return { type: 'neutral' };
  }
  const absolute = current - previous;
  let percent: number | undefined;
  if (previous !== 0) {
    percent = (absolute / Math.abs(previous)) * 100;
  } else if (current !== 0) { // Previous is 0, current is non-zero
    percent = current > 0 ? Infinity : -Infinity; // Or simply a large number like 99999% or -99999% if Infinity is problematic
  } else { // Both are 0
    percent = 0;
  }

  let type: Kpi['primaryChangeType'] = 'neutral';
  const epsilon = 0.00001; // A small number to handle floating point comparisons
  if (absolute > epsilon) type = higherIsBetter ? 'positive' : 'negative';
  if (absolute < -epsilon) type = higherIsBetter ? 'negative' : 'positive';
  
  // Specific handling for VCR, where lower is better for the value itself, but an increase is "negative" change.
  // This logic is now more directly tied to `higherIsBetter` passed in.

  return { percent, absolute, type };
};


const formatKpiChangeValues = (
    changeResult: { percent?: number, absolute?: number, type: Kpi['primaryChangeType'] },
    metricIdForAbsFormat: string, // Used to format the absolute change part
    isRateChange: boolean = false, // True if the change is for a rate (e.g. loss_ratio, expense_ratio) - display in pp
    valueHigherIsBetterForColor: boolean = true // Governs the color of the change, not just the icon direction
) => {
    let changePercentStr, changeAbsStr;

    // Format percentage change
    if (changeResult.percent !== undefined && isFinite(changeResult.percent)) {
        changePercentStr = `${changeResult.percent > 0 ? '+' : ''}${changeResult.percent.toFixed(1)}%`;
    } else if (changeResult.percent === Infinity) {
        changePercentStr = "+∞%"; // Or a very large positive percentage
    } else if (changeResult.percent === -Infinity) {
        changePercentStr = "-∞%"; // Or a very large negative percentage
    }

    // Format absolute change
    if (changeResult.absolute !== undefined) {
        if (isRateChange) { // For rates, show absolute change in pp
            changeAbsStr = `${changeResult.absolute > 0 ? '+' : ''}${changeResult.absolute.toFixed(1)} pp`;
        } else { // For other values, format normally
            const formattedAbs = formatDisplayValue(Math.abs(changeResult.absolute), metricIdForAbsFormat);
            if (changeResult.absolute > 0.00001) changeAbsStr = `+${formattedAbs}`;
            else if (changeResult.absolute < -0.00001) changeAbsStr = `-${formattedAbs}`;
            else changeAbsStr = formattedAbs; // No sign if effectively zero
        }
    }
    
    // Determine effective change type for color and icon (already done by calculateChangeAndType via higherIsBetter)
    let effectiveChangeType = changeResult.type; 
    
    // If absolute change is very close to zero, consider it neutral regardless of small percentage.
    if (changeResult.absolute !== undefined && Math.abs(changeResult.absolute) < 0.00001 && !isRateChange) { // For non-rates, absolute zero is key
        effectiveChangeType = 'neutral';
    }
    if (isRateChange && changeResult.absolute !== undefined && Math.abs(changeResult.absolute) < 0.05 ) { // For rates, 0.0 pp can be neutral
         effectiveChangeType = 'neutral';
    }


    return { change: changePercentStr, changeAbsolute: changeAbsStr, type: effectiveChangeType };
};


export const calculateKpis = (
  processedData: ProcessedDataForPeriod[],
  overallTotalsForPeriod: V4PeriodTotals | undefined | null, // This is V4PeriodTotals for premium_share calc
  analysisMode: AnalysisMode, // Used to determine logic paths inside, and for avg_commercial_index
  selectedBusinessTypes: string[], // Used for avg_commercial_index logic
  activePeriodId: string, // For fetching specific YTD values for avg_commercial_index if needed
  selectedComparisonPeriodKey: string | null, // Determines primary/secondary comparison labels
  allPeriodOptions: PeriodOption[] // For fetching labels of comparison periods
): Kpi[] => {
  if (!activePeriodId) {
    console.error("calculateKpis: activePeriodId is required but was not provided.");
    return [];
  }
  if (!processedData || processedData.length === 0) return [];

  const data = processedData[0]; // data-utils now ensures this is a single aggregated entry
  const current = data.currentMetrics;
  // momMetrics is the primary comparison (either custom selected period or default 环比)
  const primaryComparisonMetrics = data.momMetrics; 
  // yoyMetrics is the secondary comparison (default 同比), only present if no custom comparison
  const secondaryComparisonMetrics = data.yoyMetrics; 

  if (!current) return [];

  // Determine comparison labels
  let primaryComparisonLabel = "环比"; // Default
  if (selectedComparisonPeriodKey) {
    const compPeriodLabel = allPeriodOptions.find(p => p.value === selectedComparisonPeriodKey)?.label;
    primaryComparisonLabel = compPeriodLabel ? `对比 ${compPeriodLabel}` : "对比所选周期";
  }
  const secondaryComparisonLabel = selectedComparisonPeriodKey ? undefined : "同比";


  // Helper to create comparison fields for a KPI
  const createKpiComparisonFields = (
    currentValue: number | undefined | null,
    comparisonValue: number | undefined | null,
    metricId: string, // The ID of the metric, used for formatting absolute change
    valueHigherIsBetter: boolean, // True if a higher value of the metric is better
    isRateMetric: boolean // True if the metric is a rate (e.g., loss_ratio), affects absolute change display (pp)
  ): { change?: string; changeAbsolute?: string; type: Kpi['primaryChangeType'] } => {
    
    // Special case for avg_commercial_index: comparisons are always '-'
    if (metricId === 'avg_commercial_index') { // This will always be true if called for avg_commercial_index
      return { change: '-', changeAbsolute: '-', type: 'neutral' };
    }

    const changeDetails = calculateChangeAndType(currentValue, comparisonValue, valueHigherIsBetter);
    const formattedChanges = formatKpiChangeValues(changeDetails, metricId, isRateMetric, valueHigherIsBetter);
    return { change: formattedChanges.change, changeAbsolute: formattedChanges.changeAbsolute, type: formattedChanges.type };
  };


  // Special handling for "保费" KPI's change color indicator
  let premWrittenIsGrowthGoodForColor = true; // Default: higher premium is good
  if (current.variable_cost_ratio !== undefined && current.variable_cost_ratio >= 92) {
      premWrittenIsGrowthGoodForColor = false; // If VCR is high, premium growth might be colored as "bad"
  }
  const primaryPremWrittenChanges = createKpiComparisonFields(current.premium_written, primaryComparisonMetrics?.premium_written, 'premium_written', premWrittenIsGrowthGoodForColor, false);
  const secondaryPremWrittenChanges = secondaryComparisonMetrics
    ? createKpiComparisonFields(current.premium_written, secondaryComparisonMetrics?.premium_written, 'premium_written', premWrittenIsGrowthGoodForColor, false)
    : { type: 'neutral' as Kpi['primaryChangeType'], change: '-', changeAbsolute: '-'};


  // avg_commercial_index: only shown if single business type is selected and mode is cumulative.
  let rawAvgCommercialIndex: number | undefined | null = undefined;
  if (selectedBusinessTypes && selectedBusinessTypes.length === 1 && analysisMode === 'cumulative') {
      // It should be directly available in current.avg_commercial_index due to new logic in aggregateAndCalculateMetrics
      rawAvgCommercialIndex = current.avg_commercial_index;
  } else {
      rawAvgCommercialIndex = undefined; // Not shown for aggregate or PoP
  }


  const kpis: Kpi[] = [
    // Column 1 (Rates)
    {
      id: 'marginal_contribution_ratio', title: '边际贡献率', 
      value: formatDisplayValue(current.marginal_contribution_ratio, 'marginal_contribution_ratio'), 
      rawValue: current.marginal_contribution_ratio, icon: 'Ratio',
      primaryComparisonLabel, ...createKpiComparisonFields(current.marginal_contribution_ratio, primaryComparisonMetrics?.marginal_contribution_ratio, 'marginal_contribution_ratio', true, true),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.marginal_contribution_ratio, secondaryComparisonMetrics.marginal_contribution_ratio, 'marginal_contribution_ratio', true, true) : {change: '-', changeAbsolute: '-'}),
    },
    {
      id: 'variable_cost_ratio', title: '变动成本率', 
      value: formatDisplayValue(current.variable_cost_ratio, 'variable_cost_ratio'), 
      rawValue: current.variable_cost_ratio, icon: 'Zap', 
      isBorderRisk: current.variable_cost_ratio !== undefined && current.variable_cost_ratio >= 90,
      primaryComparisonLabel, ...createKpiComparisonFields(current.variable_cost_ratio, primaryComparisonMetrics?.variable_cost_ratio, 'variable_cost_ratio', false, true),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.variable_cost_ratio, secondaryComparisonMetrics.variable_cost_ratio, 'variable_cost_ratio', false, true) : {change: '-', changeAbsolute: '-'}),
    },
    {
      id: 'expense_ratio', title: '费用率', 
      value: formatDisplayValue(current.expense_ratio, 'expense_ratio'), 
      rawValue: current.expense_ratio, icon: 'Percent', 
      isOrangeRisk: current.expense_ratio !== undefined && current.expense_ratio > 14.5,
      primaryComparisonLabel, ...createKpiComparisonFields(current.expense_ratio, primaryComparisonMetrics?.expense_ratio, 'expense_ratio', false, true),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.expense_ratio, secondaryComparisonMetrics.expense_ratio, 'expense_ratio', false, true) : {change: '-', changeAbsolute: '-'}),
    },
    {
      id: 'loss_ratio', title: '满期赔付率', 
      value: formatDisplayValue(current.loss_ratio, 'loss_ratio'), 
      rawValue: current.loss_ratio, icon: 'ShieldCheck', 
      isRisk: current.loss_ratio !== undefined && current.loss_ratio > 70, 
      description: "基于已报告赔款",
      primaryComparisonLabel, ...createKpiComparisonFields(current.loss_ratio, primaryComparisonMetrics?.loss_ratio, 'loss_ratio', false, true),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.loss_ratio, secondaryComparisonMetrics.loss_ratio, 'loss_ratio', false, true) : {change: '-', changeAbsolute: '-'}),
    },
    // Column 2 (Amounts)
    {
      id: 'marginal_contribution_amount', title: '边贡额', 
      value: formatDisplayValue(current.marginal_contribution_amount, 'marginal_contribution_amount'), 
      rawValue: current.marginal_contribution_amount, icon: 'Landmark',
      primaryComparisonLabel, ...createKpiComparisonFields(current.marginal_contribution_amount, primaryComparisonMetrics?.marginal_contribution_amount, 'marginal_contribution_amount', true, false),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.marginal_contribution_amount, secondaryComparisonMetrics.marginal_contribution_amount, 'marginal_contribution_amount', true, false) : {change: '-', changeAbsolute: '-'}),
    },
    {
      id: 'premium_written', title: '保费', 
      value: formatDisplayValue(current.premium_written, 'premium_written'), 
      rawValue: current.premium_written, icon: 'DollarSign',
      primaryComparisonLabel, primaryChange: primaryPremWrittenChanges.change, primaryChangeAbsolute: primaryPremWrittenChanges.changeAbsolute, primaryChangeType: primaryPremWrittenChanges.type,
      secondaryComparisonLabel, secondaryChange: secondaryPremWrittenChanges.change, secondaryChangeAbsolute: secondaryPremWrittenChanges.changeAbsolute, secondaryChangeType: secondaryPremWrittenChanges.type,
    },
    {
      id: 'expense_amount', title: '费用', 
      value: formatDisplayValue(current.expense_amount, 'expense_amount'), 
      rawValue: current.expense_amount, icon: 'Briefcase',
      primaryComparisonLabel, ...createKpiComparisonFields(current.expense_amount, primaryComparisonMetrics?.expense_amount, 'expense_amount', false, false),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.expense_amount, secondaryComparisonMetrics.expense_amount, 'expense_amount', false, false) : {change: '-', changeAbsolute: '-'}),
    },
    {
      id: 'total_loss_amount', title: '赔款', 
      value: formatDisplayValue(current.total_loss_amount, 'total_loss_amount'), 
      rawValue: current.total_loss_amount, icon: 'ShieldAlert',
      primaryComparisonLabel, ...createKpiComparisonFields(current.total_loss_amount, primaryComparisonMetrics?.total_loss_amount, 'total_loss_amount', false, false),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.total_loss_amount, secondaryComparisonMetrics.total_loss_amount, 'total_loss_amount', false, false) : {change: '-', changeAbsolute: '-'}),
    },
    // Column 3 (Other Premiums & Counts)
     {
      id: 'premium_earned', title: '满期保费', 
      value: formatDisplayValue(current.premium_earned, 'premium_earned'), 
      rawValue: current.premium_earned, icon: 'FileText',
      primaryComparisonLabel, ...createKpiComparisonFields(current.premium_earned, primaryComparisonMetrics?.premium_earned, 'premium_earned', true, false),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.premium_earned, secondaryComparisonMetrics.premium_earned, 'premium_earned', true, false) : {change: '-', changeAbsolute: '-'}),
    },
    {
      id: 'premium_earned_ratio', title: '保费满期率', 
      value: formatDisplayValue(current.premium_earned_ratio, 'premium_earned_ratio'), 
      rawValue: current.premium_earned_ratio, icon: 'Ratio',
      primaryComparisonLabel, ...createKpiComparisonFields(current.premium_earned_ratio, primaryComparisonMetrics?.premium_earned_ratio, 'premium_earned_ratio', true, true),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.premium_earned_ratio, secondaryComparisonMetrics.premium_earned_ratio, 'premium_earned_ratio', true, true) : {change: '-', changeAbsolute: '-'}),
    },
    {
      id: 'avg_premium_per_policy', title: '单均保费', 
      value: formatDisplayValue(current.avg_premium_per_policy, 'avg_premium_per_policy'), 
      rawValue: current.avg_premium_per_policy, icon: 'FileText', // Changed icon
      primaryComparisonLabel, ...createKpiComparisonFields(current.avg_premium_per_policy, primaryComparisonMetrics?.avg_premium_per_policy, 'avg_premium_per_policy', true, false), // Higher is generally better for avg premium
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.avg_premium_per_policy, secondaryComparisonMetrics.avg_premium_per_policy, 'avg_premium_per_policy', true, false) : {change: '-', changeAbsolute: '-'}),
    },
    {
      id: 'policy_count', title: '保单件数', 
      value: formatDisplayValue(current.policy_count, 'policy_count'), 
      rawValue: current.policy_count, icon: 'FileText', // Changed icon
      primaryComparisonLabel, ...createKpiComparisonFields(current.policy_count, primaryComparisonMetrics?.policy_count, 'policy_count', true, false),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.policy_count, secondaryComparisonMetrics.policy_count, 'policy_count', true, false) : {change: '-', changeAbsolute: '-'}),
    },
    // Column 4 (Other Ratios & Averages)
    {
      id: 'premium_share', title: '保费占比', 
      value: formatDisplayValue(data.premium_share, 'premium_share'), // premium_share is on ProcessedDataForPeriod, not currentMetrics
      rawValue: data.premium_share, icon: 'Users',
      //保费占比通常没有同比环比的概念，或者其同比环比需要特定计算逻辑，此处简化为不显示对比
      primaryComparisonLabel: undefined, primaryChange: '-', primaryChangeAbsolute: '-', primaryChangeType: 'neutral',
      secondaryComparisonLabel: undefined, secondaryChange: '-', secondaryChangeAbsolute: '-', secondaryChangeType: 'neutral',
    },
    {
      id: 'avg_commercial_index', title: '自主系数', 
      value: formatDisplayValue(rawAvgCommercialIndex, 'avg_commercial_index'), 
      rawValue: rawAvgCommercialIndex, icon: 'Search',
      //自主系数的同比环比通常不直接比较数值变化，而是观察其稳定性或趋势，此处简化
      primaryComparisonLabel: undefined, primaryChange: '-', primaryChangeAbsolute: '-', primaryChangeType: 'neutral',
      secondaryComparisonLabel: undefined, secondaryChange: '-', secondaryChangeAbsolute: '-', secondaryChangeType: 'neutral',
    },
    {
      id: 'claim_frequency', title: '满期出险率', 
      value: formatDisplayValue(current.claim_frequency, 'claim_frequency'), 
      rawValue: current.claim_frequency, icon: 'Activity',
      primaryComparisonLabel, ...createKpiComparisonFields(current.claim_frequency, primaryComparisonMetrics?.claim_frequency, 'claim_frequency', false, true),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.claim_frequency, secondaryComparisonMetrics.claim_frequency, 'claim_frequency', false, true) : {change: '-', changeAbsolute: '-'}),
    },
    {
      id: 'avg_loss_per_case', title: '案均赔款', 
      value: formatDisplayValue(current.avg_loss_per_case, 'avg_loss_per_case'), 
      rawValue: current.avg_loss_per_case, icon: 'DollarSign', // Changed icon
      primaryComparisonLabel, ...createKpiComparisonFields(current.avg_loss_per_case, primaryComparisonMetrics?.avg_loss_per_case, 'avg_loss_per_case', false, false), // Lower is generally better for avg loss
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.avg_loss_per_case, secondaryComparisonMetrics.avg_loss_per_case, 'avg_loss_per_case', false, false) : {change: '-', changeAbsolute: '-'}),
    },
  ];
  return kpis;
};


// This global variable is a workaround for passing allV4Data to calculateKpis without major prop drilling.
// It's set in page.tsx when data loads. Used by calculateKpis for avg_commercial_index lookup.
// Ideally, this should be avoided with better state management or context if app grows complex.
// For now, it's a pragmatic solution for the specific need of avg_commercial_index.
export function setGlobalV4DataForKpiWorkaround(allV4Data: V4PeriodData[]) {
  (globalThis as any).allV4DataForKpiWorkaround = allV4Data;
}
(globalThis as any)._selectedBusinessTypesForExport = []; // Initialize for export
export function setSelectedBusinessTypesForExport(types: string[]) {
  (globalThis as any)._selectedBusinessTypesForExport = types;
}


export function exportToCSV(
    data: ProcessedDataForPeriod[], // Expects a single entry array from processDataForSelectedPeriod
    analysisMode: AnalysisMode,
    fileName: string = "车险数据导出.csv",
    selectedComparisonPeriodKey: string | null,
    allPeriodOptions: PeriodOption[]
) {
    if (!data || data.length === 0 || !data[0].currentMetrics) {
        console.warn("No data to export or currentMetrics missing.");
        return;
    }

    const item = data[0];
    const current = item.currentMetrics;
    const primaryComp = item.momMetrics;
    const secondaryComp = item.yoyMetrics; // Will be null if custom comparison is active

    let comparisonLabelForHeader = "环比";
    if (selectedComparisonPeriodKey) {
        const compPeriod = allPeriodOptions.find(p => p.value === selectedComparisonPeriodKey);
        comparisonLabelForHeader = compPeriod ? `对比${compPeriod.label}` : "对比所选周期";
    }


    const headersBase = [
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
        `费用率${comparisonLabelForHeader}(pp)`, `满期赔付率${comparisonLabelForHeader}(pp)`,
        `变动成本率${comparisonLabelForHeader}(pp)`, `边际贡献率${comparisonLabelForHeader}(pp)`
    ];
    
    const secondaryCompHeaders = [
        "跟单保费同比(%)", "跟单保费同比绝对值(万元)",
        "总赔款同比(%)", "总赔款同比绝对值(万元)",
        "保单数量同比(%)", "保单数量同比绝对值(件)",
        "费用率同比(pp)", "满期赔付率同比(pp)",
        "变动成本率同比(pp)", "边际贡献率同比(pp)"
    ];

    let csvHeaders = [...headersBase];
    if (primaryComp) { // Primary comparison always exists if momMetrics is there
        csvHeaders.push(...primaryCompHeaders);
    }
    if (secondaryComp) { // Secondary (YoY) only if no custom comparison
        csvHeaders.push(...secondaryCompHeaders);
    }

    const rowData: (string | number | undefined | null)[] = [
        item.businessLineId, item.businessLineName,
        current.premium_written, current.premium_earned, current.total_loss_amount, current.expense_amount,
        current.policy_count, current.claim_count, current.policy_count_earned,
        current.avg_premium_per_policy, current.avg_loss_per_case,
        // avg_commercial_index: only if single business type and cumulative
        (item.businessLineId !== "合计" && item.businessLineId !== "自定义合计" && analysisMode === 'cumulative' ? current.avg_commercial_index : undefined),
        current.loss_ratio, current.expense_ratio, current.variable_cost_ratio, current.premium_earned_ratio, current.claim_frequency,
        current.marginal_contribution_ratio, current.marginal_contribution_amount, item.premium_share
    ];

    const addComparisonRowData = (compMetrics: AggregatedBusinessMetrics | null | undefined, higherIsBetterMap: Record<string, boolean>, isRateMap: Record<string, boolean>) => {
        if (!compMetrics) {
            return ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-"];
        }
        const premWrittenChange = calculateChangeAndType(current.premium_written, compMetrics.premium_written, higherIsBetterMap['premium_written']);
        const tlaChange = calculateChangeAndType(current.total_loss_amount, compMetrics.total_loss_amount, higherIsBetterMap['total_loss_amount']);
        const policyCntChange = calculateChangeAndType(current.policy_count, compMetrics.policy_count, higherIsBetterMap['policy_count']);
        const erChange = calculateChangeAndType(current.expense_ratio, compMetrics.expense_ratio, higherIsBetterMap['expense_ratio']);
        const lrChange = calculateChangeAndType(current.loss_ratio, compMetrics.loss_ratio, higherIsBetterMap['loss_ratio']);
        const vcrChange = calculateChangeAndType(current.variable_cost_ratio, compMetrics.variable_cost_ratio, higherIsBetterMap['variable_cost_ratio']);
        const mcrChange = calculateChangeAndType(current.marginal_contribution_ratio, compMetrics.marginal_contribution_ratio, higherIsBetterMap['marginal_contribution_ratio']);

        return [
            premWrittenChange.percent, premWrittenChange.absolute,
            tlaChange.percent, tlaChange.absolute,
            policyCntChange.percent, policyCntChange.absolute,
            erChange.absolute, // pp
            lrChange.absolute, // pp
            vcrChange.absolute, // pp
            mcrChange.absolute  // pp
        ];
    };
    
    const higherIsBetterConfig = {
        premium_written: true, total_loss_amount: false, policy_count: true,
        expense_ratio: false, loss_ratio: false, variable_cost_ratio: false, marginal_contribution_ratio: true
    };
    const isRateConfig = { // Not used by addComparisonRowData currently, but good for ref
        expense_ratio: true, loss_ratio: true, variable_cost_ratio: true, marginal_contribution_ratio: true
    };

    if (primaryComp) {
        rowData.push(...addComparisonRowData(primaryComp, higherIsBetterConfig, isRateConfig));
    }
    if (secondaryComp) {
        rowData.push(...addComparisonRowData(secondaryComp, higherIsBetterConfig, isRateConfig));
    }
    
    const rowDataStrings = rowData.map(val => {
        if (val === undefined || val === null || (typeof val === 'number' && isNaN(val))) return "-";
        if (typeof val === 'number') {
            // For CSV, generally export more precision for numbers unless it's a known integer count
            const isDefinitelyCount = ['policy_count', 'claim_count', 'policy_count_earned'].includes(headersBase[rowData.indexOf(val)]?.replace(/\(.*?\)/g, '').trim() || ""); // Approximation
            if (isDefinitelyCount) return val.toFixed(0);

            // For rates/percentages, typically more decimal places are fine in CSV
            const isRateOrPercentage = headersBase[rowData.indexOf(val)]?.includes('(%)') || headersBase[rowData.indexOf(val)]?.includes('(pp)');
             if (isRateOrPercentage) return val.toFixed(4);
            
            // For amounts (万元, 元), export with more precision
             const isAmountYuan = headersBase[rowData.indexOf(val)]?.includes('(元)');
             if(isAmountYuan) return val.toFixed(2);
             const isAmountWanYuan = headersBase[rowData.indexOf(val)]?.includes('(万元)');
             if(isAmountWanYuan) return val.toFixed(4);

            // For other numbers like自主系数
            if (headersBase[rowData.indexOf(val)]?.toLowerCase().includes('自主系数')) return val.toFixed(4);
            
            return val.toString(); // Default for other numbers
        }
        return String(val).replace(/,/g, ';'); // Replace commas to avoid CSV issues if value contains comma
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + csvHeaders.join(",") + "\n"
        + rowDataStrings.join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
