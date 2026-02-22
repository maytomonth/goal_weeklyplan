import { Stack } from 'expo-router';

export default function InboxSectionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
