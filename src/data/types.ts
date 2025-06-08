
import type { LucideIcon as ActualLucideIcon } from 'lucide-react'; // Keep actual for other uses if any

export type AnalysisMode = 'cumulative' | 'periodOverPeriod'; // 累计数据 | 当周发生额
export type DashboardView = 'kpi' | 'trend' | 'bubble' | 'bar_rank' | 'share_chart' | 'data_table'; // Added 'share_chart'
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
  comparison_period_id_yoy?: string | null; // Retained for potential future use but not actively used for KPI card secondary line now
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
  avg_commercial_index?: number | null; // Will be undefined/null for aggregates

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
  icon?: string; 

  currentMetrics: AggregatedBusinessMetrics;
  // momMetrics will now represent the single comparison period (either actual MoM or user-selected comparison)
  momMetrics?: AggregatedBusinessMetrics | null; 
  // yoyMetrics is being phased out from direct KPI card display based on new req, but kept in type for now if data-utils still populates it for other reasons.
  yoyMetrics?: AggregatedBusinessMetrics | null; 

  premium_written: number;
  total_loss_amount: number;
  policy_count: number;
  loss_ratio: number;
  expense_ratio: number;
  variable_cost_ratio: number;
  vcr_color?: string;

  // These specific change fields might be deprecated if Kpi type handles it generally
  premium_writtenChange?: number;
  total_loss_amountChange?: number;
  policy_countChange?: number;
  loss_ratioChange?: number; // This is pp change
  expense_ratioChange?: number; // This is pp change

  premium_share?: number;
}

export interface Kpi {
  id: string;
  title: string;
  value: string;
  rawValue?: number;
  description?: string;
  icon?: string; 
  unit?: string; 
  isRisk?: boolean;
  isBorderRisk?: boolean;
  isOrangeRisk?: boolean;

  comparisonLabel?: string;      // e.g., "环比", "对比 2025-W20"
  comparisonChange?: string;       // e.g., "+5.0%", "-2.1 pp" (percentage or pp string)
  comparisonChangeAbsolute?: string; // e.g., "+100 万元" (absolute change string)
  comparisonChangeType?: 'positive' | 'negative' | 'neutral';
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

export interface ShareChartDataItem {
  name: string; // Business line name
  value: number; // Actual value for the selected metric
  percentage: number; // Calculated share percentage
  color?: string; // VCR-based color
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
// Metrics suitable for share calculation (absolute values, non-rates/non-coefficients)
export type ShareChartMetricKey = 
  | 'premium_written' 
  | 'premium_earned' 
  | 'total_loss_amount' 
  | 'expense_amount' 
  | 'policy_count' 
  | 'claim_count'
  | 'policy_count_earned' // Though derived, it's a count
  | 'marginal_contribution_amount';

export interface BusinessLineBasic {
  id: string;
  name: string;
}
