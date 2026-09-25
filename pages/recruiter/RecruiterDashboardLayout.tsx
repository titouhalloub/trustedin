import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useUser } from '@supabase/auth-helpers-react';
import { Home, Search, Briefcase, BarChart2, FolderKanban, Share2, Contact } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

const RecruiterDashboardLayout = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const user = useUser();
  const { isActive, loading } = useSubscriptionStatus(user?.id);

  const navigation = [
    { name: 'Dashboard', href: '/recruiter/dashboard', icon: Home },
    { name: 'Projects', href: '/recruiter/projects', icon: FolderKanban },
    { name: 'Candidate Search', href: '/recruiter/search', icon: Search },
    { name: 'Job Postings', href: '/recruiter/jobs', icon: Briefcase },
    { name: 'Analytics', href: '/recruiter/analytics', icon: BarChart2 },
    { name: 'ATS Integration', href: '#', icon: Share2, comingSoon: true },
    { name: 'CRM Integration', href: '#', icon: Contact, comingSoon: true },
  ];

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
  }

  if (!isActive) {
    router.replace('/subscriptions');
    return null;
  }

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="hidden w-72 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col gap-2 p-4">
          {navigation.map((item) =>
            item.comingSoon ? (
              <div
                key={item.name}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted-foreground/50 cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </div>
                <Badge className="border-transparent bg-gradient-to-r from-orange-400 to-rose-500 text-primary-foreground shadow">
                  Soon
                </Badge>
              </div>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  router.pathname === item.href && 'bg-muted text-primary'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          )}
        </nav>
      </aside>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
};

export default RecruiterDashboardLayout;