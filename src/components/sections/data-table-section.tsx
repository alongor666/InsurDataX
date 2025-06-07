
import type { ProcessedDataForPeriod, AnalysisMode } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { TableCellsSplit, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDisplayValue } from '@/lib/data-utils';
import { cn } from '@/lib/utils';

interface DataTableSectionProps {
  data: ProcessedDataForPeriod[];
  analysisMode: AnalysisMode;
}

const ChangeIndicator = ({ value, metricId, higherIsBetter = true }: { value: number | undefined, metricId: string, higherIsBetter?: boolean }) => {
  if (value === undefined || value === null || isNaN(value)) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }

  const isPercentageMetric = METRIC_FORMAT_RULES[metricId]?.type === 'percentage';
  const displayValue = isPercentageMetric ? `${value.toFixed(1)}%` : formatDisplayValue(value, metricId);


  // Determine color based on whether higher is better for this specific metric's change
  let changeTypeColorClass = 'text-muted-foreground';
  if (value > 0) {
    changeTypeColorClass = higherIsBetter ? 'text-green-600' : 'text-red-600';
  } else if (value < 0) {
    changeTypeColorClass = higherIsBetter ? 'text-red-600' : 'text-green-600';
  }
  
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;

  return (
    <span className={cn("flex items-center", changeTypeColorClass)}>
      <Icon className="h-4 w-4 mr-1" />
      {displayValue}
    </span>
  );
};

// Specific metric rule for formatting (used by ChangeIndicator)
const METRIC_FORMAT_RULES: Record<string, { type: string }> = {
  'loss_ratio': { type: 'percentage' },
  'expense_ratio': { type: 'percentage' },
  // Add other metric IDs that are percentages if their changes also need explicit '%'
};


export function DataTableSection({ data, analysisMode }: DataTableSectionProps) {
  if (!data || data.length === 0) {
    return (
      <SectionWrapper title="数据表显示" icon={TableCellsSplit}>
        <p className="text-muted-foreground">暂无数据可显示。</p>
      </SectionWrapper>
    );
  }
  const firstItem = data[0]; // Assuming all items have the same structure for metrics
  
  return (
    <SectionWrapper title="数据表显示" icon={TableCellsSplit}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>业务线</TableHead>
              <TableHead className="text-right">跟单保费</TableHead>
              {analysisMode === 'periodOverPeriod' && <TableHead className="text-right">跟单保费环比</TableHead>}
              <TableHead className="text-right">总赔款</TableHead>
              {analysisMode === 'periodOverPeriod' && <TableHead className="text-right">总赔款环比</TableHead>}
              <TableHead className="text-right">保单数量</TableHead>
              {analysisMode === 'periodOverPeriod' && <TableHead className="text-right">保单数量环比</TableHead>}
              <TableHead className="text-right">满期赔付率</TableHead>
              {analysisMode === 'periodOverPeriod' && <TableHead className="text-right">满期赔付率环比(pp)</TableHead>}
               <TableHead className="text-right">费用率</TableHead>
              {analysisMode === 'periodOverPeriod' && <TableHead className="text-right">费用率环比(pp)</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.businessLineId}>
                <TableCell className="font-medium flex items-center">
                  {/* Icon rendering needs adjustment if item.icon is a string name */}
                  {/* For now, assuming item.icon is not used or handled elsewhere if it's a string */}
                  {item.businessLineName}
                </TableCell>
                <TableCell className="text-right">{formatDisplayValue(item.currentMetrics.premium_written, 'premium_written')}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  <TableCell className="text-right">
                    <ChangeIndicator value={item.premium_writtenChange} metricId="premium_written" higherIsBetter={true} />
                  </TableCell>
                )}
                <TableCell className="text-right">{formatDisplayValue(item.currentMetrics.total_loss_amount, 'total_loss_amount')}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  <TableCell className="text-right">
                     <ChangeIndicator value={item.total_loss_amountChange} metricId="total_loss_amount" higherIsBetter={false} />
                  </TableCell>
                )}
                <TableCell className="text-right">{formatDisplayValue(item.currentMetrics.policy_count, 'policy_count')}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  <TableCell className="text-right">
                    <ChangeIndicator value={item.policy_countChange} metricId="policy_count" higherIsBetter={true} />
                  </TableCell>
                )}
                <TableCell className="text-right">{formatDisplayValue(item.currentMetrics.loss_ratio, 'loss_ratio')}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  // For loss_ratioChange (which is in pp), higherIsBetter=false
                  <TableCell className="text-right">
                    <ChangeIndicator value={item.loss_ratioChange} metricId="loss_ratio" higherIsBetter={false} />
                  </TableCell>
                )}
                 <TableCell className="text-right">{formatDisplayValue(item.currentMetrics.expense_ratio, 'expense_ratio')}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  // For expense_ratioChange (which is in pp), higherIsBetter=false
                  <TableCell className="text-right">
                    <ChangeIndicator value={item.expense_ratioChange} metricId="expense_ratio" higherIsBetter={false} />
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
