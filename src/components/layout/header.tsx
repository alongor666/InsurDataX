import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AnalysisModeToggle } from '@/components/shared/analysis-mode-toggle';
import type { AnalysisMode, PeriodOption, DashboardView, DataSourceType } from '@/data/types';
import { Sparkles, Settings2, LayoutDashboard, LineChart, BarChartHorizontal, Rows3, ScanLine, ListFilter, Download, Database, FileJson } from 'lucide-react'; 
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
  allBusinessTypes: string[];
  selectedBusinessTypes: string[];
  onSelectedBusinessTypesChange: (types: string[]) => void;
  onExportClick: () => void;
  currentDataSource: DataSourceType;
  onDataSourceChange: (source: DataSourceType) => void;
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
  allBusinessTypes,
  selectedBusinessTypes,
  onSelectedBusinessTypesChange,
  onExportClick,
  currentDataSource,
  onDataSourceChange,
}: AppHeaderProps) {

  const viewOptions: {label: string, value: DashboardView, icon: React.ElementType}[] = [
    { label: "KPI看板", value: "kpi", icon: LayoutDashboard },
    { label: "趋势图", value: "trend", icon: LineChart },
    { label: "气泡图", value: "bubble", icon: ScanLine }, 
    { label: "排名图", value: "bar_rank", icon: BarChartHorizontal },
    { label: "数据表", value: "data_table", icon: Rows3 },
  ];

  const dataSourceOptions: {label: string, value: DataSourceType, icon: React.ElementType}[] = [
      {label: "JSON文件", value: "json", icon: FileJson},
      {label: "PostgreSQL数据库", value: "db", icon: Database}
  ];

  const handleSelectAllBusinessTypes = () => {
    if (selectedBusinessTypes.length === allBusinessTypes.length && allBusinessTypes.length > 0) { 
      onSelectedBusinessTypesChange([]); 
    } else {
      onSelectedBusinessTypesChange([...allBusinessTypes]); 
    }
  };

  const handleInvertBusinessTypesSelection = () => {
    const newSelection = allBusinessTypes.filter(
      bt => !selectedBusinessTypes.includes(bt)
    );
    onSelectedBusinessTypesChange(newSelection);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between flex-wrap gap-y-2 md:gap-y-0">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-headline text-xl font-bold text-primary">车险经营分析周报</span>
        </Link>
        
        <div className="flex items-center space-x-1 md:space-x-2 flex-wrap gap-y-1">
          <div className="flex items-center space-x-1 md:space-x-2">
            <Select value={currentDataSource} onValueChange={(value) => onDataSourceChange(value as DataSourceType)}>
                <SelectTrigger className="w-[120px] md:w-[150px] h-9 text-xs md:text-sm">
                    <SelectValue placeholder="选择数据源"/>
                </SelectTrigger>
                <SelectContent>
                    {dataSourceOptions.map(option => (
                        <SelectItem key={option.value} value={option.value} className="text-xs md:text-sm">
                           <div className="flex items-center">
                             <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                             {option.label}
                           </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-1 md:space-x-2">
            <Settings2 className="h-5 w-5 text-muted-foreground hidden md:block" />
            <Select value={selectedPeriod} onValueChange={onPeriodChange} disabled={periodOptions.length === 0}>
              <SelectTrigger className="w-[130px] md:w-[170px] h-9 text-xs md:text-sm">
                <SelectValue placeholder={periodOptions.length > 0 ? "选择数据周期" : "加载周期中..."} />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="text-xs md:text-sm">{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 text-xs md:text-sm px-2 md:px-3">
                <ListFilter className="mr-1 md:mr-2 h-4 w-4" />
                {selectedBusinessTypes.length === 0 && "全部业务"}
                {selectedBusinessTypes.length === 1 && (selectedBusinessTypes[0].length > 5 ? selectedBusinessTypes[0].substring(0,4) + "..." : selectedBusinessTypes[0])}
                {selectedBusinessTypes.length > 1 && `${selectedBusinessTypes.length}项业务`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60 max-h-96 overflow-y-auto">
              <DropdownMenuLabel className="text-xs md:text-sm">选择业务类型</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleSelectAllBusinessTypes} className="text-xs md:text-sm cursor-pointer">
                {selectedBusinessTypes.length === allBusinessTypes.length && allBusinessTypes.length > 0 ? "清除选择" : "全选"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleInvertBusinessTypesSelection} className="text-xs md:text-sm cursor-pointer">
                反选
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {allBusinessTypes.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={selectedBusinessTypes.includes(type)}
                  onCheckedChange={(checked) => {
                    const newSelection = checked
                      ? [...selectedBusinessTypes, type]
                      : selectedBusinessTypes.filter(t => t !== type);
                    onSelectedBusinessTypesChange(newSelection.sort((a,b) => a.localeCompare(b)));
                  }}
                  className="text-xs md:text-sm"
                >
                  {type}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <AnalysisModeToggle currentMode={analysisMode} onModeChange={onAnalysisModeChange} />
          
          <Button onClick={onAiSummaryClick} variant="outline" size="sm" disabled={isAiSummaryLoading} className="h-9 text-xs md:text-sm">
            <Sparkles className={`mr-1 md:mr-2 h-4 w-4 ${isAiSummaryLoading ? 'animate-spin' : ''}`} />
            {isAiSummaryLoading ? '生成中...' : 'AI摘要'}
          </Button>
           <Button onClick={onExportClick} variant="outline" size="sm" className="h-9 text-xs md:text-sm">
            <Download className="mr-1 md:mr-2 h-4 w-4" />
            导出
          </Button>
        </div>
      </div>
      <Separator />
      <div className="container flex h-12 items-center justify-center space-x-1 md:space-x-2 overflow-x-auto">
        {viewOptions.map(option => (
          <Button
            key={option.value}
            variant={activeView === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => onViewChange(option.value)}
            className="h-8 text-xs md:text-sm shrink-0 px-2 md:px-3"
          >
            <option.icon className="mr-1 md:mr-2 h-4 w-4" />
            {option.label}
          </Button>
        ))}
      </div>
    </header>
  );
}