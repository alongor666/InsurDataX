
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

const BUSINESS_TYPE_ABBREVIATIONS: Record<string, string> = {
  "非营业客车新车": "非营客新",
  "非营业客车旧车非过户": "非营客非过户旧",
  "非营业客车旧车过户车": "非营客过户",
  "1吨以下非营业货车": "1吨以下非营货",
  "1吨以上非营业货车": "1吨以上非营货",
  "2吨以下营业货车": "2吨以下营货",
  "2-9吨营业货车": "2-9吨营货",
  "9-10吨营业货车": "9-10吨营货",
  "10吨以上-普货": "10吨上普货",
  "10吨以上-牵引": "10吨上牵引",
};

export function getDisplayBusinessTypeName(originalName: string): string {
  if (originalName === "合计" || originalName === "自定义合计") {
    return originalName;
  }
  if (BUSINESS_TYPE_ABBREVIATIONS[originalName]) {
    return BUSINESS_TYPE_ABBREVIATIONS[originalName];
  }
  return originalName;
}


const baseSummableJsonFields: (keyof V4BusinessDataEntry)[] = [
    'premium_written', 'premium_earned', 'total_loss_amount',
    'expense_amount_raw', 'claim_count', // 'policy_count_earned' is also in JSON but we derive it
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
      metrics.expense_amount_raw = singleEntryJson.expense_amount_raw ?? 0;
      
      let single_avg_prem_policy_json = 0;
      if (singleEntryJson.avg_premium_per_policy !== null && singleEntryJson.avg_premium_per_policy !== undefined && !isNaN(Number(singleEntryJson.avg_premium_per_policy))) {
        single_avg_prem_policy_json = Number(singleEntryJson.avg_premium_per_policy);
      }
      metrics.avg_premium_per_policy = single_avg_prem_policy_json;

      if (metrics.avg_premium_per_policy !== undefined && metrics.avg_premium_per_policy !== 0 && metrics.premium_written !== undefined) {
        metrics.policy_count = Math.round((metrics.premium_written * 10000) / metrics.avg_premium_per_policy);
      } else {
        metrics.policy_count = 0;
      }

      if (singleEntryJson.avg_loss_per_case !== null && singleEntryJson.avg_loss_per_case !== undefined && !isNaN(Number(singleEntryJson.avg_loss_per_case))) {
        metrics.avg_loss_per_case = Number(singleEntryJson.avg_loss_per_case);
      } else {
         metrics.avg_loss_per_case = (metrics.claim_count && metrics.claim_count !== 0 && metrics.total_loss_amount ? (metrics.total_loss_amount * 10000) / metrics.claim_count : 0);
      }

      metrics.avg_commercial_index = singleEntryJson.avg_commercial_index ?? undefined;

      if (singleEntryJson.expense_ratio !== null && singleEntryJson.expense_ratio !== undefined && !isNaN(Number(singleEntryJson.expense_ratio))) {
        metrics.expense_ratio = Number(singleEntryJson.expense_ratio);
      } else {
        metrics.expense_ratio = (metrics.premium_written !== 0 ? (metrics.expense_amount_raw / metrics.premium_written) * 100 : 0);
      }

      if (singleEntryJson.loss_ratio !== null && singleEntryJson.loss_ratio !== undefined && !isNaN(Number(singleEntryJson.loss_ratio))) {
        metrics.loss_ratio = Number(singleEntryJson.loss_ratio);
      } else {
        metrics.loss_ratio = (metrics.premium_earned !== 0 ? (metrics.total_loss_amount / metrics.premium_earned) * 100 : 0);
      }
    } else {
        // Fallback if singleEntryJson is not found (should ideally not happen if logic is correct)
        Object.keys(new Object() as AggregatedBusinessMetrics).forEach(k => (metrics as any)[k] = 0);
        metrics.avg_commercial_index = undefined;
        metrics.policy_count = 0;
    }
  } else { // Aggregate or PoP mode
    let dataToSum = periodBusinessDataEntries; 
    if (analysisMode === 'periodOverPeriod' && previousPeriodYtdEntries) {
        dataToSum = periodBusinessDataEntries.map(currentYtdEntry => {
            const prevYtdEntry = previousPeriodYtdEntries.find(pe => pe.business_type === currentYtdEntry.business_type);
            return {
                ...currentYtdEntry,
                premium_written: (currentYtdEntry.premium_written || 0) - (prevYtdEntry?.premium_written || 0),
                premium_earned: (currentYtdEntry.premium_earned || 0) - (prevYtdEntry?.premium_earned || 0),
                total_loss_amount: (currentYtdEntry.total_loss_amount || 0) - (prevYtdEntry?.total_loss_amount || 0),
                expense_amount_raw: (currentYtdEntry.expense_amount_raw || 0) - (prevYtdEntry?.expense_amount_raw || 0),
                claim_count: (currentYtdEntry.claim_count || 0) - (prevYtdEntry?.claim_count || 0),
                loss_ratio: null, expense_ratio: null, variable_cost_ratio: null, premium_earned_ratio: null, claim_frequency: null, avg_loss_per_case: null, avg_commercial_index: null, avg_premium_per_policy: null
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
    metrics.expense_amount_raw = sums.expense_amount_raw ?? 0;
    metrics.claim_count = Math.round(sums.claim_count ?? 0);

    if (analysisMode === 'periodOverPeriod' || periodBusinessDataEntries.length > 1) {
        metrics.avg_commercial_index = undefined; 
    } else if (periodBusinessDataEntries.length === 1 && periodBusinessDataEntries[0].avg_commercial_index !== undefined) { 
        metrics.avg_commercial_index = periodBusinessDataEntries[0].avg_commercial_index;
    }
  }

  const current_premium_written = Number(metrics.premium_written) || 0;
  const current_premium_earned = Number(metrics.premium_earned) || 0;
  const current_total_loss_amount = Number(metrics.total_loss_amount) || 0;
  const current_expense_amount_raw = Number(metrics.expense_amount_raw) || 0;
  const current_claim_count = Number(metrics.claim_count) || 0;

  if (!isSingleTypeCumulative) {
      if (analysisMode === 'periodOverPeriod' && previousPeriodYtdEntries) {
          let currentYtdPolicyCountSum = 0;
          originalYtdEntriesForPeriod.forEach(entry => {
              const app_ytd = entry.avg_premium_per_policy;
              if (app_ytd && app_ytd !== 0 && entry.premium_written) {
                  currentYtdPolicyCountSum += Math.round((entry.premium_written * 10000) / app_ytd);
              }
          });

          let previousYtdPolicyCountSum = 0;
          previousPeriodYtdEntries.forEach(entry => {
              const app_ytd = entry.avg_premium_per_policy;
              if (app_ytd && app_ytd !== 0 && entry.premium_written) {
                  previousYtdPolicyCountSum += Math.round((entry.premium_written * 10000) / app_ytd);
              }
          });
          metrics.policy_count = currentYtdPolicyCountSum - previousYtdPolicyCountSum;
          metrics.avg_premium_per_policy = metrics.policy_count !== 0 ? (current_premium_written * 10000) / metrics.policy_count : 0;
      } else { // Cumulative Aggregate
          let totalDerivedPolicyCountForAvgCalc = 0;
          originalYtdEntriesForPeriod.forEach(entry => {
              const app_ytd = entry.avg_premium_per_policy;
              if (app_ytd && app_ytd !== 0 && entry.premium_written) {
                  totalDerivedPolicyCountForAvgCalc += Math.round((entry.premium_written * 10000) / app_ytd);
              }
          });
          metrics.policy_count = totalDerivedPolicyCountForAvgCalc;
          metrics.avg_premium_per_policy = metrics.policy_count !== 0 ? (current_premium_written * 10000) / metrics.policy_count : 0;
      }
  }
  
  if (!isSingleTypeCumulative || metrics.expense_ratio === undefined) { 
      metrics.expense_ratio = current_premium_written !== 0 ? (current_expense_amount_raw / current_premium_written) * 100 : 0;
  }
  if (!isSingleTypeCumulative || metrics.loss_ratio === undefined) { 
      metrics.loss_ratio = current_premium_earned !== 0 ? (current_total_loss_amount / current_premium_earned) * 100 : 0;
  }

  metrics.premium_earned_ratio = current_premium_written !== 0
    ? (current_premium_earned / current_premium_written) * 100
    : 0;

  metrics.policy_count_earned = Math.round((metrics.policy_count || 0) * (metrics.premium_earned_ratio / 100));
  
  metrics.claim_frequency = (metrics.policy_count_earned !== 0 && current_claim_count !== 0)
                            ? (current_claim_count / metrics.policy_count_earned) * 100
                            : 0;

  if (!isSingleTypeCumulative || metrics.avg_loss_per_case === undefined) {
      metrics.avg_loss_per_case = (current_claim_count !== 0 && current_total_loss_amount !== 0)
                                ? (current_total_loss_amount * 10000) / current_claim_count
                                : 0;
  }

  metrics.variable_cost_ratio = (metrics.expense_ratio || 0) + (metrics.loss_ratio || 0);
  metrics.expense_amount = current_premium_written * ((metrics.expense_ratio || 0) / 100);
  metrics.marginal_contribution_ratio = 100 - (metrics.variable_cost_ratio || 0);
  metrics.marginal_contribution_amount = current_premium_earned * (metrics.marginal_contribution_ratio / 100);

  Object.keys(metrics).forEach(key => {
      const k = key as keyof AggregatedBusinessMetrics;
      if (typeof metrics[k] === 'number' && isNaN(metrics[k] as number)) {
          (metrics[k] as any) = 0;
      }
      if (key === 'avg_commercial_index' && metrics[k] === null) { 
          return;
      }
       if (metrics[k] === null && key !== 'avg_commercial_index') {
          (metrics[k] as any) = 0;
      }
  });

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
  selectedComparisonPeriodKeyForKpi: string | null,
  analysisMode: AnalysisMode,
  selectedBusinessTypes: string[]
): ProcessedDataForPeriod[] => {
  const currentPeriodData = allV4Data.find(p => p.period_id === selectedPeriodId);
  if (!currentPeriodData) return [];

  let actualComparisonPeriodIdForKpi: string | null = selectedComparisonPeriodKeyForKpi;
  if (!actualComparisonPeriodIdForKpi) { 
      actualComparisonPeriodIdForKpi = currentPeriodData.comparison_period_id_mom || null;
  }
  const comparisonPeriodDataForKpi = actualComparisonPeriodIdForKpi
    ? allV4Data.find(p => p.period_id === actualComparisonPeriodIdForKpi)
    : undefined;

  const currentPeriodFilteredYtdBusinessEntries = filterRawBusinessData(currentPeriodData, selectedBusinessTypes);
  const originalYtdEntriesForCurrentPeriod = (currentPeriodData.business_data || []).filter(
    bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total'
  );


  let previousPeriodYtdForCurrentPoP: V4BusinessDataEntry[] | undefined = undefined;
  if (analysisMode === 'periodOverPeriod') { 
    const currentPeriodPreviousMomId = currentPeriodData.comparison_period_id_mom;
    const currentPeriodPreviousMomData = currentPeriodPreviousMomId
        ? allV4Data.find(p => p.period_id === currentPeriodPreviousMomId)
        : undefined;
    if (currentPeriodPreviousMomData) {
        previousPeriodYtdForCurrentPoP = filterRawBusinessData(currentPeriodPreviousMomData, selectedBusinessTypes);
    }
  }
  
  const currentAggregatedMetrics = aggregateAndCalculateMetrics(
    currentPeriodFilteredYtdBusinessEntries,
    analysisMode, 
    originalYtdEntriesForCurrentPeriod, 
    analysisMode === 'periodOverPeriod' ? previousPeriodYtdForCurrentPoP : undefined 
  );


  let momAggregatedMetrics: AggregatedBusinessMetrics | null = null;
  if (comparisonPeriodDataForKpi) {
    const comparisonPeriodFilteredYtdBusinessEntries = filterRawBusinessData(comparisonPeriodDataForKpi, selectedBusinessTypes);
    const originalYtdForComparisonPeriod = (comparisonPeriodDataForKpi.business_data || []).filter(
        bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total'
    );

    if (analysisMode === 'periodOverPeriod') { 
      const comparisonPeriodPreviousMomId = comparisonPeriodDataForKpi.comparison_period_id_mom;
      const comparisonPeriodPreviousMomData = comparisonPeriodPreviousMomId
        ? allV4Data.find(p => p.period_id === comparisonPeriodPreviousMomId)
        : undefined;

      if (comparisonPeriodPreviousMomData) {
        const previousYtdForComparisonPoP = filterRawBusinessData(comparisonPeriodPreviousMomData, selectedBusinessTypes);
        momAggregatedMetrics = aggregateAndCalculateMetrics(
          comparisonPeriodFilteredYtdBusinessEntries, 
          'periodOverPeriod', 
          originalYtdForComparisonPeriod, 
          previousYtdForComparisonPoP 
        );
      } else {
        momAggregatedMetrics = null; 
      }
    } else { 
      momAggregatedMetrics = aggregateAndCalculateMetrics(
        comparisonPeriodFilteredYtdBusinessEntries,
        'cumulative', 
        originalYtdForComparisonPeriod
      );
    }
  }

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

  let businessLineId: string;
  let displayBusinessLineName: string;

  const allIndividualTypesInCurrentPeriodOriginal = Array.from(new Set(
    originalYtdEntriesForCurrentPeriod.map(bt => bt.business_type)
  ));

  if (selectedBusinessTypes.length === 1 && allIndividualTypesInCurrentPeriodOriginal.includes(selectedBusinessTypes[0])) {
    businessLineId = selectedBusinessTypes[0];
    displayBusinessLineName = getDisplayBusinessTypeName(selectedBusinessTypes[0]);
  } else if (selectedBusinessTypes.length > 0 && selectedBusinessTypes.length < allIndividualTypesInCurrentPeriodOriginal.length) {
    businessLineId = "自定义合计";
    displayBusinessLineName = "自定义合计";
  } else { 
    businessLineId = "合计";
    displayBusinessLineName = "合计";
  }

  let currentYtdPremiumWrittenForShareCalc = currentAggregatedMetrics.premium_written;
  if (analysisMode === 'periodOverPeriod') { 
      const ytdMetricsForShare = aggregateAndCalculateMetrics(
          currentPeriodFilteredYtdBusinessEntries, 
          'cumulative', 
          originalYtdEntriesForCurrentPeriod
      );
      currentYtdPremiumWrittenForShareCalc = ytdMetricsForShare.premium_written;
  }
  
  const premium_share = (currentPeriodData.totals_for_period?.total_premium_written_overall && currentPeriodData.totals_for_period.total_premium_written_overall !== 0 && currentYtdPremiumWrittenForShareCalc !== undefined)
    ? (currentYtdPremiumWrittenForShareCalc / currentPeriodData.totals_for_period.total_premium_written_overall) * 100
    : 0;

  const processedEntry: ProcessedDataForPeriod = {
    businessLineId,
    businessLineName: displayBusinessLineName,
    icon: displayBusinessLineName === "合计" || displayBusinessLineName === "自定义合计" ? 'Users' : 'ShieldCheck',

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
    } else if (changeResult.percent === 0 && changeResult.absolute === 0) {
        changePercentStr = "0.0%";
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
         if (changeAbsStr && changeAbsStr !== '-') changeAbsStr = formatDisplayValue(0, metricIdForAbsFormat); 
    }
    if (isRateChange && changeResult.absolute !== undefined && Math.abs(changeResult.absolute) < 0.05 ) { 
         effectiveChangeType = 'neutral';
         if (changeAbsStr && changeAbsStr !== '-') changeAbsStr = `0.0 pp`;
    }


    return { change: changePercentStr, changeAbsolute: changeAbsStr, type: effectiveChangeType, changeAbsoluteRaw: changeResult.absolute };
};


export const calculateKpis = (
  processedData: ProcessedDataForPeriod[],
  overallTotalsForPeriod: V4PeriodTotals | undefined | null,
  analysisMode: AnalysisMode,
  selectedBusinessTypes: string[],
  allV4DataForKpiCalc: V4PeriodData[], 
  activePeriodIdForKpiCalc: string    
): Kpi[] => {

  if (!processedData || processedData.length === 0) return [];

  const data = processedData[0];
  const current = data.currentMetrics;
  const comparisonMetrics = data.momMetrics;

  if (!current) return [];

  const createKpiComparisonFields = (
    currentValue: number | undefined | null,
    compValue: number | undefined | null,
    metricId: string,
    valueHigherIsBetter: boolean,
    isRateMetric: boolean
  ): { comparisonChange?: string; comparisonChangeAbsolute?: string; comparisonChangeAbsoluteRaw?: number; comparisonChangeType: Kpi['comparisonChangeType'] } => {

    if (metricId === 'avg_commercial_index') {
        const isApplicable = data.businessLineId !== "合计" && data.businessLineId !== "自定义合计" && analysisMode === 'cumulative' && currentValue !== undefined && currentValue !== null;
        if (!isApplicable) {
             return { comparisonChange: '-', comparisonChangeAbsolute: '-', comparisonChangeType: 'neutral' };
        }
    }
    if (compValue === undefined || compValue === null || isNaN(compValue)) { 
         return { comparisonChange: '-', comparisonChangeAbsolute: '-', comparisonChangeType: 'neutral' };
    }

    const changeDetails = calculateChangeAndType(currentValue, compValue, valueHigherIsBetter);
    const formattedChanges = formatKpiChangeValues(changeDetails, metricId, isRateMetric);
    return {
      comparisonChange: formattedChanges.change,
      comparisonChangeAbsolute: formattedChanges.changeAbsolute,
      comparisonChangeAbsoluteRaw: formattedChanges.changeAbsoluteRaw,
      comparisonChangeType: formattedChanges.type
    };
  };

  let premWrittenIsGrowthGoodForColor = true;
  let vcrForPremiumGrowthColor = current.variable_cost_ratio; 

  if (analysisMode === 'periodOverPeriod') {
      if (activePeriodIdForKpiCalc && allV4DataForKpiCalc && allV4DataForKpiCalc.length > 0) {
          const activePeriodRawData = allV4DataForKpiCalc.find(
              (p: V4PeriodData) => p.period_id === activePeriodIdForKpiCalc
          );

          if (activePeriodRawData) {
              const ytdEntriesForActivePeriod = filterRawBusinessData(activePeriodRawData, selectedBusinessTypes);
              const originalBaseYtdEntriesForActivePeriod = (activePeriodRawData.business_data || []).filter(
                bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total'
              );
              
              const ytdMetricsForCurrentContext = aggregateAndCalculateMetrics(
                  ytdEntriesForActivePeriod, 
                  'cumulative', 
                  originalBaseYtdEntriesForActivePeriod 
              );
              vcrForPremiumGrowthColor = ytdMetricsForCurrentContext.variable_cost_ratio;
          }
      }
  }


  if (vcrForPremiumGrowthColor !== undefined && vcrForPremiumGrowthColor >= 92) {
      premWrittenIsGrowthGoodForColor = false;
  }
  const premWrittenChanges = createKpiComparisonFields(current.premium_written, comparisonMetrics?.premium_written, 'premium_written', premWrittenIsGrowthGoodForColor, false);


  const kpis: Kpi[] = [
    {
      id: 'marginal_contribution_ratio', title: '边际贡献率',
      value: formatDisplayValue(current.marginal_contribution_ratio, 'marginal_contribution_ratio'),
      rawValue: current.marginal_contribution_ratio, icon: 'Ratio',
      ...createKpiComparisonFields(current.marginal_contribution_ratio, comparisonMetrics?.marginal_contribution_ratio, 'marginal_contribution_ratio', true, true),
    },
    {
      id: 'variable_cost_ratio', title: '变动成本率',
      value: formatDisplayValue(current.variable_cost_ratio, 'variable_cost_ratio'),
      rawValue: current.variable_cost_ratio, icon: 'Zap',
      isBorderRisk: current.variable_cost_ratio !== undefined && current.variable_cost_ratio >= 90,
      ...createKpiComparisonFields(current.variable_cost_ratio, comparisonMetrics?.variable_cost_ratio, 'variable_cost_ratio', false, true),
    },
    {
      id: 'expense_ratio', title: '费用率',
      value: formatDisplayValue(current.expense_ratio, 'expense_ratio'),
      rawValue: current.expense_ratio, icon: 'Percent',
      isOrangeRisk: current.expense_ratio !== undefined && current.expense_ratio > 14.5,
      ...createKpiComparisonFields(current.expense_ratio, comparisonMetrics?.expense_ratio, 'expense_ratio', false, true),
    },
    {
      id: 'loss_ratio', title: '满期赔付率',
      value: formatDisplayValue(current.loss_ratio, 'loss_ratio'),
      rawValue: current.loss_ratio, icon: 'ShieldAlert',
      isRisk: current.loss_ratio !== undefined && current.loss_ratio > 70,
      description: "基于已报告赔款",
      ...createKpiComparisonFields(current.loss_ratio, comparisonMetrics?.loss_ratio, 'loss_ratio', false, true),
    },
    {
      id: 'marginal_contribution_amount', title: '边贡额',
      value: formatDisplayValue(current.marginal_contribution_amount, 'marginal_contribution_amount'),
      rawValue: current.marginal_contribution_amount, unit: METRIC_FORMAT_RULES['marginal_contribution_amount'].unitLabel,
      ...createKpiComparisonFields(current.marginal_contribution_amount, comparisonMetrics?.marginal_contribution_amount, 'marginal_contribution_amount', true, false),
    },
    {
      id: 'premium_written', title: '保费',
      value: formatDisplayValue(current.premium_written, 'premium_written'),
      rawValue: current.premium_written, unit: METRIC_FORMAT_RULES['premium_written'].unitLabel,
      comparisonChange: premWrittenChanges.comparisonChange,
      comparisonChangeAbsolute: premWrittenChanges.comparisonChangeAbsolute,
      comparisonChangeAbsoluteRaw: premWrittenChanges.comparisonChangeAbsoluteRaw,
      comparisonChangeType: premWrittenChanges.comparisonChangeType,
    },
    {
      id: 'expense_amount', title: '费用',
      value: formatDisplayValue(current.expense_amount, 'expense_amount'),
      rawValue: current.expense_amount, unit: METRIC_FORMAT_RULES['expense_amount'].unitLabel,
      ...createKpiComparisonFields(current.expense_amount, comparisonMetrics?.expense_amount, 'expense_amount', false, false),
    },
    {
      id: 'total_loss_amount', title: '赔款',
      value: formatDisplayValue(current.total_loss_amount, 'total_loss_amount'),
      rawValue: current.total_loss_amount, unit: METRIC_FORMAT_RULES['total_loss_amount'].unitLabel,
      ...createKpiComparisonFields(current.total_loss_amount, comparisonMetrics?.total_loss_amount, 'total_loss_amount', false, false),
    },
     {
      id: 'premium_earned', title: '满期保费',
      value: formatDisplayValue(current.premium_earned, 'premium_earned'),
      rawValue: current.premium_earned, unit: METRIC_FORMAT_RULES['premium_earned'].unitLabel,
      ...createKpiComparisonFields(current.premium_earned, comparisonMetrics?.premium_earned, 'premium_earned', true, false),
    },
    {
      id: 'premium_earned_ratio', title: '保费满期率',
      value: formatDisplayValue(current.premium_earned_ratio, 'premium_earned_ratio'),
      rawValue: current.premium_earned_ratio, icon: 'Ratio',
      ...createKpiComparisonFields(current.premium_earned_ratio, comparisonMetrics?.premium_earned_ratio, 'premium_earned_ratio', true, true),
    },
    {
      id: 'avg_premium_per_policy', title: '单均保费',
      value: formatDisplayValue(current.avg_premium_per_policy, 'avg_premium_per_policy'),
      rawValue: current.avg_premium_per_policy, unit: METRIC_FORMAT_RULES['avg_premium_per_policy'].unitLabel,
      ...createKpiComparisonFields(current.avg_premium_per_policy, comparisonMetrics?.avg_premium_per_policy, 'avg_premium_per_policy', true, false),
    },
    {
      id: 'policy_count', title: '保单件数',
      value: formatDisplayValue(current.policy_count, 'policy_count'),
      rawValue: current.policy_count, unit: METRIC_FORMAT_RULES['policy_count'].unitLabel,
      ...createKpiComparisonFields(current.policy_count, comparisonMetrics?.policy_count, 'policy_count', true, false),
    },
    {
      id: 'premium_share', title: '保费占比',
      value: formatDisplayValue(data.premium_share, 'premium_share'), 
      rawValue: data.premium_share, icon: 'PieChart',
      ...createKpiComparisonFields(data.premium_share, data.momMetrics?.premium_share, 'premium_share', true, true),
    },
    {
      id: 'claim_frequency', title: '满期出险率',
      value: formatDisplayValue(current.claim_frequency, 'claim_frequency'),
      rawValue: current.claim_frequency, icon: 'Activity',
      ...createKpiComparisonFields(current.claim_frequency, comparisonMetrics?.claim_frequency, 'claim_frequency', false, true),
    },
    {
      id: 'avg_loss_per_case', title: '案均赔款',
      value: formatDisplayValue(current.avg_loss_per_case, 'avg_loss_per_case'),
      rawValue: current.avg_loss_per_case, unit: METRIC_FORMAT_RULES['avg_loss_per_case'].unitLabel,
      ...createKpiComparisonFields(current.avg_loss_per_case, comparisonMetrics?.avg_loss_per_case, 'avg_loss_per_case', false, false),
    },
    {
      id: 'claim_count', title: '已报件数',
      value: formatDisplayValue(current.claim_count, 'claim_count'),
      rawValue: current.claim_count, unit: METRIC_FORMAT_RULES['claim_count'].unitLabel,
      ...createKpiComparisonFields(current.claim_count, comparisonMetrics?.claim_count, 'claim_count', false, false),
    },
  ];
  return kpis.map(kpi => ({
      ...kpi,
      icon: kpi.unit ? undefined : (kpi.icon || 'ShieldCheck')
  }));
};


(globalThis as any).allV4DataForKpiWorkaround = [];

export function setGlobalV4DataForKpiWorkaround(allV4Data: V4PeriodData[], activePeriodId: string) {
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
    activePeriodId: string
) {
    if (!data || data.length === 0) {
        console.warn("No data to export.");
        return;
    }

    let comparisonColumnLabelPrefix = "";
    const defaultMomLabel = "上一期";

    let actualComparisonPeriodIdForExport: string | null = selectedComparisonPeriodKey;
    if (!actualComparisonPeriodIdForExport) {
        const currentPeriodEntryFromGlobal = (globalThis as any).allV4DataForKpiWorkaround?.find((p: V4PeriodData) => p.period_id === activePeriodId);
        actualComparisonPeriodIdForExport = currentPeriodEntryFromGlobal?.comparison_period_id_mom || null;
    }
    const actualComparisonPeriodLabel = actualComparisonPeriodIdForExport
        ? allPeriodOptions.find(p => p.value === actualComparisonPeriodIdForExport)?.label
        : defaultMomLabel;

    comparisonColumnLabelPrefix = actualComparisonPeriodLabel ? `对比${actualComparisonPeriodLabel}` : "无对比期";

    const headersBase = [
        "业务线名称", "跟单保费(万元)", "满期保费(万元)", "总赔款(万元)", "费用(额)(万元)",
        "保单数量(件)", "已报件数(件)", "满期保单(件)", "单均保费(元)", "案均赔款(元)",
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
    if (analysisMode === 'periodOverPeriod' && comparisonColumnLabelPrefix !== "无对比期") {
        csvHeaders.push(...comparisonHeaders);
    }
    
    const rows = data.map(item => {
        const current = item.currentMetrics;
        const comp = item.momMetrics;

        const rowData: (string | number | undefined | null)[] = [
            item.businessLineName,
            current.premium_written, current.premium_earned, current.total_loss_amount, current.expense_amount,
            current.policy_count, current.claim_count, current.policy_count_earned,
            current.avg_premium_per_policy, current.avg_loss_per_case,
            current.loss_ratio, current.expense_ratio, current.variable_cost_ratio, current.premium_earned_ratio, current.claim_frequency,
            current.marginal_contribution_ratio, current.marginal_contribution_amount, item.premium_share
        ];

        if (analysisMode === 'periodOverPeriod' && comp && comparisonColumnLabelPrefix !== "无对比期") {
            const premWrittenChange = calculateChangeAndType(current.premium_written, comp.premium_written, true);
            const tlaChange = calculateChangeAndType(current.total_loss_amount, comp.total_loss_amount, false);
            const policyCntChange = calculateChangeAndType(current.policy_count, comp.policy_count, true);
            const erChange = calculateChangeAndType(current.expense_ratio, comp.expense_ratio, false);
            const lrChange = calculateChangeAndType(current.loss_ratio, comp.loss_ratio, false);
            const vcrChange = calculateChangeAndType(current.variable_cost_ratio, comp.variable_cost_ratio, false);
            const mcrChange = calculateChangeAndType(current.marginal_contribution_ratio, comp.marginal_contribution_ratio, true);

            rowData.push(
                premWrittenChange.percent, premWrittenChange.absolute,
                tlaChange.percent, tlaChange.absolute,
                policyCntChange.percent, policyCntChange.absolute,
                erChange.absolute, lrChange.absolute, vcrChange.absolute, mcrChange.absolute
            );
        }

        return rowData.map(val => {
            if (val === undefined || val === null || (typeof val === 'number' && isNaN(val))) return "";
            if (typeof val === 'number') {
                if (val % 1 !== 0) {
                    if (Math.abs(val) < 0.00001 && Math.abs(val) !== 0) return val.toExponential(4);
                    return val.toFixed(4);
                }
                return val.toString();
            }
            return String(val).replace(/,/g, ';');
        }).join(",");
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
