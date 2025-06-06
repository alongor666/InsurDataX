
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AnalysisModeToggle } from '@/components/shared/analysis-mode-toggle';
import type { AnalysisMode, PeriodOption, DashboardView } from '@/data/types';
import { Sparkles, Settings2, LayoutDashboard, LineChart, BarChartHorizontal, Rows3, ScanLine } from 'lucide-react'; // Added more icons
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from '@/components/ui/separator';


interface AppHeaderProps {
  analysisMode: AnalysisMode;
  onAnalysisModeChange: (mode: AnalysisMode) => void;
  onAiSummaryClick: () => void;
  selectedPeriod: string; 
  onPeriodChange: (period: string) => void;
  isAiSummaryLoading: boolean;
  periodOptions: PeriodOption[];
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

export function AppHeader({ 
  analysisMode, 
  onAnalysisModeChange, 
  onAiSummaryClick,
  selectedPeriod,
  onPeriodChange,
  isAiSummaryLoading,
  periodOptions,
  activeView,
  onViewChange,
}: AppHeaderProps) {

  const viewOptions: {label: string, value: DashboardView, icon: React.ElementType}[] = [
    { label: "KPI看板", value: "kpi", icon: LayoutDashboard },
    { label: "趋势图", value: "trend", icon: LineChart },
    { label: "气泡图", value: "bubble", icon: ScanLine }, // Using ScanLine as a proxy for bubble
    { label: "排名图", value: "bar_rank", icon: BarChartHorizontal },
    { label: "数据表", value: "data_table", icon: Rows3 },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          {/* <Image src="/logo.svg" alt="车险分析" width={32} height={32} /> */}
          <span className="font-headline text-xl font-bold text-primary">车险经营分析周报</span>
        </Link>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            <Select value={selectedPeriod} onValueChange={onPeriodChange} disabled={periodOptions.length === 0}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder={periodOptions.length > 0 ? "选择数据周期" : "加载周期中..."} />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AnalysisModeToggle currentMode={analysisMode} onModeChange={onAnalysisModeChange} />
          
          <Button onClick={onAiSummaryClick} variant="outline" size="sm" disabled={isAiSummaryLoading}>
            <Sparkles className={`mr-2 h-4 w-4 ${isAiSummaryLoading ? 'animate-spin' : ''}`} />
            {isAiSummaryLoading ? '生成中...' : 'AI智能业务摘要'}
          </Button>
        </div>
      </div>
      <Separator />
      <div className="container flex h-12 items-center justify-center space-x-2">
        {viewOptions.map(option => (
          <Button
            key={option.value}
            variant={activeView === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => onViewChange(option.value)}
            className="h-8"
          >
            <option.icon className="mr-2 h-4 w-4" />
            {option.label}
          </Button>
        ))}
      </div>
    </header>
  );
}
