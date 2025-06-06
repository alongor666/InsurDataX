
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { AnalysisMode, Kpi, ChartDataItem, BubbleChartDataItem, ProcessedDataForPeriod, V4PeriodData, PeriodOption, AiSummaryInput } from '@/data/types';
import { AppLayout } from '@/components/layout/app-layout';
import { AppHeader } from '@/components/layout/header';
import { KpiDashboardSection } from '@/components/sections/kpi-dashboard-section';
import { TrendAnalysisSection } from '@/components/sections/trend-analysis-section';
import { BubbleChartSection } from '@/components/sections/bubble-chart-section';
import { BarChartRankingSection } from '@/components/sections/bar-chart-ranking-section';
import { DataTableSection } from '@/components/sections/data-table-section';
import { AiSummarySection } from '@/components/sections/ai-summary-section';
import { generateBusinessSummary } from '@/ai/flows/generate-business-summary';
import { useToast } from "@/hooks/use-toast";
import { 
  processDataForRange, 
  calculateKpis,
  prepareTrendData,
  prepareBubbleChartData,
  prepareBarRankData,
  // getDateRangeByValue, // To be removed/replaced
} from '@/lib/data-utils';

// V4.0 field names for ranking and trend metrics
type RankingMetricKey = keyof Pick<ProcessedDataForPeriod, 'premium_written' | 'total_loss_amount' | 'policy_count' | 'loss_ratio'>;
type TrendMetricKey = keyof Pick<ProcessedDataForPeriod, 'premium_written' | 'total_loss_amount' | 'policy_count' | 'loss_ratio'>;


const availableTrendMetrics: { value: TrendMetricKey, label: string }[] = [
  { value: 'premium_written', label: '跟单保费' },
  { value: 'total_loss_amount', label: '总赔款' },
  { value: 'policy_count', label: '保单数量' },
  { value: 'loss_ratio', label: '满期赔付率' },
];

const availableRankingMetrics: { value: RankingMetricKey, label: string }[] = [
  { value: 'premium_written', label: '跟单保费' },
  { value: 'total_loss_amount', label: '总赔款' },
  { value: 'policy_count', label: '保单数量' },
  { value: 'loss_ratio', label: '满期赔付率' },
];


export default function DashboardPage() {
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('periodOverPeriod'); // Default as per PRD
  
  const [allV4Data, setAllV4Data] = useState<V4PeriodData[]>([]);
  const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>(''); // Will be a period_id

  const [processedData, setProcessedData] = useState<ProcessedDataForPeriod[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  
  const [selectedTrendMetric, setSelectedTrendMetric] = useState<TrendMetricKey>('premium_written');
  const [trendChartData, setTrendChartData] = useState<ChartDataItem[]>([]);
  
  const [bubbleChartData, setBubbleChartData] = useState<BubbleChartDataItem[]>([]);
  
  const [selectedRankingMetric, setSelectedRankingMetric] = useState<RankingMetricKey>('premium_written');
  const [barRankData, setBarRankData] = useState<ChartDataItem[]>([]);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false);
  const { toast } = useToast();

  // Fetch V4 data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/data/insurance_data_v4.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: V4PeriodData[] = await response.json();
        setAllV4Data(data);
        
        const options = data.map(p => ({ value: p.period_id, label: p.period_label })).sort((a,b) => b.label.localeCompare(a.label)); // Sort by label, newest first
        setPeriodOptions(options);
        
        if (options.length > 0) {
          setSelectedPeriodKey(options[0].value); // Default to the latest period
        }
      } catch (error) {
        console.error("Error fetching V4 data:", error);
        toast({ variant: "destructive", title: "数据加载失败", description: "无法加载核心业务数据，请检查网络连接或联系管理员。" });
      }
    };
    fetchData();
  }, [toast]);

  // Main data processing effect
  useEffect(() => {
    if (allV4Data.length === 0 || !selectedPeriodKey) {
      // Clear out data if no source data or period selected
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
    
    // TODO: Refactor data-utils to handle V4PeriodData directly
    // For now, processDataForRange and others will need significant rework.
    // The following lines are placeholders or will use simplified logic until data-utils is updated.
    
    // Placeholder: In a real scenario, processDataForRange would take currentPeriod.business_data, 
    // analysisMode, and potentially comparison period data.
    // For now, this will likely not produce correct results until data-utils is updated.
    const data = processDataForRange_V4(currentPeriod, analysisMode, allV4Data); // processDataForRange needs to be V4 compatible
    setProcessedData(data);

    const calculatedKpis = calculateKpis_V4(data, analysisMode, currentPeriod, allV4Data); // calculateKpis needs to be V4 compatible
    setKpis(calculatedKpis);
    
    // Trend data will need currentPeriod and historical data, and selectedTrendMetric
    const trendData = prepareTrendData_V4(allV4Data, selectedTrendMetric, selectedPeriodKey); // prepareTrendData needs to be V4 compatible
    setTrendChartData(trendData);

    // Bubble chart uses current period processed data
    const bubbleData = prepareBubbleChartData(data); // prepareBubbleChartData might be reusable if 'data' is correct
    setBubbleChartData(bubbleData);

    // Bar rank uses current period processed data and selected ranking metric
    const rankData = prepareBarRankData(data, selectedRankingMetric); // prepareBarRankData might be reusable if 'data' is correct
    setBarRankData(rankData);

  }, [analysisMode, selectedPeriodKey, allV4Data, selectedTrendMetric, selectedRankingMetric]);


  // Placeholder functions until data-utils.ts is refactored for V4
  const processDataForRange_V4 = (currentPeriod: V4PeriodData, mode: AnalysisMode, allData: V4PeriodData[]): ProcessedDataForPeriod[] => {
    // This function needs full V4 implementation:
    // 1. Extract business_data from currentPeriod.
    // 2. If mode is 'periodOverPeriod', calculate "当周发生额" (current week's actuals) by subtracting previous period's YTD.
    //    - Handle base fields first (premium_written, premium_earned, total_loss_amount, expense_amount_raw, claim_count, policy_count_earned)
    //    - Then recalculate ratios (loss_ratio, expense_ratio, etc.) and averages (avg_premium_per_policy) using these "当周" base fields.
    // 3. Calculate PoP changes (环比, 同比) based on comparison_period_id_mom and comparison_period_id_yoy.
    // 4. Map to ProcessedDataForPeriod structure.
    console.warn("processDataForRange_V4 needs full implementation for V4 data.");
    
    // Temporary mapping for basic display, no "当周" calculation or PoP yet.
    return currentPeriod.business_data.map(bd => ({
      businessLineId: bd.business_type,
      businessLineName: bd.business_type,
      // icon: getBusinessLineIcon(bd.business_type), // You'll need a mapping function
      premium_written: bd.premium_written,
      premium_earned: bd.premium_earned,
      total_loss_amount: bd.total_loss_amount,
      expense_amount: bd.premium_written * (bd.expense_ratio / 100), // Derived, expense_amount_raw should be used for expense_ratio agg.
      policy_count: bd.avg_premium_per_policy && bd.avg_premium_per_policy !== 0 ? (bd.premium_written * 10000) / bd.avg_premium_per_policy : 0,
      claim_count: bd.claim_count,
      loss_ratio: bd.loss_ratio,
      expense_ratio: bd.expense_ratio,
      variable_cost_ratio: bd.variable_cost_ratio,
      // ... other fields from ProcessedDataForPeriod initialized to 0 or undefined
      sum_premium_written_for_ratio_calc: bd.premium_written,
      sum_premium_earned_for_ratio_calc: bd.premium_earned,
      sum_total_loss_amount_for_ratio_calc: bd.total_loss_amount,
      sum_expense_amount_raw_for_ratio_calc: bd.expense_amount_raw,
      sum_claim_count_for_ratio_calc: bd.claim_count,
      sum_policy_count_earned_for_ratio_calc: bd.policy_count_earned,

    }));
  };

  const calculateKpis_V4 = (processedV4Data: ProcessedDataForPeriod[], mode: AnalysisMode, currentPeriod: V4PeriodData, allData: V4PeriodData[]): Kpi[] => {
    // This function needs full V4 implementation:
    // 1. Aggregate `processedV4Data` (which should be either YTD or "当周" based on mode).
    // 2. Calculate overall KPIs.
    // 3. Calculate PoP changes for these KPIs based on comparison periods.
    console.warn("calculateKpis_V4 needs full implementation for V4 data.");
    // Temporary: reuse old calculateKpis logic, which expects a different structure.
    // This will likely not be fully correct until calculateKpis is also updated.
    return calculateKpis(processedV4Data, mode); 
  };
  
  const prepareTrendData_V4 = (allData: V4PeriodData[], metricKey: TrendMetricKey, currentPeriodId: string): ChartDataItem[] => {
    // This function needs full V4 implementation:
    // 1. Filter historical data (e.g., last 12 weeks).
    // 2. For each period in history, calculate the "当周发生额" for each business line if analysisMode is 'periodOverPeriod'.
    // 3. Aggregate the chosen metricKey for each business line across the historical periods.
    // 4. Format for chart.
    console.warn("prepareTrendData_V4 needs full implementation for V4 data.");
    return []; // Placeholder
  };


  const handleAiSummary = async () => {
    setIsAiSummaryLoading(true);
    setAiSummary(null);
    const currentPeriodLabel = periodOptions.find(p => p.value === selectedPeriodKey)?.label || selectedPeriodKey;
    try {
       const aiInputData = {
        keyPerformanceIndicators: kpis.map(kpi => ({ title: kpi.title, value: kpi.value, change: kpi.change, yoyChange: kpi.yoyChange, isRisk: kpi.isRisk })),
        topBusinessLinesByPremiumWritten: processedData // Assuming processedData is correctly structured after V4 refactor
          .sort((a,b) => b.premium_written - a.premium_written)
          .slice(0,3)
          .map(d => ({
            name: d.businessLineName,
            premiumWritten: d.premium_written,
            lossRatio: d.loss_ratio,
            changeInPremiumWritten: analysisMode === 'periodOverPeriod' ? d.premium_writtenChange : 'N/A' // This change needs to be from V4 logic
          })),
      };
      const filters = {
        analysisMode,
        period: currentPeriodLabel,
      };
      
      const input: AiSummaryInput = {
        data: JSON.stringify(aiInputData, null, 2),
        filters: JSON.stringify(filters, null, 2),
        analysisMode, // Pass explicitly
        currentPeriodLabel, // Pass explicitly
      };
      
      const result = await generateBusinessSummary(input);
      setAiSummary(result.summary);
      toast({ title: "AI摘要生成成功", description: "业务摘要已更新。" });
    } catch (error) {
      console.error("Error generating AI summary:", error);
      setAiSummary("生成AI摘要时出错，请稍后再试。");
      toast({ variant: "destructive", title: "AI摘要生成失败", description: "请检查控制台获取更多信息。" });
    } finally {
      setIsAiSummaryLoading(false);
    }
  };

  const headerElement = (
    <AppHeader
      analysisMode={analysisMode}
      onAnalysisModeChange={setAnalysisMode}
      onAiSummaryClick={handleAiSummary}
      selectedPeriod={selectedPeriodKey}
      onPeriodChange={setSelectedPeriodKey}
      isAiSummaryLoading={isAiSummaryLoading}
      periodOptions={periodOptions} // Pass new period options
    />
  );

  return (
    <AppLayout header={headerElement}>
      <div className="grid grid-cols-1 gap-6 md:gap-8">
        <KpiDashboardSection kpis={kpis} />
        
        <AiSummarySection summary={aiSummary} isLoading={isAiSummaryLoading} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          <TrendAnalysisSection 
            data={trendChartData} 
            availableMetrics={availableTrendMetrics}
            onMetricChange={setSelectedTrendMetric}
            selectedMetric={selectedTrendMetric}
          />
          <BubbleChartSection data={bubbleChartData} />
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          <BarChartRankingSection 
            data={barRankData}
            availableMetrics={availableRankingMetrics}
            onMetricChange={setSelectedRankingMetric}
            selectedMetric={selectedRankingMetric}
          />
          <DataTableSection data={processedData} analysisMode={analysisMode} />
        </div>

      </div>
    </AppLayout>
  );
}

