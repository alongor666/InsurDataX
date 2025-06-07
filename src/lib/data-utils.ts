
import type { ProcessedDataForPeriod, Kpi, V4PeriodData, V4BusinessDataEntry, V4PeriodTotals, AggregatedBusinessMetrics, AnalysisMode } from '@/data/types';

// Helper to define formatting rules for each metric ID
type MetricFormatType = 'percentage' | 'decimal_3' | 'integer_yuan' | 'integer_wanyuan' | 'integer_count' | 'integer_generic';

interface MetricFormatRule {
  type: MetricFormatType;
  // Suffix for changes, e.g., "pp" for percentage points, typically not displayed per new rules, but handled by type.
}

const METRIC_FORMAT_RULES: Record<string, MetricFormatRule> = {
  // Percentages (1 decimal, shows %)
  'loss_ratio': { type: 'percentage' }, // 满期赔付率
  'expense_ratio': { type: 'percentage' }, // 费用率
  'variable_cost_ratio': { type: 'percentage' }, // 变动成本率
  'premium_earned_ratio': { type: 'percentage' }, // 保费满期率
  'claim_frequency': { type: 'percentage' }, // 满期出险率
  'marginal_contribution_ratio': { type: 'percentage' }, // 边际贡献率
  'premium_share': { type: 'percentage' }, // 保费占比

  // Autonomous Coefficient (3 decimals)
  'avg_commercial_index': { type: 'decimal_3' }, // 自主系数

  // Monetary - Yuan (integer)
  'avg_premium_per_policy': { type: 'integer_yuan' }, // 单均保费
  'avg_loss_per_case': { type: 'integer_yuan' }, // 案均赔款

  // Monetary - Wan Yuan (integer)
  'premium_written': { type: 'integer_wanyuan' }, // 跟单保费
  'premium_earned': { type: 'integer_wanyuan' }, // 满期保费
  'total_loss_amount': { type: 'integer_wanyuan' }, // 总赔款
  'expense_amount': { type: 'integer_wanyuan' }, // 费用额
  'marginal_contribution_amount': { type: 'integer_wanyuan' }, // 边贡额

  // Counts (integer)
  'policy_count': { type: 'integer_count' }, // 保单数量
  'claim_count': { type: 'integer_count' }, // 赔案数量
  'policy_count_earned': { type: 'integer_count' }, // 满期保单
};

export const formatDisplayValue = (
  rawValue: number | undefined | null,
  metricId: string
): string => {
  if (rawValue === undefined || rawValue === null || isNaN(rawValue)) {
    return '-'; // Consistent placeholder for invalid/missing data
  }

  const rule = METRIC_FORMAT_RULES[metricId];

  if (!rule) { // Fallback for unspecified metrics
    return Math.round(rawValue).toString();
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
      return Math.round(rawValue).toString();
    default:
      return Math.round(rawValue).toString();
  }
};


// Deprecated, use formatDisplayValue
export const formatCurrency = (value: number | undefined | null, displayUnit: '万元' | '元' = '万元'): string => {
  if (value === undefined || isNaN(value) || value === null) return 'N/A';
  // This function is now mostly for internal logic if needed, UI should use formatDisplayValue
  if (displayUnit === '万元') {
    return `${value.toFixed(2)} 万元`; // Retain for possible internal use
  } else {
    return `${new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(value))} 元`;
  }
};

// Deprecated, use formatDisplayValue
export const formatNumber = (value: number | undefined | null): string => {
  if (value === undefined || isNaN(value) || value === null) return 'N/A';
   return Math.round(value).toString(); // To be replaced by formatDisplayValue
};

// Deprecated, use formatDisplayValue
export const formatPercentage = (value: number | undefined | null, decimals: number = 1): string => {
  if (value === undefined || isNaN(value) || value === null) return 'N/A';
  return `${value.toFixed(decimals)}%`; // To be replaced by formatDisplayValue
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
    light = L_deep + normalizedVcr * (L_light - L_deep);
  } else if (vcr >= 88 && vcr < 92) { 
    hue = blueHue; sat = blueSat;
    const vcr_blue_lower_bound = 88;
    const vcr_blue_upper_bound = 91.99;
    const normalizedVcr = Math.max(0, Math.min(1, (vcr - vcr_blue_lower_bound) / (vcr_blue_upper_bound - vcr_blue_lower_bound)));
    light = L_deep + normalizedVcr * (L_light - L_deep);
  } else { 
    hue = redHue; sat = redSat;
    const vcr_red_lower_bound = 92;
    const vcr_red_upper_bound = 130; 
    const normalizedVcr = Math.max(0, Math.min(1, (vcr - vcr_red_lower_bound) / (vcr_red_upper_bound - vcr_red_lower_bound)));
    light = L_light - normalizedVcr * (L_light - L_deep);
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

  const loss_ratio = premium_earned !== 0 ? (total_loss_amount / premium_earned) * 100 : 0;
  const expense_ratio = premium_written !== 0 ? (expense_amount_raw / premium_written) * 100 : 0;
  const premium_earned_ratio = premium_written !== 0 ? (premium_earned / premium_written) * 100 : 0;
  const claim_frequency = policy_count_earned_raw !== 0 ? (claim_count_raw / policy_count_earned_raw) * 100 : 0;
  const avg_loss_per_case = claim_count_raw !== 0 ? (total_loss_amount * 10000) / claim_count_raw : 0;
  const avg_premium_per_policy_recalc = policy_count !== 0 ? (premium_written * 10000) / policy_count : 0;

  const expense_amount = premium_written * (expense_ratio / 100);
  const variable_cost_ratio = loss_ratio + expense_ratio; 
  
  const marginal_contribution_ratio = 100 - variable_cost_ratio;
  const marginal_contribution_amount = premium_earned * (marginal_contribution_ratio / 100);


  return {
    premium_written,
    premium_earned,
    total_loss_amount,
    expense_amount_raw,
    policy_count: Math.round(policy_count),
    claim_count: Math.round(claim_count_raw),
    policy_count_earned: Math.round(policy_count_earned_raw),
    avg_commercial_index: entry.avg_commercial_index, 
    
    loss_ratio,
    expense_ratio,
    variable_cost_ratio,
    premium_earned_ratio,
    claim_frequency,
    avg_premium_per_policy: avg_premium_per_policy_recalc,
    avg_loss_per_case,
    expense_amount,
    marginal_contribution_ratio,
    marginal_contribution_amount,
  };
};


export const aggregateAndCalculateMetrics = (
  periodBusinessDataEntries: V4BusinessDataEntry[], 
  analysisMode: AnalysisMode,
  originalYtdEntriesForPeriod: V4BusinessDataEntry[], 
  previousPeriodYtdEntries?: V4BusinessDataEntry[] 
): AggregatedBusinessMetrics => {
  
  let dataToProcess: V4BusinessDataEntry[] = periodBusinessDataEntries;

  if (analysisMode === 'periodOverPeriod' && previousPeriodYtdEntries) {
    dataToProcess = periodBusinessDataEntries.map(currentYtdEntry => {
      const prevYtdEntry = previousPeriodYtdEntries.find(pe => pe.business_type === currentYtdEntry.business_type);
      
      const actual_premium_written = (currentYtdEntry.premium_written || 0) - (prevYtdEntry?.premium_written || 0);
      const actual_premium_earned = (currentYtdEntry.premium_earned || 0) - (prevYtdEntry?.premium_earned || 0);
      const actual_total_loss_amount = (currentYtdEntry.total_loss_amount || 0) - (prevYtdEntry?.total_loss_amount || 0);
      const actual_expense_amount_raw = (currentYtdEntry.expense_amount_raw || 0) - (prevYtdEntry?.expense_amount_raw || 0);
      const actual_claim_count = (currentYtdEntry.claim_count || 0) - (prevYtdEntry?.claim_count || 0);
      const actual_policy_count_earned = (currentYtdEntry.policy_count_earned || 0) - (prevYtdEntry?.policy_count_earned || 0);

      const originalCurrentYtdEntry = originalYtdEntriesForPeriod.find(e => e.business_type === currentYtdEntry.business_type);

      return {
        ...currentYtdEntry, 
        premium_written: actual_premium_written,
        premium_earned: actual_premium_earned,
        total_loss_amount: actual_total_loss_amount,
        expense_amount_raw: actual_expense_amount_raw,
        claim_count: actual_claim_count,
        policy_count_earned: actual_policy_count_earned,
        avg_premium_per_policy: originalCurrentYtdEntry?.avg_premium_per_policy, 
        loss_ratio: null, 
        expense_ratio: null,
        variable_cost_ratio: null,
        premium_earned_ratio: null,
        claim_frequency: null,
        avg_loss_per_case: null,
      };
    });
  }

  const individualMetricsArray = dataToProcess.map(entry => 
    calculateBaseMetricsForSingleEntry(entry, analysisMode === 'periodOverPeriod')
  );

  if (periodBusinessDataEntries.length === 1) {
    const singleCalculatedMetrics = individualMetricsArray[0];
    if (analysisMode === 'cumulative') {
      const originalJsonEntry = originalYtdEntriesForPeriod.find(e => e.business_type === periodBusinessDataEntries[0].business_type) || periodBusinessDataEntries[0];
      
      let result: AggregatedBusinessMetrics = {
        ...singleCalculatedMetrics, 
        premium_written: originalJsonEntry.premium_written || 0,
        premium_earned: originalJsonEntry.premium_earned || 0,
        total_loss_amount: originalJsonEntry.total_loss_amount || 0,
        expense_amount_raw: originalJsonEntry.expense_amount_raw || 0,
        claim_count: Math.round(originalJsonEntry.claim_count || 0),
        policy_count_earned: Math.round(originalJsonEntry.policy_count_earned || 0),
        avg_commercial_index: originalJsonEntry.avg_commercial_index, 
        policy_count: Math.round(singleCalculatedMetrics.policy_count), 
        
        loss_ratio: typeof originalJsonEntry.loss_ratio === 'number' ? originalJsonEntry.loss_ratio : singleCalculatedMetrics.loss_ratio,
        expense_ratio: typeof originalJsonEntry.expense_ratio === 'number' ? originalJsonEntry.expense_ratio : singleCalculatedMetrics.expense_ratio,
        premium_earned_ratio: typeof originalJsonEntry.premium_earned_ratio === 'number' ? originalJsonEntry.premium_earned_ratio : singleCalculatedMetrics.premium_earned_ratio,
        claim_frequency: typeof originalJsonEntry.claim_frequency === 'number' ? originalJsonEntry.claim_frequency : singleCalculatedMetrics.claim_frequency,
        avg_loss_per_case: typeof originalJsonEntry.avg_loss_per_case === 'number' ? originalJsonEntry.avg_loss_per_case : singleCalculatedMetrics.avg_loss_per_case,
        avg_premium_per_policy: typeof originalJsonEntry.avg_premium_per_policy === 'number' ? originalJsonEntry.avg_premium_per_policy : singleCalculatedMetrics.avg_premium_per_policy,
        expense_amount: 0,
        variable_cost_ratio: 0,
        marginal_contribution_ratio: 0,
        marginal_contribution_amount: 0,
      };
      result.expense_amount = result.premium_written * (result.expense_ratio / 100);
      result.variable_cost_ratio = result.loss_ratio + result.expense_ratio; 
      result.marginal_contribution_ratio = 100 - result.variable_cost_ratio;
      result.marginal_contribution_amount = result.premium_earned * (result.marginal_contribution_ratio / 100);
      return result;
    }
    return singleCalculatedMetrics; 
  }

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
  const agg_premium_earned_ratio = aggregated.premium_written !== 0 ? (aggregated.premium_earned / aggregated.premium_written) * 100 : 0;
  const agg_claim_frequency = aggregated.policy_count_earned !== 0 ? (aggregated.claim_count / aggregated.policy_count_earned) * 100 : 0;
  const agg_avg_premium_per_policy = aggregated.policy_count !== 0 ? (aggregated.premium_written * 10000) / aggregated.policy_count : 0;
  const agg_avg_loss_per_case = aggregated.claim_count !== 0 ? (aggregated.total_loss_amount * 10000) / aggregated.claim_count : 0;
  
  const agg_expense_amount = aggregated.premium_written * (agg_expense_ratio / 100);
  const agg_variable_cost_ratio = agg_loss_ratio + agg_expense_ratio;
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
  analysisMode: AnalysisMode,
  selectedBusinessTypes: string[]
): ProcessedDataForPeriod[] => {
  const currentPeriodData = allV4Data.find(p => p.period_id === selectedPeriodId);
  if (!currentPeriodData) return [];

  const momPeriodId = currentPeriodData.comparison_period_id_mom;
  const momOriginalPeriodData = momPeriodId ? allV4Data.find(p => p.period_id === momPeriodId) : undefined;
  
  const yoyPeriodId = currentPeriodData.comparison_period_id_yoy;
  const yoyOriginalPeriodData = yoyPeriodId ? allV4Data.find(p => p.period_id === yoyPeriodId) : undefined;
  
  const currentPeriodFilteredYtdEntries = filterRawBusinessData(currentPeriodData, selectedBusinessTypes);
  const originalYtdEntriesForCurrentPeriod = (currentPeriodData.business_data || []).filter(
    bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total'
  );
  
  const momPeriodFilteredYtdEntriesForPoPBase = momOriginalPeriodData ? filterRawBusinessData(momOriginalPeriodData, selectedBusinessTypes) : undefined;

  const currentAggregatedMetrics = aggregateAndCalculateMetrics(
    currentPeriodFilteredYtdEntries,
    analysisMode,
    originalYtdEntriesForCurrentPeriod, 
    analysisMode === 'periodOverPeriod' ? momPeriodFilteredYtdEntriesForPoPBase : undefined 
  );
  
  const momPeriodFilteredYtdEntriesForComparison = momOriginalPeriodData ? filterRawBusinessData(momOriginalPeriodData, selectedBusinessTypes) : undefined;
  const momAggregatedMetrics = momPeriodFilteredYtdEntriesForComparison && momOriginalPeriodData
    ? aggregateAndCalculateMetrics(
        momPeriodFilteredYtdEntriesForComparison, 
        'cumulative', 
        (momOriginalPeriodData.business_data || []).filter( bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total') 
      ) 
    : null;

  const yoyPeriodFilteredYtdEntriesForComparison = yoyOriginalPeriodData ? filterRawBusinessData(yoyOriginalPeriodData, selectedBusinessTypes) : undefined;
  const yoyAggregatedMetrics = yoyPeriodFilteredYtdEntriesForComparison && yoyOriginalPeriodData
    ? aggregateAndCalculateMetrics(
        yoyPeriodFilteredYtdEntriesForComparison, 
        'cumulative', 
        (yoyOriginalPeriodData.business_data || []).filter( bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total')
      )
    : null;
  
  let derivedBusinessLineName: string;
  const allBusinessTypesInCurrentPeriod = originalYtdEntriesForCurrentPeriod.map(bt => bt.business_type);

  if (selectedBusinessTypes.length === 1) {
    derivedBusinessLineName = selectedBusinessTypes[0];
  } else if (selectedBusinessTypes.length > 0 && selectedBusinessTypes.length < allBusinessTypesInCurrentPeriod.length) {
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
    premium_share: premium_share,
    vcr_color: getDynamicColorByVCR(currentAggregatedMetrics.variable_cost_ratio),

    // Direct access fields for table, now raw values for formatting in component
    premium_written: currentAggregatedMetrics.premium_written,
    total_loss_amount: currentAggregatedMetrics.total_loss_amount,
    policy_count: currentAggregatedMetrics.policy_count,
    loss_ratio: currentAggregatedMetrics.loss_ratio,
    expense_ratio: currentAggregatedMetrics.expense_ratio,
    variable_cost_ratio: currentAggregatedMetrics.variable_cost_ratio,

    // Change percentages (these are already percentages or pp, formatting will add '%')
    premium_writtenChange: momAggregatedMetrics && momAggregatedMetrics.premium_written !== 0 && currentAggregatedMetrics.premium_written !== undefined ? (currentAggregatedMetrics.premium_written - momAggregatedMetrics.premium_written) / Math.abs(momAggregatedMetrics.premium_written) * 100 : (currentAggregatedMetrics.premium_written !== 0 && currentAggregatedMetrics.premium_written !== undefined ? Infinity : 0),
    total_loss_amountChange: momAggregatedMetrics && momAggregatedMetrics.total_loss_amount !== 0 && currentAggregatedMetrics.total_loss_amount !== undefined ? (currentAggregatedMetrics.total_loss_amount - momAggregatedMetrics.total_loss_amount) / Math.abs(momAggregatedMetrics.total_loss_amount) * 100 : (currentAggregatedMetrics.total_loss_amount !== 0 && currentAggregatedMetrics.total_loss_amount !== undefined ? Infinity : 0),
    policy_countChange: momAggregatedMetrics && momAggregatedMetrics.policy_count !== 0 && currentAggregatedMetrics.policy_count !== undefined ? (currentAggregatedMetrics.policy_count - momAggregatedMetrics.policy_count) / Math.abs(momAggregatedMetrics.policy_count) * 100 : (currentAggregatedMetrics.policy_count !== 0 && currentAggregatedMetrics.policy_count !== undefined ? Infinity : 0),
    loss_ratioChange: momAggregatedMetrics && currentAggregatedMetrics.loss_ratio !== undefined ? currentAggregatedMetrics.loss_ratio - momAggregatedMetrics.loss_ratio : undefined, 
    expense_ratioChange: momAggregatedMetrics && currentAggregatedMetrics.expense_ratio !== undefined ? currentAggregatedMetrics.expense_ratio - momAggregatedMetrics.expense_ratio : undefined, 
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
  } else if (current !== 0) { 
    percent = current > 0 ? Infinity : -Infinity; 
  } else { 
    percent = 0;
  }

  let type: Kpi['changeType'] = 'neutral';
  const epsilon = 0.00001; 
  if (absolute > epsilon) type = higherIsBetter ? 'positive' : 'negative'; 
  if (absolute < -epsilon) type = higherIsBetter ? 'negative' : 'positive';
  
  return { percent, absolute, type };
};


export const calculateKpis = (
  processedData: ProcessedDataForPeriod[], 
  overallTotalsForPeriod: V4PeriodTotals | undefined | null,
  analysisMode: AnalysisMode, 
  selectedBusinessTypes: string[],
  activePeriodId: string 
): Kpi[] => {
  if (!activePeriodId) {
    console.error("calculateKpis: activePeriodId is required but was not provided.");
    return [];
  }
  if (!processedData || processedData.length === 0) return [];
  
  const data = processedData[0]; 
  const current = data.currentMetrics; 
  const momYtd = data.momMetrics; 
  const yoyYtd = data.yoyMetrics; 

  if (!current) return [];

  const formatKpiChange = (changeResult: { percent?: number, absolute?: number, type: Kpi['changeType'] }, metricIdForAbsFormat: string, isRateChange: boolean = false, higherIsBetterForColor: boolean = true) => {
    let changePercentStr, changeAbsStr;

    const ruleForAbs = METRIC_FORMAT_RULES[metricIdForAbsFormat];
    let isAbsPercentageType = false;
    if (ruleForAbs && ruleForAbs.type === 'percentage') {
        isAbsPercentageType = true;
    }

    if (changeResult.percent !== undefined && isFinite(changeResult.percent)) {
        // For "change" (percentage change of the base value), always format as X.X%
        changePercentStr = `${changeResult.percent.toFixed(1)}%`;
    } else if (changeResult.percent === Infinity) {
        changePercentStr = "+∞%";
    } else if (changeResult.percent === -Infinity) {
        changePercentStr = "-∞%";
    }

    if (changeResult.absolute !== undefined) {
      if (isAbsPercentageType) { // If the absolute change IS a change in percentage points
        changeAbsStr = `${changeResult.absolute.toFixed(1)} pp`; // Using "pp" for clarity
      } else {
        changeAbsStr = formatDisplayValue(changeResult.absolute, metricIdForAbsFormat);
      }
    }
    
    let effectiveChangeType = changeResult.type;
    if (isRateChange) { 
        const epsilon = 0.00001;
        if (changeResult.absolute !== undefined && Math.abs(changeResult.absolute) > epsilon) { 
             effectiveChangeType = higherIsBetterForColor ? 
                                 (changeResult.absolute > 0 ? 'positive' : 'negative') : 
                                 (changeResult.absolute > 0 ? 'negative' : 'positive');
        } else {
            effectiveChangeType = 'neutral';
        }
    }

    return { change: changePercentStr, changeAbsolute: changeAbsStr, changeType: effectiveChangeType };
  };
  
  const premWrittenMomChg = calculateChangeAndType(current.premium_written, momYtd?.premium_written, true);
  const premEarnedMomChg = calculateChangeAndType(current.premium_earned, momYtd?.premium_earned, true);
  const lossAmtMomChg = calculateChangeAndType(current.total_loss_amount, momYtd?.total_loss_amount, false);
  const expenseAmtMomChg = calculateChangeAndType(current.expense_amount, momYtd?.expense_amount, false);
  const policyCntMomChg = calculateChangeAndType(current.policy_count, momYtd?.policy_count, true);
  
  const lossRatioMomChg = calculateChangeAndType(current.loss_ratio, momYtd?.loss_ratio, false);
  const expenseRatioMomChg = calculateChangeAndType(current.expense_ratio, momYtd?.expense_ratio, false);
  const varCostRatioMomChg = calculateChangeAndType(current.variable_cost_ratio, momYtd?.variable_cost_ratio, false);
  const premEarnRatioMomChg = calculateChangeAndType(current.premium_earned_ratio, momYtd?.premium_earned_ratio, true);
  const claimFreqMomChg = calculateChangeAndType(current.claim_frequency, momYtd?.claim_frequency, false);
  const avgPremPolMomChg = calculateChangeAndType(current.avg_premium_per_policy, momYtd?.avg_premium_per_policy, true);
  const avgLossCaseMomChg = calculateChangeAndType(current.avg_loss_per_case, momYtd?.avg_loss_per_case, false);
  
  const marginalContribAmtMomChg = calculateChangeAndType(current.marginal_contribution_amount, momYtd?.marginal_contribution_amount, true);
  const marginalContribRatioMomChg = calculateChangeAndType(current.marginal_contribution_ratio, momYtd?.marginal_contribution_ratio, true);
  
  const premWrittenYoyChg = calculateChangeAndType(current.premium_written, yoyYtd?.premium_written, true);
  const premEarnedYoyChg = calculateChangeAndType(current.premium_earned, yoyYtd?.premium_earned, true);
  const lossAmtYoyChg = calculateChangeAndType(current.total_loss_amount, yoyYtd?.total_loss_amount, false); 
  const expenseAmtYoyChg = calculateChangeAndType(current.expense_amount, yoyYtd?.expense_amount, false);
  const policyCntYoyChg = calculateChangeAndType(current.policy_count, yoyYtd?.policy_count, true);

  const lossRatioYoyChg = calculateChangeAndType(current.loss_ratio, yoyYtd?.loss_ratio, false);
  const expenseRatioYoyChg = calculateChangeAndType(current.expense_ratio, yoyYtd?.expense_ratio, false);
  const varCostRatioYoyChg = calculateChangeAndType(current.variable_cost_ratio, yoyYtd?.variable_cost_ratio, false);
  const premEarnRatioYoyChg = calculateChangeAndType(current.premium_earned_ratio, yoyYtd?.premium_earned_ratio, true);
  const claimFreqYoyChg = calculateChangeAndType(current.claim_frequency, yoyYtd?.claim_frequency, false);
  const avgPremPolYoyChg = calculateChangeAndType(current.avg_premium_per_policy, yoyYtd?.avg_premium_per_policy, true);
  const avgLossCaseYoyChg = calculateChangeAndType(current.avg_loss_per_case, yoyYtd?.avg_loss_per_case, false);

  const marginalContribAmtYoyChg = calculateChangeAndType(current.marginal_contribution_amount, yoyYtd?.marginal_contribution_amount, true);
  const marginalContribRatioYoyChg = calculateChangeAndType(current.marginal_contribution_ratio, yoyYtd?.marginal_contribution_ratio, true);
  
  let rawAvgCommercialIndex: number | undefined | null = undefined;
  const isSingleSelectedType = selectedBusinessTypes && selectedBusinessTypes.length === 1;

  if (isSingleSelectedType && analysisMode === 'cumulative') {
      const currentV4PeriodDataGlobal = (globalThis as any).allV4DataForKpiWorkaround?.find((p: V4PeriodData) => p.period_id === activePeriodId);
      if (currentV4PeriodDataGlobal && selectedBusinessTypes && selectedBusinessTypes.length === 1) {
          const singleLineJsonEntry = currentV4PeriodDataGlobal.business_data.find((bd: V4BusinessDataEntry) => bd.business_type === selectedBusinessTypes[0]);
          if (singleLineJsonEntry?.avg_commercial_index !== undefined && singleLineJsonEntry.avg_commercial_index !== null) {
              rawAvgCommercialIndex = singleLineJsonEntry.avg_commercial_index;
          }
      }
  } else if (isSingleSelectedType && analysisMode === 'periodOverPeriod') {
     // For periodOverPeriod, avg_commercial_index is effectively the YTD value of the current period, not a "change" value.
     // So we use the YTD value from the current period's JSON data.
     const currentV4PeriodDataGlobal = (globalThis as any).allV4DataForKpiWorkaround?.find((p: V4PeriodData) => p.period_id === activePeriodId);
      if (currentV4PeriodDataGlobal && selectedBusinessTypes && selectedBusinessTypes.length === 1) {
          const singleLineJsonEntry = currentV4PeriodDataGlobal.business_data.find((bd: V4BusinessDataEntry) => bd.business_type === selectedBusinessTypes[0]);
           if (singleLineJsonEntry?.avg_commercial_index !== undefined && singleLineJsonEntry.avg_commercial_index !== null) {
              rawAvgCommercialIndex = singleLineJsonEntry.avg_commercial_index;
          }
      }
  }


  const kpis: Kpi[] = [
    { 
      id: 'marginal_contribution_ratio', title: '边际贡献率', value: formatDisplayValue(current.marginal_contribution_ratio, 'marginal_contribution_ratio'), rawValue: current.marginal_contribution_ratio,
      ...formatKpiChange(marginalContribRatioMomChg, 'marginal_contribution_ratio', true, true),
      yoyChange: formatKpiChange(marginalContribRatioYoyChg, 'marginal_contribution_ratio', true, true).change, yoyChangeAbsolute: formatKpiChange(marginalContribRatioYoyChg, 'marginal_contribution_ratio', true, true).changeAbsolute, yoyChangeType: formatKpiChange(marginalContribRatioYoyChg, 'marginal_contribution_ratio', true, true).changeType,
      icon: 'Ratio',
    },
    { 
      id: 'variable_cost_ratio', title: '变动成本率', value: formatDisplayValue(current.variable_cost_ratio, 'variable_cost_ratio'), rawValue: current.variable_cost_ratio,
      ...formatKpiChange(varCostRatioMomChg, 'variable_cost_ratio', true, false), 
      yoyChange: formatKpiChange(varCostRatioYoyChg, 'variable_cost_ratio', true, false).change, yoyChangeAbsolute: formatKpiChange(varCostRatioYoyChg, 'variable_cost_ratio', true, false).changeAbsolute, yoyChangeType: formatKpiChange(varCostRatioYoyChg, 'variable_cost_ratio', true, false).changeType,
      icon: 'Zap', isBorderRisk: current.variable_cost_ratio !== undefined && current.variable_cost_ratio > 90,
    },
    { 
      id: 'expense_ratio', title: '费用率', value: formatDisplayValue(current.expense_ratio, 'expense_ratio'), rawValue: current.expense_ratio,
      ...formatKpiChange(expenseRatioMomChg, 'expense_ratio', true, false), 
      yoyChange: formatKpiChange(expenseRatioYoyChg, 'expense_ratio', true, false).change, yoyChangeAbsolute: formatKpiChange(expenseRatioYoyChg, 'expense_ratio', true, false).changeAbsolute, yoyChangeType: formatKpiChange(expenseRatioYoyChg, 'expense_ratio', true, false).changeType,
      icon: 'Percent', isOrangeRisk: current.expense_ratio !== undefined && current.expense_ratio > 14.5,
    },
    { 
      id: 'loss_ratio', title: '满期赔付率', value: formatDisplayValue(current.loss_ratio, 'loss_ratio'), rawValue: current.loss_ratio,
      ...formatKpiChange(lossRatioMomChg, 'loss_ratio', true, false), 
      yoyChange: formatKpiChange(lossRatioYoyChg, 'loss_ratio', true, false).change, yoyChangeAbsolute: formatKpiChange(lossRatioYoyChg, 'loss_ratio', true, false).changeAbsolute, yoyChangeType: formatKpiChange(lossRatioYoyChg, 'loss_ratio', true, false).changeType,
      icon: 'ShieldCheck', isRisk: current.loss_ratio !== undefined && current.loss_ratio > 70, description: "基于已报告赔款",
    },
    { 
      id: 'marginal_contribution_amount', title: '边贡额', value: formatDisplayValue(current.marginal_contribution_amount, 'marginal_contribution_amount'), rawValue: current.marginal_contribution_amount,
      ...formatKpiChange(marginalContribAmtMomChg, 'marginal_contribution_amount', false, true),
      yoyChange: formatKpiChange(marginalContribAmtYoyChg, 'marginal_contribution_amount', false, true).change, yoyChangeAbsolute: formatKpiChange(marginalContribAmtYoyChg, 'marginal_contribution_amount', false, true).changeAbsolute, yoyChangeType: formatKpiChange(marginalContribAmtYoyChg, 'marginal_contribution_amount', false, true).changeType,
      icon: 'Landmark',
    },
    { 
      id: 'premium_written', title: '保费', value: formatDisplayValue(current.premium_written, 'premium_written'), rawValue: current.premium_written,
      ...formatKpiChange(premWrittenMomChg, 'premium_written', false, true),
      yoyChange: formatKpiChange(premWrittenYoyChg, 'premium_written', false, true).change, yoyChangeAbsolute: formatKpiChange(premWrittenYoyChg, 'premium_written', false, true).changeAbsolute, yoyChangeType: formatKpiChange(premWrittenYoyChg, 'premium_written', false, true).changeType,
      icon: 'DollarSign',
    },
    { 
      id: 'expense_amount', title: '费用', value: formatDisplayValue(current.expense_amount, 'expense_amount'), rawValue: current.expense_amount,
      ...formatKpiChange(expenseAmtMomChg, 'expense_amount', false, false),
      yoyChange: formatKpiChange(expenseAmtYoyChg, 'expense_amount', false, false).change, yoyChangeAbsolute: formatKpiChange(expenseAmtYoyChg, 'expense_amount', false, false).changeAbsolute, yoyChangeType: formatKpiChange(expenseAmtYoyChg, 'expense_amount', false, false).changeType,
      icon: 'Briefcase', 
    },
    { 
      id: 'total_loss_amount', title: '赔款', value: formatDisplayValue(current.total_loss_amount, 'total_loss_amount'), rawValue: current.total_loss_amount,
      ...formatKpiChange(lossAmtMomChg, 'total_loss_amount', false, false),
      yoyChange: formatKpiChange(lossAmtYoyChg, 'total_loss_amount', false, false).change, yoyChangeAbsolute: formatKpiChange(lossAmtYoyChg, 'total_loss_amount', false, false).changeAbsolute, yoyChangeType: formatKpiChange(lossAmtYoyChg, 'total_loss_amount', false, false).changeType,
      icon: 'ShieldAlert',
    },
    { 
      id: 'premium_earned', title: '满期保费', value: formatDisplayValue(current.premium_earned, 'premium_earned'), rawValue: current.premium_earned,
      ...formatKpiChange(premEarnedMomChg, 'premium_earned', false, true),
      yoyChange: formatKpiChange(premEarnedYoyChg, 'premium_earned', false, true).change, yoyChangeAbsolute: formatKpiChange(premEarnedYoyChg, 'premium_earned', false, true).changeAbsolute, yoyChangeType: formatKpiChange(premEarnedYoyChg, 'premium_earned', false, true).changeType,
      icon: 'FileText', 
    },
    { 
      id: 'premium_earned_ratio', title: '保费满期率', value: formatDisplayValue(current.premium_earned_ratio, 'premium_earned_ratio'), rawValue: current.premium_earned_ratio,
       ...formatKpiChange(premEarnRatioMomChg, 'premium_earned_ratio', true, true),
      yoyChange: formatKpiChange(premEarnRatioYoyChg, 'premium_earned_ratio', true, true).change, yoyChangeAbsolute: formatKpiChange(premEarnRatioYoyChg, 'premium_earned_ratio', true, true).changeAbsolute, yoyChangeType: formatKpiChange(premEarnRatioYoyChg, 'premium_earned_ratio', true, true).changeType,
      icon: 'Ratio',
    },
    { 
      id: 'avg_premium_per_policy', title: '单均保费', value: formatDisplayValue(current.avg_premium_per_policy, 'avg_premium_per_policy'), rawValue: current.avg_premium_per_policy,
       ...formatKpiChange(avgPremPolMomChg, 'avg_premium_per_policy', false, true), 
      yoyChange: formatKpiChange(avgPremPolYoyChg, 'avg_premium_per_policy', false, true).change, yoyChangeAbsolute: formatKpiChange(avgPremPolYoyChg, 'avg_premium_per_policy', false, true).changeAbsolute, yoyChangeType: formatKpiChange(avgPremPolYoyChg, 'avg_premium_per_policy', false, true).changeType,
      icon: 'FileText',
    },
    { 
      id: 'policy_count', title: '保单件数', value: formatDisplayValue(current.policy_count, 'policy_count'), rawValue: current.policy_count,
      ...formatKpiChange(policyCntMomChg, 'policy_count', false, true),
      yoyChange: formatKpiChange(policyCntYoyChg, 'policy_count', false, true).change, yoyChangeAbsolute: formatKpiChange(policyCntYoyChg, 'policy_count', false, true).changeAbsolute, yoyChangeType: formatKpiChange(policyCntYoyChg, 'policy_count', false, true).changeType,
      icon: 'FileText',
    },
    { 
      id: 'premium_share', title: '保费占比', value: formatDisplayValue(data.premium_share, 'premium_share'), rawValue: data.premium_share,
      change: undefined, changeAbsolute: undefined, changeType: 'neutral', 
      yoyChange: undefined, yoyChangeAbsolute: undefined, yoyChangeType: 'neutral',
      icon: 'Users',
    },
    { 
      id: 'avg_commercial_index', title: '自主系数', 
      value: formatDisplayValue(rawAvgCommercialIndex, 'avg_commercial_index'), 
      rawValue: rawAvgCommercialIndex,
      change: undefined, changeAbsolute: undefined, changeType: 'neutral',
      yoyChange: undefined, yoyChangeAbsolute: undefined, yoyChangeType: 'neutral',
      icon: 'Search',
    },
    { 
      id: 'claim_frequency', title: '满期出险率', value: formatDisplayValue(current.claim_frequency, 'claim_frequency'), rawValue: current.claim_frequency,
      ...formatKpiChange(claimFreqMomChg, 'claim_frequency', true, false), 
      yoyChange: formatKpiChange(claimFreqYoyChg, 'claim_frequency', true, false).change, yoyChangeAbsolute: formatKpiChange(claimFreqYoyChg, 'claim_frequency', true, false).changeAbsolute, yoyChangeType: formatKpiChange(claimFreqYoyChg, 'claim_frequency', true, false).changeType,
      icon: 'Activity',
    },
    { 
      id: 'avg_loss_per_case', title: '案均赔款', value: formatDisplayValue(current.avg_loss_per_case, 'avg_loss_per_case'), rawValue: current.avg_loss_per_case,
      ...formatKpiChange(avgLossCaseMomChg, 'avg_loss_per_case', false, false), 
      yoyChange: formatKpiChange(avgLossCaseYoyChg, 'avg_loss_per_case', false, false).change, yoyChangeAbsolute: formatKpiChange(avgLossCaseYoyChg, 'avg_loss_per_case', false, false).changeAbsolute, yoyChangeType: formatKpiChange(avgLossCaseYoyChg, 'avg_loss_per_case', false, false).changeType,
      icon: 'DollarSign',
    },
  ];
  
  return kpis;
};


export function setGlobalV4DataForKpiWorkaround(allV4Data: V4PeriodData[]) {
  (globalThis as any).allV4DataForKpiWorkaround = allV4Data;
}


export function exportToCSV(data: ProcessedDataForPeriod[], analysisMode: AnalysisMode, fileName: string = "车险数据导出.csv") {
    if (!data || data.length === 0) {
        console.warn("No data to export.");
        return;
    }

    const headers = [
        "业务线ID", "业务线名称",
        "跟单保费", "满期保费", "总赔款", "费用(额)",
        "保单数量", "赔案数量", "满期保单",
        "单均保费", "案均赔款", "自主系数",
        "满期赔付率", "费用率", "变动成本率", "保费满期率", "满期出险率",
        "边际贡献率", "边贡额", "保费占比"
    ];
    const metricIdsForHeaders = [
        null, null, // For businessLineId and businessLineName
        'premium_written', 'premium_earned', 'total_loss_amount', 'expense_amount',
        'policy_count', 'claim_count', 'policy_count_earned',
        'avg_premium_per_policy', 'avg_loss_per_case', 'avg_commercial_index',
        'loss_ratio', 'expense_ratio', 'variable_cost_ratio', 'premium_earned_ratio', 'claim_frequency',
        'marginal_contribution_ratio', 'marginal_contribution_amount', 'premium_share'
    ];


    if (analysisMode === 'periodOverPeriod') { 
        const momHeaders = [
            "跟单保费环比(%)", "跟单保费环比绝对值",
            "总赔款环比(%)", "总赔款环比绝对值",
            "保单数量环比(%)", "保单数量环比绝对值",
            "满期赔付率环比(pp)", 
            "费用率环比(pp)"    
        ];
        headers.push(...momHeaders);
    }
    
    const rows = data.map(item => {
        const current = item.currentMetrics;
        
        const rowData = [
            item.businessLineId, item.businessLineName,
            formatDisplayValue(current.premium_written, 'premium_written'),
            formatDisplayValue(current.premium_earned, 'premium_earned'),
            formatDisplayValue(current.total_loss_amount, 'total_loss_amount'),
            formatDisplayValue(current.expense_amount, 'expense_amount'),
            formatDisplayValue(current.policy_count, 'policy_count'),
            formatDisplayValue(current.claim_count, 'claim_count'),
            formatDisplayValue(current.policy_count_earned, 'policy_count_earned'),
            formatDisplayValue(current.avg_premium_per_policy, 'avg_premium_per_policy'),
            formatDisplayValue(current.avg_loss_per_case, 'avg_loss_per_case'),
            formatDisplayValue(current.avg_commercial_index, 'avg_commercial_index'),
            formatDisplayValue(current.loss_ratio, 'loss_ratio'),
            formatDisplayValue(current.expense_ratio, 'expense_ratio'),
            formatDisplayValue(current.variable_cost_ratio, 'variable_cost_ratio'),
            formatDisplayValue(current.premium_earned_ratio, 'premium_earned_ratio'),
            formatDisplayValue(current.claim_frequency, 'claim_frequency'),
            formatDisplayValue(current.marginal_contribution_ratio, 'marginal_contribution_ratio'),
            formatDisplayValue(current.marginal_contribution_amount, 'marginal_contribution_amount'),
            formatDisplayValue(item.premium_share, 'premium_share')
        ];

        if (analysisMode === 'periodOverPeriod' && item.momMetrics) {
            const momMetrics = item.momMetrics; 
            
            const momPremWrittenChangePct = momMetrics.premium_written !== 0 && current.premium_written !== undefined ? (current.premium_written - momMetrics.premium_written) / Math.abs(momMetrics.premium_written) * 100 : (current.premium_written !== 0 && current.premium_written !== undefined ? Infinity : 0);
            const momPremWrittenAbs = current.premium_written !== undefined ? current.premium_written - momMetrics.premium_written : undefined;

            const momLossAmtChangePct = momMetrics.total_loss_amount !== 0 && current.total_loss_amount !== undefined ? (current.total_loss_amount - momMetrics.total_loss_amount) / Math.abs(momMetrics.total_loss_amount) * 100 : (current.total_loss_amount !== 0 && current.total_loss_amount !== undefined ? Infinity : 0);
            const momLossAmtAbs = current.total_loss_amount !== undefined ? current.total_loss_amount - momMetrics.total_loss_amount : undefined;
            
            const momPolicyCntChangePct = momMetrics.policy_count !== 0 && current.policy_count !== undefined ? (current.policy_count - momMetrics.policy_count) / Math.abs(momMetrics.policy_count) * 100 : (current.policy_count !== 0 && current.policy_count !== undefined ? Infinity : 0);
            const momPolicyCntAbs = current.policy_count !== undefined ? current.policy_count - momMetrics.policy_count : undefined;

            const momLossRatioPP = current.loss_ratio !== undefined ? current.loss_ratio - momMetrics.loss_ratio : undefined;
            const momExpenseRatioPP = current.expense_ratio !== undefined ? current.expense_ratio - momMetrics.expense_ratio : undefined;
            
            rowData.push(
                isFinite(momPremWrittenChangePct) ? `${momPremWrittenChangePct.toFixed(1)}%` : (momPremWrittenChangePct > 0 ? "+∞%" : "-∞%"), 
                formatDisplayValue(momPremWrittenAbs, 'premium_written'),
                isFinite(momLossAmtChangePct) ? `${momLossAmtChangePct.toFixed(1)}%` : (momLossAmtChangePct > 0 ? "+∞%" : "-∞%"),
                formatDisplayValue(momLossAmtAbs, 'total_loss_amount'),
                isFinite(momPolicyCntChangePct) ? `${momPolicyCntChangePct.toFixed(1)}%` : (momPolicyCntChangePct > 0 ? "+∞%" : "-∞%"),
                formatDisplayValue(momPolicyCntAbs, 'policy_count'),
                momLossRatioPP !== undefined ? `${momLossRatioPP.toFixed(1)} pp` : "-", // Using pp for clarity in export
                momExpenseRatioPP !== undefined ? `${momExpenseRatioPP.toFixed(1)} pp` : "-" // Using pp for clarity in export
            );
        } else if (analysisMode === 'periodOverPeriod') { 
            rowData.push("-", "-", "-", "-", "-", "-", "-", "-");
        }
        return rowData.join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
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
