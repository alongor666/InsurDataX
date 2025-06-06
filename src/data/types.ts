
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

  claim_count?: number;             // 赔案数量 (件/次) - 计算案均赔款、满期出险率的基础
  policy_count_earned?: number;     // 满期保单数量 (件) - 计算满期出险率的基础

  // --- 单业务类型预计算值 (YTD values from JSON, for direct use if single type selected, or validation) ---
  avg_premium_per_policy?: number;   // 单均保费 (元)
  avg_loss_per_case?: number;        // 案均赔款 (元)
  avg_commercial_index?: number;     // 自主系数 (无单位) - 不聚合

  loss_ratio?: number;               // 满期赔付率 (%)
  expense_ratio?: number;            // 费用率 (%)
  variable_cost_ratio?: number;      // 变动成本率 (%)
  premium_earned_ratio?: number;     // 保费满期率 (%)
  claim_frequency?: number;          // 满期出险率 (%)
}

export interface V4PeriodTotals {
  total_premium_written_overall?: number; // 跟单保费总计 (所有业务类型)
  // ... other possible global totals for the period
}

export interface V4PeriodData {
  period_id: string;
  period_label: string;
  comparison_period_id_yoy?: string;
  comparison_period_id_mom?: string; //环比
  business_data: V4BusinessDataEntry[];
  totals_for_period?: V4PeriodTotals;
}

// Processed data structure for use in components.
export interface ProcessedDataForPeriod {
  businessLineId: string;
  businessLineName: string;
  icon?: LucideIcon;

  // --- V4.0 Core Metrics (Values are AFTER 'cumulative' or 'periodOverPeriod' logic and aggregation) ---
  premium_written: number;
  premium_earned: number;
  total_loss_amount: number;
  expense_amount_raw: number; // 原始费用额，用于计算聚合费用率
  policy_count: number; // 衍生保单数量
  claim_count?: number; // 聚合后的赔案数量
  policy_count_earned?: number; // 聚合后的满期保单数量
  avg_commercial_index?: number; // 自主系数，用于单选时传递

  // Derived/calculated values based on above after aggregation
  loss_ratio: number;
  expense_ratio: number;
  variable_cost_ratio: number;
  premium_earned_ratio?: number;
  claim_frequency?: number;
  avg_premium_per_policy?: number;
  avg_loss_per_case?: number;
  expense_amount?: number; // 衍生费用额

  premium_share?: number;

  // --- Change values (环比/同比 in percentage points or relative % based on the metric) ---
  premium_writtenChange?: number;
  premium_earnedChange?: number;
  total_loss_amountChange?: number;
  expense_amount_rawChange?: number;
  policy_countChange?: number;
  claim_countChange?: number;
  policy_count_earnedChange?: number;
  avg_commercial_indexChange?: number; // Usually N/A for changes

  loss_ratioChange?: number;
  expense_ratioChange?: number;
  variable_cost_ratioChange?: number;
  premium_earned_ratioChange?: number;
  claim_frequencyChange?: number;
  avg_premium_per_policyChange?: number;
  avg_loss_per_caseChange?: number;
  expense_amountChange?: number;
  
  // --- Fields to assist in calculating aggregated ratios correctly ---
  // These are sums of the base values from V4BusinessDataEntry for the selected lines
  sum_premium_written_for_ratio_calc: number;
  sum_premium_earned_for_ratio_calc: number;
  sum_total_loss_amount_for_ratio_calc: number;
  sum_expense_amount_raw_for_ratio_calc: number;
  sum_claim_count_for_ratio_calc?: number;
  sum_policy_count_earned_for_ratio_calc?: number;
  // sum_derived_policy_count_for_avg_premium_calc should use the aggregated policy_count
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
  data: string;
  filters: string;
  analysisMode: AnalysisMode;
  currentPeriodLabel: string;
}

// For period selection dropdown
export interface PeriodOption {
  value: string; // period_id
  label: string; // period_label
}


// V4.0 field names for ranking and trend metrics used in page.tsx
export type RankingMetricKey = keyof Pick<ProcessedDataForPeriod, 'premium_written' | 'total_loss_amount' | 'policy_count' | 'loss_ratio' | 'expense_ratio' | 'variable_cost_ratio'>;
export type TrendMetricKey = keyof Pick<ProcessedDataForPeriod, 'premium_written' | 'total_loss_amount' | 'policy_count' | 'loss_ratio' | 'expense_ratio' | 'variable_cost_ratio' | 'premium_earned' | 'expense_amount_raw' | 'claim_count' | 'policy_count_earned'>;

export interface BusinessLineBasic { // Renamed to avoid conflict with old BusinessLine
  id: string;
  name: string;
  icon?: LucideIcon;
  // Remove data field as it's now sourced from V4
}
