import { useLocalSearchParams } from 'expo-router';
import { GoalsWorkspace } from '@/src/ui/features/goals/GoalsWorkspace';

export default function GoalDetailScreen() {
  const params = useLocalSearchParams<{ goalId?: string }>();
  const goalId = typeof params.goalId === 'string' ? params.goalId : undefined;

  return <GoalsWorkspace routeGoalId={goalId} mobileView="detail" />;
}
