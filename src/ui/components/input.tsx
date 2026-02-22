import { forwardRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { cn } from '@/src/ui/lib/cn';

interface InputProps extends TextInputProps {
  className?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { className, placeholderTextColor = '#9aa1ae', ...props },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      className={cn(
        'rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-text',
        'focus:border-accent',
        className,
      )}
      placeholderTextColor={placeholderTextColor}
      {...props}
    />
  );
});
