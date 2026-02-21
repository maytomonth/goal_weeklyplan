import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatWeekLabel, getWeekPeriod } from '@/src/core/time/week';

interface WeekNavProps {
  weekStartIso: string;
  onMoveWeek: (direction: -1 | 1) => void;
  onMoveCurrentWeek: () => void;
}

export function WeekNav({ weekStartIso, onMoveWeek, onMoveCurrentWeek }: WeekNavProps) {
  const periodStart = new Date(weekStartIso);
  const nowWeekStart = getWeekPeriod(new Date()).start.toISOString();
  const isCurrentWeek = weekStartIso === nowWeekStart;

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.navButton} onPress={() => onMoveWeek(-1)}>
        <Text style={styles.navButtonText}>←</Text>
      </Pressable>
      <Text style={styles.label}>{formatWeekLabel(periodStart)}</Text>
      <Pressable style={styles.navButton} onPress={() => onMoveWeek(1)}>
        <Text style={styles.navButtonText}>→</Text>
      </Pressable>
      <Pressable
        style={[styles.currentButton, isCurrentWeek ? styles.currentButtonDisabled : undefined]}
        onPress={onMoveCurrentWeek}
        disabled={isCurrentWeek}
      >
        <Text style={styles.currentButtonText}>이번 주</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  navButton: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  navButtonText: { color: '#fff', fontWeight: '700' },
  label: { fontWeight: '700', fontSize: 16, color: '#111827', minWidth: 170 },
  currentButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0f766e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ecfeff',
  },
  currentButtonDisabled: { opacity: 0.45 },
  currentButtonText: { color: '#0f766e', fontWeight: '700' },
});
