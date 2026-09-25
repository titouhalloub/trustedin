'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { useRouter } from 'next/router';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { GetServerSidePropsContext } from 'next';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProfileFeed } from '@/components/ProfileFeed';
import { TrustReportCard } from '@/components/TrustReportCard';
import { ProfileSuggestions } from '@/components/ProfileSuggestions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProfileSidebar } from '../components/ProfileSidebar';
import { ProfileNavigation } from '@/components/ProfileNavigation';
import { CreatePostCard } from '@/components/CreatePostCard';
import { ProfileHeader } from '@/components/ProfileHeader';
import ExperienceSection from '@/components/profile/ExperienceSection';
import { EducationSection } from '@/components/profile/EducationSection';
import { SkillsSection } from '@/components/profile/SkillsSection';
import { Profile, Post, Experience, Education, Skill } from '@/lib/types';
import { transformRawPost } from '@/lib/utils';
import ImageCropModal from '@/components/ImageCropModal';


interface ProfilePageProps {
  profile: Profile;
  stats: { activity: number; likes: number; media: number };
  posts: Post[];
  suggestions: Profile[];
}

export default function ProfilePage({ profile: initialProfile, posts: initialPosts, stats: initialStats, suggestions }: ProfilePageProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [posts, setPosts] = useState(initialPosts);
  const [isLoading, setIsLoading] = useState(false);
  const [editingImage, setEditingImage] = useState<{ src: string; type: 'avatar' | 'banner' } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const user = useUser();
  const { isActive: isRecruiter } = useSubscriptionStatus(user?.id); // Using the hook
  const supabase = useSupabaseClient();
  const { toast } = useToast();

  useEffect(() => {
    if (router.query.gh_connected === '1') {
      toast({ title: "GitHub account connected!", description: "Your GitHub account has been successfully linked." });
      const { pathname, query } = router;
      delete query.gh_connected;
      router.replace({ pathname, query }, undefined, { shallow: true });
    }
  }, [router, toast]);

  if (!supabase || !user) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    if (e.target.files?.length) {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' && setEditingImage({ src: reader.result, type });
      reader.readAsDataURL(e.target.files[0]);
    }
    e.target.value = '';
  };

  const handleImageSave = async (blob: Blob) => {
    if (!editingImage) return;
    const fileType = editingImage.type;
    const dbColumn = fileType === 'avatar' ? 'avatar_url' : 'banner_url';
    const storageFolder = fileType === 'avatar' ? 'avatars' : 'banners';
    const fileName = `${user.id}/${Date.now()}`;

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage.from(storageFolder).upload(fileName, blob, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(storageFolder).getPublicUrl(uploadData.path);
      const newUrl = urlData.publicUrl;
      await supabase.from('profiles').update({ [dbColumn]: newUrl }).eq('id', user.id);
      setProfile(prev => ({ ...prev!, [dbColumn]: newUrl }));
    } catch (error) {
      console.error(`Error updating ${fileType}:`, error);
    } finally {
      setEditingImage(null);
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    await router.replace(router.asPath);
    setIsLoading(false);
  };

  const handleNewPost = (newPostData: any) => {
    const newPost = transformRawPost({ ...newPostData, author: profile, likes: [], comments: [], shares: [], user_likes: [] }, user.id);
    setPosts(currentPosts => [newPost, ...currentPosts]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
    toast({ title: "You have been logged out." });
  };




  return (
    <div className="flex min-h-screen bg-background max-w-screen-2xl mx-auto">
      <input type="file" ref={bannerInputRef} onChange={e => handleFileSelect(e, 'banner')} style={{ display: 'none' }} accept="image/png, image/jpeg, image/webp" />
      <input type="file" ref={avatarInputRef} onChange={e => handleFileSelect(e, 'avatar')} style={{ display: 'none' }} accept="image/png, image/jpeg, image/webp" />

      <aside className="w-1/5 xl:w-1/4 sticky top-0 h-screen hidden md:block">
        <ProfileSidebar profile={profile} onOpenLinkedInPost={() => {}} />
      </aside>

      <main className="w-full md:w-4/5 xl:w-3/4">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-8 p-4 sm:p-6 lg:p-8">
            {profile && (
              <ProfileHeader
                profile={profile}
                user={user}
                supabase={supabase}
                isOwnProfile
                onOpenEditProfile={() => router.push('/profile/edit')}
                onEditAvatar={() => avatarInputRef.current?.click()}
                onLogout={handleLogout}
                onEditBanner={() => bannerInputRef.current?.click()}
              />
            )}
            
            {/* --- NEW RECRUITER DASHBOARD LINK --- */}
            {isRecruiter && ( // Condition now uses the state from the hook
              <div className="mt-4 flex justify-start">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href="/recruiter/dashboard" className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Recruiter Dashboard</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>Go to your recruiter dashboard</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            <ProfileNavigation stats={initialStats} />
            <div className="space-y-6 mt-6">
              <CreatePostCard profile={profile} onPost={handleNewPost} />
              <ExperienceSection userId={profile.id} />
              <EducationSection education={profile.education} />
              <SkillsSection skills={profile.skills} />
              <ProfileFeed profile={profile} posts={posts} onDataRefresh={refreshData} isLoading={isLoading} />
            </div>
          </div>

          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-0 space-y-6 p-4 sm:p-6 lg:p-8">
              <TrustReportCard userId={profile.id} />
              <ProfileSuggestions suggestions={suggestions} />
            </div>
          </aside>
        </div>
      </main>

      {editingImage && (
        <ImageCropModal
          imageSrc={editingImage.src}
          aspectRatio={editingImage.type === 'banner' ? 16 / 5 : 1}
          onSave={handleImageSave}
          onClose={() => setEditingImage(null)}
        />
      )}
    </div>
  );
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return { redirect: { destination: '/auth', permanent: false } };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      *,
      experiences:experiences(*),
      education:education(*),
      skills:skills(id, name),
      interests
    `)
    .eq('id', session.user.id)
    .single();

  if (!profile) return { notFound: true };

  const { count: followers_count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', session.user.id);
  const { count: following_count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', session.user.id);
  const { count: connections_count } = await supabase.from('connections').select('*', { count: 'exact', head: true }).or(`requester_id.eq.${session.user.id},addressee_id.eq.${session.user.id}`).eq('status', 'accepted');

  const currentExperience = profile.experiences?.find((exp: Experience) => exp.is_current);

  const augmentedProfile = {
    ...profile,
    followers_count: followers_count || 0,
    following_count: following_count || 0,
    connections_count: connections_count || 0,
    headline: profile.headline || (currentExperience ? `${currentExperience.title} at ${currentExperience.company}` : null),
    skills: profile.skills || [],
    interests: profile.interests || [],
  };

  const { data: rawPosts } = await supabase
    .from('posts')
    .select(`
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
    `)
    .eq('author_id', session.user.id)
    .order('created_at', { ascending: false });

  const posts: Post[] = rawPosts?.map(p => transformRawPost(p, session.user.id)) || [];

  const activityCount = rawPosts?.length || 0;
  const likesCount = rawPosts?.reduce((acc, p) => acc + (p.likes?.[0]?.count || 0), 0) || 0;
  const mediaCount = rawPosts?.filter(p => p.media_urls?.length).length || 0;

  const { data: followedUsers } = await supabase.from('connections').select('following_id').eq('follower_id', session.user.id);
  const followedUserIds = followedUsers?.map(f => f.following_id) || [];
  const excludedIds = [session.user.id, ...followedUserIds];

  const { data: suggestions } = await supabase.from('profiles').select('*').not('id', 'in', `(${excludedIds.join(',')})`).limit(5);

  return { 
    props: { 
      profile: augmentedProfile, 
      posts, 
      stats: { activity: activityCount, likes: likesCount, media: mediaCount },
      suggestions: suggestions || [],
      initialSession: session,
    } 
  };
};
