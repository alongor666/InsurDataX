
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { AnalysisMode, Kpi, ChartDataItem, BubbleChartDataItem, ProcessedDataForPeriod, V4PeriodData, PeriodOption, DashboardView, TrendMetricKey, RankingMetricKey } from '@/data/types';
import type { AiSummaryInput } from '@/data/types'; // Explicit import for AiSummaryInput
// import { defaultDateRangeOptions } from '@/data/mock-data'; // Replaced by dynamic periodOptions

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
} from '@/lib/data-utils';


const availableTrendMetrics: { value: TrendMetricKey, label: string }[] = [
  { value: 'premium_written', label: '跟单保费' },
  { value: 'total_loss_amount', label: '总赔款' },
  { value: 'policy_count', label: '保单数量' },
  { value: 'loss_ratio', label: '满期赔付率' },
  { value: 'expense_ratio', label: '费用率' },
  { value: 'variable_cost_ratio', label: '变动成本率'},
  { value: 'premium_earned', label: '满期保费'},
  { value: 'expense_amount_raw', label: '原始费用额'}
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
        
        const options = data.map(p => ({ value: p.period_id, label: p.period_label })).sort((a,b) => b.label.localeCompare(a.label)); 
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
    
    const data = processDataForRange_V4(currentPeriod, analysisMode, allV4Data); 
    setProcessedData(data);

    const calculatedKpis = calculateKpis_V4(data, analysisMode, currentPeriod, allV4Data); 
    setKpis(calculatedKpis);
    
    const trendData = prepareTrendData_V4(allV4Data, selectedTrendMetric, selectedPeriodKey, analysisMode); 
    setTrendChartData(trendData);

    const bubbleData = prepareBubbleChartData_V4(data); 
    setBubbleChartData(bubbleData);

    const rankData = prepareBarRankData_V4(data, selectedRankingMetric); 
    setBarRankData(rankData);

  }, [analysisMode, selectedPeriodKey, allV4Data, selectedTrendMetric, selectedRankingMetric]);


  // Placeholder functions until data-utils.ts is refactored for V4
  // These functions will eventually be replaced by robust implementations in data-utils.ts
  const processDataForRange_V4 = (currentPeriod: V4PeriodData, mode: AnalysisMode, allData: V4PeriodData[]): ProcessedDataForPeriod[] => {
    console.warn("processDataForRange_V4 in page.tsx is a placeholder and needs full V4 implementation in data-utils.ts.");
    return currentPeriod.business_data.map(bd => ({
      businessLineId: bd.business_type,
      businessLineName: bd.business_type,
      premium_written: bd.premium_written || 0,
      premium_earned: bd.premium_earned || 0,
      total_loss_amount: bd.total_loss_amount || 0,
      expense_amount_raw: bd.expense_amount_raw || 0,
      policy_count: bd.avg_premium_per_policy && bd.avg_premium_per_policy !== 0 && bd.premium_written ? (bd.premium_written * 10000) / bd.avg_premium_per_policy : 0,
      claim_count: bd.claim_count || 0,
      policy_count_earned: bd.policy_count_earned || 0,
      loss_ratio: bd.loss_ratio || 0,
      expense_ratio: bd.expense_ratio || 0,
      variable_cost_ratio: bd.variable_cost_ratio || 0,
      avg_premium_per_policy: bd.avg_premium_per_policy,
      sum_premium_written_for_ratio_calc: bd.premium_written || 0,
      sum_premium_earned_for_ratio_calc: bd.premium_earned || 0,
      sum_total_loss_amount_for_ratio_calc: bd.total_loss_amount || 0,
      sum_expense_amount_raw_for_ratio_calc: bd.expense_amount_raw || 0,
      sum_claim_count_for_ratio_calc: bd.claim_count || 0,
      sum_policy_count_earned_for_ratio_calc: bd.policy_count_earned || 0,
    }));
  };

  const calculateKpis_V4 = (processedV4Data: ProcessedDataForPeriod[], mode: AnalysisMode, currentPeriod: V4PeriodData, allData: V4PeriodData[]): Kpi[] => {
    console.warn("calculateKpis_V4 in page.tsx is a placeholder and needs full V4 implementation in data-utils.ts.");
    return calculateKpis(processedV4Data, mode); // Still using old calculateKpis for now
  };
  
  const prepareTrendData_V4 = (allData: V4PeriodData[], metricKey: TrendMetricKey, currentPeriodId: string, mode: AnalysisMode): ChartDataItem[] => {
    console.warn("prepareTrendData_V4 in page.tsx is a placeholder and needs full V4 implementation in data-utils.ts.");
    return []; 
  };

  const prepareBubbleChartData_V4 = (processedV4Data: ProcessedDataForPeriod[]): BubbleChartDataItem[] => {
     console.warn("prepareBubbleChartData_V4 in page.tsx is a placeholder and needs full V4 implementation in data-utils.ts.");
    return prepareBubbleChartData(processedV4Data); // Still using old for now
  }
  
  const prepareBarRankData_V4 = (processedV4Data: ProcessedDataForPeriod[], metricKey: RankingMetricKey): ChartDataItem[] => {
    console.warn("prepareBarRankData_V4 in page.tsx is a placeholder and needs full V4 implementation in data-utils.ts.");
    return prepareBarRankData(processedV4Data, metricKey); // Still using old for now
  }


  const handleAiSummary = async () => {
    setIsAiSummaryLoading(true);
    setAiSummary(null);
    const currentPeriodLabel = periodOptions.find(p => p.value === selectedPeriodKey)?.label || selectedPeriodKey;
    try {
       const aiInputData = {
        keyPerformanceIndicators: kpis.map(kpi => ({ title: kpi.title, value: kpi.value, change: kpi.change, yoyChange: kpi.yoyChange, isRisk: kpi.isRisk })),
        topBusinessLinesByPremiumWritten: processedData 
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
