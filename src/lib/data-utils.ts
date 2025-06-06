
import type { ProcessedDataForPeriod, Kpi, ChartDataItem, BubbleChartDataItem, V4PeriodData, V4BusinessDataEntry, V4PeriodTotals, AggregatedBusinessMetrics, AnalysisMode } from '@/data/types';
import { DollarSign, FileText, Percent, Briefcase, Zap, Activity, TrendingUp, TrendingDown, Minus, ShieldCheck, Landmark, Users, Ratio, Search } from 'lucide-react';

export const formatCurrency = (value: number | undefined, displayUnit: '万元' | '元' = '万元'): string => {
  if (value === undefined || isNaN(value) || value === null) return 'N/A';
  if (displayUnit === '万元') {
    return `${value.toFixed(2)} 万元`;
  } else { // displayUnit === '元'
    return `${new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)} 元`;
  }
};

export const formatNumber = (value: number | undefined): string => {
  if (value === undefined || isNaN(value) || value === null) return 'N/A';
  return new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

export const formatPercentage = (value: number | undefined, decimals: number = 2): string => {
  if (value === undefined || isNaN(value) || value === null) return 'N/A';
  return `${value.toFixed(decimals)}%`;
};


// --- V4.0 Data Processing Logic ---

/**
 * Calculates derived metrics for a single business entry based on its YTD values.
 * Does not handle "periodOverPeriod" calculations.
 */
const calculateMetricsForBusinessEntry = (entry: V4BusinessDataEntry): AggregatedBusinessMetrics => {
  const premium_written = entry.premium_written || 0;
  const premium_earned = entry.premium_earned || 0;
  const total_loss_amount = entry.total_loss_amount || 0;
  const expense_amount_raw = entry.expense_amount_raw || 0;
  const claim_count = entry.claim_count || 0;
  const policy_count_earned = entry.policy_count_earned || 0;
  const avg_premium_per_policy_json = entry.avg_premium_per_policy; // in 元

  // Derived policy_count (in 件)
  const policy_count = (avg_premium_per_policy_json && avg_premium_per_policy_json !== 0)
    ? (premium_written * 10000) / avg_premium_per_policy_json
    : 0;

  // Rates based on YTD values for a single business line
  const loss_ratio = premium_earned !== 0 ? (total_loss_amount / premium_earned) * 100 : 0;
  const expense_ratio = premium_written !== 0 ? (expense_amount_raw / premium_written) * 100 : 0;
  const variable_cost_ratio = loss_ratio + expense_ratio;
  const premium_earned_ratio = premium_written !== 0 ? (premium_earned / premium_written) * 100 : 0;
  const claim_frequency = policy_count_earned !== 0 ? (claim_count / policy_count_earned) * 100 : 0;

  // Averages based on YTD values
  const avg_premium_per_policy = policy_count !== 0 ? (premium_written * 10000) / policy_count : 0; // in 元
  const avg_loss_per_case = claim_count !== 0 ? (total_loss_amount * 10000) / claim_count : 0; // in 元
  
  const expense_amount = premium_written * (expense_ratio / 100); // in 万元

  return {
    premium_written,
    premium_earned,
    total_loss_amount,
    expense_amount_raw,
    policy_count,
    claim_count,
    policy_count_earned,
    avg_commercial_index: entry.avg_commercial_index,

    loss_ratio,
    expense_ratio,
    variable_cost_ratio,
    premium_earned_ratio,
    claim_frequency,
    avg_premium_per_policy,
    avg_loss_per_case,
    expense_amount,
  };
};

/**
 * Aggregates business data for a period and calculates metrics.
 * Handles 'cumulative' (YTD) and 'periodOverPeriod' (当周发生额) logic.
 */
const aggregateAndCalculateMetrics = (
  periodBusinessData: V4BusinessDataEntry[],
  analysisMode: AnalysisMode,
  previousPeriodBusinessData?: V4BusinessDataEntry[] // For 'periodOverPeriod' calculation
): AggregatedBusinessMetrics => {
  let dataToProcess: V4BusinessDataEntry[] = periodBusinessData;

  if (analysisMode === 'periodOverPeriod' && previousPeriodBusinessData) {
    dataToProcess = periodBusinessData.map(currentEntry => {
      const prevEntry = previousPeriodBusinessData.find(pe => pe.business_type === currentEntry.business_type);
      if (!prevEntry) return currentEntry; // If no previous entry, "current period actual" is the YTD value

      return {
        ...currentEntry, // Keep pre-calculated rates/averages from current YTD for reference if needed
        premium_written: (currentEntry.premium_written || 0) - (prevEntry.premium_written || 0),
        premium_earned: (currentEntry.premium_earned || 0) - (prevEntry.premium_earned || 0),
        total_loss_amount: (currentEntry.total_loss_amount || 0) - (prevEntry.total_loss_amount || 0),
        expense_amount_raw: (currentEntry.expense_amount_raw || 0) - (prevEntry.expense_amount_raw || 0),
        claim_count: (currentEntry.claim_count || 0) - (prevEntry.claim_count || 0),
        policy_count_earned: (currentEntry.policy_count_earned || 0) - (prevEntry.policy_count_earned || 0),
        // avg_premium_per_policy, avg_loss_per_case, avg_commercial_index are not directly differenced.
        // They will be recalculated based on the differenced base amounts.
      };
    });
  }

  // If only one business type is effectively selected (after filtering, not implemented yet, or if original data has one line)
  // AND it's cumulative mode, use pre-calculated values from JSON for rates/averages.
  if (dataToProcess.length === 1 && analysisMode === 'cumulative') {
    const singleEntry = dataToProcess[0];
    // Use calculateMetricsForBusinessEntry to ensure all derived values are present,
    // but it primarily relies on JSON pre-calculated for rates if they were perfect.
    // However, for consistency, recalculate based on its own base values.
    // JSON pre-calcs are more of a reference/validation.
    const metrics = calculateMetricsForBusinessEntry(singleEntry);
    return {
        ...metrics,
        // Override with JSON pre-calculated values if absolutely needed and trusted,
        // but recalculating ensures consistency. For now, stick to recalculation.
        loss_ratio: singleEntry.loss_ratio !== undefined ? singleEntry.loss_ratio : metrics.loss_ratio,
        expense_ratio: singleEntry.expense_ratio !== undefined ? singleEntry.expense_ratio : metrics.expense_ratio,
        variable_cost_ratio: singleEntry.variable_cost_ratio !== undefined ? singleEntry.variable_cost_ratio : metrics.variable_cost_ratio,
        premium_earned_ratio: singleEntry.premium_earned_ratio !== undefined ? singleEntry.premium_earned_ratio : metrics.premium_earned_ratio,
        claim_frequency: singleEntry.claim_frequency !== undefined ? singleEntry.claim_frequency : metrics.claim_frequency,
        avg_premium_per_policy: singleEntry.avg_premium_per_policy !== undefined ? singleEntry.avg_premium_per_policy : metrics.avg_premium_per_policy,
        avg_loss_per_case: singleEntry.avg_loss_per_case !== undefined ? singleEntry.avg_loss_per_case : metrics.avg_loss_per_case,
        avg_commercial_index: singleEntry.avg_commercial_index, // This is always direct from JSON
    };
  }


  // Aggregation for multiple business types or for "periodOverPeriod" mode
  const aggregated = dataToProcess.reduce((acc, entry) => {
    const entryMetrics = calculateMetricsForBusinessEntry(entry); // Calculate derived policy_count for each line
    
    acc.premium_written += entry.premium_written || 0; // Use already processed value (YTD or period-over-period)
    acc.premium_earned += entry.premium_earned || 0;
    acc.total_loss_amount += entry.total_loss_amount || 0;
    acc.expense_amount_raw += entry.expense_amount_raw || 0;
    acc.policy_count += entryMetrics.policy_count; // Sum up derived policy_counts
    acc.claim_count += entry.claim_count || 0;
    acc.policy_count_earned += entry.policy_count_earned || 0;
    // avg_commercial_index is not aggregated
    return acc;
  }, {
    premium_written: 0, premium_earned: 0, total_loss_amount: 0, expense_amount_raw: 0,
    policy_count: 0, claim_count: 0, policy_count_earned: 0, avg_commercial_index: undefined,
  } as AggregatedBusinessMetrics & { policy_count: number }); // policy_count needs to be part of acc


  // Recalculate rates and averages based on aggregated sums
  const loss_ratio = aggregated.premium_earned !== 0 ? (aggregated.total_loss_amount / aggregated.premium_earned) * 100 : 0;
  const expense_ratio = aggregated.premium_written !== 0 ? (aggregated.expense_amount_raw / aggregated.premium_written) * 100 : 0;
  const variable_cost_ratio = loss_ratio + expense_ratio;
  const premium_earned_ratio = aggregated.premium_written !== 0 ? (aggregated.premium_earned / aggregated.premium_written) * 100 : 0;
  const claim_frequency = aggregated.policy_count_earned !== 0 ? (aggregated.claim_count / aggregated.policy_count_earned) * 100 : 0;
  const avg_premium_per_policy = aggregated.policy_count !== 0 ? (aggregated.premium_written * 10000) / aggregated.policy_count : 0;
  const avg_loss_per_case = aggregated.claim_count !== 0 ? (aggregated.total_loss_amount * 10000) / aggregated.claim_count : 0;
  const expense_amount = aggregated.premium_written * (expense_ratio / 100);

  return {
    premium_written: aggregated.premium_written,
    premium_earned: aggregated.premium_earned,
    total_loss_amount: aggregated.total_loss_amount,
    expense_amount_raw: aggregated.expense_amount_raw,
    policy_count: aggregated.policy_count,
    claim_count: aggregated.claim_count,
    policy_count_earned: aggregated.policy_count_earned,
    avg_commercial_index: dataToProcess.length === 1 ? dataToProcess[0].avg_commercial_index : undefined, // Only if single effective line

    loss_ratio,
    expense_ratio,
    variable_cost_ratio,
    premium_earned_ratio,
    claim_frequency,
    avg_premium_per_policy,
    avg_loss_per_case,
    expense_amount,
  };
};

/**
 * Processes V4 data for a selected period, analysis mode, and business types.
 * Returns an array of ProcessedDataForPeriod (typically one item for "合计" or selected types).
 */
export const processDataForSelectedPeriod = (
  allV4Data: V4PeriodData[],
  selectedPeriodId: string,
  analysisMode: AnalysisMode,
  selectedBusinessTypes: string[] // Empty array means all business types (合计)
): ProcessedDataForPeriod[] => {
  const currentPeriod = allV4Data.find(p => p.period_id === selectedPeriodId);
  if (!currentPeriod) return [];

  const momPeriodId = currentPeriod.comparison_period_id_mom;
  const momPeriod = momPeriodId ? allV4Data.find(p => p.period_id === momPeriodId) : undefined;

  const yoyPeriodId = currentPeriod.comparison_period_id_yoy;
  const yoyPeriod = yoyPeriodId ? allV4Data.find(p => p.period_id === yoyPeriodId) : undefined;
  
  // Filter business data based on selectedBusinessTypes. If empty, use all.
  // Exclude "合计" from individual processing if it exists in business_data
  const filterData = (data?: V4BusinessDataEntry[]) => {
    if (!data) return [];
    const actualData = data.filter(bd => bd.business_type !== "合计"); // Exclude a raw "合计" line if present
    if (selectedBusinessTypes.length === 0) return actualData;
    return actualData.filter(bd => selectedBusinessTypes.includes(bd.business_type));
  };

  const currentBusinessData = filterData(currentPeriod.business_data);
  const momBusinessData = filterData(momPeriod?.business_data);
  const yoyBusinessData = filterData(yoyPeriod?.business_data);

  // Calculate metrics for the current period (YTD or Period-over-Period)
  const currentMetrics = aggregateAndCalculateMetrics(
    currentBusinessData,
    analysisMode,
    analysisMode === 'periodOverPeriod' ? momBusinessData : undefined // Pass mom data only for PoP calculation
  );

  // Calculate YTD metrics for MoM comparison period (always YTD for comparison base)
  const momMetrics = momPeriod ? aggregateAndCalculateMetrics(momBusinessData, 'cumulative') : undefined;
  
  // Calculate YTD metrics for YoY comparison period (always YTD for comparison base)
  const yoyMetrics = yoyPeriod ? aggregateAndCalculateMetrics(yoyBusinessData, 'cumulative') : undefined;
  
  const businessLineName = selectedBusinessTypes.length === 0 || selectedBusinessTypes.length > 1 
                           ? "合计" 
                           : selectedBusinessTypes[0];
                           
  const businessLineId = businessLineName; // Or generate a unique ID if needed

  return [{
    businessLineId,
    businessLineName,
    // icon: undefined, // TODO: Map icons if needed

    currentMetrics,
    momMetrics,
    yoyMetrics,

    // Legacy fields (to be phased out or mapped from currentMetrics)
    premium_written: currentMetrics.premium_written,
    total_loss_amount: currentMetrics.total_loss_amount,
    policy_count: currentMetrics.policy_count,
    loss_ratio: currentMetrics.loss_ratio,
    expense_ratio: currentMetrics.expense_ratio,
    variable_cost_ratio: currentMetrics.variable_cost_ratio,

    // Fields for data table, changes will be calculated in calculateKpis or directly in DataTableSection
  }] as ProcessedDataForPeriod[]; 
};


const calculateChangeAndType = (current?: number, previous?: number, higherIsBetter: boolean = true): { percent?: number, absolute?: number, type: Kpi['changeType'] } => {
  if (current === undefined || previous === undefined || current === null || previous === null || isNaN(current) || isNaN(previous)) {
    return { type: 'neutral' };
  }
  const absolute = current - previous;
  let percent: number | undefined;
  if (previous !== 0) {
    percent = (absolute / Math.abs(previous)) * 100;
  } else if (current !== 0) {
    percent = current > 0 ? 100 : -100; // Or Infinity
  } else {
    percent = 0;
  }

  let type: Kpi['changeType'] = 'neutral';
  if (absolute > 0) type = higherIsBetter ? 'positive' : 'negative';
  if (absolute < 0) type = higherIsBetter ? 'negative' : 'positive';
  
  return { percent, absolute, type };
};


export const calculateKpis = (
  processedData: ProcessedDataForPeriod[], // Expecting a single entry for "合计" or selected line
  overallTotalsForPeriod?: V4PeriodTotals 
): Kpi[] => {
  if (!processedData || processedData.length === 0) return [];
  
  const data = processedData[0]; // Assuming the first entry is the relevant aggregated data
  const current = data.currentMetrics;
  const mom = data.momMetrics;
  const yoy = data.yoyMetrics;

  if (!current) return [];

  // --- Helper to create KPI change strings ---
  const formatChange = (change: { percent?: number, absolute?: number, type: Kpi['changeType'] }, unit: '万元' | '元' | '%' | '件' = '%') => {
    let changePercentStr, changeAbsStr;
    if (change.percent !== undefined) {
        changePercentStr = formatPercentage(change.percent);
    }
    if (change.absolute !== undefined) {
        if (unit === '万元' || unit === '元') changeAbsStr = formatCurrency(change.absolute, unit);
        else if (unit === '%') changeAbsStr = formatPercentage(change.absolute); // For rate changes in pp
        else if (unit === '件') changeAbsStr = formatNumber(change.absolute);
        else changeAbsStr = formatNumber(change.absolute);
    }
    return { change: changePercentStr, changeAbsolute: changeAbsStr, changeType: change.type };
  };

  // --- Calculate changes ---
  // MoM Changes
  const premWrittenMomChg = calculateChangeAndType(current.premium_written, mom?.premium_written);
  const premEarnedMomChg = calculateChangeAndType(current.premium_earned, mom?.premium_earned);
  const lossAmtMomChg = calculateChangeAndType(current.total_loss_amount, mom?.total_loss_amount, false);
  const expenseAmtMomChg = calculateChangeAndType(current.expense_amount, mom?.expense_amount, false);
  const policyCntMomChg = calculateChangeAndType(current.policy_count, mom?.policy_count);
  
  const lossRatioMomChg = calculateChangeAndType(current.loss_ratio, mom?.loss_ratio, false);
  const expenseRatioMomChg = calculateChangeAndType(current.expense_ratio, mom?.expense_ratio, false);
  const varCostRatioMomChg = calculateChangeAndType(current.variable_cost_ratio, mom?.variable_cost_ratio, false);
  const premEarnRatioMomChg = calculateChangeAndType(current.premium_earned_ratio, mom?.premium_earned_ratio);
  const claimFreqMomChg = calculateChangeAndType(current.claim_frequency, mom?.claim_frequency, false);
  const avgPremPolMomChg = calculateChangeAndType(current.avg_premium_per_policy, mom?.avg_premium_per_policy);
  const avgLossCaseMomChg = calculateChangeAndType(current.avg_loss_per_case, mom?.avg_loss_per_case, false);
  
  const marginalContribAmt = current.premium_earned - current.total_loss_amount - (current.expense_amount || 0) ;
  const momMarginalContribAmt = mom ? mom.premium_earned - mom.total_loss_amount - (mom.expense_amount || 0) : undefined;
  const marginalContribAmtMomChg = calculateChangeAndType(marginalContribAmt, momMarginalContribAmt);

  const marginalContribRatio = current.premium_earned !== 0 ? (marginalContribAmt / current.premium_earned) * 100 : 0;
  const momMarginalContribRatio = (mom && mom.premium_earned !== 0) ? (momMarginalContribAmt! / mom.premium_earned) * 100 : undefined;
  const marginalContribRatioMomChg = calculateChangeAndType(marginalContribRatio, momMarginalContribRatio);
  
  // YoY Changes (similar structure, using `yoy` data)
  const premWrittenYoyChg = calculateChangeAndType(current.premium_written, yoy?.premium_written);
  const premEarnedYoyChg = calculateChangeAndType(current.premium_earned, yoy?.premium_earned);
  const lossAmtYoyChg = calculateChangeAndType(current.total_loss_amount, yoy?.total_loss_amount, false);
  const expenseAmtYoyChg = calculateChangeAndType(current.expense_amount, yoy?.expense_amount, false);
  const policyCntYoyChg = calculateChangeAndType(current.policy_count, yoy?.policy_count);

  const lossRatioYoyChg = calculateChangeAndType(current.loss_ratio, yoy?.loss_ratio, false);
  const expenseRatioYoyChg = calculateChangeAndType(current.expense_ratio, yoy?.expense_ratio, false);
  const varCostRatioYoyChg = calculateChangeAndType(current.variable_cost_ratio, yoy?.variable_cost_ratio, false);
  const premEarnRatioYoyChg = calculateChangeAndType(current.premium_earned_ratio, yoy?.premium_earned_ratio);
  const claimFreqYoyChg = calculateChangeAndType(current.claim_frequency, yoy?.claim_frequency, false);
  const avgPremPolYoyChg = calculateChangeAndType(current.avg_premium_per_policy, yoy?.avg_premium_per_policy);
  const avgLossCaseYoyChg = calculateChangeAndType(current.avg_loss_per_case, yoy?.avg_loss_per_case, false);

  const yoyMarginalContribAmt = yoy ? yoy.premium_earned - yoy.total_loss_amount - (yoy.expense_amount || 0) : undefined;
  const marginalContribAmtYoyChg = calculateChangeAndType(marginalContribAmt, yoyMarginalContribAmt);
  
  const yoyMarginalContribRatio = (yoy && yoy.premium_earned !== 0) ? (yoyMarginalContribAmt! / yoy.premium_earned) * 100 : undefined;
  const marginalContribRatioYoyChg = calculateChangeAndType(marginalContribRatio, yoyMarginalContribRatio);

  const premium_share = (overallTotalsForPeriod?.total_premium_written_overall && overallTotalsForPeriod.total_premium_written_overall !== 0 && current.premium_written !== undefined)
    ? (current.premium_written / overallTotalsForPeriod.total_premium_written_overall) * 100
    : 0;
  
  const kpis: Kpi[] = [
    // Column 1
    {
      id: 'marginal_contribution_ratio', title: '边际贡献率', value: formatPercentage(marginalContribRatio), rawValue: marginalContribRatio,
      ...formatChange(marginalContribRatioMomChg, '%'),
      yoyChange: formatChange(marginalContribRatioYoyChg, '%').change, yoyChangeAbsolute: formatChange(marginalContribRatioYoyChg, '%').changeAbsolute, yoyChangeType: marginalContribRatioYoyChg.type,
      icon: Ratio,
    },
    {
      id: 'variable_cost_ratio', title: '变动成本率', value: formatPercentage(current.variable_cost_ratio), rawValue: current.variable_cost_ratio,
      ...formatChange(varCostRatioMomChg, '%'),
      yoyChange: formatChange(varCostRatioYoyChg, '%').change, yoyChangeAbsolute: formatChange(varCostRatioYoyChg, '%').changeAbsolute, yoyChangeType: varCostRatioYoyChg.type,
      icon: Zap, isBorderRisk: current.variable_cost_ratio !== undefined && current.variable_cost_ratio > 90,
    },
    {
      id: 'expense_ratio', title: '费用率', value: formatPercentage(current.expense_ratio), rawValue: current.expense_ratio,
      ...formatChange(expenseRatioMomChg, '%'),
      yoyChange: formatChange(expenseRatioYoyChg, '%').change, yoyChangeAbsolute: formatChange(expenseRatioYoyChg, '%').changeAbsolute, yoyChangeType: expenseRatioYoyChg.type,
      icon: Briefcase, isOrangeRisk: current.expense_ratio !== undefined && current.expense_ratio > 14.5,
    },
    {
      id: 'loss_ratio', title: '满期赔付率', value: formatPercentage(current.loss_ratio), rawValue: current.loss_ratio,
      ...formatChange(lossRatioMomChg, '%'),
      yoyChange: formatChange(lossRatioYoyChg, '%').change, yoyChangeAbsolute: formatChange(lossRatioYoyChg, '%').changeAbsolute, yoyChangeType: lossRatioYoyChg.type,
      icon: Percent, isRisk: current.loss_ratio !== undefined && current.loss_ratio > 70, description: "基于已报告赔款",
    },
    // Column 2
    {
      id: 'marginal_contribution_amount', title: '边贡额', value: formatCurrency(marginalContribAmt), rawValue: marginalContribAmt,
      ...formatChange(marginalContribAmtMomChg, '万元'),
      yoyChange: formatChange(marginalContribAmtYoyChg, '万元').change, yoyChangeAbsolute: formatChange(marginalContribAmtYoyChg, '万元').changeAbsolute, yoyChangeType: marginalContribAmtYoyChg.type,
      icon: Landmark,
    },
    {
      id: 'premium_written', title: '保费', value: formatCurrency(current.premium_written), rawValue: current.premium_written,
      ...formatChange(premWrittenMomChg, '万元'),
      yoyChange: formatChange(premWrittenYoyChg, '万元').change, yoyChangeAbsolute: formatChange(premWrittenYoyChg, '万元').changeAbsolute, yoyChangeType: premWrittenYoyChg.type,
      icon: DollarSign,
    },
    {
      id: 'expense_amount', title: '费用', value: formatCurrency(current.expense_amount), rawValue: current.expense_amount,
      ...formatChange(expenseAmtMomChg, '万元'),
      yoyChange: formatChange(expenseAmtYoyChg, '万元').change, yoyChangeAbsolute: formatChange(expenseAmtYoyChg, '万元').changeAbsolute, yoyChangeType: expenseAmtYoyChg.type,
      icon: Briefcase,
    },
    {
      id: 'total_loss_amount', title: '赔款', value: formatCurrency(current.total_loss_amount), rawValue: current.total_loss_amount,
      ...formatChange(lossAmtMomChg, '万元'),
      yoyChange: formatChange(lossAmtYoyChg, '万元').change, yoyChangeAbsolute: formatChange(lossAmtYoyChg, '万元').changeAbsolute, yoyChangeType: lossAmtYoyChg.type,
      icon: ShieldCheck,
    },
    // Column 3
    {
      id: 'premium_earned', title: '满期保费', value: formatCurrency(current.premium_earned), rawValue: current.premium_earned,
      ...formatChange(premEarnedMomChg, '万元'),
      yoyChange: formatChange(premEarnedYoyChg, '万元').change, yoyChangeAbsolute: formatChange(premEarnedYoyChg, '万元').changeAbsolute, yoyChangeType: premEarnedYoyChg.type,
      icon: DollarSign,
    },
    {
      id: 'premium_earned_ratio', title: '保费满期率', value: formatPercentage(current.premium_earned_ratio), rawValue: current.premium_earned_ratio,
       ...formatChange(premEarnRatioMomChg, '%'),
      yoyChange: formatChange(premEarnRatioYoyChg, '%').change, yoyChangeAbsolute: formatChange(premEarnRatioYoyChg, '%').changeAbsolute, yoyChangeType: premEarnRatioYoyChg.type,
      icon: Ratio,
    },
    {
      id: 'avg_premium_per_policy', title: '单均保费', value: formatCurrency(current.avg_premium_per_policy, '元'), rawValue: current.avg_premium_per_policy,
       ...formatChange(avgPremPolMomChg, '元'),
      yoyChange: formatChange(avgPremPolYoyChg, '元').change, yoyChangeAbsolute: formatChange(avgPremPolYoyChg, '元').changeAbsolute, yoyChangeType: avgPremPolYoyChg.type,
      icon: FileText,
    },
    {
      id: 'policy_count', title: '保单件数', value: formatNumber(current.policy_count), rawValue: current.policy_count,
      ...formatChange(policyCntMomChg, '件'),
      yoyChange: formatChange(policyCntYoyChg, '件').change, yoyChangeAbsolute: formatChange(policyCntYoyChg, '件').changeAbsolute, yoyChangeType: policyCntYoyChg.type,
      icon: FileText,
    },
    // Column 4
    {
      id: 'premium_share', title: '保费占比', value: formatPercentage(premium_share), rawValue: premium_share,
      // MoM and YoY for share would require previous period's overall total premium.
      change: undefined, changeAbsolute: undefined, changeType: 'neutral', 
      yoyChange: undefined, yoyChangeAbsolute: undefined, yoyChangeType: 'neutral',
      icon: Users,
    },
    {
      id: 'avg_commercial_index', title: '自主系数', 
      value: current.avg_commercial_index !== undefined && current.avg_commercial_index !== null ? formatNumber(current.avg_commercial_index) : "N/A",
      rawValue: current.avg_commercial_index,
      // Typically not compared period over period in this summary way
      change: undefined, changeAbsolute: undefined, changeType: 'neutral',
      yoyChange: undefined, yoyChangeAbsolute: undefined, yoyChangeType: 'neutral',
      icon: Search,
    },
    {
      id: 'claim_frequency', title: '满期出险率', value: formatPercentage(current.claim_frequency), rawValue: current.claim_frequency,
      ...formatChange(claimFreqMomChg, '%'),
      yoyChange: formatChange(claimFreqYoyChg, '%').change, yoyChangeAbsolute: formatChange(claimFreqYoyChg, '%').changeAbsolute, yoyChangeType: claimFreqYoyChg.type,
      icon: Activity,
    },
    {
      id: 'avg_loss_per_case', title: '案均赔款', value: formatCurrency(current.avg_loss_per_case, '元'), rawValue: current.avg_loss_per_case,
      ...formatChange(avgLossCaseMomChg, '元'),
      yoyChange: formatChange(avgLossCaseYoyChg, '元').change, yoyChangeAbsolute: formatChange(avgLossCaseYoyChg, '元').changeAbsolute, yoyChangeType: avgLossCaseYoyChg.type,
      icon: ShieldCheck,
    },
  ];
  
  return kpis;
};



// Placeholder for trend data - to be implemented
export const prepareTrendData = (
  processedData: ProcessedDataForPeriod[],
  selectedMetricKey: any
): ChartDataItem[] => {
  console.warn("prepareTrendData in data-utils.ts needs V4 implementation using processedData.");
  return [];
};

// Placeholder for bubble chart data - to be implemented
export const prepareBubbleChartData = (processedData: ProcessedDataForPeriod[]): BubbleChartDataItem[] => {
   if (!processedData || processedData.length === 0 || !processedData[0].currentMetrics) return [];
   // This mapping is illustrative. The actual bubble chart will likely need specific metrics for x,y,z
   // and should use currentMetrics from ProcessedDataForPeriod
   return processedData.filter(d => d.businessLineId !== '合计').map(d => ({ // Filter out "合计" if processing multiple lines
       id: d.businessLineId,
       name: d.businessLineName,
       x: d.currentMetrics.premium_written || 0,
       y: d.currentMetrics.loss_ratio || 0,
       z: d.currentMetrics.policy_count || 0, // Example, might be different
   }));
};

// Placeholder for bar rank data - to be implemented
export const prepareBarRankData = (
  processedData: ProcessedDataForPeriod[],
  rankingMetric: keyof Pick<AggregatedBusinessMetrics, 'premium_written' | 'total_loss_amount' | 'policy_count' | 'loss_ratio' | 'expense_ratio' | 'variable_cost_ratio'>
): ChartDataItem[] => {
  if (!processedData || processedData.length === 0 || !processedData[0].currentMetrics) return [];
  
  return [...processedData]
    .filter(d => d.businessLineId !== '合计') // Ensure '合计' is not ranked if it's part of processedData
    .sort((a, b) => (b.currentMetrics?.[rankingMetric] as number || 0) - (a.currentMetrics?.[rankingMetric] as number || 0))
    .map(d => ({
      name: d.businessLineName,
      [rankingMetric]: d.currentMetrics?.[rankingMetric] as number || 0,
    }));
};
