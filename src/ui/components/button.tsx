import { cva, type VariantProps } from 'class-variance-authority';
import { Pressable, PressableProps, Text } from 'react-native';
import { cn } from '@/src/ui/lib/cn';

const buttonVariants = cva('items-center justify-center rounded-[10px] px-3 py-2', {
  variants: {
    variant: {
      primary: 'bg-accent active:bg-accent-pressed',
      secondary: 'border border-border bg-surface-2 active:bg-surface',
      ghost: 'border border-border bg-transparent active:bg-surface',
      danger: 'border border-danger/50 bg-danger/15 active:bg-danger/25',
    },
    size: {
      sm: 'px-2.5 py-1.5',
      md: 'px-3 py-2',
      lg: 'px-4 py-2.5',
    },
    full: {
      true: 'w-full',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'secondary',
    size: 'md',
    full: false,
  },
});

const buttonTextVariants = cva('font-semibold', {
  variants: {
    variant: {
      primary: 'text-text',
      secondary: 'text-text',
      ghost: 'text-text-muted',
      danger: 'text-danger',
    },
    size: {
      sm: 'text-[13px]',
      md: 'text-[14px]',
      lg: 'text-[15px]',
    },
  },
  defaultVariants: {
    variant: 'secondary',
    size: 'md',
  },
});

interface ButtonProps extends PressableProps, VariantProps<typeof buttonVariants> {
  label: string;
  className?: string;
  textClassName?: string;
}

export function Button({
  label,
  variant,
  size,
  full,
  className,
  textClassName,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      className={cn(buttonVariants({ variant, size, full }), disabled ? 'opacity-45' : '', className)}
      disabled={disabled}
      {...props}
    >
      <Text className={cn(buttonTextVariants({ variant, size }), textClassName)}>{label}</Text>
    </Pressable>
  );
}
