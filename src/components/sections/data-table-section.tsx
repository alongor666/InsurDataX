
import type { ProcessedDataForPeriod, AnalysisMode, PeriodOption } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { TableCellsSplit, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDisplayValue, calculateChangeAndType } from '@/lib/data-utils'; // Import calculateChangeAndType
import { cn } from '@/lib/utils';

interface DataTableSectionProps {
  data: ProcessedDataForPeriod[];
  analysisMode: AnalysisMode;
  selectedComparisonPeriodKey: string | null;
  periodOptions: PeriodOption[];
}

const ChangeIndicator = ({ 
    currentValue, 
    comparisonValue, 
    metricId, 
    higherIsBetter = true, 
    isRate = false 
}: { 
    currentValue?: number | null, 
    comparisonValue?: number | null, 
    metricId: string, 
    higherIsBetter?: boolean,
    isRate?: boolean
}) => {
  if (currentValue === undefined || currentValue === null || isNaN(currentValue) || 
      comparisonValue === undefined || comparisonValue === null || isNaN(comparisonValue)) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }

  const changeDetails = calculateChangeAndType(currentValue, comparisonValue, higherIsBetter);
  let displayValue = "";

  if (isRate) { // For rates, show absolute change in pp
      displayValue = changeDetails.absolute !== undefined ? `${changeDetails.absolute.toFixed(1)} pp` : "-";
  } else if (changeDetails.percent !== undefined && isFinite(changeDetails.percent)) { // For others, show percentage change
      displayValue = `${changeDetails.percent.toFixed(1)}%`;
  } else if (changeDetails.percent === Infinity) {
      displayValue = "+∞%";
  } else if (changeDetails.percent === -Infinity) {
      displayValue = "-∞%";
  } else {
      displayValue = "-";
  }
  
  let changeTypeColorClass = 'text-muted-foreground';
  // Color based on the 'type' from calculateChangeAndType which already considers higherIsBetter
  if (changeDetails.type === 'positive') {
    changeTypeColorClass = 'text-green-600';
  } else if (changeDetails.type === 'negative') {
    changeTypeColorClass = 'text-red-600';
  }
  
  const Icon = changeDetails.type === 'positive' ? TrendingUp : changeDetails.type === 'negative' ? TrendingDown : Minus;

  return (
    <span className={cn("flex items-center justify-end", changeTypeColorClass)}>
      <Icon className="h-4 w-4 mr-1" />
      {displayValue}
    </span>
  );
};


export function DataTableSection({ data, analysisMode, selectedComparisonPeriodKey, periodOptions }: DataTableSectionProps) {
  if (!data || data.length === 0) {
    return (
      <SectionWrapper title="数据表显示" icon={TableCellsSplit}>
        <p className="text-muted-foreground">暂无数据可显示。</p>
      </SectionWrapper>
    );
  }

  let comparisonColumnLabelSuffix = "环比";
  if (selectedComparisonPeriodKey) {
      const compPeriod = periodOptions.find(p => p.value === selectedComparisonPeriodKey);
      if (compPeriod) comparisonColumnLabelSuffix = `对比 ${compPeriod.label}`;
      else comparisonColumnLabelSuffix = "对比所选周期";
  }


  return (
    <SectionWrapper title="数据表显示" icon={TableCellsSplit}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>业务线</TableHead>
              <TableHead className="text-right">跟单保费</TableHead>
              {analysisMode === 'periodOverPeriod' && <TableHead className="text-right">{`跟单保费 ${comparisonColumnLabelSuffix}`}</TableHead>}
              <TableHead className="text-right">总赔款</TableHead>
              {analysisMode === 'periodOverPeriod' && <TableHead className="text-right">{`总赔款 ${comparisonColumnLabelSuffix}`}</TableHead>}
              <TableHead className="text-right">保单数量</TableHead>
              {analysisMode === 'periodOverPeriod' && <TableHead className="text-right">{`保单数量 ${comparisonColumnLabelSuffix}`}</TableHead>}
              <TableHead className="text-right">满期赔付率</TableHead>
              {analysisMode === 'periodOverPeriod' && <TableHead className="text-right">{`满期赔付率 ${comparisonColumnLabelSuffix} (pp)`}</TableHead>}
               <TableHead className="text-right">费用率</TableHead>
              {analysisMode === 'periodOverPeriod' && <TableHead className="text-right">{`费用率 ${comparisonColumnLabelSuffix} (pp)`}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.businessLineId}>
                <TableCell className="font-medium flex items-center">
                  {item.businessLineName}
                </TableCell>
                <TableCell className="text-right">{formatDisplayValue(item.currentMetrics.premium_written, 'premium_written')}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  <TableCell className="text-right">
                    <ChangeIndicator currentValue={item.currentMetrics.premium_written} comparisonValue={item.momMetrics?.premium_written} metricId="premium_written" higherIsBetter={true} />
                  </TableCell>
                )}
                <TableCell className="text-right">{formatDisplayValue(item.currentMetrics.total_loss_amount, 'total_loss_amount')}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  <TableCell className="text-right">
                     <ChangeIndicator currentValue={item.currentMetrics.total_loss_amount} comparisonValue={item.momMetrics?.total_loss_amount} metricId="total_loss_amount" higherIsBetter={false} />
                  </TableCell>
                )}
                <TableCell className="text-right">{formatDisplayValue(item.currentMetrics.policy_count, 'policy_count')}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  <TableCell className="text-right">
                    <ChangeIndicator currentValue={item.currentMetrics.policy_count} comparisonValue={item.momMetrics?.policy_count} metricId="policy_count" higherIsBetter={true} />
                  </TableCell>
                )}
                <TableCell className="text-right">{formatDisplayValue(item.currentMetrics.loss_ratio, 'loss_ratio')}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  <TableCell className="text-right">
                    <ChangeIndicator currentValue={item.currentMetrics.loss_ratio} comparisonValue={item.momMetrics?.loss_ratio} metricId="loss_ratio" higherIsBetter={false} isRate={true} />
                  </TableCell>
                )}
                 <TableCell className="text-right">{formatDisplayValue(item.currentMetrics.expense_ratio, 'expense_ratio')}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  <TableCell className="text-right">
                    <ChangeIndicator currentValue={item.currentMetrics.expense_ratio} comparisonValue={item.momMetrics?.expense_ratio} metricId="expense_ratio" higherIsBetter={false} isRate={true} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SectionWrapper>
  );
}
