
import type { Kpi, PeriodOption, V4PeriodData } from '@/data/types';
import { KpiCard } from '@/components/shared/kpi-card';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { LayoutDashboard } from 'lucide-react';

interface KpiDashboardSectionProps {
  kpis: Kpi[];
  selectedPeriodKey: string;
  selectedComparisonPeriodKey: string | null;
  periodOptions: PeriodOption[];
  allV4Data: V4PeriodData[]; // To get comparison_period_id_mom if needed
}

const findKpi = (kpis: Kpi[], id: string, title?: string): Kpi | undefined => {
  let found = kpis.find(kpi => kpi.id === id);
  if (!found && title) {
    found = kpis.find(kpi => kpi.title === title);
  }
  return found;
};

const KPI_LAYOUT_CONFIG: { column: number; id: string; title: string }[] = [
  { column: 1, id: 'marginal_contribution_ratio', title: '边际贡献率' },
  { column: 1, id: 'variable_cost_ratio', title: '变动成本率' },
  { column: 1, id: 'expense_ratio', title: '费用率' },
  { column: 1, id: 'loss_ratio', title: '满期赔付率' },
  { column: 2, id: 'marginal_contribution_amount', title: '边贡额' },
  { column: 2, id: 'premium_written', title: '保费' },
  { column: 2, id: 'expense_amount', title: '费用' },
  { column: 2, id: 'total_loss_amount', title: '赔款' },
  { column: 3, id: 'premium_earned', title: '满期保费' },
  { column: 3, id: 'premium_earned_ratio', title: '保费满期率' },
  { column: 3, id: 'avg_premium_per_policy', title: '单均保费' },
  { column: 3, id: 'policy_count', title: '保单件数' },
  { column: 4, id: 'premium_share', title: '保费占比' },
  { column: 4, id: 'claim_frequency', title: '满期出险率' },
  { column: 4, id: 'avg_loss_per_case', title: '案均赔款' },
  { column: 4, id: 'claim_count', title: '已报件数' },
];


export function KpiDashboardSection({ 
  kpis, 
  selectedPeriodKey, 
  selectedComparisonPeriodKey, 
  periodOptions,
  allV4Data 
}: KpiDashboardSectionProps) {
  if (!kpis || kpis.length === 0) {
    return (
      <SectionWrapper title="KPI 看板" icon={LayoutDashboard}>
        <p className="text-muted-foreground">暂无KPI数据或正在加载...</p>
      </SectionWrapper>
    );
  }

  const renderColumn = (columnNumber: number) => {
    return KPI_LAYOUT_CONFIG.filter(item => item.column === columnNumber)
      .map(configItem => {
        const kpi = findKpi(kpis, configItem.id, configItem.title);
        if (kpi) {
          return <KpiCard key={kpi.id} kpi={kpi} />;
        }
        if (configItem.id === 'avg_commercial_index') return null;
        return <div key={configItem.id} className="p-4 border rounded-lg shadow-sm bg-card text-card-foreground min-h-[170px]">KPI: {configItem.title} (数据待处理)</div>;
      });
  };

  let currentPeriodLabel = periodOptions.find(p => p.value === selectedPeriodKey)?.label || selectedPeriodKey;
  let comparisonPeriodText = "无对比期";

  let actualComparisonPeriodId = selectedComparisonPeriodKey;
  if (!actualComparisonPeriodId) {
      const currentPeriodEntry = allV4Data.find(p => p.period_id === selectedPeriodKey);
      actualComparisonPeriodId = currentPeriodEntry?.comparison_period_id_mom || null;
  }

  if (actualComparisonPeriodId) {
      const comparisonLabel = periodOptions.find(p => p.value === actualComparisonPeriodId)?.label;
      if (comparisonLabel) {
          comparisonPeriodText = `对比 ${comparisonLabel}`;
      } else if (selectedComparisonPeriodKey){ // A specific key was selected but not found (should not happen)
          comparisonPeriodText = "对比所选周期 (标签未知)";
      } else { // Defaulting to MoM but label not found (should not happen)
          comparisonPeriodText = "对比上一期 (标签未知)";
      }
  } else if (selectedComparisonPeriodKey === null) { // Explicitly no comparison selected, or no default MoM
     const currentPeriodEntry = allV4Data.find(p => p.period_id === selectedPeriodKey);
     if (currentPeriodEntry && currentPeriodEntry.comparison_period_id_mom){
         const defaultMomLabel = periodOptions.find(p => p.value === currentPeriodEntry.comparison_period_id_mom)?.label;
         comparisonPeriodText = defaultMomLabel ? `对比 ${defaultMomLabel}` : "对比上一期";
     } else {
         comparisonPeriodText = "无默认对比期";
     }
  }


  return (
    <SectionWrapper title="KPI 看板" icon={LayoutDashboard}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">{renderColumn(1)}</div>
        <div className="space-y-4">{renderColumn(2)}</div>
        <div className="space-y-4">{renderColumn(3)}</div>
        <div className="space-y-4">{renderColumn(4)}</div>
      </div>
      {currentPeriodLabel && (
        <div className="mt-4 pt-3 border-t text-sm text-muted-foreground text-center">
          当前数据周期：<span className="font-semibold text-foreground">{currentPeriodLabel}</span>
          {comparisonPeriodText !== "无对比期" && comparisonPeriodText !== "无默认对比期" && (
            <>
              <span className="mx-2">|</span>
              <span className="font-semibold text-foreground">{comparisonPeriodText}</span>
            </>
          )}
        </div>
      )}
    </SectionWrapper>
  );
}
