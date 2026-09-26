// components/papo/PapoEngagementBar.tsx
import { Heart, MessageCircle, Eye, Share2 } from 'lucide-react';
import type { Papo } from '@/lib/types';

type Props = { papo: Papo };

export function PapoEngagementBar({ papo }: Props) {
  const likes = papo.likes ?? 0;
  const comments = papo.engagement_metrics?.comments ?? 0;
  const views = papo.engagement_metrics?.views ?? 0;

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: papo.title || 'Papo', url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); } catch {}
    }
  };

  return (
    <div className="flex items-center gap-6 py-4 border-y my-6 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground"><Heart className="h-4 w-4" /> {likes}</span>
      <span className="flex items-center gap-1.5 text-muted-foreground"><MessageCircle className="h-4 w-4" /> {comments}</span>
      <span className="flex items-center gap-1.5 text-muted-foreground"><Eye className="h-4 w-4" /> {views}</span>
      <button onClick={handleShare} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary ml-auto transition-colors">
        <Share2 className="h-4 w-4" /> Share
      </button>
    </div>
  );
}
