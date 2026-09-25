import { GetServerSideProps, NextPage } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { ParsedUrlQuery } from 'querystring';
import Image from 'next/image';
import PapoPageRenderer from '@/components/PapoPageRenderer';

// Manually defined Papo type
interface Papo {
    idx: number;
    id: string;
    user_id: string;
    title: string;
    prompt_used: string;
    ai_generated_content: string | { layout: any[] };
    edited_content: null | string | { layout: any[] };
    engagement_metrics: null | any;
    created_at: string;
    slug: string;
    likes: number;
    thumbnail_url: null | string;
    profiles: {
        username: string;
        avatar_url: string | null;
    } | null;
}

interface PapoPageProps {
  papo: Papo;
}

const PapoPage: NextPage<PapoPageProps> = ({ papo }) => {
  const rawContent =
    papo.edited_content || papo.ai_generated_content || 'This Papo has no content.';

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
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <article>
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
      </article>
    </div>
  );
};

interface PapoPageParams extends ParsedUrlQuery {
  username: string;
  slug: string;
}

export const getServerSideProps: GetServerSideProps<PapoPageProps, PapoPageParams> = async (context) => {
  const { username, slug } = context.params!;
  const supabase = createPagesServerClient(context);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .eq('username', username)
    .single();

  if (profileError || !profile) {
    console.error(`Profile not found for username '${username}':`, profileError?.message);
    return { notFound: true };
  }

  const { data: papo, error: papoError } = await supabase
    .from('papo')
    .select(
      `
      *,
      profiles (
        username,
        avatar_url
      )
    `
    )
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