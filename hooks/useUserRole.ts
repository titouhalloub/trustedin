// hooks/useUserRole.ts
import { useEffect, useState } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';

/**
 * Reads the current user's role from their profiles row.
 *
 * Uses @supabase/auth-helpers-react (same auth source as useUser/useSubscriptionStatus)
 * instead of the legacy 'contexts/AuthContext', whose AuthProvider is not mounted
 * anywhere in the app (which caused useAuth() to always return { user: null }).
 *
 * Returns { role, loading } where:
 *   - role is 'admin' | 'recruiter' | null
 *   - loading is true while the auth session or profile query is in flight
 */
export const useUserRole = () => {
  const user = useUser();
  const supabase = useSupabaseClient();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // useUser() returns undefined while the session is still loading.
    if (user === undefined) {
      setLoading(true);
      return;
    }

    // Signed out.
    if (user === null) {
      setRole(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (cancelled) return;

        if (error) {
          console.error('useUserRole: failed to fetch role', error);
          setRole(null);
        } else {
          setRole(data?.role ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('useUserRole: unexpected error', err);
          setRole(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, supabase]);

  return { role, loading };
};