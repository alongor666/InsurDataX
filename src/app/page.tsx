
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { AnalysisMode, Kpi, ChartDataItem, BubbleChartDataItem, ProcessedDataForPeriod, V4PeriodData, PeriodOption, DashboardView, TrendMetricKey, RankingMetricKey, AiSummaryInput } from '@/data/types'; // V4PeriodTotals removed as it's part of V4PeriodData

import { AppLayout } from '@/components/layout/app-layout';
import { AppHeader } from '@/components/layout/header';
import { KpiDashboardSection } from '@/components/sections/kpi-dashboard-section';
import { TrendAnalysisSection } from '@/components/sections/trend-analysis-section';
import { BubbleChartSection } from '@/components/sections/bubble-chart-section';
import { BarChartRankingSection } from '@/components/sections/bar-chart-ranking-section';
import { DataTableSection } from '@/components/sections/data-table-section';
import { AiSummarySection } from '@/components/sections/ai-summary-section';

import { generateBusinessSummary } from '@/ai/flows/generate-business-summary';
import { generateTrendAnalysis, type GenerateTrendAnalysisInput } from '@/ai/flows/generate-trend-analysis-flow';
import { generateBubbleChartAnalysis, type GenerateBubbleChartAnalysisInput } from '@/ai/flows/generate-bubble-chart-analysis-flow';
import { generateBarRankingAnalysis, type GenerateBarRankingAnalysisInput } from '@/ai/flows/generate-bar-ranking-analysis-flow';

import { useToast } from "@/hooks/use-toast";
import {
  processDataForSelectedPeriod,
  calculateKpis,
  setGlobalV4DataForKpiWorkaround, // Import the workaround setter
} from '@/lib/data-utils';


const availableTrendMetrics: { value: TrendMetricKey, label: string }[] = [
  { value: 'premium_written', label: '跟单保费' },
  { value: 'total_loss_amount', label: '总赔款' },
  { value: 'policy_count', label: '保单数量' },
  { value: 'loss_ratio', label: '满期赔付率' },
  { value: 'expense_ratio', label: '费用率' },
  { value: 'variable_cost_ratio', label: '变动成本率'},
  { value: 'premium_earned', label: '满期保费'},
  { value: 'expense_amount', label: '费用额'},
  { value: 'claim_count', label: '赔案数量'},
  { value: 'policy_count_earned', label: '满期保单'}
];

const availableRankingMetrics: { value: RankingMetricKey, label: string }[] = [
  { value: 'premium_written', label: '跟单保费' },
  { value: 'total_loss_amount', label: '总赔款' },
  { value: 'policy_count', label: '保单数量' },
  { value: 'loss_ratio', label: '满期赔付率' },
  { value: 'expense_ratio', label: '费用率' },
  { value: 'variable_cost_ratio', label: '变动成本率'}
];


export default function DashboardPage() {
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('cumulative');
  const [activeView, setActiveView] = useState<DashboardView>('kpi');

  const [allV4Data, setAllV4Data] = useState<V4PeriodData[]>([]);
  const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('');
  
  const [allBusinessTypes, setAllBusinessTypes] = useState<string[]>([]);
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>([]); 

  const [processedData, setProcessedData] = useState<ProcessedDataForPeriod[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);

  const [selectedTrendMetric, setSelectedTrendMetric] = useState<TrendMetricKey>('premium_written');
  const [trendChartData, setTrendChartData] = useState<ChartDataItem[]>([]);

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

  const { toast } = useToast();

  const currentPeriodLabel = useMemo(() => {
    return periodOptions.find(p => p.value === selectedPeriodKey)?.label || selectedPeriodKey;
  }, [periodOptions, selectedPeriodKey]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/data/insurance_data_v4.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: V4PeriodData[] = await response.json();
        setAllV4Data(data);
        setGlobalV4DataForKpiWorkaround(data); // Set global data for workaround

        const options = data
          .map(p => ({ value: p.period_id, label: p.period_label }))
          .sort((a, b) => b.label.localeCompare(a.label)); 
        setPeriodOptions(options);

        if (options.length > 0) {
          setSelectedPeriodKey(options[0].value); 
        }
        
        if (data.length > 0 && data[0].business_data) {
          const uniqueTypes = Array.from(new Set(data[0].business_data
            .map(bd => bd.business_type)
            .filter(bt => bt && bt.toLowerCase() !== '合计' && bt.toLowerCase() !== 'total'))) 
            .sort((a,b) => a.localeCompare(b));
          setAllBusinessTypes(uniqueTypes);
        }

      } catch (error) {
        console.error("Error fetching V4 data:", error);
        toast({ variant: "destructive", title: "数据加载失败", description: "无法加载核心业务数据，请检查网络连接或联系管理员。" });
      }
    };
    fetchData();
  }, [toast]);

  useEffect(() => {
    if (allV4Data.length === 0 || !selectedPeriodKey) {
      setProcessedData([]);
      setKpis([]);
      setTrendChartData([]);
      setBubbleChartData([]);
      setBarRankData([]);
      return;
    }

    const currentPeriod = allV4Data.find(p => p.period_id === selectedPeriodKey);
    if (!currentPeriod) {
      console.warn(`Selected period data not found for period_id: ${selectedPeriodKey}`);
      return;
    }
    
    const dataForCalculations = processDataForSelectedPeriod(
      allV4Data,
      selectedPeriodKey,
      analysisMode,
      selectedBusinessTypes 
    );
    setProcessedData(dataForCalculations);
    
    const calculatedKpis = calculateKpis(dataForCalculations, currentPeriod?.totals_for_period, analysisMode, selectedBusinessTypes);
    setKpis(calculatedKpis);

    const trendData = prepareTrendData_V4(allV4Data, selectedTrendMetric, selectedPeriodKey, analysisMode, selectedBusinessTypes, dataForCalculations);
    setTrendChartData(trendData);

    const bubbleData = prepareBubbleChartData_V4(dataForCalculations, allV4Data, selectedPeriodKey, analysisMode, selectedBusinessTypes);
    setBubbleChartData(bubbleData);

    const rankData = prepareBarRankData_V4(dataForCalculations, selectedRankingMetric, allV4Data, selectedPeriodKey, analysisMode, selectedBusinessTypes);
    setBarRankData(rankData);

  }, [analysisMode, selectedPeriodKey, allV4Data, selectedTrendMetric, selectedRankingMetric, selectedBusinessTypes]);


  const prepareTrendData_V4 = (
    allData: V4PeriodData[], 
    metricKey: TrendMetricKey, 
    currentPeriodId: string, 
    mode: AnalysisMode,
    selBusinessTypes: string[],
    currentProcessedData: ProcessedDataForPeriod[] // Pass processed data for current selection
  ): ChartDataItem[] => {
    const trendOutput: ChartDataItem[] = [];
    const maxPeriods = 12; // Show up to 12 periods for trend

    // Sort all available periods by period_id (assuming 'YYYY-WXX' format allows string sort)
    const sortedPeriods = [...allData].sort((a, b) => a.period_id.localeCompare(b.period_id));
    const currentPeriodIndex = sortedPeriods.findIndex(p => p.period_id === currentPeriodId);

    if (currentPeriodIndex === -1) return [];

    const startIndex = Math.max(0, currentPeriodIndex - maxPeriods + 1);
    const periodsForTrend = sortedPeriods.slice(startIndex, currentPeriodIndex + 1);

    periodsForTrend.forEach(period => {
      const processedForPeriod = processDataForSelectedPeriod(
        allData,
        period.period_id,
        mode, // Use the global analysis mode for trend consistency
        selBusinessTypes
      );

      if (processedForPeriod.length > 0 && processedForPeriod[0].currentMetrics) {
        const metrics = processedForPeriod[0].currentMetrics;
        let value: number | undefined | null = metrics[metricKey as keyof typeof metrics] as number | undefined | null;
        
        // Ensure value is a number, default to 0 if not suitable
        if (typeof value !== 'number' || isNaN(value)) {
            value = 0; 
        }

        const chartItem: ChartDataItem = { name: period.period_label };
        
        // The key for the line in the chart (e.g., "合计" or specific business line name)
        const lineName = processedForPeriod[0].businessLineName || "合计";
        chartItem[lineName] = value;
        trendOutput.push(chartItem);
      }
    });
    return trendOutput;
  };


  const prepareBubbleChartData_V4 = (
    _processedAggData: ProcessedDataForPeriod[], 
    allRawData: V4PeriodData[],
    currentPeriodId: string,
    mode: AnalysisMode,
    selBusinessTypes: string[]
  ): BubbleChartDataItem[] => {
    let dataForBubbleChart: ProcessedDataForPeriod[] = [];

    const currentRawPeriod = allRawData.find(p => p.period_id === currentPeriodId);
    if (!currentRawPeriod) return [];

    const allBusinessTypesInPeriod = Array.from(new Set(currentRawPeriod.business_data.map(bd => bd.business_type).filter(bt => bt && bt.toLowerCase() !== '合计')));

    // If specific business types are selected, use them. Otherwise, use all available for bubble chart.
    const typesToProcess = selBusinessTypes.length > 0 ? selBusinessTypes : allBusinessTypesInPeriod;

    if (typesToProcess.length > 0) {
        dataForBubbleChart = typesToProcess.map(bt => {
            const singleTypeProcessed = processDataForSelectedPeriod(allRawData, currentPeriodId, mode, [bt]);
            return singleTypeProcessed[0]; 
        }).filter(d => d && d.currentMetrics && d.businessLineId !== '合计' && d.businessLineId !== '自定义合计'); // Exclude aggregate lines
    }
    
    return dataForBubbleChart.map(d => ({
        id: d.businessLineId,
        name: d.businessLineName,
        x: d.currentMetrics!.premium_written || 0,
        y: d.currentMetrics!.loss_ratio || 0,
        z: d.currentMetrics!.policy_count || 0,
    })).filter(item => item.x > 0 || item.y > 0 || item.z > 0); // Filter out items with all zero values
  }

  const prepareBarRankData_V4 = (
    _processedAggData: ProcessedDataForPeriod[], 
    metricKey: RankingMetricKey,
    allRawData: V4PeriodData[],
    currentPeriodId: string,
    mode: AnalysisMode,
    selBusinessTypes: string[]
    ): ChartDataItem[] => {
    let dataForRanking: ProcessedDataForPeriod[] = [];
    const currentRawPeriod = allRawData.find(p => p.period_id === currentPeriodId);
    if (!currentRawPeriod) return [];

    const allBusinessTypesInPeriod = Array.from(new Set(currentRawPeriod.business_data.map(bd => bd.business_type).filter(bt => bt && bt.toLowerCase() !== '合计')));
    
    // If specific business types are selected, use them. Otherwise, use all available for ranking.
    const typesToProcess = selBusinessTypes.length > 0 ? selBusinessTypes : allBusinessTypesInPeriod;


    if (typesToProcess.length > 0) {
        dataForRanking = typesToProcess.map(bt => {
            const singleTypeProcessed = processDataForSelectedPeriod(allRawData, currentPeriodId, mode, [bt]);
            return singleTypeProcessed[0];
        }).filter(d => d && d.currentMetrics && d.businessLineId !== '合计' && d.businessLineId !== '自定义合计'); // Exclude aggregate lines
    }
    
    return [...dataForRanking]
        .filter(d => d.currentMetrics && d.currentMetrics[metricKey] !== undefined && d.currentMetrics[metricKey] !== null)
        .sort((a, b) => (b.currentMetrics![metricKey] as number || 0) - (a.currentMetrics![metricKey] as number || 0))
        .map(d => ({
        name: d.businessLineName,
        [metricKey]: d.currentMetrics![metricKey] as number || 0,
        }));
  }

  const getCommonAiFilters = () => ({
    analysisMode,
    period: currentPeriodLabel,
    selectedBusinessTypes: selectedBusinessTypes.length > 0 ? selectedBusinessTypes.join(', ') : '全部业务类型 (合计)',
  });

 const handleOverallAiSummary = async () => {
    setIsOverallAiSummaryLoading(true);
    setOverallAiSummary(null);
    try {
      const currentContextData = processedData.find(p => p.businessLineId === (selectedBusinessTypes.length === 1 ? selectedBusinessTypes[0] : (selectedBusinessTypes.length === 0 ? "合计" : "自定义合计" )));
      let topBusinessLinesData: any[] = [];

      // Prepare top business lines data only if "合计" or "自定义合计" is effectively selected
      if (currentContextData && (currentContextData.businessLineId === '合计' || currentContextData.businessLineId === '自定义合计') && allV4Data.length > 0 && selectedPeriodKey) {
          const individualLinesData = allBusinessTypes.map(bt => {
            return processDataForSelectedPeriod(allV4Data, selectedPeriodKey, analysisMode, [bt])[0];
          }).filter(d => d && d.currentMetrics && d.businessLineId !== '合计' && d.businessLineId !== '自定义合计');
          
          topBusinessLinesData = individualLinesData
            .sort((a, b) => (b.currentMetrics.premium_written || 0) - (a.currentMetrics.premium_written || 0))
            .slice(0, 3) // Take top 3
            .map(d => {
              let changeInPremium = 'N/A';
              if (d.currentMetrics?.premium_written !== undefined && d.momMetrics?.premium_written !== undefined) {
                  const momChangeAbs = d.currentMetrics.premium_written - d.momMetrics.premium_written;
                   changeInPremium = `${momChangeAbs >= 0 ? '+' : ''}${momChangeAbs.toFixed(2)} 万元`;
              }
              return {
                name: d.businessLineName,
                premiumWritten: `${d.currentMetrics.premium_written?.toFixed(2) || 'N/A'} 万元`,
                lossRatio: `${d.currentMetrics.loss_ratio?.toFixed(2) || 'N/A'}%`,
                changeInPremiumWritten: changeInPremium, // This change is vs MoM YTD for 'cumulative' or vs MoM PoP for 'periodOverPeriod'
              };
            });
      } else if (currentContextData) { // Single business line selected
         let changeInPremium = 'N/A';
         if (currentContextData.currentMetrics?.premium_written !== undefined && currentContextData.momMetrics?.premium_written !== undefined) {
            const momChangeAbs = currentContextData.currentMetrics.premium_written - currentContextData.momMetrics.premium_written;
            changeInPremium = `${momChangeAbs >= 0 ? '+' : ''}${momChangeAbs.toFixed(2)} 万元`;
         }
        topBusinessLinesData = [{ 
            name: currentContextData.businessLineName,
            premiumWritten: `${currentContextData.currentMetrics.premium_written?.toFixed(2) || 'N/A'} 万元`,
            lossRatio: `${currentContextData.currentMetrics.loss_ratio?.toFixed(2) || 'N/A'}%`,
            changeInPremiumWritten: changeInPremium
        }];
      }

       const aiInputData = {
        keyPerformanceIndicators: kpis.map(kpi => ({
            title: kpi.title,
            value: kpi.value,
            rawValue: kpi.rawValue, // Sending raw value for AI to potentially use
            momChangePercent: kpi.change, 
            momChangeAbsolute: kpi.changeAbsolute, 
            yoyChangePercent: kpi.yoyChange, 
            yoyChangeAbsolute: kpi.yoyChangeAbsolute, 
            isRisk: kpi.isRisk || kpi.isBorderRisk || kpi.isOrangeRisk,
            description: kpi.description
        })),
        topBusinessLinesByPremiumWritten: topBusinessLinesData,
      };
      
      const input: AiSummaryInput = {
        data: JSON.stringify(aiInputData, null, 2),
        filters: JSON.stringify(getCommonAiFilters(), null, 2),
        analysisMode,
        currentPeriodLabel,
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
    if (!trendChartData.length) {
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
      toast({ variant: "destructive", title: "AI趋势图分析失败" });
    } finally {
      setIsTrendAiSummaryLoading(false);
    }
  };

  const handleGenerateBubbleAiSummary = async () => {
    if (!bubbleChartData.length) {
      toast({ variant: "default", title: "无气泡图数据", description: "无法为当前选择生成AI气泡图分析。" });
      return;
    }
    setIsBubbleAiSummaryLoading(true);
    setBubbleAiSummary(null);
    try {
      const input: GenerateBubbleChartAnalysisInput = {
        chartDataJson: JSON.stringify(bubbleChartData),
        xAxisMetric: "跟单保费", 
        yAxisMetric: "满期赔付率",
        bubbleSizeMetric: "保单数量",
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
      toast({ variant: "destructive", title: "AI气泡图分析失败" });
    } finally {
      setIsBubbleAiSummaryLoading(false);
    }
  };

  const handleGenerateBarRankAiSummary = async () => {
    if (!barRankData.length) {
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
      toast({ variant: "destructive", title: "AI排名图分析失败" });
    } finally {
      setIsBarRankAiSummaryLoading(false);
    }
  };

  const headerElement = (
    <AppHeader
      analysisMode={analysisMode}
      onAnalysisModeChange={setAnalysisMode}
      onAiSummaryClick={handleOverallAiSummary}
      selectedPeriod={selectedPeriodKey}
      onPeriodChange={setSelectedPeriodKey}
      isAiSummaryLoading={isOverallAiSummaryLoading}
      periodOptions={periodOptions}
      activeView={activeView}
      onViewChange={setActiveView}
      allBusinessTypes={allBusinessTypes}
      selectedBusinessTypes={selectedBusinessTypes}
      onSelectedBusinessTypesChange={setSelectedBusinessTypes}
    />
  );

  return (
    <AppLayout header={headerElement}>
      <div className="space-y-6 md:space-y-8">
        <AiSummarySection summary={overallAiSummary} isLoading={isOverallAiSummaryLoading} />

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
          />
        )}
        {activeView === 'bubble' && 
          <BubbleChartSection 
            data={bubbleChartData} 
            aiSummary={bubbleAiSummary}
            isAiSummaryLoading={isBubbleAiSummaryLoading}
            onGenerateAiSummary={handleGenerateBubbleAiSummary}
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
          />
        )}
        {activeView === 'data_table' && <DataTableSection data={processedData} analysisMode={analysisMode} />}
      </div>
    </AppLayout>
  );
}
