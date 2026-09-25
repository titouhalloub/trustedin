import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, Building, Linkedin, AlertCircle } from 'lucide-react';

// Define the structure of the enriched profile data we expect from our API
type EnrichedProfile = {
  name: string;
  title: string;
  linkedin_url: string;
  organization: {
    name: string;
  };
};

export function EnrichForm() {
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<EnrichedProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setProfile(null);
    setError(null);

    try {
      const response = await fetch(`/api/enrich?email=${encodeURIComponent(email)}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data: EnrichedProfile = await response.json();
      setProfile(data);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto my-8">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">
          Apollo.io Email Enrichment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-6">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter an email address"
            required
            className="flex-grow"
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Enriching...' : 'Enrich'}
          </Button>
        </form>

        {error && (
          <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-md">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        )}

        {profile && (
          <Card className="bg-background">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">{profile.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <span className="text-foreground">
                  {profile.title} at {profile.organization?.name || 'N/A'}
                </span>
              </div>
              {profile.linkedin_url && (
                <div className="flex items-center gap-3">
                  <Linkedin className="h-5 w-5 text-muted-foreground" />
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View on LinkedIn
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}