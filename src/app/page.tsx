"use client";

import { useState, useEffect, useMemo } from 'react';
import type { AnalysisMode, Kpi, ChartDataItem, BubbleChartDataItem, ProcessedDataForPeriod, V4PeriodData, PeriodOption, DashboardView, TrendMetricKey, RankingMetricKey, BubbleMetricKey, AggregatedBusinessMetrics, DataSourceType } from '@/data/types';

import { AppLayout } from '@/components/layout/app-layout';
import { AppHeader } from '@/components/layout/header';
import { KpiDashboardSection } from '@/components/sections/kpi-dashboard-section';
import { TrendAnalysisSection } from '@/components/sections/trend-analysis-section';
import { BubbleChartSection } from '@/components/sections/bubble-chart-section';
import { BarChartRankingSection } from '@/components/sections/bar-chart-ranking-section';
import { DataTableSection } from '@/components/sections/data-table-section';
import { AiSummarySection } from '@/components/sections/ai-summary-section';

import { generateBusinessSummary, type GenerateBusinessSummaryInput } from '@/ai/flows/generate-business-summary';
import { generateTrendAnalysis, type GenerateTrendAnalysisInput } from '@/ai/flows/generate-trend-analysis-flow';
import { generateBubbleChartAnalysis, type GenerateBubbleChartAnalysisInput } from '@/ai/flows/generate-bubble-chart-analysis-flow';
import { generateBarRankingAnalysis, type GenerateBarRankingAnalysisInput } from '@/ai/flows/generate-bar-ranking-analysis-flow';

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

  const [overallAiSummary, setOverallAiSummary] = useState<string | null>(null);
  const [isOverallAiSummaryLoading, setIsOverallAiSummaryLoading] = useState(false);

  const [trendAiSummary, setTrendAiSummary] = useState<string | null>(null);
  const [isTrendAiSummaryLoading, setIsTrendAiSummaryLoading] = useState(false);
  const [bubbleAiSummary, setBubbleAiSummary] = useState<string | null>(null);
  const [isBubbleAiSummaryLoading, setIsBubbleAiSummaryLoading] = useState(false);
  const [barRankAiSummary, setBarRankAiSummary] = useState<string | null>(null);
  const [isBarRankAiSummaryLoading, setIsBarRankAiSummaryLoading] = useState(false);

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
      try {
        let data: V4PeriodData[] = [];
        if (dataSource === 'json') {
          toast({ title: "数据加载中", description: "正在从JSON文件加载数据..." });
          const response = await fetch('/data/insurance_data_v4.json');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} when fetching JSON.`);
          }
          data = await response.json();
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
            data = await response.json();
            
            if (data.length === 0) {
                 toast({ title: "数据库提示", description: "从数据库获取的数据为空，或数据库功能尚未完全实现。" , duration: 5000});
            } else {
                 toast({ title: "数据加载成功", description: "已从PostgreSQL数据库加载数据。" });
            }
          } catch (dbError) {
            console.error("Error fetching from DB API in page.tsx:", dbError);
            toast({ variant: "destructive", title: "数据库加载失败", description: `无法从数据库加载数据: ${dbError instanceof Error ? dbError.message : String(dbError)}. 请检查配置或联系管理员。`, duration: 8000 });
            data = []; // Fallback to empty data
          }
        }

        setAllV4Data(data);
        setGlobalV4DataForKpiWorkaround(data); 

        const options = data
          .map(p => ({ value: p.period_id, label: p.period_label }))
          .sort((a, b) => b.label.localeCompare(a.label)); // Sort by label descending (latest first)
        setPeriodOptions(options);

        const currentSelectedIsValid = options.some(opt => opt.value === selectedPeriodKey);
        if (options.length > 0 && (!selectedPeriodKey || !currentSelectedIsValid) ) {
          setSelectedPeriodKey(options[0].value); // Default to the latest period
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
  }, [dataSource, toast]); // Removed selectedPeriodKey from dependencies to avoid re-fetching on period change, only on data source change

  useEffect(() => {
    if (isGlobalLoading || allV4Data.length === 0 || !selectedPeriodKey) {
      setProcessedData([]);
      setKpis([]);
      setTrendChartData([]);
      setBubbleChartData([]);
      setBarRankData([]);
      return;
    }

    
    if (selectedComparisonPeriodKey === selectedPeriodKey && selectedPeriodKey !== '') {
        setSelectedComparisonPeriodKey(null); 
        toast({variant: "destructive", title: "选择错误", description: "当前周期和对比周期不能相同。已重置对比周期。"})
        return; 
    }

    const currentPeriod = allV4Data.find(p => p.period_id === selectedPeriodKey);

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
        currentPeriod?.totals_for_period,
        analysisMode,
        selectedBusinessTypes,
        selectedPeriodKey,
        selectedComparisonPeriodKey, 
        periodOptions 
      );
      setKpis(calculatedKpis);

      const trendData = prepareTrendData_V4(allV4Data, selectedTrendMetric, selectedPeriodKey, analysisMode, selectedBusinessTypes);
      setTrendChartData(trendData);

      const bubbleData = prepareBubbleChartData_V4(allV4Data, selectedPeriodKey, analysisMode, selectedBusinessTypes, selectedBubbleXAxisMetric, selectedBubbleYAxisMetric, selectedBubbleSizeMetric);
      setBubbleChartData(bubbleData);

      const rankData = prepareBarRankData_V4(allV4Data, selectedRankingMetric, selectedPeriodKey, analysisMode, selectedBusinessTypes);
      setBarRankData(rankData);
    } else {
      setKpis([]);
      setTrendChartData([]);
      setBubbleChartData([]);
      setBarRankData([]);
    }
    // Reset chart-specific AI summaries when data changes
    setTrendAiSummary(null);
    setBubbleAiSummary(null);
    setBarRankAiSummary(null);

  }, [isGlobalLoading, analysisMode, selectedPeriodKey, selectedComparisonPeriodKey, allV4Data, selectedBusinessTypes, selectedTrendMetric, selectedRankingMetric, selectedBubbleXAxisMetric, selectedBubbleYAxisMetric, selectedBubbleSizeMetric, periodOptions, toast]); 


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
    const currentPeriodIndex = sortedPeriods.findIndex(p => p.period_id === currentPeriodId);

    if (currentPeriodIndex === -1 && sortedPeriods.length > 0) {
      // If currentPeriodId is somehow invalid but we have data, default to latest available.
      // This case should ideally be prevented by setSelectedPeriodKey logic in fetchData.
      // For trend, we might want to show latest 12 even if selectedPeriodKey is old or invalid.
      // However, currentPeriodId for trend base should align with the global selectedPeriodKey.
      // For now, return empty if currentPeriodId is not in sortedPeriods.
      return [];
    } else if (currentPeriodIndex === -1 && sortedPeriods.length === 0) {
      return [];
    }


    const startIndex = Math.max(0, currentPeriodIndex - maxPeriods + 1);
    const periodsForTrend = sortedPeriods.slice(startIndex, currentPeriodIndex + 1);

    periodsForTrend.forEach(period => {
      
      const processedForThisPeriodTrendPoint = processDataForSelectedPeriod(
        allData, // Pass allData here to ensure access to previous periods for PoP calculation if mode is PoP
        period.period_id,
        null, // Comparison period for trend point is itself, PoP handled by `processData`
        mode,
        selBusinessTypes
      );

      if (processedForThisPeriodTrendPoint.length > 0 && processedForThisPeriodTrendPoint[0].currentMetrics) {
        const metrics = processedForThisPeriodTrendPoint[0].currentMetrics;
        const vcr = metrics.variable_cost_ratio;
        let value: number | undefined | null = metrics[metricKey as keyof typeof metrics] as number | undefined | null;

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
            
            const singleTypeProcessed = processDataForSelectedPeriod(allRawData, currentPeriodId, null, mode, [bt]);
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
          const vcr = metrics.variable_cost_ratio;
          return {
            name: d.businessLineName,
            [metricKey]: metrics[metricKey] as number || 0,
            color: getDynamicColorByVCR(vcr),
            vcr: vcr
          };
        });
  }

  const getCommonAiFilters = () => {
    let comparisonPeriodInfo = "默认环比/同比";
    if (selectedComparisonPeriodKey) {
        const selectedCompLabel = periodOptions.find(p => p.value === selectedComparisonPeriodKey)?.label;
        if (selectedCompLabel) {
            comparisonPeriodInfo = `对比周期: ${selectedCompLabel}`;
        }
    }
    return {
        analysisMode,
        period: currentPeriodLabel,
        comparison: comparisonPeriodInfo,
        selectedBusinessTypes: selectedBusinessTypes.length > 0 ? selectedBusinessTypes.join(', ') : '全部独立业务类型合计',
        vcrColorRules: "颜色基于变动成本率(VCR)动态调整深浅：绿色(优秀, VCR < 88%，越小越深绿)，蓝色(健康, 88%-92%，越接近88%越深蓝)，红色(危险, VCR >= 92%，越大越深红)。"
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

      
      const relevantMetricsToDisplay = (metrics: AggregatedBusinessMetrics, comparisonMetrics?: AggregatedBusinessMetrics | null) => {
        let changeInPremium = 'N/A';
        if (metrics?.premium_written !== undefined && comparisonMetrics?.premium_written !== undefined && comparisonMetrics?.premium_written !== 0) {
            const absChange = metrics.premium_written - comparisonMetrics.premium_written;
            changeInPremium = `${absChange >= 0 ? '+' : ''}${absChange.toFixed(2)} (${selectedComparisonPeriodKey ? '对比所选' : '环比'})`;
        } else if (metrics?.premium_written !== undefined && comparisonMetrics?.premium_written === 0) {
            changeInPremium = `+${metrics.premium_written.toFixed(2)} (${selectedComparisonPeriodKey ? '对比所选' : '环比'})`;
        }
        return {
            premiumWritten: `${metrics.premium_written?.toFixed(2) || 'N/A'} 万元`,
            lossRatio: `${metrics.loss_ratio?.toFixed(2) || 'N/A'}%`,
            variableCostRatio: `${metrics.variable_cost_ratio?.toFixed(2) || 'N/A'}%`,
            color: getDynamicColorByVCR(metrics.variable_cost_ratio),
            changeInPremiumWritten: changeInPremium,
        };
      };


      if (currentContextData && currentContextData.currentMetrics) {
          if (currentContextData.businessLineId === '合计' || currentContextData.businessLineId === '自定义合计' || selectedBusinessTypes.length === 0) {
              const individualLinesData = allBusinessTypes.map(bt => {
                return processDataForSelectedPeriod(allV4Data, selectedPeriodKey, selectedComparisonPeriodKey, analysisMode, [bt])[0];
              }).filter(d => d && d.currentMetrics && d.businessLineId !== '合计' && d.businessLineId !== '自定义合计');

              topBusinessLinesData = individualLinesData
                .sort((a, b) => (b.currentMetrics.premium_written || 0) - (a.currentMetrics.premium_written || 0))
                .slice(0, 3)
                .map(d => ({
                    name: d.businessLineName,
                    ...relevantMetricsToDisplay(d.currentMetrics, d.momMetrics) 
                }));
          } else {
            topBusinessLinesData = [{
                name: currentContextData.businessLineName,
                ...relevantMetricsToDisplay(currentContextData.currentMetrics, currentContextData.momMetrics)
            }];
          }
      }

       const aiInputData = {
        keyPerformanceIndicators: kpis.map(kpi => ({
            title: kpi.title,
            value: kpi.value,
            rawValue: kpi.rawValue,
            primaryComparisonLabel: kpi.primaryComparisonLabel,
            primaryChangePercent: kpi.primaryChange,
            primaryChangeAbsolute: kpi.primaryChangeAbsolute,
            secondaryComparisonLabel: kpi.secondaryComparisonLabel,
            secondaryChangePercent: kpi.secondaryChange,
            secondaryChangeAbsolute: kpi.secondaryChangeAbsolute,
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
        chartDataJson: JSON.stringify(trendChartData),
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
        chartDataJson: JSON.stringify(bubbleChartData),
        xAxisMetric: availableBubbleMetrics.find(m => m.value === selectedBubbleXAxisMetric)?.label || selectedBubbleXAxisMetric,
        yAxisMetric: availableBubbleMetrics.find(m => m.value === selectedBubbleYAxisMetric)?.label || selectedBubbleYAxisMetric,
        bubbleSizeMetric: availableBubbleMetrics.find(m => m.value === selectedBubbleSizeMetric)?.label || selectedBubbleSizeMetric,
        analysisMode,
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
        chartDataJson: JSON.stringify(barRankData),
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

  const handleExportData = () => {
    if (processedData.length > 0) {
      const fileName = `${currentPeriodLabel}_${analysisMode}_${selectedBusinessTypes.join('_') || '合计'}_车险数据.csv`;
      exportToCSV(processedData, analysisMode, fileName, selectedComparisonPeriodKey, periodOptions);
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
      onPeriodChange={setSelectedPeriodKey}
      selectedComparisonPeriod={selectedComparisonPeriodKey} 
      onComparisonPeriodChange={setSelectedComparisonPeriodKey} 
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

        {isGlobalLoading && <p className="text-center text-muted-foreground py-8">正在加载数据，请稍候...</p>}
        {!isGlobalLoading && allV4Data.length === 0 && dataSource === 'db' && <p className="text-center text-destructive py-8">无法从数据库加载数据或数据库为空。请检查您的数据库连接配置和数据表。您可以尝试切换回JSON数据源。</p>}
        {!isGlobalLoading && allV4Data.length === 0 && dataSource === 'json' && <p className="text-center text-destructive py-8">JSON数据文件为空或加载失败。请检查 public/data/insurance_data_v4.json 文件。</p>}
        {!isGlobalLoading && allV4Data.length > 0 && !selectedPeriodKey && <p className="text-center text-muted-foreground py-8">请选择一个数据周期以开始分析。</p>}


        {!isGlobalLoading && allV4Data.length > 0 && selectedPeriodKey && (
          <>
            {activeView === 'kpi' && <KpiDashboardSection kpis={kpis} />}

            {activeView === 'trend' && (
              <TrendAnalysisSection
                data={trendChartData}
                availableMetrics={availableTrendMetrics}
                onMetricChange={setSelectedTrendMetric}
                selectedMetric={selectedTrendMetric}
                aiSummary={trendAiSummary}
                isAiSummaryLoading={isTrendAiSummaryLoading}
                onGenerateAiSummary={handleGenerateTrendAiSummary}
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
            {activeView === 'data_table' && <DataTableSection data={processedData} analysisMode={analysisMode} selectedComparisonPeriodKey={selectedComparisonPeriodKey} periodOptions={periodOptions} />}
          </>
        )}
      </div>
    </AppLayout>
  );
}