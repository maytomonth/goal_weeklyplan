import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { isBlank, isValidIsoDateInput, normalizeTitle } from '@/src/core/validation/form';
import { useToast } from '@/src/components/toast/ToastProvider';
import { useAppStore } from '@/src/state/store';

export default function GoalsIndexScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const goals = useAppStore((state) => state.goals);
  const createGoal = useAppStore((state) => state.createGoal);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueType, setDueType] = useState<'none' | 'date'>('none');
  const [dueDate, setDueDate] = useState('');

  const activeGoals = useMemo(
    () => Object.values(goals).filter((goal) => goal.status === 'active' && goal.systemType !== 'inbox'),
    [goals],
  );

  const submit = () => {
    const normalizedTitle = normalizeTitle(title);
    if (isBlank(normalizedTitle)) {
      showToast('목표 제목은 필수입니다.', 'error');
      return;
    }
    if (dueType === 'date' && !isValidIsoDateInput(dueDate)) {
      showToast('기한은 YYYY-MM-DD 형식이어야 합니다.', 'error');
      return;
    }

    createGoal({
      title: normalizedTitle,
      description,
      dueType,
      dueDate: dueType === 'date' ? dueDate : undefined,
    });
    setTitle('');
    setDescription('');
    setDueType('none');
    setDueDate('');
    showToast('목표를 생성했습니다.', 'success');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Goals</Text>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>새 목표</Text>
        <TextInput style={styles.input} placeholder="목표 제목" value={title} onChangeText={setTitle} />
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="설명"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <View style={styles.row}>
          <Pressable
            style={[styles.chip, dueType === 'none' ? styles.chipSelected : undefined]}
            onPress={() => setDueType('none')}
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
          <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={dueDate} onChangeText={setDueDate} />
        ) : null}

        <Pressable style={styles.primaryButton} onPress={submit}>
          <Text style={styles.primaryButtonText}>+ Goal</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>활성 목표</Text>
      {activeGoals.length === 0 ? <Text style={styles.muted}>활성 목표가 없습니다.</Text> : null}
      {activeGoals.map((goal) => (
        <Pressable key={goal.id} style={styles.goalCard} onPress={() => router.push(`/goals/${goal.id}`)}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.muted}>{goal.description || '-'}</Text>
          <Text style={styles.muted}>기한: {goal.dueType === 'date' ? goal.dueDate : '없음'}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f5' },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  formCard: {
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
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipSelected: { borderColor: '#0f766e', backgroundColor: '#ccfbf1' },
  chipText: { color: '#334155', fontWeight: '600' },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: '#0f766e',
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  goalCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    padding: 12,
    gap: 5,
  },
  goalTitle: { fontWeight: '700', fontSize: 15 },
  muted: { color: '#64748b' },
});
