import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { useToast } from '@/src/components/toast/ToastProvider';
import { Task } from '@/src/core/types/domain';
import { isBlank, normalizeTitle } from '@/src/core/validation/form';
import { deleteWeeklyPlan } from '@/src/services/planService';
import { softDeleteTask, undoSoftDeleteTask } from '@/src/services/taskService';
import { selectTasksByPlan } from '@/src/state/selectors/planSelectors';
import { useAppStore } from '@/src/state/store';

export default function PlanDetailScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ planId?: string }>();
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const selectedPlanId = useAppStore((state) => state.selectedPlanId);
  const setSelectedPlanId = useAppStore((state) => state.setSelectedPlanId);
  const planId = typeof params.planId === 'string' ? params.planId : selectedPlanId;

  const plan = useAppStore((state) => (planId ? state.plans[planId] : null));
  const goalTitle = useAppStore((state) => (plan ? state.goals[plan.goalId]?.title ?? 'Unknown Goal' : ''));
  const tasks = useAppStore((state) => (plan ? selectTasksByPlan(state, plan.id) : []));

  const updatePlanNote = useAppStore((state) => state.updatePlanNote);
  const addTask = useAppStore((state) => state.addTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const toggleTaskDone = useAppStore((state) => state.toggleTaskDone);
  const reorderTask = useAppStore((state) => state.reorderTask);
  const toggleTop3 = useAppStore((state) => state.toggleTop3);

  const top3Tasks = useMemo(() => {
    if (!plan) return [];
    return plan.top3TaskIds.map((taskId) => tasks.find((task) => task.id === taskId)).filter(Boolean);
  }, [plan, tasks]);

  if (!plan || !planId) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyTitle}>플랜을 찾을 수 없습니다.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/plan')}>
          <Text style={styles.primaryButtonText}>Plan Hub로 이동</Text>
        </Pressable>
      </View>
    );
  }

  const submitTask = () => {
    const title = normalizeTitle(newTaskTitle);
    if (isBlank(title)) {
      showToast('Task 제목을 입력하세요.', 'error');
      return;
    }

    addTask({
      planId: plan.id,
      goalId: plan.goalId,
      title,
    });
    setNewTaskTitle('');
  };

  const onTaskTitleBlur = (task: Task) => {
    const trimmed = normalizeTitle(task.title);
    if (!trimmed) {
      showToast('Task 제목은 비울 수 없습니다.', 'error');
      return;
    }
    if (trimmed !== task.title) {
      updateTask(task.id, { title: trimmed });
    }
  };

  const onDeleteTask = (taskId: string) => {
    softDeleteTask(useAppStore.getState(), taskId);
    showToast(
      '삭제됨',
      'info',
      {
        label: 'Undo',
        onPress: () => undoSoftDeleteTask(useAppStore.getState(), taskId),
      },
      10000,
    );
  };

  const onDeletePlan = () => {
    const execute = () => {
      deleteWeeklyPlan(useAppStore.getState(), plan.id);
      setSelectedPlanId(null);
      showToast('주간플랜을 삭제했습니다.', 'success');
      router.replace('/plan');
    };

    if (Platform.OS === 'web') {
      if (globalThis.confirm('이 주간플랜을 삭제할까요? 관련 Task/Review/CarryAction도 삭제됩니다.')) {
        execute();
      }
      return;
    }

    Alert.alert('주간플랜 삭제', '관련 데이터가 함께 삭제됩니다.', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: execute },
    ]);
  };

  const renderTask = ({ item, drag, isActive }: RenderItemParams<Task>) => (
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
            onBlur={() => onTaskTitleBlur(item)}
          />
          <Pressable style={styles.dragHandle} onLongPress={drag} delayLongPress={120}>
            <Text style={styles.dragHandleText}>≡</Text>
          </Pressable>
        </View>
        <View style={styles.taskActions}>
          <Pressable style={styles.ghostButton} onPress={() => onDeleteTask(item.id)}>
            <Text style={styles.ghostButtonText}>삭제</Text>
          </Pressable>
          <Pressable
            style={styles.ghostButton}
            onPress={() => {
              const result = toggleTop3(plan.id, item.id);
              if (!result.ok) {
                showToast('Top3는 최대 3개입니다.', 'error');
              }
            }}
          >
            <Text style={styles.ghostButtonText}>☆ Top3</Text>
          </Pressable>
        </View>
      </View>
    </ScaleDecorator>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable style={styles.ghostButton} onPress={() => router.back()}>
          <Text style={styles.ghostButtonText}>Back</Text>
        </Pressable>
        <Pressable style={styles.ghostButton} onPress={() => router.push(`/review/${plan.id}`)}>
          <Text style={styles.ghostButtonText}>Review</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>{goalTitle}</Text>

      <Text style={styles.sectionTitle}>Note</Text>
      <TextInput
        multiline
        style={styles.noteInput}
        value={plan.note}
        onChangeText={(text) => updatePlanNote(plan.id, text)}
        placeholder="이번 주 운영 메모"
      />

      <Text style={styles.sectionTitle}>Top3</Text>
      {top3Tasks.length === 0 ? <Text style={styles.muted}>Top3 없음</Text> : null}
      {top3Tasks.map((task) => (
        <Text key={task!.id} style={styles.top3Item}>• {task!.title}</Text>
      ))}

      <Text style={styles.sectionTitle}>Tasks</Text>
      <View style={styles.newTaskRow}>
        <TextInput
          style={styles.newTaskInput}
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
          placeholder="새 task"
          onSubmitEditing={submitTask}
          returnKeyType="done"
        />
        <Pressable style={styles.primaryButton} onPress={submitTask}>
          <Text style={styles.primaryButtonText}>Add</Text>
        </Pressable>
      </View>

      <DraggableFlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        scrollEnabled={false}
        onDragEnd={({ data }) => reorderTask(plan.id, data.map((task) => task.id))}
      />

      <Pressable style={styles.deletePlanButton} onPress={onDeletePlan}>
        <Text style={styles.deletePlanButtonText}>이 주간플랜 삭제</Text>
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
  top3Item: { color: '#0f172a' },
  newTaskRow: { flexDirection: 'row', gap: 8 },
  newTaskInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  taskCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    padding: 10,
    gap: 8,
    marginBottom: 8,
  },
  taskCardActive: { borderColor: '#0f766e', backgroundColor: '#f0fdfa' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxText: { fontWeight: '700' },
  taskInput: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dragHandle: { paddingHorizontal: 8, paddingVertical: 4 },
  dragHandleText: { color: '#334155', fontWeight: '700' },
  taskActions: { flexDirection: 'row', gap: 8 },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: '#0f766e',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  ghostButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#94a3b8',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#fff',
  },
  ghostButtonText: { color: '#334155', fontWeight: '600' },
  deletePlanButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: '#fff1f2',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  deletePlanButtonText: { color: '#b91c1c', fontWeight: '700' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
});
