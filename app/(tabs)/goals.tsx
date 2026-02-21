import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatWeekLabel, getWeekPeriod } from '@/src/core/time/week';
import { isBlank, isValidIsoDateInput, normalizeTitle } from '@/src/core/validation/form';
import { useToast } from '@/src/components/toast/ToastProvider';
import { useAppStore } from '@/src/state/store';

export default function GoalsScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const goals = useAppStore((state) => state.goals);
  const plans = useAppStore((state) => state.plans);
  const tasks = useAppStore((state) => state.tasks);
  const reviews = useAppStore((state) => state.reviews);

  const createGoal = useAppStore((state) => state.createGoal);
  const editGoal = useAppStore((state) => state.editGoal);
  const archiveGoal = useAppStore((state) => state.archiveGoal);
  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);
  const setSelectedWeekStart = useAppStore((state) => state.setSelectedWeekStart);

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueType, setDueType] = useState<'none' | 'date'>('none');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<{ title?: string; dueDate?: string }>({});

  const weekStartIso = getWeekPeriod(new Date()).start.toISOString();

  const activeGoals = useMemo(
    () => Object.values(goals).filter((goal) => goal.status === 'active'),
    [goals],
  );
  const archivedGoals = useMemo(
    () => Object.values(goals).filter((goal) => goal.status === 'archived'),
    [goals],
  );

  const selectedGoal = selectedGoalId ? goals[selectedGoalId] : null;

  const weeklyPlanHistory = useMemo(() => {
    if (!selectedGoalId) {
      return [];
    }

    return Object.values(plans)
      .filter((plan) => plan.goalId === selectedGoalId)
      .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
      .slice(0, 8)
      .map((plan) => {
        const planTasks = Object.values(tasks).filter((task) => task.planId === plan.id);
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
  }, [plans, reviews, selectedGoalId, tasks]);

  const resetForm = () => {
    setSelectedGoalId(null);
    setTitle('');
    setDescription('');
    setDueType('none');
    setDueDate('');
    setErrors({});
  };

  const validateForm = () => {
    const nextErrors: { title?: string; dueDate?: string } = {};
    const normalizedTitle = normalizeTitle(title);

    if (isBlank(normalizedTitle)) {
      nextErrors.title = '제목은 필수입니다.';
    }

    if (dueType === 'date' && !isValidIsoDateInput(dueDate)) {
      nextErrors.dueDate = 'YYYY-MM-DD 형식의 유효한 날짜를 입력하세요.';
    }

    setErrors(nextErrors);
    return { ok: Object.keys(nextErrors).length === 0, normalizedTitle };
  };

  const submit = () => {
    const { ok, normalizedTitle } = validateForm();
    if (!ok) {
      showToast('폼 오류를 확인하세요.', 'error');
      return;
    }

    if (selectedGoalId) {
      editGoal(selectedGoalId, {
        title: normalizedTitle,
        description,
        dueType,
        dueDate: dueType === 'date' ? dueDate : undefined,
      });
      showToast('목표를 수정했습니다.', 'success');
    } else {
      createGoal({
        title: normalizedTitle,
        description,
        dueType,
        dueDate: dueType === 'date' ? dueDate : undefined,
      });
      showToast('목표를 생성했습니다.', 'success');
    }

    resetForm();
  };

  const selectGoal = (goalId: string) => {
    const goal = goals[goalId];
    if (!goal) return;

    setSelectedGoalId(goalId);
    setTitle(goal.title);
    setDescription(goal.description ?? '');
    setDueType(goal.dueType);
    setDueDate(goal.dueDate ?? '');
    setErrors({});
  };

  const openWeeklyPlan = (planId: string, weekIso: string) => {
    setSelectedPlanId(planId);
    setSelectedWeekStart(weekIso);
    router.push('/plan');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Goals</Text>
        <Pressable style={styles.primaryButton} onPress={resetForm}>
          <Text style={styles.primaryButtonText}>+ 목표 만들기</Text>
        </Pressable>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>{selectedGoalId ? '목표 수정' : '목표 생성'}</Text>
        <TextInput
          style={[styles.input, errors.title ? styles.inputError : undefined]}
          placeholder="목표 제목"
          value={title}
          onChangeText={setTitle}
        />
        {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}

        <TextInput
          style={[styles.input, styles.multiline]}
          multiline
          placeholder="설명"
          value={description}
          onChangeText={setDescription}
        />

        <View style={styles.row}>
          <Pressable
            style={[styles.chip, dueType === 'none' ? styles.chipSelected : undefined]}
            onPress={() => {
              setDueType('none');
              setErrors((prev) => ({ ...prev, dueDate: undefined }));
            }}
          >
            <Text style={styles.chipText}>기한 없음</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, dueType === 'date' ? styles.chipSelected : undefined]}
            onPress={() => setDueType('date')}
          >
            <Text style={styles.chipText}>날짜 기한</Text>
          </Pressable>
        </View>

        {dueType === 'date' ? (
          <>
            <TextInput
              style={[styles.input, errors.dueDate ? styles.inputError : undefined]}
              placeholder="YYYY-MM-DD"
              value={dueDate}
              onChangeText={setDueDate}
            />
            {errors.dueDate ? <Text style={styles.errorText}>{errors.dueDate}</Text> : null}
          </>
        ) : null}

        <View style={styles.row}>
          <Pressable style={styles.primaryButton} onPress={submit}>
            <Text style={styles.primaryButtonText}>{selectedGoalId ? '저장' : '생성'}</Text>
          </Pressable>
          {selectedGoalId ? (
            <Pressable style={styles.ghostButton} onPress={resetForm}>
              <Text style={styles.ghostButtonText}>취소</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={styles.sectionTitle}>목표 목록</Text>
      {activeGoals.map((goal) => {
        const hasCurrentWeekPlan = Object.values(plans).some(
          (plan) => plan.goalId === goal.id && plan.periodStart === weekStartIso,
        );

        return (
          <View key={goal.id} style={styles.goalCard}>
            <Pressable onPress={() => selectGoal(goal.id)}>
              <View style={styles.goalTopRow}>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                <Text style={[styles.weekBadge, hasCurrentWeekPlan ? styles.hasPlanBadge : styles.noPlanBadge]}>
                  {hasCurrentWeekPlan ? '이번 주 플랜 있음' : '이번 주 플랜 없음'}
                </Text>
              </View>
              <Text style={styles.muted}>{goal.description || '-'}</Text>
              <Text style={styles.muted}>기한: {goal.dueType === 'date' ? goal.dueDate : '없음'}</Text>
            </Pressable>
            <Pressable
              style={styles.archiveButton}
              onPress={() => {
                archiveGoal(goal.id);
                showToast('목표를 아카이브했습니다.', 'info');
                if (selectedGoalId === goal.id) resetForm();
              }}
            >
              <Text style={styles.archiveText}>아카이브</Text>
            </Pressable>
          </View>
        );
      })}
      {activeGoals.length === 0 ? <Text style={styles.muted}>활성 목표가 없습니다.</Text> : null}

      {selectedGoal ? (
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>최근 플랜 (8주)</Text>
          {weeklyPlanHistory.map(({ plan, completionRate, reviewSummary }) => (
            <View key={plan.id} style={styles.historyCard}>
              <Text style={styles.historyTitle}>{formatWeekLabel(new Date(plan.periodStart))}</Text>
              <Text style={styles.muted}>완료율 {(completionRate * 100).toFixed(0)}%</Text>
              <Text style={styles.muted} numberOfLines={1}>
                {reviewSummary || '리뷰 노트 없음'}
              </Text>
              <Pressable
                style={styles.inlineActionBtn}
                onPress={() => openWeeklyPlan(plan.id, plan.periodStart)}
              >
                <Text style={styles.inlineActionText}>열기</Text>
              </Pressable>
            </View>
          ))}
          {weeklyPlanHistory.length === 0 ? <Text style={styles.muted}>주간 플랜 히스토리 없음</Text> : null}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>아카이브</Text>
      {archivedGoals.map((goal) => (
        <View key={goal.id} style={styles.goalCard}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.muted}>archived</Text>
        </View>
      ))}
      {archivedGoals.length === 0 ? <Text style={styles.muted}>아카이브 없음</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  formCard: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 10,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  inputError: { borderColor: '#dc2626' },
  errorText: { color: '#b91c1c', fontSize: 12 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipSelected: { borderColor: '#0f766e', backgroundColor: '#ccfbf1' },
  chipText: { color: '#334155', fontWeight: '600' },
  primaryButton: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  ghostButton: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ghostButtonText: { color: '#334155', fontWeight: '600' },
  goalCard: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 10,
    gap: 6,
  },
  goalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  weekBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  hasPlanBadge: { backgroundColor: '#ccfbf1', color: '#065f46' },
  noPlanBadge: { backgroundColor: '#fee2e2', color: '#991b1b' },
  historyCard: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    padding: 10,
    gap: 4,
  },
  historyTitle: { fontWeight: '700', color: '#334155' },
  goalTitle: { fontWeight: '700', fontSize: 15 },
  inlineActionBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 2,
  },
  inlineActionText: { color: '#334155', fontWeight: '600' },
  muted: { color: '#6b7280' },
  archiveButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  archiveText: { color: '#b91c1c', fontWeight: '600' },
});
