import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useToast } from '@/src/components/toast/ToastProvider';
import { getNextWeekPeriodFromStart, getWeekPeriod } from '@/src/core/time/week';
import { assignTaskToGoalWeek } from '@/src/services/taskService';
import { useAppStore } from '@/src/state/store';

const WEEK_CHOICES = ['this', 'next', 'custom'] as const;

type WeekChoice = (typeof WEEK_CHOICES)[number];

function normalizeWeekStartIso(input?: string): string {
  if (!input) return getWeekPeriod(new Date()).start.toISOString();
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return getWeekPeriod(new Date()).start.toISOString();
  return getWeekPeriod(parsed).start.toISOString();
}

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
  const [weekChoice, setWeekChoice] = useState<WeekChoice>('this');
  const [customDateInput, setCustomDateInput] = useState('');

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

  const targetWeekStartIso = useMemo(() => {
    const thisWeekStart = getWeekPeriod(new Date()).start;
    if (weekChoice === 'this') return thisWeekStart.toISOString();
    if (weekChoice === 'next') return getNextWeekPeriodFromStart(thisWeekStart).start.toISOString();
    return normalizeWeekStartIso(customDateInput);
  }, [customDateInput, weekChoice]);

  const confirmAssign = () => {
    if (!taskId || !task) {
      showToast('유효하지 않은 task입니다.', 'error');
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
    showToast('Task를 목표 플랜으로 이동했습니다.', 'success');
    router.replace(`/plan/${destinationPlanId}`);
  };

  if (!taskId || !task || task.deletedAt) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.title}>Assign할 task를 찾을 수 없습니다.</Text>
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
      <View style={styles.headerRow}>
        <Text style={styles.title}>Assign Goal</Text>
        <Pressable style={styles.ghostButton} onPress={() => router.dismiss()}>
          <Text style={styles.ghostButtonText}>Close</Text>
        </Pressable>
      </View>

      <Text style={styles.meta}>Task: {task.title}</Text>

      <TextInput
        style={styles.input}
        placeholder="Goal 검색"
        value={search}
        onChangeText={setSearch}
      />

      {recentGoals.length > 0 ? <Text style={styles.sectionTitle}>최근 Goal</Text> : null}
      {recentGoals.map((goal) => (
        <Pressable
          key={goal.id}
          style={[styles.card, selectedGoalId === goal.id ? styles.cardSelected : undefined]}
          onPress={() => setSelectedGoalId(goal.id)}
        >
          <Text style={styles.cardTitle}>{goal.title}</Text>
          <Text style={styles.meta}>{goal.description || '-'}</Text>
        </Pressable>
      ))}

      <Text style={styles.sectionTitle}>목표 선택</Text>
      {otherGoals.map((goal) => (
        <Pressable
          key={goal.id}
          style={[styles.card, selectedGoalId === goal.id ? styles.cardSelected : undefined]}
          onPress={() => setSelectedGoalId(goal.id)}
        >
          <Text style={styles.cardTitle}>{goal.title}</Text>
          <Text style={styles.meta}>{goal.description || '-'}</Text>
        </Pressable>
      ))}

      <Text style={styles.sectionTitle}>Week 선택</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.chip, weekChoice === 'this' ? styles.chipSelected : undefined]}
          onPress={() => setWeekChoice('this')}
        >
          <Text style={styles.chipText}>이번 주</Text>
        </Pressable>
        <Pressable
          style={[styles.chip, weekChoice === 'next' ? styles.chipSelected : undefined]}
          onPress={() => setWeekChoice('next')}
        >
          <Text style={styles.chipText}>다음 주</Text>
        </Pressable>
        <Pressable
          style={[styles.chip, weekChoice === 'custom' ? styles.chipSelected : undefined]}
          onPress={() => setWeekChoice('custom')}
        >
          <Text style={styles.chipText}>직접 지정</Text>
        </Pressable>
      </View>

      {weekChoice === 'custom' ? (
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={customDateInput}
          onChangeText={setCustomDateInput}
        />
      ) : null}

      <Text style={styles.meta}>대상 주 시작: {targetWeekStartIso}</Text>

      <Pressable style={styles.primaryButton} onPress={confirmAssign}>
        <Text style={styles.primaryButtonText}>Confirm Assign</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  content: { padding: 16, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    padding: 10,
    gap: 4,
  },
  cardSelected: { borderColor: '#0f766e', backgroundColor: '#ecfeff' },
  cardTitle: { fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipSelected: { borderColor: '#0f766e', backgroundColor: '#ccfbf1' },
  chipText: { color: '#334155', fontWeight: '600' },
  meta: { color: '#64748b' },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: '#0f766e',
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  ghostButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#94a3b8',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ghostButtonText: { color: '#334155', fontWeight: '600' },
});
