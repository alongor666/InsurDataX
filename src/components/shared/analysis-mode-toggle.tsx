"use client";

import type { AnalysisMode } from '@/data/types';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface AnalysisModeToggleProps {
  currentMode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
}

export function AnalysisModeToggle({ currentMode, onModeChange }: AnalysisModeToggleProps) {
  const handleToggle = (checked: boolean) => {
    onModeChange(checked ? 'periodOverPeriod' : 'cumulative');
  };

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="analysis-mode" className="text-sm">累计数据</Label>
      <Switch
        id="analysis-mode"
        checked={currentMode === 'periodOverPeriod'}
        onCheckedChange={handleToggle}
        aria-label={`Switch to ${currentMode === 'cumulative' ? '环比数据' : '累计数据'}`}
      />
      <Label htmlFor="analysis-mode" className="text-sm">环比数据</Label>
    </div>
  );
}
