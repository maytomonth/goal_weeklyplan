import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import localforage from 'localforage';
import { StateStorage } from 'zustand/middleware';

localforage.config({
  name: 'goal-tracker-mvp1',
  storeName: 'goal_tracker_store',
});

export const appStorage: StateStorage = {
  getItem: async (name) => {
    if (Platform.OS === 'web') {
      const value = await localforage.getItem<string>(name);
      return value ?? null;
    }

    return AsyncStorage.getItem(name);
  },
  setItem: async (name, value) => {
    if (Platform.OS === 'web') {
      await localforage.setItem(name, value);
      return;
    }

    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name) => {
    if (Platform.OS === 'web') {
      await localforage.removeItem(name);
      return;
    }

    await AsyncStorage.removeItem(name);
  },
};
