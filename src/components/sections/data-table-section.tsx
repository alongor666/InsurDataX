import type { ProcessedDataForPeriod, AnalysisMode } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { TableCells, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
      <SectionWrapper title="数据表显示" icon={TableCells}>
        <p className="text-muted-foreground">暂无数据可显示。</p>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper title="数据表显示" icon={TableCells}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>业务线</TableHead>
              <TableHead className="text-right">保费</TableHead>
              {analysisMode === 'periodOverPeriod' && <TableHead className="text-right">保费环比</TableHead>}
              <TableHead className="text-right">赔付额</TableHead>
              {analysisMode === 'periodOverPeriod' && <TableHead className="text-right">赔付额环比</TableHead>}
              <TableHead className="text-right">保单数</TableHead>
              {analysisMode === 'periodOverPeriod' && <TableHead className="text-right">保单数环比</TableHead>}
              <TableHead className="text-right">赔付率</TableHead>
              {analysisMode === 'periodOverPeriod' && <TableHead className="text-right">赔付率环比</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.businessLineId}>
                <TableCell className="font-medium flex items-center">
                  {item.icon && <item.icon className="h-4 w-4 mr-2 text-primary" />}
                  {item.businessLineName}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(item.premium)}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  <TableCell className="text-right"><ChangeIndicator value={item.premiumChange} /></TableCell>
                )}
                <TableCell className="text-right">{formatCurrency(item.claims)}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  <TableCell className="text-right"><ChangeIndicator value={item.claimsChange} /></TableCell>
                )}
                <TableCell className="text-right">{formatNumber(item.policies)}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  <TableCell className="text-right"><ChangeIndicator value={item.policiesChange} /></TableCell>
                )}
                <TableCell className="text-right">{formatPercentage(item.lossRatio)}</TableCell>
                {analysisMode === 'periodOverPeriod' && (
                  <TableCell className="text-right"><LossRatioChangeIndicator value={item.lossRatioChange} /></TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SectionWrapper>
  );
}
