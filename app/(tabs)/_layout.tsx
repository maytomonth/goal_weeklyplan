import { Tabs } from 'expo-router';
import { Icon } from '@/src/ui/components';
import { useBreakpoint } from '@/src/ui/layout/useBreakpoint';

export default function TabsLayout() {
  const { isDesktop } = useBreakpoint();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: '#0a84ff',
        tabBarInactiveTintColor: '#8e96a3',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 0,
        },
        tabBarItemStyle: {
          borderRadius: 10,
          marginHorizontal: 2,
          paddingVertical: 3,
        },
        tabBarStyle: isDesktop
          ? { display: 'none' }
          : {
              height: 62,
              backgroundColor: '#121319',
              borderTopWidth: 1,
              borderTopColor: '#2a2d36',
              paddingTop: 6,
              paddingBottom: 6,
            },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="plan"
        options={{
          title: '계획',
          tabBarIcon: ({ color }) => <Icon name="calendar" size={16} color={color} />,
        }}
      />

      <Tabs.Screen
        name="review"
        options={{
          title: '리뷰',
          tabBarIcon: ({ color }) => <Icon name="check-circle" size={16} color={color} />,
        }}
      />

      <Tabs.Screen
        name="goals"
        options={{
          title: '목표',
          tabBarIcon: ({ color }) => <Icon name="target" size={16} color={color} />,
        }}
      />

      <Tabs.Screen
        name="inbox"
        options={{
          title: '인박스',
          tabBarIcon: ({ color }) => <Icon name="inbox" size={16} color={color} />,
        }}
      />
    </Tabs>
  );
}
