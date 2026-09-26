import { useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

const NewPapoPage = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Generating...' : 'Generate Papo'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default NewPapoPage;