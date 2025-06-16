
'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

interface AuthContextType {
  isAuthenticated: boolean;
  login: (user: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoadingAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const MOCK_SESSION_TOKEN_KEY = 'insuranceAppSessionToken';
const MOCK_SESSION_TOKEN_VALUE = 'mockAuthTokenTrue';

// Hardcoded credentials for prototype
const PROTOTYPE_USERNAME = 'admin';
const PROTOTYPE_PASSWORD = 'password';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    try {
      const token = localStorage.getItem(MOCK_SESSION_TOKEN_KEY);
      if (token === MOCK_SESSION_TOKEN_VALUE) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Could not access localStorage:", error);
      // Potentially run in an environment where localStorage is not available (e.g. SSR pre-render for certain parts)
      // For this prototype, we assume client-side focus for auth.
    }
    setIsLoadingAuth(false);
  }, []);

  const login = async (user: string, pass: string): Promise<boolean> => {
    setIsLoadingAuth(true);
    // Simulate network delay for login process
    await new Promise(resolve => setTimeout(resolve, 500)); 
    if (user === PROTOTYPE_USERNAME && pass === PROTOTYPE_PASSWORD) {
      try {
        localStorage.setItem(MOCK_SESSION_TOKEN_KEY, MOCK_SESSION_TOKEN_VALUE);
      } catch (error) {
        console.error("Could not set item in localStorage:", error);
        setIsLoadingAuth(false);
        return false; // Login fails if localStorage is not writable
      }
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      router.push('/'); 
      return true;
    }
    setIsAuthenticated(false);
    setIsLoadingAuth(false);
    return false;
  };

  const logout = () => {
    try {
      localStorage.removeItem(MOCK_SESSION_TOKEN_KEY);
    } catch (error) {
      console.error("Could not remove item from localStorage:", error);
    }
    setIsAuthenticated(false);
    router.push('/login');
  };

  useEffect(() => {
    if (!isLoadingAuth) {
      if (isAuthenticated && pathname === '/login') {
        router.push('/');
      } else if (!isAuthenticated && pathname !== '/login') {
        router.push('/login');
      }
    }
  }, [isLoadingAuth, isAuthenticated, pathname, router]);

  if (isLoadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-10 w-3/4 mx-auto" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-10 w-1/2 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  // If redirecting, show a minimal UI. The useEffect above handles the router.push.
  if (!isAuthenticated && pathname !== '/login') {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground">
        <p>正在重定向到登录页面...</p>
        <Skeleton className="h-10 w-3/4 mx-auto mt-4" />
      </div>
    );
  }
  
  if (isAuthenticated && pathname === '/login') {
      return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground">
        <p>已登录，正在重定向到仪表盘...</p>
        <Skeleton className="h-10 w-3/4 mx-auto mt-4" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

