import { useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { applyCarryActionsAndEnsureNextPlan } from '@/src/services/carryService';
import { getWeekPeriod } from '@/src/core/time/week';
import { selectPlanByPeriod, selectTasksByPlan } from '@/src/state/selectors/planSelectors';
import {
  selectCarryReady,
  selectCompletionRate,
  selectReviewByPlan,
} from '@/src/state/selectors/reviewSelectors';
import { useAppStore } from '@/src/state/store';

export default function ReviewScreen() {
  const router = useRouter();

  const selectedWeekStartIso = useAppStore((state) => state.selectedWeekStartIso);
  const ensureWeekPlan = useAppStore((state) => state.ensureWeekPlan);
  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);
  const setSelectedWeekStart = useAppStore((state) => state.setSelectedWeekStart);
  const ensureReview = useAppStore((state) => state.ensureReview);
  const setReviewNote = useAppStore((state) => state.setReviewNote);
  const bulkCarryUndecided = useAppStore((state) => state.bulkCarryUndecided);

  const period = useMemo(() => {
    if (selectedWeekStartIso) {
      const start = new Date(selectedWeekStartIso);
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      return { start, end };
    }
    return getWeekPeriod(new Date());
  }, [selectedWeekStartIso]);

  const periodStartIso = period.start.toISOString();
  const periodEndIso = period.end.toISOString();

  const plan = useAppStore((state) => selectPlanByPeriod(state, periodStartIso));
  const tasks = useAppStore((state) => (plan ? selectTasksByPlan(state, plan.id) : []));
  const completionRate = useAppStore((state) => (plan ? selectCompletionRate(state, plan.id) : 0));
  const carryReady = useAppStore((state) => (plan ? selectCarryReady(state, plan.id) : false));
  const review = useAppStore((state) => (plan ? selectReviewByPlan(state, plan.id) : null));

  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const todoCount = tasks.filter((task) => task.status === 'todo').length;
  const droppedCount = tasks.filter((task) => task.status === 'dropped').length;

  useEffect(() => {
    const planId = ensureWeekPlan(periodStartIso, periodEndIso);
    setSelectedPlanId(planId);
    ensureReview(planId);
  }, [ensureReview, ensureWeekPlan, periodEndIso, periodStartIso, setSelectedPlanId]);

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
      <Text style={styles.title}>Weekly Review</Text>
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
        onChangeText={(text) => plan && setReviewNote(plan.id, text)}
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
        <Text style={styles.primaryButtonText}>다음 주 계획 만들기</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f5' },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
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
  disabled: { opacity: 0.45 },
});
