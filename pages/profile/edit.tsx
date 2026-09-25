// pages/profile/edit.tsx

import { GetServerSidePropsContext } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { EditProfileForm } from "@/components/EditProfileForm";
import { ProfileSidebar } from '@/components/ProfileSidebar';
import { Profile, Experience, Education, Skill } from '@/lib/types';

interface EditProfilePageProps {
  profile: Profile;
}

export default function EditProfilePage({ profile }: EditProfilePageProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Show toast when GitHub connection succeeds
  useEffect(() => {
    const { gh_connected, gh_disconnected, error } = router.query;
    let toastOptions: Parameters<typeof toast>[0] | null = null;
    let queryToRemove: string | null = null;

    if (gh_connected === "1") {
      toastOptions = {
        title: "GitHub account connected!",
        description: "Your GitHub account has been successfully linked.",
      };
      queryToRemove = 'gh_connected';
    } else if (gh_disconnected === "1") {
      toastOptions = {
        title: "GitHub account disconnected",
        description: "Your GitHub account has been successfully unlinked.",
      };
      queryToRemove = 'gh_disconnected';
    } else if (error === "gh_connection_failed" || error === "gh_disconnect_failed") {
      const isConnect = error === "gh_connection_failed";
      toastOptions = {
        title: `GitHub ${isConnect ? 'connection' : 'disconnect'} failed`,
        description: `There was an issue ${isConnect ? 'connecting' : 'disconnecting'} your GitHub account.`,
        variant: "destructive",
      };
      queryToRemove = 'error';
    }

    if (toastOptions && queryToRemove) {
      toast(toastOptions);
      const { pathname, query } = router;
      delete query[queryToRemove];
      router.replace({ pathname, query }, undefined, { shallow: true });
    }
  }, [router, toast]);

  return (
    <div className="flex min-h-screen bg-background max-w-screen-2xl mx-auto">
      <aside className="w-1/5 xl:w-1/4 sticky top-0 h-screen hidden md:block">
        <ProfileSidebar
          profile={{ ...profile, avatar_url: profile.avatar_url ?? null }}
          onOpenLinkedInPost={() => {}}
        />
      </aside>

      <main className="w-full md:w-4/5 xl:w-3/4 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Button asChild variant="ghost" className="-ml-4">
              <Link href="/profile">Back to Profile</Link>
            </Button>
            <h1 className="text-3xl font-bold mt-2">Edit Profile</h1>
            <p className="text-muted-foreground">
              Make changes to your profile here. Click save when you're done.
            </p>
          </div>

          <EditProfileForm profile={profile} />
        </div>
      </main>
    </div>
  );
}

// ✅ Server-side profile fetch
export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const supabase = createPagesServerClient(ctx);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      redirect: { destination: "/login", permanent: false },
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      *,
      experiences:experiences(*),
      education:education(*),
      skills:skills(id, name),
      interests
    `)
    .eq("id", session.user.id)
    .single();

  if (error) console.error('Error fetching profile for edit page:', error);

  if (!profile) {
    return { notFound: true };
  }

  return {
    props: {
      profile,
      initialSession: session, // Add this line
    },
  };
}
