import { GetServerSideProps, NextPage } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { ParsedUrlQuery } from 'querystring';
import Image from 'next/image';
import PapoPageRenderer from '@/components/PapoPageRenderer';
import { Layout } from '@/components/Layout';
import { CommentSection } from '@/components/CommentSection';
import { PapoIframeFrame } from '@/components/papo/PapoIframeFrame';
import { PapoDetailHeader } from '@/components/papo/PapoDetailHeader';
import { PapoEngagementBar } from '@/components/papo/PapoEngagementBar';
import type { Papo } from '@/lib/types';

interface PapoPageProps {
  papo: Papo;
}

const PapoPage: NextPage<PapoPageProps> = ({ papo }) => {
  const isHybrid = Boolean(papo.external_url);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <article>
          {isHybrid ? (
            <>
              <PapoDetailHeader papo={papo} />
              <PapoIframeFrame src={papo.external_url!} title={papo.title || 'Papo'} />
              <PapoEngagementBar papo={papo} />
              <section className="mt-8">
                <CommentSection papoId={papo.id} />
              </section>
            </>
          ) : (
            <LegacyPapoContent papo={papo} />
          )}
        </article>
      </div>
    </Layout>
  );
};

function LegacyPapoContent({ papo }: { papo: Papo }) {
  const rawContent = papo.edited_content || papo.ai_generated_content || 'This Papo has no content.';

  let content;
  if (typeof rawContent === 'string') {
    try {
      content = JSON.parse(rawContent);
    } catch (error) {
      console.error('Failed to parse content:', error);
      content = { layout: [{ type: 'fallback', data: { text: rawContent } }] };
    }
  } else {
    content = rawContent;
  }

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
        {papo.title}
      </h1>
      {papo.thumbnail_url && (
        <div className="relative h-80 w-full my-8 rounded-lg overflow-hidden shadow-xl">
          <Image
            src={papo.thumbnail_url}
            alt={papo.title || 'Papo thumbnail'}
            fill
            unoptimized
            style={{ objectFit: 'cover' }}
            priority
          />
        </div>
      )}
      <div className="mt-6 prose prose-lg prose-slate max-w-none">
        <PapoPageRenderer content={content} />
      </div>
    </>
  );
}

interface PapoPageParams extends ParsedUrlQuery {
  username: string;
  slug: string;
}

export const getServerSideProps: GetServerSideProps<PapoPageProps, PapoPageParams> = async (context) => {
  const { username, slug } = context.params!;
  const supabase = createPagesServerClient(context);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single();

  if (profileError || !profile) {
    console.error(`Profile not found for username '${username}':`, profileError?.message);
    return { notFound: true };
  }

  const { data: papo, error: papoError } = await supabase
    .from('papo')
    .select(`
      id, user_id, slug, title, prompt_used,
      ai_generated_content, edited_content, thumbnail_url,
      preview_image_url, engagement_metrics, likes,
      metadata, engine, external_url, external_project_id,
      visibility, last_synced_at, created_at,
      author:profiles!papo_user_id_fkey(id, username, full_name, avatar_url)
    `)
    .eq('slug', slug)
    .eq('user_id', profile.id)
    .single();

  if (papoError || !papo) {
    console.error(
      `Papo not found for slug '${slug}' and username '${username}':`,
      papoError?.message
    );
    return { notFound: true };
  }

  return {
    props: {
      papo: papo as unknown as Papo,
    },
  };
};

export default PapoPage;