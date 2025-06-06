
import type { ProcessedDataForPeriod, Kpi, V4PeriodData, V4BusinessDataEntry, V4PeriodTotals, AggregatedBusinessMetrics, AnalysisMode } from '@/data/types';
// Removed direct lucide icon imports from here

export const formatCurrency = (value: number | undefined | null, displayUnit: '万元' | '元' = '万元'): string => {
  if (value === undefined || isNaN(value) || value === null) return 'N/A';
  if (displayUnit === '万元') {
    return `${value.toFixed(2)} 万元`;
  } else { // displayUnit === '元'
    return `${new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(value))} 元`;
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

      return {
        ...currentYtdEntry, 
        premium_written: actual_premium_written,
        premium_earned: actual_premium_earned,
        total_loss_amount: actual_total_loss_amount,
        expense_amount_raw: actual_expense_amount_raw,
        claim_count: actual_claim_count,
        policy_count_earned: actual_policy_count_earned,
        avg_premium_per_policy: currentYtdEntry.avg_premium_per_policy, // Crucial: PoP policy_count derivation needs current YTD avg_prem_per_pol
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
      
      const result: AggregatedBusinessMetrics = {
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
      };
      result.variable_cost_ratio = result.loss_ratio + result.expense_ratio; 
      result.expense_amount = result.premium_written * (result.expense_ratio / 100);
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
  
  const agg_variable_cost_ratio = agg_loss_ratio + agg_expense_ratio;
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
  const originalYtdEntriesForCurrentPeriod = currentPeriodData.business_data.filter(
    bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total'
  );
  
  const momPeriodFilteredYtdEntriesForPoP = momOriginalPeriodData ? filterRawBusinessData(momOriginalPeriodData, selectedBusinessTypes) : undefined;

  const currentAggregatedMetrics = aggregateAndCalculateMetrics(
    currentPeriodFilteredYtdEntries,
    analysisMode,
    originalYtdEntriesForCurrentPeriod, 
    analysisMode === 'periodOverPeriod' ? momPeriodFilteredYtdEntriesForPoP : undefined 
  );
  
  const momPeriodFilteredYtdEntriesForComparison = momOriginalPeriodData ? filterRawBusinessData(momOriginalPeriodData, selectedBusinessTypes) : undefined;
  const momAggregatedMetrics = momPeriodFilteredYtdEntriesForComparison && momOriginalPeriodData
    ? aggregateAndCalculateMetrics(momPeriodFilteredYtdEntriesForComparison, 'cumulative', momOriginalPeriodData.business_data.filter( bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total') ) 
    : null;

  const yoyPeriodFilteredYtdEntriesForComparison = yoyOriginalPeriodData ? filterRawBusinessData(yoyOriginalPeriodData, selectedBusinessTypes) : undefined;
  const yoyAggregatedMetrics = yoyPeriodFilteredYtdEntriesForComparison && yoyOriginalPeriodData
    ? aggregateAndCalculateMetrics(yoyPeriodFilteredYtdEntriesForComparison, 'cumulative', yoyOriginalPeriodData.business_data.filter( bd => bd.business_type && bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total'))
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
    icon: derivedBusinessLineName === "合计" || derivedBusinessLineName === "自定义合计" ? 'Users' : 'ShieldCheck', // Default icon, specific icons can be mapped in component
    currentMetrics: currentAggregatedMetrics,
    momMetrics: momAggregatedMetrics,
    yoyMetrics: yoyAggregatedMetrics,
    premium_share: premium_share,
    premium_written: currentAggregatedMetrics.premium_written,
    total_loss_amount: currentAggregatedMetrics.total_loss_amount,
    policy_count: currentAggregatedMetrics.policy_count,
    loss_ratio: currentAggregatedMetrics.loss_ratio,
    expense_ratio: currentAggregatedMetrics.expense_ratio,
    variable_cost_ratio: currentAggregatedMetrics.variable_cost_ratio,
    premium_writtenChange: momAggregatedMetrics && momAggregatedMetrics.premium_written !== 0 ? (currentAggregatedMetrics.premium_written - momAggregatedMetrics.premium_written) / Math.abs(momAggregatedMetrics.premium_written) * 100 : (currentAggregatedMetrics.premium_written !== 0 ? Infinity : 0),
    total_loss_amountChange: momAggregatedMetrics && momAggregatedMetrics.total_loss_amount !== 0 ? (currentAggregatedMetrics.total_loss_amount - momAggregatedMetrics.total_loss_amount) / Math.abs(momAggregatedMetrics.total_loss_amount) * 100 : (currentAggregatedMetrics.total_loss_amount !== 0 ? Infinity : 0),
    policy_countChange: momAggregatedMetrics && momAggregatedMetrics.policy_count !== 0 ? (currentAggregatedMetrics.policy_count - momAggregatedMetrics.policy_count) / Math.abs(momAggregatedMetrics.policy_count) * 100 : (currentAggregatedMetrics.policy_count !== 0 ? Infinity : 0),
    loss_ratioChange: momAggregatedMetrics ? currentAggregatedMetrics.loss_ratio - momAggregatedMetrics.loss_ratio : undefined, 
    expense_ratioChange: momAggregatedMetrics ? currentAggregatedMetrics.expense_ratio - momAggregatedMetrics.expense_ratio : undefined, 
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
  if (absolute > 0.00001) type = higherIsBetter ? 'positive' : 'negative'; 
  if (absolute < -0.00001) type = higherIsBetter ? 'negative' : 'positive';
  
  return { percent, absolute, type };
};


export const calculateKpis = (
  processedData: ProcessedDataForPeriod[], 
  overallTotalsForPeriod?: V4PeriodTotals | null,
  analysisMode?: AnalysisMode, 
  selectedBusinessTypes?: string[] 
): Kpi[] => {
  if (!processedData || processedData.length === 0) return [];
  
  const data = processedData[0]; 
  const current = data.currentMetrics;
  const momYtd = data.momMetrics; 
  const yoyYtd = data.yoyMetrics; 

  if (!current) return [];

  const formatChange = (changeResult: { percent?: number, absolute?: number, type: Kpi['changeType'] }, unit: '万元' | '元' | '%' | '件' = '%', isRateChange: boolean = false, higherIsBetterForColor: boolean = true, decimals: number = 2) => {
    let changePercentStr, changeAbsStr;

    if (changeResult.percent !== undefined && isFinite(changeResult.percent)) {
        changePercentStr = formatPercentage(changeResult.percent, decimals);
    } else if (changeResult.percent === Infinity) {
        changePercentStr = "+∞%";
    } else if (changeResult.percent === -Infinity) {
        changePercentStr = "-∞%";
    }

    if (changeResult.absolute !== undefined) {
        if (unit === '万元' ) changeAbsStr = formatCurrency(changeResult.absolute, '万元');
        else if (unit === '元') changeAbsStr = formatCurrency(changeResult.absolute, '元');
        else if (unit === '%') changeAbsStr = `${changeResult.absolute.toFixed(decimals)} pp`; 
        else if (unit === '件') changeAbsStr = formatNumber(Math.round(changeResult.absolute)) + " 件";
        else changeAbsStr = formatNumber(changeResult.absolute);
    }
    
    let effectiveChangeType = changeResult.type;
    if (isRateChange) { 
        if (changeResult.absolute !== undefined && Math.abs(changeResult.absolute) > 0.00001) { // Increased precision for pp check
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
  
  let displayAvgCommercialIndex = "N/A";
  let rawAvgCommercialIndex: number | undefined | null = undefined;

  const isSingleSelectedType = selectedBusinessTypes && selectedBusinessTypes.length === 1;

  if (isSingleSelectedType && current.avg_commercial_index !== undefined && current.avg_commercial_index !== null) {
    // For single line, show YTD value from current period's data regardless of analysis mode, as per V4 doc update
    const currentPeriodJsonData = allV4Data.find(p => p.period_id === selectedPeriodId);
    const singleLineJsonEntry = currentPeriodJsonData?.business_data.find(bd => bd.business_type === selectedBusinessTypes[0]);
    if (singleLineJsonEntry?.avg_commercial_index !== undefined && singleLineJsonEntry.avg_commercial_index !== null) {
        displayAvgCommercialIndex = singleLineJsonEntry.avg_commercial_index.toFixed(4);
        rawAvgCommercialIndex = singleLineJsonEntry.avg_commercial_index;
    }
  }

  const kpis: Kpi[] = [
    { 
      id: 'marginal_contribution_ratio', title: '边际贡献率', value: formatPercentage(current.marginal_contribution_ratio), rawValue: current.marginal_contribution_ratio,
      ...formatChange(marginalContribRatioMomChg, '%', true, true),
      yoyChange: formatChange(marginalContribRatioYoyChg, '%', true, true).change, yoyChangeAbsolute: formatChange(marginalContribRatioYoyChg, '%', true, true).changeAbsolute, yoyChangeType: formatChange(marginalContribRatioYoyChg, '%', true, true).changeType,
      icon: 'Ratio',
    },
    { 
      id: 'variable_cost_ratio', title: '变动成本率', value: formatPercentage(current.variable_cost_ratio), rawValue: current.variable_cost_ratio,
      ...formatChange(varCostRatioMomChg, '%', true, false), 
      yoyChange: formatChange(varCostRatioYoyChg, '%', true, false).change, yoyChangeAbsolute: formatChange(varCostRatioYoyChg, '%', true, false).changeAbsolute, yoyChangeType: formatChange(varCostRatioYoyChg, '%', true, false).changeType,
      icon: 'Zap', isBorderRisk: current.variable_cost_ratio !== undefined && current.variable_cost_ratio > 90,
    },
    { 
      id: 'expense_ratio', title: '费用率', value: formatPercentage(current.expense_ratio), rawValue: current.expense_ratio,
      ...formatChange(expenseRatioMomChg, '%', true, false), 
      yoyChange: formatChange(expenseRatioYoyChg, '%', true, false).change, yoyChangeAbsolute: formatChange(expenseRatioYoyChg, '%', true, false).changeAbsolute, yoyChangeType: formatChange(expenseRatioYoyChg, '%', true, false).changeType,
      icon: 'Percent', isOrangeRisk: current.expense_ratio !== undefined && current.expense_ratio > 14.5,
    },
    { 
      id: 'loss_ratio', title: '满期赔付率', value: formatPercentage(current.loss_ratio), rawValue: current.loss_ratio,
      ...formatChange(lossRatioMomChg, '%', true, false), 
      yoyChange: formatChange(lossRatioYoyChg, '%', true, false).change, yoyChangeAbsolute: formatChange(lossRatioYoyChg, '%', true, false).changeAbsolute, yoyChangeType: formatChange(lossRatioYoyChg, '%', true, false).changeType,
      icon: 'ShieldCheck', isRisk: current.loss_ratio !== undefined && current.loss_ratio > 70, description: "基于已报告赔款",
    },
    { 
      id: 'marginal_contribution_amount', title: '边贡额', value: formatCurrency(current.marginal_contribution_amount), rawValue: current.marginal_contribution_amount,
      ...formatChange(marginalContribAmtMomChg, '万元', false, true),
      yoyChange: formatChange(marginalContribAmtYoyChg, '万元', false, true).change, yoyChangeAbsolute: formatChange(marginalContribAmtYoyChg, '万元', false, true).changeAbsolute, yoyChangeType: formatChange(marginalContribAmtYoyChg, '万元', false, true).changeType,
      icon: 'Landmark',
    },
    { 
      id: 'premium_written', title: '保费', value: formatCurrency(current.premium_written), rawValue: current.premium_written,
      ...formatChange(premWrittenMomChg, '万元', false, true),
      yoyChange: formatChange(premWrittenYoyChg, '万元', false, true).change, yoyChangeAbsolute: formatChange(premWrittenYoyChg, '万元', false, true).changeAbsolute, yoyChangeType: formatChange(premWrittenYoyChg, '万元', false, true).changeType,
      icon: 'DollarSign',
    },
    { 
      id: 'expense_amount', title: '费用', value: formatCurrency(current.expense_amount), rawValue: current.expense_amount,
      ...formatChange(expenseAmtMomChg, '万元', false, false),
      yoyChange: formatChange(expenseAmtYoyChg, '万元', false, false).change, yoyChangeAbsolute: formatChange(expenseAmtYoyChg, '万元', false, false).changeAbsolute, yoyChangeType: formatChange(expenseAmtYoyChg, '万元', false, false).changeType,
      icon: 'Briefcase', 
    },
    { 
      id: 'total_loss_amount', title: '赔款', value: formatCurrency(current.total_loss_amount), rawValue: current.total_loss_amount,
      ...formatChange(lossAmtMomChg, '万元', false, false),
      yoyChange: formatChange(lossAmtYoyChg, '万元', false, false).change, yoyChangeAbsolute: formatChange(lossAmtYoyChg, '万元', false, false).changeAbsolute, yoyChangeType: formatChange(lossAmtYoyChg, '万元', false, false).changeType,
      icon: 'ShieldAlert',
    },
    { 
      id: 'premium_earned', title: '满期保费', value: formatCurrency(current.premium_earned), rawValue: current.premium_earned,
      ...formatChange(premEarnedMomChg, '万元', false, true),
      yoyChange: formatChange(premEarnedYoyChg, '万元', false, true).change, yoyChangeAbsolute: formatChange(premEarnedYoyChg, '万元', false, true).changeAbsolute, yoyChangeType: formatChange(premEarnedYoyChg, '万元', false, true).changeType,
      icon: 'FileText', 
    },
    { 
      id: 'premium_earned_ratio', title: '保费满期率', value: formatPercentage(current.premium_earned_ratio), rawValue: current.premium_earned_ratio,
       ...formatChange(premEarnRatioMomChg, '%', true, true),
      yoyChange: formatChange(premEarnRatioYoyChg, '%', true, true).change, yoyChangeAbsolute: formatChange(premEarnRatioYoyChg, '%', true, true).changeAbsolute, yoyChangeType: formatChange(premEarnRatioYoyChg, '%', true, true).changeType,
      icon: 'Ratio',
    },
    { 
      id: 'avg_premium_per_policy', title: '单均保费', value: formatCurrency(current.avg_premium_per_policy, '元'), rawValue: current.avg_premium_per_policy,
       ...formatChange(avgPremPolMomChg, '元', false, true, 0), 
      yoyChange: formatChange(avgPremPolYoyChg, '元', false, true, 0).change, yoyChangeAbsolute: formatChange(avgPremPolYoyChg, '元', false, true, 0).changeAbsolute, yoyChangeType: formatChange(avgPremPolYoyChg, '元', false, true, 0).changeType,
      icon: 'FileText',
    },
    { 
      id: 'policy_count', title: '保单件数', value: formatNumber(current.policy_count), rawValue: current.policy_count,
      ...formatChange(policyCntMomChg, '件', false, true),
      yoyChange: formatChange(policyCntYoyChg, '件', false, true).change, yoyChangeAbsolute: formatChange(policyCntYoyChg, '件', false, true).changeAbsolute, yoyChangeType: formatChange(policyCntYoyChg, '件', false, true).changeType,
      icon: 'FileText',
    },
    { 
      id: 'premium_share', title: '保费占比', value: formatPercentage(data.premium_share), rawValue: data.premium_share,
      change: undefined, changeAbsolute: undefined, changeType: 'neutral', 
      yoyChange: undefined, yoyChangeAbsolute: undefined, yoyChangeType: 'neutral',
      icon: 'Users',
    },
    { 
      id: 'avg_commercial_index', title: '自主系数', 
      value: displayAvgCommercialIndex, 
      rawValue: rawAvgCommercialIndex,
      change: undefined, changeAbsolute: undefined, changeType: 'neutral',
      yoyChange: undefined, yoyChangeAbsolute: undefined, yoyChangeType: 'neutral',
      icon: 'Search',
    },
    { 
      id: 'claim_frequency', title: '满期出险率', value: formatPercentage(current.claim_frequency), rawValue: current.claim_frequency,
      ...formatChange(claimFreqMomChg, '%', true, false), 
      yoyChange: formatChange(claimFreqYoyChg, '%', true, false).change, yoyChangeAbsolute: formatChange(claimFreqYoyChg, '%', true, false).changeAbsolute, yoyChangeType: formatChange(claimFreqYoyChg, '%', true, false).changeType,
      icon: 'Activity',
    },
    { 
      id: 'avg_loss_per_case', title: '案均赔款', value: formatCurrency(current.avg_loss_per_case, '元'), rawValue: current.avg_loss_per_case,
      ...formatChange(avgLossCaseMomChg, '元', false, false, 0), 
      yoyChange: formatChange(avgLossCaseYoyChg, '元', false, false, 0).change, yoyChangeAbsolute: formatChange(avgLossCaseYoyChg, '元', false, false, 0).changeAbsolute, yoyChangeType: formatChange(avgLossCaseYoyChg, '元', false, false, 0).changeType,
      icon: 'DollarSign',
    },
  ];
  // Temporary: Access allV4Data to get YTD avg_commercial_index for single-line PoP
  // This is a workaround and ideally calculateKpis should receive all necessary info directly.
  // This should be refactored later if possible.
  const currentV4PeriodData = (globalThis as any).allV4DataForKpiWorkaround?.find((p: V4PeriodData) => p.period_id === selectedPeriodId);


  if (isSingleSelectedType && analysisMode === 'periodOverPeriod' && currentV4PeriodData && selectedBusinessTypes) {
    const singleLineJsonEntry = currentV4PeriodData.business_data.find((bd: V4BusinessDataEntry) => bd.business_type === selectedBusinessTypes[0]);
     if (singleLineJsonEntry?.avg_commercial_index !== undefined && singleLineJsonEntry.avg_commercial_index !== null) {
        const kpiIndex = kpis.findIndex(k => k.id === 'avg_commercial_index');
        if (kpiIndex !== -1) {
            kpis[kpiIndex].value = singleLineJsonEntry.avg_commercial_index.toFixed(4);
            kpis[kpiIndex].rawValue = singleLineJsonEntry.avg_commercial_index;
        }
    }
  }
  
  return kpis;
};


// This is a global workaround to pass allV4Data to calculateKpis for avg_commercial_index in PoP single line.
// It's not ideal. This should be addressed by refactoring how data is passed.
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
            "满期赔付率环比(pp)", 
            "费用率环比(pp)"    
        ];
        headers.push(...momHeaders);
    }
    
    const rows = data.map(item => {
        const current = item.currentMetrics;
        // For CSV export, MoM changes are derived from item's direct change properties
        
        const rowData = [
            item.businessLineId, item.businessLineName,
            current.premium_written?.toFixed(2) ?? "N/A", current.premium_earned?.toFixed(2) ?? "N/A", 
            current.total_loss_amount?.toFixed(2) ?? "N/A", current.expense_amount?.toFixed(2) ?? "N/A",
            Math.round(current.policy_count ?? 0), Math.round(current.claim_count ?? 0), Math.round(current.policy_count_earned ?? 0),
            current.avg_premium_per_policy?.toFixed(0) ?? "N/A", current.avg_loss_per_case?.toFixed(0) ?? "N/A", 
            current.avg_commercial_index?.toFixed(4) ?? "N/A", // Assuming avg_commercial_index is on currentMetrics for single line
            current.loss_ratio?.toFixed(2) ?? "N/A", current.expense_ratio?.toFixed(2) ?? "N/A", 
            current.variable_cost_ratio?.toFixed(2) ?? "N/A", current.premium_earned_ratio?.toFixed(2) ?? "N/A", 
            current.claim_frequency?.toFixed(2) ?? "N/A",
            current.marginal_contribution_ratio?.toFixed(2) ?? "N/A", current.marginal_contribution_amount?.toFixed(2) ?? "N/A", 
            item.premium_share?.toFixed(2) ?? "N/A"
        ];

        if (analysisMode === 'periodOverPeriod') {
            const momPremWrittenChange = item.momMetrics && item.momMetrics.premium_written !== 0 ? (current.premium_written - item.momMetrics.premium_written) / Math.abs(item.momMetrics.premium_written) * 100 : (current.premium_written !== 0 ? Infinity : 0);
            const momPremWrittenAbs = item.momMetrics ? current.premium_written - item.momMetrics.premium_written : undefined;

            const momLossAmtChange = item.momMetrics && item.momMetrics.total_loss_amount !== 0 ? (current.total_loss_amount - item.momMetrics.total_loss_amount) / Math.abs(item.momMetrics.total_loss_amount) * 100 : (current.total_loss_amount !== 0 ? Infinity : 0);
            const momLossAmtAbs = item.momMetrics ? current.total_loss_amount - item.momMetrics.total_loss_amount : undefined;
            
            const momPolicyCntChange = item.momMetrics && item.momMetrics.policy_count !== 0 ? (current.policy_count - item.momMetrics.policy_count) / Math.abs(item.momMetrics.policy_count) * 100 : (current.policy_count !== 0 ? Infinity : 0);
            const momPolicyCntAbs = item.momMetrics ? current.policy_count - item.momMetrics.policy_count : undefined;

            const momLossRatioPP = item.momMetrics ? current.loss_ratio - item.momMetrics.loss_ratio : undefined;
            const momExpenseRatioPP = item.momMetrics ? current.expense_ratio - item.momMetrics.expense_ratio : undefined;
            
            rowData.push(
                isFinite(momPremWrittenChange) ? momPremWrittenChange.toFixed(2) : (momPremWrittenChange > 0 ? "+∞" : "-∞"), 
                momPremWrittenAbs?.toFixed(2) ?? "N/A",
                isFinite(momLossAmtChange) ? momLossAmtChange.toFixed(2) : (momLossAmtChange > 0 ? "+∞" : "-∞"),
                momLossAmtAbs?.toFixed(2) ?? "N/A",
                isFinite(momPolicyCntChange) ? momPolicyCntChange.toFixed(2) : (momPolicyCntChange > 0 ? "+∞" : "-∞"),
                momPolicyCntAbs !== undefined ? Math.round(momPolicyCntAbs).toString() : "N/A",
                momLossRatioPP?.toFixed(2) ?? "N/A",
                momExpenseRatioPP?.toFixed(2) ?? "N/A"
            );
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

