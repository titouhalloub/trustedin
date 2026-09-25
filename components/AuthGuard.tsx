import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSessionContext, useUser } from '@supabase/auth-helpers-react';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { isLoading, session } = useSessionContext();
  const user = useUser();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Pages that are public and should redirect a logged-in user away (e.g., to /feed)
  const authRoutes = ['/', '/auth', '/login', '/signup'];
  // Pages that are public but can be viewed by both logged-in and logged-out users
  const fullyPublicRoutes = ['/subscriptions'];

  useEffect(() => {
    // If auth state is still loading, do nothing.
    if (isLoading) {
      return;
    }

    const isAuthRoute = authRoutes.some(path => router.pathname === path);
    const isFullyPublic = fullyPublicRoutes.some(path => router.pathname.startsWith(path));

    // If there's no user and we are not on a public page, redirect to auth page.
    if (!user && !isAuthRoute && !isFullyPublic) {      
      setIsRedirecting(true);
      router.replace('/auth');
    }

    // If there IS a user and they are on an auth-only page, redirect to the feed.
    if (user && isAuthRoute) {
      router.replace('/feed'); // Or '/profile', or your main app page
    }

  }, [isLoading, session, user, router]);

  // While auth is loading or we are actively redirecting, show a loading spinner.
  if (isLoading || (isRedirecting && !authRoutes.some(path => router.pathname === path) && !fullyPublicRoutes.some(path => router.pathname.startsWith(path)))) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return <>{children}</>;
};