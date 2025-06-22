import type { Kpi } from '@/data/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  DollarSign, 
  FileText, 
  Percent, 
  Briefcase, 
  Zap, 
  Activity, 
  ShieldCheck, 
  ShieldAlert, 
  Landmark, 
  Users, 
  Ratio, 
  Search, 
  PieChart, 
  ListOrdered,
  type LucideProps
} from 'lucide-react';
import type React from 'react';

const iconMap: { [key: string]: React.FC<LucideProps> } = {
  DollarSign, FileText, Percent, Briefcase, Zap, Activity, ShieldCheck, ShieldAlert, Landmark, Users, Ratio, Search, PieChart, ListOrdered
};

const getChangeIcon = (absoluteChange?: number) => {
  const epsilon = 0.00001;
  if (absoluteChange === undefined || absoluteChange === null || isNaN(absoluteChange) || Math.abs(absoluteChange) < epsilon) {
    return Minus;
  }
  if (absoluteChange > epsilon) {
    return TrendingUp;
  }
  return TrendingDown;
};

const ChangeDisplay = ({
  change,
  changeAbsolute,
  changeAbsoluteRaw,
  changeType,
}: {
  change?: string;
  changeAbsolute?: string;
  changeAbsoluteRaw?: number;
  changeType?: Kpi['comparisonChangeType'];
}) => {
  if ((!change || change === '-') && (!changeAbsolute || changeAbsolute === '-')) return null;

  const Icon = getChangeIcon(changeAbsoluteRaw);
  const color = changeType === 'positive' ? 'text-green-600' : changeType === 'negative' ? 'text-red-600' : 'text-muted-foreground';

  let displayValue = "";
  if (changeAbsolute && changeAbsolute.includes('pp')) {
    displayValue = changeAbsolute;
    if (change && change !== '-' && change !== '0.0%') {
        displayValue += ` (${change})`;
    }
  } else if (change && change !== '-') {
    displayValue = change;
    if (changeAbsolute && changeAbsolute !== '-' && changeAbsolute !== '0') {
        displayValue += ` (${changeAbsolute})`;
    }
  } else if (changeAbsolute && changeAbsolute !== '-') {
    displayValue = changeAbsolute;
  }

  if (!displayValue || displayValue.trim() === '' || displayValue.trim() === '(-)' || displayValue.trim() === '(0)') {
    return null;
  }

  return (
    <p className={cn("text-xs mt-0.5 flex items-center", color)}>
      <Icon className="h-3 w-3 mr-0.5" />
      {displayValue}
    </p>
  );
};

export function KpiCard({ kpi }: { kpi: Kpi }) {
  let valueClassName = "text-2xl font-bold font-headline text-primary";
  let cardClassName = "shadow-lg transition-all hover:shadow-xl min-h-[115px]";

  if (kpi.isRisk && !kpi.isOrangeRisk && !kpi.isBorderRisk) {
    valueClassName = cn(valueClassName, "text-red-600 font-bold");
  } else if (kpi.isOrangeRisk) {
     valueClassName = cn(valueClassName, "text-orange-500");
  }

  if (kpi.isBorderRisk) {
     cardClassName = cn(cardClassName, "border-destructive border-2");
  }

  const IconComponent = kpi.unit
    ? null
    : (kpi.icon && iconMap[kpi.icon] ? iconMap[kpi.icon] : iconMap['ShieldCheck']);

  return (
    <Card className={cardClassName}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1 pt-3 px-4">
        <CardTitle className="text-sm font-medium font-body leading-tight">{kpi.title}</CardTitle>
        {kpi.unit ? (
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{kpi.unit}</span>
        ) : (
          IconComponent && <IconComponent className={cn("h-4 w-4", kpi.isRisk || kpi.isBorderRisk ? "text-destructive" : (kpi.isOrangeRisk ? "text-orange-500" : "text-muted-foreground"))} />
        )}
      </CardHeader>
      <CardContent className="pt-0 pb-3 px-4">
        <div className={valueClassName}>{kpi.value}</div>
        <ChangeDisplay
          change={kpi.comparisonChange}
          changeAbsolute={kpi.comparisonChangeAbsolute}
          changeAbsoluteRaw={kpi.comparisonChangeAbsoluteRaw}
          changeType={kpi.comparisonChangeType}
        />
        {kpi.description && (
           <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{kpi.description}</p>
         )}
      </CardContent>
    </Card>
  );
}
