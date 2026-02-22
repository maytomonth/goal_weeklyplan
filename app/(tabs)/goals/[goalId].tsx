import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatWeekLabel } from '@/src/core/time/week';
import { useToast } from '@/src/components/toast/ToastProvider';
import { archiveGoal, hardDeleteGoal } from '@/src/services/goalService';
import { useAppStore } from '@/src/state/store';

export default function GoalDetailScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ goalId?: string }>();
  const goalId = typeof params.goalId === 'string' ? params.goalId : null;

  const goals = useAppStore((state) => state.goals);
  const plans = useAppStore((state) => state.plans);
  const tasks = useAppStore((state) => state.tasks);
  const reviews = useAppStore((state) => state.reviews);

  const editGoal = useAppStore((state) => state.editGoal);
  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);
  const setSelectedWeekStart = useAppStore((state) => state.setSelectedWeekStart);

  const [hardDeleteOpen, setHardDeleteOpen] = useState(false);
  const [hardDeleteChecked, setHardDeleteChecked] = useState(false);

  const goal = goalId ? goals[goalId] : null;

  const [title, setTitle] = useState(goal?.title ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');

  const weeklyPlanHistory = useMemo(() => {
    if (!goalId) return [];
    return Object.values(plans)
      .filter((plan) => plan.goalId === goalId)
      .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
      .slice(0, 8)
      .map((plan) => {
        const planTasks = Object.values(tasks).filter((task) => task.planId === plan.id && !task.deletedAt);
        const done = planTasks.filter((task) => task.status === 'done').length;
        const denominator = planTasks.filter((task) => task.status !== 'dropped').length;
        const completionRate = denominator === 0 ? 0 : done / denominator;
        const review = Object.values(reviews).find((entry) => entry.planId === plan.id);

        return {
          plan,
          completionRate,
          reviewSummary: review?.summaryNote?.split('\n')[0] ?? '',
        };
      });
  }, [goalId, plans, reviews, tasks]);

  if (!goal || goal.systemType === 'inbox') {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.title}>Goal을 찾을 수 없습니다.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/goals')}>
          <Text style={styles.primaryButtonText}>Goals로 이동</Text>
        </Pressable>
      </View>
    );
  }

  const onSave = () => {
    if (!title.trim()) {
      showToast('목표 제목을 입력하세요.', 'error');
      return;
    }
    editGoal(goal.id, { title: title.trim(), description });
    showToast('목표를 저장했습니다.', 'success');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable style={styles.ghostButton} onPress={() => router.back()}>
          <Text style={styles.ghostButtonText}>Back</Text>
        </Pressable>
        <View style={styles.row}>
          <Pressable
            style={styles.ghostButton}
            onPress={() => {
              archiveGoal(useAppStore.getState(), goal.id);
              showToast('목표를 아카이브했습니다.', 'info');
              router.replace('/goals');
            }}
          >
            <Text style={styles.ghostButtonText}>Archive</Text>
          </Pressable>
          <Pressable style={styles.deleteButton} onPress={() => setHardDeleteOpen(true)}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.title}>{goal.title}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Goal 정보</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="제목" />
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="설명"
          multiline
        />
        <Pressable style={styles.primaryButton} onPress={onSave}>
          <Text style={styles.primaryButtonText}>저장</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>최근 플랜 (8주)</Text>
        {weeklyPlanHistory.length === 0 ? <Text style={styles.muted}>히스토리 없음</Text> : null}
        {weeklyPlanHistory.map(({ plan, completionRate, reviewSummary }) => (
          <View key={plan.id} style={styles.historyCard}>
            <Text style={styles.historyTitle}>{formatWeekLabel(new Date(plan.periodStart))}</Text>
            <Text style={styles.muted}>완료율 {(completionRate * 100).toFixed(0)}%</Text>
            <Text style={styles.muted} numberOfLines={1}>
              {reviewSummary || '리뷰 노트 없음'}
            </Text>
            <Pressable
              style={styles.ghostButton}
              onPress={() => {
                setSelectedPlanId(plan.id);
                setSelectedWeekStart(plan.periodStart);
                router.push(`/plan/${plan.id}`);
              }}
            >
              <Text style={styles.ghostButtonText}>열기</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Modal
        visible={hardDeleteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setHardDeleteOpen(false);
          setHardDeleteChecked(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>영구 삭제 확인</Text>
            <Text style={styles.muted}>연결된 주간플랜/Task/Review/CarryAction이 모두 삭제됩니다.</Text>
            <Pressable
              style={styles.checkRow}
              onPress={() => setHardDeleteChecked((prev) => !prev)}
            >
              <View style={[styles.checkbox, hardDeleteChecked ? styles.checkboxChecked : undefined]} />
              <Text>삭제 내용을 이해했습니다.</Text>
            </Pressable>
            <View style={styles.row}>
              <Pressable
                style={styles.ghostButton}
                onPress={() => {
                  setHardDeleteOpen(false);
                  setHardDeleteChecked(false);
                }}
              >
                <Text style={styles.ghostButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.deleteButton, !hardDeleteChecked ? styles.disabled : undefined]}
                disabled={!hardDeleteChecked}
                onPress={() => {
                  hardDeleteGoal(useAppStore.getState(), goal.id);
                  setHardDeleteOpen(false);
                  setHardDeleteChecked(false);
                  showToast('목표를 영구 삭제했습니다.', 'success');
                  router.replace('/goals');
                }}
              >
                <Text style={styles.deleteButtonText}>영구 삭제</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f5' },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    padding: 12,
    gap: 8,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  historyCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 10,
    gap: 5,
  },
  historyTitle: { fontWeight: '700' },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: '#0f766e',
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  ghostButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#94a3b8',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ghostButtonText: { color: '#334155', fontWeight: '600' },
  deleteButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: '#fff1f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: { color: '#b91c1c', fontWeight: '700' },
  muted: { color: '#64748b' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 14,
    gap: 12,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#94a3b8',
    backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: '#0f766e', borderColor: '#0f766e' },
  disabled: { opacity: 0.4 },
});
