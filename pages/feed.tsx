import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { GetServerSidePropsContext } from 'next';
import { User } from '@supabase/supabase-js';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { ProfileSuggestions } from '@/components/ProfileSuggestions';
import { Header } from '@/components/Header';
import { CreatePostCard } from '@/components/CreatePostCard';
import { EditProfileDialog } from '@/components/EditProfileDialog';
import { Card, CardContent } from "@/components/ui/card";
import { ProfileFeed } from '@/components/ProfileFeed';
import { PapoCard } from '@/components/papo/PapoCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, Home, Users, Mail, Shield, Briefcase, LayoutGrid } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell'; // Keep this import
import { Profile, Post, Papo } from '@/lib/types';
import { transformRawPost } from '@/lib/utils';
import withSubscription from '@/components/withSubscription';

interface FeedPageProps {
  user: User;
  profile: Profile;
  posts: Post[];
  suggestions: Profile[];
  latestPapos: Papo[];
  likedPapos: string[];
  currentUserId: string | null;
}

export default function FeedPage({
  user,
  profile: initialProfile,
  posts: initialPosts,
  suggestions,
  latestPapos,
  likedPapos,
  currentUserId,
}: FeedPageProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [profile, setProfile] = useState(initialProfile);
  const [posts, setPosts] = useState(initialPosts);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  const supabase = useSupabaseClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length < 1) {
        setSearchResults([]);
        return;
      }
      if (!supabase) return; // This check is fine inside the effect
      setIsSearchLoading(true);
      const trimmedQuery = searchQuery.trim();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${trimmedQuery}%,username.ilike.%${trimmedQuery}%`)
        .not('id', 'eq', user.id) // Exclude current user from results
        .limit(10);

      if (error) {
        console.error('Error searching profiles:', error);
      } else {
        setSearchResults(data || []);
      }
      setIsSearchLoading(false);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, supabase, user.id]);
  
  // This conditional return must come *after* all hook calls.
  if (!supabase) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  const refreshData = async () => {
    setIsLoading(true);
    // Refresh the page to get new posts
    router.replace(router.asPath);
    setIsLoading(false);
  };

  const handleNewPost = (newPostData: any) => {
    const newPost = transformRawPost(
      {
        ...newPostData,
        author: profile,
        likes: [],
        comments: [],
        shares: [],
        user_likes: [],
      },
      user.id
    );
    setPosts((currentPosts) => [newPost, ...currentPosts]);
  };

  return (
    <div className="flex min-h-screen bg-background max-w-screen-2xl mx-auto">

  <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background shadow flex items-center justify-between px-6">
    {/* Left Section: Logo and Search */}
    <div className="flex items-center gap-4">
      <Link href="/feed" className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Shield className="h-5 w-5 text-white" />
        </div>
      </Link>
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search for users..."
          className="w-full rounded-lg bg-muted pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery.length > 0 && (
          <Card className="absolute top-full mt-2 w-full z-50 max-h-80 overflow-y-auto">
            <CardContent className="p-2">
              {isSearchLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <Link href={`/${result.id}`} key={result.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => { setSearchQuery(''); setSearchResults([]); }}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={result.avatar_url ?? undefined} alt={result.full_name || 'User'} />
                      <AvatarFallback>{result.full_name ? result.full_name.charAt(0) : 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{result.full_name}</p>
                      <p className="text-xs text-muted-foreground">@{result.username}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">No users found.</div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>

    {/* Center Section: Navigation */}
    <nav className="hidden md:flex items-center gap-6">
      <Link href="/feed" className="flex flex-col items-center text-muted-foreground hover:text-primary">
        <Home className="h-6 w-6" />
        <span className="text-xs">Home</span>
      </Link>
      <Link href="/network" className="flex flex-col items-center text-muted-foreground hover:text-primary">
        <Users className="h-6 w-6" />
        <span className="text-xs">Network</span>
      </Link>
      <Link href="/messages" className="flex flex-col items-center text-muted-foreground hover:text-primary">
        <Mail className="h-6 w-6" />
        <span className="text-xs">Messages</span>
      </Link>
      <Link href="/jobs" className="flex flex-col items-center text-muted-foreground hover:text-primary">
        <Briefcase className="h-6 w-6" />
        <span className="text-xs">Jobs</span>
      </Link>
      <Link href="/profile/referrals" className="flex flex-col items-center text-muted-foreground hover:text-primary">
        <Users className="h-6 w-6" />
        <span className="text-xs">Referrals</span>
      </Link>
      <Link href="/papo/dashboard" className="flex flex-col items-center text-muted-foreground hover:text-primary">
        <LayoutGrid className="h-6 w-6" />
        <span className="text-xs">Papo</span>
      </Link>
    </nav>

    {/* Right Section: Profile */}
    <div className="flex items-center gap-2">
      <NotificationBell />
      <Link href="/profile">
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name || 'User'} />
          <AvatarFallback>{profile.full_name ? profile.full_name.charAt(0) : 'U'}</AvatarFallback>
        </Avatar>
      </Link>
    </div>
  </header>

  {/* Bottom Navigation for Mobile */}
  <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
    <div className="flex justify-around items-center h-16">
      <Link href="/feed" className="flex flex-col items-center text-primary">
        <Home className="h-6 w-6" />
        <span className="text-xs">Home</span>
      </Link>
      <Link href="/network" className="flex flex-col items-center text-muted-foreground hover:text-primary">
        <Users className="h-6 w-6" />
        <span className="text-xs">Network</span>
      </Link>
      <Link href="/messages" className="flex flex-col items-center text-muted-foreground hover:text-primary">
        <Mail className="h-6 w-6" />
        <span className="text-xs">Messages</span>
      </Link>
      <Link href="/jobs" className="flex flex-col items-center text-muted-foreground hover:text-primary">
        <Briefcase className="h-6 w-6" />
        <span className="text-xs">Jobs</span>
      </Link>
      <Link href="/profile/referrals" className="flex flex-col items-center text-muted-foreground hover:text-primary">
        <Users className="h-6 w-6" />
        <span className="text-xs">Referrals</span>
      </Link>
      <Link href="/papo/dashboard" className="flex flex-col items-center text-muted-foreground hover:text-primary">
        <LayoutGrid className="h-6 w-6" />
        <span className="text-xs">Papo</span>
      </Link>
    </div>
  </nav>

{/* Left Sidebar */}
<aside className="hidden md:block w-1/5 xl:w-1/4 pt-14 p-4">
  <div className="sticky top-20 space-y-4">
    {/* Profile Card */}
    <Card className="overflow-hidden rounded-2xl shadow">
      <CardContent className="p-0">
        <Header
          profile={{
            ...profile,
            avatar_url: profile.avatar_url || null,
            full_name: profile.full_name || 'User',
          }}
          onOpenEditProfile={() => setIsEditOpen(true)}
          onEditAvatar={() => avatarInputRef.current?.click()}
          onEditBanner={() => bannerInputRef.current?.click()}
        />
      </CardContent>
    </Card>
  </div>
</aside>

      {/* Main Feed */}
      <main className="w-full md:w-4/5 xl:w-3/4 pt-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-8 p-4 sm:p-6">
          <div className="lg:col-span-8">
            <div className="space-y-4 mt-6">
              <CreatePostCard
                profile={{
                  ...profile,
                  avatar_url: profile.avatar_url || null,
                  full_name: profile.full_name || 'User',
                }}
                onPost={handleNewPost}
              />
              {latestPapos && latestPapos.length > 0 && (
                <section className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">Latest Papos</h2>
                    <Link href="/papo" className="text-sm text-primary hover:underline">View all</Link>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                    {latestPapos.slice(0, 10).map((p) => (
                      <PapoCard
                        key={p.id}
                        papo={p}
                        variant="compact"
                        liked={likedPapos.includes(p.id)}
                        currentUserId={currentUserId}
                      />
                    ))}
                  </div>
                </section>
              )}
              <ProfileFeed
                profile={{
                  ...profile,
                  avatar_url: profile.avatar_url || null,
                  full_name: profile.full_name || 'User',
                }}
                posts={posts}
                onDataRefresh={refreshData}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-20 space-y-6 p-2">

              <ProfileSuggestions suggestions={suggestions} />
            </div>
          </aside>
        </div>
      </main>

      {/* Dialogs */}
      <EditProfileDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        profile={profile}
        onProfileUpdate={refreshData}
      />
    </div>
  );
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/auth', permanent: false } };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!profile) {
    return { notFound: true };
  }

  // Fetch suggestions (users the current user is not following, and is not the user themselves)
  const { data: followedUsers } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', session.user.id);

  const followedUserIds = followedUsers?.map(f => f.following_id) || [];
  const excludedIds = [session.user.id, ...followedUserIds];
  
  const { data: suggestions } = await supabase
    .from('profiles')
    .select('*')
    .not('id', 'in', `(${excludedIds.join(',')})`)
    .limit(5);

  // For a feed, we fetch all posts, not just the user's own posts.
  const { data: rawPosts, error: postsError } = await supabase
    .from('posts')
    .select(
      `
      id,
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
        content,
        created_at,
        profiles(username, avatar_url)
      )
      `
    )
    .order('created_at', { ascending: false });

  if (postsError) {
    console.error('[DEBUG] Supabase error fetching posts:', postsError);
  }

  const { data: latestPapos } = await supabase
    .from('papo')
    .select(`
      id, user_id, slug, title, prompt_used,
      ai_generated_content, edited_content, thumbnail_url,
      preview_image_url, engagement_metrics, likes,
      metadata, engine, external_url, external_project_id,
      visibility, last_synced_at, created_at,
      author:profiles!papo_user_id_fkey(id, username, full_name, avatar_url)
    `)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(10);

  // Batch-fetch which papos the current user has liked
  let likedPapos: string[] = [];
  if (latestPapos && latestPapos.length > 0) {
    const { data: likeRows } = await supabase
      .from('papo_likes')
      .select('papo_id')
      .eq('user_id', session.user.id)
      .in('papo_id', latestPapos.map((p: any) => p.id));
    likedPapos = (likeRows || []).map((r: any) => r.papo_id);
  }

  const posts: Post[] =
    rawPosts?.map((p) => transformRawPost(p, session.user.id)) || [];

  return {
    props: {
      user: session.user,
      profile,
      posts,
      suggestions: suggestions || [],
      latestPapos: (latestPapos || []) as unknown as Papo[],
      likedPapos,
      currentUserId: session.user.id,
      initialSession: session,
    },
  };
};
