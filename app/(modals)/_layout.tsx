import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack screenOptions={{ presentation: 'modal' }}>
      <Stack.Screen name="goal-picker" options={{ title: 'Goal Picker' }} />
      <Stack.Screen name="carry-inbox" options={{ title: 'Carry Inbox' }} />
      <Stack.Screen name="assign-goal" options={{ title: 'Assign Goal' }} />
      <Stack.Screen name="trash" options={{ title: 'Trash' }} />
    </Stack>
  );
}
