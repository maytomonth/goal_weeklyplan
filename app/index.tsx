import { Redirect } from 'expo-router';
import { useAuth } from '@/src/auth/useAuth';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return <Redirect href={user ? '/plan' : '/sign-in'} />;
}
