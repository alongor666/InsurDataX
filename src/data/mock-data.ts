import type { BusinessLine } from './types';
import { Truck, Car, ShieldAlert, DollarSign, TrendingUp, TrendingDown, Percent, FilePlus, RefreshCcw, AlertTriangle } from 'lucide-react';

const generateMonthlyData = (startDate: string, numMonths: number, baseValue: number, trend: (monthIndex: number) => number): { date: string, value: number }[] => {
  const data = [];
  let currentDate = new Date(startDate + '-01');
  for (let i = 0; i < numMonths; i++) {
    data.push({
      date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
      value: Math.max(0, Math.round(baseValue * trend(i) * (0.9 + Math.random() * 0.2))) // Fluctuation
    });
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  return data;
};

export const mockBusinessLines: BusinessLine[] = [
  {
    id: 'commercial',
    name: '商业车险', // Commercial Auto
    icon: Truck,
    data: {
      premium: generateMonthlyData('2023-01', 18, 1000000, i => 1 + i * 0.02), // Increasing trend
      claims: generateMonthlyData('2023-01', 18, 600000, i => 1 + i * 0.015 + Math.sin(i/3)*0.05), // Slight increase with seasonality
      policies: generateMonthlyData('2023-01', 18, 500, i => 1 + i * 0.01), // Slight increase
    },
  },
  {
    id: 'private',
    name: '私家车险', // Private Passenger Auto
    icon: Car,
    data: {
      premium: generateMonthlyData('2023-01', 18, 1500000, i => 1.05 + i * 0.025), // Stronger increasing trend
      claims: generateMonthlyData('2023-01', 18, 700000, i => 1 + i * 0.02 + Math.cos(i/4)*0.06), // Increasing with seasonality
      policies: generateMonthlyData('2023-01', 18, 1200, i => 1 + i * 0.015), // Moderate increase
    },
  },
  {
    id: 'specialty',
    name: '特种车辆险', // Specialty Vehicles
    icon: ShieldAlert, // Placeholder icon
    data: {
      premium: generateMonthlyData('2023-01', 18, 500000, i => 0.95 - i * 0.01), // Decreasing trend initially then stable
      claims: generateMonthlyData('2023-01', 18, 300000, i => 1 - i*0.005 + Math.sin(i/2)*0.1), // Fluctuating
      policies: generateMonthlyData('2023-01', 18, 150, i => 1 - i*0.005), // Slight decrease
    },
  },
];

// Calculate loss ratio for mock data
mockBusinessLines.forEach(line => {
  line.data.lossRatio = line.data.premium.map((p, index) => {
    const claimData = line.data.claims[index];
    if (p.value === 0) return { date: p.date, value: 0 };
    return {
      date: p.date,
      value: parseFloat(((claimData.value / p.value) * 100).toFixed(2))
    };
  });
});

export const defaultDateRangeOptions = [
  { label: '最近3个月', value: '3m' },
  { label: '最近6个月', value: '6m' },
  { label: '最近12个月', value: '12m' },
  { label: '今年至今', value: 'ytd'},
];

export const getDefaultDateRange = (): { from: Date, to: Date } => {
  const to = new Date();
  const from = new Date();
  from.setMonth(to.getMonth() - 2); // Default to last 3 months (current month + 2 previous)
  from.setDate(1);
  return { from, to };
};
