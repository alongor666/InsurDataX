
import type { LucideIcon as ActualLucideIcon } from 'lucide-react'; // Keep actual for other uses if any

export type AnalysisMode = 'cumulative' | 'periodOverPeriod'; // 累计数据 | 当周发生额
export type DashboardView = 'kpi' | 'trend' | 'bubble' | 'bar_rank' | 'data_table';
export type DataSourceType = 'json' | 'db';

// V4.0 JSON Structure Types
export interface V4BusinessDataEntry {
  business_type: string;

  // --- 聚合计算基础字段 (YTD values from JSON) ---
  premium_written: number;
  premium_earned: number;
  total_loss_amount: number;
  expense_amount_raw: number;

  claim_count?: number | null;
  policy_count_earned?: number | null;

  // --- 单业务类型预计算值 (YTD values from JSON, for direct use if single type selected, or validation) ---
  avg_premium_per_policy?: number | null;
  avg_loss_per_case?: number | null;
  avg_commercial_index?: number | null;

  loss_ratio?: number | null;
  expense_ratio?: number | null;
  variable_cost_ratio?: number | null;
  premium_earned_ratio?: number | null;
  claim_frequency?: number | null;
}

export interface V4PeriodTotals {
  total_premium_written_overall?: number;
}

export interface V4PeriodData {
  period_id: string;
  period_label: string;
  comparison_period_id_yoy?: string | null;
  comparison_period_id_mom?: string | null;
  business_data: V4BusinessDataEntry[];
  totals_for_period?: V4PeriodTotals | null;
}

export interface AggregatedBusinessMetrics {
  premium_written: number;
  premium_earned: number;
  total_loss_amount: number;
  expense_amount_raw: number;
  policy_count: number;
  claim_count: number;
  policy_count_earned: number;
  avg_commercial_index?: number | null;

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

export interface ProcessedDataForPeriod {
  businessLineId: string;
  businessLineName: string;
  icon?: string; // This might be deprecated for KPIs if units take over

  currentMetrics: AggregatedBusinessMetrics;
  momMetrics?: AggregatedBusinessMetrics | null; // Represents data for 'month-over-month' or 'custom comparison' period
  yoyMetrics?: AggregatedBusinessMetrics | null; // Represents data for 'year-over-year' period, null if custom comparison active

  premium_written: number;
  total_loss_amount: number;
  policy_count: number;
  loss_ratio: number;
  expense_ratio: number;
  variable_cost_ratio: number;
  vcr_color?: string;

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
  description?: string;
  icon?: string; // Will be used for rates/coefficients
  unit?: string; // Will be used for absolute value KPIs (e.g., "万元", "元", "件")
  isRisk?: boolean;
  isBorderRisk?: boolean;
  isOrangeRisk?: boolean;

  primaryComparisonLabel?: string; // e.g., "环比", "对比 2025-W20"
  primaryChange?: string;          // e.g., "+5.0%", "-2.1 pp"
  primaryChangeAbsolute?: string;  // e.g., "+100 万元"
  primaryChangeType?: 'positive' | 'negative' | 'neutral';

  secondaryComparisonLabel?: string; // e.g., "同比", null if custom comparison active
  secondaryChange?: string;
  secondaryChangeAbsolute?: string;
  secondaryChangeType?: 'positive' | 'negative' | 'neutral';
}

export interface ChartDataItem {
  name: string;
  color?: string;
  vcr?: number;
  [key: string]: number | string | undefined;
}

export interface BubbleChartDataItem {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  color?: string;
  vcr?: number;
}

export interface AiSummaryInput {
  data: string;
  filters: string;
  analysisMode: AnalysisMode;
  currentPeriodLabel: string;
}

export interface PeriodOption {
  value: string;
  label: string;
}

export type CoreAggregatedMetricKey = keyof AggregatedBusinessMetrics;
export type RankingMetricKey = Exclude<CoreAggregatedMetricKey, 'avg_commercial_index' | 'expense_amount_raw' >;
export type TrendMetricKey = Exclude<CoreAggregatedMetricKey, 'avg_commercial_index' | 'expense_amount_raw' >;
export type BubbleMetricKey = Exclude<CoreAggregatedMetricKey, 'avg_commercial_index' | 'expense_amount_raw'>;

export interface BusinessLineBasic {
  // This type might be needed if we simplify data for selectors or other UI elements
  id: string;
  name: string;
}
