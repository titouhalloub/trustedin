import { useState, useEffect } from 'react';
import { PeopleSearch } from '@/components/PeopleSearch';
import { ProfileSidebar } from '../components/ProfileSidebar';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';

export default function SearchPage() {
  const user = useUser();
  const supabase = useSupabaseClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && supabase) {
      const fetchProfile = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);
        setLoading(false);
      };
      fetchProfile();
    }
  }, [user, supabase]);

  if (loading || !profile) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background max-w-screen-2xl mx-auto">
      <aside className="w-1/5 xl:w-1/4 sticky top-0 h-screen hidden md:block border-r border-border">
        <ProfileSidebar profile={profile} onOpenLinkedInPost={() => {}} />
      </aside>
      <main className="w-full md:w-4/5 xl:w-3/4 p-4 sm:p-6 lg:p-8">
        <PeopleSearch />
      </main>
    </div>
  );
}