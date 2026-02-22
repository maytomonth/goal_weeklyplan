import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getWeekPeriod } from '@/src/core/time/week';
import { useAppStore } from '@/src/state/store';

const DAY_MS = 24 * 60 * 60 * 1000;

function safeWeekStart(input?: string): string {
  if (!input) return getWeekPeriod(new Date()).start.toISOString();
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return getWeekPeriod(new Date()).start.toISOString();
  return getWeekPeriod(date).start.toISOString();
}

export default function GoalPickerModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ weekStart?: string }>();
  const [search, setSearch] = useState('');

  const goals = useAppStore((state) => state.goals);
  const recentGoalIds = useAppStore((state) => state.recentGoalIds);
  const ensureGoalWeeklyPlan = useAppStore((state) => state.ensureGoalWeeklyPlan);
  const pushRecentGoal = useAppStore((state) => state.pushRecentGoal);
  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);
  const setSelectedWeekStart = useAppStore((state) => state.setSelectedWeekStart);

  const weekStartIso = safeWeekStart(typeof params.weekStart === 'string' ? params.weekStart : undefined);
  const weekEndIso = new Date(new Date(weekStartIso).getTime() + 7 * DAY_MS).toISOString();

  const activeGoals = useMemo(
    () => Object.values(goals).filter((goal) => goal.status === 'active' && goal.systemType !== 'inbox'),
    [goals],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeGoals;
    return activeGoals.filter((goal) => goal.title.toLowerCase().includes(q));
  }, [activeGoals, search]);

  const recent = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recentGoalIds
      .map((id) => goals[id])
      .filter((goal): goal is NonNullable<typeof goal> => Boolean(goal) && goal.status === 'active' && goal.systemType !== 'inbox')
      .filter((goal) => !q || goal.title.toLowerCase().includes(q))
      .slice(0, 5);
  }, [goals, recentGoalIds, search]);

  const recentSet = new Set(recent.map((goal) => goal.id));
  const rest = filtered.filter((goal) => !recentSet.has(goal.id));

  const openGoalPlan = (goalId: string) => {
    const planId = ensureGoalWeeklyPlan(weekStartIso, weekEndIso, goalId);
    setSelectedWeekStart(weekStartIso);
    setSelectedPlanId(planId);
    pushRecentGoal(goalId);
    router.replace(`/plan/${planId}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Goal Picker</Text>
        <Pressable style={styles.ghostButton} onPress={() => router.dismiss()}>
          <Text style={styles.ghostButtonText}>Close</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Goal 검색"
        value={search}
        onChangeText={setSearch}
      />

      {recent.length > 0 ? <Text style={styles.sectionTitle}>최근 사용</Text> : null}
      {recent.map((goal) => (
        <Pressable key={goal.id} style={styles.card} onPress={() => openGoalPlan(goal.id)}>
          <Text style={styles.cardTitle}>{goal.title}</Text>
          <Text style={styles.meta}>{goal.description || '-'}</Text>
        </Pressable>
      ))}

      <Text style={styles.sectionTitle}>모든 활성 Goal</Text>
      {rest.length === 0 ? <Text style={styles.meta}>선택 가능한 목표가 없습니다.</Text> : null}
      {rest.map((goal) => (
        <Pressable key={goal.id} style={styles.card} onPress={() => openGoalPlan(goal.id)}>
          <Text style={styles.cardTitle}>{goal.title}</Text>
          <Text style={styles.meta}>{goal.description || '-'}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0f' },
  content: { padding: 16, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  sectionTitle: { marginTop: 4, fontSize: 15, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: '#2a2d36',
    borderRadius: 10,
    backgroundColor: '#121319',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: '#2a2d36',
    borderRadius: 10,
    backgroundColor: '#121319',
    padding: 10,
    gap: 4,
  },
  cardTitle: { fontWeight: '700' },
  meta: { color: '#9aa1ae' },
  ghostButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2d36',
    backgroundColor: '#121319',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ghostButtonText: { color: '#f2f4f8', fontWeight: '600' },
});
