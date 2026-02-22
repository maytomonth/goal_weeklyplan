import { useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WeekNav } from '@/src/components/WeekNav';
import { getWeekPeriod } from '@/src/core/time/week';
import { selectWeeklyPlansForWeek } from '@/src/state/selectors/planSelectors';
import { useAppStore } from '@/src/state/store';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function ReviewIndexScreen() {
  const router = useRouter();
  const selectedWeekStartIso = useAppStore((state) => state.selectedWeekStartIso);
  const setSelectedWeekStart = useAppStore((state) => state.setSelectedWeekStart);
  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);
  const goals = useAppStore((state) => state.goals);
  const tasks = useAppStore((state) => state.tasks);
  const reviews = useAppStore((state) => state.reviews);

  const period = useMemo(() => {
    if (selectedWeekStartIso) {
      const start = new Date(selectedWeekStartIso);
      const end = new Date(start.getTime() + 7 * DAY_MS);
      return { start, end };
    }
    return getWeekPeriod(new Date());
  }, [selectedWeekStartIso]);

  const periodStartIso = period.start.toISOString();
  const plans = useAppStore((state) => selectWeeklyPlansForWeek(state, periodStartIso));

  useEffect(() => {
    setSelectedWeekStart(periodStartIso);
  }, [periodStartIso, setSelectedWeekStart]);

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
      <WeekNav weekStartIso={periodStartIso} onMoveWeek={moveWeek} onMoveCurrentWeek={moveCurrentWeek} />
      <Text style={styles.sectionTitle}>이번 주 리뷰 허브</Text>
      {plans.length === 0 ? <Text style={styles.muted}>리뷰할 플랜이 없습니다.</Text> : null}

      {plans.map((plan) => {
        const planTasks = Object.values(tasks).filter((task) => task.planId === plan.id && !task.deletedAt);
        const done = planTasks.filter((task) => task.status === 'done').length;
        const todo = planTasks.filter((task) => task.status === 'todo').length;
        const denominator = planTasks.filter((task) => task.status !== 'dropped').length;
        const completionRate = denominator === 0 ? 0 : done / denominator;
        const review = Object.values(reviews).find((entry) => entry.planId === plan.id);

        return (
          <Pressable
            key={plan.id}
            style={styles.card}
            onPress={() => {
              setSelectedPlanId(plan.id);
              router.push(`/review/${plan.id}`);
            }}
          >
            <Text style={styles.cardTitle}>{goals[plan.goalId]?.title ?? 'Unknown Goal'}</Text>
            <Text style={styles.muted}>완료율 {(completionRate * 100).toFixed(0)}% · 남은 todo {todo}</Text>
            <View style={styles.badgeRow}>
              <Text style={styles.badge}>{review ? '리뷰 있음' : '리뷰 시작'}</Text>
              {todo > 0 ? <Text style={styles.warnBadge}>Carry 필요</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f5' },
  content: { padding: 16, gap: 12 },
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
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e0f2fe',
    color: '#075985',
    fontSize: 12,
    fontWeight: '700',
  },
  warnBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontSize: 12,
    fontWeight: '700',
  },
});
