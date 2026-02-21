import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from '@/src/components/toast/ToastProvider';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="(modals)/carry-inbox"
            options={{ presentation: 'modal', title: 'Carry Inbox' }}
          />
        </Stack>
      </ToastProvider>
    </GestureHandlerRootView>
  );
}
