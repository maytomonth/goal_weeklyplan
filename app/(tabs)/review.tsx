import { useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { applyCarryActionsAndEnsureNextPlan } from '@/src/services/carryService';
import { formatWeekLabel, getWeekPeriod } from '@/src/core/time/week';
import { selectPlansByPeriod, selectTasksByPlan } from '@/src/state/selectors/planSelectors';
import {
  selectCarryReady,
  selectCompletionRate,
  selectReviewByPlan,
} from '@/src/state/selectors/reviewSelectors';
import { useAppStore } from '@/src/state/store';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function ReviewScreen() {
  const router = useRouter();

  const selectedWeekStartIso = useAppStore((state) => state.selectedWeekStartIso);
  const selectedPlanId = useAppStore((state) => state.selectedPlanId);
  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);
  const setSelectedWeekStart = useAppStore((state) => state.setSelectedWeekStart);
  const ensureReview = useAppStore((state) => state.ensureReview);
  const setReviewNote = useAppStore((state) => state.setReviewNote);
  const bulkCarryUndecided = useAppStore((state) => state.bulkCarryUndecided);
  const plansById = useAppStore((state) => state.plans);
  const goals = useAppStore((state) => state.goals);

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

  const plans = useAppStore((state) => selectPlansByPeriod(state, periodStartIso));

  useEffect(() => {
    if (!plans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(plans[0]?.id ?? null);
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
  const droppedCount = tasks.filter((task) => task.status === 'dropped').length;

  const onBulkCarry = () => {
    if (!plan) {
      return;
    }
    const todoIds = tasks.filter((task) => task.status === 'todo').map((task) => task.id);
    bulkCarryUndecided(plan.id, todoIds);
  };

  const onApplyAndCreateNext = () => {
    if (!plan) {
      return;
    }

    const nextPlanId = applyCarryActionsAndEnsureNextPlan(useAppStore.getState(), plan.id, {
      defaultUndecidedToCarry: true,
    });
    const latestState = useAppStore.getState();
    const nextPlan = latestState.plans[nextPlanId];
    if (nextPlan) {
      setSelectedWeekStart(nextPlan.periodStart);
      setSelectedPlanId(nextPlanId);
    }
    router.replace('/plan');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Weekly Review</Text>
        <Text style={styles.weekText}>{formatWeekLabel(period.start)}</Text>
      </View>

      <Text style={styles.sectionTitle}>이번 주 목표 리뷰</Text>
      {plans.length === 0 ? <Text style={styles.muted}>이번 주 목표 플랜이 없습니다.</Text> : null}
      {plans.map((item) => {
        const goal = goals[item.goalId];
        const itemTasks = Object.values(useAppStore.getState().tasks).filter((task) => task.planId === item.id);
        const todo = itemTasks.filter((task) => task.status === 'todo').length;
        const done = itemTasks.filter((task) => task.status === 'done').length;
        const denominator = itemTasks.filter((task) => task.status !== 'dropped').length;
        const rate = denominator === 0 ? 0 : done / denominator;

        return (
          <Pressable
            key={item.id}
            style={[styles.planCard, plan?.id === item.id ? styles.planCardActive : undefined]}
            onPress={() => setSelectedPlanId(item.id)}
          >
            <Text style={styles.planCardTitle}>{goal?.title ?? 'Unknown Goal'}</Text>
            <Text style={styles.muted}>완료율 {(rate * 100).toFixed(0)}% · 미완료 {todo}개</Text>
          </Pressable>
        );
      })}

      {plan ? (
        <>
          <Text style={styles.sectionTitle}>Review Detail · {goals[plan.goalId]?.title ?? 'Unknown'}</Text>
          <Text style={styles.metricText}>Completion: {(completionRate * 100).toFixed(0)}%</Text>

          <View style={styles.metricsBox}>
            <Text style={styles.metricText}>Done: {doneCount}</Text>
            <Text style={styles.metricText}>Todo: {todoCount}</Text>
            <Text style={styles.metricText}>Dropped: {droppedCount}</Text>
          </View>

          <Text style={styles.sectionTitle}>Review Note</Text>
          <TextInput
            multiline
            style={styles.noteInput}
            placeholder="잘된 점 / 문제 / 다음 개선..."
            value={review?.summaryNote ?? ''}
            onChangeText={(text) => setReviewNote(plan.id, text)}
          />

          <Pressable style={styles.secondaryButton} onPress={() => router.push('/carry-inbox')}>
            <Text style={styles.secondaryButtonText}>Carry Inbox 열기 ({todoCount})</Text>
          </Pressable>

          <Pressable style={styles.ghostButton} onPress={onBulkCarry}>
            <Text style={styles.ghostButtonText}>일괄 Carry(미선택만)</Text>
          </Pressable>

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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weekText: { color: '#475569', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  planCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    padding: 10,
    gap: 4,
  },
  planCardActive: { borderColor: '#0f766e', backgroundColor: '#f0fdfa' },
  planCardTitle: { fontWeight: '700', fontSize: 15 },
  metricsBox: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    gap: 6,
  },
  metricText: { fontSize: 15, color: '#1f2937' },
  noteInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 10,
    textAlignVertical: 'top',
  },
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
    paddingVertical: 12,
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
