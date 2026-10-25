import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Award, ArrowUpRight, Shield, TrendingUp, User, UserCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface ScoreData {
  score: number;
  badge: string;
  history: {
    delta: number;
    reason: string;
    created_at: string;
    new_score: number;
  }[];
}

interface TrustReportCardProps {
  userId: string;
}

const badgeIcons: { [key: string]: React.ReactNode } = {
  'Newcomer': <User className="h-5 w-5 text-gray-500" />,
  'Contributor': <UserCheck className="h-5 w-5 text-blue-500" />,
  'Trusted': <Shield className="h-5 w-5 text-green-500" />,
  'Highly Trusted': <Award className="h-5 w-5 text-purple-500" />,
  'Authority': <TrendingUp className="h-5 w-5 text-yellow-500" />,
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

export function TrustReportCard({ userId }: TrustReportCardProps) {
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
        if (!response.ok) throw new Error('Failed to fetch trust score.');
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
    return <Card><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>;
  }

  if (error || !scoreData) {
    return <Card><CardContent className="p-4 text-destructive">{error || 'Could not load score report.'}</CardContent></Card>;
  }

  const { score, badge, history } = scoreData;
  const chartData = history.map(h => ({ name: new Date(h.created_at).toLocaleDateString(), score: h.new_score })).reverse();

  return (
    <Link href="/trust-report" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-label="Open your full Trust Report">
    <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Trust Report</span>
          <span className="text-2xl font-bold text-primary">{score}</span>
        </CardTitle>
        <Progress value={score / 10} className="w-full h-2" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          {badgeIcons[badge] || <User className="h-5 w-5" />}
          <p className="font-semibold">{badge}</p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Score Trend</h4>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground">Not enough data for a trend chart.</p>
          )}
        </div>

        <div className="mt-4 pt-4 border-t space-y-2">
          <h4 className="font-semibold text-sm">Recent History</h4>
          {history.length > 0 ? (
            history.slice(0, 3).map((item, index) => (
              <div key={index} className="flex justify-between items-center text-xs">
                <div>
                  <p className="font-medium text-foreground">{reasonText[item.reason] || 'Update'}</p>
                  <p className="text-muted-foreground">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
                </div>
                <span className={`font-bold text-sm ${item.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>{item.delta > 0 ? `+${item.delta}` : item.delta}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No recent score changes.</p>
          )}
        </div>
      </CardContent>
      <div className="flex items-center justify-between border-t px-6 py-3 text-sm font-medium text-primary">
        <span>View full Trust Report</span>
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Card>
    </Link>
  );
}