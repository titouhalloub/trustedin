import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import React from 'react';
import { 
  MapPin, 
  Calendar, 
  Link as LinkIcon, 
  Shield, 
  Award, 
} from 'lucide-react';
import { Profile } from '@/lib/types';

interface PublicProfileHeaderProps {
  profile: Profile | null;
  actionButtons?: React.ReactNode;
}

export const PublicProfileHeader = ({
  profile,
  actionButtons
}: PublicProfileHeaderProps) => {
  const getVerificationIcon = (level: string) => {
    switch (level) {
      case 'premium': return <Award className="h-4 w-4 text-purple-500" />;
      case 'verified': return <Shield className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const joinedDate = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) 
    : 'Date not available';

  return (
    <div className="bg-card border-b border-border">
      {/* Cover Photo */}
      <div
        className={`relative h-48 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 overflow-hidden`}
      >
        <img
          src={profile?.banner_url || '/default-banner.png'} // Correct path for public assets
          alt={profile?.full_name ? `${profile.full_name}'s banner` : 'Profile banner'}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Profile Info */}
      <div className="px-6 pb-6">
        {/* Profile Picture and Actions */}
        <div className="flex items-end justify-between -mt-16 mb-4">
          <div
            className={`relative group`}
          >
            <Avatar className="h-32 w-32 border-4 border-card">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name || 'Avatar'} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-secondary text-white">
                {profile?.full_name ? getInitials(profile.full_name) : 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex gap-2">
            {actionButtons}
          </div>
        </div>

        {/* Name and Handle */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">
              {profile?.full_name || 'User Name'}
            </h1>
            {getVerificationIcon(profile?.verification_level || 'unverified')}
          </div>
          <p className="text-muted-foreground">@{profile?.username || 'username'}</p>
          <p className="text-foreground mt-2">
            {profile?.bio || 'No bio available.'}
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