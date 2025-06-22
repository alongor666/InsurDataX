
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { AppLayout } from '@/components/layout/app-layout';
import { AppHeader } from '@/components/layout/header';
import { KpiDashboardSection } from '@/components/sections/kpi-dashboard-section';
import { TrendAnalysisSection } from '@/components/sections/trend-analysis-section';
import { BubbleChartSection } from '@/components/sections/bubble-chart-section';
import { BarChartRankingSection } from '@/components/sections/bar-chart-ranking-section';
import { ShareChartSection } from '@/components/sections/share-chart-section';
import { ParetoChartSection } from '@/components/sections/pareto-chart-section';
import { DataTableSection } from '@/components/sections/data-table-section';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, type FirestoreError } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  type V4PeriodData,
  type Kpi,
  type ProcessedDataForPeriod,
  type PeriodOption,
  type AnalysisMode,
  type DashboardView,
  type TrendMetricKey,
  type RankingMetricKey,
  type BubbleMetricKey,
  type ShareChartMetricKey,
  type ParetoChartMetricKey,
  type ChartDataItem,
  type BubbleChartDataItem,
  type ShareChartDataItem,
  type ParetoChartDataItem
} from '@/data/types';
import {
  processDataForSelectedPeriod,
  calculateKpis,
  getDisplayBusinessTypeName,
  exportToCSV,
  getDynamicColorByVCR,
} from '@/lib/data-utils';

const availableTrendMetrics: { value: TrendMetricKey, label: string }[] = [
    { value: 'premium_written', label: '跟单保费 (万元)' },
    { value: 'loss_ratio', label: '满期赔付率 (%)' },
    { value: 'expense_ratio', label: '费用率 (%)' },
    { value: 'variable_cost_ratio', label: '变动成本率 (%)' },
    { value: 'total_loss_amount', label: '总赔款 (万元)' },
    { value: 'policy_count', label: '保单数量 (件)' },
];

const availableRankingMetrics: { value: RankingMetricKey, label: string }[] = [
    { value: 'premium_written', label: '跟单保费 (万元)' },
    { value: 'total_loss_amount', label: '总赔款 (万元)' },
    { value: 'policy_count', label: '保单数量 (件)' },
    { value: 'loss_ratio', label: '满期赔付率 (%)' },
    { value: 'expense_ratio', label: '费用率 (%)' },
    { value: 'variable_cost_ratio', label: '变动成本率 (%)' },
    { value: 'avg_premium_per_policy', label: '单均保费 (元)'},
    { value: 'avg_loss_per_case', label: '案均赔款 (元)'},
    { value: 'marginal_contribution_amount', label: '边贡额 (万元)'},
    { value: 'marginal_contribution_ratio', label: '边际贡献率 (%)'}
];

const availableBubbleMetrics: { value: BubbleMetricKey, label: string }[] = availableRankingMetrics;
const availableShareMetrics: { value: ShareChartMetricKey, label: string }[] = availableRankingMetrics.filter(m => ['premium_written', 'premium_earned', 'total_loss_amount', 'expense_amount', 'policy_count', 'claim_count', 'policy_count_earned', 'marginal_contribution_amount'].includes(m.value)) as { value: ShareChartMetricKey, label: string }[];
const availableParetoMetrics: { value: ParetoChartMetricKey, label: string }[] = availableShareMetrics;

export default function DashboardPage() {
    const { currentUser } = useAuth();
    const { toast } = useToast();

    const [isGlobalLoading, setIsGlobalLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [allV4Data, setAllV4Data] = useState<V4PeriodData[]>([]);
    const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([]);
    const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('');
    const [selectedComparisonPeriodKey, setSelectedComparisonPeriodKey] = useState<string | null>(null);
    const [allBusinessTypes, setAllBusinessTypes] = useState<string[]>([]);
    const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>([]);
    const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('cumulative');
    const [activeView, setActiveView] = useState<DashboardView>('kpi');

    const [selectedTrendMetric, setSelectedTrendMetric] = useState<TrendMetricKey>('premium_written');
    const [selectedRankingMetric, setSelectedRankingMetric] = useState<RankingMetricKey>('premium_written');
    const [selectedBubbleXMetric, setSelectedBubbleXMetric] = useState<BubbleMetricKey>('premium_written');
    const [selectedBubbleYMetric, setSelectedBubbleYMetric] = useState<BubbleMetricKey>('loss_ratio');
    const [selectedBubbleSizeMetric, setSelectedBubbleSizeMetric] = useState<BubbleMetricKey>('policy_count');
    const [selectedShareMetric, setSelectedShareMetric] = useState<ShareChartMetricKey>('premium_written');
    const [selectedParetoMetric, setSelectedParetoMetric] = useState<ParetoChartMetricKey>('premium_written');
    
    const fetchData = useCallback(async () => {
        if (!db) {
            const msg = "Firestore 服务尚未在firebase.ts中正确初始化。";
            setError(msg);
            toast({ variant: "destructive", title: "代码配置错误", description: msg });
            setIsGlobalLoading(false);
            return;
        }
        setIsGlobalLoading(true);
        setError(null);
        try {
            toast({ title: "正在加载数据...", description: "正从安全的云端数据库请求数据。" });
            
            const dataCollection = collection(db, "v4_period_data");
            const querySnapshot = await getDocs(dataCollection);
            
            if (querySnapshot.empty) {
                throw new Error("从数据库加载的数据为空。请确认 `v4_period_data` 集合中存在数据文档。");
            }
            
            const rawData = querySnapshot.docs.map(doc => doc.data() as V4PeriodData);

            toast({ title: "数据加载成功", description: `已成功获取 ${rawData.length} 个周期的数据。` });
            setAllV4Data(rawData);
            
            const options = rawData
                .map(p => ({ value: p.period_id, label: p.period_label }))
                .sort((a, b) => b.label.localeCompare(a.label));
            setPeriodOptions(options);

            if (options.length > 0) {
                setSelectedPeriodKey(options[0].value);
            }

            const uniqueTypes = Array.from(new Set(rawData.flatMap(p => p.business_data.map(bd => bd.business_type))
                .filter(bt => bt && bt.toLowerCase() !== '合计' && bt.toLowerCase() !== 'total')))
                .sort((a, b) => a.localeCompare(b));
            setAllBusinessTypes(uniqueTypes);
            setSelectedBusinessTypes([]); // Reset selected types on new data load

        } catch (e) {
            const err = e as FirestoreError;
            console.error("Error fetching from Firestore:", err);
            let userFriendlyMessage = `加载数据时发生错误: ${err.message}`;
            if (err.code === 'permission-denied') {
                userFriendlyMessage = "数据加载失败：权限不足。请确认您已登录，且Firestore安全规则配置正确，允许已认证用户读取。";
            }
            setError(userFriendlyMessage);
            setAllV4Data([]);
        } finally {
            setIsGlobalLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        if (currentUser) {
            fetchData();
        }
    }, [currentUser, fetchData]);

    const handleSelectedBusinessTypesChange = useCallback((types: string[]) => {
        setSelectedBusinessTypes(types);
    }, []);

    const processedDataForKpis = useMemo(() => {
        if (!selectedPeriodKey || allV4Data.length === 0) return [];
        return processDataForSelectedPeriod(allV4Data, selectedPeriodKey, selectedComparisonPeriodKey, analysisMode, selectedBusinessTypes);
    }, [allV4Data, selectedPeriodKey, selectedComparisonPeriodKey, analysisMode, selectedBusinessTypes]);

    const kpis = useMemo((): Kpi[] => {
        if (processedDataForKpis.length === 0) return [];
        const currentPeriodData = allV4Data.find(p => p.period_id === selectedPeriodKey);
        return calculateKpis(processedDataForKpis, currentPeriodData?.totals_for_period, analysisMode, selectedBusinessTypes, allV4Data, selectedPeriodKey);
    }, [processedDataForKpis, allV4Data, selectedPeriodKey, analysisMode, selectedBusinessTypes]);

    const trendData = useMemo(() => {
        if (allV4Data.length === 0) return [];
    
        const relevantPeriods = allV4Data.slice().sort((a, b) => a.period_label.localeCompare(b.period_label));
    
        const mappedData = relevantPeriods.map(period => {
            const processed = processDataForSelectedPeriod(allV4Data, period.period_id, null, analysisMode, selectedBusinessTypes);
            if (!processed || processed.length === 0) return null; // Handle case where no data is processed
    
            const metrics = processed[0].currentMetrics;
            const businessLineName = processed[0].businessLineName;
    
            const metricValue = metrics[selectedTrendMetric as keyof typeof metrics];
    
            // Ensure a valid structure is returned
            return {
                name: period.period_id,
                [businessLineName]: metricValue === null ? undefined : metricValue, // Map null to undefined for recharts
                color: getDynamicColorByVCR(metrics.variable_cost_ratio),
                vcr: metrics.variable_cost_ratio,
            };
        });
    
        return mappedData.filter((p): p is ChartDataItem => p !== null && p[Object.keys(p)[1]] !== undefined);
    }, [allV4Data, analysisMode, selectedBusinessTypes, selectedTrendMetric]);

    const allIndividualBusinessLines = useMemo(() => {
        if (!selectedPeriodKey || allV4Data.length === 0) return [];
        const currentPeriodData = allV4Data.find(p => p.period_id === selectedPeriodKey);
        if (!currentPeriodData) return [];

        return currentPeriodData.business_data
            .filter(bd => bd.business_type.toLowerCase() !== '合计' && bd.business_type.toLowerCase() !== 'total')
            .map(bd => bd.business_type);
    }, [allV4Data, selectedPeriodKey]);

    const individualLinesData = useMemo((): ProcessedDataForPeriod[] => {
        if (!selectedPeriodKey || allV4Data.length === 0 || allIndividualBusinessLines.length === 0) return [];
      
        return allIndividualBusinessLines.map(line => {
            const dataForLine = processDataForSelectedPeriod(allV4Data, selectedPeriodKey, selectedComparisonPeriodKey, analysisMode, [line]);
            return dataForLine.length > 0 ? dataForLine[0] : null;
        }).filter((item): item is ProcessedDataForPeriod => item !== null);
    }, [allV4Data, selectedPeriodKey, selectedComparisonPeriodKey, analysisMode, allIndividualBusinessLines]);

    const barRankingData = useMemo((): ChartDataItem[] => {
        return individualLinesData
            .map(d => ({
                name: getDisplayBusinessTypeName(d.businessLineName),
                [selectedRankingMetric]: d.currentMetrics[selectedRankingMetric] ?? 0,
                color: getDynamicColorByVCR(d.currentMetrics.variable_cost_ratio),
                vcr: d.currentMetrics.variable_cost_ratio,
            }))
            .sort((a, b) => (b[selectedRankingMetric] as number) - (a[selectedRankingMetric] as number));
    }, [individualLinesData, selectedRankingMetric]);
    
    const bubbleData = useMemo((): BubbleChartDataItem[] => {
      return individualLinesData.map(d => ({
          id: d.businessLineId,
          name: getDisplayBusinessTypeName(d.businessLineName),
          x: d.currentMetrics[selectedBubbleXMetric] ?? 0,
          y: d.currentMetrics[selectedBubbleYMetric] ?? 0,
          z: d.currentMetrics[selectedBubbleSizeMetric] ?? 0,
          color: getDynamicColorByVCR(d.currentMetrics.variable_cost_ratio),
          vcr: d.currentMetrics.variable_cost_ratio,
      }));
    }, [individualLinesData, selectedBubbleXMetric, selectedBubbleYMetric, selectedBubbleSizeMetric]);

    const shareData = useMemo((): ShareChartDataItem[] => {
        const totalValue = individualLinesData.reduce((sum, d) => sum + (d.currentMetrics[selectedShareMetric] ?? 0), 0);
        if (totalValue === 0) return [];
        return individualLinesData
            .map(d => ({
                name: getDisplayBusinessTypeName(d.businessLineName),
                value: d.currentMetrics[selectedShareMetric] ?? 0,
                percentage: ((d.currentMetrics[selectedShareMetric] ?? 0) / totalValue) * 100,
                color: getDynamicColorByVCR(d.currentMetrics.variable_cost_ratio),
                vcr: d.currentMetrics.variable_cost_ratio,
            }))
            .filter(d => d.value > 0)
            .sort((a,b) => b.value - a.value);
    }, [individualLinesData, selectedShareMetric]);

    const paretoData = useMemo((): ParetoChartDataItem[] => {
        const sortedData = individualLinesData
            .map(d => ({ ...d, value: d.currentMetrics[selectedParetoMetric] ?? 0 }))
            .filter(d => d.value > 0)
            .sort((a, b) => b.value - a.value);

        const totalValue = sortedData.reduce((sum, d) => sum + d.value, 0);
        if (totalValue === 0) return [];
        
        let cumulativeValue = 0;
        return sortedData.map(d => {
            cumulativeValue += d.value;
            return {
                name: getDisplayBusinessTypeName(d.businessLineName),
                value: d.value,
                cumulativePercentage: (cumulativeValue / totalValue) * 100,
                color: getDynamicColorByVCR(d.currentMetrics.variable_cost_ratio),
                vcr: d.currentMetrics.variable_cost_ratio,
            };
        });
    }, [individualLinesData, selectedParetoMetric]);

    const handleExportClick = useCallback(() => {
        if (individualLinesData.length > 0) {
            exportToCSV(individualLinesData, analysisMode, allV4Data, "车险数据导出.csv", selectedComparisonPeriodKey, periodOptions, selectedPeriodKey);
        } else {
            toast({ variant: "destructive", title: "导出失败", description: "没有可供导出的数据。" });
        }
    }, [individualLinesData, analysisMode, allV4Data, selectedComparisonPeriodKey, periodOptions, selectedPeriodKey, toast]);

    const renderCurrentView = () => {
        if (error) {
            return (
                <Alert variant="destructive" className="max-w-4xl mx-auto">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>错误：无法加载仪表盘数据</AlertTitle>
                    <AlertDescription>
                        <p>加载核心业务数据时发生严重错误。请检查以下几点：</p>
                        <ul className="list-disc pl-5 mt-2 text-xs">
                            <li>您的网络连接是否正常？</li>
                            <li>您是否已登录并有权访问此数据？</li>
                            <li>后端数据库(Firestore)可能遇到问题或安全规则阻止了访问。</li>
                        </ul>
                        <p className="mt-4 font-mono bg-muted p-2 rounded text-xs">{error}</p>
                    </AlertDescription>
                </Alert>
            );
        }
    
        if (isGlobalLoading) {
            return (
                 <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                </div>
            );
        }

        switch (activeView) {
            case 'kpi':
                return <KpiDashboardSection kpis={kpis} selectedPeriodKey={selectedPeriodKey} selectedComparisonPeriodKey={selectedComparisonPeriodKey} periodOptions={periodOptions} allV4Data={allV4Data} />;
            case 'trend':
                return <TrendAnalysisSection data={trendData} selectedMetric={selectedTrendMetric} onMetricChange={setSelectedTrendMetric} availableMetrics={availableTrendMetrics} analysisMode={analysisMode} />;
            case 'bubble':
                return <BubbleChartSection data={bubbleData} availableMetrics={availableBubbleMetrics} selectedXAxisMetric={selectedBubbleXMetric} onXAxisMetricChange={setSelectedBubbleXMetric} selectedYAxisMetric={selectedBubbleYMetric} onYAxisMetricChange={setSelectedBubbleYMetric} selectedSizeMetric={selectedBubbleSizeMetric} onSizeMetricChange={setSelectedBubbleSizeMetric} />;
            case 'bar_rank':
                return <BarChartRankingSection data={barRankingData} availableMetrics={availableRankingMetrics} selectedMetric={selectedRankingMetric} onMetricChange={setSelectedRankingMetric} />;
            case 'share_chart':
                return <ShareChartSection data={shareData} availableMetrics={availableShareMetrics} selectedMetric={selectedShareMetric} onMetricChange={setSelectedShareMetric} />;
            case 'pareto':
                return <ParetoChartSection data={paretoData} availableMetrics={availableParetoMetrics} selectedMetric={selectedParetoMetric} onMetricChange={setSelectedParetoMetric} />;
            case 'data_table':
                 return <DataTableSection data={individualLinesData} analysisMode={analysisMode} allV4Data={allV4Data} selectedComparisonPeriodKey={selectedComparisonPeriodKey} periodOptions={periodOptions} activePeriodId={selectedPeriodKey} />;
            default:
                return <KpiDashboardSection kpis={kpis} selectedPeriodKey={selectedPeriodKey} selectedComparisonPeriodKey={selectedComparisonPeriodKey} periodOptions={periodOptions} allV4Data={allV4Data} />;
        }
    };
    
    if (isGlobalLoading && !currentUser) { // Still waiting for auth state
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 text-center">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <AppLayout>
            <AppHeader
                analysisMode={analysisMode}
                onAnalysisModeChange={setAnalysisMode}
                selectedPeriod={selectedPeriodKey}
                onPeriodChange={setSelectedPeriodKey}
                selectedComparisonPeriod={selectedComparisonPeriodKey}
                onComparisonPeriodChange={setSelectedComparisonPeriodKey}
                periodOptions={periodOptions}
                activeView={activeView}
                onViewChange={setActiveView}
                allBusinessTypes={allBusinessTypes}
                selectedBusinessTypes={selectedBusinessTypes}
                onSelectedBusinessTypesChange={handleSelectedBusinessTypesChange}
                onExportClick={handleExportClick}
            />
          <div className="space-y-6">
            {renderCurrentView()}
          </div>
        </AppLayout>
    );
}
