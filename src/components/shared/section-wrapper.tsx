import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SectionWrapperProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  actionButton?: React.ReactNode;
}

export function SectionWrapper({ title, icon: Icon, children, className, actionButton }: SectionWrapperProps) {
  return (
    <Card className={`shadow-lg transition-all hover:shadow-xl ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {Icon && <Icon className="h-6 w-6 text-primary" />}
            <CardTitle className="font-headline text-xl text-primary">{title}</CardTitle>
          </div>
          {actionButton}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
