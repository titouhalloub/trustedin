// components/papo/PapoIframeFrame.tsx
import { useState } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';

type Props = { src: string; title?: string };

export function PapoIframeFrame({ src, title = 'Papo' }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 20; // ~5 minutes at 15s intervals
  const [cacheBust, setCacheBust] = useState(0);

  const isSafe = /^https?:\/\//i.test(src);
  if (!isSafe) {
    return (
      <div className="rounded-xl border bg-muted/30 p-8 text-center">
        <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">This Papo has an invalid external URL.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-muted/30 p-8 text-center">
        <AlertCircle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
        <p className="text-sm font-medium mb-1">This Papo could not be embedded</p>
        <p className="text-xs text-muted-foreground mb-3">
          The site may block embedding, or the URL may be unreachable.
        </p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Open in new tab <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border overflow-hidden bg-background">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 z-10 pointer-events-none">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {retryCount > 0 ? 'Deploying your app… (this can take up to 5 minutes)' : 'Loading Papo…'}
          </div>
        </div>
      )}
      <iframe
        src={`${src}${src.includes('?') ? '&' : '?'}_r=${cacheBust}`}
        title={title}
        className="w-full h-[70vh] min-h-[500px] border-0 block"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        loading="lazy"
        onLoad={() => {
          // If we're still in the early retry window, hold the loading state a bit longer
          if (retryCount > 0 && retryCount < 3) {
            setTimeout(() => setLoading(false), 5000);
          } else {
            setLoading(false);
          }
        }}
        onError={() => {
          setLoading(false);
          if (retryCount < MAX_RETRIES) {
            setTimeout(() => {
              setRetryCount((c) => c + 1);
              setCacheBust((b) => b + 1);
              setLoading(true);
            }, 15000);
          } else {
            setError(true);
          }
        }}
      />
    </div>
  );
}
