
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
  'policy_count_earned': { type: 'integer_count', unitLabel: '件' }, 
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
      metrics.premium_written = singleEntryJson.premium_written ?? 0;
      metrics.premium_earned = singleEntryJson.premium_earned ?? 0;
      metrics.total_loss_amount = singleEntryJson.total_loss_amount ?? 0;
      metrics.claim_count = singleEntryJson.claim_count ?? 0;
      metrics.policy_count_earned = singleEntryJson.policy_count_earned ?? 0; // This is the JSON value, will be overridden by calculation later for consistency with FIELD_DICTIONARY
      const expense_amount_raw_single = singleEntryJson.expense_amount_raw ?? 0;
      metrics.expense_amount_raw = expense_amount_raw_single;

      metrics.avg_premium_per_policy = (singleEntryJson.avg_premium_per_policy !== null && singleEntryJson.avg_premium_per_policy !== undefined && !isNaN(Number(singleEntryJson.avg_premium_per_policy)))
                                        ? Number(singleEntryJson.avg_premium_per_policy)
                                        : 0;
      
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
                                : 0; // Will be recalculated based on derived policy_count_earned
      
      metrics.variable_cost_ratio = (metrics.expense_ratio || 0) + (metrics.loss_ratio || 0);

    } else { 
        Object.keys(metrics).forEach(k => metrics[k as keyof typeof metrics] = 0); 
        metrics.avg_commercial_index = undefined;
    }

  } else { // Aggregate (Multi-select OR "All Types" OR any PoP mode)
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
                policy_count_earned: (currentYtdEntry.policy_count_earned || 0) - (prevYtdEntry?.policy_count_earned || 0), // This is diff of JSON values
                avg_premium_per_policy: originalCurrentYtdEntryForPolicyDerivation.avg_premium_per_policy,
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
        return acc;
    }, {} as Record<keyof V4BusinessDataEntry, number>);

    metrics.premium_written = sums.premium_written ?? 0;
    metrics.premium_earned = sums.premium_earned ?? 0;
    metrics.total_loss_amount = sums.total_loss_amount ?? 0;
    const expense_amount_raw_agg = sums.expense_amount_raw ?? 0;
    metrics.expense_amount_raw = expense_amount_raw_agg;
    metrics.claim_count = Math.round(sums.claim_count ?? 0);
    // policy_count_earned for aggregate is sum of diffs if PoP, or sum of YTDs if cumulative.
    // It will be recalculated based on derived policy_count and premium_earned_ratio later.
    // The sum of JSON policy_count_earned is used as an intermediate step for PoP claim_frequency.
    metrics.policy_count_earned = Math.round(sums.policy_count_earned ?? 0);


    metrics.expense_ratio = metrics.premium_written !== 0 ? (expense_amount_raw_agg / metrics.premium_written) * 100 : 0;
    metrics.loss_ratio = metrics.premium_earned !== 0 ? (metrics.total_loss_amount / metrics.premium_earned) * 100 : 0;
    // claim_frequency for aggregate needs careful handling of policy_count_earned sum.
    // It will be recalculated based on final derived policy_count_earned.
    // metrics.claim_frequency = (sums.policy_count_earned ?? 0) !== 0 && metrics.claim_count ? (metrics.claim_count / (sums.policy_count_earned ?? 0)) * 100 : 0;
    
    metrics.variable_cost_ratio = (metrics.expense_ratio || 0) + (metrics.loss_ratio || 0);
    metrics.avg_commercial_index = undefined; 
  }

  // Calculate "truly derived" metrics based on the core metrics determined above, ensuring consistency.
  const current_premium_written = Number(metrics.premium_written) || 0;
  const current_premium_earned = Number(metrics.premium_earned) || 0;
  const current_total_loss_amount = Number(metrics.total_loss_amount) || 0;
  const current_expense_amount_raw = Number(metrics.expense_amount_raw) || 0;
  const current_claim_count = Number(metrics.claim_count) || 0;
  // current_policy_count_earned from JSON (single) or sum (aggregate) - will be recalculated

  // Policy Count (始终按公式计算)
  const current_avg_premium_per_policy_intermediate = isSingleTypeCumulative 
      ? (metrics.avg_premium_per_policy || 0) // From JSON for single type
      : (current_premium_written !== 0 && // For aggregate, calculate based on sum of derived policies if possible, otherwise sum_pw / sum_pc_derived_from_json_app
          (periodBusinessDataEntries.reduce((sum, entry) => {
              const pw = analysisMode === 'periodOverPeriod' ? ((entry.premium_written || 0) - (previousPeriodYtdEntries?.find(p => p.business_type === entry.business_type)?.premium_written || 0)) : (entry.premium_written || 0);
              const app_ytd = originalYtdEntriesForPeriod.find(o => o.business_type === entry.business_type)?.avg_premium_per_policy;
              return sum + (app_ytd && app_ytd !== 0 && pw ? (pw * 10000 / app_ytd) : 0);
          }, 0)) !== 0 ?
          (current_premium_written * 10000 / (periodBusinessDataEntries.reduce((sum, entry) => {
              const pw = analysisMode === 'periodOverPeriod' ? ((entry.premium_written || 0) - (previousPeriodYtdEntries?.find(p => p.business_type === entry.business_type)?.premium_written || 0)) : (entry.premium_written || 0);
              const app_ytd = originalYtdEntriesForPeriod.find(o => o.business_type === entry.business_type)?.avg_premium_per_policy;
              return sum + (app_ytd && app_ytd !== 0 && pw ? (pw * 10000 / app_ytd) : 0);
          }, 0)))
          : 0
        );

  metrics.policy_count = (current_avg_premium_per_policy_intermediate && current_avg_premium_per_policy_intermediate !== 0 && current_premium_written !== 0)
                        ? Math.round((current_premium_written * 10000) / current_avg_premium_per_policy_intermediate)
                        : 0;
  
  // Recalculate avg_premium_per_policy based on finalized policy_count
  metrics.avg_premium_per_policy = (metrics.policy_count && metrics.policy_count !== 0 && current_premium_written !== 0)
                                ? (current_premium_written * 10000) / metrics.policy_count
                                : 0;
  
  // Premium Earned Ratio
  metrics.premium_earned_ratio = current_premium_written !== 0 
    ? (current_premium_earned / current_premium_written) * 100 
    : 0;

  // Policy Count Earned (始终按公式计算)
  metrics.policy_count_earned = Math.round(metrics.policy_count * (metrics.premium_earned_ratio / 100));

  // Recalculate claim_frequency based on derived policy_count_earned
  metrics.claim_frequency = (metrics.policy_count_earned !== 0 && current_claim_count !== 0)
                            ? (current_claim_count / metrics.policy_count_earned) * 100
                            : 0;

  // Recalculate avg_loss_per_case based on finalized claim_count
  metrics.avg_loss_per_case = (current_claim_count !== 0 && current_total_loss_amount !== 0) // Use current_total_loss_amount here
                            ? (current_total_loss_amount * 10000) / current_claim_count
                            : 0;

  // Ensure expense_ratio and loss_ratio are correctly derived from current values
  metrics.expense_ratio = current_premium_written !== 0 ? (current_expense_amount_raw / current_premium_written) * 100 : 0;
  metrics.loss_ratio = current_premium_earned !== 0 ? (current_total_loss_amount / current_premium_earned) * 100 : 0;
  metrics.variable_cost_ratio = (metrics.expense_ratio || 0) + (metrics.loss_ratio || 0);
  
  // Expense Amount
  metrics.expense_amount = current_premium_written * ((metrics.expense_ratio || 0) / 100);
                                
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
  selectedComparisonPeriodKeyForKpi: string | null, // Renamed for clarity
  analysisMode: AnalysisMode,
  selectedBusinessTypes: string[]
): ProcessedDataForPeriod[] => {
  const currentPeriodData = allV4Data.find(p => p.period_id === selectedPeriodId);
  if (!currentPeriodData) return [];

  // Determine the actual comparison period for KPIs
  let actualComparisonPeriodIdForKpi: string | null = selectedComparisonPeriodKeyForKpi;
  if (!actualComparisonPeriodIdForKpi) { // If no specific comparison period is selected by user
      actualComparisonPeriodIdForKpi = currentPeriodData.comparison_period_id_mom || null;
  }
  const comparisonPeriodDataForKpi = actualComparisonPeriodIdForKpi 
    ? allV4Data.find(p => p.period_id === actualComparisonPeriodIdForKpi) 
    : undefined;
  
  const originalYtdEntriesForCurrentPeriod = (currentPeriodData.business_data || []).filter(
    bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total'
  );
  const currentPeriodFilteredBusinessEntries = filterRawBusinessData(currentPeriodData, selectedBusinessTypes);


  let previousPeriodYtdForPoPBase: V4BusinessDataEntry[] | undefined = undefined;
  // For PoP mode, the base for subtraction is ALWAYS the immediate previous period's YTD (mom)
  const momForPoPBasePeriodData = currentPeriodData.comparison_period_id_mom 
    ? allV4Data.find(p => p.period_id === currentPeriodData.comparison_period_id_mom)
    : undefined;

  if (analysisMode === 'periodOverPeriod' && momForPoPBasePeriodData) {
      previousPeriodYtdForPoPBase = filterRawBusinessData(momForPoPBasePeriodData, selectedBusinessTypes);
  }


  const currentAggregatedMetrics = aggregateAndCalculateMetrics(
    currentPeriodFilteredBusinessEntries, 
    analysisMode,
    originalYtdEntriesForCurrentPeriod, 
    analysisMode === 'periodOverPeriod' ? previousPeriodYtdForPoPBase : undefined 
  );
  
  // momMetrics in ProcessedDataForPeriod will store the metrics for the determined comparison period for KPIs
  const momAggregatedMetrics = comparisonPeriodDataForKpi
    ? aggregateAndCalculateMetrics(
        filterRawBusinessData(comparisonPeriodDataForKpi, selectedBusinessTypes), 
        'cumulative', // Comparison period metrics are always YTD cumulative for KPI comparison
        (comparisonPeriodDataForKpi.business_data || []).filter(bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total')
      )
    : null;

  // yoyMetrics can be deprecated for KPI card if only one comparison line is shown.
  // If it's still needed for other potential uses, it can be calculated here.
  // For now, with the new requirement, it's not directly used by KPI cards.
  const yoyEquivalentPeriodData = (!selectedComparisonPeriodKeyForKpi && currentPeriodData.comparison_period_id_yoy)
    ? allV4Data.find(p => p.period_id === currentPeriodData.comparison_period_id_yoy)
    : undefined;

  const yoyAggregatedMetrics = yoyEquivalentPeriodData
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
  } else { // selectedBusinessTypes.length === 0 OR all types are selected
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
    momMetrics: momAggregatedMetrics, // This now holds the single comparison period's data
    yoyMetrics: yoyAggregatedMetrics, // Kept for potential other uses, but not primary for KPI card

    premium_written: currentAggregatedMetrics.premium_written,
    total_loss_amount: currentAggregatedMetrics.total_loss_amount,
    policy_count: currentAggregatedMetrics.policy_count,
    loss_ratio: currentAggregatedMetrics.loss_ratio,
    expense_ratio: currentAggregatedMetrics.expense_ratio,
    variable_cost_ratio: currentAggregatedMetrics.variable_cost_ratio,
    premium_share: premium_share,
    vcr_color: getDynamicColorByVCR(currentAggregatedMetrics.variable_cost_ratio),
  };

  return [processedEntry]; 
};


export function calculateChangeAndType (current?: number | null, previous?: number | null, higherIsBetter: boolean = true): { percent?: number, absolute?: number, type: Kpi['comparisonChangeType'] } {
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

  let type: Kpi['comparisonChangeType'] = 'neutral';
  const epsilon = 0.00001; 
  if (absolute > epsilon) type = higherIsBetter ? 'positive' : 'negative';
  if (absolute < -epsilon) type = higherIsBetter ? 'negative' : 'positive';
  
  return { percent, absolute, type };
};


const formatKpiChangeValues = (
    changeResult: { percent?: number, absolute?: number, type: Kpi['comparisonChangeType'] },
    metricIdForAbsFormat: string, 
    isRateChange: boolean = false
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
  const comparisonMetrics = data.momMetrics; // This now holds the single, relevant comparison period data

  if (!current) return [];

  let actualComparisonPeriodForLabel: string | undefined;
  if (selectedComparisonPeriodKey) {
      actualComparisonPeriodForLabel = allPeriodOptions.find(p => p.value === selectedComparisonPeriodKey)?.label;
  } else { // Defaulting to MoM
      const currentPeriodEntry = (globalThis as any).allV4DataForKpiWorkaround?.find((p: V4PeriodData) => p.period_id === activePeriodId);
      if (currentPeriodEntry?.comparison_period_id_mom) {
          actualComparisonPeriodForLabel = allPeriodOptions.find(p => p.value === currentPeriodEntry.comparison_period_id_mom)?.label;
      }
  }
  
  const comparisonLabel = selectedComparisonPeriodKey 
    ? (actualComparisonPeriodForLabel ? `对比 ${actualComparisonPeriodForLabel}` : "对比所选周期")
    : "环比";


  const createKpiComparisonFields = (
    currentValue: number | undefined | null,
    compValue: number | undefined | null,
    metricId: string, 
    valueHigherIsBetter: boolean, 
    isRateMetric: boolean 
  ): { comparisonChange?: string; comparisonChangeAbsolute?: string; comparisonChangeType: Kpi['comparisonChangeType'] } => {
    
    if (metricId === 'avg_commercial_index') { 
        // For avg_commercial_index, if current value is '-', comparison should also be '-'
        const currentDisplayValue = formatDisplayValue(currentValue, metricId);
        if (currentDisplayValue === '-') {
             return { comparisonChange: '-', comparisonChangeAbsolute: '-', comparisonChangeType: 'neutral' };
        }
    }
    if (compValue === undefined || compValue === null) { // If no comparison data
         return { comparisonChange: '-', comparisonChangeAbsolute: '-', comparisonChangeType: 'neutral' };
    }

    const changeDetails = calculateChangeAndType(currentValue, compValue, valueHigherIsBetter);
    const formattedChanges = formatKpiChangeValues(changeDetails, metricId, isRateMetric);
    return { comparisonChange: formattedChanges.change, comparisonChangeAbsolute: formattedChanges.changeAbsolute, comparisonChangeType: formattedChanges.type };
  };

  let premWrittenIsGrowthGoodForColor = true; 
  if (current.variable_cost_ratio !== undefined && current.variable_cost_ratio >= 92) {
      premWrittenIsGrowthGoodForColor = false; 
  }
  const premWrittenChanges = createKpiComparisonFields(current.premium_written, comparisonMetrics?.premium_written, 'premium_written', premWrittenIsGrowthGoodForColor, false);
  
  let rawAvgCommercialIndex: number | undefined | null = current.avg_commercial_index;
  // avg_commercial_index is only valid for single business type in cumulative mode.
  // aggregateAndCalculateMetrics already sets it to undefined for aggregates or PoP.
  // So, if it's undefined here, it means it's an aggregate or PoP.
  if (rawAvgCommercialIndex === undefined) {
    // This ensures that if rawAvgCommercialIndex is undefined (due to aggregation or PoP),
    // its KPI card will show '-', and comparison fields will also be '-'.
  }


  const kpis: Kpi[] = [
    {
      id: 'marginal_contribution_ratio', title: '边际贡献率', 
      value: formatDisplayValue(current.marginal_contribution_ratio, 'marginal_contribution_ratio'), 
      rawValue: current.marginal_contribution_ratio, icon: 'Ratio',
      comparisonLabel, ...createKpiComparisonFields(current.marginal_contribution_ratio, comparisonMetrics?.marginal_contribution_ratio, 'marginal_contribution_ratio', true, true),
    },
    {
      id: 'variable_cost_ratio', title: '变动成本率', 
      value: formatDisplayValue(current.variable_cost_ratio, 'variable_cost_ratio'), 
      rawValue: current.variable_cost_ratio, icon: 'Zap', 
      isBorderRisk: current.variable_cost_ratio !== undefined && current.variable_cost_ratio >= 90,
      comparisonLabel, ...createKpiComparisonFields(current.variable_cost_ratio, comparisonMetrics?.variable_cost_ratio, 'variable_cost_ratio', false, true),
    },
    {
      id: 'expense_ratio', title: '费用率', 
      value: formatDisplayValue(current.expense_ratio, 'expense_ratio'), 
      rawValue: current.expense_ratio, icon: 'Percent', 
      isOrangeRisk: current.expense_ratio !== undefined && current.expense_ratio > 14.5,
      comparisonLabel, ...createKpiComparisonFields(current.expense_ratio, comparisonMetrics?.expense_ratio, 'expense_ratio', false, true),
    },
    {
      id: 'loss_ratio', title: '满期赔付率', 
      value: formatDisplayValue(current.loss_ratio, 'loss_ratio'), 
      rawValue: current.loss_ratio, icon: 'ShieldCheck', 
      isRisk: current.loss_ratio !== undefined && current.loss_ratio > 70, 
      description: "基于已报告赔款",
      comparisonLabel, ...createKpiComparisonFields(current.loss_ratio, comparisonMetrics?.loss_ratio, 'loss_ratio', false, true),
    },
    {
      id: 'marginal_contribution_amount', title: '边贡额', 
      value: formatDisplayValue(current.marginal_contribution_amount, 'marginal_contribution_amount'), 
      rawValue: current.marginal_contribution_amount, unit: METRIC_FORMAT_RULES['marginal_contribution_amount'].unitLabel,
      comparisonLabel, ...createKpiComparisonFields(current.marginal_contribution_amount, comparisonMetrics?.marginal_contribution_amount, 'marginal_contribution_amount', true, false),
    },
    {
      id: 'premium_written', title: '保费', 
      value: formatDisplayValue(current.premium_written, 'premium_written'), 
      rawValue: current.premium_written, unit: METRIC_FORMAT_RULES['premium_written'].unitLabel,
      comparisonLabel, comparisonChange: premWrittenChanges.comparisonChange, comparisonChangeAbsolute: premWrittenChanges.comparisonChangeAbsolute, comparisonChangeType: premWrittenChanges.comparisonChangeType,
    },
    {
      id: 'expense_amount', title: '费用', 
      value: formatDisplayValue(current.expense_amount, 'expense_amount'), 
      rawValue: current.expense_amount, unit: METRIC_FORMAT_RULES['expense_amount'].unitLabel,
      comparisonLabel, ...createKpiComparisonFields(current.expense_amount, comparisonMetrics?.expense_amount, 'expense_amount', false, false),
    },
    {
      id: 'total_loss_amount', title: '赔款', 
      value: formatDisplayValue(current.total_loss_amount, 'total_loss_amount'), 
      rawValue: current.total_loss_amount, unit: METRIC_FORMAT_RULES['total_loss_amount'].unitLabel,
      comparisonLabel, ...createKpiComparisonFields(current.total_loss_amount, comparisonMetrics?.total_loss_amount, 'total_loss_amount', false, false),
    },
     {
      id: 'premium_earned', title: '满期保费', 
      value: formatDisplayValue(current.premium_earned, 'premium_earned'), 
      rawValue: current.premium_earned, unit: METRIC_FORMAT_RULES['premium_earned'].unitLabel,
      comparisonLabel, ...createKpiComparisonFields(current.premium_earned, comparisonMetrics?.premium_earned, 'premium_earned', true, false),
    },
    {
      id: 'premium_earned_ratio', title: '保费满期率', 
      value: formatDisplayValue(current.premium_earned_ratio, 'premium_earned_ratio'), 
      rawValue: current.premium_earned_ratio, icon: 'Ratio',
      comparisonLabel, ...createKpiComparisonFields(current.premium_earned_ratio, comparisonMetrics?.premium_earned_ratio, 'premium_earned_ratio', true, true),
    },
    {
      id: 'avg_premium_per_policy', title: '单均保费', 
      value: formatDisplayValue(current.avg_premium_per_policy, 'avg_premium_per_policy'), 
      rawValue: current.avg_premium_per_policy, unit: METRIC_FORMAT_RULES['avg_premium_per_policy'].unitLabel, 
      comparisonLabel, ...createKpiComparisonFields(current.avg_premium_per_policy, comparisonMetrics?.avg_premium_per_policy, 'avg_premium_per_policy', true, false), 
    },
    {
      id: 'policy_count', title: '保单件数', 
      value: formatDisplayValue(current.policy_count, 'policy_count'), 
      rawValue: current.policy_count, unit: METRIC_FORMAT_RULES['policy_count'].unitLabel, 
      comparisonLabel, ...createKpiComparisonFields(current.policy_count, comparisonMetrics?.policy_count, 'policy_count', true, false),
    },
    {
      id: 'premium_share', title: '保费占比', 
      value: formatDisplayValue(data.premium_share, 'premium_share'), 
      rawValue: data.premium_share, icon: 'Users',
      comparisonLabel: undefined, comparisonChange: '-', comparisonChangeAbsolute: '-', comparisonChangeType: 'neutral',
    },
    {
      id: 'avg_commercial_index', title: '自主系数', 
      value: formatDisplayValue(rawAvgCommercialIndex, 'avg_commercial_index'), 
      rawValue: rawAvgCommercialIndex, icon: 'Search',
      comparisonLabel: undefined, 
      ...createKpiComparisonFields(rawAvgCommercialIndex, comparisonMetrics?.avg_commercial_index, 'avg_commercial_index', true, false) // true/false for higherIsBetter doesn't matter much if value is '-'
    },
    {
      id: 'claim_frequency', title: '满期出险率', 
      value: formatDisplayValue(current.claim_frequency, 'claim_frequency'), 
      rawValue: current.claim_frequency, icon: 'Activity',
      comparisonLabel, ...createKpiComparisonFields(current.claim_frequency, comparisonMetrics?.claim_frequency, 'claim_frequency', false, true),
    },
    {
      id: 'avg_loss_per_case', title: '案均赔款', 
      value: formatDisplayValue(current.avg_loss_per_case, 'avg_loss_per_case'), 
      rawValue: current.avg_loss_per_case, unit: METRIC_FORMAT_RULES['avg_loss_per_case'].unitLabel, 
      comparisonLabel, ...createKpiComparisonFields(current.avg_loss_per_case, comparisonMetrics?.avg_loss_per_case, 'avg_loss_per_case', false, false), 
    },
  ];
  return kpis.map(kpi => ({
      ...kpi,
      icon: kpi.unit ? undefined : (kpi.icon || 'ShieldCheck') 
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
    allPeriodOptions: PeriodOption[],
    activePeriodId: string // Added activePeriodId for more accurate default MoM label
) {
    if (!data || data.length === 0 || !data[0].currentMetrics) {
        console.warn("No data to export or currentMetrics missing.");
        return;
    }

    const item = data[0];
    const current = item.currentMetrics;
    const comparisonMetrics = item.momMetrics; // This holds the single comparison data

    let comparisonColumnLabelPrefix = "环比";
    if (selectedComparisonPeriodKey) {
        const compPeriod = allPeriodOptions.find(p => p.value === selectedComparisonPeriodKey);
        comparisonColumnLabelPrefix = compPeriod ? `对比${compPeriod.label}` : "对比所选周期";
    } else {
        const currentPeriodEntry = (globalThis as any).allV4DataForKpiWorkaround?.find((p: V4PeriodData) => p.period_id === activePeriodId);
        if (currentPeriodEntry?.comparison_period_id_mom) {
             const momLabel = allPeriodOptions.find(p => p.value === currentPeriodEntry.comparison_period_id_mom)?.label;
             if (momLabel) comparisonColumnLabelPrefix = `对比${momLabel}`;
        }
    }


    const headersBase = [
        "业务线ID", "业务线名称",
        "跟单保费(万元)", "满期保费(万元)", "总赔款(万元)", "费用(额)(万元)",
        "保单数量(件)", "赔案数量(件)", "满期保单(件)",
        "单均保费(元)", "案均赔款(元)", "自主系数",
        "满期赔付率(%)", "费用率(%)", "变动成本率(%)", "保费满期率(%)", "满期出险率(%)",
        "边际贡献率(%)", "边贡额(万元)", "保费占比(%)"
    ];
    
    const comparisonHeaders = [
        `跟单保费${comparisonColumnLabelPrefix}(%)`, `跟单保费${comparisonColumnLabelPrefix}绝对值(万元)`,
        `总赔款${comparisonColumnLabelPrefix}(%)`, `总赔款${comparisonColumnLabelPrefix}绝对值(万元)`,
        `保单数量${comparisonColumnLabelPrefix}(%)`, `保单数量${comparisonColumnLabelPrefix}绝对值(件)`,
        `费用率${comparisonColumnLabelPrefix}(pp)`, `满期赔付率${comparisonColumnLabelPrefix}(pp)`,
        `变动成本率${comparisonColumnLabelPrefix}(pp)`, `边际贡献率${comparisonColumnLabelPrefix}(pp)`
    ];
    
    let csvHeaders = [...headersBase];
    if (comparisonMetrics) { 
        csvHeaders.push(...comparisonHeaders);
    }

    let rawAvgCommercialIndexForExport: number | string | undefined | null = current.avg_commercial_index;
    // Already handled in calculateKpis and aggregateAndCalculateMetrics to be undefined if aggregate.
    // formatDisplayValue will turn undefined/null to '-'. For CSV, keep raw.


    const rowData: (string | number | undefined | null)[] = [
        item.businessLineId, item.businessLineName,
        current.premium_written, current.premium_earned, current.total_loss_amount, current.expense_amount,
        current.policy_count, current.claim_count, current.policy_count_earned,
        current.avg_premium_per_policy, current.avg_loss_per_case,
        rawAvgCommercialIndexForExport, // Keep as number or null for CSV precision
        current.loss_ratio, current.expense_ratio, current.variable_cost_ratio, current.premium_earned_ratio, current.claim_frequency,
        current.marginal_contribution_ratio, current.marginal_contribution_amount, item.premium_share
    ];

    const addComparisonRowData = (compMetrics: AggregatedBusinessMetrics | null | undefined, higherIsBetterMap: Record<string, boolean>) => {
        if (!compMetrics) {
            const placeholderArray = new Array(10).fill(""); // Use empty string for CSV
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

    if (comparisonMetrics) {
        rowData.push(...addComparisonRowData(comparisonMetrics, higherIsBetterConfig));
    }
    
    const rowDataStrings = rowData.map(val => {
        if (val === undefined || val === null || (typeof val === 'number' && isNaN(val))) return ""; // Empty string for CSV
        if (typeof val === 'number') {
            // For CSV, output numbers with more precision, not formatted display strings
            // For example, percentages as 68.5 instead of "68.5%"
            // And amounts in their raw scale (e.g. 12345.67 for万元)
             const headerIndex = rowData.indexOf(val); // This might be fragile if val is not unique
             // A better way would be to map based on known metric IDs if possible
            // For now, a simple heuristic for precision:
            if (val % 1 !== 0) { // if it has decimal part
                if (Math.abs(val) < 0.00001 && Math.abs(val) !== 0) return val.toExponential(4); // very small numbers
                return val.toFixed(4); // default to 4 decimal places for rates/ratios
            }
            return val.toString(); // integers as is
        }
        return String(val).replace(/,/g, ';'); 
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + csvHeaders.join(",") + "\n"
        + rowDataStrings.join(","); 

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
