import { GetServerSideProps } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import Layout from '@/components/Layout';
import { PapoCard } from '@/components/papo/PapoCard';
import { Button } from '@/components/ui/button';
import type { Papo } from '@/lib/types';

type Props = {
  papos: Papo[];
  likedIds: string[];
  currentUserId: string | null;
};

export default function PapoFeedPage({ papos, likedIds, currentUserId }: Props) {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Papos</h1>
            <p className="text-sm text-muted-foreground">Living pages built by the community</p>
          </div>
          <Link href="/papo/new">
            <Button><Plus className="h-4 w-4 mr-2" /> New Papo</Button>
          </Link>
        </div>
        {papos.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-muted/30">
            <p className="text-muted-foreground">No papos yet. Be the first.</p>
            <Link href="/papo/new" className="mt-4 inline-block">
              <Button variant="outline">Create a Papo</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {papos.map((p) => (
              <PapoCard
                key={p.id}
                papo={p}
                liked={likedIds.includes(p.id)}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createPagesServerClient(ctx);
  const { data: papos, error } = await supabase
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
    .limit(50);
  if (error) console.error('Error loading papo feed:', error);

  // Batch-fetch which papos the current user has liked
  const { data: { user } } = await supabase.auth.getUser();
  let likedIds: string[] = [];
  if (user && papos && papos.length > 0) {
    const { data: likeRows } = await supabase
      .from('papo_likes')
      .select('papo_id')
      .eq('user_id', user.id)
      .in('papo_id', papos.map((p: any) => p.id));
    likedIds = (likeRows || []).map((r: any) => r.papo_id);
  }

  return {
    props: {
      papos: (papos || []) as unknown as Papo[],
      likedIds,
      currentUserId: user?.id ?? null,
    },
  };
};
