
'use client';

import { useState, useRef, useEffect } from 'react';
import type { AiChatDataContext, ConversationEntry } from '@/data/types';
import { SectionWrapper } from '@/components/shared/section-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send, User, Bot, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { getChatResponsePrompt, callProxy } from '@/lib/ai-prompt-builder';

interface AiChatSectionProps {
  dataContext: AiChatDataContext | null;
}

export function AiChatSection({ dataContext }: AiChatSectionProps) {
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [conversation]);
  
  useEffect(() => {
    // Reset conversation when data context changes
    setConversation([]);
    setUserInput('');
    setIsLoading(false);
  }, [dataContext]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;
    if (!dataContext) {
      toast({
        variant: 'destructive',
        title: '数据上下文缺失',
        description: '无法发送消息，因为当前仪表盘数据不可用。',
      });
      return;
    }

    const newUserMessage: ConversationEntry = { role: 'user', content: userInput };
    setConversation((prev) => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const systemInstruction = "You are a helpful AI assistant."; // This could be fetched from a config if needed
      const prompt = getChatResponsePrompt({
          userQuery: userInput,
          conversationHistory: JSON.stringify(conversation),
          dataContext: JSON.stringify(dataContext),
        }, 
        systemInstruction
      );

      const aiContent = await callProxy(prompt);
      const newAiMessage: ConversationEntry = { role: 'assistant', content: aiContent };
      setConversation((prev) => [...prev, newAiMessage]);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        variant: 'destructive',
        title: 'AI 对话失败',
        description: errorMessage,
      });
      const errorAiMessage: ConversationEntry = { role: 'assistant', content: `抱歉，处理您的请求时遇到错误： ${errorMessage}` };
      setConversation((prev) => [...prev, errorAiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SectionWrapper title="AI 数据对话" icon={MessageCircle}>
      <div className="flex flex-col h-[65vh]">
        <ScrollArea className="flex-1 p-4 border rounded-md" ref={scrollAreaRef}>
          <div className="space-y-4">
            {conversation.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <Bot size={48} className="mb-4" />
                    <h3 className="text-lg font-semibold">我是您的数据分析助手</h3>
                    <p className="text-sm">您可以基于当前仪表盘的数据向我提问。</p>
                    <p className="text-xs mt-2">例如：“本周哪个业务线的满期赔付率最高？” 或 “总结一下本周的经营亮点和风险。”</p>
                </div>
            )}
            {conversation.map((msg, index) => (
              <div
                key={index}
                className={cn('flex items-start gap-3', {
                  'justify-end': msg.role === 'user',
                })}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-xs md:max-w-md lg:max-w-2xl rounded-lg px-4 py-2 text-sm',
                    {
                      'bg-primary text-primary-foreground': msg.role === 'user',
                      'bg-muted': msg.role === 'assistant',
                    }
                  )}
                >
                  <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert text-foreground whitespace-pre-wrap">
                    {msg.content}
                  </ReactMarkdown>
                </div>
                {msg.role === 'user' && (
                   <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                <div className="bg-muted rounded-lg px-4 py-3 flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">分析师正在思考...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 mt-4 pt-4 border-t">
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={dataContext ? "请基于当前数据提问..." : "请先等待数据加载..."}
            className="flex-1"
            disabled={isLoading || !dataContext}
          />
          <Button type="submit" disabled={isLoading || !userInput.trim() || !dataContext}>
            <Send className="w-4 h-4 mr-2" />
            发送
          </Button>
        </form>
      </div>
    </SectionWrapper>
  );
}
