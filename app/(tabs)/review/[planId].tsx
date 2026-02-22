import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { applyCarryActionsAndEnsureNextPlan } from '@/src/services/carryService';
import { selectTasksByPlan } from '@/src/state/selectors/planSelectors';
import {
  selectCarryReady,
  selectCompletionRate,
  selectReviewByPlan,
} from '@/src/state/selectors/reviewSelectors';
import { useAppStore } from '@/src/state/store';

export default function ReviewDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string }>();

  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);
  const ensureReview = useAppStore((state) => state.ensureReview);
  const setReviewNote = useAppStore((state) => state.setReviewNote);
  const bulkCarryUndecided = useAppStore((state) => state.bulkCarryUndecided);

  const planId = typeof params.planId === 'string' ? params.planId : null;
  const plan = useAppStore((state) => (planId ? state.plans[planId] : null));
  const goal = useAppStore((state) => (plan ? state.goals[plan.goalId] : null));

  const tasks = useAppStore((state) => (plan ? selectTasksByPlan(state, plan.id) : []));
  const completionRate = useAppStore((state) => (plan ? selectCompletionRate(state, plan.id) : 0));
  const carryReady = useAppStore((state) => (plan ? selectCarryReady(state, plan.id) : false));
  const review = useAppStore((state) => (plan ? selectReviewByPlan(state, plan.id) : null));

  useEffect(() => {
    if (planId) {
      setSelectedPlanId(planId);
      ensureReview(planId);
    }
  }, [ensureReview, planId, setSelectedPlanId]);

  if (!plan || !planId) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.title}>리뷰 플랜을 찾을 수 없습니다.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/review')}>
          <Text style={styles.primaryButtonText}>Review Hub로 이동</Text>
        </Pressable>
      </View>
    );
  }

  const todoTasks = tasks.filter((task) => task.status === 'todo');
  const doneCount = tasks.filter((task) => task.status === 'done').length;

  const onApplyAndCreateNext = () => {
    const nextPlanId = applyCarryActionsAndEnsureNextPlan(useAppStore.getState(), plan.id, {
      defaultUndecidedToCarry: true,
    });
    const latest = useAppStore.getState();
    const nextPlan = latest.plans[nextPlanId];
    if (nextPlan) {
      latest.setSelectedWeekStart(nextPlan.periodStart);
      latest.setSelectedPlanId(nextPlanId);
      router.replace(`/plan/${nextPlanId}`);
      return;
    }
    router.replace('/plan');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable style={styles.ghostButton} onPress={() => router.back()}>
          <Text style={styles.ghostButtonText}>Back</Text>
        </Pressable>
        <Pressable
          style={styles.ghostButton}
          onPress={() => router.push({ pathname: '/carry-inbox', params: { planId: plan.id } })}
        >
          <Text style={styles.ghostButtonText}>Carry Inbox</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>{goal?.title ?? 'Unknown Goal'}</Text>

      <View style={styles.metricsBox}>
        <Text style={styles.metricText}>완료율 {(completionRate * 100).toFixed(0)}%</Text>
        <Text style={styles.muted}>완료 {doneCount} / 남음 {todoTasks.length}</Text>
      </View>

      <Text style={styles.sectionTitle}>Review Note</Text>
      <TextInput
        multiline
        style={styles.noteInput}
        placeholder="잘된 점 / 문제 / 다음 개선"
        value={review?.summaryNote ?? ''}
        onChangeText={(text) => setReviewNote(plan.id, text)}
      />

      <Text style={styles.sectionTitle}>Carry 후보</Text>
      {todoTasks.length === 0 ? <Text style={styles.muted}>미완료 항목이 없습니다.</Text> : null}
      {todoTasks.slice(0, 8).map((task) => (
        <Text key={task.id} style={styles.carryItem}>• {task.title}</Text>
      ))}

      {todoTasks.length > 0 ? (
        <Pressable
          style={styles.ghostButton}
          onPress={() => bulkCarryUndecided(plan.id, todoTasks.map((task) => task.id))}
        >
          <Text style={styles.ghostButtonText}>일괄 Carry(미선택)</Text>
        </Pressable>
      ) : null}

      <Pressable
        style={[styles.primaryButton, !(todoTasks.length === 0 || carryReady) ? styles.disabled : undefined]}
        disabled={!(todoTasks.length === 0 || carryReady)}
        onPress={onApplyAndCreateNext}
      >
        <Text style={styles.primaryButtonText}>다음 주 이 목표 플랜 열기</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f5' },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  metricsBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    padding: 12,
  },
  metricText: { fontSize: 20, fontWeight: '700' },
  muted: { color: '#64748b' },
  noteInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  carryItem: { color: '#0f172a' },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: '#0f766e',
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  ghostButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#94a3b8',
    backgroundColor: '#fff',
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostButtonText: { color: '#334155', fontWeight: '600' },
  disabled: { opacity: 0.45 },
});
