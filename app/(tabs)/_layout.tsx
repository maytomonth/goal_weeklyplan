import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="plan" options={{ title: 'Plan' }} />
      <Tabs.Screen name="goals" options={{ title: 'Goals' }} />
      <Tabs.Screen name="review" options={{ title: 'Review' }} />
    </Tabs>
  );
}
