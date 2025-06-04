import type { Kpi } from '@/data/types';
import { KpiCard } from '@/components/shared/kpi-card';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { LayoutDashboard } from 'lucide-react';

interface KpiDashboardSectionProps {
  kpis: Kpi[];
}

export function KpiDashboardSection({ kpis }: KpiDashboardSectionProps) {
  if (!kpis || kpis.length === 0) {
    return (
      <SectionWrapper title="KPI 看板" icon={LayoutDashboard}>
        <p className="text-muted-foreground">暂无KPI数据。</p>
      </SectionWrapper>
    );
  }
  return (
    <SectionWrapper title="KPI 看板" icon={LayoutDashboard}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map(kpi => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>
    </SectionWrapper>
  );
}
