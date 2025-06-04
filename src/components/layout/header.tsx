import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AnalysisModeToggle } from '@/components/shared/analysis-mode-toggle';
import type { AnalysisMode } from '@/data/types';
import { Sparkles, Settings2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { defaultDateRangeOptions } from '@/data/mock-data';


interface AppHeaderProps {
  analysisMode: AnalysisMode;
  onAnalysisModeChange: (mode: AnalysisMode) => void;
  onAiSummaryClick: () => void;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  isAiSummaryLoading: boolean;
}

export function AppHeader({ 
  analysisMode, 
  onAnalysisModeChange, 
  onAiSummaryClick,
  selectedPeriod,
  onPeriodChange,
  isAiSummaryLoading,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-headline text-xl font-bold text-primary">车险经营分析周报</span>
        </Link>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            <Select value={selectedPeriod} onValueChange={onPeriodChange}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="选择数据周期" />
              </SelectTrigger>
              <SelectContent>
                {defaultDateRangeOptions.map(option => (
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
    </header>
  );
}
