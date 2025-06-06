
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { AnalysisMode, Kpi, ChartDataItem, BubbleChartDataItem, ProcessedDataForPeriod, V4PeriodData, PeriodOption, DashboardView, TrendMetricKey, RankingMetricKey, V4PeriodTotals } from '@/data/types';
import type { AiSummaryInput } from '@/data/types'; 

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
  // processDataForRange, // This will be replaced by V4 specific logic
  calculateKpis,
  // prepareTrendData, // This will be replaced by V4 specific logic
  // prepareBubbleChartData, // This will be replaced by V4 specific logic
  // prepareBarRankData, // This will be replaced by V4 specific logic
} from '@/lib/data-utils'; // Placeholder imports, implementations need V4 update


const availableTrendMetrics: { value: TrendMetricKey, label: string }[] = [
  { value: 'premium_written', label: '跟单保费' },
  { value: 'total_loss_amount', label: '总赔款' },
  { value: 'policy_count', label: '保单数量' },
  { value: 'loss_ratio', label: '满期赔付率' },
  { value: 'expense_ratio', label: '费用率' },
  { value: 'variable_cost_ratio', label: '变动成本率'},
  { value: 'premium_earned', label: '满期保费'},
  { value: 'expense_amount_raw', label: '原始费用额'},
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
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('periodOverPeriod'); 
  const [activeView, setActiveView] = useState<DashboardView>('kpi');
  
  const [allV4Data, setAllV4Data] = useState<V4PeriodData[]>([]);
  const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>(''); 

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
          .sort((a,b) => b.label.localeCompare(a.label)); 
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
    
    // TODO: Implement robust V4 data processing in data-utils.ts
    // These placeholder calls will be updated.
    const dataForCalculations = processDataForRange_V4(currentPeriod, analysisMode, allV4Data); 
    setProcessedData(dataForCalculations);

    const calculatedKpis = calculateKpis_V4(dataForCalculations, analysisMode, currentPeriod?.totals_for_period); 
    setKpis(calculatedKpis);
    
    const trendData = prepareTrendData_V4(allV4Data, selectedTrendMetric, selectedPeriodKey, analysisMode); 
    setTrendChartData(trendData);

    const bubbleData = prepareBubbleChartData_V4(dataForCalculations); 
    setBubbleChartData(bubbleData);

    const rankData = prepareBarRankData_V4(dataForCalculations, selectedRankingMetric); 
    setBarRankData(rankData);

  }, [analysisMode, selectedPeriodKey, allV4Data, selectedTrendMetric, selectedRankingMetric]);


  // Placeholder functions until data-utils.ts is refactored for V4
  // These functions will eventually be replaced by robust implementations in data-utils.ts
  const processDataForRange_V4 = (currentPeriod: V4PeriodData, mode: AnalysisMode, allData: V4PeriodData[]): ProcessedDataForPeriod[] => {
    console.warn("processDataForRange_V4 in page.tsx is a placeholder and needs full V4 implementation in data-utils.ts.");
    // This function needs to:
    // 1. Filter currentPeriod.business_data based on any selected business types (not yet implemented).
    // 2. If mode is 'periodOverPeriod', calculate "当周发生额" for each metric.
    //    - For base amounts (premium_written, etc.): CurrentYTD - PreviousPeriodYTD
    //    - For ratios/averages: Recalculate using "当周发生额" of numerators/denominators.
    // 3. Calculate PoP and YoY changes.
    // 4. Return an array of ProcessedDataForPeriod (usually one item for "合计" or multiple if no aggregation).
    // For now, let's return a simplified aggregated structure to allow calculateKpis to run.
    let aggregatedCurrent: ProcessedDataForPeriod = {
      businessLineId: '合计', businessLineName: '合计',
      premium_written: 0, premium_earned: 0, total_loss_amount: 0, expense_amount_raw: 0,
      policy_count: 0, claim_count: 0, policy_count_earned: 0,
      loss_ratio: 0, expense_ratio: 0, variable_cost_ratio: 0,
      sum_premium_written_for_ratio_calc: 0, sum_premium_earned_for_ratio_calc: 0,
      sum_total_loss_amount_for_ratio_calc: 0, sum_expense_amount_raw_for_ratio_calc: 0,
      sum_claim_count_for_ratio_calc: 0, sum_policy_count_earned_for_ratio_calc: 0,
    };
    
    currentPeriod.business_data.forEach(bd => {
      aggregatedCurrent.premium_written += bd.premium_written || 0;
      aggregatedCurrent.premium_earned += bd.premium_earned || 0;
      aggregatedCurrent.total_loss_amount += bd.total_loss_amount || 0;
      aggregatedCurrent.expense_amount_raw += bd.expense_amount_raw || 0;
      // policy_count is derived: (premium_written * 10000) / avg_premium_per_policy
      // For simplicity, if avg_premium_per_policy is there, use it.
      const policiesForThisLine = bd.avg_premium_per_policy && bd.avg_premium_per_policy !== 0 && bd.premium_written ? (bd.premium_written * 10000) / bd.avg_premium_per_policy : 0;
      aggregatedCurrent.policy_count += policiesForThisLine;
      aggregatedCurrent.claim_count! += bd.claim_count || 0;
      aggregatedCurrent.policy_count_earned! += bd.policy_count_earned || 0;
    });

    // TODO: This needs to calculate actual PoP changes based on previous period for each field.
    // For now, hardcoding some illustrative changes.
    if (mode === 'periodOverPeriod') {
        aggregatedCurrent.premium_writtenChange = Math.random() > 0.5 ? 5.5 : -3.2;
        aggregatedCurrent.premium_earnedChange = Math.random() > 0.5 ? 5.1 : -2.9;
        aggregatedCurrent.total_loss_amountChange = Math.random() > 0.5 ? -2.0 : 8.1; // loss increase is bad
        aggregatedCurrent.expense_amount_rawChange = Math.random() > 0.5 ? 1.0 : -1.5;
        aggregatedCurrent.policy_countChange = Math.random() > 0.5 ? 2.5 : -1.0;
        aggregatedCurrent.claim_countChange = Math.random() > 0.5 ? 1.2 : -0.5;
        aggregatedCurrent.policy_count_earnedChange = Math.random() > 0.5 ? 2.3 : -0.8;
    }
    
    // Pass through summed base values for ratio calculation in calculateKpis
    aggregatedCurrent.sum_premium_written_for_ratio_calc = aggregatedCurrent.premium_written;
    aggregatedCurrent.sum_premium_earned_for_ratio_calc = aggregatedCurrent.premium_earned;
    aggregatedCurrent.sum_total_loss_amount_for_ratio_calc = aggregatedCurrent.total_loss_amount;
    aggregatedCurrent.sum_expense_amount_raw_for_ratio_calc = aggregatedCurrent.expense_amount_raw;
    aggregatedCurrent.sum_claim_count_for_ratio_calc = aggregatedCurrent.claim_count;
    aggregatedCurrent.sum_policy_count_earned_for_ratio_calc = aggregatedCurrent.policy_count_earned;

    return [aggregatedCurrent]; // Returning a single aggregated item for now
  };

  const calculateKpis_V4 = (processedV4Data: ProcessedDataForPeriod[], mode: AnalysisMode, totalsForPeriod?: V4PeriodTotals): Kpi[] => {
    console.warn("calculateKpis_V4 in page.tsx is a placeholder and needs full V4 implementation check in data-utils.ts.");
    return calculateKpis(processedV4Data, mode, totalsForPeriod); 
  };
  
  const prepareTrendData_V4 = (allData: V4PeriodData[], metricKey: TrendMetricKey, currentPeriodId: string, mode: AnalysisMode): ChartDataItem[] => {
    console.warn("prepareTrendData_V4 in page.tsx is a placeholder and needs full V4 implementation in data-utils.ts.");
    return []; 
  };

  const prepareBubbleChartData_V4 = (processedV4Data: ProcessedDataForPeriod[]): BubbleChartDataItem[] => {
     console.warn("prepareBubbleChartData_V4 in page.tsx is a placeholder and needs full V4 implementation in data-utils.ts.");
     // Placeholder, actual bubble chart data util will be in data-utils.ts
    if (!processedV4Data || processedV4Data.length === 0) return [];
    return processedV4Data.map(d => ({
        id: d.businessLineId,
        name: d.businessLineName,
        x: d.premium_written || 0, 
        y: d.loss_ratio || 0, 
        z: d.policy_count || 0, 
    }));
  }
  
  const prepareBarRankData_V4 = (processedV4Data: ProcessedDataForPeriod[], metricKey: RankingMetricKey): ChartDataItem[] => {
    console.warn("prepareBarRankData_V4 in page.tsx is a placeholder and needs full V4 implementation in data-utils.ts.");
    // Placeholder, actual bar rank data util will be in data-utils.ts
    if (!processedV4Data || processedV4Data.length === 0) return [];
    return [...processedV4Data]
        .sort((a, b) => (b[metricKey] as number || 0) - (a[metricKey] as number || 0))
        .map(d => ({
        name: d.businessLineName,
        [metricKey]: d[metricKey] as number || 0,
        }));
  }


  const handleAiSummary = async () => {
    setIsAiSummaryLoading(true);
    setAiSummary(null);
    const currentPeriodLabel = periodOptions.find(p => p.value === selectedPeriodKey)?.label || selectedPeriodKey;
    try {
       const aiInputData = {
        keyPerformanceIndicators: kpis.map(kpi => ({ 
            title: kpi.title, 
            value: kpi.value, 
            change: kpi.change, 
            changeAbsolute: kpi.changeAbsolute,
            yoyChange: kpi.yoyChange, 
            yoyChangeAbsolute: kpi.yoyChangeAbsolute,
            isRisk: kpi.isRisk || kpi.isBorderRisk || kpi.isOrangeRisk 
        })),
        topBusinessLinesByPremiumWritten: processedData // This needs to be actual lines, not just "合计"
          .sort((a,b) => b.premium_written - a.premium_written)
          .slice(0,3)
          .map(d => ({
            name: d.businessLineName,
            premiumWritten: d.premium_written,
            lossRatio: d.loss_ratio,
            changeInPremiumWritten: analysisMode === 'periodOverPeriod' ? d.premium_writtenChange : 'N/A' 
          })),
      };
      const filters = {
        analysisMode,
        period: currentPeriodLabel,
      };
      
      const input: AiSummaryInput = {
        data: JSON.stringify(aiInputData, null, 2),
        filters: JSON.stringify(filters, null, 2),
        analysisMode, 
        currentPeriodLabel, 
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
      periodOptions={periodOptions} 
      activeView={activeView}
      onViewChange={setActiveView}
    />
  );

  return (
    <AppLayout header={headerElement}>
      <div className="space-y-6 md:space-y-8">
        <AiSummarySection summary={aiSummary} isLoading={isAiSummaryLoading} />

        {activeView === 'kpi' && <KpiDashboardSection kpis={kpis} />}
        
        {activeView === 'trend' && (
          <TrendAnalysisSection 
            data={trendChartData} 
            availableMetrics={availableTrendMetrics}
            onMetricChange={setSelectedTrendMetric}
            selectedMetric={selectedTrendMetric}
          />
        )}
        {activeView === 'bubble' && <BubbleChartSection data={bubbleChartData} />}
        
        {activeView === 'bar_rank' && (
          <BarChartRankingSection 
            data={barRankData}
            availableMetrics={availableRankingMetrics}
            onMetricChange={setSelectedRankingMetric}
            selectedMetric={selectedRankingMetric}
          />
        )}
        {activeView === 'data_table' && <DataTableSection data={processedData} analysisMode={analysisMode} />}
      </div>
    </AppLayout>
  );
}

