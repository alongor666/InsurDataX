'use client';

import type React from 'react';

interface AppLayoutProps {
  header: React.ReactNode;
  children: React.ReactNode;
}

export function AppLayout({ children }: { children: React.ReactNode}) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        {children}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} 车险经营分析周报应用
      </footer>
    </div>
  );
}
