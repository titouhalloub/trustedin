// components/papo/PapoEngagementBar.tsx
import { useState } from 'react';
import { Heart, MessageCircle, Eye, Share2 } from 'lucide-react';
import type { Papo } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

type Props = {
  papo: Papo;
  liked: boolean;
  currentUserId: string | null;
};

export function PapoEngagementBar({ papo, liked: initialLiked, currentUserId }: Props) {
  const { toast } = useToast();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(papo.likes ?? 0);
  const [pending, setPending] = useState(false);

  const comments = papo.engagement_metrics?.comments ?? 0;
  const views = papo.engagement_metrics?.views ?? 0;

  const handleLike = async () => {
    if (!currentUserId) {
      toast({
        title: 'Sign in to like',
        description: 'You need an account to like Papos.',
      });
      return;
    }
    if (pending) return;

    setPending(true);
    const prevLiked = liked;
    const prevCount = likeCount;

    // Optimistic update
    setLiked(!liked);
    setLikeCount(liked ? Math.max(0, likeCount - 1) : likeCount + 1);

    try {
      const res = await fetch(`/api/papo/${papo.id}/like`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to toggle like');
      const data = await res.json();
      setLiked(data.liked);
      setLikeCount(data.likes ?? 0);
    } catch (err) {
      // Revert on failure
      setLiked(prevLiked);
      setLikeCount(prevCount);
      console.error('Like failed:', err);
    } finally {
      setPending(false);
    }
  };

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: papo.title || 'Papo', url }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Link copied to clipboard' });
      } catch {}
    }
  };

  return (
    <div className="flex items-center gap-6 py-4 border-y my-6 text-sm">
      <button
        onClick={handleLike}
        disabled={pending}
        className={cn(
          'flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-red-500',
          liked && 'text-red-500'
        )}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
        {likeCount}
      </button>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <MessageCircle className="h-4 w-4" /> {comments}
      </span>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Eye className="h-4 w-4" /> {views}
      </span>
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-primary ml-auto transition-colors"
      >
        <Share2 className="h-4 w-4" /> Share
      </button>
    </div>
  );
}
