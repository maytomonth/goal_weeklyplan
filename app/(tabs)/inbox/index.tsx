import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useToast } from '@/src/components/toast/ToastProvider';
import { getWeekPeriod } from '@/src/core/time/week';
import { isBlank, normalizeTitle } from '@/src/core/validation/form';
import { quickAddInboxTask, softDeleteTask, undoSoftDeleteTask } from '@/src/services/taskService';
import { selectInboxTasks } from '@/src/state/selectors/planSelectors';
import { useAppStore } from '@/src/state/store';

export default function InboxIndexScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [quickTitle, setQuickTitle] = useState('');

  const ensureInboxGoal = useAppStore((state) => state.ensureInboxGoal);
  const plans = useAppStore((state) => state.plans);
  const goals = useAppStore((state) => state.goals);
  const inboxTasks = useAppStore((state) => selectInboxTasks(state));

  useEffect(() => {
    ensureInboxGoal();
  }, [ensureInboxGoal]);

  const onQuickAdd = () => {
    const title = normalizeTitle(quickTitle);
    if (isBlank(title)) {
      showToast('입력값이 비어 있습니다.', 'error');
      return;
    }

    quickAddInboxTask(useAppStore.getState(), title, getWeekPeriod(new Date()).start.toISOString());
    setQuickTitle('');
    showToast('Inbox task를 추가했습니다.', 'success');
  };

  const onDelete = (taskId: string) => {
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Inbox</Text>
        <Pressable style={styles.ghostButton} onPress={() => router.push('/trash')}>
          <Text style={styles.ghostButtonText}>Trash</Text>
        </Pressable>
      </View>

      <View style={styles.quickAddRow}>
        <TextInput
          style={styles.quickInput}
          value={quickTitle}
          onChangeText={setQuickTitle}
          placeholder="Quick Add"
          returnKeyType="done"
          onSubmitEditing={onQuickAdd}
        />
        <Pressable style={styles.primaryButton} onPress={onQuickAdd}>
          <Text style={styles.primaryButtonText}>Add</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>정리 대기 Task</Text>
      {inboxTasks.length === 0 ? <Text style={styles.muted}>Inbox task가 없습니다.</Text> : null}

      {inboxTasks.map((task) => {
        const plan = plans[task.planId];
        const goalTitle = goals[task.goalId]?.title ?? 'Inbox';

        return (
          <View key={task.id} style={styles.card}>
            <Text style={styles.cardTitle}>{task.title}</Text>
            <Text style={styles.metaText}>현재 Goal: {goalTitle}</Text>
            <Text style={styles.metaText}>주차: {plan?.periodStart ?? '-'}</Text>
            <View style={styles.row}>
              <Pressable
                style={styles.ghostButton}
                onPress={() => router.push({ pathname: '/assign-goal', params: { taskId: task.id } })}
              >
                <Text style={styles.ghostButtonText}>Assign</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={() => onDelete(task.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f5' },
  content: { padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  quickAddRow: { flexDirection: 'row', gap: 8 },
  quickInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    padding: 12,
    gap: 6,
  },
  cardTitle: { fontWeight: '700', fontSize: 15 },
  metaText: { color: '#64748b' },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
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
  deleteText: { color: '#b91c1c', fontWeight: '700' },
  muted: { color: '#64748b' },
});
