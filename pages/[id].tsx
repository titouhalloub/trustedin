import { GetServerSidePropsContext } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@/components/ui/use-toast';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useChat } from '@/contexts/ChatContext';

import { ProfileFeed } from '@/components/ProfileFeed';
import { TrustReportCard } from '@/components/TrustReportCard';
import { ProfileSuggestions } from '@/components/ProfileSuggestions';
import { ProfileSidebar } from '../components/ProfileSidebar';
import { ProfileNavigation } from '@/components/ProfileNavigation';
import { PublicProfileHeader } from '@/components/PublicProfileHeader';
import { Button } from '@/components/ui/button';
import { UserPlus, Clock, UserCheck, UserX, MessageSquare, Check, Plus } from 'lucide-react';
import { Profile, Post, Follow, Connection, Conversation as ConversationType } from '@/lib/types';
import { transformRawPost } from '@/lib/utils';

interface PublicProfilePageProps {
  loggedInProfile: Profile; // Logged-in user's profile
  viewedProfile: Profile; // The profile being viewed
  posts: Post[]; // Posts of the viewed profile
  stats: {
    activity: number;
    likes: number;
    media: number;
  };
  initialFollow: Follow | null;
  initialConnection: Connection | null;
  initialSession: any;
}

export default function PublicProfilePage({ loggedInProfile, viewedProfile, posts, stats, initialFollow, initialConnection }: PublicProfilePageProps) {
  const [follow, setFollow] = useState(initialFollow);
  const [connection, setConnection] = useState(initialConnection);
  const [loading, setLoading] = useState(false);
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { openChat } = useChat();

  useEffect(() => {
    // Client-side redirect as a fallback to the server-side one.
    if (typeof window !== 'undefined' && loggedInProfile.id === viewedProfile.id) {
      router.replace('/profile');
    }
  }, [loggedInProfile.id, viewedProfile.id, router]);

  if (!user) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  // While redirecting, show a loading state.
  if (loggedInProfile.id === viewedProfile.id) {
    return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>;
  }

  const handleFollow = async (isFollowing: boolean) => {
    if (!supabase) return;
    setLoading(true);
    let result;
    if (isFollowing) {
      result = await supabase.from('follows').delete().eq('id', follow!.id);
    } else {
      result = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: viewedProfile.id })
        .select()
        .limit(1);
    }
    
    if (result.error) {
      toast({ title: "Error", description: result.error.message, variant: "destructive" });
    } else if (result.data && result.data.length > 0) {
      setFollow(result.data[0]);
      toast({ title: "Success", description: `You are now following ${viewedProfile.full_name}.` });
    } else {
      setFollow(null);
      toast({ title: "Success", description: `You have unfollowed ${viewedProfile.full_name}.` });
    }
    setLoading(false);
    router.replace(router.asPath); // Refresh counts
  };

  const handleConnect = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('connections')
      .upsert({ requester_id: user.id, addressee_id: viewedProfile.id, status: 'pending' }, { onConflict: 'requester_id, addressee_id' })
      .select()
      .limit(1);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data && data.length > 0) {
      setConnection(data[0]);
      toast({ title: "Success", description: "Connection request sent." });
    } else {
      toast({ title: "Info", description: "A connection request already exists." });
    }
    setLoading(false);
  };

  const handleAccept = async () => {
    if (!connection || !supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', connection.id)
      .select()
      .limit(1);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data && data.length > 0) {
      setConnection(data[0]);
      toast({ title: "Connection accepted!", description: `You are now connected with ${viewedProfile.full_name}.` });
    }
    setLoading(false);
    router.replace(router.asPath); // Refresh counts
  };

  const handleRemoveOrWithdraw = async () => {
    if (!connection || !supabase) return;
    setLoading(true);
    const { error } = await supabase.from('connections').delete().eq('id', connection.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setConnection(null);
      toast({ title: "Success", description: "Action completed." });
    }
    setLoading(false);
    router.replace(router.asPath); // Refresh counts
  };

  const handleMessage = async () => {
    setLoading(true);
    if (!supabase) {
      toast({ title: "Error", description: "Supabase client not available.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Phase 1: Spend credit
    try {
      const creditResponse = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'spend_outreach', target_user_id: viewedProfile.id }),
      });

      if (!creditResponse.ok) {
        const { error } = await creditResponse.json();
        throw new Error(error || 'Failed to spend credit.');
      }
    } catch (error: any) {
      toast({ title: "Out of Credits", description: "Please upgrade your plan to send more messages.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Phase 2: Create conversation
    try {
      const { data, error } = await supabase
        .rpc('get_or_create_conversation', { other_user_id: viewedProfile.id })
        .single();

      if (error) throw error;
      if (!data) throw new Error("Could not get or create conversation.");

      openChat(data as any);
    } catch (error: any) {
      toast({ title: "Error starting conversation", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const renderActionButtons = () => {
    // Prevent rendering buttons until the client-side user object is available.
    if (!user) {
      return null;
    }

    const isFollowing = !!follow;
    const hasCredits = loggedInProfile.credits && loggedInProfile.credits > 0;

    let connectButton;
    if (!connection) {
      // No connection record exists
      connectButton = (
        <Button onClick={handleConnect} disabled={loading}>
          <UserPlus className="mr-2 h-4 w-4" /> Connect
        </Button>
      );
    } else {
      // A connection record exists, check its status
      switch (connection.status) {
        case 'pending':
          if (connection.requester_id === user.id) {
            // Logged-in user sent the request
            connectButton = (
              <Button onClick={handleRemoveOrWithdraw} disabled={loading} variant="outline">
                <Clock className="mr-2 h-4 w-4" /> Pending
              </Button>
            );
          } else {
            // Logged-in user received the request
            connectButton = (
              <Button onClick={handleAccept} disabled={loading}>
                <UserCheck className="mr-2 h-4 w-4" /> Accept Request
              </Button>
            );
          }
          break;
        case 'accepted':
          connectButton = (
            <Button onClick={handleRemoveOrWithdraw} disabled={loading} variant="secondary">
              <UserX className="mr-2 h-4 w-4" /> Remove Connection
            </Button>
          );
          break;
      }
    }

    return (
      <div className="flex items-center gap-2">
        {/* Show message button only if connected */}
        {connection?.status === 'accepted' && (
          <Button onClick={handleMessage} disabled={loading || !hasCredits} title={!hasCredits ? "You are out of outreach credits" : ""}>
            <MessageSquare className="mr-2 h-4 w-4" /> Message
          </Button>
        )}
        {connectButton}
        <Button onClick={() => handleFollow(isFollowing)} disabled={loading} variant="outline">
          {isFollowing ? <Check className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {isFollowing ? 'Following' : 'Follow'}
        </Button>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-background max-w-screen-2xl mx-auto">
      <aside className="w-1/5 xl:w-1/4 sticky top-0 h-screen hidden md:block">
        {/* The sidebar always shows the logged-in user's profile summary */}
        <ProfileSidebar
          profile={{ ...loggedInProfile, avatar_url: loggedInProfile.avatar_url ?? null }}
          onOpenLinkedInPost={() => {}}
        />
      </aside>

      <main className="w-full md:w-4/5 xl:w-3/4">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-8 p-4 sm:p-6 lg:p-8">
            {/* The header shows the profile of the user being viewed */}
            <PublicProfileHeader
              profile={viewedProfile}
              actionButtons={renderActionButtons()}
            />
            <ProfileNavigation stats={stats} />
            <div className="space-y-6 mt-6">
              {/* No CreatePostCard on public profiles */}
              {/* The feed shows posts from the user being viewed, passing it as the 'profile' prop */}
              <ProfileFeed profile={viewedProfile} posts={posts} onDataRefresh={() => router.replace(router.asPath)} isLoading={false} />
            </div>
          </div>
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-0 space-y-6 p-4 sm:p-6 lg:p-8">
              {/* The Trust Report card is for the user being viewed */}
              <TrustReportCard userId={viewedProfile.id} />
              <ProfileSuggestions />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/auth', permanent: false } };
  }

  const viewedProfileId = ctx.params?.id as string;
  const currentUserId = session.user.id;

  // Server-side redirect to the main `/profile` page if a user lands on their own public URL.
  if (viewedProfileId === session.user.id) {
    return { redirect: { destination: '/profile', permanent: false } };
  }

  // Fetch both the logged-in user's profile and the profile being viewed
  const [loggedInProfileRes, viewedProfileRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', currentUserId).single(),
    supabase.from('profiles').select('*').eq('id', viewedProfileId).single(),
  ]);

  const { data: loggedInProfile, error: loggedInProfileError } = loggedInProfileRes;
  const { data: viewedProfile, error: viewedProfileError } = viewedProfileRes;

  // If either profile doesn't exist, return a 404.
  if (viewedProfileError || loggedInProfileError || !viewedProfile || !loggedInProfile) {
    return { notFound: true };
  }

  // --- Start: Fetch real-time counts ---
  const fetchCounts = async (profileId: string) => {
    const { count: followers_count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profileId);

    const { count: following_count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profileId);

    const { count: connections_count } = await supabase
      .from('connections')
      .select('*', { count: 'exact', head: true })
      .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`)
      .eq('status', 'accepted');

    return { followers_count, following_count, connections_count };
  };

  const [loggedInCounts, viewedCounts] = await Promise.all([
    fetchCounts(currentUserId),
    fetchCounts(viewedProfileId),
  ]);

  // Fetch posts for the viewed profile, with all the same details as on the main profile page.
  const { data: rawPosts } = await supabase
    .from('posts')
    .select(`      id,
      content,
      author_id,
      created_at,
      media_urls,
      author:profiles!author_id(
        full_name,
        username,
        avatar_url,
        verification_level
      ),
      likes:post_likes(count),
      comments:post_comments(count),
      shares:post_shares(count),
      user_likes:post_likes(user_id),
      post_comments(
        id,
        content, media_url, media_type,
        created_at,
        profiles!post_comments_user_id_fkey(username, avatar_url)
      )
    `)
    .eq('author_id', viewedProfileId)
    .order('created_at', { ascending: false });

  const posts: Post[] = rawPosts?.map(p => transformRawPost(p, session.user.id)) || [];

  // --- Start: Calculate dynamic stats for navigation ---
  const activityCount = rawPosts?.length || 0;
  const likesCount = rawPosts?.reduce((acc, p) => {
    // The query for likes returns an array like [{ count: 5 }], so we access the first element.
    return acc + (p.likes && p.likes.length > 0 ? p.likes[0].count : 0);
  }, 0) || 0;
  const mediaCount = rawPosts?.filter(p => p.media_urls && p.media_urls.length > 0).length || 0;
  // --- End: Calculate dynamic stats ---

  // Fetch connection and follow status
  const { data: connectionArr } = await supabase
    .from('connections')
    .select('*')
    .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${viewedProfileId}),and(requester_id.eq.${viewedProfileId},addressee_id.eq.${currentUserId})`)
    .limit(1);
  const connection = connectionArr?.[0] || null;

  const { data: followArr } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', currentUserId)
    .eq('following_id', viewedProfileId)
    .limit(1);
  const follow = followArr?.[0] || null;

  return {
    props: {
      loggedInProfile: {
        ...loggedInProfile,
        ...loggedInCounts,
      },
      viewedProfile: {
        ...viewedProfile,
        ...viewedCounts,
      },
      posts,
      stats: {
        activity: activityCount,
        likes: likesCount,
        media: mediaCount,
      },
      initialFollow: follow,
      initialConnection: connection,
      initialSession: session,
    },
  };
};