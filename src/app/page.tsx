
"use client";

import { useState, useEffect, useMemo } from 'react';
// 导入 Next.js 项目中定义的所有类型
import type { AnalysisMode, Kpi, ChartDataItem, BubbleChartDataItem, ProcessedDataForPeriod, V4PeriodData, PeriodOption, DashboardView, TrendMetricKey, RankingMetricKey, BubbleMetricKey, AggregatedBusinessMetrics, CoreAggregatedMetricKey, ShareChartMetricKey, ShareChartDataItem, ParetoChartMetricKey, ParetoChartDataItem, V4BusinessDataEntry } from '@/data/types';

// 导入 Firebase SDK 所需的模块
import { app } from '@/lib/firebase'; // 根据您的实际路径调整到 firebase.js 或 firebaseConfig.js
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // 用于用户认证和状态监听
import { getFunctions, httpsCallable } from 'firebase/functions'; // 用于调用云函数

// 导入布局和 UI 组件
import { AppLayout } from '@/components/layout/app-layout';
import { AppHeader } from '@/components/layout/header';
import { KpiDashboardSection } from '@/components/sections/kpi-dashboard-section';
import { TrendAnalysisSection } from '@/components/sections/trend-analysis-section';
import { BubbleChartSection } from '@/components/sections/bubble-chart-section';
import { BarChartRankingSection } from '@/components/sections/bar-chart-ranking-section';
import { ShareChartSection } from '@/components/sections/share-chart-section';
import { ParetoChartSection } from '@/components/sections/pareto-chart-section.tsx';
import { DataTableSection } from '@/components/sections/data-table-section';

// 导入自定义 Hooks 和工具函数
import { useToast } from "@/hooks/use-toast";
import {
  processDataForSelectedPeriod,
  calculateKpis,
  setGlobalV4DataForKpiWorkaround,
  exportToCSV,
  getDynamicColorByVCR
} from '@/lib/data-utils';
import { useAuth } from '@/contexts/auth-provider'; // 确保这个 useAuth hook 提供了 isAuthenticated 和 isLoadingAuth

// 定义可用的指标列表
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
  const { isAuthenticated, isLoadingAuth } = useAuth(); // 使用认证上下文
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('cumulative');
  const [activeView, setActiveView] = useState<DashboardView>('kpi');

  // Firebase Auth 和 Functions 实例以及用户状态
  const [user, setUser] = useState(null); 
  const auth = getAuth(app); 
  const functions = getFunctions(app); 
  const [error, setError] = useState<string | null>(null);


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

  const [isGlobalLoading, setIsGlobalLoading] = useState(true);

  const { toast } = useToast();

  const currentPeriodLabel = useMemo(() => {
    return periodOptions.find(p => p.value === selectedPeriodKey)?.label || selectedPeriodKey;
  }, [periodOptions, selectedPeriodKey]);


  // *******************************************************************
  // 核心数据获取逻辑：通过 Cloud Function 安全获取数据
  // *******************************************************************
  useEffect(() => {
    // 监听 Firebase Authentication 状态的变化
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser as any); // 更新用户状态
      if (currentUser) {
        // 用户已登录，调用函数获取数据
        fetchDataAndProcess(); // 调用新的数据获取和处理函数
      } else {
        // 用户未登录或已登出
        setAllV4Data([]); // 清空数据
        setPeriodOptions([]);
        setSelectedPeriodKey('');
        setSelectedComparisonPeriodKey(null);
        setAllBusinessTypes([]);
        setIsGlobalLoading(false);
        toast({ variant: "destructive", title: "未登录", description: "请登录以查看数据。" });
      }
    });

    // 组件卸载时取消订阅，防止内存泄漏
    return () => unsubscribe();
  }, [auth, functions, toast]); // 依赖项包含 auth, functions, toast

  // 定义一个异步函数来从 Cloud Function 获取数据并进行处理
  const fetchDataAndProcess = async () => {
    setIsGlobalLoading(true);
    setError(null);
    try {
      toast({ title: "数据加载中", description: "正在从安全后端加载数据..." });
      
      // 获取对名为 'getInsuranceStats' 的 HTTPS Callable 云函数的引用
      const callGetInsuranceStats = httpsCallable(functions, 'getInsuranceStats');

      // 调用云函数。HTTPS Callable 函数会自动处理认证信息的传递。
      const result = await callGetInsuranceStats() as any;
      

      if (result.data.status === 'success') {
        const rawData = result.data.data; // 云函数返回的数据
        if (!Array.isArray(rawData)) {
          console.error("Data loaded from Cloud Function is not an array:", rawData);
          toast({ variant: "destructive", title: "数据格式错误", description: "从安全后端加载的数据格式不正确，期望得到一个数组。" });
          setAllV4Data([]);
          setPeriodOptions([]);
          setIsGlobalLoading(false);
          return;
        }
        toast({ title: "数据加载成功", description: "已从安全后端加载数据。" });

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
        if (options.length > 0 && (!selectedPeriodKey || !currentSelectedIsValid)) {
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
            .sort((a, b) => a.localeCompare(b));
          setAllBusinessTypes(uniqueTypes);
        } else {
          setAllBusinessTypes([]);
        }

      } else {
        // 云函数返回失败状态
        setError(result.data.message || "从安全后端获取数据失败。");
        toast({ variant: "destructive", title: "数据加载失败", description: `从安全后端获取数据失败: ${result.data.message || '未知错误'}` });
        setAllV4Data([]);
        setPeriodOptions([]);
        setSelectedPeriodKey('');
        setSelectedComparisonPeriodKey(null);
        setAllBusinessTypes([]);
      }

    } catch (error: any) {
      console.error("Error in fetchDataAndProcess:", error);
      // 根据错误代码处理不同类型的错误
      if (error.code === 'unauthenticated') {
        setError("您需要登录才能查看此数据。");
        toast({ variant: "destructive", title: "未登录", description: "请登录以查看数据。" });
      } else if (error.code === 'permission-denied') {
        setError("您没有权限查看此数据。");
        toast({ variant: "destructive", title: "无权限", description: "您没有权限访问此数据。" });
      } else {
        setError(`加载数据时发生错误: ${error.message}`);
        toast({ variant: "destructive", title: "数据加载失败", description: `无法加载数据源: ${error instanceof Error ? error.message : String(error)}` });
      }
      setAllV4Data([]);
      setPeriodOptions([]);
      setSelectedPeriodKey('');
      setSelectedComparisonPeriodKey(null);
      setAllBusinessTypes([]);
    } finally {
      setIsGlobalLoading(false);
    }
  };

  // 调整这里的触发逻辑：确保在认证状态变化后，如果isAuthenticated，则调用 fetchDataAndProcess
  // 避免在组件首次渲染，isAuthenticated 仍为 false 时就尝试拉取数据
  // 这个 useEffect 负责在认证状态改变或 selectedPeriodKey/selectedComparisonPeriodKey 改变时，重新处理数据和图表
  useEffect(() => {
    if (isGlobalLoading || !Array.isArray(allV4Data) || allV4Data.length === 0 || !selectedPeriodKey || !isAuthenticated) {
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
        toast({variant: "default", title: "提示", description: "当前周期和对比周期不能相同。已重置对比周期。"})
        setSelectedComparisonPeriodKey(null); // Reset comparison period
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

  }, [isGlobalLoading, analysisMode, selectedPeriodKey, selectedComparisonPeriodKey, allV4Data, selectedBusinessTypes, selectedTrendMetric, selectedRankingMetric, selectedBubbleXAxisMetric, selectedBubbleYAxisMetric, selectedBubbleSizeMetric, selectedShareChartMetric, selectedParetoMetric, toast, isAuthenticated]);


 // 下面的 `prepareTrendData_V4` 等函数是您原有的数据处理和图表准备逻辑，保持不变
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
    if (mode === 'periodOverPeriod' && grandTotalMetricValue === 0 && currentRawPeriod.business_data.some(bd => (bd as any)[metricKey as keyof V4BusinessDataEntry] !== 0) ) {
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
      periodOptions={periodOptions}
      activeView={activeView}
      onViewChange={setActiveView}
      allBusinessTypes={allBusinessTypes}
      selectedBusinessTypes={selectedBusinessTypes}
      onSelectedBusinessTypesChange={setSelectedBusinessTypes}
      onExportClick={handleExportData}
    />
  );
  
  // 顶层渲染逻辑，处理未登录状态
  if (!isLoadingAuth && !isAuthenticated) {
    return (
      <AppLayout header={headerElement}>
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center text-muted-foreground p-8">
          <h3 className="text-xl font-semibold mb-2">请登录以访问仪表盘</h3>
          <p>登录后即可查看数据分析。</p>
        </div>
      </AppLayout>
    );
  }


  return (
    <AppLayout header={headerElement}>
      <div className="space-y-6 md:space-y-8">
        {isGlobalLoading && isAuthenticated && <p className="text-center text-muted-foreground py-8">数据加载中，请稍候...</p>}
        {/* 针对 Cloud Function 的错误提示 */}
        {!isGlobalLoading && isAuthenticated && error && !allV4Data.length && (
          <p className="text-center text-destructive py-8">{error}</p>
        )}
        {!isGlobalLoading && isAuthenticated && Array.isArray(allV4Data) && allV4Data.length > 0 && !selectedPeriodKey && <p className="text-center text-muted-foreground py-8">请选择一个数据周期以开始分析。</p>}


        {!isGlobalLoading && isAuthenticated && Array.isArray(allV4Data) && allV4Data.length > 0 && selectedPeriodKey && (
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
                 <div className="mt-4 p-4 border rounded-lg bg-secondary/30 text-center">
                  <p className="text-sm text-muted-foreground">AI智能分析功能已暂停。如需启用，请联系管理员。</p>
                </div>
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
