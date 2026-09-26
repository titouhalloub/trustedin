import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import {
  Home,
  Users,
  Mail,
  Shield,
  Search,
  Menu,
  X,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';
import { Profile } from '@/lib/types';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const user = useUser();
  const supabase = useSupabaseClient();
  const [profile, setProfile] = useState<Partial<Profile> | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile for layout:', error);
        } else {
          setProfile(data);
        }
      }
    };

    fetchProfile();
  }, [user, supabase]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMenuOpen]);


  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const navLinks = (
    <>
      <Link href="/feed" className="transition-colors hover:text-foreground/80 text-foreground/60" onClick={() => setIsMenuOpen(false)}>Home</Link>
      <Link href="/network" className="transition-colors hover:text-foreground/80 text-foreground/60" onClick={() => setIsMenuOpen(false)}>Network</Link>
      <Link href="/messages" className="transition-colors hover:text-foreground/80 text-foreground/60" onClick={() => setIsMenuOpen(false)}>Messages</Link>
      <Link href="/papo" className="transition-colors hover:text-foreground/80 text-foreground/60" onClick={() => setIsMenuOpen(false)}>Papo</Link>
      <Link href="/profile/referrals" className="transition-colors hover:text-foreground/80 text-foreground" onClick={() => setIsMenuOpen(false)}>Referrals</Link>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          {/* Desktop Logo and Nav */}
          <div className="mr-4 hidden md:flex">
            <Link href="/feed" className="mr-6 flex items-center space-x-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="hidden font-bold sm:inline-block">Trustedin</span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              {navLinks}
            </nav>
          </div>

          {/* Mobile Hamburger and Right-side Icons */}
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="flex-1 md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(true)}>
                <Menu className="h-6 w-6" />
              </Button>
            </div>
            
            {/* Mobile Logo (centered) */}
            <div className="md:hidden">
                <Link href="/feed" className="flex items-center space-x-2">
                    <Shield className="h-6 w-6 text-primary" />
                </Link>
            </div>

            <nav className="flex items-center">
              <NotificationBell />
              <Link href="/profile">
                <Avatar className="h-8 w-8 cursor-pointer ml-2">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name || 'User'} />
                  <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
                </Avatar>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
          <div className="fixed left-0 top-0 w-4/5 max-w-xs h-full bg-background border-r p-4">
            <div className="flex items-center justify-between mb-8">
              <Link href="/feed" className="flex items-center space-x-2" onClick={() => setIsMenuOpen(false)}>
                <Shield className="h-6 w-6 text-primary" />
                <span className="font-bold">Trustedin</span>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            <nav className="flex flex-col space-y-6 text-lg font-medium">
              {navLinks}
            </nav>
          </div>
        </div>
      )}

      <main>
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
