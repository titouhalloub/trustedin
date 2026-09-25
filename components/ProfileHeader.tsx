import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import React from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

import { 
  MapPin, 
  Calendar, 
  Link as LinkIcon, 
  Shield,
  Award, 
  Camera, 
  LogOut,
  Settings
} from 'lucide-react';
import { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { Profile } from '@/lib/types'; // Import from central types file
import { getInitials } from '../lib/utils';

interface ProfileHeaderProps {
  profile: Profile | null;
  user?: SupabaseUser | null;
  supabase?: SupabaseClient | null;
  isOwnProfile?: boolean;
  onOpenEditProfile?: () => void;
  onEditAvatar?: () => void;
  onLogout?: () => void;
  onEditBanner?: () => void;
  actionButtons?: React.ReactNode;
}

export const ProfileHeader = ({
  profile,
  supabase,
  isOwnProfile,
  onOpenEditProfile,
  onEditAvatar,
  onEditBanner,
  onLogout,
  actionButtons
}: ProfileHeaderProps) => {
  const router = useRouter();

  const getVerificationIcon = (level: string) => {
    switch (level) {
      case 'premium': return <Award className="h-4 w-4 text-purple-500" />;
      case 'verified': return <Shield className="h-4 w-4 text-green-500" />;
      default: return null;
    }
    console.log("ProfileHeader:", ProfileHeader);

  };

  const joinedDate = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) 
    : 'Date not available';

  const handleStartConversation = async () => {
    if (!profile || isOwnProfile || !supabase) return;
    try {
      const { data, error } = await supabase
        .rpc('get_or_create_conversation', { other_user_id: profile.id })
        .single();

      if (error) throw error;

      if (data) {
        router.push(`/messages?conversationId=${(data as { id: string }).id}`);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  return (
    <div className="bg-card border-b border-border">
      {/* Cover Photo */}
      <div
        className={`relative h-48 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 overflow-hidden ${isOwnProfile ? 'group cursor-pointer' : ''}`}
        onClick={isOwnProfile ? onEditBanner : undefined}
      >
        <img
          src={profile?.banner_url || '/default-banner.png'} // Correct path for public assets
          alt={profile?.full_name ? `${profile.full_name}'s banner` : 'Profile banner'}
          className="w-full h-full object-cover"
        />
        {isOwnProfile && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-semibold">
            <Camera className="h-5 w-5 mr-2" />
            Edit cover photo
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="px-6 pb-6">
        {/* Profile Picture and Actions */}
        <div className="flex items-end justify-between -mt-16 mb-4">
          <div
            className={`relative group ${isOwnProfile ? 'cursor-pointer' : ''}`}
            onClick={isOwnProfile ? onEditAvatar : undefined}
          >
            <Avatar className="h-32 w-32 border-4 border-card">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name || 'Avatar'} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-secondary text-white">
                {profile?.full_name ? getInitials(profile.full_name) : 'U'}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera className="h-6 w-6 text-white" />
              </div>
            )}
          </div>
     
             


<Card className="p-3 border-t">
     

  <div className="flex justify-between items-center w-full text-xs">

   
    <div className="flex items-center gap-1 text-muted-foreground text-left">
      <Award className="h-4 w-4" />   


      <span>Credits</span>

      {profile?.credits ?? 0}
    </div>
  </div>
</Card>
             <Button variant="outline" size="icon" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
              </Button>


        




   </div>


        {/* Name and Handle */}
        <div className="space-y-2 mb-4">



{/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          {actionButtons}
          {isOwnProfile ? (
            <>
              {profile?.verification_level !== 'verified' && profile?.verification_level !== 'pending' && (
                <Button variant="outline" onClick={() => router.push('/settings/verification')} className="w-full sm:w-auto">
                  <Shield className="h-4 w-4 mr-2" />
                  Verify Account
                </Button>
              )}
              <Button variant="outline" onClick={onOpenEditProfile} className="w-full sm:w-auto">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              
            </>
          ) : (
            <Button variant="default" onClick={handleStartConversation} className="w-full sm:w-auto">
              Message
            </Button>

 

          )}
        </div>



          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">
              {profile?.full_name || 'Your Name'}
            </h1>
            {getVerificationIcon(profile?.verification_level || 'unverified')}
          </div>
          <p className="text-muted-foreground">@{profile?.username || 'username'}</p>
          <p className="text-foreground mt-2">
            {profile?.bio || 'No bio available. Click "Edit Profile" to add a bio.'}
          </p>
        </div>








        {/* Profile Details */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
          {profile?.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{profile.location}</span>
            </div>
          )}
          {profile?.website && (
            <div className="flex items-center gap-1">
              <LinkIcon className="h-4 w-4" />
              <a href={profile.website} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Joined {joinedDate}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mb-6">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-foreground">{profile?.following_count || 0}</span>
            <span className="text-muted-foreground">Following</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-foreground">{profile?.followers_count || 0}</span>
            <span className="text-muted-foreground">Followers</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-foreground">
              {profile?.connections_count || 0}
            </span>
            <span className="text-muted-foreground">Connections</span>
          </div>
        </div>


      </div>
    </div>
  );
};
