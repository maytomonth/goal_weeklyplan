import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'modal',
        headerShown: false,
        headerStyle: { backgroundColor: '#0b0b0f' },
        headerTintColor: '#f2f4f8',
        headerTitleStyle: { color: '#f2f4f8' },
        contentStyle: { backgroundColor: '#0b0b0f' },
      }}
    >
      <Stack.Screen name="goal-picker" options={{ title: '목표 플랜 선택', headerShown: false }} />
      <Stack.Screen name="carry-inbox" options={{ title: '인박스 이월', headerShown: false }} />
      <Stack.Screen name="assign-goal" options={{ title: '목표 배정', headerShown: false }} />
      <Stack.Screen name="trash" options={{ title: '휴지통', headerShown: false }} />
    </Stack>
  );
}
