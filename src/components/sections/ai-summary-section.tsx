import { SectionWrapper } from '@/components/shared/section-wrapper';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AiSummarySectionProps {
  summary: string | null;
  isLoading: boolean;
}

export function AiSummarySection({ summary, isLoading }: AiSummarySectionProps) {
  return (
    <SectionWrapper title="AI 智能业务摘要" icon={Sparkles}>
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      )}
      {!isLoading && summary && (
        <div className="prose prose-sm max-w-none dark:prose-invert text-foreground whitespace-pre-wrap">
          {summary}
        </div>
      )}
      {!isLoading && !summary && (
        <p className="text-muted-foreground">点击上方 "AI智能业务摘要" 按钮生成分析报告。</p>
      )}
    </SectionWrapper>
  );
}
