import type { Kpi } from '@/data/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const ChangeDisplay = ({ change, changeType, label }: { change?: string; changeType?: Kpi['changeType']; label: string }) => {
  if (!change) return null;
  const Icon = changeType === 'positive' ? TrendingUp : changeType === 'negative' ? TrendingDown : Minus;
  const color = changeType === 'positive' ? 'text-green-600' : changeType === 'negative' ? 'text-red-600' : 'text-muted-foreground';
  
  return (
    <p className={cn("text-xs mt-1 flex items-center", color)}>
      <Icon className="h-4 w-4 mr-1" />
      {change}
      <span className="ml-1 text-muted-foreground">{label}</span>
    </p>
  );
};

export function KpiCard({ kpi }: { kpi: Kpi }) {
  
  let valueClassName = "text-3xl font-bold font-headline text-primary";
  let cardClassName = "shadow-lg transition-all hover:shadow-xl";

  const rawValue = kpi.rawValue; // Use kpi.rawValue for numeric comparisons

  if (kpi.title === '综合赔付率' || kpi.title === '满期赔付率') {
    if (rawValue !== undefined && rawValue > 70) {
      valueClassName = cn(valueClassName, "text-red-600 font-bold");
      // isRisk might also set a border, which is fine.
    }
  } else if (kpi.title === '费用率') {
    if (rawValue !== undefined && rawValue > 14.5) {
      valueClassName = cn(valueClassName, "text-orange-500"); // Ensure orange-500 is defined in Tailwind or use another color
      // For 费用率, only the value is orange, not necessarily the whole card border unless kpi.isRisk is also true.
    }
  }
  
  // Handle generic border risk from isRisk and specific border for '变动成本率'
  if (kpi.isRisk) {
     cardClassName = cn(cardClassName, "border-destructive border-2");
  }
  if (kpi.title === '变动成本率' && rawValue !== undefined && rawValue > 90) {
    cardClassName = cn(cardClassName, "border-destructive border-2");
  }


  return (
    <Card className={cardClassName}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-body">{kpi.title}</CardTitle>
        {kpi.icon && <kpi.icon className={cn("h-5 w-5", (kpi.isRisk || (kpi.title === '变动成本率' && rawValue !== undefined && rawValue > 90)) ? "text-destructive" : "text-muted-foreground")} />}
      </CardHeader>
      <CardContent>
        <div className={valueClassName}>{kpi.value}</div>
        
        <ChangeDisplay change={kpi.change} changeType={kpi.changeType} label="环比" />
        <ChangeDisplay change={kpi.yoyChange} changeType={kpi.yoyChangeType} label="同比" />

        {/* Fallback description if no changes are present */}
        {!kpi.change && !kpi.yoyChange && kpi.description && (
           <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
         )}
        
        {/* Specific risk text for general isRisk true (not covered by title specific ones) */}
        {kpi.isRisk && !(kpi.title === '综合赔付率' || kpi.title === '满期赔付率' || kpi.title === '费用率' || kpi.title === '变动成本率') && (
           <p className="text-xs text-destructive mt-1 font-medium">存在风险</p>
        )}
      </CardContent>
    </Card>
  );
}
