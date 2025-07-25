
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AnalysisModeToggle } from '@/components/shared/analysis-mode-toggle';
import type { AnalysisMode, PeriodOption, DashboardView } from '@/data/types';
import { Settings2, LayoutDashboard, LineChart, BarChartHorizontal, Rows3, ScanLine, ListFilter, Download, PieChartIcon, AreaChart, Check, Undo2, Eraser, MousePointerClick, CheckSquare, Square, LogOut, UserCircle, XCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'; 
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-provider'; 

interface AppHeaderProps {
  analysisMode: AnalysisMode;
  onAnalysisModeChange: (mode: AnalysisMode) => void;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  selectedComparisonPeriod: string | null; 
  onComparisonPeriodChange: (periodKey: string | null) => void; 
  periodOptions: PeriodOption[];
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  allBusinessTypes: string[];
  selectedBusinessTypes: string[];
  onSelectedBusinessTypesChange: (types: string[]) => void;
  onExportClick: () => void;
}

export function AppHeader({
  analysisMode,
  onAnalysisModeChange,
  selectedPeriod,
  onPeriodChange,
  selectedComparisonPeriod, 
  onComparisonPeriodChange, 
  periodOptions,
  activeView,
  onViewChange,
  allBusinessTypes,
  selectedBusinessTypes,
  onSelectedBusinessTypesChange,
  onExportClick,
}: AppHeaderProps) {

  const { currentUser, logout, isLoadingAuth } = useAuth(); 
  const [businessTypeDropdownOpen, setBusinessTypeDropdownOpen] = useState(false);
  const [pendingSelectedTypes, setPendingSelectedTypes] = useState<string[]>(selectedBusinessTypes);

  useEffect(() => {
    if (businessTypeDropdownOpen) {
      setPendingSelectedTypes(selectedBusinessTypes);
    }
  }, [businessTypeDropdownOpen, selectedBusinessTypes]);

  const handleSelectAllPending = (event: Event) => {
    event.preventDefault(); 
    setPendingSelectedTypes([...allBusinessTypes].sort((a,b) => a.localeCompare(b)));
  };

  const handleInvertSelectionPending = (event: Event) => {
    event.preventDefault(); 
    setPendingSelectedTypes(
      allBusinessTypes.filter(bt => !pendingSelectedTypes.includes(bt)).sort((a,b) => a.localeCompare(b))
    );
  };

  const handleClearSelectionDirectly = () => {
    onSelectedBusinessTypesChange([]);
    setPendingSelectedTypes([]); 
    setBusinessTypeDropdownOpen(false);
  };

  const handleTogglePendingType = (type: string) => {
    const newSelection = pendingSelectedTypes.includes(type)
      ? pendingSelectedTypes.filter(t => t !== type)
      : [...pendingSelectedTypes, type];
    setPendingSelectedTypes(newSelection.sort((a,b) => a.localeCompare(b)));
  };

  const handleSelectOnlyDirectly = (type: string) => {
    onSelectedBusinessTypesChange([type]);
    setPendingSelectedTypes([type]);
    setBusinessTypeDropdownOpen(false);
  };

  const handleConfirmPending = () => {
    onSelectedBusinessTypesChange(pendingSelectedTypes);
    setBusinessTypeDropdownOpen(false);
  };

  const handleCancel = () => {
    setBusinessTypeDropdownOpen(false); 
  };


  const viewOptions: {label: string, value: DashboardView, icon: React.ElementType}[] = [
    { label: "KPI看板", value: "kpi", icon: LayoutDashboard },
    { label: "趋势图", value: "trend", icon: LineChart },
    { label: "气泡图", value: "bubble", icon: ScanLine },
    { label: "排名图", value: "bar_rank", icon: BarChartHorizontal },
    { label: "占比图", value: "share_chart", icon: PieChartIcon },
    { label: "帕累托图", value: "pareto", icon: AreaChart },
    { label: "数据表", value: "data_table", icon: Rows3 },
  ];
  
  const comparisonPeriodOptions = periodOptions.filter(option => option.value !== selectedPeriod);

  if (isLoadingAuth || !currentUser) { 
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-headline text-xl font-bold text-primary">车险经营分析周报</span>
          </Link>
          {currentUser && !isLoadingAuth && ( 
             <Button onClick={logout} variant="outline" size="sm" className="h-9 text-xs md:text-sm">
              <LogOut className="mr-1 md:mr-1.5 h-4 w-4" />
              登出
            </Button>
          )}
        </div>
      </header>
    );
  }


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex flex-col md:flex-row h-auto items-center justify-between gap-y-2 py-3 md:py-0 md:h-16">
        <Link href="/" className="mr-6 flex items-center space-x-2 self-start md:self-center">
          <span className="font-headline text-xl font-bold text-primary">车险经营分析周报</span>
        </Link>

        <div className="flex flex-wrap items-center justify-start md:justify-end flex-grow gap-x-2.5 gap-y-2 md:gap-x-3">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 md:gap-x-3">
            <Select value={selectedPeriod} onValueChange={onPeriodChange} disabled={periodOptions.length === 0}>
              <SelectTrigger className="w-auto md:w-[160px] h-9 text-xs md:text-sm">
                <SelectValue placeholder={periodOptions.length > 0 ? "选择当前周期" : "加载周期中..."} />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="text-xs md:text-sm">{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          
            <div className="relative flex items-center">
              <Select
                value={selectedComparisonPeriod || "default"} 
                onValueChange={(value) => onComparisonPeriodChange(value === "default" ? null : value)}
                disabled={periodOptions.length === 0 || !selectedPeriod}
              >
                <SelectTrigger className="w-auto md:w-[170px] h-9 text-xs md:text-sm pr-8">
                  <SelectValue placeholder={periodOptions.length > 0 ? "选择对比周期" : "选择当前期"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default" className="text-xs md:text-sm">默认对比 (智能环比)</SelectItem>
                  <Separator />
                  {comparisonPeriodOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} className="text-xs md:text-sm">{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedComparisonPeriod && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => onComparisonPeriodChange(null)} 
                      >
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>清除对比周期 (恢复智能环比)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            <DropdownMenu open={businessTypeDropdownOpen} onOpenChange={setBusinessTypeDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 text-xs md:text-sm px-2.5 md:px-3">
                  <ListFilter className="mr-1 md:mr-1.5 h-4 w-4" />
                  {selectedBusinessTypes.length === 0 && "全部业务"}
                  {selectedBusinessTypes.length === 1 && (allBusinessTypes.find(bt=>bt === selectedBusinessTypes[0])?.length ?? 0 > 8 ? (allBusinessTypes.find(bt=>bt === selectedBusinessTypes[0])?.substring(0,6) + "...") : selectedBusinessTypes[0])}
                  {selectedBusinessTypes.length > 1 && `${selectedBusinessTypes.length}项业务`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 max-h-[calc(100vh-200px)] overflow-y-auto">
                <DropdownMenuLabel className="text-xs md:text-sm">筛选业务类型</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={(e) => handleSelectAllPending(e)} className="text-xs md:text-sm cursor-pointer">
                  <CheckSquare className="mr-2 h-4 w-4" /> 全选
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => handleInvertSelectionPending(e)} className="text-xs md:text-sm cursor-pointer">
                  <Undo2 className="mr-2 h-4 w-4" /> 反选
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleClearSelectionDirectly} className="text-xs md:text-sm cursor-pointer">
                  <Eraser className="mr-2 h-4 w-4" /> 清除
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="max-h-60 overflow-y-auto py-1">
                  {allBusinessTypes.map((type) => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={pendingSelectedTypes.includes(type)}
                      onCheckedChange={() => handleTogglePendingType(type)}
                      onSelect={(e) => e.preventDefault()} 
                      className="text-xs md:text-sm group flex items-center justify-between pr-2"
                    >
                      <span className="truncate max-w-[160px] sm:max-w-[180px]">{type}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-opacity !p-1 h-auto text-xs"
                        onClick={(e) => {
                          e.stopPropagation(); 
                          handleSelectOnlyDirectly(type);
                        }}
                      >
                        仅此项
                      </Button>
                    </DropdownMenuCheckboxItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <div className="flex justify-end gap-2 p-2 sticky bottom-0 bg-popover border-t border-muted">
                  <Button variant="outline" size="sm" onClick={handleCancel} className="text-xs">取消</Button>
                  <Button size="sm" onClick={handleConfirmPending} className="text-xs">确认</Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <AnalysisModeToggle currentMode={analysisMode} onModeChange={onAnalysisModeChange} />
          </div>

          <Separator orientation="vertical" className="h-6 hidden md:inline-flex mx-1 md:mx-2 self-center" />

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 md:gap-x-3">
             <Button onClick={onExportClick} variant="outline" size="sm" className="h-9 text-xs md:text-sm">
              <Download className="mr-1 md:mr-1.5 h-4 w-4" />
              导出
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <UserCircle className="h-5 w-5" />
                  <span className="sr-only">用户菜单</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs">
                  {currentUser?.email || "用户"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-xs cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  登出
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      <Separator />

      <div className="container flex h-12 items-center justify-center space-x-1 md:space-x-2 overflow-x-auto">
        {viewOptions.map(option => (
          <Button
            key={option.value}
            variant={activeView === option.value ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => onViewChange(option.value)}
            className="h-8 text-xs md:text-sm shrink-0 px-2.5 md:px-3"
          >
            <option.icon className="mr-1 md:mr-1.5 h-4 w-4" />
            {option.label}
          </Button>
        ))}
      </div>
    </header>
  );
}

