import { useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { WeekNav } from '@/src/components/WeekNav';
import { getWeekPeriod } from '@/src/core/time/week';
import { applyCarryActionsAndEnsureNextPlan } from '@/src/services/carryService';
import { selectTasksByPlan, selectWeeklyPlansForWeek } from '@/src/state/selectors/planSelectors';
import {
  selectCarryReady,
  selectCompletionRate,
  selectReviewByPlan,
} from '@/src/state/selectors/reviewSelectors';
import { useAppStore } from '@/src/state/store';

const DAY_MS = 24 * 60 * 60 * 1000;

function getReviewBadge(hasReview: boolean, todoCount: number) {
  if (!hasReview) return '리뷰 시작';
  if (todoCount === 0) return '리뷰 완료';
  return 'Carry 필요';
}

export default function ReviewScreen() {
  const router = useRouter();

  const selectedWeekStartIso = useAppStore((state) => state.selectedWeekStartIso);
  const selectedPlanId = useAppStore((state) => state.selectedPlanId);
  const plansById = useAppStore((state) => state.plans);
  const goals = useAppStore((state) => state.goals);
  const allTasks = useAppStore((state) => state.tasks);
  const reviews = useAppStore((state) => state.reviews);

  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);
  const setSelectedWeekStart = useAppStore((state) => state.setSelectedWeekStart);
  const ensureReview = useAppStore((state) => state.ensureReview);
  const setReviewNote = useAppStore((state) => state.setReviewNote);
  const bulkCarryUndecided = useAppStore((state) => state.bulkCarryUndecided);
  const pushRecentGoal = useAppStore((state) => state.pushRecentGoal);

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

  useEffect(() => {
    if (selectedPlanId !== null && !plans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(null);
    }
  }, [plans, selectedPlanId, setSelectedPlanId]);

  useEffect(() => {
    if (selectedPlanId) {
      ensureReview(selectedPlanId);
    }
  }, [ensureReview, selectedPlanId]);

  const plan = selectedPlanId ? plansById[selectedPlanId] : null;
  const tasks = useAppStore((state) => (plan ? selectTasksByPlan(state, plan.id) : []));
  const completionRate = useAppStore((state) => (plan ? selectCompletionRate(state, plan.id) : 0));
  const carryReady = useAppStore((state) => (plan ? selectCarryReady(state, plan.id) : false));
  const review = useAppStore((state) => (plan ? selectReviewByPlan(state, plan.id) : null));

  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const todoCount = tasks.filter((task) => task.status === 'todo').length;

  const moveWeek = (direction: -1 | 1) => {
    const nextStart = new Date(period.start.getTime() + direction * 7 * DAY_MS);
    setSelectedWeekStart(nextStart.toISOString());
    setSelectedPlanId(null);
  };

  const moveCurrentWeek = () => {
    const current = getWeekPeriod(new Date()).start.toISOString();
    setSelectedWeekStart(current);
    setSelectedPlanId(null);
  };

  const openPlanReview = (planId: string) => {
    const targetPlan = plansById[planId];
    if (!targetPlan) return;
    setSelectedPlanId(planId);
    ensureReview(planId);
    pushRecentGoal(targetPlan.goalId);
  };

  const onBulkCarry = () => {
    if (!plan) return;
    const todoIds = tasks.filter((task) => task.status === 'todo').map((task) => task.id);
    bulkCarryUndecided(plan.id, todoIds);
  };

  const onApplyAndCreateNext = () => {
    if (!plan) return;

    const nextPlanId = applyCarryActionsAndEnsureNextPlan(useAppStore.getState(), plan.id, {
      defaultUndecidedToCarry: true,
    });
    const latestState = useAppStore.getState();
    const nextPlan = latestState.plans[nextPlanId];
    if (nextPlan) {
      setSelectedWeekStart(nextPlan.periodStart);
      setSelectedPlanId(nextPlanId);
      pushRecentGoal(nextPlan.goalId);
    }
    router.replace('/plan');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <WeekNav weekStartIso={periodStartIso} onMoveWeek={moveWeek} onMoveCurrentWeek={moveCurrentWeek} />
      </View>

      <Text style={styles.sectionTitle}>이번 주 리뷰</Text>
      {plans.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>이번 주 플랜이 없습니다</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              setSelectedPlanId(null);
              router.push('/plan');
            }}
          >
            <Text style={styles.primaryButtonText}>플랜 만들기</Text>
          </Pressable>
        </View>
      ) : null}

      {plans.map((item) => {
        const goal = goals[item.goalId];
        const itemTasks = Object.values(allTasks).filter((task) => task.planId === item.id && !task.deletedAt);
        const todo = itemTasks.filter((task) => task.status === 'todo').length;
        const done = itemTasks.filter((task) => task.status === 'done').length;
        const denominator = itemTasks.filter((task) => task.status !== 'dropped').length;
        const rate = denominator === 0 ? 0 : done / denominator;
        const hasReview = Boolean(Object.values(reviews).find((entry) => entry.planId === item.id));

        return (
          <View key={item.id} style={[styles.planCard, plan?.id === item.id ? styles.planCardActive : undefined]}>
            <Pressable onPress={() => openPlanReview(item.id)}>
              <Text style={styles.planCardTitle}>{goal?.title ?? 'Unknown Goal'}</Text>
              <Text style={styles.muted}>완료율 {(rate * 100).toFixed(0)}% · 완료 {done} · 남음 {todo}</Text>
              <View style={styles.badgeRow}>
                <Text style={styles.badge}>{getReviewBadge(hasReview, todo)}</Text>
                {todo > 0 ? <Text style={styles.warnBadge}>미완료 {todo}</Text> : null}
              </View>
            </Pressable>
            <Pressable style={styles.inlineActionBtn} onPress={() => openPlanReview(item.id)}>
              <Text style={styles.inlineActionText}>리뷰</Text>
            </Pressable>
          </View>
        );
      })}

      {plan ? (
        <>
          <Text style={styles.sectionTitle}>리뷰 상세 · {goals[plan.goalId]?.title ?? 'Unknown'}</Text>

          <View style={styles.metricsBox}>
            <Text style={styles.metricText}>완료율 {(completionRate * 100).toFixed(0)}%</Text>
            <Text style={styles.muted}>완료 {doneCount} / 남음 {todoCount}</Text>
          </View>

          <Text style={styles.sectionTitle}>Review Note</Text>
          <TextInput
            multiline
            style={styles.noteInput}
            placeholder="잘된 점 / 문제 / 다음 개선..."
            value={review?.summaryNote ?? ''}
            onChangeText={(text) => setReviewNote(plan.id, text)}
          />

          <View style={styles.carryBox}>
            <Text style={styles.sectionTitle}>Carry Inbox</Text>
            {todoCount === 0 ? (
              <Text style={styles.muted}>미완료 항목이 없습니다.</Text>
            ) : (
              <>
                {tasks
                  .filter((task) => task.status === 'todo')
                  .slice(0, 5)
                  .map((task) => (
                    <Text key={task.id} style={styles.carryItem} numberOfLines={1}>
                      • {task.title}
                    </Text>
                  ))}
                <Pressable style={styles.secondaryButton} onPress={() => router.push('/carry-inbox')}>
                  <Text style={styles.secondaryButtonText}>Carry 처리하기</Text>
                </Pressable>
                <Pressable style={styles.ghostButton} onPress={onBulkCarry}>
                  <Text style={styles.ghostButtonText}>일괄 Carry(미선택만)</Text>
                </Pressable>
              </>
            )}
          </View>

          <Pressable
            style={[styles.primaryButton, !(todoCount === 0 || carryReady) ? styles.disabled : undefined]}
            onPress={onApplyAndCreateNext}
            disabled={!(todoCount === 0 || carryReady)}
          >
            <Text style={styles.primaryButtonText}>다음 주 이 목표 플랜 열기</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f5' },
  content: { padding: 16, gap: 12 },
  headerRow: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    padding: 12,
    gap: 8,
  },
  emptyTitle: { fontWeight: '700', color: '#111827' },
  planCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    padding: 10,
    gap: 8,
  },
  planCardActive: { borderColor: '#0f766e', backgroundColor: '#f0fdfa' },
  planCardTitle: { fontWeight: '700', fontSize: 15 },
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
  inlineActionBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  inlineActionText: { color: '#334155', fontWeight: '600' },
  metricsBox: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    gap: 4,
  },
  metricText: { fontSize: 16, color: '#1f2937', fontWeight: '700' },
  noteInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 10,
    textAlignVertical: 'top',
  },
  carryBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 10,
    gap: 8,
  },
  carryItem: { color: '#334155' },
  primaryButton: {
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#fff', fontWeight: '700' },
  ghostButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#94a3b8',
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  ghostButtonText: { fontWeight: '600', color: '#334155' },
  muted: { color: '#64748b' },
  disabled: { opacity: 0.45 },
});
