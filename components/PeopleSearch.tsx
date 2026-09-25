import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Linkedin, AlertCircle, Search as SearchIcon, Globe, Users, DollarSign, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

type PersonProfile = {
  id: string;
  name: string;
  title: string;
  linkedin_url: string;
  organization: {
    name: string;
  } | null;
  photo_url: string | null;
};

type OrganizationProfile = {
  id: string;
  name: string;
  website_url: string;
  linkedin_url: string;
  logo_url: string;
  estimated_num_employees: number;
  industry: string;
  annual_revenue: string;
  city: string;
  state: string;
  country: string;
};

type EnrichedResult =
  | { type: 'person'; data: PersonProfile }
  | { type: 'organization'; data: OrganizationProfile };

export function PeopleSearch() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<EnrichedResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/peopleSearch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'An unknown error occurred.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-7xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-foreground">
          Data Enrichment
        </CardTitle>
        <CardDescription>
          Enter an email or company domain to enrich with Apollo.io data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 mb-8">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g., billg@microsoft.com or trustedin.com" className="flex-grow" required />
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
            {isLoading ? 'Enriching...' : 'Enrich'}
          </Button>
        </form>

        {error && (
          <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-md">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        )}

        {result?.type === 'person' && (
          <PersonCard person={result.data} />
        )}

        {result?.type === 'organization' && (
          <OrganizationCard org={result.data} />
        )}
      </CardContent>
    </Card>
  );
}

const PersonCard = ({ person }: { person: PersonProfile }) => (
  <Card className="overflow-hidden">
    <CardHeader className="flex flex-row items-start bg-muted/50">
      <Avatar className="w-20 h-20 mr-6 border-2 border-background">
        <AvatarImage src={person.photo_url || undefined} alt={person.name} />
        <AvatarFallback>{person.name?.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="grid gap-0.5">
        <CardTitle className="group flex items-center gap-2 text-lg">{person.name}</CardTitle>
        <CardDescription>{person.title} at {person.organization?.name}</CardDescription>
      </div>
    </CardHeader>
    <CardContent className="p-6 text-sm">
      <div className="grid gap-3">
        <div className="font-semibold">Details</div>
        <ul className="grid gap-3">
          <li className="flex items-center justify-between">
            <span className="text-muted-foreground">LinkedIn</span>
            <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              View Profile <Linkedin className="h-4 w-4" />
            </a>
          </li>
        </ul>
      </div>
    </CardContent>
  </Card>
);

const OrganizationCard = ({ org }: { org: OrganizationProfile }) => (
  <Card className="overflow-hidden">
    <CardHeader className="flex flex-row items-start bg-muted/50">
      <Avatar className="w-20 h-20 mr-6 border-2 border-background">
        <AvatarImage src={org.logo_url || undefined} alt={org.name} />
        <AvatarFallback>{org.name?.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="grid gap-0.5">
        <CardTitle className="group flex items-center gap-2 text-lg">{org.name}</CardTitle>
        <CardDescription>{org.industry}</CardDescription>
      </div>
    </CardHeader>
    <CardContent className="p-6 text-sm">
      <div className="grid gap-3">
        <div className="font-semibold">Company Details</div>
        <ul className="grid gap-3">
          <li className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-2"><Globe className="h-4 w-4" /> Website</span><span>{org.website_url}</span></li>
          <li className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Employees</span><span>{org.estimated_num_employees}</span></li>
          <li className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" /> Revenue</span><span>{org.annual_revenue}</span></li>
          <li className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> Location</span><span>{`${org.city}, ${org.state}, ${org.country}`}</span></li>
          <li className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-2"><Linkedin className="h-4 w-4" /> LinkedIn</span><a href={org.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View Page</a></li>
        </ul>
      </div>
    </CardContent>
  </Card>
);