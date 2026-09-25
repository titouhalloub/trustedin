import { useRouter } from 'next/router';
import { useUser } from '@supabase/auth-helpers-react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

const withSubscription = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
  const WithSubscriptionComponent = (props: P) => {
    const router = useRouter();
    console.log('WithSubscriptionComponent rendered for path:', router.pathname);
    const user = useUser();
    const { isActive, loading } = useSubscriptionStatus(user?.id);

    if (loading) {
      return <div>Loading...</div>; // Or a spinner component
    }

    if (!isActive) {
      router.replace('/subscriptions');
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  return WithSubscriptionComponent;
};

export default withSubscription;
