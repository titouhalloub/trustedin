import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import Link from 'next/link';
import Image from 'next/image';
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { Button } from './ui/button';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { useRouter } from 'next/router';

interface Profile {
  username: string | null;
  avatar_url: string | null;
}

interface RawPapo {
  id: string;
  title: string | null;
  slug: string | null;
  ai_generated_content: { text?: string } | null;
  edited_content: { text?: string } | null;
  engagement_metrics: {
    views?: number;
    likes?: number;
    comments?: number;
  } | null;
  thumbnail_url: string | null;
  profiles: Profile | null;
}

interface PapoCardData {
  id: string;
  title: string;
  content: string;
  slug: string;
  thumbnail_url?: string;
  engagement_metrics: {
    views: number;
    likes: number;
    comments: number;
  };
  author: {
    username: string;
    avatar_url?: string;
  };
}

const normalizePapoData = (p: RawPapo): PapoCardData => {
  const title = p.title || 'Untitled Papo';
  const slug = p.slug || p.id; // fallback to id if slug missing
  const content = p.edited_content?.text || p.ai_generated_content?.text || '';

  return {
    id: p.id,
    title,
    slug,
    content,
    thumbnail_url: p.thumbnail_url || undefined,
    engagement_metrics: {
      views: p.engagement_metrics?.views || 0,
      likes: p.engagement_metrics?.likes || 0,
      comments: p.engagement_metrics?.comments || 0,
    },
    author: {
      username: p.profiles?.username || 'anonymous',
      avatar_url: p.profiles?.avatar_url || undefined,
    },
  };
};

const PapoCard = ({ papo }: { papo: PapoCardData }) => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [likes, setLikes] = useState(papo.engagement_metrics.likes);
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Please sign in to like a Papo.", variant: "destructive" });
      return;
    }

    const newIsLiked = !isLiked;
    const newLikesCount = newIsLiked ? likes + 1 : likes - 1;
    setIsLiked(newIsLiked);
    setLikes(newLikesCount);

    const { error } = await supabase.rpc('increment_papo_likes', { papo_id_in: papo.id });

    if (error) {
      setIsLiked(!newIsLiked);
      setLikes(likes);
      toast({ title: "Error Liking Papo", description: error.message, variant: "destructive" });
    }
  };

  const handleComment = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/papo/${papo.author.username}/${papo.slug}#comments`);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    const shareUrl = `${window.location.origin}/papo/${papo.author.username}/${papo.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: papo.title, text: `Check out this Papo: ${papo.title}`, url: shareUrl });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link Copied!", description: "Papo URL copied to your clipboard." });
    }
  };

  return (
    <Card className="mb-6 overflow-hidden rounded-xl shadow-md transition-shadow duration-300 hover:shadow-xl group">
      <Link href={`/papo/${papo.author.username}/${papo.slug}`} className="block cursor-pointer">
        {papo.thumbnail_url && (
          <div className="relative h-48 w-full">
            <Image
              src={papo.thumbnail_url}
              alt={papo.title}
              fill
              priority={false}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              style={{ objectFit: 'cover' }}
              className="transition-transform duration-500 group-hover:scale-105"
              unoptimized // ✅ allows external URLs if next.config not updated
            />
          </div>
        )}
        <div className="p-4">
          <h2 className="text-xl font-bold group-hover:text-primary transition-colors">{papo.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{papo.content}</p>
        </div>
      </Link>
      <div className="px-4 pb-3 pt-2 border-t">
        <div className="flex items-center justify-start gap-1">
          <Button variant="ghost" size="sm" className={`text-muted-foreground hover:text-red-500 ${isLiked ? 'text-red-500' : ''}`} onClick={handleLike}>
            <Heart className="h-4 w-4 mr-2" fill={isLiked ? 'currentColor' : 'none'} />
            <span>{likes}</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-blue-500" onClick={handleComment}>
            <MessageCircle className="h-4 w-4 mr-2" />
            <span>{papo.engagement_metrics.comments}</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-green-500" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            <span>Share</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export const PapoFeed = () => {
  const [papos, setPapos] = useState<PapoCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabaseClient();

  useEffect(() => {
    const fetchPapos = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('papo')
          .select(`
            id,
            title,
            slug,
            ai_generated_content,
            edited_content,
            engagement_metrics,
            thumbnail_url,
            profiles (
              username,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        const mappedPapos = (data || []).map(p => normalizePapoData(p as unknown as RawPapo));
        setPapos(mappedPapos);
      } catch (err: any) {
        console.error("Error fetching papos:", err);
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchPapos();
  }, [supabase]);

  if (loading) return <div className="text-center p-8">Loading Papos...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Latest Papos</h1>
      {papos.length > 0 ? (
        papos.map((papo) => (
          <PapoCard key={papo.id} papo={papo} />
        ))
      ) : (
        <p className="text-muted-foreground">No Papos have been created yet.</p>
      )}
    </div>
  );
};
