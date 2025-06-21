
'use client';

import { useState, type FormEvent } from 'react';
// useRouter is not directly used for redirection here, AuthProvider handles it.
// However, if you want to redirect *from* login page based on some other logic, keep it.
// import { useRouter } from 'next/navigation'; 
import { useAuth } from '@/contexts/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, LogIn } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { FirebaseError } from 'firebase/app';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    
    try {
      const success = await login(email, password); 
      if (success) {
        toast({ title: "登录成功", description: "欢迎回来!" });
        // AuthProvider handles redirection via router.push on successful login
      } else {
        // This case might be triggered if login function itself returns false for other reasons
        setError('登录失败，请稍后重试。');
        toast({ variant: "destructive", title: "登录失败", description: '发生未知错误。' });
      }
    } catch (err) {
      const firebaseError = err as FirebaseError;
      let userFriendlyMessage = '登录时发生未知错误。';
      
      // Provide more specific feedback based on the auth error code
      if (firebaseError.code === 'auth/invalid-credential' || firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/user-not-found') {
        userFriendlyMessage = '邮箱或密码错误，请检查后重试。';
      } else if (firebaseError.code === 'auth/too-many-requests') {
        userFriendlyMessage = '因登录尝试次数过多，账户已被临时锁定。请稍后再试。';
      } else if (firebaseError.code === 'auth/network-request-failed') {
        userFriendlyMessage = '网络连接失败，请检查您的网络后重试。';
      }
      
      setError(userFriendlyMessage);
      toast({ variant: "destructive", title: "登录失败", description: userFriendlyMessage });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ShieldCheck size={32} />
          </div>
          <CardTitle className="text-3xl font-headline text-primary">车险经营分析周报</CardTitle>
          <CardDescription className="text-sm">请输入您的凭证以继续</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="例如: user@example.com"
                required
                disabled={isLoggingIn}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
                disabled={isLoggingIn}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoggingIn}>
              <LogIn className="mr-2 h-4 w-4" />
              {isLoggingIn ? '登录中...' : '登录'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="mt-4 text-center text-xs text-muted-foreground">
          <p>此应用使用 Firebase Authentication。请使用已注册的账户登录。</p>
        </CardFooter>
      </Card>
       <footer className="py-8 text-center text-xs text-muted-foreground/80">
        © {new Date().getFullYear()} 车险经营分析周报应用
      </footer>
    </div>
  );
}
