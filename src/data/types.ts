
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

  claim_count?: number;             // 赔案数量 (件/次)
  policy_count_earned?: number;     // 满期保单数量 (件) - 用于满期出险率分母

  // --- 单业务类型预计算值 (YTD values from JSON, for direct use if single type selected, or validation) ---
  avg_premium_per_policy?: number;   // 单均保费 (元)
  avg_loss_per_case?: number;        // 案均赔款 (元)
  avg_commercial_index?: number;     // 自主系数 (无单位)

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
// This holds values for a specific period (current or comparison)
// AND for a specific analysis mode (cumulative/YTD or periodOverPeriod/current_week_actuals).
// It also holds the calculated changes (环比, 同比).
export interface ProcessedDataForPeriod {
  businessLineId: string; 
  businessLineName: string;
  icon?: LucideIcon;

  // --- V4.0 Core Metrics (Values are AFTER 'cumulative' or 'periodOverPeriod' logic and aggregation) ---
  premium_written: number;
  premium_earned: number;
  total_loss_amount: number; 
  // expense_amount: number; // This was derived. Let's ensure V4 uses expense_amount_raw primarily and derive expense_amount in calculateKpis or display logic.
  
  policy_count: number; 
  claim_count?: number; 
  policy_count_earned?: number; // Added for claim_frequency calculation base

  avg_premium_per_policy?: number; 
  avg_loss_per_case?: number;      

  loss_ratio: number;             
  expense_ratio: number;          
  variable_cost_ratio: number;    
  premium_earned_ratio?: number;   
  claim_frequency?: number;        
  
  premium_share?: number; 

  // --- Change values (环比/同比 in percentage points or relative % based on the metric) ---
  premium_writtenChange?: number;
  premium_earnedChange?: number;
  total_loss_amountChange?: number;
  // expense_amountChange?: number;
  policy_countChange?: number;
  claim_countChange?: number;
  avg_premium_per_policyChange?: number;
  avg_loss_per_caseChange?: number;
  loss_ratioChange?: number; 
  expense_ratioChange?: number; 
  variable_cost_ratioChange?: number; 
  premium_earned_ratioChange?: number; 
  claim_frequencyChange?: number; 

  // Fields needed for direct aggregation of ratios (from V4BusinessDataEntry for selected lines for the *current period* or *current week's actuals*)
  sum_premium_written_for_ratio_calc: number; 
  sum_premium_earned_for_ratio_calc: number;  
  sum_total_loss_amount_for_ratio_calc: number; 
  sum_expense_amount_raw_for_ratio_calc: number; 
  sum_claim_count_for_ratio_calc?: number;        
  sum_policy_count_earned_for_ratio_calc?: number; 
  sum_derived_policy_count_for_avg_premium_calc?: number; // V4 might not need this if policy_count is directly from V4BusinessDataEntry or derived consistently
  
  // Fields from V4BusinessDataEntry that are essential for calculations and might be passed through
  expense_amount_raw: number; // Keep raw expense amount for consistent calculation
}


export interface Kpi {
  id: string;
  title: string;
  value: string; 
  rawValue?: number; 
  change?: string; // Period-over-period (环比)
  changeType?: 'positive' | 'negative' | 'neutral';
  yoyChange?: string; // Year-over-year (同比)
  yoyChangeType?: 'positive' | 'negative' | 'neutral';
  description?: string;
  icon?: LucideIcon;
  isRisk?: boolean; // General risk for border or text color if not overridden
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
export type TrendMetricKey = keyof Pick<ProcessedDataForPeriod, 'premium_written' | 'total_loss_amount' | 'policy_count' | 'loss_ratio' | 'expense_ratio' | 'variable_cost_ratio' | 'premium_earned' | 'expense_amount_raw'>; // Changed expense_amount to expense_amount_raw

// --- Old types to be phased out ---
// These are from the previous mock data structure
// export interface MonthlyData { // No longer used with V4 data
//   date: string; // "YYYY-MM"
//   value: number;
// }

// export interface BusinessLine { // This is effectively replaced by V4BusinessDataEntry for input and ProcessedDataForPeriod for output
//   id: string;
//   name: string;
//   icon?: LucideIcon;
// }
