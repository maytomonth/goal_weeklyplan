import '@/global.css';
import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/src/auth/AuthProvider';
import { ToastProvider } from '@/src/components/toast/ToastProvider';
import { LATEST_SCHEMA_VERSION, runSchemaMigrations } from '@/src/services/migrationService';
import { useAppStore } from '@/src/state/store';

function AppBoot() {
  const schemaVersion = useAppStore((state) => state.schemaVersion);
  const ensureInboxGoal = useAppStore((state) => state.ensureInboxGoal);

  useEffect(() => {
    if (schemaVersion < LATEST_SCHEMA_VERSION) {
      runSchemaMigrations(useAppStore.getState());
    }
    // Inbox goal must always exist even for fully migrated stores.
    ensureInboxGoal();
  }, [schemaVersion, ensureInboxGoal]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="dark flex-1 bg-bg">
        <AuthProvider>
          <ToastProvider>
            <AppBoot />
            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(modals)" options={{ headerShown: false }} />
            </Stack>
          </ToastProvider>
        </AuthProvider>
      </View>
    </GestureHandlerRootView>
  );
}
