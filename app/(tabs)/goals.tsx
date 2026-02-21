import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatWeekLabel } from '@/src/core/time/week';
import { isBlank, isValidIsoDateInput, normalizeTitle } from '@/src/core/validation/form';
import { useToast } from '@/src/components/toast/ToastProvider';
import { useAppStore } from '@/src/state/store';

export default function GoalsScreen() {
  const { showToast } = useToast();

  const goals = useAppStore((state) => state.goals);
  const tasks = useAppStore((state) => state.tasks);
  const plans = useAppStore((state) => state.plans);

  const createGoal = useAppStore((state) => state.createGoal);
  const editGoal = useAppStore((state) => state.editGoal);
  const archiveGoal = useAppStore((state) => state.archiveGoal);

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueType, setDueType] = useState<'none' | 'date'>('none');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<{ title?: string; dueDate?: string }>({});

  const activeGoals = useMemo(
    () => Object.values(goals).filter((goal) => goal.status === 'active'),
    [goals],
  );
  const archivedGoals = useMemo(
    () => Object.values(goals).filter((goal) => goal.status === 'archived'),
    [goals],
  );

  const selectedGoal = selectedGoalId ? goals[selectedGoalId] : null;

  const linkedRecentTasks = useMemo(() => {
    if (!selectedGoalId) {
      return [];
    }

    const cutoff = Date.now() - 28 * 24 * 60 * 60 * 1000;
    return Object.values(tasks)
      .filter((task) => task.goalId === selectedGoalId)
      .filter((task) => {
        const plan = plans[task.planId];
        if (!plan) {
          return false;
        }
        return new Date(plan.periodStart).getTime() >= cutoff;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [plans, selectedGoalId, tasks]);

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
      showToast('Goal을 수정했습니다.', 'success');
    } else {
      createGoal({
        title: normalizedTitle,
        description,
        dueType,
        dueDate: dueType === 'date' ? dueDate : undefined,
      });
      showToast('Goal을 생성했습니다.', 'success');
    }

    resetForm();
  };

  const selectGoal = (goalId: string) => {
    const goal = goals[goalId];
    if (!goal) {
      return;
    }

    setSelectedGoalId(goalId);
    setTitle(goal.title);
    setDescription(goal.description ?? '');
    setDueType(goal.dueType);
    setDueDate(goal.dueDate ?? '');
    setErrors({});
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Goals</Text>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>{selectedGoalId ? 'Edit Goal' : 'New Goal'}</Text>
        <TextInput
          style={[styles.input, errors.title ? styles.inputError : undefined]}
          placeholder="Goal title"
          value={title}
          onChangeText={setTitle}
        />
        {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}

        <TextInput
          style={[styles.input, styles.multiline]}
          multiline
          placeholder="Description"
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
            <Text style={styles.chipText}>No Due</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, dueType === 'date' ? styles.chipSelected : undefined]}
            onPress={() => setDueType('date')}
          >
            <Text style={styles.chipText}>Date Due</Text>
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
            <Text style={styles.primaryButtonText}>{selectedGoalId ? 'Save' : 'Create'}</Text>
          </Pressable>
          {selectedGoalId ? (
            <Pressable style={styles.ghostButton} onPress={resetForm}>
              <Text style={styles.ghostButtonText}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Active</Text>
      {activeGoals.map((goal) => {
        const thisWeekLinkedCount = Object.values(tasks).filter((task) => task.goalId === goal.id).length;
        return (
          <View key={goal.id} style={styles.goalCard}>
            <Pressable onPress={() => selectGoal(goal.id)}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text style={styles.muted}>{goal.description || '-'}</Text>
              <Text style={styles.muted}>
                Due: {goal.dueType === 'date' ? goal.dueDate : 'none'} / Linked Tasks: {thisWeekLinkedCount}
              </Text>
            </Pressable>
            <Pressable
              style={styles.archiveButton}
              onPress={() => {
                archiveGoal(goal.id);
                showToast('Goal을 아카이브했습니다.', 'info');
                if (selectedGoalId === goal.id) {
                  resetForm();
                }
              }}
            >
              <Text style={styles.archiveText}>Archive</Text>
            </Pressable>
          </View>
        );
      })}
      {activeGoals.length === 0 ? <Text style={styles.muted}>활성 Goal이 없습니다.</Text> : null}

      {selectedGoal ? (
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Linked Tasks (최근 4주)</Text>
          {linkedRecentTasks.map((task) => {
            const plan = plans[task.planId];
            const week = plan ? formatWeekLabel(new Date(plan.periodStart)) : '-';
            return (
              <Text key={task.id} style={styles.muted}>
                {task.title} · {week} · {task.status}
              </Text>
            );
          })}
          {linkedRecentTasks.length === 0 ? <Text style={styles.muted}>최근 연결 Task 없음</Text> : null}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Archived</Text>
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
  goalTitle: { fontWeight: '700', fontSize: 15 },
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
