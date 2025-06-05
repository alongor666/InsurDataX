
import type { LucideIcon } from 'lucide-react';

export type AnalysisMode = 'cumulative' | 'periodOverPeriod'; // 累计数据 | 环比数据

export interface MonthlyData {
  date: string; // YYYY-MM format
  value: number;
}

export interface MetricData {
  premium_written: MonthlyData[]; // 跟单保费 (was premium)
  premium_earned: MonthlyData[];  // 满期保费 (new)
  total_loss_amount: MonthlyData[];// 总赔款 (was claims)
  expense_amount_raw: MonthlyData[]; // 原始费用金额 (new)
  policy_count: MonthlyData[];   // 保单数量 (was policies)
  claim_count?: MonthlyData[]; // 赔案数量 (new, optional for now)
  policy_count_earned?: MonthlyData[]; // 满期保单数量 (new, optional for now)
  lossRatio?: MonthlyData[]; // 赔付率 - This might be deprecated if calculated from bases
}

export interface BusinessLine {
  id: string;
  name: string; // e.g., '商业车险', '私家车险'
  icon?: LucideIcon;
  data: { // Corresponds to V4.0 names where applicable
    premium: MonthlyData[]; // Original name from mock-data, will be mapped to premium_written
    claims: MonthlyData[];  // Original name from mock-data, will be mapped to total_loss_amount
    policies: MonthlyData[];// Original name from mock-data, will be mapped to policy_count
    lossRatio?: MonthlyData[]; // Original from mock-data
    // V4.0 fields would be added here if mock-data was structured per V4.0
    // For now, processDataForRange will derive/mock premium_earned, expense_amount_raw
  };
}

export interface Kpi {
  id:string;
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
  id: string; // Business line id
  x: number;
  y: number;
  z: number; // Bubble size
  name: string; // Business line name
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

  // V4.0 Fields
  premium_written: number;
  premium_earned: number; // New
  total_loss_amount: number;
  expense_amount_raw: number; // New
  policy_count: number;
  
  // Ratios calculated in processDataForRange or later in calculateKpis (for aggregated)
  loss_ratio: number; // Based on total_loss_amount / premium_earned
  expense_ratio: number; // Based on expense_amount_raw / premium_written
  variable_cost_ratio: number; // Derived from loss_ratio + expense_ratio

  // Change percentages - PoP
  premium_writtenChange?: number;
  premium_earnedChange?: number;
  total_loss_amountChange?: number;
  expense_amount_rawChange?: number;
  policy_countChange?: number;
  loss_ratioChange?: number;
  expense_ratioChange?: number;
  variable_cost_ratioChange?: number;
}
