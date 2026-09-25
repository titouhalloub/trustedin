import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

/**
 * Fetches the role for the currently authenticated user.
 * Returns the role and a loading state.
 */
export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We can only fetch a role if we have a user object with an ID.
    if (!user?.id) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      setLoading(true);
      try {
        // Ensure we only query when we have a user ID.
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          // Don't throw, just log it. This prevents crashes on RLS errors.
          console.error('Error fetching user role:', error.message);
          setRole(null);
        } else {
          setRole(data?.role || null);
        }

      } catch (error) {
        console.error('An unexpected error occurred while fetching user role:', error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user?.id]); // Depend specifically on user.id for stability

  return { role, loading };
};