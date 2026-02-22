import { useMemo } from 'react';
import { Href, usePathname, useRouter } from 'expo-router';
import { View, Text } from 'react-native';
import { useAuth } from '@/src/auth/useAuth';
import { useToast } from '@/src/components/toast/ToastProvider';
import { Button } from '@/src/ui/components/button';
import { Icon } from '@/src/ui/components/icon';
import { useAppStore } from '@/src/state/store';
import { cn } from '@/src/ui/lib/cn';
import { BRAND_ABBR, BRAND_NAME_SHORT, BRAND_SUBCOPY } from '@/src/ui/branding';

type SidebarSection = 'plan' | 'review' | 'goals' | 'inbox';

interface SidebarNavProps {
  section?: SidebarSection;
}

type SideIconName = 'calendar' | 'check-circle' | 'target' | 'inbox';
const NAV_ITEMS: Array<{ section: SidebarSection; label: string; icon: SideIconName; href: Href }> = [
  { section: 'plan', label: '계획', icon: 'calendar', href: '/plan' },
  { section: 'review', label: '리뷰', icon: 'check-circle', href: '/review' },
  { section: 'goals', label: '목표', icon: 'target', href: '/goals' },
  { section: 'inbox', label: '인박스', icon: 'inbox', href: '/inbox' },
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
  const { showToast } = useToast();
  const { signOut } = useAuth();
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
        {!collapsed ? (
          <View>
            <Text className="text-[13px] font-semibold text-text">{BRAND_NAME_SHORT}</Text>
            <Text className="text-[11px] text-text-muted">{BRAND_SUBCOPY}</Text>
          </View>
        ) : (
          <View className="h-7 w-7 items-center justify-center rounded-full border border-accent/40 bg-accent/15">
            <Text className="text-[11px] font-bold text-accent">{BRAND_ABBR}</Text>
          </View>
        )}
        <Button
          label=""
          size="sm"
          variant="ghost"
          onPress={toggleDesktopSidebar}
          className="h-8 w-8 px-0"
          iconLeft={<Icon name={collapsed ? 'chevrons-right' : 'chevrons-left'} size={15} color="#9aa1ae" />}
        />
      </View>

      <View className="flex-1 justify-between">
        <View className="gap-2">
          {NAV_ITEMS.map((item) => {
            const active = activeSection === item.section;
            return (
              <Button
                key={item.section}
                label={collapsed ? '' : item.label}
                variant={active ? 'primary' : 'ghost'}
                full
                onPress={() => router.push(item.href)}
                className={cn('justify-start', collapsed ? 'px-0' : 'px-3')}
                textClassName={cn(collapsed ? 'text-center w-full' : '')}
                iconLeft={<Icon name={item.icon} size={15} color={active ? '#f2f4f8' : '#9aa1ae'} />}
              />
            );
          })}
        </View>
        <Button
          label={collapsed ? '' : '로그아웃'}
          variant="ghost"
          full
          className={cn('justify-start', collapsed ? 'px-0' : 'px-3')}
          textClassName={cn(collapsed ? 'text-center w-full' : '')}
          iconLeft={<Icon name="x-circle" size={15} color="#9aa1ae" />}
          onPress={async () => {
            const error = await signOut();
            if (error) {
              showToast(error.message, 'error');
              return;
            }
            showToast('로그아웃되었습니다.', 'success');
            router.replace('/sign-in');
          }}
        />
      </View>
    </View>
  );
}
