
import type { LucideIcon } from 'lucide-react';

export type AnalysisMode = 'cumulative' | 'periodOverPeriod'; // 累计数据 | 当周发生额
export type DashboardView = 'kpi' | 'trend' | 'bubble' | 'bar_rank' | 'data_table';

// V4.0 JSON Structure Types
export interface V4BusinessDataEntry {
  business_type: string;

  // --- 聚合计算基础字段 (YTD values from JSON) ---
  premium_written: number;         // 跟单保费 (万元)
  premium_earned: number;          // 满期保费 (万元)
  total_loss_amount: number;       // 总赔款 (已报告赔款) (万元)
  expense_amount_raw: number;      // 原始费用金额 (计算费用率的基础) (万元)

  claim_count?: number | null;             // 赔案数量 (件/次) - 计算案均赔款、满期出险率的基础
  policy_count_earned?: number | null;     // 满期保单数量 (件) - 计算满期出险率的基础

  // --- 单业务类型预计算值 (YTD values from JSON, for direct use if single type selected, or validation) ---
  avg_premium_per_policy?: number | null;   // 单均保费 (元)
  avg_loss_per_case?: number | null;        // 案均赔款 (元)
  avg_commercial_index?: number | null;     // 自主系数 (无单位) - 不聚合

  loss_ratio?: number | null;               // 满期赔付率 (%)
  expense_ratio?: number | null;            // 费用率 (%)
  variable_cost_ratio?: number | null;      // 变动成本率 (%)
  premium_earned_ratio?: number | null;     // 保费满期率 (%)
  claim_frequency?: number | null;          // 满期出险率 (%)
}

export interface V4PeriodTotals {
  total_premium_written_overall?: number; // 跟单保费总计 (所有业务类型)
  // ... other possible global totals for the period
}

export interface V4PeriodData {
  period_id: string;
  period_label: string;
  comparison_period_id_yoy?: string | null;
  comparison_period_id_mom?: string | null; //环比
  business_data: V4BusinessDataEntry[];
  totals_for_period?: V4PeriodTotals | null;
}

// Represents all calculated metrics for a specific scope (single line/aggregated, YTD/PoP)
export interface AggregatedBusinessMetrics {
  premium_written: number;
  premium_earned: number;
  total_loss_amount: number;
  expense_amount_raw: number;
  policy_count: number;
  claim_count: number;
  policy_count_earned: number;
  avg_commercial_index?: number | null; // Only for single line, undefined for aggregate

  loss_ratio: number;
  expense_ratio: number;
  variable_cost_ratio: number;
  premium_earned_ratio: number;
  claim_frequency: number;
  avg_premium_per_policy: number;
  avg_loss_per_case: number;
  expense_amount: number;

  marginal_contribution_ratio: number; // 新公式: 100 - variable_cost_ratio
  marginal_contribution_amount: number; // 新公式: premium_earned * (marginal_contribution_ratio / 100)
}


// Processed data structure for use in components.
export interface ProcessedDataForPeriod {
  businessLineId: string;
  businessLineName: string;
  icon?: LucideIcon;

  currentMetrics: AggregatedBusinessMetrics;
  momMetrics?: AggregatedBusinessMetrics | null; // Metrics for Month-over-Month comparison period (always YTD based)
  yoyMetrics?: AggregatedBusinessMetrics | null; // Metrics for Year-over-Year comparison period (always YTD based)
  
  // For direct use in DataTableSection, these are from currentMetrics based on analysis mode.
  // These specific fields in ProcessedDataForPeriod might be redundant if DataTableSection directly uses currentMetrics.
  // However, keeping them for now to minimize disruption to DataTableSection's existing props.
  premium_written: number;
  total_loss_amount: number;
  policy_count: number;
  loss_ratio: number;
  expense_ratio: number;
  variable_cost_ratio: number; // For direct display

  // For change calculations in DataTableSection (values are percentages or absolute diff in percentage points)
  premium_writtenChange?: number;
  total_loss_amountChange?: number;
  policy_countChange?: number;
  loss_ratioChange?: number;
  expense_ratioChange?: number;

  // premium_share for KPI
  premium_share?: number;
}


export interface Kpi {
  id: string;
  title: string;
  value: string;
  rawValue?: number;
  change?: string; // Period-over-period (环比) - Percentage
  changeAbsolute?: string; // Period-over-period (环比) - Absolute Value
  changeType?: 'positive' | 'negative' | 'neutral';
  yoyChange?: string; // Year-over-year (同比) - Percentage
  yoyChangeAbsolute?: string; // Year-over-year (同比) - Absolute Value
  yoyChangeType?: 'positive' | 'negative' | 'neutral';
  description?: string;
  icon?: LucideIcon;
  isRisk?: boolean; 
  isBorderRisk?: boolean; // Specific for border risk like variable_cost_ratio
  isOrangeRisk?: boolean; // Specific for orange text like expense_ratio
}

// For charts
export interface ChartDataItem {
  name: string; // Usually period_label or business_line name
  [key: string]: number | string; // Metrics, keys are business line names for trend, or metric name for bar
}

export interface BubbleChartDataItem {
  id: string;
  x: number;
  y: number;
  z: number;
  name: string;
}

// AI Summary related types
export interface AiSummaryInput {
  data: string; // JSON string of relevant data for the summary
  filters: string; // JSON string of applied filters
  analysisMode: AnalysisMode;
  currentPeriodLabel: string;
}

// For period selection dropdown
export interface PeriodOption {
  value: string; // period_id
  label: string; // period_label
}


// V4.0 field names for ranking and trend metrics used in page.tsx
export type RankingMetricKey = keyof Pick<AggregatedBusinessMetrics, 'premium_written' | 'total_loss_amount' | 'policy_count' | 'loss_ratio' | 'expense_ratio' | 'variable_cost_ratio'>;
export type TrendMetricKey = keyof Pick<AggregatedBusinessMetrics, 'premium_written' | 'total_loss_amount' | 'policy_count' | 'loss_ratio' | 'expense_ratio' | 'variable_cost_ratio' | 'premium_earned' | 'expense_amount_raw' | 'claim_count' | 'policy_count_earned'>;

export interface BusinessLineBasic { 
  id: string;
  name: string;
  icon?: LucideIcon;
}
