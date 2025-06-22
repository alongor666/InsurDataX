
'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getFirebaseInstances } from '@/lib/firebase'; // Import the new getter function
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User, type AuthError } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';

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
  const { auth } = getFirebaseInstances(); // Get auth instance here
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [auth]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting currentUser.
      // Manually redirect on successful login.
      router.push('/');
      return true;
    } catch (error) {
      // Re-throw the error to be handled by the calling component (LoginPage)
      // This allows for more specific error messages in the UI.
      throw error;
    }
  };

  const logout = async () => {
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

  // Initial loading skeleton while waiting for auth state
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

  // If not authenticated and not on the login page, show a redirecting message
  // This prevents content flashing while the router redirects.
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
  
  // If authenticated and somehow on the login page, show a redirecting message
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
