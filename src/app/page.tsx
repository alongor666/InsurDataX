
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { AnalysisMode, Kpi, ChartDataItem, BubbleChartDataItem, ProcessedDataForPeriod, V4PeriodData, PeriodOption, DashboardView, TrendMetricKey, RankingMetricKey, BubbleMetricKey, AggregatedBusinessMetrics, DataSourceType, CoreAggregatedMetricKey, ShareChartMetricKey, ShareChartDataItem, ParetoChartMetricKey, ParetoChartDataItem } from '@/data/types';

import { AppLayout } from '@/components/layout/app-layout';
import { AppHeader } from '@/components/layout/header';
import { KpiDashboardSection } from '@/components/sections/kpi-dashboard-section';
import { TrendAnalysisSection } from '@/components/sections/trend-analysis-section';
import { BubbleChartSection } from '@/components/sections/bubble-chart-section';
import { BarChartRankingSection } from '@/components/sections/bar-chart-ranking-section';
import { ShareChartSection } from '@/components/sections/share-chart-section';
import { ParetoChartSection } from '@/components/sections/pareto-chart-section.tsx';
import { DataTableSection } from '@/components/sections/data-table-section';
import { AiSummarySection } from '@/components/sections/ai-summary-section';

import { generateBusinessSummary, type GenerateBusinessSummaryInput } from '@/ai/flows/generate-business-summary';
import { generateTrendAnalysis, type GenerateTrendAnalysisInput } from '@/ai/flows/generate-trend-analysis-flow';
import { generateBubbleChartAnalysis, type GenerateBubbleChartAnalysisInput } from '@/ai/flows/generate-bubble-chart-analysis-flow';
import { generateBarRankingAnalysis, type GenerateBarRankingAnalysisInput } from '@/ai/flows/generate-bar-ranking-analysis-flow';
import { generateShareChartAnalysis, type GenerateShareChartAnalysisInput } from '@/ai/flows/generate-share-chart-analysis-flow';
import { generateParetoAnalysis, type GenerateParetoAnalysisInput } from '@/ai/flows/generate-pareto-analysis-flow';


import { useToast } from "@/hooks/use-toast";
import {
  processDataForSelectedPeriod,
  calculateKpis,
  setGlobalV4DataForKpiWorkaround,
  exportToCSV,
  getDynamicColorByVCR
} from '@/lib/data-utils';


const availableTrendMetrics: { value: TrendMetricKey, label: string }[] = [
  { value: 'premium_written', label: '跟单保费 (万元)' },
  { value: 'total_loss_amount', label: '总赔款 (万元)' },
  { value: 'policy_count', label: '保单数量 (件)' },
  { value: 'loss_ratio', label: '满期赔付率 (%)' },
  { value: 'expense_ratio', label: '费用率 (%)' },
  { value: 'variable_cost_ratio', label: '变动成本率 (%)'},
  { value: 'premium_earned', label: '满期保费 (万元)'},
  { value: 'expense_amount', label: '费用额 (万元)'},
  { value: 'claim_count', label: '赔案数量 (件)'},
  { value: 'policy_count_earned', label: '满期保单 (件)'},
  { value: 'marginal_contribution_amount', label: '边贡额 (万元)'},
  { value: 'marginal_contribution_ratio', label: '边际贡献率 (%)'},
];

const availableRankingMetrics: { value: RankingMetricKey, label: string }[] = [
  { value: 'premium_written', label: '跟单保费 (万元)' },
  { value: 'premium_earned', label: '满期保费 (万元)'},
  { value: 'total_loss_amount', label: '总赔款 (万元)' },
  { value: 'expense_amount', label: '费用额 (万元)'},
  { value: 'policy_count', label: '保单数量 (件)' },
  { value: 'claim_count', label: '赔案数量 (件)'},
  { value: 'loss_ratio', label: '满期赔付率 (%)' },
  { value: 'expense_ratio', label: '费用率 (%)' },
  { value: 'variable_cost_ratio', label: '变动成本率 (%)'},
  { value: 'premium_earned_ratio', label: '保费满期率 (%)'},
  { value: 'claim_frequency', label: '满期出险率 (%)'},
  { value: 'avg_premium_per_policy', label: '单均保费 (元)'},
  { value: 'avg_loss_per_case', label: '案均赔款 (元)'},
  { value: 'marginal_contribution_amount', label: '边贡额 (万元)'},
  { value: 'marginal_contribution_ratio', label: '边际贡献率 (%)'},
];

const availableBubbleMetrics: { value: BubbleMetricKey, label: string }[] = [
  { value: 'premium_written', label: '跟单保费 (万元)' },
  { value: 'premium_earned', label: '满期保费 (万元)'},
  { value: 'total_loss_amount', label: '总赔款 (万元)' },
  { value: 'expense_amount', label: '费用额 (万元)'},
  { value: 'policy_count', label: '保单数量 (件)' },
  { value: 'claim_count', label: '赔案数量 (件)'},
  { value: 'policy_count_earned', label: '满期保单 (件)'},
  { value: 'loss_ratio', label: '满期赔付率 (%)' },
  { value: 'expense_ratio', label: '费用率 (%)' },
  { value: 'variable_cost_ratio', label: '变动成本率 (%)'},
  { value: 'premium_earned_ratio', label: '保费满期率 (%)'},
  { value: 'claim_frequency', label: '满期出险率 (%)'},
  { value: 'avg_premium_per_policy', label: '单均保费 (元)'},
  { value: 'avg_loss_per_case', label: '案均赔款 (元)'},
];

const availableShareChartMetrics: { value: ShareChartMetricKey, label: string}[] = [
    { value: 'premium_written', label: '跟单保费 (万元)' },
    { value: 'premium_earned', label: '满期保费 (万元)'},
    { value: 'total_loss_amount', label: '总赔款 (万元)' },
    { value: 'expense_amount', label: '费用额 (万元)'},
    { value: 'policy_count', label: '保单数量 (件)' },
    { value: 'claim_count', label: '赔案数量 (件)'},
    { value: 'policy_count_earned', label: '满期保单 (件)'},
    { value: 'marginal_contribution_amount', label: '边贡额 (万元)'},
];

const availableParetoMetrics: { value: ParetoChartMetricKey, label: string}[] = availableShareChartMetrics;


export default function DashboardPage() {
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('cumulative');
  const [activeView, setActiveView] = useState<DashboardView>('kpi');
  const [dataSource, setDataSource] = useState<DataSourceType>('json');

  const [allV4Data, setAllV4Data] = useState<V4PeriodData[]>([]);
  const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('');
  const [selectedComparisonPeriodKey, setSelectedComparisonPeriodKey] = useState<string | null>(null);

  const [allBusinessTypes, setAllBusinessTypes] = useState<string[]>([]);
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>([]);

  const [processedData, setProcessedData] = useState<ProcessedDataForPeriod[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);

  const [selectedTrendMetric, setSelectedTrendMetric] = useState<TrendMetricKey>('premium_written');
  const [trendChartData, setTrendChartData] = useState<ChartDataItem[]>([]);

  const [selectedBubbleXAxisMetric, setSelectedBubbleXAxisMetric] = useState<BubbleMetricKey>('premium_written');
  const [selectedBubbleYAxisMetric, setSelectedBubbleYAxisMetric] = useState<BubbleMetricKey>('loss_ratio');
  const [selectedBubbleSizeMetric, setSelectedBubbleSizeMetric] = useState<BubbleMetricKey>('policy_count');
  const [bubbleChartData, setBubbleChartData] = useState<BubbleChartDataItem[]>([]);

  const [selectedRankingMetric, setSelectedRankingMetric] = useState<RankingMetricKey>('premium_written');
  const [barRankData, setBarRankData] = useState<ChartDataItem[]>([]);

  const [selectedShareChartMetric, setSelectedShareChartMetric] = useState<ShareChartMetricKey>('premium_written');
  const [shareChartData, setShareChartData] = useState<ShareChartDataItem[]>([]);

  const [selectedParetoMetric, setSelectedParetoMetric] = useState<ParetoChartMetricKey>('premium_written');
  const [paretoChartData, setParetoChartData] = useState<ParetoChartDataItem[]>([]);


  const [overallAiSummary, setOverallAiSummary] = useState<string | null>(null);
  const [isOverallAiSummaryLoading, setIsOverallAiSummaryLoading] = useState(false);

  const [trendAiSummary, setTrendAiSummary] = useState<string | null>(null);
  const [isTrendAiSummaryLoading, setIsTrendAiSummaryLoading] = useState(false);
  const [bubbleAiSummary, setBubbleAiSummary] = useState<string | null>(null);
  const [isBubbleAiSummaryLoading, setIsBubbleAiSummaryLoading] = useState(false);
  const [barRankAiSummary, setBarRankAiSummary] = useState<string | null>(null);
  const [isBarRankAiSummaryLoading, setIsBarRankAiSummaryLoading] = useState(false);
  const [shareChartAiSummary, setShareChartAiSummary] = useState<string | null>(null);
  const [isShareChartAiSummaryLoading, setIsShareChartAiSummaryLoading] = useState(false);
  const [paretoAiSummary, setParetoAiSummary] = useState<string | null>(null);
  const [isParetoAiSummaryLoading, setIsParetoAiSummaryLoading] = useState(false);


  const [isGlobalLoading, setIsGlobalLoading] = useState(true);

  const { toast } = useToast();

  const currentPeriodLabel = useMemo(() => {
    return periodOptions.find(p => p.value === selectedPeriodKey)?.label || selectedPeriodKey;
  }, [periodOptions, selectedPeriodKey]);

  useEffect(() => {
    const fetchData = async () => {
      setIsGlobalLoading(true);
      setOverallAiSummary(null);
      setTrendAiSummary(null);
      setBubbleAiSummary(null);
      setBarRankAiSummary(null);
      setShareChartAiSummary(null);
      setParetoAiSummary(null);
      try {
        let rawData: any; // Use 'any' temporarily to check structure
        if (dataSource === 'json') {
          toast({ title: "数据加载中", description: "正在从JSON文件加载数据..." });
          const response = await fetch('/data/insurance_data.json');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} when fetching JSON.`);
          }
          rawData = await response.json();
          if (!Array.isArray(rawData)) {
            throw new Error("从JSON文件加载的数据格式不正确，期望得到一个数组。");
          }
          toast({ title: "数据加载成功", description: "已从JSON文件加载数据。" });
        } else if (dataSource === 'db') {
          toast({ title: "数据加载中", description: "正在尝试从PostgreSQL数据库加载数据..." });
          try {
            const response = await fetch('/api/insurance-data');
            if (!response.ok) {
              let errorDetails = "Failed to fetch from DB API.";
              try {
                  const errorJson = await response.json();
                  errorDetails = errorJson.message || errorJson.error || errorDetails;
              } catch (e) {
                  // Failed to parse JSON error response
              }
              throw new Error(errorDetails + ` Status: ${response.status}`);
            }
            rawData = await response.json();
            if (!Array.isArray(rawData)) {
                throw new Error("从数据库API获取的数据格式不正确，期望得到一个数组。");
            }

            if (rawData.length === 0) {
                 toast({ title: "数据库提示", description: "从数据库获取的数据为空，或数据库功能尚未完全实现。" , duration: 5000});
            } else {
                 toast({ title: "数据加载成功", description: "已从PostgreSQL数据库加载数据。" });
            }
          } catch (dbError) {
            console.error("Error fetching from DB API in page.tsx:", dbError);
            toast({ variant: "destructive", title: "数据库加载失败", description: `无法从数据库加载数据: ${dbError instanceof Error ? dbError.message : String(dbError)}. 请检查配置或联系管理员。`, duration: 8000 });
            rawData = []; // Fallback to empty array on DB error
          }
        } else {
            rawData = []; // Should not happen with current DataSourceType
        }
        
        const data: V4PeriodData[] = rawData as V4PeriodData[]; // Cast after validation

        setAllV4Data(data);
        const options = data
          .map(p => ({ value: p.period_id, label: p.period_label }))
          .sort((a, b) => b.label.localeCompare(a.label)); // Sort by label descending (newest first)
        setPeriodOptions(options);
        
        // Workaround for global data access in data-utils (used by exportToCSV)
        if (data.length > 0 && selectedPeriodKey) {
          setGlobalV4DataForKpiWorkaround(data, selectedPeriodKey);
        } else if (data.length > 0 && options.length > 0) {
          setGlobalV4DataForKpiWorkaround(data, options[0].value);
        }


        const currentSelectedIsValid = options.some(opt => opt.value === selectedPeriodKey);
        if (options.length > 0 && (!selectedPeriodKey || !currentSelectedIsValid) ) {
          setSelectedPeriodKey(options[0].value); // Default to newest period if current selection is invalid or not set
        } else if (options.length === 0) { // No data loaded or data has no periods
          setSelectedPeriodKey('');
          setSelectedComparisonPeriodKey(null);
        }

        // Ensure comparison period is valid
        if (selectedComparisonPeriodKey && !options.some(opt => opt.value === selectedComparisonPeriodKey)) {
            setSelectedComparisonPeriodKey(null); // Reset if invalid
        }
        if (selectedComparisonPeriodKey === selectedPeriodKey && selectedPeriodKey !== '') {
            setSelectedComparisonPeriodKey(null); // Reset if same as current
        }

        if (data.length > 0 && data[0].business_data) {
          const uniqueTypes = Array.from(new Set(data.flatMap(p => p.business_data.map(bd => bd.business_type))
            .filter(bt => bt && bt.toLowerCase() !== '合计' && bt.toLowerCase() !== 'total')))
            .sort((a,b) => a.localeCompare(b));
          setAllBusinessTypes(uniqueTypes);
        } else {
          setAllBusinessTypes([]);
        }

      } catch (error) {
        console.error("Error in fetchData:", error);
        toast({ variant: "destructive", title: "数据加载失败", description: `无法加载数据源: ${error instanceof Error ? error.message : String(error)}` });
        setAllV4Data([]);
        setPeriodOptions([]);
        setSelectedPeriodKey('');
        setSelectedComparisonPeriodKey(null);
        setAllBusinessTypes([]);
      } finally {
        setIsGlobalLoading(false);
      }
    };
    fetchData();
  }, [dataSource, toast]); // Removed selectedPeriodKey from dependencies here to avoid re-fetching on period change

  // Effect to update global data for CSV export when selectedPeriodKey or allV4Data changes
  useEffect(() => {
    if (Array.isArray(allV4Data) && allV4Data.length > 0 && selectedPeriodKey) {
      setGlobalV4DataForKpiWorkaround(allV4Data, selectedPeriodKey);
    }
  }, [selectedPeriodKey, allV4Data]);


  // Main data processing useEffect
  useEffect(() => {
    if (isGlobalLoading || !Array.isArray(allV4Data) || allV4Data.length === 0 || !selectedPeriodKey) {
      setProcessedData([]);
      setKpis([]);
      setTrendChartData([]);
      setBubbleChartData([]);
      setBarRankData([]);
      setShareChartData([]);
      setParetoChartData([]);
      return;
    }

    if (selectedComparisonPeriodKey === selectedPeriodKey && selectedPeriodKey !== '') {
        // This check is good, but ensure it doesn't cause an infinite loop if setSelectedComparisonPeriodKey triggers this effect.
        // It's safer to handle this in the period change handlers directly.
        // For now, let's assume this toast is sufficient.
        toast({variant: "destructive", title: "选择错误", description: "当前周期和对比周期不能相同。已重置对比周期。"})
        // If we reset here, it will re-trigger this effect.
        // setSelectedComparisonPeriodKey(null); // Consider if this is desired here or in the handler
        return; 
    }

    const dataForCalculations = processDataForSelectedPeriod(
      allV4Data,
      selectedPeriodKey,
      selectedComparisonPeriodKey,
      analysisMode,
      selectedBusinessTypes
    );
    setProcessedData(dataForCalculations);

    if (dataForCalculations.length > 0) {
      const calculatedKpis = calculateKpis(
        dataForCalculations,
        allV4Data.find(p => p.period_id === selectedPeriodKey)?.totals_for_period,
        analysisMode,
        selectedBusinessTypes,
        allV4Data,      
        selectedPeriodKey 
      );
      setKpis(calculatedKpis);

      const trendData = prepareTrendData_V4(allV4Data, selectedTrendMetric, selectedPeriodKey, analysisMode, selectedBusinessTypes);
      setTrendChartData(trendData);

      const bubbleData = prepareBubbleChartData_V4(allV4Data, selectedPeriodKey, analysisMode, selectedBusinessTypes, selectedBubbleXAxisMetric, selectedBubbleYAxisMetric, selectedBubbleSizeMetric);
      setBubbleChartData(bubbleData);

      const rankData = prepareBarRankData_V4(allV4Data, selectedRankingMetric, selectedPeriodKey, analysisMode, selectedBusinessTypes);
      setBarRankData(rankData);

      const shareData = prepareShareChartData_V4(allV4Data, selectedPeriodKey, analysisMode, selectedBusinessTypes, selectedShareChartMetric);
      setShareChartData(shareData);

      const paretoData = prepareParetoChartData_V4(allV4Data, selectedPeriodKey, analysisMode, selectedBusinessTypes, selectedParetoMetric);
      setParetoChartData(paretoData);
    } else {
      // This case implies currentPeriodData was not found, or no relevant business types after filtering.
      setKpis([]);
      setTrendChartData([]);
      setBubbleChartData([]);
      setBarRankData([]);
      setShareChartData([]);
      setParetoChartData([]);
    }
    // Reset AI summaries when data changes
    setTrendAiSummary(null);
    setBubbleAiSummary(null);
    setBarRankAiSummary(null);
    setShareChartAiSummary(null);
    setParetoAiSummary(null);

  }, [isGlobalLoading, analysisMode, selectedPeriodKey, selectedComparisonPeriodKey, allV4Data, selectedBusinessTypes, selectedTrendMetric, selectedRankingMetric, selectedBubbleXAxisMetric, selectedBubbleYAxisMetric, selectedBubbleSizeMetric, selectedShareChartMetric, selectedParetoMetric, toast]);


 const prepareTrendData_V4 = (
    allData: V4PeriodData[],
    metricKey: TrendMetricKey,
    currentPeriodId: string,
    mode: AnalysisMode,
    selBusinessTypes: string[]
  ): ChartDataItem[] => {
    const trendOutput: ChartDataItem[] = [];
    const maxPeriods = 12;

    const sortedPeriods = [...allData].sort((a, b) => a.period_id.localeCompare(b.period_id));
    const currentPeriodIndexInAll = sortedPeriods.findIndex(p => p.period_id === currentPeriodId);

    if (currentPeriodIndexInAll === -1) return [];

    const startIndexInAll = Math.max(0, currentPeriodIndexInAll - maxPeriods + 1);
    const periodsForTrendRange = sortedPeriods.slice(startIndexInAll, currentPeriodIndexInAll + 1);

    if (mode === 'periodOverPeriod') {
      for (const periodP of periodsForTrendRange) {
        const periodPIndex = sortedPeriods.findIndex(p => p.period_id === periodP.period_id);

        if (periodPIndex === 0 && periodsForTrendRange.length > 1) { // Cannot calculate PoP for the very first period in the range if it's not the only one
          continue;
        } else if (periodsForTrendRange.length === 1 && periodPIndex === 0) { // Cannot calculate PoP if only one period is in range
            continue;
        }
        
        // Try to get the actual previous period ID from current period's data (mom)
        const periodPMinus1Id = periodP.comparison_period_id_mom;
        const periodPMinus1 = periodPMinus1Id ? sortedPeriods.find(p => p.period_id === periodPMinus1Id) : undefined;

        if (!periodPMinus1) continue; // Skip if no valid previous period for PoP calculation

        const processedP_YTD_Data = processDataForSelectedPeriod(
          allData, periodP.period_id, null, 'cumulative', selBusinessTypes
        );
        const metricsP_YTD = processedP_YTD_Data[0]?.currentMetrics;

        const processedPMinus1_YTD_Data = processDataForSelectedPeriod(
          allData, periodPMinus1.period_id, null, 'cumulative', selBusinessTypes
        );
        const metricsPMinus1_YTD = processedPMinus1_YTD_Data[0]?.currentMetrics;

        if (metricsP_YTD && metricsPMinus1_YTD) {
          const valueP_ytd = metricsP_YTD[metricKey as CoreAggregatedMetricKey] as number | undefined | null;
          const valuePMinus1_ytd = metricsPMinus1_YTD[metricKey as CoreAggregatedMetricKey] as number | undefined | null;

          if (typeof valueP_ytd === 'number' && typeof valuePMinus1_ytd === 'number' && !isNaN(valueP_ytd) && !isNaN(valuePMinus1_ytd)) {
            const difference = valueP_ytd - valuePMinus1_ytd;
            const vcrP_ytd = metricsP_YTD.variable_cost_ratio;

            const chartItem: ChartDataItem = {
              name: periodP.period_label,
              color: getDynamicColorByVCR(vcrP_ytd),
              vcr: vcrP_ytd
            };
            const lineName = processedP_YTD_Data[0]?.businessLineName || "合计";
            chartItem[lineName] = difference;
            trendOutput.push(chartItem);
          }
        }
      }
    } else { // mode === 'cumulative'
      periodsForTrendRange.forEach(period => {
        const processedForThisPeriodTrendPoint = processDataForSelectedPeriod(
          allData, period.period_id, null, 'cumulative', selBusinessTypes
        );

        if (processedForThisPeriodTrendPoint.length > 0 && processedForThisPeriodTrendPoint[0].currentMetrics) {
          const metrics = processedForThisPeriodTrendPoint[0].currentMetrics;
          const vcr = metrics.variable_cost_ratio;
          let value: number | undefined | null = metrics[metricKey as CoreAggregatedMetricKey] as number | undefined | null;

          if (typeof value !== 'number' || isNaN(value)) {
            value = 0; // Default to 0 if undefined or NaN
          }

          const chartItem: ChartDataItem = {
            name: period.period_label,
            color: getDynamicColorByVCR(vcr),
            vcr: vcr
          };
          const lineName = processedForThisPeriodTrendPoint[0].businessLineName || "合计";
          chartItem[lineName] = value;
          trendOutput.push(chartItem);
        }
      });
    }
    return trendOutput;
  };


  const prepareBubbleChartData_V4 = (
    allRawData: V4PeriodData[],
    currentPeriodId: string,
    mode: AnalysisMode, // Note: Bubble chart always uses 'cumulative' for its own data, per PRD.
    selBusinessTypes: string[],
    xMetric: BubbleMetricKey,
    yMetric: BubbleMetricKey,
    zMetric: BubbleMetricKey
  ): BubbleChartDataItem[] => {
    let dataForBubbleChart: ProcessedDataForPeriod[] = [];
    const currentRawPeriod = allRawData.find(p => p.period_id === currentPeriodId);
    if (!currentRawPeriod) return [];

    const allIndividualTypesInPeriod = Array.from(new Set(
        (currentRawPeriod.business_data || [])
        .map(bd => bd.business_type)
        .filter(bt => bt && bt.toLowerCase() !== '合计' && bt.toLowerCase() !== 'total')
    ));

    const typesToProcessForBubbles = selBusinessTypes.length > 0 ? selBusinessTypes : allIndividualTypesInPeriod;

    if (typesToProcessForBubbles.length > 0) {
        dataForBubbleChart = typesToProcessForBubbles.map(bt => {
            // Bubble chart always uses YTD data for its display, irrespective of global analysisMode.
            const singleTypeProcessed = processDataForSelectedPeriod(allRawData, currentPeriodId, null, 'cumulative', [bt]);
            return singleTypeProcessed[0];
        }).filter(d => d && d.currentMetrics && d.businessLineId !== '合计' && d.businessLineId !== '自定义合计');
    }

    return dataForBubbleChart.map(d => {
        const metrics = d.currentMetrics as AggregatedBusinessMetrics;
        const vcr = metrics.variable_cost_ratio; // This VCR is YTD because we used 'cumulative' above
        return {
            id: d.businessLineId,
            name: d.businessLineName,
            x: (metrics[xMetric] as number) || 0,
            y: (metrics[yMetric] as number) || 0,
            z: (metrics[zMetric] as number) || 0,
            color: getDynamicColorByVCR(vcr), // Color based on YTD VCR
            vcr: vcr
        };
    }).filter(item => typeof item.x === 'number' && typeof item.y === 'number' && typeof item.z === 'number');
  }

  const prepareBarRankData_V4 = (
    allRawData: V4PeriodData[],
    metricKey: RankingMetricKey,
    currentPeriodId: string,
    mode: AnalysisMode, // Ranking chart data respects global analysisMode
    selBusinessTypes: string[]
    ): ChartDataItem[] => {
    let dataForRanking: ProcessedDataForPeriod[] = [];
    const currentRawPeriod = allRawData.find(p => p.period_id === currentPeriodId);
    if (!currentRawPeriod) return [];

    const allIndividualTypesInPeriod = Array.from(new Set(
        (currentRawPeriod.business_data || [])
        .map(bd => bd.business_type)
        .filter(bt => bt && bt.toLowerCase() !== '合计' && bt.toLowerCase() !== 'total')
    ));

    const typesToProcessForRanking = selBusinessTypes.length > 0 ? selBusinessTypes : allIndividualTypesInPeriod;

    if (typesToProcessForRanking.length > 0) {
        dataForRanking = typesToProcessForRanking.map(bt => {
            // Ranking data is calculated based on the global analysisMode
            const singleTypeProcessed = processDataForSelectedPeriod(allRawData, currentPeriodId, null, mode, [bt]);
            return singleTypeProcessed[0];
        }).filter(d => d && d.currentMetrics && d.businessLineId !== '合计' && d.businessLineId !== '自定义合计');
    }

    return [...dataForRanking]
        .filter(d => d.currentMetrics && d.currentMetrics[metricKey] !== undefined && d.currentMetrics[metricKey] !== null)
        .sort((a, b) => (b.currentMetrics![metricKey] as number || 0) - (a.currentMetrics![metricKey] as number || 0))
        .map(d => {
          const metrics = d.currentMetrics as AggregatedBusinessMetrics;
          // Color for ranking chart is always based on YTD VCR, even if ranking PoP data
          const ytdDataForColor = processDataForSelectedPeriod(allRawData, currentPeriodId, null, 'cumulative', [d.businessLineId])[0];
          const vcrForColoring = ytdDataForColor?.currentMetrics.variable_cost_ratio ?? metrics.variable_cost_ratio; // Fallback to PoP VCR if YTD not found
          
          return {
            name: d.businessLineName,
            [metricKey]: metrics[metricKey] as number || 0,
            color: getDynamicColorByVCR(vcrForColoring),
            vcr: vcrForColoring
          };
        });
  }

  const prepareShareChartData_V4 = (
    allRawData: V4PeriodData[],
    currentPeriodId: string,
    mode: AnalysisMode, // Share chart data respects global analysisMode
    selBusinessTypes: string[],
    metricKey: ShareChartMetricKey
  ): ShareChartDataItem[] => {
    const currentRawPeriod = allRawData.find(p => p.period_id === currentPeriodId);
    if (!currentRawPeriod) return [];

    // For denominator: total of all *independent* business types for the selected metric & mode
    const allIndividualTypesInPeriod = Array.from(new Set(
        (currentRawPeriod.business_data || [])
        .map(bd => bd.business_type)
        .filter(bt => bt && bt.toLowerCase() !== '合计' && bt.toLowerCase() !== 'total')
    ));

    let grandTotalMetricValue = 0;
    // Calculate grand total using *all* independent business types, respecting the analysis mode
    const grandTotalProcessedData = processDataForSelectedPeriod(allRawData, currentPeriodId, null, mode, []); // Empty array for selectedBusinessTypes means sum all
    if (grandTotalProcessedData.length > 0 && grandTotalProcessedData[0].currentMetrics) {
        grandTotalMetricValue = (grandTotalProcessedData[0].currentMetrics[metricKey as CoreAggregatedMetricKey] as number) || 0;
    }

    if (grandTotalMetricValue === 0 && mode === 'cumulative') return []; // Avoid division by zero if total is zero for cumulative
    // For PoP, total might be zero or negative, allow this for now
    if (mode === 'periodOverPeriod' && grandTotalMetricValue === 0 && currentRawPeriod.business_data.some(bd => bd[metricKey as keyof V4BusinessDataEntry] !== 0) ) {
        // If grand PoP is 0 but individual PoPs are not, this means sum of PoPs is 0.
        // Percentage calculation might be strange (e.g. 50 / 0).
        // Let's allow it, but be mindful of interpretation. 0 / 0 will be 0. X / 0 will be problematic if not handled.
    }


    // For numerator: process types based on current selection (selBusinessTypes)
    const typesForSlices = selBusinessTypes.length > 0 ? selBusinessTypes : allIndividualTypesInPeriod;

    const shareData: ShareChartDataItem[] = typesForSlices.map(businessType => {
        const singleTypeProcessedArray = processDataForSelectedPeriod(allRawData, currentPeriodId, null, mode, [businessType]);
        if (singleTypeProcessedArray.length > 0 && singleTypeProcessedArray[0].currentMetrics) {
            const metrics = singleTypeProcessedArray[0].currentMetrics;
            const value = (metrics[metricKey as CoreAggregatedMetricKey] as number) || 0;

            // Color for share chart is always based on YTD VCR
            const ytdDataForColor = processDataForSelectedPeriod(allRawData, currentPeriodId, null, 'cumulative', [businessType])[0];
            const vcrForColoring = ytdDataForColor?.currentMetrics.variable_cost_ratio;

            let percentage = 0;
            if (grandTotalMetricValue !== 0) {
                percentage = (value / grandTotalMetricValue) * 100;
            } else if (value === 0 && grandTotalMetricValue === 0) {
                percentage = 0; // Or handle as N/A if preferred
            } else if (value !== 0 && grandTotalMetricValue === 0){
                percentage = value > 0 ? Infinity : -Infinity; // Or handle as N/A
            }


            return {
                name: singleTypeProcessedArray[0].businessLineName,
                value: value,
                percentage: percentage,
                color: getDynamicColorByVCR(vcrForColoring),
                vcr: vcrForColoring,
            };
        }
        return null;
    }).filter(item => item !== null && (mode === 'cumulative' ? item.value > 0 : item.value !== 0 || item.percentage !== 0) ) as ShareChartDataItem[]; // Filter out zero-value items for cumulative mode

    return shareData.sort((a,b) => b.value - a.value);
  };

  const prepareParetoChartData_V4 = (
    allRawData: V4PeriodData[],
    currentPeriodId: string,
    mode: AnalysisMode, // Pareto chart data respects global analysisMode
    selBusinessTypes: string[],
    metricKey: ParetoChartMetricKey
  ): ParetoChartDataItem[] => {
    const currentRawPeriod = allRawData.find(p => p.period_id === currentPeriodId);
    if (!currentRawPeriod) return [];

    const allIndividualTypesInPeriod = Array.from(new Set(
        (currentRawPeriod.business_data || [])
        .map(bd => bd.business_type)
        .filter(bt => bt && bt.toLowerCase() !== '合计' && bt.toLowerCase() !== 'total')
    ));

    const typesToAnalyze = selBusinessTypes.length > 0 ? selBusinessTypes : allIndividualTypesInPeriod;

    let individualMetrics: { name: string, value: number, vcr?: number, color?: string }[] = [];
    typesToAnalyze.forEach(businessType => {
      const singleTypeProcessedArray = processDataForSelectedPeriod(allRawData, currentPeriodId, null, mode, [businessType]);
      if (singleTypeProcessedArray.length > 0 && singleTypeProcessedArray[0].currentMetrics) {
        const metrics = singleTypeProcessedArray[0].currentMetrics;
        const value = (metrics[metricKey as CoreAggregatedMetricKey] as number) || 0;

        // For Pareto, typically positive contributions are analyzed.
        // If PoP can be negative, decide how to handle: abs value for sorting, or filter out negatives.
        // PRD: "若为PoP模式且有负值，按绝对值降序" - this applies to sorting, but values should be original.
        if (value > 0 || (mode === 'periodOverPeriod' && value !==0) ) { // Include non-zero PoP values.
            // Color for Pareto chart is always based on YTD VCR
            const ytdDataForColor = processDataForSelectedPeriod(allRawData, currentPeriodId, null, 'cumulative', [businessType])[0];
            const vcrForColoring = ytdDataForColor?.currentMetrics.variable_cost_ratio;

            individualMetrics.push({
            name: singleTypeProcessedArray[0].businessLineName,
            value: value,
            vcr: vcrForColoring,
            color: getDynamicColorByVCR(vcrForColoring),
            });
        }
      }
    });

    if (individualMetrics.length === 0) return [];

    // Sort by value: descending for cumulative, descending by absolute value for PoP
    individualMetrics.sort((a, b) => mode === 'periodOverPeriod' ? Math.abs(b.value) - Math.abs(a.value) : b.value - a.value);

    const grandTotal = individualMetrics.reduce((sum, item) => sum + item.value, 0);
    // If grandTotal is 0 or negative (possible in PoP), cumulative percentage might be weird.
    if (grandTotal <= 0 && mode === 'cumulative' && individualMetrics.some(im => im.value > 0)) return []; // If cumulative total is <=0 but items are >0, this is an issue.
    // If PoP total is 0, percentages will be 0 or NaN/Infinity.
    
    let cumulativeValue = 0;
    const paretoData: ParetoChartDataItem[] = individualMetrics.map(item => {
      cumulativeValue += item.value;
      let cumulativePercentage = 0;
      if (grandTotal > 0) { // Only calculate percentage if total is positive, common for Pareto
          cumulativePercentage = (cumulativeValue / grandTotal) * 100;
      } else if (grandTotal === 0 && item.value === 0) {
          cumulativePercentage = 0; // If item and total are 0
      } else if (grandTotal === 0 && item.value !== 0) {
          cumulativePercentage = item.value > 0 ? Infinity : -Infinity; // Or N/A
      }
      // For negative grandTotal in PoP, interpretation of Pareto is complex.
      // Standard Pareto assumes positive contributions.

      return {
        name: item.name,
        value: item.value,
        cumulativePercentage: cumulativePercentage,
        color: item.color,
        vcr: item.vcr,
      };
    });

    return paretoData;
  };


  const getCommonAiFilters = () => {
    let comparisonPeriodInfo = "默认对比 (上一周期)";
    let actualComparisonPeriodId = selectedComparisonPeriodKey;

    if (!actualComparisonPeriodId && Array.isArray(allV4Data)) { // Added Array.isArray check
        const currentPeriodEntry = allV4Data.find(p => p.period_id === selectedPeriodKey);
        if (currentPeriodEntry?.comparison_period_id_mom) {
            actualComparisonPeriodId = currentPeriodEntry.comparison_period_id_mom;
        }
    }

    if (actualComparisonPeriodId) {
        const selectedCompLabel = periodOptions.find(p => p.value === actualComparisonPeriodId)?.label;
        if (selectedCompLabel) {
            comparisonPeriodInfo = `对比周期: ${selectedCompLabel}`;
        } else if (selectedComparisonPeriodKey) { // If a specific key was selected but not found in options (shouldn't happen if valid)
            comparisonPeriodInfo = "对比所选周期 (标签未知)";
        }
    }


    return {
        analysisMode,
        period: currentPeriodLabel,
        comparison: comparisonPeriodInfo,
        selectedBusinessTypes: selectedBusinessTypes.length > 0 ? selectedBusinessTypes.join(', ') : '全部独立业务类型合计',
        vcrColorRules: "变动成本率业务状态解读：<88% 代表“经营优秀，低风险”；88%-92% 代表“经营健康，中等风险”；>=92% 代表“经营告警，高风险”。颜色深浅也指示程度，例如在“经营优秀”状态下，值越低状态越好。"
    };
};


 const handleOverallAiSummary = async () => {
    if (isGlobalLoading || !processedData || processedData.length === 0) {
      toast({ title: "AI摘要提示", description: "数据正在加载或当前无数据，无法生成摘要。" });
      return;
    }
    setIsOverallAiSummaryLoading(true);
    setOverallAiSummary(null);
    try {
      const currentContextData = processedData[0];
      let topBusinessLinesData: any[] = [];

      const relevantMetricsToDisplay = (metrics: AggregatedBusinessMetrics, comparisonMetrics?: AggregatedBusinessMetrics | null, compLabel?: string) => {
        let changeInfo = '无对比数据';
        const currentMetricValue = metrics?.premium_written;
        const comparisonMetricValue = comparisonMetrics?.premium_written;

        if (typeof currentMetricValue === 'number' && typeof comparisonMetricValue === 'number' ) { // More robust check
            const absChange = currentMetricValue - comparisonMetricValue;
            const pctChange = comparisonMetricValue !== 0 ? (absChange / Math.abs(comparisonMetricValue)) * 100 : (currentMetricValue !== 0 ? Infinity : 0);
            let pctChangeStr = isFinite(pctChange) ? `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}%` : (pctChange > 0 ? '+∞%' : '-∞%');
            if (pctChange === 0 && absChange === 0) pctChangeStr = '0.0%';

            changeInfo = `${absChange >= 0 ? '+' : ''}${absChange.toFixed(0)} (${pctChangeStr}, ${compLabel || '对比'})`;
        } else if (typeof currentMetricValue === 'number') {
            changeInfo = `(${currentMetricValue.toFixed(0)}, 无对比数据)`;
        }

        return {
            premiumWritten: `${typeof metrics.premium_written === 'number' ? metrics.premium_written.toFixed(0) : 'N/A'} 万元`,
            lossRatio: `${typeof metrics.loss_ratio === 'number' ? metrics.loss_ratio.toFixed(1) : 'N/A'}%`,
            variableCostRatio: `${typeof metrics.variable_cost_ratio === 'number' ? metrics.variable_cost_ratio.toFixed(1) : 'N/A'}%`,
            changeInPremiumWritten: changeInfo,
        };
      };

      let comparisonLabelForAISummary = "上一周期";
      let actualComparisonPeriodIdForAISummary = selectedComparisonPeriodKey;
      if (!actualComparisonPeriodIdForAISummary && Array.isArray(allV4Data)) {
          const currentPeriodEntry = allV4Data.find(p => p.period_id === selectedPeriodKey);
          actualComparisonPeriodIdForAISummary = currentPeriodEntry?.comparison_period_id_mom || null;
      }
      if (actualComparisonPeriodIdForAISummary) {
          const compLabel = periodOptions.find(p => p.value === actualComparisonPeriodIdForAISummary)?.label;
          if (compLabel) comparisonLabelForAISummary = compLabel;
      }


      if (currentContextData && currentContextData.currentMetrics) {
          if (currentContextData.businessLineId === '合计' || currentContextData.businessLineId === '自定义合计' || selectedBusinessTypes.length === 0) {
             if (Array.isArray(allV4Data)) { // Ensure allV4Data is an array
              const individualLinesData = allBusinessTypes.map(bt => {
                return processDataForSelectedPeriod(allV4Data, selectedPeriodKey, actualComparisonPeriodIdForAISummary, analysisMode, [bt])[0];
              }).filter(d => d && d.currentMetrics && d.businessLineId !== '合计' && d.businessLineId !== '自定义合计');

              topBusinessLinesData = individualLinesData
                .sort((a, b) => (b.currentMetrics.premium_written || 0) - (a.currentMetrics.premium_written || 0))
                .slice(0, 3)
                .map(d => ({
                    name: d.businessLineName,
                    ...relevantMetricsToDisplay(d.currentMetrics, d.momMetrics, comparisonLabelForAISummary)
                }));
             }
          } else {
            topBusinessLinesData = [{
                name: currentContextData.businessLineName,
                ...relevantMetricsToDisplay(currentContextData.currentMetrics, currentContextData.momMetrics, comparisonLabelForAISummary)
            }];
          }
      }

       const aiInputData = {
        keyPerformanceIndicators: kpis.map(kpi => ({
            title: kpi.title,
            value: kpi.value,
            rawValue: kpi.rawValue,
            comparisonChangePercent: kpi.comparisonChange,
            comparisonChangeAbsolute: kpi.comparisonChangeAbsolute,
            isRisk: kpi.isRisk || kpi.isBorderRisk || kpi.isOrangeRisk,
            description: kpi.description
        })),
        ...(topBusinessLinesData.length > 0 && { topBusinessLinesByPremiumWritten: topBusinessLinesData }),
      };

      const input: GenerateBusinessSummaryInput = {
        data: JSON.stringify(aiInputData, null, 2),
        filters: JSON.stringify(getCommonAiFilters(), null, 2),
      };

      const result = await generateBusinessSummary(input);
      setOverallAiSummary(result.summary);
      toast({ title: "AI总体摘要生成成功", description: "业务摘要已更新。" });
    } catch (error) {
      console.error("Error generating overall AI summary:", error);
      setOverallAiSummary("生成AI总体摘要时出错，请稍后再试。");
      toast({ variant: "destructive", title: "AI总体摘要生成失败", description: `请检查控制台获取更多信息。错误: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsOverallAiSummaryLoading(false);
    }
  };

  const handleGenerateTrendAiSummary = async () => {
    if (isGlobalLoading || !trendChartData.length) {
      toast({ variant: "default", title: "无趋势数据", description: "无法为当前选择生成AI趋势分析。" });
      return;
    }
    setIsTrendAiSummaryLoading(true);
    setTrendAiSummary(null);
    try {
      const input: GenerateTrendAnalysisInput = {
        chartDataJson: JSON.stringify(trendChartData.map(({color, ...rest}) => rest)), // Remove color before sending to AI
        selectedMetric: availableTrendMetrics.find(m => m.value === selectedTrendMetric)?.label || selectedTrendMetric,
        analysisMode,
        currentPeriodLabel,
        filtersJson: JSON.stringify(getCommonAiFilters())
      };
      const result = await generateTrendAnalysis(input);
      setTrendAiSummary(result.summary);
      toast({ title: "AI趋势图分析已生成" });
    } catch (error) {
      console.error("Error generating trend AI summary:", error);
      setTrendAiSummary("生成AI趋势图分析时出错。");
      toast({ variant: "destructive", title: "AI趋势图分析失败", description: `错误: ${error instanceof Error ? error.message : String(error)}`});
    } finally {
      setIsTrendAiSummaryLoading(false);
    }
  };

  const handleGenerateBubbleAiSummary = async () => {
    if (isGlobalLoading || !bubbleChartData.length) {
      toast({ variant: "default", title: "无气泡图数据", description: "无法为当前选择生成AI气泡图分析。" });
      return;
    }
    setIsBubbleAiSummaryLoading(true);
    setBubbleAiSummary(null);
    try {
      const input: GenerateBubbleChartAnalysisInput = {
        chartDataJson: JSON.stringify(bubbleChartData.map(({color, ...rest}) => rest)), // Remove color
        xAxisMetric: availableBubbleMetrics.find(m => m.value === selectedBubbleXAxisMetric)?.label || selectedBubbleXAxisMetric,
        yAxisMetric: availableBubbleMetrics.find(m => m.value === selectedBubbleYAxisMetric)?.label || selectedBubbleYAxisMetric,
        bubbleSizeMetric: availableBubbleMetrics.find(m => m.value === selectedBubbleSizeMetric)?.label || selectedBubbleSizeMetric,
        analysisMode, // Bubble chart AI might still want to know the global mode, even if its data is YTD
        currentPeriodLabel,
        filtersJson: JSON.stringify(getCommonAiFilters())
      };
      const result = await generateBubbleChartAnalysis(input);
      setBubbleAiSummary(result.summary);
      toast({ title: "AI气泡图分析已生成" });
    } catch (error) {
      console.error("Error generating bubble AI summary:", error);
      setBubbleAiSummary("生成AI气泡图分析时出错。");
      toast({ variant: "destructive", title: "AI气泡图分析失败", description: `错误: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsBubbleAiSummaryLoading(false);
    }
  };

  const handleGenerateBarRankAiSummary = async () => {
    if (isGlobalLoading || !barRankData.length) {
      toast({ variant: "default", title: "无排名数据", description: "无法为当前选择生成AI排名分析。" });
      return;
    }
    setIsBarRankAiSummaryLoading(true);
    setBarRankAiSummary(null);
    try {
      const input: GenerateBarRankingAnalysisInput = {
        chartDataJson: JSON.stringify(barRankData.map(({color, ...rest}) => rest)), // Remove color
        rankedMetric: availableRankingMetrics.find(m => m.value === selectedRankingMetric)?.label || selectedRankingMetric,
        analysisMode,
        currentPeriodLabel,
        filtersJson: JSON.stringify(getCommonAiFilters())
      };
      const result = await generateBarRankingAnalysis(input);
      setBarRankAiSummary(result.summary);
      toast({ title: "AI排名图分析已生成" });
    } catch (error) {
      console.error("Error generating bar rank AI summary:", error);
      setBarRankAiSummary("生成AI排名图分析时出错。");
      toast({ variant: "destructive", title: "AI排名图分析失败", description: `错误: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsBarRankAiSummaryLoading(false);
    }
  };

  const handleGenerateShareChartAiSummary = async () => {
    if (isGlobalLoading || !shareChartData.length) {
        toast({ variant: "default", title: "无占比图数据", description: "无法为当前选择生成AI占比图分析。" });
        return;
    }
    setIsShareChartAiSummaryLoading(true);
    setShareChartAiSummary(null);
    try {
      const input: GenerateShareChartAnalysisInput = {
        chartDataJson: JSON.stringify(shareChartData.map(({color, ...rest}) => rest)), // Remove color
        analyzedMetric: availableShareChartMetrics.find(m => m.value === selectedShareChartMetric)?.label || selectedShareChartMetric,
        analysisMode,
        currentPeriodLabel,
        filtersJson: JSON.stringify(getCommonAiFilters())
      };
      const result = await generateShareChartAnalysis(input);
      setShareChartAiSummary(result.summary);
      toast({ title: "AI占比图分析已生成" });
    } catch (error) {
      console.error("Error generating share chart AI summary:", error);
      setShareChartAiSummary("生成AI占比图分析时出错。");
      toast({ variant: "destructive", title: "AI占比图分析失败", description: `错误: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsShareChartAiSummaryLoading(false);
    }
  };

  const handleGenerateParetoAiSummary = async () => {
    if (isGlobalLoading || !paretoChartData.length) {
        toast({ variant: "default", title: "无帕累托图数据", description: "无法为当前选择生成AI帕累托图分析。" });
        return;
    }
    setIsParetoAiSummaryLoading(true);
    setParetoAiSummary(null);
    try {
      const input: GenerateParetoAnalysisInput = {
        chartDataJson: JSON.stringify(paretoChartData.map(({color, ...rest}) => rest)), // Remove color
        analyzedMetric: availableParetoMetrics.find(m => m.value === selectedParetoMetric)?.label || selectedParetoMetric,
        analysisMode,
        currentPeriodLabel,
        filtersJson: JSON.stringify(getCommonAiFilters())
      };
      const result = await generateParetoAnalysis(input);
      setParetoAiSummary(result.summary);
      toast({ title: "AI帕累托图分析已生成" });
    } catch (error) {
      console.error("Error generating Pareto AI summary:", error);
      setParetoAiSummary("生成AI帕累托图分析时出错。");
      toast({ variant: "destructive", title: "AI帕累托图分析失败", description: `错误: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsParetoAiSummaryLoading(false);
    }
  };


  const handleExportData = () => {
    if (Array.isArray(processedData) && processedData.length > 0) { // Added Array.isArray check
      const fileName = `${currentPeriodLabel}_${analysisMode}_${selectedBusinessTypes.join('_') || '合计'}_车险数据.csv`;
      exportToCSV(processedData, analysisMode, fileName, selectedComparisonPeriodKey, periodOptions, selectedPeriodKey);
      toast({ title: "数据导出成功", description: `数据已导出为 ${fileName}` });
    } else {
      toast({ variant: "destructive", title: "无数据可导出" });
    }
  };

  const headerElement = (
    <AppHeader
      analysisMode={analysisMode}
      onAnalysisModeChange={setAnalysisMode}
      onAiSummaryClick={handleOverallAiSummary}
      selectedPeriod={selectedPeriodKey}
      onPeriodChange={(newPeriod) => {
        setSelectedPeriodKey(newPeriod);
        if (newPeriod === selectedComparisonPeriodKey) {
          setSelectedComparisonPeriodKey(null); // Reset comparison if it becomes same as current
        }
      }}
      selectedComparisonPeriod={selectedComparisonPeriodKey}
      onComparisonPeriodChange={(newCompPeriod) => {
        if (newCompPeriod === selectedPeriodKey) {
          setSelectedComparisonPeriodKey(null); // Prevent selecting same as current
          toast({variant: "default", title:"提示", description: "对比周期不能与当前周期相同。已重置对比周期。"});
        } else {
          setSelectedComparisonPeriodKey(newCompPeriod);
        }
      }}
      isAiSummaryLoading={isOverallAiSummaryLoading}
      periodOptions={periodOptions}
      activeView={activeView}
      onViewChange={setActiveView}
      allBusinessTypes={allBusinessTypes}
      selectedBusinessTypes={selectedBusinessTypes}
      onSelectedBusinessTypesChange={setSelectedBusinessTypes}
      onExportClick={handleExportData}
      currentDataSource={dataSource}
      onDataSourceChange={setDataSource}
    />
  );

  return (
    <AppLayout header={headerElement}>
      <div className="space-y-6 md:space-y-8">
        <AiSummarySection summary={overallAiSummary} isLoading={isOverallAiSummaryLoading} />

        {isGlobalLoading && <p className="text-center text-muted-foreground py-8">数据加载中，请稍候...</p>}
        {!isGlobalLoading && (!Array.isArray(allV4Data) || allV4Data.length === 0) && dataSource === 'db' && <p className="text-center text-destructive py-8">无法从数据库加载数据或数据库为空/格式错误。请检查数据库连接配置和数据表。您可以尝试切换回JSON数据源。</p>}
        {!isGlobalLoading && (!Array.isArray(allV4Data) || allV4Data.length === 0) && dataSource === 'json' && <p className="text-center text-destructive py-8">JSON数据文件为空、加载失败或格式错误。请检查 public/data/insurance_data.json 文件内容是否为有效的数组结构。</p>}
        {!isGlobalLoading && Array.isArray(allV4Data) && allV4Data.length > 0 && !selectedPeriodKey && <p className="text-center text-muted-foreground py-8">请选择一个数据周期以开始分析。</p>}


        {!isGlobalLoading && Array.isArray(allV4Data) && allV4Data.length > 0 && selectedPeriodKey && (
          <>
            {activeView === 'kpi' &&
              <KpiDashboardSection
                kpis={kpis}
                selectedPeriodKey={selectedPeriodKey}
                selectedComparisonPeriodKey={selectedComparisonPeriodKey}
                periodOptions={periodOptions}
                allV4Data={allV4Data}
              />
            }

            {activeView === 'trend' && (
              <TrendAnalysisSection
                data={trendChartData}
                availableMetrics={availableTrendMetrics}
                onMetricChange={setSelectedTrendMetric}
                selectedMetric={selectedTrendMetric}
                aiSummary={trendAiSummary}
                isAiSummaryLoading={isTrendAiSummaryLoading}
                onGenerateAiSummary={handleGenerateTrendAiSummary}
                analysisMode={analysisMode}
                key={`trend-${dataSource}-${selectedBusinessTypes.join('-')}-${analysisMode}-${selectedTrendMetric}-${selectedPeriodKey}-${selectedComparisonPeriodKey}`}
              />
            )}
            {activeView === 'bubble' &&
              <BubbleChartSection
                data={bubbleChartData}
                availableMetrics={availableBubbleMetrics}
                selectedXAxisMetric={selectedBubbleXAxisMetric}
                onXAxisMetricChange={setSelectedBubbleXAxisMetric}
                selectedYAxisMetric={selectedBubbleYAxisMetric}
                onYAxisMetricChange={setSelectedBubbleYAxisMetric}
                selectedSizeMetric={selectedBubbleSizeMetric}
                onSizeMetricChange={setSelectedBubbleSizeMetric}
                aiSummary={bubbleAiSummary}
                isAiSummaryLoading={isBubbleAiSummaryLoading}
                onGenerateAiSummary={handleGenerateBubbleAiSummary}
                key={`bubble-${dataSource}-${selectedBusinessTypes.join('-')}-${analysisMode}-${selectedPeriodKey}-${selectedComparisonPeriodKey}-${selectedBubbleXAxisMetric}-${selectedBubbleYAxisMetric}-${selectedBubbleSizeMetric}`}
              />
            }

            {activeView === 'bar_rank' && (
              <BarChartRankingSection
                data={barRankData}
                availableMetrics={availableRankingMetrics}
                onMetricChange={setSelectedRankingMetric}
                selectedMetric={selectedRankingMetric}
                aiSummary={barRankAiSummary}
                isAiSummaryLoading={isBarRankAiSummaryLoading}
                onGenerateAiSummary={handleGenerateBarRankAiSummary}
                key={`barrank-${dataSource}-${selectedBusinessTypes.join('-')}-${analysisMode}-${selectedRankingMetric}-${selectedPeriodKey}-${selectedComparisonPeriodKey}`}
              />
            )}
             {activeView === 'share_chart' && (
              <ShareChartSection
                data={shareChartData}
                availableMetrics={availableShareChartMetrics}
                selectedMetric={selectedShareChartMetric}
                onMetricChange={setSelectedShareChartMetric}
                aiSummary={shareChartAiSummary}
                isAiSummaryLoading={isShareChartAiSummaryLoading}
                onGenerateAiSummary={handleGenerateShareChartAiSummary}
                key={`sharechart-${dataSource}-${selectedBusinessTypes.join('-')}-${analysisMode}-${selectedShareChartMetric}-${selectedPeriodKey}-${selectedComparisonPeriodKey}`}
              />
            )}
            {activeView === 'pareto' && (
              <ParetoChartSection
                data={paretoChartData}
                availableMetrics={availableParetoMetrics}
                selectedMetric={selectedParetoMetric}
                onMetricChange={setSelectedParetoMetric}
                aiSummary={paretoAiSummary}
                isAiSummaryLoading={isParetoAiSummaryLoading}
                onGenerateAiSummary={handleGenerateParetoAiSummary}
                key={`paretochart-${dataSource}-${selectedBusinessTypes.join('-')}-${analysisMode}-${selectedParetoMetric}-${selectedPeriodKey}-${selectedComparisonPeriodKey}`}
              />
            )}
            {activeView === 'data_table' && <DataTableSection data={processedData} analysisMode={analysisMode} selectedComparisonPeriodKey={selectedComparisonPeriodKey} periodOptions={periodOptions} activePeriodId={selectedPeriodKey} />}
          </>
        )}
      </div>
    </AppLayout>
  );
}
    

    
