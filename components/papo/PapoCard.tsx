import Link from 'next/link';
import { Heart, MessageCircle, Eye, Share2 } from 'lucide-react';
import type { Papo } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

type Props = { papo: Papo; variant?: 'default' | 'compact' };

export function PapoCard({ papo, variant = 'default' }: Props) {
  const preview = papo.preview_image_url || papo.thumbnail_url;
  const headline = papo.metadata?.headline || papo.title || 'Untitled Papo';
  const description = papo.metadata?.description || '';
  const tags = papo.metadata?.tags || [];
  const likes = papo.likes ?? 0;
  const comments = papo.engagement_metrics?.comments ?? 0;
  const views = papo.engagement_metrics?.views ?? 0;
  const authorUsername = papo.author?.username || 'unknown';
  const href = `/papo/${authorUsername}/${papo.slug || papo.id}`;

  if (variant === 'compact') {
    return (
      <Link href={href} className="block w-64 flex-shrink-0 group">
        <div className="rounded-xl overflow-hidden border bg-card hover:shadow-md transition-shadow">
          <div className="aspect-[4/3] bg-muted relative">
            {preview ? (
              <img src={preview} alt={headline} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No preview</div>
            )}
          </div>
          <div className="p-3">
            <p className="font-semibold text-sm line-clamp-2 group-hover:text-primary">{headline}</p>
            <p className="text-xs text-muted-foreground mt-1">@{authorUsername}</p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <article className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 p-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={papo.author?.avatar_url || undefined} />
          <AvatarFallback>{getInitials(papo.author?.full_name || 'U')}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{papo.author?.full_name || 'User'}</p>
          <p className="text-xs text-muted-foreground truncate">
            @{authorUsername} · {new Date(papo.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {papo.engine === 'v0' ? 'AI App' : papo.engine === 'heyputer' ? 'App' : 'Papo'}
        </Badge>
      </div>
      <Link href={href} className="block">
        <div className="aspect-[16/9] bg-muted relative">
          {preview ? (
            <img src={preview} alt={headline} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">No preview available</div>
          )}
        </div>
      </Link>
      <div className="p-4">
        <Link href={href}>
          <h3 className="font-semibold text-lg hover:text-primary line-clamp-2">{headline}</h3>
        </Link>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.slice(0, 5).map((tag) => (
              <span key={tag} className="text-xs text-primary">#{tag}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {likes}</span>
          <Link href={href} className="flex items-center gap-1 hover:text-primary">
            <MessageCircle className="h-4 w-4" /> {comments}
          </Link>
          <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {views}</span>
          <button className="flex items-center gap-1 hover:text-primary ml-auto">
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
      </div>
    </article>
  );
}
