import { useMemo } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { View, Text } from 'react-native';
import { Button } from '@/src/ui/components/button';
import { useAppStore } from '@/src/state/store';
import { cn } from '@/src/ui/lib/cn';

type SidebarSection = 'plan' | 'review' | 'goals' | 'inbox';

interface SidebarNavProps {
  section?: SidebarSection;
}

const NAV_ITEMS: Array<{ section: SidebarSection; label: string; icon: string; href: string }> = [
  { section: 'plan', label: 'Plan', icon: 'P', href: '/plan' },
  { section: 'review', label: 'Review', icon: 'R', href: '/review' },
  { section: 'goals', label: 'Goals', icon: 'G', href: '/goals' },
  { section: 'inbox', label: 'Inbox', icon: 'I', href: '/inbox' },
];

function inferSection(pathname: string): SidebarSection {
  if (pathname.includes('/review')) return 'review';
  if (pathname.includes('/goals')) return 'goals';
  if (pathname.includes('/inbox')) return 'inbox';
  return 'plan';
}

export function SidebarNav({ section }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useAppStore((state) => state.desktopSidebarCollapsed);
  const toggleDesktopSidebar = useAppStore((state) => state.toggleDesktopSidebar);

  const activeSection = useMemo(() => section ?? inferSection(pathname), [pathname, section]);

  return (
    <View
      className={cn(
        'h-full border-r border-border bg-surface/95 px-2 py-3',
        collapsed ? 'w-[68px]' : 'w-[220px]',
      )}
    >
      <View className="mb-3 flex-row items-center justify-between">
        {!collapsed ? <Text className="text-[13px] font-semibold text-text-muted">WORKSPACE</Text> : null}
        <Button
          label={collapsed ? '>>' : '<<'}
          size="sm"
          variant="ghost"
          onPress={toggleDesktopSidebar}
          className="px-2"
        />
      </View>

      <View className="gap-2">
        {NAV_ITEMS.map((item) => {
          const active = activeSection === item.section;
          return (
            <Button
              key={item.section}
              label={collapsed ? item.icon : `${item.icon}  ${item.label}`}
              variant={active ? 'primary' : 'ghost'}
              full
              onPress={() => router.push(item.href)}
              className={cn('justify-start', collapsed ? 'px-0' : 'px-3')}
              textClassName={cn(collapsed ? 'text-center w-full' : '')}
            />
          );
        })}
      </View>
    </View>
  );
}
