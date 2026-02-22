import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { SupportedStorage } from '@supabase/supabase-js';

function webStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage;
}

export const authStorage: SupportedStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      const storage = webStorage();
      return storage ? storage.getItem(key) : null;
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      const storage = webStorage();
      storage?.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      const storage = webStorage();
      storage?.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};
