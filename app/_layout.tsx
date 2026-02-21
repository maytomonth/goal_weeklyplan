import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from '@/src/components/toast/ToastProvider';
import { runMvp2Migration } from '@/src/services/migrationService';
import { useAppStore } from '@/src/state/store';

function AppBoot() {
  const migratedToMvp2 = useAppStore((state) => state.migratedToMvp2);

  useEffect(() => {
    if (!migratedToMvp2) {
      runMvp2Migration(useAppStore.getState());
    }
  }, [migratedToMvp2]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastProvider>
        <AppBoot />
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
