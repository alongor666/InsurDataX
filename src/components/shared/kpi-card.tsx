
import type { Kpi } from '@/data/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, DollarSign, FileText, Percent, Briefcase, Zap, Activity, ShieldCheck, ShieldAlert, Landmark, Users, Ratio, Search, Icon as LucideIconType } from 'lucide-react';

const iconMap: { [key: string]: LucideIconType } = {
  DollarSign, FileText, Percent, Briefcase, Zap, Activity, ShieldCheck, ShieldAlert, Landmark, Users, Ratio, Search,
};

const ChangeDisplay = ({
  comparisonLabel,
  change,
  changeAbsolute,
  changeType,
}: {
  comparisonLabel?: string;
  change?: string;
  changeAbsolute?: string;
  changeType?: Kpi['primaryChangeType'];
}) => {
  if (!comparisonLabel || (!change && !changeAbsolute)) return null;

  const Icon = changeType === 'positive' ? TrendingUp : changeType === 'negative' ? TrendingDown : Minus;
  const color = changeType === 'positive' ? 'text-green-600' : changeType === 'negative' ? 'text-red-600' : 'text-muted-foreground';

  let displayValue = "";
  // For KPI card, prioritize formatted % or pp change, then absolute value if only one is present
  if (change && changeAbsolute) {
    // If absolute is a "pp" value, show it first
    if (changeAbsolute.includes('pp')) {
        displayValue = `${changeAbsolute} (${change})`;
    } else { // Otherwise, percentage first
        displayValue = `${change} (${changeAbsolute})`;
    }
  } else if (change) {
    displayValue = change;
  } else if (changeAbsolute) {
    displayValue = changeAbsolute;
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
  } else if (kpi.isRisk && !kpi.isOrangeRisk) {
     cardClassName = cn(cardClassName, "border-destructive");
  }

  const IconComponent = kpi.icon && iconMap[kpi.icon] ? iconMap[kpi.icon] : null;

  return (
    <Card className={cardClassName}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-body">{kpi.title}</CardTitle>
        {IconComponent && <IconComponent className={cn("h-5 w-5", kpi.isRisk || kpi.isBorderRisk ? "text-destructive" : (kpi.isOrangeRisk ? "text-orange-500" : "text-muted-foreground"))} />}
      </CardHeader>
      <CardContent>
        <div className={valueClassName}>{kpi.value}</div>

        <ChangeDisplay
          comparisonLabel={kpi.primaryComparisonLabel}
          change={kpi.primaryChange}
          changeAbsolute={kpi.primaryChangeAbsolute}
          changeType={kpi.primaryChangeType}
        />
        {kpi.secondaryComparisonLabel && ( // Render secondary comparison only if label exists
          <ChangeDisplay
            comparisonLabel={kpi.secondaryComparisonLabel}
            change={kpi.secondaryChange}
            changeAbsolute={kpi.secondaryChangeAbsolute}
            changeType={kpi.secondaryChangeType}
          />
        )}

        {kpi.description && (
           <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
         )}
      </CardContent>
    </Card>
  );
}
