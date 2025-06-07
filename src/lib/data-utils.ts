
import type { ProcessedDataForPeriod, Kpi, V4PeriodData, V4BusinessDataEntry, V4PeriodTotals, AggregatedBusinessMetrics, AnalysisMode, PeriodOption } from '@/data/types';

// Helper to define formatting rules for each metric ID
type MetricFormatType = 'percentage' | 'decimal_3' | 'integer_yuan' | 'integer_wanyuan' | 'integer_count' | 'integer_generic';

interface MetricFormatRule {
  type: MetricFormatType;
  unitLabel?: string; // For KPI card unit display
}

const METRIC_FORMAT_RULES: Record<string, MetricFormatRule> = {
  'loss_ratio': { type: 'percentage' },
  'expense_ratio': { type: 'percentage' },
  'variable_cost_ratio': { type: 'percentage' },
  'premium_earned_ratio': { type: 'percentage' },
  'claim_frequency': { type: 'percentage' },
  'marginal_contribution_ratio': { type: 'percentage' },
  'premium_share': { type: 'percentage' },
  'avg_commercial_index': { type: 'decimal_3' }, // No unitLabel, will use icon
  'avg_premium_per_policy': { type: 'integer_yuan', unitLabel: '元' },
  'avg_loss_per_case': { type: 'integer_yuan', unitLabel: '元' },
  'premium_written': { type: 'integer_wanyuan', unitLabel: '万元' },
  'premium_earned': { type: 'integer_wanyuan', unitLabel: '万元' },
  'total_loss_amount': { type: 'integer_wanyuan', unitLabel: '万元' },
  'expense_amount': { type: 'integer_wanyuan', unitLabel: '万元' },
  'marginal_contribution_amount': { type: 'integer_wanyuan', unitLabel: '万元' },
  'policy_count': { type: 'integer_count', unitLabel: '件' },
  'claim_count': { type: 'integer_count', unitLabel: '件' },
  'policy_count_earned': { type: 'integer_count', unitLabel: '件' }, // Although not directly on KPI, good to have
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

const originalCoreMetricKeys: (keyof AggregatedBusinessMetrics)[] = [
    'premium_written', 'avg_premium_per_policy', 'premium_earned', 
    'claim_frequency', 'claim_count', 'avg_loss_per_case', 
    'total_loss_amount', 'loss_ratio', 'expense_ratio', 
    'variable_cost_ratio', 'avg_commercial_index'
];

const baseSummableJsonFields: (keyof V4BusinessDataEntry)[] = [
    'premium_written', 'premium_earned', 'total_loss_amount', 
    'expense_amount_raw', 'claim_count', 'policy_count_earned'
];


export const aggregateAndCalculateMetrics = (
  periodBusinessDataEntries: V4BusinessDataEntry[], 
  analysisMode: AnalysisMode,
  originalYtdEntriesForPeriod: V4BusinessDataEntry[], 
  previousPeriodYtdEntries?: V4BusinessDataEntry[] 
): AggregatedBusinessMetrics => {

  const metrics: Partial<AggregatedBusinessMetrics> = {};
  const isSingleTypeCumulative = periodBusinessDataEntries.length === 1 && analysisMode === 'cumulative';

  if (isSingleTypeCumulative) {
    const singleEntryJson = originalYtdEntriesForPeriod.find(e => e.business_type === periodBusinessDataEntries[0].business_type);

    if (singleEntryJson) {
      // Path 1: Single Business Type & Cumulative Mode - Prioritize direct use of JSON pre-calculated YTD values.
      metrics.premium_written = singleEntryJson.premium_written ?? 0;
      metrics.premium_earned = singleEntryJson.premium_earned ?? 0;
      metrics.total_loss_amount = singleEntryJson.total_loss_amount ?? 0;
      metrics.claim_count = singleEntryJson.claim_count ?? 0;
      metrics.policy_count_earned = singleEntryJson.policy_count_earned ?? 0;
      const expense_amount_raw_single = singleEntryJson.expense_amount_raw ?? 0;
      metrics.expense_amount_raw = expense_amount_raw_single;

      // For these, try JSON first, then fallback calculate using this single entry's data
      metrics.avg_premium_per_policy = (singleEntryJson.avg_premium_per_policy !== null && singleEntryJson.avg_premium_per_policy !== undefined && !isNaN(Number(singleEntryJson.avg_premium_per_policy)))
                                        ? Number(singleEntryJson.avg_premium_per_policy)
                                        : 0; // Placeholder, policy_count calculation will refine based on this

      // Derived policy_count for this single entry, crucial for consistent avg_premium_per_policy
       const derived_policy_count_single = (metrics.avg_premium_per_policy && metrics.avg_premium_per_policy !== 0 && metrics.premium_written)
                                        ? (metrics.premium_written * 10000) / metrics.avg_premium_per_policy
                                        : 0;
      // If avg_premium_per_policy was 0 or invalid from JSON, and we derived 0 policies, but premium_written exists, avg_premium_per_policy should not be 0.
      // However, the primary rule is "use JSON if available". If JSON avg_premium_per_policy is problematic, it leads to issues.
      // For now, we'll trust JSON or derived policy count.
      if (metrics.avg_premium_per_policy === 0 && metrics.premium_written !== 0 && derived_policy_count_single === 0) {
        // This indicates a potential issue with JSON's avg_premium_per_policy. Forcing a re-calc of avg_premium_per_policy if policy_count can be estimated differently is complex.
        // The current logic: if JSON avg_premium_per_policy is bad, derived_policy_count_single will be 0. Then avg_premium_per_policy will be recalculated later if policy_count is non-zero.
        // Let's assume `policy_count` gets calculated first, then `avg_premium_per_policy` is re-evaluated.

      }


      metrics.avg_loss_per_case = (singleEntryJson.avg_loss_per_case !== null &&  singleEntryJson.avg_loss_per_case !== undefined && !isNaN(Number(singleEntryJson.avg_loss_per_case)))
                                    ? Number(singleEntryJson.avg_loss_per_case)
                                    : (metrics.claim_count && metrics.claim_count !== 0 && metrics.total_loss_amount ? (metrics.total_loss_amount * 10000) / metrics.claim_count : 0);

      metrics.avg_commercial_index = singleEntryJson.avg_commercial_index ?? undefined;

      metrics.expense_ratio = (singleEntryJson.expense_ratio !== null && singleEntryJson.expense_ratio !== undefined && !isNaN(Number(singleEntryJson.expense_ratio)))
                                ? Number(singleEntryJson.expense_ratio)
                                : (metrics.premium_written !== 0 ? (expense_amount_raw_single / metrics.premium_written) * 100 : 0);

      metrics.loss_ratio = (singleEntryJson.loss_ratio !== null && singleEntryJson.loss_ratio !== undefined && !isNaN(Number(singleEntryJson.loss_ratio)))
                            ? Number(singleEntryJson.loss_ratio)
                            : (metrics.premium_earned !== 0 ? (metrics.total_loss_amount / metrics.premium_earned) * 100 : 0);
      
      metrics.claim_frequency = (singleEntryJson.claim_frequency !== null && singleEntryJson.claim_frequency !== undefined && !isNaN(Number(singleEntryJson.claim_frequency)))
                                ? Number(singleEntryJson.claim_frequency)
                                : (metrics.policy_count_earned !== 0 && metrics.claim_count ? (metrics.claim_count / metrics.policy_count_earned) * 100 : 0);
      
      // Variable cost ratio: Strictly sum of ER and LR calculated/sourced above for this single type
      metrics.variable_cost_ratio = (metrics.expense_ratio || 0) + (metrics.loss_ratio || 0);

    } else { // Fallback if singleEntryJson not found (should not happen if data is clean)
        Object.keys(metrics).forEach(k => metrics[k as keyof typeof metrics] = 0); // Zero out
        metrics.avg_commercial_index = undefined;
    }

  } else { // Path 2: Aggregate (Multi-select OR "All Types" OR any PoP mode)
    let dataToSum = periodBusinessDataEntries;
    if (analysisMode === 'periodOverPeriod' && previousPeriodYtdEntries) {
        dataToSum = periodBusinessDataEntries.map(currentYtdEntry => {
            const prevYtdEntry = previousPeriodYtdEntries.find(pe => pe.business_type === currentYtdEntry.business_type);
            const originalCurrentYtdEntryForPolicyDerivation = originalYtdEntriesForPeriod.find(e => e.business_type === currentYtdEntry.business_type) || currentYtdEntry;
            return {
                ...currentYtdEntry, 
                premium_written: (currentYtdEntry.premium_written || 0) - (prevYtdEntry?.premium_written || 0),
                premium_earned: (currentYtdEntry.premium_earned || 0) - (prevYtdEntry?.premium_earned || 0),
                total_loss_amount: (currentYtdEntry.total_loss_amount || 0) - (prevYtdEntry?.total_loss_amount || 0),
                expense_amount_raw: (currentYtdEntry.expense_amount_raw || 0) - (prevYtdEntry?.expense_amount_raw || 0),
                claim_count: (currentYtdEntry.claim_count || 0) - (prevYtdEntry?.claim_count || 0),
                policy_count_earned: (currentYtdEntry.policy_count_earned || 0) - (prevYtdEntry?.policy_count_earned || 0),
                avg_premium_per_policy: originalCurrentYtdEntryForPolicyDerivation.avg_premium_per_policy,
                // Nullify rates for PoP, they must be re-calculated
                loss_ratio: null, expense_ratio: null, variable_cost_ratio: null, premium_earned_ratio: null, claim_frequency: null, avg_loss_per_case: null, avg_commercial_index: null,
            };
        });
    }
    
    const sums = dataToSum.reduce((acc, entry) => {
        baseSummableJsonFields.forEach(key => {
          const val = entry[key];
          if (typeof val === 'number' && !isNaN(val)) {
            acc[key] = (acc[key] || 0) + val;
          } else if (acc[key] === undefined) { acc[key] = 0; }
        });
        if (analysisMode === 'periodOverPeriod') {
            const ytdAvgPremium = entry.avg_premium_per_policy; 
            const popPremiumWritten = entry.premium_written; 
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
    
    let agg_policy_count_temp = 0;
    if (analysisMode === 'periodOverPeriod') {
        agg_policy_count_temp = Math.round(sums.derived_pop_policy_count_sum ?? 0);
    } else { // Cumulative Aggregate
        let cumulative_derived_policy_count_sum = 0;
        dataToSum.forEach(entry => { 
            const pw = entry.premium_written || 0;
            const app = entry.avg_premium_per_policy; // This is original YTD avg_premium_per_policy
            if (app && app !== 0 && pw) {
                cumulative_derived_policy_count_sum += (pw * 10000 / app);
            }
        });
        agg_policy_count_temp = Math.round(cumulative_derived_policy_count_sum);
    }
    // metrics.policy_count is now a "derived" field, calculated later

    metrics.expense_ratio = metrics.premium_written !== 0 ? (expense_amount_raw_agg / metrics.premium_written) * 100 : 0;
    metrics.loss_ratio = metrics.premium_earned !== 0 ? (metrics.total_loss_amount / metrics.premium_earned) * 100 : 0;
    metrics.claim_frequency = metrics.policy_count_earned !== 0 && metrics.claim_count ? (metrics.claim_count / metrics.policy_count_earned) * 100 : 0;
    
    // avg_premium_per_policy and avg_loss_per_case are re-calculated for aggregate
    // These are also calculated later, after policy_count is finalized.

    metrics.variable_cost_ratio = (metrics.expense_ratio || 0) + (metrics.loss_ratio || 0);
    metrics.avg_commercial_index = undefined; 
  }

  // Calculate "truly derived" metrics based on the core metrics determined above.
  const current_premium_written = Number(metrics.premium_written) || 0;
  const current_premium_earned = Number(metrics.premium_earned) || 0;
  const current_total_loss_amount = Number(metrics.total_loss_amount) || 0;
  const current_expense_amount_raw = Number(metrics.expense_amount_raw) || 0;
  const current_claim_count = Number(metrics.claim_count) || 0;
  const current_policy_count_earned = Number(metrics.policy_count_earned) || 0;
  
  // Calculate/re-calculate policy_count if it wasn't fully set (e.g. for aggregate before avg_premium_per_policy finalized)
  // For single type, avg_premium_per_policy was taken from JSON or calculated from single entry.
  // For aggregate, avg_premium_per_policy depends on a temporary policy_count sum.

  // Finalize policy_count and then avg_premium_per_policy
  if (isSingleTypeCumulative) {
      // policy_count is derived from single entry's premium_written and (JSON or fallback) avg_premium_per_policy
      metrics.policy_count = (metrics.avg_premium_per_policy && metrics.avg_premium_per_policy !== 0 && current_premium_written !== 0)
                            ? Math.round((current_premium_written * 10000) / metrics.avg_premium_per_policy)
                            : 0;
  } else { // Aggregate or PoP
      // A temporary policy_count was calculated above using sum of derived policy counts (either PoP or cumulative YTD based).
      // Use that derived sum for aggregate policy_count.
      let temp_policy_count_sum = 0;
       if (analysisMode === 'periodOverPeriod') {
            let derived_pop_policy_count_sum = 0;
            const popDataToSum = periodBusinessDataEntries.map(currentYtdEntry => { // Re-calculate PoP diffs for base for policy count
                 const prevYtdEntry = previousPeriodYtdEntries?.find(pe => pe.business_type === currentYtdEntry.business_type);
                 const originalCurrentYtdEntryForPolicyDerivation = originalYtdEntriesForPeriod.find(e => e.business_type === currentYtdEntry.business_type) || currentYtdEntry;
                 return {
                    premium_written_pop: (currentYtdEntry.premium_written || 0) - (prevYtdEntry?.premium_written || 0),
                    avg_premium_per_policy_ytd: originalCurrentYtdEntryForPolicyDerivation.avg_premium_per_policy
                 }
            });
            popDataToSum.forEach(entry => {
                if (entry.avg_premium_per_policy_ytd && entry.avg_premium_per_policy_ytd !== 0 && entry.premium_written_pop) {
                    derived_pop_policy_count_sum += (entry.premium_written_pop * 10000 / entry.avg_premium_per_policy_ytd);
                }
            });
            temp_policy_count_sum = derived_pop_policy_count_sum;

        } else { // Cumulative Aggregate
            let cumulative_derived_policy_count_sum = 0;
            periodBusinessDataEntries.forEach(entry => { 
                const pw = entry.premium_written || 0; // YTD premium_written
                const app = entry.avg_premium_per_policy; // YTD avg_premium_per_policy from JSON
                if (app && app !== 0 && pw) {
                    cumulative_derived_policy_count_sum += (pw * 10000 / app);
                }
            });
            temp_policy_count_sum = cumulative_derived_policy_count_sum;
        }
        metrics.policy_count = Math.round(temp_policy_count_sum);
  }


  // Recalculate avg_premium_per_policy based on finalized policy_count
  metrics.avg_premium_per_policy = (metrics.policy_count && metrics.policy_count !== 0 && current_premium_written !== 0)
                                ? (current_premium_written * 10000) / metrics.policy_count
                                : 0;

  // Recalculate avg_loss_per_case based on finalized claim_count
  metrics.avg_loss_per_case = (current_claim_count !== 0 && current_total_loss_amount !== 0)
                            ? (current_total_loss_amount * 10000) / current_claim_count
                            : 0;


  // Ensure expense_ratio and loss_ratio are correctly derived from current values for aggregate
  if (!isSingleTypeCumulative) {
    metrics.expense_ratio = current_premium_written !== 0 ? (current_expense_amount_raw / current_premium_written) * 100 : 0;
    metrics.loss_ratio = current_premium_earned !== 0 ? (current_total_loss_amount / current_premium_earned) * 100 : 0;
    metrics.variable_cost_ratio = (metrics.expense_ratio || 0) + (metrics.loss_ratio || 0); // Strict sum after re-calc
  }
  // For single type cumulative, ER and LR were already set (from JSON or fallback), VCR was sum of those.

  // Expense Amount
  metrics.expense_amount = current_premium_written * ((metrics.expense_ratio || 0) / 100);
  
  // Premium Earned Ratio
  metrics.premium_earned_ratio = current_premium_written !== 0 
    ? (current_premium_earned / current_premium_written) * 100 
    : 0;

  // Claim Frequency
  metrics.claim_frequency = (current_policy_count_earned !== 0 && current_claim_count !== 0)
                            ? (current_claim_count / current_policy_count_earned) * 100
                            : 0;
                            
  // Marginal Contribution (always derived based on final VCR)
  metrics.marginal_contribution_ratio = 100 - (metrics.variable_cost_ratio || 0);
  metrics.marginal_contribution_amount = current_premium_earned * (metrics.marginal_contribution_ratio / 100);

  return metrics as AggregatedBusinessMetrics;
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

  if (selectedComparisonPeriodKey) { 
    momEquivalentPeriodData = allV4Data.find(p => p.period_id === selectedComparisonPeriodKey);
    yoyEquivalentPeriodData = undefined; 
  } else { 
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
    currentPeriodFilteredBusinessEntries, 
    analysisMode,
    originalYtdEntriesForCurrentPeriod, 
    analysisMode === 'periodOverPeriod' ? previousPeriodYtdForPoPBase : undefined 
  );
  
  const momAggregatedMetrics = momEquivalentPeriodData
    ? aggregateAndCalculateMetrics(
        filterRawBusinessData(momEquivalentPeriodData, selectedBusinessTypes), 
        'cumulative', 
        (momEquivalentPeriodData.business_data || []).filter(bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total')
      )
    : null;

  const yoyAggregatedMetrics = (yoyEquivalentPeriodData && !selectedComparisonPeriodKey) 
    ? aggregateAndCalculateMetrics(
        filterRawBusinessData(yoyEquivalentPeriodData, selectedBusinessTypes),
        'cumulative',
        (yoyEquivalentPeriodData.business_data || []).filter(bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total')
      )
    : null;


  let derivedBusinessLineName: string;
  const allAvailableIndividualBusinessTypesInCurrentPeriod = Array.from(new Set(
      originalYtdEntriesForCurrentPeriod.map(bt => bt.business_type)
  ));

  if (selectedBusinessTypes.length === 1 && allAvailableIndividualBusinessTypesInCurrentPeriod.includes(selectedBusinessTypes[0])) {
    derivedBusinessLineName = selectedBusinessTypes[0];
  } else if (selectedBusinessTypes.length > 0 && selectedBusinessTypes.length < allAvailableIndividualBusinessTypesInCurrentPeriod.length) {
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
    yoyMetrics: yoyAggregatedMetrics, 

    premium_written: currentAggregatedMetrics.premium_written,
    total_loss_amount: currentAggregatedMetrics.total_loss_amount,
    policy_count: currentAggregatedMetrics.policy_count,
    loss_ratio: currentAggregatedMetrics.loss_ratio,
    expense_ratio: currentAggregatedMetrics.expense_ratio,
    variable_cost_ratio: currentAggregatedMetrics.variable_cost_ratio,
    premium_share: premium_share,
    vcr_color: getDynamicColorByVCR(currentAggregatedMetrics.variable_cost_ratio),

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
        : undefined, 
    expense_ratioChange: momAggregatedMetrics?.expense_ratio !== undefined && currentAggregatedMetrics.expense_ratio !== undefined
        ? currentAggregatedMetrics.expense_ratio - momAggregatedMetrics.expense_ratio 
        : undefined, 
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
        changePercentStr = `${changeResult.percent > 0 ? '+' : ''}${changeResult.percent.toFixed(1)}%`;
    } else if (changeResult.percent === Infinity) {
        changePercentStr = "+∞%"; 
    } else if (changeResult.percent === -Infinity) {
        changePercentStr = "-∞%"; 
    }

    if (changeResult.absolute !== undefined) {
        if (isRateChange) { 
            changeAbsStr = `${changeResult.absolute > 0 ? '+' : ''}${changeResult.absolute.toFixed(1)} pp`;
        } else { 
            const formattedAbs = formatDisplayValue(Math.abs(changeResult.absolute), metricIdForAbsFormat);
            if (changeResult.absolute > 0.00001) changeAbsStr = `+${formattedAbs}`;
            else if (changeResult.absolute < -0.00001) changeAbsStr = `-${formattedAbs}`;
            else changeAbsStr = formattedAbs; 
        }
    }
    
    let effectiveChangeType = changeResult.type; 
    
    if (changeResult.absolute !== undefined && Math.abs(changeResult.absolute) < 0.00001 && !isRateChange) { 
        effectiveChangeType = 'neutral';
    }
    if (isRateChange && changeResult.absolute !== undefined && Math.abs(changeResult.absolute) < 0.05 ) { 
         effectiveChangeType = 'neutral';
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
  const secondaryComparisonMetrics = data.yoyMetrics; 

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
    
    if (metricId === 'avg_commercial_index') { 
      return { change: '-', changeAbsolute: '-', type: 'neutral' };
    }

    const changeDetails = calculateChangeAndType(currentValue, comparisonValue, valueHigherIsBetter);
    const formattedChanges = formatKpiChangeValues(changeDetails, metricId, isRateMetric, valueHigherIsBetter);
    return { change: formattedChanges.change, changeAbsolute: formattedChanges.changeAbsolute, type: formattedChanges.type };
  };

  let premWrittenIsGrowthGoodForColor = true; 
  if (current.variable_cost_ratio !== undefined && current.variable_cost_ratio >= 92) {
      premWrittenIsGrowthGoodForColor = false; 
  }
  const primaryPremWrittenChanges = createKpiComparisonFields(current.premium_written, primaryComparisonMetrics?.premium_written, 'premium_written', premWrittenIsGrowthGoodForColor, false);
  const secondaryPremWrittenChanges = secondaryComparisonMetrics
    ? createKpiComparisonFields(current.premium_written, secondaryComparisonMetrics?.premium_written, 'premium_written', premWrittenIsGrowthGoodForColor, false)
    : { type: 'neutral' as Kpi['primaryChangeType'], change: '-', changeAbsolute: '-'};

  let rawAvgCommercialIndex: number | undefined | null = undefined;
  if (selectedBusinessTypes && selectedBusinessTypes.length === 1 && analysisMode === 'cumulative') {
      rawAvgCommercialIndex = current.avg_commercial_index;
  } else {
      rawAvgCommercialIndex = undefined; 
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
      rawValue: current.marginal_contribution_amount, unit: METRIC_FORMAT_RULES['marginal_contribution_amount'].unitLabel,
      primaryComparisonLabel, ...createKpiComparisonFields(current.marginal_contribution_amount, primaryComparisonMetrics?.marginal_contribution_amount, 'marginal_contribution_amount', true, false),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.marginal_contribution_amount, secondaryComparisonMetrics.marginal_contribution_amount, 'marginal_contribution_amount', true, false) : {change: '-', changeAbsolute: '-'}),
    },
    {
      id: 'premium_written', title: '保费', 
      value: formatDisplayValue(current.premium_written, 'premium_written'), 
      rawValue: current.premium_written, unit: METRIC_FORMAT_RULES['premium_written'].unitLabel,
      primaryComparisonLabel, primaryChange: primaryPremWrittenChanges.change, primaryChangeAbsolute: primaryPremWrittenChanges.changeAbsolute, primaryChangeType: primaryPremWrittenChanges.type,
      secondaryComparisonLabel, secondaryChange: secondaryPremWrittenChanges.change, secondaryChangeAbsolute: secondaryPremWrittenChanges.changeAbsolute, secondaryChangeType: secondaryPremWrittenChanges.type,
    },
    {
      id: 'expense_amount', title: '费用', 
      value: formatDisplayValue(current.expense_amount, 'expense_amount'), 
      rawValue: current.expense_amount, unit: METRIC_FORMAT_RULES['expense_amount'].unitLabel,
      primaryComparisonLabel, ...createKpiComparisonFields(current.expense_amount, primaryComparisonMetrics?.expense_amount, 'expense_amount', false, false),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.expense_amount, secondaryComparisonMetrics.expense_amount, 'expense_amount', false, false) : {change: '-', changeAbsolute: '-'}),
    },
    {
      id: 'total_loss_amount', title: '赔款', 
      value: formatDisplayValue(current.total_loss_amount, 'total_loss_amount'), 
      rawValue: current.total_loss_amount, unit: METRIC_FORMAT_RULES['total_loss_amount'].unitLabel,
      primaryComparisonLabel, ...createKpiComparisonFields(current.total_loss_amount, primaryComparisonMetrics?.total_loss_amount, 'total_loss_amount', false, false),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.total_loss_amount, secondaryComparisonMetrics.total_loss_amount, 'total_loss_amount', false, false) : {change: '-', changeAbsolute: '-'}),
    },
    // Column 3 (Other Premiums & Counts)
     {
      id: 'premium_earned', title: '满期保费', 
      value: formatDisplayValue(current.premium_earned, 'premium_earned'), 
      rawValue: current.premium_earned, unit: METRIC_FORMAT_RULES['premium_earned'].unitLabel,
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
      rawValue: current.avg_premium_per_policy, unit: METRIC_FORMAT_RULES['avg_premium_per_policy'].unitLabel, 
      primaryComparisonLabel, ...createKpiComparisonFields(current.avg_premium_per_policy, primaryComparisonMetrics?.avg_premium_per_policy, 'avg_premium_per_policy', true, false), 
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.avg_premium_per_policy, secondaryComparisonMetrics.avg_premium_per_policy, 'avg_premium_per_policy', true, false) : {change: '-', changeAbsolute: '-'}),
    },
    {
      id: 'policy_count', title: '保单件数', 
      value: formatDisplayValue(current.policy_count, 'policy_count'), 
      rawValue: current.policy_count, unit: METRIC_FORMAT_RULES['policy_count'].unitLabel, 
      primaryComparisonLabel, ...createKpiComparisonFields(current.policy_count, primaryComparisonMetrics?.policy_count, 'policy_count', true, false),
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.policy_count, secondaryComparisonMetrics.policy_count, 'policy_count', true, false) : {change: '-', changeAbsolute: '-'}),
    },
    // Column 4 (Other Ratios & Averages)
    {
      id: 'premium_share', title: '保费占比', 
      value: formatDisplayValue(data.premium_share, 'premium_share'), 
      rawValue: data.premium_share, icon: 'Users',
      primaryComparisonLabel: undefined, primaryChange: '-', primaryChangeAbsolute: '-', primaryChangeType: 'neutral',
      secondaryComparisonLabel: undefined, secondaryChange: '-', secondaryChangeAbsolute: '-', secondaryChangeType: 'neutral',
    },
    {
      id: 'avg_commercial_index', title: '自主系数', 
      value: formatDisplayValue(rawAvgCommercialIndex, 'avg_commercial_index'), 
      rawValue: rawAvgCommercialIndex, icon: 'Search',
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
      rawValue: current.avg_loss_per_case, unit: METRIC_FORMAT_RULES['avg_loss_per_case'].unitLabel, 
      primaryComparisonLabel, ...createKpiComparisonFields(current.avg_loss_per_case, primaryComparisonMetrics?.avg_loss_per_case, 'avg_loss_per_case', false, false), 
      secondaryComparisonLabel, ...(secondaryComparisonMetrics ? createKpiComparisonFields(current.avg_loss_per_case, secondaryComparisonMetrics.avg_loss_per_case, 'avg_loss_per_case', false, false) : {change: '-', changeAbsolute: '-'}),
    },
  ];
  return kpis.map(kpi => ({
      ...kpi,
      // Assign default icons for rates/coefficients if unit is not set
      icon: kpi.unit ? undefined : (kpi.icon || 'ShieldCheck') // Fallback icon if specific one not set for a rate
  }));
};


export function setGlobalV4DataForKpiWorkaround(allV4Data: V4PeriodData[]) {
  (globalThis as any).allV4DataForKpiWorkaround = allV4Data;
}
(globalThis as any)._selectedBusinessTypesForExport = []; 
export function setSelectedBusinessTypesForExport(types: string[]) {
  (globalThis as any)._selectedBusinessTypesForExport = types;
}


export function exportToCSV(
    data: ProcessedDataForPeriod[], 
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
    const secondaryComp = item.yoyMetrics; 

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
    if (primaryComp) { 
        csvHeaders.push(...primaryCompHeaders);
    }
    if (secondaryComp) { 
        csvHeaders.push(...secondaryCompHeaders);
    }

    let rawAvgCommercialIndexForExport: number | string | undefined | null = undefined;
    const selectedBusinessTypesForExport = (globalThis as any)._selectedBusinessTypesForExport || [];
    if (selectedBusinessTypesForExport.length === 1 && analysisMode === 'cumulative') {
        rawAvgCommercialIndexForExport = current.avg_commercial_index;
    }


    const rowData: (string | number | undefined | null)[] = [
        item.businessLineId, item.businessLineName,
        current.premium_written, current.premium_earned, current.total_loss_amount, current.expense_amount,
        current.policy_count, current.claim_count, current.policy_count_earned,
        current.avg_premium_per_policy, current.avg_loss_per_case,
        rawAvgCommercialIndexForExport,
        current.loss_ratio, current.expense_ratio, current.variable_cost_ratio, current.premium_earned_ratio, current.claim_frequency,
        current.marginal_contribution_ratio, current.marginal_contribution_amount, item.premium_share
    ];

    const addComparisonRowData = (compMetrics: AggregatedBusinessMetrics | null | undefined, higherIsBetterMap: Record<string, boolean>, isRateMap: Record<string, boolean>) => {
        if (!compMetrics) {
            const placeholderArray = new Array(10).fill("-"); // Matches the number of comparison metrics
            return placeholderArray;
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
            erChange.absolute, 
            lrChange.absolute, 
            vcrChange.absolute, 
            mcrChange.absolute  
        ];
    };
    
    const higherIsBetterConfig = {
        premium_written: true, total_loss_amount: false, policy_count: true,
        expense_ratio: false, loss_ratio: false, variable_cost_ratio: false, marginal_contribution_ratio: true
    };
    const isRateConfig = { 
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
            const headerIndex = rowData.indexOf(val);
            const correspondingHeader = headerIndex !== -1 ? csvHeaders[headerIndex] : "";

            const isDefinitelyCount = ['保单数量(件)', '赔案数量(件)', '满期保单(件)'].some(suffix => correspondingHeader?.includes(suffix));
            if (isDefinitelyCount) return val.toFixed(0);

            const isRateOrPercentage = correspondingHeader?.includes('(%)') || correspondingHeader?.includes('(pp)');
             if (isRateOrPercentage) return val.toFixed(4);
            
             const isAmountYuan = correspondingHeader?.includes('(元)');
             if(isAmountYuan) return val.toFixed(2);
             const isAmountWanYuan = correspondingHeader?.includes('(万元)');
             if(isAmountWanYuan) return val.toFixed(4);

            if (correspondingHeader?.toLowerCase().includes('自主系数')) return val.toFixed(4);
            
            return val.toString(); 
        }
        return String(val).replace(/,/g, ';'); 
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + csvHeaders.join(",") + "\n"
        + rowDataStrings.join(","); // Changed from \n to , for single row CSV

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
