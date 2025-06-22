
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
import { AiChatSection } from '@/components/sections/ai-chat-section';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from 'lucide-react';
import { getFirebaseInstances } from '@/lib/firebase';
import { collection, onSnapshot, type FirestoreError } from "firebase/firestore";
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
  type ParetoChartDataItem,
  type TopBusinessLineData,
  type AiChatDataContext
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
    const { db } = getFirebaseInstances();

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

    useEffect(() => {
        if (!currentUser) {
            return;
        }

        if (!db) {
            const msg = "Firestore 服务尚未在firebase.ts中正确初始化。";
            setError(msg);
            toast({ variant: "destructive", title: "代码配置错误", description: msg });
            setIsGlobalLoading(false);
            return;
        }

        setIsGlobalLoading(true);
        setError(null);
        toast({ title: "正在初始化...", description: "正在连接数据库并设置实时数据监听。" });

        let isInitialToastShown = false;
        const dataCollection = collection(db, "v4_period_data");
        
        const unsubscribe = onSnapshot(dataCollection, (querySnapshot) => {
            if (querySnapshot.empty) {
                setError("数据库中无数据。请确认 `v4_period_data` 集合中存在数据文档。");
                setAllV4Data([]);
                setIsGlobalLoading(false);
                return;
            }
            
            const rawData = querySnapshot.docs.map(doc => doc.data() as V4PeriodData);

            if (!isInitialToastShown) {
                 toast({ title: "连接成功", description: `已获取 ${rawData.length} 个周期的数据，并已开启实时更新。` });
                 isInitialToastShown = true;
            }

            setAllV4Data(rawData);
            
            const options = rawData
                .map(p => ({ value: p.period_id, label: p.period_label }))
                .sort((a, b) => b.label.localeCompare(a.label));
            setPeriodOptions(options);

            setSelectedPeriodKey(prevKey => {
                if (options.length > 0 && (!prevKey || !options.some(o => o.value === prevKey))) {
                    return options[0].value;
                }
                return prevKey;
            });

            const uniqueTypes = Array.from(new Set(rawData.flatMap(p => p.business_data.map(bd => bd.business_type))
                .filter(bt => bt && bt.toLowerCase() !== '合计' && bt.toLowerCase() !== 'total')))
                .sort((a, b) => a.localeCompare(b));
            setAllBusinessTypes(uniqueTypes);
            
            setSelectedBusinessTypes(prev => prev.filter(t => uniqueTypes.includes(t)));
            
            setIsGlobalLoading(false);
            setError(null);

        }, (err) => {
            const firestoreError = err as FirestoreError;
            console.error("Error listening to Firestore:", firestoreError);
            let userFriendlyMessage = `监听数据时发生错误: ${firestoreError.message}`;
            if (firestoreError.code === 'permission-denied') {
                userFriendlyMessage = "数据监听失败：权限不足。请确认您已登录，且Firestore安全规则配置正确。";
            }
            setError(userFriendlyMessage);
            setAllV4Data([]);
            setIsGlobalLoading(false);
        });

        return () => {
            unsubscribe();
        };

    }, [currentUser, toast, db]);
    
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

    const trendData = useMemo((): ChartDataItem[] => {
        if (allV4Data.length === 0) return [];
    
        const relevantPeriods = allV4Data.slice().sort((a, b) => a.period_label.localeCompare(b.period_label));
    
        const mappedData = relevantPeriods.map(period => {
            const processed = processDataForSelectedPeriod(allV4Data, period.period_id, null, analysisMode, selectedBusinessTypes);
            if (!processed || processed.length === 0) return null;
    
            const metrics = processed[0].currentMetrics;
            const businessLineName = processed[0].businessLineName || '合计';
    
            const metricValue = metrics[selectedTrendMetric as keyof typeof metrics];
    
            return {
                name: period.period_label,
                [businessLineName]: metricValue === null ? undefined : metricValue,
                color: getDynamicColorByVCR(metrics.variable_cost_ratio),
                vcr: metrics.variable_cost_ratio,
            };
        }).filter((p): p is ChartDataItem => p !== null);
    
        if (analysisMode === 'periodOverPeriod' && mappedData.length > 0) {
            return mappedData.slice(1);
        }

        return mappedData;
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

    const topBusinessLinesData = useMemo((): TopBusinessLineData[] => {
        if (!individualLinesData || individualLinesData.length === 0) return [];
        return individualLinesData
            .sort((a, b) => (b.currentMetrics.premium_written ?? 0) - (a.currentMetrics.premium_written ?? 0))
            .slice(0, 5) // Top 5 by premium written
            .map(d => ({
                name: d.businessLineName,
                premium_written: d.currentMetrics.premium_written ?? 0,
                loss_ratio: d.currentMetrics.loss_ratio ?? 0,
                expense_ratio: d.currentMetrics.expense_ratio ?? 0,
                variable_cost_ratio: d.currentMetrics.variable_cost_ratio ?? 0,
                color: getDynamicColorByVCR(d.currentMetrics.variable_cost_ratio),
            }));
    }, [individualLinesData]);

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

    const aiFiltersForCharts = useMemo(() => {
      return {
        selectedBusinessTypes: selectedBusinessTypes.length > 0 ? selectedBusinessTypes.join(', ') : '全部',
        vcrColorRules: "变动成本率 < 88% 为 '经营优秀/低风险', 88%-92% 为 '健康/中等风险', >= 92% 为 '警告/高风险'",
      };
    }, [selectedBusinessTypes]);

    const aiChatDataContext = useMemo((): AiChatDataContext | null => {
        if (!kpis.length || !individualLinesData.length) return null;
        return {
            kpis,
            data_table: individualLinesData,
            analysisMode,
            currentPeriodLabel: periodOptions.find(p => p.value === selectedPeriodKey)?.label || '未知周期',
            selectedBusinessTypes,
        };
    }, [kpis, individualLinesData, analysisMode, selectedPeriodKey, periodOptions, selectedBusinessTypes]);

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
        
        const currentPeriodLabel = periodOptions.find(p => p.value === selectedPeriodKey)?.label || '未知周期';

        switch (activeView) {
            case 'kpi':
                return <KpiDashboardSection
                    kpis={kpis}
                    selectedPeriodKey={selectedPeriodKey}
                    selectedComparisonPeriodKey={selectedComparisonPeriodKey}
                    periodOptions={periodOptions}
                    allV4Data={allV4Data}
                    analysisMode={analysisMode}
                    selectedBusinessTypes={selectedBusinessTypes}
                    topBusinessLinesData={topBusinessLinesData}
                />;
            case 'ai_chat':
                return <AiChatSection dataContext={aiChatDataContext} />;
            case 'trend':
                return <TrendAnalysisSection data={trendData} selectedMetric={selectedTrendMetric} onMetricChange={setSelectedTrendMetric} availableMetrics={availableTrendMetrics} analysisMode={analysisMode} currentPeriodLabel={currentPeriodLabel} filters={aiFiltersForCharts} />;
            case 'bubble':
                return <BubbleChartSection data={bubbleData} availableMetrics={availableBubbleMetrics} selectedXAxisMetric={selectedBubbleXMetric} onXAxisMetricChange={setSelectedBubbleXMetric} selectedYAxisMetric={selectedBubbleYMetric} onYAxisMetricChange={setSelectedBubbleYMetric} selectedSizeMetric={selectedBubbleSizeMetric} onSizeMetricChange={setSelectedBubbleSizeMetric} analysisMode={analysisMode} currentPeriodLabel={currentPeriodLabel} filters={aiFiltersForCharts} />;
            case 'bar_rank':
                return <BarChartRankingSection data={barRankingData} availableMetrics={availableRankingMetrics} selectedMetric={selectedRankingMetric} onMetricChange={setSelectedRankingMetric} analysisMode={analysisMode} currentPeriodLabel={currentPeriodLabel} filters={aiFiltersForCharts} />;
            case 'share_chart':
                return <ShareChartSection data={shareData} availableMetrics={availableShareMetrics} selectedMetric={selectedShareMetric} onMetricChange={setSelectedShareMetric} analysisMode={analysisMode} currentPeriodLabel={currentPeriodLabel} filters={aiFiltersForCharts} />;
            case 'pareto':
                return <ParetoChartSection data={paretoData} availableMetrics={availableParetoMetrics} selectedMetric={selectedParetoMetric} onMetricChange={setSelectedParetoMetric} analysisMode={analysisMode} currentPeriodLabel={currentPeriodLabel} filters={aiFiltersForCharts} />;
            case 'data_table':
                 return <DataTableSection data={individualLinesData} analysisMode={analysisMode} allV4Data={allV4Data} selectedComparisonPeriodKey={selectedComparisonPeriodKey} periodOptions={periodOptions} activePeriodId={selectedPeriodKey} />;
            default:
                return <KpiDashboardSection
                    kpis={kpis}
                    selectedPeriodKey={selectedPeriodKey}
                    selectedComparisonPeriodKey={selectedComparisonPeriodKey}
                    periodOptions={periodOptions}
                    allV4Data={allV4Data}
                    analysisMode={analysisMode}
                    selectedBusinessTypes={selectedBusinessTypes}
                    topBusinessLinesData={topBusinessLinesData}
                />;
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
