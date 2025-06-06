
import type { Kpi } from '@/data/types';
import { KpiCard } from '@/components/shared/kpi-card';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { LayoutDashboard } from 'lucide-react';

interface KpiDashboardSectionProps {
  kpis: Kpi[];
}

// Helper function to find a KPI by its ID or title from the list
const findKpi = (kpis: Kpi[], id: string, title?: string): Kpi | undefined => {
  let found = kpis.find(kpi => kpi.id === id);
  if (!found && title) {
    found = kpis.find(kpi => kpi.title === title);
  }
  return found;
};

const KPI_LAYOUT_CONFIG: { column: number; id: string; title: string }[] = [
  // Column 1
  { column: 1, id: 'marginal_contribution_ratio', title: '边际贡献率' },
  { column: 1, id: 'variable_cost_ratio', title: '变动成本率' },
  { column: 1, id: 'expense_ratio', title: '费用率' },
  { column: 1, id: 'loss_ratio', title: '满期赔付率' },
  // Column 2
  { column: 2, id: 'marginal_contribution_amount', title: '边贡额' },
  { column: 2, id: 'premium_written', title: '保费' },
  { column: 2, id: 'expense_amount', title: '费用' },
  { column: 2, id: 'total_loss_amount', title: '赔款' },
  // Column 3
  { column: 3, id: 'premium_earned', title: '满期保费' },
  { column: 3, id: 'premium_earned_ratio', title: '保费满期率' },
  { column: 3, id: 'avg_premium_per_policy', title: '单均保费' },
  { column: 3, id: 'policy_count', title: '保单件数' },
  // Column 4
  { column: 4, id: 'premium_share', title: '保费占比' },
  { column: 4, id: 'avg_commercial_index', title: '自主系数' },
  { column: 4, id: 'claim_frequency', title: '满期出险率' },
  { column: 4, id: 'avg_loss_per_case', title: '案均赔款' },
];


export function KpiDashboardSection({ kpis }: KpiDashboardSectionProps) {
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
        // Render a placeholder or log an error if a configured KPI is not found
        return <div key={configItem.id} className="p-4 border rounded-lg shadow-sm bg-card text-card-foreground min-h-[180px]">KPI: {configItem.title} (数据待处理)</div>;
      });
  };

  return (
    <SectionWrapper title="KPI 看板" icon={LayoutDashboard}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">{renderColumn(1)}</div>
        <div className="space-y-4">{renderColumn(2)}</div>
        <div className="space-y-4">{renderColumn(3)}</div>
        <div className="space-y-4">{renderColumn(4)}</div>
      </div>
    </SectionWrapper>
  );
}
