
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAssistantConfig, saveAssistantConfig, type AssistantConfig } from '@/lib/assistant-config';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/app-layout';
import { AppHeader } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Bot, Save } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const [config, setConfig] = useState<Partial<AssistantConfig>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadConfig() {
      setIsLoading(true);
      try {
        const fetchedConfig = await getAssistantConfig();
        setConfig(fetchedConfig);
      } catch (error) {
        console.error("Failed to load AI assistant config:", error);
        toast({
          variant: "destructive",
          title: "加载配置失败",
          description: "无法从数据库获取AI助手配置。",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, [toast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const principlesArray = typeof config.core_principles === 'string'
        ? (config.core_principles as string).split('\n').filter(p => p.trim() !== '')
        : config.core_principles;

      await saveAssistantConfig({
        persona: config.persona,
        core_principles: principlesArray,
      });
      toast({
        title: "配置已保存",
        description: "AI助手的全局指令已成功更新。",
      });
    } catch (error) {
      console.error("Failed to save AI assistant config:", error);
      toast({
        variant: "destructive",
        title: "保存失败",
        description: "更新AI助手配置时发生错误。",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrinciplesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Store as a single string during editing for textarea compatibility
    setConfig(prev => ({ ...prev, core_principles: e.target.value as any }));
  };
  
  const principlesAsString = Array.isArray(config.core_principles) 
    ? config.core_principles.join('\n') 
    : config.core_principles;

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
        <header className="sticky top-0 z-40 w-full border-b bg-background">
            <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">返回仪表盘</span>
                        </Link>
                    </Button>
                    <h1 className="text-lg font-semibold md:text-xl">
                        AI助手全局指令配置
                    </h1>
                </div>
            </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Bot className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle>塑造您的AI编程伙伴</CardTitle>
                            <CardDescription>
                                在这里定义的指令将作为AI助手的底层逻辑，指导其每一次的思考和行动。
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isLoading ? (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-32 w-full" />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="persona" className="text-base">角色定位 (Persona)</Label>
                                <Textarea
                                    id="persona"
                                    placeholder="例如：我是一个顶级的中文软件架构师和程序员，专注于构建高质量、可维护的Next.js应用..."
                                    value={config.persona || ''}
                                    onChange={(e) => setConfig(prev => ({ ...prev, persona: e.target.value }))}
                                    className="min-h-[100px] text-base"
                                    disabled={isSaving}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="core-principles" className="text-base">核心原则 (Core Principles)</Label>
                                <Textarea
                                    id="core-principles"
                                    placeholder="每行一个原则。例如：始终与代码库保持文档同步。"
                                    value={principlesAsString || ''}
                                    onChange={handlePrinciplesChange}
                                    className="min-h-[150px] text-base"
                                    disabled={isSaving}
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={handleSave} disabled={isSaving || isLoading}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {isSaving ? '正在保存...' : '保存更改'}
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </main>
    </div>
  );
}
