import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Profile } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { 
  MapPin, 
  Calendar, 
  Link as LinkIcon, 
  Shield, 
  Award, 
  Camera,
  Settings
} from 'lucide-react';

interface ProfileHeaderProps {
  profile: Profile | null;
  onOpenEditProfile: () => void;
  onEditAvatar: () => void;
  onEditBanner: () => void;
}

export const Header = ({ profile, onOpenEditProfile, onEditAvatar, onEditBanner }: ProfileHeaderProps) => {
  const getVerificationIcon = (level: string) => {
    switch (level) {
      case 'premium': return <Award className="h-4 w-4 text-purple-500" />;
      case 'verified': return <Shield className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const joinedDate = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) 
    : 'Date not available';

  return (
    <div className="bg-card border-b border-border">
      {/* Cover Photo */}
      <div className="relative h-48 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 overflow-hidden group cursor-pointer" onClick={onEditBanner}>
        <img
          src={profile?.banner_url || '/default-banner.png'}
          alt={profile?.full_name ? `${profile.full_name}'s banner` : 'Profile banner'}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-semibold">
          <Camera className="h-5 w-5 mr-2" />
          Edit cover photo
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-6 pb-6">
        {/* Profile Picture and Actions */}
        <div className="flex items-end justify-between -mt-16 mb-4">
          <div className="relative group cursor-pointer" onClick={onEditAvatar}>
            <Avatar className="h-32 w-32 border-4 border-card">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name || 'Avatar'} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-secondary text-white">
                {profile?.full_name ? getInitials(profile.full_name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
            >
              <Camera className="h-6 w-6 text-white" />
            </div>
          </div>
          
          <div className="flex gap-2 mt-16">
            <Button variant="outline" onClick={onOpenEditProfile}>
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>

          </div>
        </div>

        {/* Name and Handle */}
        <div className="space-y-2 mb-4">
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
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>Dubai, UEA</span>
          </div>
          <div className="flex items-center gap-1">
            <LinkIcon className="h-4 w-4" />
            <a href="#" className="text-primary hover:underline">trustedin.com</a>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Joined {joinedDate}</span>
          </div>
        </div>

 

      </div>
    </div>
  );
};