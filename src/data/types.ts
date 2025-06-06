
import type { LucideIcon as ActualLucideIcon } from 'lucide-react'; // Keep actual for other uses if any

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

  marginal_contribution_ratio: number; 
  marginal_contribution_amount: number; 
}


// Processed data structure for use in components.
export interface ProcessedDataForPeriod {
  businessLineId: string;
  businessLineName: string;
  icon?: string; 

  currentMetrics: AggregatedBusinessMetrics;
  momMetrics?: AggregatedBusinessMetrics | null; 
  yoyMetrics?: AggregatedBusinessMetrics | null; 
  
  premium_written: number;
  total_loss_amount: number;
  policy_count: number;
  loss_ratio: number;
  expense_ratio: number;
  variable_cost_ratio: number; 
  vcr_color?: string; // Color based on variable_cost_ratio

  premium_writtenChange?: number;
  total_loss_amountChange?: number;
  policy_countChange?: number;
  loss_ratioChange?: number;
  expense_ratioChange?: number;

  premium_share?: number;
}


export interface Kpi {
  id: string;
  title: string;
  value: string;
  rawValue?: number;
  change?: string; 
  changeAbsolute?: string; 
  changeType?: 'positive' | 'negative' | 'neutral';
  yoyChange?: string; 
  yoyChangeAbsolute?: string; 
  yoyChangeType?: 'positive' | 'negative' | 'neutral';
  description?: string;
  icon?: string; 
  isRisk?: boolean; 
  isBorderRisk?: boolean; 
  isOrangeRisk?: boolean; 
}

// For charts
export interface ChartDataItem {
  name: string; 
  color?: string; // For dynamic coloring
  [key: string]: number | string | undefined; 
}

export interface BubbleChartDataItem {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  color?: string; // For dynamic coloring
  vcr?: number; // To pass variable_cost_ratio for tooltip or other uses
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
export type RankingMetricKey = Exclude<keyof AggregatedBusinessMetrics, 'avg_commercial_index' | 'expense_amount_raw'>;
export type TrendMetricKey = Exclude<keyof AggregatedBusinessMetrics, 'avg_commercial_index' | 'expense_amount_raw'>;
export type BubbleMetricKey = Exclude<keyof AggregatedBusinessMetrics, 'avg_commercial_index' | 'expense_amount_raw' | 'marginal_contribution_amount' | 'marginal_contribution_ratio'>;


export interface BusinessLineBasic { 
  id: string;
  name: string;
  icon?: ActualLucideIcon; 
}
