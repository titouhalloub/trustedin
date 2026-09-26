// components/papo/PapoDetailHeader.tsx
import Link from 'next/link';
import { getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Papo } from '@/lib/types';

type Props = { papo: Papo };

export function PapoDetailHeader({ papo }: Props) {
  const headline = papo.metadata?.headline || papo.title || 'Untitled Papo';
  const description = papo.metadata?.description || '';
  const tags = papo.metadata?.tags || [];
  const authorUsername = papo.author?.username || 'unknown';

  return (
    <header className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href={`/${authorUsername}`}>
          <Avatar className="h-10 w-10 hover:opacity-80 transition-opacity">
            <AvatarImage src={papo.author?.avatar_url || undefined} />
            <AvatarFallback>{getInitials(papo.author?.full_name || 'U')}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/${authorUsername}`} className="font-medium text-sm hover:underline">
            {papo.author?.full_name || 'User'}
          </Link>
          <p className="text-xs text-muted-foreground">
            @{authorUsername} · {new Date(papo.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge variant="secondary">
          {papo.engine === 'v0' ? 'AI App' : papo.engine === 'heyputer' ? 'App' : 'Papo'}
        </Badge>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">{headline}</h1>
      {description && <p className="text-muted-foreground mb-3">{description}</p>}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => <span key={tag} className="text-sm text-primary">#{tag}</span>)}
        </div>
      )}
    </header>
  );
}
