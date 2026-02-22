import { PropsWithChildren } from 'react';
import { Text } from 'react-native';
import { cn } from '@/src/ui/lib/cn';

interface LabelProps extends PropsWithChildren {
  className?: string;
  muted?: boolean;
}

export function Label({ className, muted = false, children }: LabelProps) {
  return <Text className={cn(muted ? 'text-text-muted' : 'text-text', className)}>{children}</Text>;
}
