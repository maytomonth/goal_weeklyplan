import { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { Button } from '@/src/ui/components/button';
import { Label } from '@/src/ui/components/label';
import { Surface } from '@/src/ui/components/surface';

interface EmptyStateProps extends PropsWithChildren {
  title: string;
  description?: string;
  ctaLabel?: string;
  onPressCta?: () => void;
}

export function EmptyState({ title, description, ctaLabel, onPressCta, children }: EmptyStateProps) {
  return (
    <Surface className="items-center gap-2 py-6">
      <Label className="text-base font-semibold">{title}</Label>
      {description ? <Label muted className="text-center text-sm">{description}</Label> : null}
      {children}
      {ctaLabel && onPressCta ? <Button label={ctaLabel} variant="primary" onPress={onPressCta} /> : null}
    </Surface>
  );
}
