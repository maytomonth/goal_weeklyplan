import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hardDeleteTask, undoSoftDeleteTask } from '@/src/services/taskService';
import { selectDeletedTasks } from '@/src/state/selectors/planSelectors';
import { useAppStore } from '@/src/state/store';

export default function TrashModal() {
  const router = useRouter();
  const goals = useAppStore((state) => state.goals);
  const plans = useAppStore((state) => state.plans);
  const deletedTasks = useAppStore((state) => selectDeletedTasks(state));

  const sorted = useMemo(
    () =>
      [...deletedTasks].sort((a, b) => {
        const left = a.deletedAt ?? '';
        const right = b.deletedAt ?? '';
        return right.localeCompare(left);
      }),
    [deletedTasks],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>휴지통</Text>
        <Pressable style={styles.closeButton} onPress={() => router.dismiss()}>
          <Text style={styles.closeButtonText}>닫기</Text>
        </Pressable>
      </View>

      {sorted.length === 0 ? <Text style={styles.muted}>삭제된 할 일이 없습니다.</Text> : null}

      {sorted.map((task) => {
        const plan = plans[task.planId];
        const goalTitle = plan ? goals[plan.goalId]?.title : null;

        return (
          <View key={task.id} style={styles.card}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.muted}>목표: {goalTitle ?? 'Unknown'}</Text>
            <Text style={styles.muted}>삭제 시각: {task.deletedAt}</Text>
            <View style={styles.actionRow}>
              <Pressable
                style={styles.restoreButton}
                onPress={() => undoSoftDeleteTask(useAppStore.getState(), task.id)}
              >
                <Text style={styles.restoreText}>복원</Text>
              </Pressable>
              <Pressable
                style={styles.deleteButton}
                onPress={() => hardDeleteTask(useAppStore.getState(), task.id)}
              >
                <Text style={styles.deleteText}>영구삭제</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0f' },
  content: { padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  closeButton: {
    borderWidth: 1,
    borderColor: '#2a2d36',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closeButtonText: { color: '#f2f4f8', fontWeight: '600' },
  card: {
    backgroundColor: '#121319',
    borderWidth: 1,
    borderColor: '#2a2d36',
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  taskTitle: { fontWeight: '700', color: '#f2f4f8' },
  actionRow: { flexDirection: 'row', gap: 8 },
  restoreButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0a84ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#1a1c24',
  },
  restoreText: { color: '#0a84ff', fontWeight: '700' },
  deleteButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff453a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#1213191f2',
  },
  deleteText: { color: '#ff6b63', fontWeight: '700' },
  muted: { color: '#9aa1ae' },
});
