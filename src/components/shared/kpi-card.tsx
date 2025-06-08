
import type { Kpi } from '@/data/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, DollarSign, FileText, Percent, Briefcase, Zap, Activity, ShieldCheck, ShieldAlert, Landmark, Users, Ratio, Search, Icon as LucideIconType, PieChart, ListOrdered } from 'lucide-react';

const iconMap: { [key: string]: LucideIconType } = {
  DollarSign, FileText, Percent, Briefcase, Zap, Activity, ShieldCheck, ShieldAlert, Landmark, Users, Ratio, Search, PieChart, ListOrdered
};

const ChangeDisplay = ({
  comparisonLabel,
  change, // Percentage or pp string
  changeAbsolute, // Absolute change string
  changeType,
}: {
  comparisonLabel?: string;
  change?: string;
  changeAbsolute?: string;
  changeType?: Kpi['comparisonChangeType'];
}) => {
  if (!comparisonLabel || (!change && !changeAbsolute)) return null;
  if (change === '-' && changeAbsolute === '-') return null; // Don't display if both are explicitly '-'

  const Icon = changeType === 'positive' ? TrendingUp : changeType === 'negative' ? TrendingDown : Minus;
  const color = changeType === 'positive' ? 'text-green-600' : changeType === 'negative' ? 'text-red-600' : 'text-muted-foreground';

  let displayValue = "";
  if (changeAbsolute && changeAbsolute.includes('pp')) {
    displayValue = changeAbsolute;
    if (change && change !== '-') {
        displayValue += ` (${change})`;
    }
  } else if (change && change !== '-') {
    displayValue = change;
    if (changeAbsolute && changeAbsolute !== '-') {
        displayValue += ` (${changeAbsolute})`;
    }
  } else if (changeAbsolute && changeAbsolute !== '-') {
    displayValue = changeAbsolute;
  }


  if (!displayValue || displayValue.trim() === '' || displayValue.trim() === '(-)') {
    return null;
  }


  return (
    <p className={cn("text-xs mt-1 flex items-center", color)}>
      <Icon className="h-4 w-4 mr-1" />
      {displayValue}
      <span className="ml-1 text-muted-foreground">{comparisonLabel}</span>
    </p>
  );
};

export function KpiCard({ kpi }: { kpi: Kpi }) {
  let valueClassName = "text-3xl font-bold font-headline text-primary";
  let cardClassName = "shadow-lg transition-all hover:shadow-xl min-h-[180px]";

  if (kpi.isRisk && !kpi.isOrangeRisk && !kpi.isBorderRisk) {
    valueClassName = cn(valueClassName, "text-red-600 font-bold");
  } else if (kpi.isOrangeRisk) {
     valueClassName = cn(valueClassName, "text-orange-500");
  }

  if (kpi.isBorderRisk) {
     cardClassName = cn(cardClassName, "border-destructive border-2");
  }

  const IconComponent = kpi.icon && iconMap[kpi.icon] ? iconMap[kpi.icon] : (kpi.unit ? null : iconMap['ShieldCheck']);


  return (
    <Card className={cardClassName}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-body">{kpi.title}</CardTitle>
        {kpi.unit ? (
          <span className="text-xs font-semibold text-muted-foreground">{kpi.unit}</span>
        ) : (
          IconComponent && <IconComponent className={cn("h-5 w-5", kpi.isRisk || kpi.isBorderRisk ? "text-destructive" : (kpi.isOrangeRisk ? "text-orange-500" : "text-muted-foreground"))} />
        )}
      </CardHeader>
      <CardContent>
        <div className={valueClassName}>{kpi.value}</div>

        <ChangeDisplay
          comparisonLabel={kpi.comparisonLabel}
          change={kpi.comparisonChange}
          changeAbsolute={kpi.comparisonChangeAbsolute}
          changeType={kpi.comparisonChangeType}
        />

        {kpi.description && (
           <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
         )}
      </CardContent>
    </Card>
  );
}
