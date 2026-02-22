import { useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WeekNav } from '@/src/components/WeekNav';
import { getWeekPeriod } from '@/src/core/time/week';
import { selectWeeklyPlansForWeek } from '@/src/state/selectors/planSelectors';
import { useAppStore } from '@/src/state/store';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function PlanIndexScreen() {
  const router = useRouter();
  const selectedWeekStartIso = useAppStore((state) => state.selectedWeekStartIso);
  const setSelectedWeekStart = useAppStore((state) => state.setSelectedWeekStart);
  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);
  const goals = useAppStore((state) => state.goals);
  const tasks = useAppStore((state) => state.tasks);

  const period = useMemo(() => {
    if (selectedWeekStartIso) {
      const start = new Date(selectedWeekStartIso);
      const end = new Date(start.getTime() + 7 * DAY_MS);
      return { start, end };
    }
    return getWeekPeriod(new Date());
  }, [selectedWeekStartIso]);

  const periodStartIso = period.start.toISOString();

  useEffect(() => {
    setSelectedWeekStart(periodStartIso);
  }, [periodStartIso, setSelectedWeekStart]);

  const plans = useAppStore((state) => selectWeeklyPlansForWeek(state, periodStartIso));

  const moveWeek = (direction: -1 | 1) => {
    const nextStart = new Date(period.start.getTime() + direction * 7 * DAY_MS);
    setSelectedWeekStart(nextStart.toISOString());
    setSelectedPlanId(null);
  };

  const moveCurrentWeek = () => {
    setSelectedWeekStart(getWeekPeriod(new Date()).start.toISOString());
    setSelectedPlanId(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <WeekNav weekStartIso={periodStartIso} onMoveWeek={moveWeek} onMoveCurrentWeek={moveCurrentWeek} />
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push({ pathname: '/goal-picker', params: { weekStart: periodStartIso } })}
        >
          <Text style={styles.primaryButtonText}>+ Goal Plan</Text>
        </Pressable>
        <Pressable style={styles.ghostButton} onPress={() => router.push('/trash')}>
          <Text style={styles.ghostButtonText}>Trash</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>이번 주 목표 플랜</Text>
      {plans.length === 0 ? <Text style={styles.muted}>플랜이 없습니다. Goal Plan을 추가하세요.</Text> : null}

      {plans.map((plan) => {
        const planTasks = Object.values(tasks).filter((task) => task.planId === plan.id && !task.deletedAt);
        const doneCount = planTasks.filter((task) => task.status === 'done').length;
        const todoCount = planTasks.filter((task) => task.status === 'todo').length;
        const denominator = planTasks.filter((task) => task.status !== 'dropped').length;
        const completionRate = denominator === 0 ? 0 : doneCount / denominator;

        return (
          <Pressable
            key={plan.id}
            style={styles.card}
            onPress={() => {
              setSelectedPlanId(plan.id);
              router.push(`/plan/${plan.id}`);
            }}
          >
            <Text style={styles.cardTitle}>{goals[plan.goalId]?.title ?? 'Unknown Goal'}</Text>
            <Text style={styles.muted}>완료율 {(completionRate * 100).toFixed(0)}% · 남은 todo {todoCount}</Text>
            {plan.top3TaskIds.length > 0 ? (
              <Text style={styles.muted}>Top3 {plan.top3TaskIds.length}개 지정됨</Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f5' },
  content: { padding: 16, gap: 12 },
  headerRow: { gap: 8 },
  actionRow: { flexDirection: 'row', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    padding: 12,
    gap: 6,
  },
  cardTitle: { fontWeight: '700', fontSize: 15 },
  muted: { color: '#64748b' },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: '#0f766e',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  ghostButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#94a3b8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  ghostButtonText: { color: '#334155', fontWeight: '600' },
});
