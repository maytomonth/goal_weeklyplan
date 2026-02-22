import { Stack } from 'expo-router';

export default function PlanSectionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[planId]" />
    </Stack>
  );
}
