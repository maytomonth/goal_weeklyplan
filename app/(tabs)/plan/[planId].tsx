import { useLocalSearchParams } from 'expo-router';
import { PlanWorkspace } from '@/src/ui/features/plan/PlanWorkspace';

export default function PlanDetailScreen() {
  const params = useLocalSearchParams<{ planId?: string }>();
  const planId = typeof params.planId === 'string' ? params.planId : undefined;

  return <PlanWorkspace routePlanId={planId} mobileView="detail" />;
}
