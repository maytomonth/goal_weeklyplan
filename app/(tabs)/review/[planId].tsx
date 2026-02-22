import { useLocalSearchParams } from 'expo-router';
import { ReviewWorkspace } from '@/src/ui/features/review/ReviewWorkspace';

export default function ReviewDetailScreen() {
  const params = useLocalSearchParams<{ planId?: string }>();
  const planId = typeof params.planId === 'string' ? params.planId : undefined;

  return <ReviewWorkspace routePlanId={planId} mobileView="detail" />;
}
