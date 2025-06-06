
// This file is no longer the primary source of data.
// Data will be loaded from public/data/insurance_data_v4.json
// This file can be removed or repurposed if other specific mock data is needed elsewhere.

import type { PeriodOption } from './types';
import { Truck, Car, ShieldAlert } from 'lucide-react';

// Example: Mapping business_type to icons. This could be expanded.
export const businessLineIcons: { [key: string]: React.ElementType } = {
  '非营业客车新车': Car,
  '私家车险': Car,
  '营业货车': Truck,
  '特种车辆险': ShieldAlert,
  // Add more mappings as needed
};


// Placeholder for default period options if needed before data loads,
// but ideally, this should be derived from the loaded V4PeriodData.
export const FallbackPeriodOptions: PeriodOption[] = [
  { label: '加载中...', value: '' },
];

// This function is also likely to be replaced by logic that extracts periods
// from the loaded V4PeriodData.
export const getFallbackDefaultPeriod = (): string => {
  return ''; // No default period until data is loaded
};

// The old mockBusinessLines and generateMonthlyData are no longer used
// for the main dashboard data.

export const getDefaultDateRange = (): { from: Date, to: Date } => {
  // This function is part of the old date-based system and will be replaced
  // by a period_id based system. For now, returning a placeholder.
  // It should not be used by new V4 data logic.
  const to = new Date();
  const from = new Date();
  from.setMonth(to.getMonth() - 2); 
  from.setDate(1);
  return { from, to };
};

export const defaultDateRangeOptions = [
  { label: '最近3个月', value: '3m' },
  { label: '最近6个月', value: '6m' },
  { label: '最近12个月', value: '12m' },
  { label: '今年至今', value: 'ytd'},
];

