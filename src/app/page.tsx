
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { AnalysisMode, Kpi, ChartDataItem, BubbleChartDataItem, ProcessedDataForPeriod, V4PeriodData, PeriodOption, DashboardView, TrendMetricKey, RankingMetricKey, BubbleMetricKey, AggregatedBusinessMetrics, CoreAggregatedMetricKey, ShareChartMetricKey, ShareChartDataItem, ParetoChartMetricKey, ParetoChartDataItem } from '@/data/types';

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

// Types for AI Flow inputs/outputs. Only business summary remains.
import type { GenerateBusinessSummaryInput, GenerateBusinessSummaryOutput } from '@/ai/flows/generate-business-summary';


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

  const [isGlobalLoading, setIsGlobalLoading] = useState(true);

  const { toast } = useToast();

  const currentPeriodLabel = useMemo(() => {
    return periodOptions.find(p => p.value === selectedPeriodKey)?.label || selectedPeriodKey;
  }, [periodOptions, selectedPeriodKey]);

  useEffect(() => {
    const fetchData = async () => {
      setIsGlobalLoading(true);
      setOverallAiSummary(null);
      try {
        let rawData: any;
        toast({ title: "数据加载中", description: "正在从JSON文件加载数据..." });
        const response = await fetch('/data/insurance_data.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} when fetching JSON.`);
        }
        rawData = await response.json();
        if (!Array.isArray(rawData)) {
           console.error("Data loaded from JSON is not an array:", rawData);
           toast({ variant: "destructive", title: "数据格式错误", description: "从JSON文件加载的数据格式不正确，期望得到一个数组。" });
           setAllV4Data([]);
           setPeriodOptions([]);
           setIsGlobalLoading(false);
           return;
        }
        toast({ title: "数据加载成功", description: "已从JSON文件加载数据。" });
        
        const data: V4PeriodData[] = rawData as V4PeriodData[];

        setAllV4Data(data);
        const options = data
          .map(p => ({ value: p.period_id, label: p.period_label }))
          .sort((a, b) => b.label.localeCompare(a.label)); 
        setPeriodOptions(options);
        
        if (data.length > 0 && selectedPeriodKey) {
          setGlobalV4DataForKpiWorkaround(data, selectedPeriodKey);
        } else if (data.length > 0 && options.length > 0) {
          setGlobalV4DataForKpiWorkaround(data, options[0].value);
        }

        const currentSelectedIsValid = options.some(opt => opt.value === selectedPeriodKey);
        if (options.length > 0 && (!selectedPeriodKey || !currentSelectedIsValid) ) {
          setSelectedPeriodKey(options[0].value);
        } else if (options.length === 0) {
          setSelectedPeriodKey('');
          setSelectedComparisonPeriodKey(null);
        }

        if (selectedComparisonPeriodKey && !options.some(opt => opt.value === selectedComparisonPeriodKey)) {
            setSelectedComparisonPeriodKey(null);
        }
        if (selectedComparisonPeriodKey === selectedPeriodKey && selectedPeriodKey !== '') {
            setSelectedComparisonPeriodKey(null);
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
  }, [toast]); 

  useEffect(() => {
    if (Array.isArray(allV4Data) && allV4Data.length > 0 && selectedPeriodKey) {
      setGlobalV4DataForKpiWorkaround(allV4Data, selectedPeriodKey);
    }
  }, [selectedPeriodKey, allV4Data]);


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
        toast({variant: "destructive", title: "选择错误", description: "当前周期和对比周期不能相同。已重置对比周期。"})
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
      setKpis([]);
      setTrendChartData([]);
      setBubbleChartData([]);
      setBarRankData([]);
      setShareChartData([]);
      setParetoChartData([]);
    }
    // Reset only the overall AI summary when data context changes
    setOverallAiSummary(null);

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

        if (periodPIndex === 0 && periodsForTrendRange.length > 1) { 
          continue;
        } else if (periodsForTrendRange.length === 1 && periodPIndex === 0) { 
            continue;
        }
        
        const periodPMinus1Id = periodP.comparison_period_id_mom;
        const periodPMinus1 = periodPMinus1Id ? sortedPeriods.find(p => p.period_id === periodPMinus1Id) : undefined;

        if (!periodPMinus1) continue; 

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
    } else { 
      periodsForTrendRange.forEach(period => {
        const processedForThisPeriodTrendPoint = processDataForSelectedPeriod(
          allData, period.period_id, null, 'cumulative', selBusinessTypes
        );

        if (processedForThisPeriodTrendPoint.length > 0 && processedForThisPeriodTrendPoint[0].currentMetrics) {
          const metrics = processedForThisPeriodTrendPoint[0].currentMetrics;
          const vcr = metrics.variable_cost_ratio;
          let value: number | undefined | null = metrics[metricKey as CoreAggregatedMetricKey] as number | undefined | null;

          if (typeof value !== 'number' || isNaN(value)) {
            value = 0; 
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
    mode: AnalysisMode, 
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
            const singleTypeProcessed = processDataForSelectedPeriod(allRawData, currentPeriodId, null, 'cumulative', [bt]);
            return singleTypeProcessed[0];
        }).filter(d => d && d.currentMetrics && d.businessLineId !== '合计' && d.businessLineId !== '自定义合计');
    }

    return dataForBubbleChart.map(d => {
        const metrics = d.currentMetrics as AggregatedBusinessMetrics;
        const vcr = metrics.variable_cost_ratio; 
        return {
            id: d.businessLineId,
            name: d.businessLineName,
            x: (metrics[xMetric] as number) || 0,
            y: (metrics[yMetric] as number) || 0,
            z: (metrics[zMetric] as number) || 0,
            color: getDynamicColorByVCR(vcr), 
            vcr: vcr
        };
    }).filter(item => typeof item.x === 'number' && typeof item.y === 'number' && typeof item.z === 'number');
  }

  const prepareBarRankData_V4 = (
    allRawData: V4PeriodData[],
    metricKey: RankingMetricKey,
    currentPeriodId: string,
    mode: AnalysisMode, 
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
            const singleTypeProcessed = processDataForSelectedPeriod(allRawData, currentPeriodId, null, mode, [bt]);
            return singleTypeProcessed[0];
        }).filter(d => d && d.currentMetrics && d.businessLineId !== '合计' && d.businessLineId !== '自定义合计');
    }

    return [...dataForRanking]
        .filter(d => d.currentMetrics && d.currentMetrics[metricKey] !== undefined && d.currentMetrics[metricKey] !== null)
        .sort((a, b) => (b.currentMetrics![metricKey] as number || 0) - (a.currentMetrics![metricKey] as number || 0))
        .map(d => {
          const metrics = d.currentMetrics as AggregatedBusinessMetrics;
          const ytdDataForColor = processDataForSelectedPeriod(allRawData, currentPeriodId, null, 'cumulative', [d.businessLineId])[0];
          const vcrForColoring = ytdDataForColor?.currentMetrics.variable_cost_ratio ?? metrics.variable_cost_ratio; 
          
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
    mode: AnalysisMode, 
    selBusinessTypes: string[],
    metricKey: ShareChartMetricKey
  ): ShareChartDataItem[] => {
    const currentRawPeriod = allRawData.find(p => p.period_id === currentPeriodId);
    if (!currentRawPeriod) return [];

    const allIndividualTypesInPeriod = Array.from(new Set(
        (currentRawPeriod.business_data || [])
        .map(bd => bd.business_type)
        .filter(bt => bt && bt.toLowerCase() !== '合计' && bt.toLowerCase() !== 'total')
    ));

    let grandTotalMetricValue = 0;
    const grandTotalProcessedData = processDataForSelectedPeriod(allRawData, currentPeriodId, null, mode, []); 
    if (grandTotalProcessedData.length > 0 && grandTotalProcessedData[0].currentMetrics) {
        grandTotalMetricValue = (grandTotalProcessedData[0].currentMetrics[metricKey as CoreAggregatedMetricKey] as number) || 0;
    }

    if (grandTotalMetricValue === 0 && mode === 'cumulative') return []; 
    if (mode === 'periodOverPeriod' && grandTotalMetricValue === 0 && currentRawPeriod.business_data.some(bd => bd[metricKey as keyof V4BusinessDataEntry] !== 0) ) {
    }

    const typesForSlices = selBusinessTypes.length > 0 ? selBusinessTypes : allIndividualTypesInPeriod;

    const shareData: ShareChartDataItem[] = typesForSlices.map(businessType => {
        const singleTypeProcessedArray = processDataForSelectedPeriod(allRawData, currentPeriodId, null, mode, [businessType]);
        if (singleTypeProcessedArray.length > 0 && singleTypeProcessedArray[0].currentMetrics) {
            const metrics = singleTypeProcessedArray[0].currentMetrics;
            const value = (metrics[metricKey as CoreAggregatedMetricKey] as number) || 0;

            const ytdDataForColor = processDataForSelectedPeriod(allRawData, currentPeriodId, null, 'cumulative', [businessType])[0];
            const vcrForColoring = ytdDataForColor?.currentMetrics.variable_cost_ratio;

            let percentage = 0;
            if (grandTotalMetricValue !== 0) {
                percentage = (value / grandTotalMetricValue) * 100;
            } else if (value === 0 && grandTotalMetricValue === 0) {
                percentage = 0; 
            } else if (value !== 0 && grandTotalMetricValue === 0){
                percentage = value > 0 ? Infinity : -Infinity; 
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
    }).filter(item => item !== null && (mode === 'cumulative' ? item.value > 0 : item.value !== 0 || item.percentage !== 0) ) as ShareChartDataItem[]; 

    return shareData.sort((a,b) => b.value - a.value);
  };

  const prepareParetoChartData_V4 = (
    allRawData: V4PeriodData[],
    currentPeriodId: string,
    mode: AnalysisMode, 
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

        if (value > 0 || (mode === 'periodOverPeriod' && value !==0) ) { 
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

    individualMetrics.sort((a, b) => mode === 'periodOverPeriod' ? Math.abs(b.value) - Math.abs(a.value) : b.value - a.value);

    const grandTotal = individualMetrics.reduce((sum, item) => sum + item.value, 0);
    if (grandTotal <= 0 && mode === 'cumulative' && individualMetrics.some(im => im.value > 0)) return []; 
    
    let cumulativeValue = 0;
    const paretoData: ParetoChartDataItem[] = individualMetrics.map(item => {
      cumulativeValue += item.value;
      let cumulativePercentage = 0;
      if (grandTotal > 0) { 
          cumulativePercentage = (cumulativeValue / grandTotal) * 100;
      } else if (grandTotal === 0 && item.value === 0) {
          cumulativePercentage = 0; 
      } else if (grandTotal === 0 && item.value !== 0) {
          cumulativePercentage = item.value > 0 ? Infinity : -Infinity; 
      }

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

    if (!actualComparisonPeriodId && Array.isArray(allV4Data)) { 
        const currentPeriodEntry = allV4Data.find(p => p.period_id === selectedPeriodKey);
        if (currentPeriodEntry?.comparison_period_id_mom) {
            actualComparisonPeriodId = currentPeriodEntry.comparison_period_id_mom;
        }
    }

    if (actualComparisonPeriodId) {
        const selectedCompLabel = periodOptions.find(p => p.value === actualComparisonPeriodId)?.label;
        if (selectedCompLabel) {
            comparisonPeriodInfo = `对比周期: ${selectedCompLabel}`;
        } else if (selectedComparisonPeriodKey) { 
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

  const callAiProxy = async (flowName: string, inputData: any, setLoading: (loading: boolean) => void, setSummary: (summary: string | null) => void, chartType: string) => {
    setLoading(true);
    setSummary(null);
    try {
      const response = await fetch('/generateAiSummaryProxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowName, inputData }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from AI proxy.' }));
        throw new Error(`AI服务调用失败 (${response.status}): ${errorData.error || '未知错误'}`);
      }
      const result = await response.json();
      setSummary(result.summary || `AI未能生成${chartType}分析。`);
      toast({ title: `AI${chartType}分析成功`, description: `已成功获取${chartType}分析结果。` });
    } catch (error) {
      console.error(`Error generating ${chartType} AI summary:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setSummary(`生成${chartType}AI分析时出错: ${errorMessage}`);
      toast({ variant: "destructive", title: `AI${chartType}分析失败`, description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

 const handleOverallAiSummary = async () => {
    if (isGlobalLoading || !processedData || processedData.length === 0) {
      toast({ title: "AI摘要提示", description: "数据正在加载或当前无数据，无法生成摘要。" });
      return;
    }
    const kpiDataForSummary = kpis.map(k => ({ title: k.title, value: k.value, comparison: k.comparisonChangeAbsolute || k.comparisonChange || '-' }));
    const topBusinessLines = barRankData.slice(0, 5).map(b => ({ name: b.name, value: b[selectedRankingMetric], vcr: b.vcr }));

    const input: GenerateBusinessSummaryInput = {
        data: JSON.stringify({
            keyPerformanceIndicators: kpiDataForSummary,
            topBusinessLinesByPremiumWritten: topBusinessLines 
        }),
        filters: JSON.stringify(getCommonAiFilters()),
    };
    callAiProxy('generateBusinessSummary', input, setIsOverallAiSummaryLoading, setOverallAiSummary, '总体业务');
  };

  const handleExportData = () => {
    if (Array.isArray(processedData) && processedData.length > 0) { 
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
          setSelectedComparisonPeriodKey(null); 
        }
      }}
      selectedComparisonPeriod={selectedComparisonPeriodKey}
      onComparisonPeriodChange={(newCompPeriod) => {
        if (newCompPeriod === selectedPeriodKey) {
          setSelectedComparisonPeriodKey(null); 
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
    />
  );

  return (
    <AppLayout header={headerElement}>
      <div className="space-y-6 md:space-y-8">
        {isGlobalLoading && <p className="text-center text-muted-foreground py-8">数据加载中，请稍候...</p>}
        {!isGlobalLoading && (!Array.isArray(allV4Data) || allV4Data.length === 0) && <p className="text-center text-destructive py-8">JSON数据文件为空、加载失败或格式错误。请检查 public/data/insurance_data.json 文件内容是否为有效的数组结构。</p>}
        {!isGlobalLoading && Array.isArray(allV4Data) && allV4Data.length > 0 && !selectedPeriodKey && <p className="text-center text-muted-foreground py-8">请选择一个数据周期以开始分析。</p>}


        {!isGlobalLoading && Array.isArray(allV4Data) && allV4Data.length > 0 && selectedPeriodKey && (
          <>
            {activeView === 'kpi' &&
              <>
                <KpiDashboardSection
                  kpis={kpis}
                  selectedPeriodKey={selectedPeriodKey}
                  selectedComparisonPeriodKey={selectedComparisonPeriodKey}
                  periodOptions={periodOptions}
                  allV4Data={allV4Data}
                />
                <AiSummarySection summary={overallAiSummary} isLoading={isOverallAiSummaryLoading} />
              </>
            }

            {activeView === 'trend' && (
              <TrendAnalysisSection
                data={trendChartData}
                availableMetrics={availableTrendMetrics}
                onMetricChange={setSelectedTrendMetric}
                selectedMetric={selectedTrendMetric}
                analysisMode={analysisMode}
                key={`trend-json-${selectedBusinessTypes.join('-')}-${analysisMode}-${selectedTrendMetric}-${selectedPeriodKey}-${selectedComparisonPeriodKey}`}
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
                key={`bubble-json-${selectedBusinessTypes.join('-')}-${analysisMode}-${selectedPeriodKey}-${selectedComparisonPeriodKey}-${selectedBubbleXAxisMetric}-${selectedBubbleYAxisMetric}-${selectedBubbleSizeMetric}`}
              />
            }

            {activeView === 'bar_rank' && (
              <BarChartRankingSection
                data={barRankData}
                availableMetrics={availableRankingMetrics}
                onMetricChange={setSelectedRankingMetric}
                selectedMetric={selectedRankingMetric}
                key={`barrank-json-${selectedBusinessTypes.join('-')}-${analysisMode}-${selectedRankingMetric}-${selectedPeriodKey}-${selectedComparisonPeriodKey}`}
              />
            )}
             {activeView === 'share_chart' && (
              <ShareChartSection
                data={shareChartData}
                availableMetrics={availableShareChartMetrics}
                selectedMetric={selectedShareChartMetric}
                onMetricChange={setSelectedShareChartMetric}
                key={`sharechart-json-${selectedBusinessTypes.join('-')}-${analysisMode}-${selectedShareChartMetric}-${selectedPeriodKey}-${selectedComparisonPeriodKey}`}
              />
            )}
            {activeView === 'pareto' && (
              <ParetoChartSection
                data={paretoChartData}
                availableMetrics={availableParetoMetrics}
                selectedMetric={selectedParetoMetric}
                onMetricChange={setSelectedParetoMetric}
                key={`paretochart-json-${selectedBusinessTypes.join('-')}-${analysisMode}-${selectedParetoMetric}-${selectedPeriodKey}-${selectedComparisonPeriodKey}`}
              />
            )}
            {activeView === 'data_table' && <DataTableSection data={processedData} analysisMode={analysisMode} selectedComparisonPeriodKey={selectedComparisonPeriodKey} periodOptions={periodOptions} activePeriodId={selectedPeriodKey} />}
          </>
        )}
      </div>
    </AppLayout>
  );
}

