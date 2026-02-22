import { useMemo, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getWeekPeriod, isoInstantEquals } from '@/src/core/time/week';
import { useAppStore } from '@/src/state/store';
import { BRAND_NAME_FULL } from '@/src/ui/branding';
import { GoalDueBadge, Icon } from '@/src/ui/components';

const DAY_MS = 24 * 60 * 60 * 1000;

function safeWeekStart(input?: string): string {
  if (!input) return getWeekPeriod(new Date()).start.toISOString();
  const decoded = (() => {
    try {
      return decodeURIComponent(input);
    } catch {
      return input;
    }
  })();
  const date = new Date(decoded);
  if (Number.isNaN(date.getTime())) return getWeekPeriod(new Date()).start.toISOString();
  return getWeekPeriod(date).start.toISOString();
}

export default function GoalPickerModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ weekStart?: string }>();
  const [search, setSearch] = useState('');

  const goals = useAppStore((state) => state.goals);
  const plans = useAppStore((state) => state.plans);
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

  const filteredGoals = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeGoals;
    return activeGoals.filter((goal) => goal.title.toLowerCase().includes(q));
  }, [activeGoals, search]);

  const existingPlanIdByGoalId = useMemo(() => {
    const map: Record<string, string> = {};
    Object.values(plans)
      .filter((plan) => plan.type === 'week' && isoInstantEquals(plan.periodStart, weekStartIso))
      .forEach((plan) => {
        map[plan.goalId] = plan.id;
      });
    return map;
  }, [plans, weekStartIso]);

  const creatableGoals = useMemo(
    () => filteredGoals.filter((goal) => !existingPlanIdByGoalId[goal.id]),
    [existingPlanIdByGoalId, filteredGoals],
  );

  const alreadyCreatedGoals = useMemo(
    () => filteredGoals.filter((goal) => Boolean(existingPlanIdByGoalId[goal.id])),
    [existingPlanIdByGoalId, filteredGoals],
  );

  const openGoalPlan = (goalId: string) => {
    const planId = ensureGoalWeeklyPlan(weekStartIso, weekEndIso, goalId);
    setSelectedWeekStart(weekStartIso);
    setSelectedPlanId(planId);
    pushRecentGoal(goalId);
    router.replace(`/plan/${planId}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0b0b0f' },
          headerStyle: { backgroundColor: '#0b0b0f' },
          headerTintColor: '#f2f4f8',
        }}
      />
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{BRAND_NAME_FULL}</Text>
          <Text style={styles.subtitle}>목표 플랜 선택</Text>
        </View>
        <Pressable style={styles.ghostButton} onPress={() => router.dismiss()}>
          <View style={styles.inlineRow}>
            <Icon name="x" size={14} color="#f2f4f8" />
            <Text style={styles.ghostButtonText}>닫기</Text>
          </View>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="목표 검색"
        placeholderTextColor="#9aa1ae"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.inlineRow}>
        <Icon name="plus" size={15} color="#7cc3ff" />
        <Text style={styles.sectionTitle}>생성 가능한 목표 플랜</Text>
      </View>
      {creatableGoals.length === 0 ? <Text style={styles.meta}>선택 가능한 목표가 없습니다.</Text> : null}
      {creatableGoals.map((goal) => (
        <Pressable key={goal.id} style={styles.card} onPress={() => openGoalPlan(goal.id)}>
          <Text style={styles.cardTitle}>{goal.title}</Text>
          <GoalDueBadge goal={goal} style={styles.badgeSpacing} />
          <Text style={styles.meta}>{goal.description || '-'}</Text>
        </Pressable>
      ))}

      <View style={styles.inlineRow}>
        <Icon name="check-circle" size={15} color="#7cc3ff" />
        <Text style={styles.sectionTitle}>이미 생성한 목표 플랜</Text>
      </View>
      {alreadyCreatedGoals.length === 0 ? <Text style={styles.meta}>아직 생성된 목표 플랜이 없습니다.</Text> : null}
      {alreadyCreatedGoals.map((goal) => (
        <View key={goal.id} style={[styles.card, styles.cardDisabled]}>
          <View style={styles.cardHead}>
            <Text style={[styles.cardTitle, styles.cardTitleDisabled]}>{goal.title}</Text>
            <Text style={styles.statusBadge}>생성됨</Text>
          </View>
          <GoalDueBadge goal={goal} style={styles.badgeSpacing} />
          <Text style={styles.meta}>{goal.description || '-'}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0f' },
  content: { padding: 16, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  titleWrap: { gap: 2 },
  title: { fontSize: 18, fontWeight: '700', color: '#f2f4f8' },
  subtitle: { fontSize: 18, fontWeight: '700', color: '#f2f4f8' },
  sectionTitle: { marginTop: 4, fontSize: 15, fontWeight: '700', color: '#f2f4f8' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#2a2d36',
    borderRadius: 10,
    backgroundColor: '#121319',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#f2f4f8',
  },
  card: {
    borderWidth: 1,
    borderColor: '#2a2d36',
    borderRadius: 10,
    backgroundColor: '#121319',
    padding: 10,
    gap: 4,
  },
  cardDisabled: {
    opacity: 0.7,
    backgroundColor: '#0f1118',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: { fontWeight: '700', color: '#f2f4f8' },
  cardTitleDisabled: { color: '#c2c8d3' },
  badgeSpacing: { marginTop: 4, marginBottom: 2 },
  statusBadge: {
    borderWidth: 1,
    borderColor: '#2a2d36',
    borderRadius: 999,
    backgroundColor: '#1a1c24',
    color: '#9aa1ae',
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
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
