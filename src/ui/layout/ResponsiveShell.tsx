import { PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';
import { SidebarNav } from '@/src/ui/layout/SidebarNav';
import { useBreakpoint } from '@/src/ui/layout/useBreakpoint';
import { cn } from '@/src/ui/lib/cn';

type SidebarSection = 'plan' | 'review' | 'goals' | 'inbox';

interface ResponsiveShellProps extends PropsWithChildren {
  section: SidebarSection;
  mobile: ReactNode;
  desktopLeft: ReactNode;
  desktopCenter: ReactNode;
  desktopRight?: ReactNode;
  desktopClassName?: string;
}

export function ResponsiveShell({
  section,
  mobile,
  desktopLeft,
  desktopCenter,
  desktopRight,
  desktopClassName,
}: ResponsiveShellProps) {
  const { isDesktop } = useBreakpoint();

  if (!isDesktop) {
    return <>{mobile}</>;
  }

  return (
    <View className={cn('flex-1 flex-row bg-bg', desktopClassName)}>
      <SidebarNav section={section} />
      <View className="flex-1 flex-row gap-3 p-3">
        <View className={cn('min-w-[280px] max-w-[360px] flex-1')}>{desktopLeft}</View>
        <View className="flex-[1.4]">{desktopCenter}</View>
        {desktopRight ? <View className="w-[300px]">{desktopRight}</View> : null}
      </View>
    </View>
  );
}
