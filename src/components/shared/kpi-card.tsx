import type { Kpi } from '@/data/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const ChangeIcon = kpi.changeType === 'positive' ? TrendingUp : kpi.changeType === 'negative' ? TrendingDown : Minus;
  const changeColor = kpi.changeType === 'positive' ? 'text-green-600' : kpi.changeType === 'negative' ? 'text-red-600' : 'text-muted-foreground';

  return (
    <Card className={cn("shadow-lg transition-all hover:shadow-xl", kpi.isRisk ? "border-destructive border-2" : "")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-body">{kpi.title}</CardTitle>
        {kpi.icon && <kpi.icon className={cn("h-5 w-5", kpi.isRisk ? "text-destructive" : "text-muted-foreground")} />}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-headline text-primary">{kpi.value}</div>
        {kpi.change && (
          <p className={cn("text-xs mt-1 flex items-center", changeColor)}>
            <ChangeIcon className="h-4 w-4 mr-1" />
            {kpi.change}
            {kpi.description && <span className="ml-1 text-muted-foreground">{kpi.description}</span>}
          </p>
        )}
         {!kpi.change && kpi.description && (
           <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
         )}
         {kpi.isRisk && (
            <p className="text-xs text-destructive mt-1 font-medium">存在风险</p>
         )}
      </CardContent>
    </Card>
  );
}
