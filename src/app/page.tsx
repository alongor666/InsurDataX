
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { AnalysisMode, Kpi, ChartDataItem, BubbleChartDataItem, ProcessedDataForPeriod, V4PeriodData, PeriodOption, DashboardView, TrendMetricKey, RankingMetricKey, V4PeriodTotals, AiSummaryInput } from '@/data/types';

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

        const options = data
          .map(p => ({ value: p.period_id, label: p.period_label }))
          .sort((a, b) => b.label.localeCompare(a.label)); 
        setPeriodOptions(options);

        if (options.length > 0) {
          setSelectedPeriodKey(options[0].value); 
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
    
    const calculatedKpis = calculateKpis(dataForCalculations, currentPeriod?.totals_for_period);
    setKpis(calculatedKpis);

    // Update chart data based on processedData
    // Placeholder until chart data prep functions are fully implemented
    const trendData = prepareTrendData_V4(allV4Data, selectedTrendMetric, selectedPeriodKey, analysisMode, selectedBusinessTypes);
    setTrendChartData(trendData);

    const bubbleData = prepareBubbleChartData_V4(dataForCalculations);
    setBubbleChartData(bubbleData);

    const rankData = prepareBarRankData_V4(dataForCalculations, selectedRankingMetric);
    setBarRankData(rankData);

  }, [analysisMode, selectedPeriodKey, allV4Data, selectedTrendMetric, selectedRankingMetric, selectedBusinessTypes]);


  // Placeholder functions until data-utils.ts is refactored for V4
  const prepareTrendData_V4 = (
    allData: V4PeriodData[], 
    metricKey: TrendMetricKey, 
    currentPeriodId: string, 
    mode: AnalysisMode,
    businessTypes: string[]
  ): ChartDataItem[] => {
    // This needs to iterate back a few periods, apply processDataForSelectedPeriod for each,
    // then extract the selected metric for the trend line(s).
    console.warn("prepareTrendData_V4 in page.tsx is a placeholder and needs full V4 implementation.");
    // Example: return a flat line for "合计" if data is available
    if (processedData.length > 0 && processedData[0].currentMetrics && processedData[0].currentMetrics[metricKey] !== undefined) {
        const currentVal = processedData[0].currentMetrics[metricKey] as number;
        return [
            { name: "W-2", [businessTypes.length > 0 ? businessTypes.join(',') : '合计']: currentVal * 0.9 },
            { name: "W-1", [businessTypes.length > 0 ? businessTypes.join(',') : '合计']: currentVal * 0.95 },
            { name: "W0", [businessTypes.length > 0 ? businessTypes.join(',') : '合计']: currentVal },
        ];
    }
    return [];
  };

  const prepareBubbleChartData_V4 = (processedV4Data: ProcessedDataForPeriod[]): BubbleChartDataItem[] => {
    if (!processedV4Data || processedV4Data.length === 0 ) return [];
    
    // If selectedBusinessTypes is empty, it means "合计". Bubble chart needs individual lines.
    // So, if "合计" is the only item in processedV4Data, we need to re-process for individual lines for the bubble chart.
    // This logic might be better inside processDataForSelectedPeriod or a dedicated bubble chart data prep function.
    // For now, this is a simplified placeholder.
    
    let dataForBubble: ProcessedDataForPeriod[] = processedV4Data;

    if (selectedBusinessTypes.length === 0 && allV4Data.length > 0 && selectedPeriodKey) {
        const currentRawPeriod = allV4Data.find(p => p.period_id === selectedPeriodKey);
        if (currentRawPeriod) {
             dataForBubble = currentRawPeriod.business_data
                .filter(bd => bd.business_type !== "合计") // Exclude the raw "合计"
                .map(bt => {
                    const singleTypeProcessed = processDataForSelectedPeriod(allV4Data, selectedPeriodKey, analysisMode, [bt.business_type]);
                    return singleTypeProcessed[0];
                }).filter(d => d && d.currentMetrics); // Ensure data was processed
        }
    }


    return dataForBubble.filter(d => d.businessLineId !== '合计' && d.currentMetrics).map(d => ({
        id: d.businessLineId,
        name: d.businessLineName,
        x: d.currentMetrics!.premium_written || 0,
        y: d.currentMetrics!.loss_ratio || 0,
        z: d.currentMetrics!.policy_count || 0,
    }));
  }

  const prepareBarRankData_V4 = (processedV4Data: ProcessedDataForPeriod[], metricKey: RankingMetricKey): ChartDataItem[] => {
     if (!processedV4Data || processedV4Data.length === 0) return [];

    let dataForRanking: ProcessedDataForPeriod[] = processedV4Data;

    if (selectedBusinessTypes.length === 0 && allV4Data.length > 0 && selectedPeriodKey) {
        const currentRawPeriod = allV4Data.find(p => p.period_id === selectedPeriodKey);
        if (currentRawPeriod) {
             dataForRanking = currentRawPeriod.business_data
                .filter(bd => bd.business_type !== "合计") 
                .map(bt => {
                    const singleTypeProcessed = processDataForSelectedPeriod(allV4Data, selectedPeriodKey, analysisMode, [bt.business_type]);
                    return singleTypeProcessed[0];
                }).filter(d => d && d.currentMetrics);
        }
    }
    
    return [...dataForRanking]
        .filter(d => d.businessLineId !== '合计' && d.currentMetrics && d.currentMetrics[metricKey] !== undefined)
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
       const aiInputData = {
        keyPerformanceIndicators: kpis.map(kpi => ({
            title: kpi.title,
            value: kpi.value,
            rawValue: kpi.rawValue,
            momChangePercent: kpi.change, 
            momChangeAbsolute: kpi.changeAbsolute, 
            yoyChangePercent: kpi.yoyChange, 
            yoyChangeAbsolute: kpi.yoyChangeAbsolute, 
            isRisk: kpi.isRisk || kpi.isBorderRisk || kpi.isOrangeRisk,
            description: kpi.description
        })),
        // Only include top business lines if not in "合计" mode, or if data structure supports it
        topBusinessLinesByPremiumWritten: (processedData.length > 1 ? processedData : (selectedBusinessTypes.length > 0 ? processedData : []))
          .filter(d => d.businessLineId !== '合计' && d.currentMetrics) 
          .sort((a, b) => (b.currentMetrics!.premium_written || 0) - (a.currentMetrics!.premium_written || 0))
          .slice(0, 3)
          .map(d => {
            let changeInPremiumWritten: string | number = 'N/A';
            if (d.currentMetrics?.premium_written !== undefined && d.momMetrics?.premium_written !== undefined) {
                const momChangeAbs = d.currentMetrics.premium_written - d.momMetrics.premium_written;
                changeInPremiumWritten = `${momChangeAbs.toFixed(2)} 万元`;
            }
            return {
              name: d.businessLineName,
              premiumWritten: `${d.currentMetrics!.premium_written?.toFixed(2) || 'N/A'} 万元`,
              lossRatio: `${d.currentMetrics!.loss_ratio?.toFixed(2) || 'N/A'}%`,
              changeInPremiumWritten: changeInPremiumWritten,
            };
          }),
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
      toast({ variant: "destructive", title: "AI总体摘要生成失败", description: "请检查控制台获取更多信息。" });
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
        xAxisMetric: "跟单保费", // As per current prepareBubbleChartData_V4
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
