
"use client";

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChartAiSummaryProps {
  summary: string | null;
  isLoading: boolean;
  onGenerateSummary: () => Promise<void>;
  hasData: boolean; 
  chartTypeLabel: string; 
}

export function ChartAiSummary({ summary, isLoading, onGenerateSummary, hasData, chartTypeLabel }: ChartAiSummaryProps) {
  return (
    <div className="mt-6 pt-4 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-md font-semibold text-primary">AI {chartTypeLabel}分析</h4>
        <Button
          onClick={onGenerateSummary}
          variant="outline"
          size="sm"
          disabled={isLoading || !hasData}
          className="h-8 shrink-0"
        >
          <Sparkles className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? '分析中...' : `生成${chartTypeLabel}AI分析`}
        </Button>
      </div>
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      )}
      {!isLoading && summary && (
        <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert text-foreground whitespace-pre-wrap p-3 bg-secondary/50 rounded-md">
          {summary}
        </ReactMarkdown>
      )}
      {!isLoading && !summary && !hasData && (
        <p className="text-xs text-muted-foreground text-center py-2">图表无数据，无法生成AI分析。</p>
      )}
      {!isLoading && !summary && hasData && (
        <p className="text-xs text-muted-foreground text-center py-2">点击按钮生成此图表的AI分析。</p>
      )}
    </div>
  );
}
