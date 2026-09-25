import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Star } from 'lucide-react';
import Link from 'next/link';

interface Candidate {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  trust_score: number;
  reputation_points: number;
}

// Safely get initials, even if name is null, undefined, or empty
const getInitials = (name?: string | null) => {
  if (!name) return '??'; // fallback placeholder if no name
  return name
    .split(' ')
    .filter(Boolean) // remove empty parts
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const CandidateCard = ({ candidate }: { candidate: Candidate }) => {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center gap-4">
        <Avatar className="h-12 w-12">
          {candidate.avatar_url ? (
            <AvatarImage src={candidate.avatar_url} alt={candidate.full_name || 'Candidate'} />
          ) : (
            <AvatarFallback>{getInitials(candidate.full_name)}</AvatarFallback>
          )}
        </Avatar>
        <div>
          <CardTitle className="text-lg">{candidate.full_name || 'Unknown Candidate'}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {candidate.bio || 'No bio available.'}
        </p>
        <div className="flex gap-4 mt-4">
          <Badge variant="secondary" className="flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-green-500" /> Trust Score: {candidate.trust_score}
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500" /> Reputation: {candidate.reputation_points}
          </Badge>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/${candidate.id}`}>View Profile</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
