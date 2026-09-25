import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import Logo from '@/components/Logo';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Home, 
  Search, 
  Bell, 
  Mail, 
  Bookmark, 
  List, 
  User, 
  MoreHorizontal,
  Plus, // Keep Plus
  Shield, // Keep Shield
  Briefcase,
  CreditCard
} from 'lucide-react';

import { Profile } from '@/lib/types';

interface ProfileSidebarProps {
  profile: Profile | null;
  onOpenLinkedInPost: () => void;
}

export const ProfileSidebar = ({ profile, onOpenLinkedInPost }: ProfileSidebarProps) => {
    console.log("ProfileSidebar profile.credits:", profile?.credits); // <-- add this line

  const router = useRouter();

  const getInitials = (name: string | null = '') => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const navigationItems = [
    { icon: Home, label: 'Home', href: '/feed' },
    { icon: Search, label: 'Explore', href: '/search' },
    { icon: Bell, label: 'Notifications', href: '#' },
    { icon: Mail, label: 'Messages', href: '/messages' },
    { icon: Bookmark, label: 'Bookmarks', href: '#' },
    { icon: Briefcase, label: 'Marketplace', href: '/marketplace' },
    { icon: List, label: 'Lists', href: '#' },
    { icon: User, label: 'Profile', href: '/profile' },
    { icon: MoreHorizontal, label: 'More', href: '#' }
  ];

  return (
    <div className="sticky top-0 h-screen p-6 space-y-6">
      <Logo />



      {/* Navigation Menu */}
      <nav className="space-y-2">
        {navigationItems.map((item) => {
          const isActive = router.pathname === item.href;
          return (
            <Button asChild variant={isActive ? "secondary" : "ghost"} className="w-full justify-start h-12 text-lg" key={item.label}>
              <Link href={item.href}>
                <item.icon className="h-6 w-6 mr-4" />
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            </Button>
          );
        })}
      </nav>

      {/* Post/Trust Button */}
      <Button onClick={onOpenLinkedInPost} className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90">
        <Plus className="h-5 w-5 mr-2 xl:mr-4" />
        <span className="hidden xl:inline">Post</span>
      </Button>

      {/* User Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                {profile ? getInitials(profile.full_name) : ''}
              </AvatarFallback>
            </Avatar>
            <div className="hidden xl:block">
              <div className="text-sm font-medium text-foreground">{profile?.full_name || '...'}</div>
              <div className="text-xs text-muted-foreground">@{profile?.username || '...'}</div>
            </div>
            <MoreHorizontal className="h-5 w-5 ml-auto hidden xl:block text-muted-foreground" />
          </div>
        </CardContent>

      </Card>
    </div>
  );
};