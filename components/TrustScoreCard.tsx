import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Shield, TrendingUp, User, UserCheck, ArrowDown, ArrowUp } from "lucide-react";

interface TrustScoreCardProps {
  userId: string;
}

interface ScoreData {
  score: number;
  badge: string;
  history: {
    delta: number;
    reason: string;
    created_at: string;
  }[];
}

const badgeIcons: { [key: string]: React.ReactNode } = {
  'Newcomer': <User className="h-4 w-4 text-gray-500" />,
  'Contributor': <UserCheck className="h-4 w-4 text-blue-500" />,
  'Trusted': <Shield className="h-4 w-4 text-green-500" />,
  'Highly Trusted': <Award className="h-4 w-4 text-purple-500" />,
  'Authority': <TrendingUp className="h-4 w-4 text-yellow-500" />,
};

const reasonText: { [key:string]: string } = {
    'identity_verification': 'Identity Verified',
    'endorsement_received': 'New Endorsement',
    'endorsement_given': 'Gave Endorsement',
    'post_engagement': 'Post Engagement',
    'engagement_quality': 'Message Activity',
    'inactivity_decay': 'Inactive Period',
    'manual_adjustment': 'Manual Adjustment',
    'initial_calculation': 'Initial Score'
}

export function TrustScoreCard({ userId }: TrustScoreCardProps) {
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchScore = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/score/${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch trust score.');
        }
        const data: ScoreData = await response.json();
        setScoreData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScore();
  }, [userId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !scoreData) {
    return (
      <Card>
        <CardContent className="p-4 text-xs text-destructive">
          {error || 'Could not load score.'}
        </CardContent>
      </Card>
    );
  }

  const { score, badge, history } = scoreData;

  return (
    <Link href={`/${userId}`} className="block">
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Trust Score</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="text-3xl font-bold">{score}</div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <Badge variant="outline" className="flex items-center gap-1">
                        {badgeIcons[badge]}
                        {badge}
                    </Badge>
                    <span>/ 1000</span>
                </div>
                <Progress value={score / 10} className="w-full h-1 mt-2" />

                {history && history.length > 0 && (
                    <div className="mt-4 space-y-1 border-t pt-2">
                        {history.slice(0, 3).map((item, index) => (
                            <div key={index} className="flex justify-between items-center text-xs text-muted-foreground">
                                <span className="truncate">{reasonText[item.reason] || 'Update'}</span>
                                <span className={`flex items-center font-medium ${item.delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {item.delta >= 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                                    {item.delta > 0 ? `+${item.delta}` : item.delta}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    </Link>
  );
}