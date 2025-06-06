
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { AnalysisMode, Kpi, ChartDataItem, BubbleChartDataItem, ProcessedDataForPeriod, V4PeriodData, PeriodOption, DashboardView, TrendMetricKey, RankingMetricKey, V4PeriodTotals, AiSummaryInput } from '@/data/types';

// import { getDefaultDateRange, defaultDateRangeOptions } from '@/data/mock-data'; // Removed
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
  processDataForSelectedPeriod,
  calculateKpis,
  // prepareTrendData, // This will be replaced by V4 specific logic
  // prepareBubbleChartData, // This will be replaced by V4 specific logic
  // prepareBarRankData, // This will be replaced by V4 specific logic
} from '@/lib/data-utils';


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
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('cumulative');
  const [activeView, setActiveView] = useState<DashboardView>('kpi');

  const [allV4Data, setAllV4Data] = useState<V4PeriodData[]>([]);
  const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('');
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>([]); // TODO: Implement business type filter UI

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
          .sort((a, b) => b.label.localeCompare(a.label)); // Sort by label, newest first
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
      selectedBusinessTypes // Pass selected business types, empty array means all/合计
    );
    setProcessedData(dataForCalculations);

    const calculatedKpis = calculateKpis(dataForCalculations, currentPeriod?.totals_for_period);
    setKpis(calculatedKpis);

    // Placeholder for chart data until fully implemented
    // const trendData = prepareTrendData_V4(allV4Data, selectedTrendMetric, selectedPeriodKey, analysisMode);
    // setTrendChartData(trendData);

    // const bubbleData = prepareBubbleChartData_V4(dataForCalculations);
    // setBubbleChartData(bubbleData);

    // const rankData = prepareBarRankData_V4(dataForCalculations, selectedRankingMetric);
    // setBarRankData(rankData);

  }, [analysisMode, selectedPeriodKey, allV4Data, selectedTrendMetric, selectedRankingMetric, selectedBusinessTypes]);


  // Placeholder functions until data-utils.ts is refactored for V4
  // These functions will eventually be replaced by robust implementations in data-utils.ts

  const prepareTrendData_V4 = (allData: V4PeriodData[], metricKey: TrendMetricKey, currentPeriodId: string, mode: AnalysisMode): ChartDataItem[] => {
    console.warn("prepareTrendData_V4 in page.tsx is a placeholder and needs full V4 implementation in data-utils.ts.");
    return [];
  };

  const prepareBubbleChartData_V4 = (processedV4Data: ProcessedDataForPeriod[]): BubbleChartDataItem[] => {
     console.warn("prepareBubbleChartData_V4 in page.tsx is a placeholder and needs full V4 implementation in data-utils.ts.");
    if (!processedV4Data || processedV4Data.length === 0 || !processedV4Data[0].currentMetrics) return [];
    // This mapping is illustrative. The actual bubble chart will likely need specific metrics for x,y,z
    return processedV4Data.filter(d => d.businessLineId !== '合计').map(d => ({
        id: d.businessLineId,
        name: d.businessLineName,
        x: d.currentMetrics.premium_written || 0,
        y: d.currentMetrics.loss_ratio || 0,
        z: d.currentMetrics.policy_count || 0,
    }));
  }

  const prepareBarRankData_V4 = (processedV4Data: ProcessedDataForPeriod[], metricKey: RankingMetricKey): ChartDataItem[] => {
    console.warn("prepareBarRankData_V4 in page.tsx is a placeholder and needs full V4 implementation in data-utils.ts.");
    if (!processedV4Data || processedV4Data.length === 0 || !processedV4Data[0].currentMetrics) return [];
    return [...processedV4Data]
        .filter(d => d.businessLineId !== '合计')
        .sort((a, b) => (b.currentMetrics?.[metricKey] as number || 0) - (a.currentMetrics?.[metricKey] as number || 0))
        .map(d => ({
        name: d.businessLineName,
        [metricKey]: d.currentMetrics?.[metricKey] as number || 0,
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
            change: kpi.change, // MoM %
            changeAbsolute: kpi.changeAbsolute, // MoM Abs
            yoyChange: kpi.yoyChange, // YoY %
            yoyChangeAbsolute: kpi.yoyChangeAbsolute, // YoY Abs
            isRisk: kpi.isRisk || kpi.isBorderRisk || kpi.isOrangeRisk
        })),
        topBusinessLinesByPremiumWritten: processedData
          .filter(d => d.businessLineId !== '合计') // Exclude "合计" for top business lines
          .sort((a, b) => (b.currentMetrics?.premium_written || 0) - (a.currentMetrics?.premium_written || 0))
          .slice(0, 3)
          .map(d => {
            let changeInPremiumWritten: string | number = 'N/A';
            // Calculate MoM absolute change for premium_written if in periodOverPeriod mode
            if (analysisMode === 'periodOverPeriod' && d.currentMetrics?.premium_written !== undefined && d.momMetrics?.premium_written !== undefined) {
              const momChangeAbs = d.currentMetrics.premium_written - d.momMetrics.premium_written;
              changeInPremiumWritten = `${momChangeAbs.toFixed(2)} 万元`;
            } else if (analysisMode === 'cumulative' && d.currentMetrics?.premium_written !== undefined && d.momMetrics?.premium_written !== undefined) {
              // For cumulative, it might be more about the MoM % change of the cumulative value
              const momChangePct = d.currentMetrics.premium_written && d.momMetrics.premium_written && d.momMetrics.premium_written !== 0 ?
                                   ((d.currentMetrics.premium_written - d.momMetrics.premium_written) / Math.abs(d.momMetrics.premium_written)) * 100 : 0;
              changeInPremiumWritten = `${momChangePct.toFixed(2)}%`;
            }


            return {
              name: d.businessLineName,
              premiumWritten: `${d.currentMetrics?.premium_written?.toFixed(2) || 'N/A'} 万元`,
              lossRatio: `${d.currentMetrics?.loss_ratio?.toFixed(2) || 'N/A'}%`,
              changeInPremiumWritten: changeInPremiumWritten,
            };
          }),
      };
      const filters = {
        analysisMode,
        period: currentPeriodLabel,
        selectedBusinessTypes: selectedBusinessTypes.length > 0 ? selectedBusinessTypes.join(', ') : '全部业务类型',
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

