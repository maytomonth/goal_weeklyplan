import { useMemo, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { WeekNav } from '@/src/components/WeekNav';
import { useToast } from '@/src/components/toast/ToastProvider';
import { formatWeekLabel, getNextWeekPeriodFromStart, getWeekPeriod } from '@/src/core/time/week';
import { assignTaskToGoalWeek } from '@/src/services/taskService';
import { useAppStore } from '@/src/state/store';
import { BRAND_NAME_FULL } from '@/src/ui/branding';
import { GoalDueBadge, Icon } from '@/src/ui/components';

export default function AssignGoalModal() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ taskId?: string }>();
  const taskId = typeof params.taskId === 'string' ? params.taskId : null;

  const goals = useAppStore((state) => state.goals);
  const tasks = useAppStore((state) => state.tasks);
  const recentGoalIds = useAppStore((state) => state.recentGoalIds);
  const pushRecentGoal = useAppStore((state) => state.pushRecentGoal);
  const setSelectedWeekStart = useAppStore((state) => state.setSelectedWeekStart);
  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);

  const [search, setSearch] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const thisWeekStartIso = useMemo(() => getWeekPeriod(new Date()).start.toISOString(), []);
  const nextWeekStartIso = useMemo(() => getNextWeekPeriodFromStart(new Date(thisWeekStartIso)).start.toISOString(), [thisWeekStartIso]);
  const [targetWeekStartIso, setTargetWeekStartIso] = useState<string>(thisWeekStartIso);

  const task = taskId ? tasks[taskId] : null;

  const activeGoals = useMemo(
    () => Object.values(goals).filter((goal) => goal.status === 'active' && goal.systemType !== 'inbox'),
    [goals],
  );

  const filteredGoals = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeGoals;
    return activeGoals.filter((goal) => goal.title.toLowerCase().includes(q));
  }, [activeGoals, search]);

  const recentGoals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recentGoalIds
      .map((goalId) => goals[goalId])
      .filter((goal): goal is NonNullable<typeof goal> => Boolean(goal) && goal.status === 'active' && goal.systemType !== 'inbox')
      .filter((goal) => !q || goal.title.toLowerCase().includes(q))
      .slice(0, 5);
  }, [goals, recentGoalIds, search]);

  const confirmAssign = () => {
    if (!taskId || !task) {
      showToast('유효하지 않은 할 일입니다.', 'error');
      return;
    }
    if (!selectedGoalId) {
      showToast('목표를 선택하세요.', 'error');
      return;
    }

    const destinationPlanId = assignTaskToGoalWeek(
      useAppStore.getState(),
      taskId,
      selectedGoalId,
      targetWeekStartIso,
    );
    pushRecentGoal(selectedGoalId);
    setSelectedWeekStart(targetWeekStartIso);
    setSelectedPlanId(destinationPlanId);
    showToast('할 일을 목표 플랜으로 이동했습니다.', 'success');
    router.replace(`/plan/${destinationPlanId}`);
  };

  if (!taskId || !task || task.deletedAt) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.title}>배정할 할 일을 찾을 수 없습니다.</Text>
        <Pressable style={styles.ghostButton} onPress={() => router.dismiss()}>
          <Text style={styles.ghostButtonText}>닫기</Text>
        </Pressable>
      </View>
    );
  }

  const recentSet = new Set(recentGoals.map((goal) => goal.id));
  const otherGoals = filteredGoals.filter((goal) => !recentSet.has(goal.id));

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
          <Text style={styles.subtitle}>목표 배정</Text>
        </View>
        <Pressable style={styles.ghostButton} onPress={() => router.dismiss()}>
          <View style={styles.inlineRow}>
            <Icon name="x" size={14} color="#f2f4f8" />
            <Text style={styles.ghostButtonText}>닫기</Text>
          </View>
        </Pressable>
      </View>

      <Text style={styles.meta}>할 일: {task.title}</Text>

      <TextInput
        style={styles.input}
        placeholder="목표 검색"
        placeholderTextColor="#7f8796"
        value={search}
        onChangeText={setSearch}
      />

      {recentGoals.length > 0 ? (
        <View style={styles.inlineRow}>
          <Icon name="check-circle" size={15} color="#7cc3ff" />
          <Text style={styles.sectionTitle}>최근 목표</Text>
        </View>
      ) : null}
      {recentGoals.map((goal) => (
        <Pressable
          key={goal.id}
          style={[styles.card, selectedGoalId === goal.id ? styles.cardSelected : undefined]}
          onPress={() => setSelectedGoalId(goal.id)}
        >
          <Text style={styles.cardTitle}>{goal.title}</Text>
          <GoalDueBadge goal={goal} style={styles.badgeSpacing} />
          <Text style={styles.meta}>{goal.description || '-'}</Text>
        </Pressable>
      ))}

      <View style={styles.inlineRow}>
        <Icon name="target" size={15} color="#7cc3ff" />
        <Text style={styles.sectionTitle}>목표 선택</Text>
      </View>
      {otherGoals.length === 0 ? <Text style={styles.meta}>선택 가능한 목표가 없습니다.</Text> : null}
      {otherGoals.map((goal) => (
        <Pressable
          key={goal.id}
          style={[styles.card, selectedGoalId === goal.id ? styles.cardSelected : undefined]}
          onPress={() => setSelectedGoalId(goal.id)}
        >
          <Text style={styles.cardTitle}>{goal.title}</Text>
          <GoalDueBadge goal={goal} style={styles.badgeSpacing} />
          <Text style={styles.meta}>{goal.description || '-'}</Text>
        </Pressable>
      ))}

      <View style={styles.inlineRow}>
        <Icon name="calendar" size={15} color="#7cc3ff" />
        <Text style={styles.sectionTitle}>주차 선택</Text>
      </View>
      <View style={styles.quickWeekRow}>
        <Pressable
          style={[styles.chip, targetWeekStartIso === thisWeekStartIso ? styles.chipSelected : undefined]}
          onPress={() => setTargetWeekStartIso(thisWeekStartIso)}
        >
          <Text style={styles.chipText}>이번 주</Text>
        </Pressable>
        <Pressable
          style={[styles.chip, targetWeekStartIso === nextWeekStartIso ? styles.chipSelected : undefined]}
          onPress={() => setTargetWeekStartIso(nextWeekStartIso)}
        >
          <Text style={styles.chipText}>다음 주</Text>
        </Pressable>
      </View>

      <WeekNav
        weekStartIso={targetWeekStartIso}
        onSelectWeekStart={setTargetWeekStartIso}
        onMoveCurrentWeek={() => setTargetWeekStartIso(thisWeekStartIso)}
      />
      <Text style={styles.meta}>선택된 주: {formatWeekLabel(new Date(targetWeekStartIso))}</Text>

      <Pressable style={styles.primaryButton} onPress={confirmAssign}>
        <Text style={styles.primaryButtonText}>배정 완료</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0f' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 16, gap: 10 },
  content: { padding: 16, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  titleWrap: { gap: 2 },
  title: { fontSize: 18, fontWeight: '700', color: '#f2f4f8' },
  subtitle: { fontSize: 18, fontWeight: '700', color: '#f2f4f8' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#f2f4f8', marginTop: 4 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2d36',
    backgroundColor: '#121319',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#f2f4f8',
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2d36',
    backgroundColor: '#121319',
    padding: 10,
    gap: 4,
  },
  cardSelected: { borderColor: '#0a84ff', backgroundColor: '#1a2538' },
  cardTitle: { fontWeight: '700', color: '#f2f4f8' },
  badgeSpacing: { marginTop: 4, marginBottom: 2 },
  quickWeekRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2a2d36',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#121319',
  },
  chipSelected: { borderColor: '#0a84ff', backgroundColor: '#10263a' },
  chipText: { color: '#f2f4f8', fontWeight: '600' },
  meta: { color: '#9aa1ae' },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: '#0a84ff',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#ffffff', fontWeight: '700' },
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
