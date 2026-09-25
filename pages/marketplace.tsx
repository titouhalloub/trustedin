import { useEffect, useState } from 'react';
import { ProfileSidebar } from '../components/ProfileSidebar';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
// The hooks `useSubscriptionStatus` and `useUserRole` were tied to the old auth context.
// The logic is now handled directly within this component.
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useDebounce } from 'use-debounce';
import { CandidateCard } from '@/components/marketplace/CandidateCard';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationLink, PaginationNext } from '@/components/ui/pagination';

// Define a type for the candidate profiles we'll fetch
interface CandidateProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  trust_score: number;
  reputation_points: number;
  verification_level: string;
}

export default function MarketplacePage() {
  const user = useUser();
  const supabase = useSupabaseClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canAccessMarketplace, setCanAccessMarketplace] = useState(false);

  useEffect(() => {
    if (user && supabase) {
      const checkAccessAndFetchData = async () => {
        setLoading(true);
        console.log('[Marketplace Debug] Checking access for user:', user.id);

        // Fetch profile and subscription status in one go
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*, subscription:subscriptions(*)')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('[Marketplace Debug] Error fetching profile for access check:', error);
          setCanAccessMarketplace(false);
        } else {
          console.log('[Marketplace Debug] Fetched profile data:', profileData);
          setProfile(profileData); // Set the profile for the sidebar

          const subscription = profileData?.subscription;
          const isAdmin = profileData?.role === 'admin';
          const isSubscribed = subscription && (subscription.status === 'active' || subscription.status === 'trialing') && new Date(subscription.current_period_ends_at) > new Date();

          console.log(`[Marketplace Debug] isAdmin: ${isAdmin}, isSubscribed: ${isSubscribed}`);
          setCanAccessMarketplace(isAdmin || isSubscribed);
        }
        setLoading(false);
      };

      checkAccessAndFetchData();
    }
  }, [user, supabase]);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const resultsPerPage = 9;

  useEffect(() => {
    if (!supabase || !canAccessMarketplace) return;

    const fetchCandidates = async () => {
      setIsSearching(true);
      const { data, error, count } = await supabase.rpc('search_candidates', {
        search_query: debouncedSearchQuery,
        page_limit: resultsPerPage,
        page_offset: (currentPage - 1) * resultsPerPage,
      });

      if (error) {
        console.error('Error searching candidates:', error);
        setCandidates([]);
      } else {
        setCandidates(data || []);
      }
      // We need a way to get the total count. Assuming the RPC can return it.
      // If not, a separate count RPC is needed. For now, we'll estimate.
      // A better approach is to modify the RPC to return total count.
      // For now, let's assume we can get it from another call or header.
      // This part needs to be implemented based on how you get total count.
      // setTotalCandidates(count || 0); 
      setIsSearching(false);
    };

    fetchCandidates();
  }, [debouncedSearchQuery, supabase, canAccessMarketplace, currentPage]);

  return (
    <div className="flex min-h-screen bg-background max-w-screen-2xl mx-auto">
      <aside className="w-1/5 xl:w-1/4 sticky top-0 h-screen hidden md:block p-6">
        {profile && <ProfileSidebar profile={profile} onOpenLinkedInPost={() => {}} />}
      </aside>
      <main className="w-full md:w-4/5 xl:w-3/4 p-8">
        <h1 className="text-3xl font-bold mb-6">Recruiter Marketplace</h1>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
            </div>
          </div>
        ) : canAccessMarketplace ? (
          <div className="space-y-6">
            <Input 
              placeholder="Search by name, skills, or bio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isSearching && !candidates.length ? <p>Searching...</p> : null}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {candidates.map(candidate => <CandidateCard key={candidate.id} candidate={candidate} />)}
            </div>
            {!isSearching && !candidates.length && (
              <p className="text-center text-muted-foreground pt-8">
                {debouncedSearchQuery ? `No candidates found for "${debouncedSearchQuery}".` : "No candidates to display."}
              </p>
            )}
            {candidates.length > 0 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} />
                  </PaginationItem>
                  {/* This is a simplified pagination. A more robust one would show page numbers. */}
                  <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => p + 1); }} /></PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        ) : (
          <div className="text-center border rounded-lg p-8">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You need an active subscription to access the Recruiter Marketplace.</p>
            <Button asChild><Link href="/subscriptions">View Plans</Link></Button>
          </div>
        )}
      </main>
    </div>
  );
}