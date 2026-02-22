import { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { cn } from '@/src/ui/lib/cn';

interface CardProps extends PropsWithChildren {
  className?: string;
}

export function Card({ className, children }: CardProps) {
  return <View className={cn('rounded-card border border-border bg-surface p-4 gap-3', className)}>{children}</View>;
}
