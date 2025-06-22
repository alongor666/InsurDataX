
'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getFirebaseInstances } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User, type Auth } from 'firebase/auth';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Firebase initialization and auth state observation MUST be inside useEffect
    // to ensure it only runs on the client side.
    const { auth } = getFirebaseInstances();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    const { auth } = getFirebaseInstances(); // Get instance on demand
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      router.push('/');
      return true;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    const { auth } = getFirebaseInstances(); // Get instance on demand
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Firebase logout error:", error);
    }
  };

  const isAuthenticated = !!currentUser;

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
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">正在验证身份...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/login') {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">会话无效，正在重定向到登录页面...</p>
        </div>
      </div>
    );
  }
  
  if (isAuthenticated && pathname === '/login') {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">已登录，正在跳转到仪表盘...</p>
            </div>
        </div>
      );
  }

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated, login, logout, isLoadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
