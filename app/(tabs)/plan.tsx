import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { formatWeekLabel, getWeekPeriod } from '@/src/core/time/week';
import { isBlank, normalizeTitle } from '@/src/core/validation/form';
import { Task } from '@/src/core/types/domain';
import { useToast } from '@/src/components/toast/ToastProvider';
import { selectPlanByPeriod, selectTasksByPlan } from '@/src/state/selectors/planSelectors';
import { useAppStore } from '@/src/state/store';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function PlanScreen() {
  const { showToast } = useToast();
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
    if (!plan) {
      return;
    }

    const title = normalizeTitle(newTaskTitle);
    if (isBlank(title)) {
      showToast('Task 제목을 입력하세요.', 'error');
      return;
    }

    addTask({
      planId: plan.id,
      title,
    });
    setNewTaskTitle('');
    showToast('Task를 추가했습니다.', 'success');
  };

  const onToggleTop3 = (taskId: string) => {
    if (!plan) {
      return;
    }

    const result = toggleTop3(plan.id, taskId);
    if (!result.ok) {
      showToast('Top 3는 최대 3개까지 가능합니다.', 'error');
    }
  };

  const onTaskTitleBlur = (taskId: string, currentTitle: string) => {
    const trimmed = normalizeTitle(currentTitle);
    if (!trimmed) {
      showToast('Task 제목은 비울 수 없습니다.', 'error');
      const original = tasks.find((task) => task.id === taskId)?.title ?? 'Untitled';
      updateTask(taskId, { title: original });
      return;
    }
    if (trimmed !== currentTitle) {
      updateTask(taskId, { title: trimmed });
    }
  };

  const renderTaskItem = ({ item, drag, isActive }: RenderItemParams<Task>) => (
    <ScaleDecorator>
      <View style={[styles.taskCard, isActive ? styles.taskCardActive : undefined]}>
        <View style={styles.taskRow}>
          <Pressable style={styles.checkbox} onPress={() => toggleTaskDone(item.id)}>
            <Text style={styles.checkboxText}>{item.status === 'done' ? '✓' : ''}</Text>
          </Pressable>
          <TextInput
            style={styles.taskInput}
            value={item.title}
            onChangeText={(text) => updateTask(item.id, { title: text })}
            onBlur={() => onTaskTitleBlur(item.id, item.title)}
          />
          <Pressable style={styles.dragHandle} onLongPress={drag} delayLongPress={120}>
            <Text style={styles.dragHandleText}>≡</Text>
          </Pressable>
        </View>

        <View style={styles.taskActions}>
          <Pressable style={styles.ghostButton} onPress={() => onToggleTop3(item.id)}>
            <Text style={styles.ghostButtonText}>Top3</Text>
          </Pressable>
        </View>

        <Text style={styles.goalLabel}>Goal 연결</Text>
        <View style={styles.goalWrap}>
          <Pressable
            style={[styles.goalChip, !item.goalId ? styles.goalChipSelected : undefined]}
            onPress={() => updateTask(item.id, { goalId: undefined })}
          >
            <Text style={styles.goalChipText}>No Goal</Text>
          </Pressable>
          {activeGoals.map((goal) => (
            <Pressable
              key={goal.id}
              style={[styles.goalChip, item.goalId === goal.id ? styles.goalChipSelected : undefined]}
              onPress={() => updateTask(item.id, { goalId: goal.id })}
            >
              <Text style={styles.goalChipText}>{goal.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScaleDecorator>
  );

  return (
    <DraggableFlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={renderTaskItem}
      onDragEnd={({ data }) => {
        if (!plan) {
          return;
        }
        reorderTask(plan.id, data.map((task) => task.id));
        showToast('Task 순서를 변경했습니다.', 'success');
      }}
      activationDistance={8}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
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
          <Text style={styles.hint}>Task 우측 핸들을 길게 눌러 드래그 정렬하세요.</Text>
        </View>
      }
      ListFooterComponent={<View style={{ height: 12 }} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f5' },
  content: { padding: 16, gap: 12 },
  headerBlock: { gap: 12 },
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
  hint: { color: '#64748b', fontSize: 12 },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 10,
    gap: 8,
    marginTop: 8,
  },
  taskCardActive: { borderColor: '#0f766e', shadowColor: '#0f172a', shadowOpacity: 0.14, shadowRadius: 10 },
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
  dragHandle: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dragHandleText: { fontSize: 16, color: '#334155', fontWeight: '700' },
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
  goalWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  goalChipSelected: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
  goalChipText: { color: '#334155', fontSize: 12 },
});
