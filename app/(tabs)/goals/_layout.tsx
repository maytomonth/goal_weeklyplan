import { Stack } from 'expo-router';

export default function GoalsSectionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[goalId]" />
    </Stack>
  );
}
