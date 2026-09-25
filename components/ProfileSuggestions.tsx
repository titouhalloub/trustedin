import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  TrendingUp, 
  UserPlus, 
  Shield, 
  MessageCircle,
  ExternalLink,
  Zap,
  Award
} from 'lucide-react';
import { useUser } from '@supabase/auth-helpers-react';

interface SuggestedProfile {
  id: string;
  full_name: string;
  username: string;
  trust_score: number;
  verification_level: string;
  avatar_url: string | null;
}

interface ProfileSuggestionsProps {
  suggestions?: SuggestedProfile[];
}

export const ProfileSuggestions = ({ suggestions = [] }: ProfileSuggestionsProps) => {
  const user = useUser();
  const [followed, setFollowed] = useState<string[]>([]);

  const trendingAccounts = [
    {
      id: 1,
      name: 'TechInnovator',
      username: 'techinnovator',
      category: 'Technology',
      followers: '12.5K',
      verification: 'premium'
    },
    {
      id: 2,
      name: 'FinanceGuru',
      username: 'financeguru',
      category: 'Finance',
      followers: '8.2K',
      verification: 'verified'
    }
  ];

  const getInitials = (name: string | null) => {
    if (!name) return '';
    return name      
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getVerificationIcon = (level: string) => {
    switch (level) {
      case 'premium': return <Award className="h-3 w-3 text-purple-500" />;
      case 'verified': return <Shield className="h-3 w-3 text-green-500" />;
      default: return null;
    }
  };

  const handleConnect = async (targetUserId: string) => {
    if (!user) return;

    // Optimistically update the UI
    setFollowed(prev => [...prev, targetUserId]);

    try {
      await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      // You could add success feedback or refresh data here
    } catch (error) {
      console.error("Failed to connect:", error);
      // Revert UI on failure
      setFollowed(prev => prev.filter(id => id !== targetUserId));
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Friends
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Shield className="h-4 w-4 mr-2" />
            Verify Account
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <MessageCircle className="h-4 w-4 mr-2" />
            Join Discussion
          </Button>
        </CardContent>
      </Card>

      {/* Suggested Connections */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Suggested Connections
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestions.map((connection) => (
            <div key={connection.id} className="p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <Link href={`/${connection.id}`} className="flex items-center gap-3 flex-grow">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={connection.avatar_url ?? undefined} alt={connection.full_name} />
                    <AvatarFallback className="text-sm bg-gradient-trust text-white">
                      {getInitials(connection.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {connection.full_name}
                      </span>
                      {getVerificationIcon(connection.verification_level)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      @{connection.username}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Trust: {connection.trust_score}
                    </div>
                  </div>
                </Link>
              </div>
              <Button size="sm" variant="outline" onClick={() => handleConnect(connection.id)} disabled={followed.includes(connection.id)} className="w-full mt-3">
                {followed.includes(connection.id) ? 'Following' : 'Connect'}
              </Button>
            </div>
          ))}
          <Button variant="ghost" className="w-full text-sm">
            View All Suggestions
          </Button>
        </CardContent>
      </Card>

      {/* Trending Accounts */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-secondary" />
            Trending Verified
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {trendingAccounts.map((account) => (
            <div key={account.id} className="p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {account.name}
                  </span>
                  {getVerificationIcon(account.verification)}
                </div>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                @{account.username}
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {account.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {account.followers} followers
                </span>
              </div>
            </div>
          ))}
          <Button variant="ghost" className="w-full text-sm">
            Explore More
          </Button>
        </CardContent>
      </Card>

      {/* Community Highlights */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-accent" />
            Community Highlights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm font-medium text-foreground mb-1">
              Weekly Trust Challenge
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              Complete 5 verifications to earn bonus points
            </div>
            <div className="text-xs text-primary font-medium">
              2/5 completed
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm font-medium text-foreground mb-1">
              New Feature: Trust Circles
            </div>
            <div className="text-xs text-muted-foreground">
              Create private groups with your most trusted connections
            </div>
          </div>
          
          <Button variant="ghost" className="w-full text-sm">
            View All Updates
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};