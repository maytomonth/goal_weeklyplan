import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Goal } from '@/src/core/types/domain';

interface GoalDueBadgeProps {
  goal?: Pick<Goal, 'dueType' | 'dueDate'> | null;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

function todayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isIsoDate(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function GoalDueBadge({ goal, style, textStyle }: GoalDueBadgeProps) {
  if (!goal || goal.dueType !== 'date' || !isIsoDate(goal.dueDate)) {
    return null;
  }

  const overdue = goal.dueDate < todayDateKey();

  return (
    <View style={[styles.base, overdue ? styles.overdue : styles.upcoming, style]}>
      <Text style={[styles.text, overdue ? styles.textOverdue : styles.textUpcoming, textStyle]}>
        {overdue ? `기한 지남 ${goal.dueDate}` : `기한 ${goal.dueDate}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  upcoming: {
    borderColor: '#0a84ff66',
    backgroundColor: '#0a84ff1f',
  },
  overdue: {
    borderColor: '#ff453a66',
    backgroundColor: '#ff453a1f',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  textUpcoming: {
    color: '#7cc3ff',
  },
  textOverdue: {
    color: '#ff9f98',
  },
});
