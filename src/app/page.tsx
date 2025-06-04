"use client";

import { useState, useEffect, useMemo } from 'react';
import type { AnalysisMode, BusinessLine, Kpi, ChartDataItem, BubbleChartDataItem, ProcessedDataForPeriod, AiSummaryInput } from '@/data/types';
import { mockBusinessLines, getDefaultDateRange, defaultDateRangeOptions } from '@/data/mock-data';
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
  getDateRangeByValue,
} from '@/lib/data-utils';

type RankingMetricKey = keyof Pick<ProcessedDataForPeriod, 'premium' | 'claims' | 'policies' | 'lossRatio'>;
type TrendMetricKey = keyof BusinessLine['data'];

const availableTrendMetrics: { value: TrendMetricKey, label: string }[] = [
  { value: 'premium', label: '保费' },
  { value: 'claims', label: '赔付额' },
  { value: 'policies', label: '保单数' },
  { value: 'lossRatio', label: '赔付率' },
];

const availableRankingMetrics: { value: RankingMetricKey, label: string }[] = [
  { value: 'premium', label: '保费' },
  { value: 'claims', label: '赔付额' },
  { value: 'policies', label: '保单数' },
  { value: 'lossRatio', label: '赔付率' },
];


export default function DashboardPage() {
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('cumulative');
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>(defaultDateRangeOptions[0].value);

  const [processedData, setProcessedData] = useState<ProcessedDataForPeriod[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  
  const [selectedTrendMetric, setSelectedTrendMetric] = useState<TrendMetricKey>('premium');
  const [trendChartData, setTrendChartData] = useState<ChartDataItem[]>([]);
  
  const [bubbleChartData, setBubbleChartData] = useState<BubbleChartDataItem[]>([]);
  
  const [selectedRankingMetric, setSelectedRankingMetric] = useState<RankingMetricKey>('premium');
  const [barRankData, setBarRankData] = useState<ChartDataItem[]>([]);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const newRange = getDateRangeByValue(selectedPeriodKey);
    setDateRange(newRange);
  }, [selectedPeriodKey]);

  useEffect(() => {
    const data = processDataForRange(mockBusinessLines, analysisMode, dateRange.from, dateRange.to);
    setProcessedData(data);
    setKpis(calculateKpis(data, analysisMode));
    
    const trendData = prepareTrendData(mockBusinessLines, selectedTrendMetric, dateRange.from, dateRange.to);
    setTrendChartData(trendData);

    setBubbleChartData(prepareBubbleChartData(data));

    const rankData = prepareBarRankData(data, selectedRankingMetric);
    setBarRankData(rankData);

  }, [analysisMode, dateRange, selectedTrendMetric, selectedRankingMetric]);


  const handleAiSummary = async () => {
    setIsAiSummaryLoading(true);
    setAiSummary(null);
    try {
      // Prepare data for AI. Using KPIs and top 3 business lines by premium as an example.
      const aiInputData = {
        keyPerformanceIndicators: kpis,
        topBusinessLines: processedData.sort((a,b) => b.premium - a.premium).slice(0,3).map(d => ({
          name: d.businessLineName,
          premium: d.premium,
          lossRatio: d.lossRatio,
          changeInPremium: analysisMode === 'periodOverPeriod' ? d.premiumChange : 'N/A'
        })),
      };
      const filters = {
        analysisMode,
        period: `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`,
      };
      
      const input: AiSummaryInput = {
        data: JSON.stringify(aiInputData, null, 2),
        filters: JSON.stringify(filters, null, 2),
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
