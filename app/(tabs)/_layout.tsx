import { Tabs } from 'expo-router';
import { useBreakpoint } from '@/src/ui/layout/useBreakpoint';

export default function TabsLayout() {
  const { isDesktop } = useBreakpoint();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: isDesktop ? { display: 'none' } : undefined,
      }}
    >
      <Tabs.Screen name="plan" options={{ title: 'Plan' }} />
      <Tabs.Screen name="review" options={{ title: 'Review' }} />
      <Tabs.Screen name="goals" options={{ title: 'Goals' }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox' }} />
    </Tabs>
  );
}
