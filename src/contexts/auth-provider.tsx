
'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>; // Changed parameters
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    setIsLoadingAuth(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting currentUser and redirecting
      router.push('/'); // Manually redirect on successful login
      return true;
    } catch (error) {
      console.error("Firebase login error:", error);
      setIsLoadingAuth(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged will handle setting currentUser to null
      router.push('/login'); // Manually redirect on logout
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
    <AuthContext.Provider value={{ currentUser, isAuthenticated, login, logout, isLoadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
