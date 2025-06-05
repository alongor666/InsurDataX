import type { LucideIcon } from 'lucide-react';

export type AnalysisMode = 'cumulative' | 'periodOverPeriod'; // 累计数据 | 环比数据

export interface MonthlyData {
  date: string; // YYYY-MM format
  value: number;
}

export interface MetricData {
  premium: MonthlyData[]; // 保费
  claims: MonthlyData[]; // 赔付额
  policies: MonthlyData[]; // 保单数
  lossRatio?: MonthlyData[]; // 赔付率 (can be calculated)
}

export interface BusinessLine {
  id: string;
  name: string; // e.g., '商业车险', '私家车险'
  icon?: LucideIcon;
  data: MetricData;
}

export interface Kpi {
  id: string;
  title: string;
  value: string; // Formatted value for display
  rawValue?: number; // Raw numeric value for comparisons
  change?: string; // e.g., "+5.2%" or "-1.0%" (period-over-period)
  changeType?: 'positive' | 'negative' | 'neutral';
  yoyChange?: string; // Year-over-year change
  yoyChangeType?: 'positive' | 'negative' | 'neutral';
  description?: string;
  icon?: LucideIcon;
  isRisk?: boolean; // General risk flag, can be used for borders or specific highlighting
}

// For charts
export interface ChartDataItem {
  name: string; // Usually date or business line name
  [key: string]: number | string; // Metrics
}

export interface BubbleChartDataItem {
  id: string; // Business line name
  x: number;
  y: number;
  z: number; // Bubble size
  name: string;
}

// AI Summary related types
export interface AiSummaryInput {
  data: string; // JSON string of relevant data
  filters: string; // JSON string of applied filters (mode, period)
}

export interface ProcessedDataForPeriod {
  businessLineId: string;
  businessLineName: string;
  icon?: LucideIcon;
  premium: number;
  claims: number;
  policies: number;
  lossRatio: number;
  premiumChange?: number; // MoM or PoP change in %
  claimsChange?: number;
  policiesChange?: number;
  lossRatioChange?: number;
}
