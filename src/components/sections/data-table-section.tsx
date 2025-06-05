
import type { ProcessedDataForPeriod, AnalysisMode } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { TableCellsSplit, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/data-utils';
import { cn } from '@/lib/utils';

interface DataTableSectionProps {
  data: ProcessedDataForPeriod[];
  analysisMode: AnalysisMode;
}

const ChangeIndicator = ({ value }: { value: number | undefined }) => {
  if (value === undefined || value === null || isNaN(value)) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-muted-foreground';
  return (
    <span className={cn("flex items-center", color)}>
      <Icon className="h-4 w-4 mr-1" />
      {formatPercentage(value)}
    </span>
  );
};

const LossRatioChangeIndicator = ({ value }: { value: number | undefined }) => {
   if (value === undefined || value === null || isNaN(value)) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  // For Loss Ratio, increase is bad, decrease is good
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus; 
  const color = value > 0 ? 'text-red-600' : value < 0 ? 'text-green-600' : 'text-muted-foreground';
  return (
    <span className={cn("flex items-center", color)}>
      <Icon className="h-4 w-4 mr-1" />
      {formatPercentage(value)}
    </span>
  );
}


export function DataTableSection({ data, analysisMode }: DataTableSectionProps) {
  if (!data || data.length === 0) {
    return (
      <SectionWrapper title="数据表显示" icon={TableCellsSplit}>
        <p className="text-muted-foreground">暂无数据可显示。</p>
      </SectionWrapper>
    );
  }

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
              {analysisMode === 'periodOverPeriod' && <TableHead className="text-right">满期赔付率环比</TableHead>}
               <TableHead className="text-right">费用率</TableHead>
              {analysisMode === 'periodOverPeriod' && <TableHead className="text-right">费用率环比</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.businessLineId}>
                <TableCell className="font-medium flex items-center">
                  {item.icon && <item.icon className="h-4 w-4 mr-2 text-primary" />}
                  {item.businessLineName}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(item.premium_written)}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  <TableCell className="text-right"><ChangeIndicator value={item.premium_writtenChange} /></TableCell>
                )}
                <TableCell className="text-right">{formatCurrency(item.total_loss_amount)}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  <TableCell className="text-right"><ChangeIndicator value={item.total_loss_amountChange} /></TableCell>
                )}
                <TableCell className="text-right">{formatNumber(item.policy_count)}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  <TableCell className="text-right"><ChangeIndicator value={item.policy_countChange} /></TableCell>
                )}
                <TableCell className="text-right">{formatPercentage(item.loss_ratio)}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  <TableCell className="text-right"><LossRatioChangeIndicator value={item.loss_ratioChange} /></TableCell>
                )}
                 <TableCell className="text-right">{formatPercentage(item.expense_ratio)}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  // Assuming higher expense ratio is bad for change indicator
                  <TableCell className="text-right"><LossRatioChangeIndicator value={item.expense_ratioChange} /></TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SectionWrapper>
  );
}

