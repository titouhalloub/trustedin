import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SupabaseClient, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  // Expose the Supabase client for other parts of the app to use
  supabase: SupabaseClient;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  supabase: null as any, // Will be replaced by the provider value
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
  supabaseClient: SupabaseClient;
}

export const AuthProvider = ({ children, supabaseClient }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const manageUserSession = async (sessionUser: User | null) => {
      if (sessionUser) {
        // Check if a profile exists for the user, and create one if not.
        // This handles both new sign-ups and existing users who might not have a profile yet.
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('id', sessionUser.id)
          .single();

        if (!profile) {
          // Profile doesn't exist, let's create it.
          await supabaseClient.from('profiles').insert({
            id: sessionUser.id,
            username: sessionUser.email?.split('@')[0] || `user${Math.floor(Math.random() * 10000)}`,
            full_name: 'New User',
            trust_score: 10,
            reputation_points: 0,
            verification_level: 'unverified',
          });
        }
      }
      setUser(sessionUser);
      setLoading(false);
    };

    // Handle initial session load
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      manageUserSession(session?.user ?? null);
    });

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      manageUserSession(session?.user ?? null);
    });

    return () => authListener.subscription.unsubscribe();
  }, [supabaseClient]);

  const value = {
    user, loading,
    supabase: supabaseClient,
    signIn: (email: string, password: string) => supabaseClient.auth.signInWithPassword({ email, password }),
    signUp: (email: string, password: string) => supabaseClient.auth.signUp({ email, password }),
    signOut: () => supabaseClient.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);