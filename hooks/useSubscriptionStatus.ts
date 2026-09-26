import { useState, useEffect } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useUserRole } from '@/hooks/useUserRole';

// ✅ Define the status type
export type SubscriptionStatus = 'active' | 'inactive' | 'canceled' | 'past_due';

// ✅ Define what a subscription looks like
interface Subscription {
  id: string;
  status: SubscriptionStatus;
  current_period_start?: number;
  current_period_end?: number;
}

// ✅ Main hook
export function useSubscriptionStatus(userId?: string) {
  const user = useUser();
  const { role } = useUserRole();
  const supabase = useSupabaseClient();
  const [status, setStatus] = useState<SubscriptionStatus>('inactive');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No user? Stay inactive
    if (!userId && !user?.id) {
      setLoading(false);
      return;
    }

    const uid = userId || user?.id;

    async function fetchSubscription() {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', uid)
          .in('status', ['active', 'trialing'])
          .maybeSingle();

        if (error) throw error;

        if (data?.status) {
          setStatus(data.status as SubscriptionStatus);
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, [userId, user?.id, supabase]);

  // Admins get full access to all subscription-gated features
  if (role === 'admin') {
    return { isActive: true, loading: false };
  }

  return { isActive: status === 'active', loading };
}