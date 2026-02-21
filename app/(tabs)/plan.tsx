import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { formatWeekLabel, getWeekPeriod } from '@/src/core/time/week';
import { selectPlanByPeriod, selectTasksByPlan } from '@/src/state/selectors/planSelectors';
import { useAppStore } from '@/src/state/store';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function PlanScreen() {
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const selectedWeekStartIso = useAppStore((state) => state.selectedWeekStartIso);
  const setSelectedWeekStart = useAppStore((state) => state.setSelectedWeekStart);
  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);
  const ensureWeekPlan = useAppStore((state) => state.ensureWeekPlan);
  const updatePlanNote = useAppStore((state) => state.updatePlanNote);
  const toggleTop3 = useAppStore((state) => state.toggleTop3);
  const addTask = useAppStore((state) => state.addTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const toggleTaskDone = useAppStore((state) => state.toggleTaskDone);
  const reorderTask = useAppStore((state) => state.reorderTask);
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
  const periodEndIso = period.end.toISOString();

  const plan = useAppStore((state) => selectPlanByPeriod(state, periodStartIso));
  const tasks = useAppStore((state) => (plan ? selectTasksByPlan(state, plan.id) : []));

  const activeGoals = useMemo(
    () => Object.values(goals).filter((goal) => goal.status === 'active'),
    [goals],
  );

  useEffect(() => {
    const planId = ensureWeekPlan(periodStartIso, periodEndIso);
    setSelectedWeekStart(periodStartIso);
    setSelectedPlanId(planId);
  }, [ensureWeekPlan, periodEndIso, periodStartIso, setSelectedPlanId, setSelectedWeekStart]);

  const moveWeek = (direction: -1 | 1) => {
    const nextStart = new Date(period.start.getTime() + direction * 7 * DAY_MS);
    setSelectedWeekStart(nextStart.toISOString());
  };

  const submitTask = () => {
    if (!plan || !newTaskTitle.trim()) {
      return;
    }

    addTask({
      planId: plan.id,
      title: newTaskTitle.trim(),
    });
    setNewTaskTitle('');
  };

  const moveTask = (index: number, direction: -1 | 1) => {
    if (!plan) {
      return;
    }

    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= tasks.length) {
      return;
    }

    const orderedIds = tasks.map((task) => task.id);
    const [picked] = orderedIds.splice(index, 1);
    orderedIds.splice(nextIndex, 0, picked);
    reorderTask(plan.id, orderedIds);
  };

  const onToggleTop3 = (taskId: string) => {
    if (!plan) {
      return;
    }

    const result = toggleTop3(plan.id, taskId);
    if (!result.ok) {
      Alert.alert('Top 3', 'Top 3는 최대 3개까지 지정할 수 있습니다.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable style={styles.weekButton} onPress={() => moveWeek(-1)}>
          <Text style={styles.weekButtonText}>Prev</Text>
        </Pressable>
        <Text style={styles.weekLabel}>{formatWeekLabel(period.start)}</Text>
        <Pressable style={styles.weekButton} onPress={() => moveWeek(1)}>
          <Text style={styles.weekButtonText}>Next</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Plan Note</Text>
      <TextInput
        multiline
        placeholder="이번 주 의도/전략/주의점..."
        value={plan?.note ?? ''}
        onChangeText={(text) => plan && updatePlanNote(plan.id, text)}
        style={styles.noteInput}
      />

      <Text style={styles.sectionTitle}>Top 3</Text>
      <View style={styles.top3Wrap}>
        {(plan?.top3TaskIds ?? []).map((taskId) => {
          const topTask = tasks.find((task) => task.id === taskId);
          if (!topTask) {
            return null;
          }
          return (
            <View key={taskId} style={styles.top3Badge}>
              <Text style={styles.top3Text}>{topTask.title}</Text>
            </View>
          );
        })}
        {(plan?.top3TaskIds ?? []).length === 0 ? <Text style={styles.muted}>아직 없음</Text> : null}
      </View>

      <Text style={styles.sectionTitle}>Tasks</Text>
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          placeholder="새 Task"
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
          onSubmitEditing={submitTask}
        />
        <Pressable style={styles.primaryButton} onPress={submitTask}>
          <Text style={styles.primaryButtonText}>Add</Text>
        </Pressable>
      </View>

      {tasks.length === 0 ? <Text style={styles.muted}>할 일을 추가해보세요.</Text> : null}

      {tasks.map((task, index) => (
        <View key={task.id} style={styles.taskCard}>
          <View style={styles.taskRow}>
            <Pressable style={styles.checkbox} onPress={() => toggleTaskDone(task.id)}>
              <Text style={styles.checkboxText}>{task.status === 'done' ? '✓' : ''}</Text>
            </Pressable>
            <TextInput
              style={styles.taskInput}
              value={task.title}
              onChangeText={(text) => updateTask(task.id, { title: text })}
            />
          </View>

          <View style={styles.taskActions}>
            <Pressable style={styles.ghostButton} onPress={() => moveTask(index, -1)}>
              <Text style={styles.ghostButtonText}>Up</Text>
            </Pressable>
            <Pressable style={styles.ghostButton} onPress={() => moveTask(index, 1)}>
              <Text style={styles.ghostButtonText}>Down</Text>
            </Pressable>
            <Pressable style={styles.ghostButton} onPress={() => onToggleTop3(task.id)}>
              <Text style={styles.ghostButtonText}>Top3</Text>
            </Pressable>
          </View>

          <Text style={styles.goalLabel}>Goal 연결</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goalRow}>
            <Pressable
              style={[styles.goalChip, !task.goalId ? styles.goalChipSelected : undefined]}
              onPress={() => updateTask(task.id, { goalId: undefined })}
            >
              <Text style={styles.goalChipText}>No Goal</Text>
            </Pressable>
            {activeGoals.map((goal) => (
              <Pressable
                key={goal.id}
                style={[styles.goalChip, task.goalId === goal.id ? styles.goalChipSelected : undefined]}
                onPress={() => updateTask(task.id, { goalId: goal.id })}
              >
                <Text style={styles.goalChipText}>{goal.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f5' },
  content: { padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weekLabel: { fontSize: 17, fontWeight: '700' },
  weekButton: { backgroundColor: '#1f2937', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  weekButtonText: { color: 'white', fontWeight: '600' },
  sectionTitle: { fontWeight: '700', fontSize: 16, marginTop: 4 },
  noteInput: {
    minHeight: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    padding: 10,
    textAlignVertical: 'top',
  },
  top3Wrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    padding: 10,
    gap: 8,
  },
  top3Badge: { backgroundColor: '#dbeafe', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  top3Text: { color: '#1e40af', fontWeight: '600' },
  addRow: { flexDirection: 'row', gap: 8 },
  addInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  primaryButton: { backgroundColor: '#0f766e', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  primaryButtonText: { color: 'white', fontWeight: '700' },
  muted: { color: '#6b7280' },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 10,
    gap: 8,
  },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4b5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxText: { fontWeight: '700' },
  taskInput: { flex: 1, borderBottomWidth: 1, borderColor: '#d1d5db', paddingVertical: 4 },
  taskActions: { flexDirection: 'row', gap: 8 },
  ghostButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ghostButtonText: { color: '#334155', fontWeight: '600' },
  goalLabel: { fontSize: 12, color: '#4b5563' },
  goalRow: { flexDirection: 'row' },
  goalChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginRight: 8,
  },
  goalChipSelected: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
  goalChipText: { color: '#334155', fontSize: 12 },
});
