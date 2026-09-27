import { useEffect, useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { Sparkles, Layers, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const NewPapoPage = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'basic' | 'pro'>('basic');
  const [credits, setCredits] = useState<number | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/credits/history');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setCredits(data.current_balance ?? 0);
        }
      } catch (err) {
        console.error('Failed to load credits:', err);
      } finally {
        if (!cancelled) setLoadingCredits(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to create a Papo.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'basic') {
        // Call the API route to generate content from the prompt
        const response = await fetch('/api/papo/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate content');
        }

        const generatedContent = await response.json();

        const slug = generatedContent.title
          .toLowerCase()
          .replace(/ /g, '-')
          .replace(/[^\w-]+/g, '');

        const { data, error } = await supabase
          .from('papo')
          .insert({
            user_id: user.id,
            title: generatedContent.title,
            prompt_used: prompt,
            ai_generated_content: generatedContent,
            slug: `${slug}-${Date.now().toString(36)}`, // Ensure unique slug
          })
          .select()
          .single();

        if (error) throw error;

        toast({
          title: 'Papo Created!',
          description: 'Your new Papo has been generated.',
        });

        // Fetch username from profiles (not user_metadata — that's never populated for
        // email/password signups or OAuth users, only for one legacy signup path).
        const { data: profileRow, error: profileErr } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (profileErr || !profileRow?.username) {
          console.warn('Papo created but profile.username missing; redirecting to dashboard.', profileErr);
          toast({
            title: 'Papo Created!',
            description: 'Set a username in your profile to view it at a friendly URL.',
          });
          router.push('/papo');
          return;
        }

        router.push(`/papo/${profileRow.username}/${data.slug}`);
      } else {
        const response = await fetch('/api/papo/generate-pro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to generate Papo');
        }

        const data = await response.json();
        toast({
          title: 'Live App Papo Created!',
          description: 'Your AI app is ready to view.',
        });
        router.push(data.redirectTo);
        return;
      }

    } catch (error: any) {
      toast({
        title: 'Error creating Papo',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Create a new Papo</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title (Optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The AI will generate a title, but you can override it here."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the content you want the AI to generate..."
              required
              rows={5}
            />
            <p className="text-sm text-muted-foreground">
              This prompt will be used to generate the initial content for your Papo.
            </p>
          </div>
          <div className="space-y-3">
            <Label>Papo type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Basic */}
              <Card
                className={cn(
                  'p-4 cursor-pointer transition-all hover:border-primary/50',
                  mode === 'basic' && 'border-primary ring-1 ring-primary/30'
                )}
                onClick={() => setMode('basic')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Basic Papo</span>
                  <Badge variant="secondary" className="ml-auto text-xs">Free</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  A rich JSON layout. Ready in a few seconds.
                </p>
              </Card>

              {/* Pro */}
              <Card
                className={cn(
                  'p-4 cursor-pointer transition-all hover:border-primary/50',
                  mode === 'pro' && 'border-primary ring-1 ring-primary/30',
                  credits !== null && credits < 5 && 'opacity-60'
                )}
                onClick={() => { if (credits === null || credits >= 5) setMode('pro'); }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">Live App Papo</span>
                  <Badge className="ml-auto text-xs">5 credits</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  A real web app built by AI. Takes 30–60 seconds.
                </p>
                {!loadingCredits && credits !== null && (
                  <p className={cn(
                    'text-xs mt-1',
                    credits < 5 ? 'text-destructive' : 'text-muted-foreground'
                  )}>
                    Your balance: {credits} credits
                  </p>
                )}
              </Card>
            </div>
          </div>

          {mode === 'pro' && credits !== null && credits < 5 && (
            <Alert
              variant="error"
              title="Insufficient credits"
              description="You need at least 5 credits to create a Live App Papo. Earn credits by verifying your profile."
            />
          )}

          <Button
            type="submit"
            disabled={isSubmitting || (mode === 'pro' && (credits === null || credits < 5))}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === 'pro' ? 'Building your app (30–60s)…' : 'Generating…'}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {mode === 'pro' && <Sparkles className="h-4 w-4" />}
                {mode === 'pro' ? 'Generate Live App (5 credits)' : 'Generate Papo'}
              </span>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default NewPapoPage;