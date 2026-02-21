import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="(modals)/carry-inbox"
        options={{ presentation: 'modal', title: 'Carry Inbox' }}
      />
    </Stack>
  );
}
