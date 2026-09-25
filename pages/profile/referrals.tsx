import { useState, useEffect } from 'react';
import { GetServerSidePropsContext } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { useUser } from '@supabase/auth-helpers-react';
import Image from 'next/image';
import { Copy, Check, Users, DollarSign, Link as LinkIcon, Hourglass, TrendingUp, Gift, CheckCircle, Repeat, Zap } from 'lucide-react';

import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { getInitials } from '@/lib/utils';
import referralBanner from '@/assets/refferal_banner2.png';

interface ReferralStats {
  referral_count: number;
  conversion_count: number;
  pending_earnings: number;
}

interface ReferredUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  has_converted: boolean;
}

interface ReferralsPageProps {
  referralCode: string | null;
  referralStats: ReferralStats;
  referredUsers: ReferredUser[];
}

const StatCard = ({ title, value, icon: Icon, color = 'purple' }: { title: string; value: string | number; icon: React.ElementType; color?: 'blue' | 'purple' | 'green' }) => (
  <Card className={`border ${color === 'blue' ? 'bg-blue-100 border-blue-200' : color === 'purple' ? 'bg-purple-100 border-purple-200' : 'bg-green-100 border-green-200'}`}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-800">{title}</CardTitle>
      <div className={`h-8 w-8 flex items-center justify-center rounded-md ${color === 'blue' ? 'bg-blue-200' : color === 'purple' ? 'bg-purple-200' : 'bg-green-200'}`}>
        <Icon className={`h-4 w-4 ${color === 'blue' ? 'text-blue-800' : color === 'purple' ? 'text-purple-800' : 'text-green-800'}`} />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </CardContent>
  </Card>
);

export default function ReferralsPage({ referralCode, referralStats, referredUsers }: ReferralsPageProps) {
  const user = useUser();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!user || !referralCode) {
    return (
      <Layout>
        <div className="p-8">
          <Card>
            <CardHeader>
              <CardTitle>Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Loading your referral information...</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: 'Copied to clipboard!', description: 'Your referral link has been copied.' });
    setTimeout(() => setCopied(false), 2000);
  };

 return (
  <Layout>
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* === REFERRAL BANNER === */}
      <div className="w-full max-w-4xl mx-auto rounded-2xl shadow-lg overflow-hidden border bg-white flex flex-col md:flex-row items-center">
        <div className="p-8 md:w-1/2">
          <h2 className="text-3xl font-bold text-gray-800">
            Invite a Friend, <span className="text-purple-600">Get Rewarded</span>
          </h2>
          <p className="mt-2 text-gray-600">
            Share your personal referral link and earn when your friends subscribe.
          </p>
          <ul className="mt-4 space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Earn a <strong className="font-bold text-purple-600">30% commission</strong> on every referral.</span>
            </li>
            <li className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-blue-500" />
              <span>Commission is <strong className="font-bold">recurring</strong> for active subscriptions.</span>
            </li>
            <li className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span>Unlimited referrals, unlimited earnings.</span>
            </li>
          </ul>
        </div>
        <div className="md:w-1/2 h-full">
          <Image
            src={referralBanner}
            alt="Grow the Network, Get Rewarded"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* === MAIN REFERRAL CARD === */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-purple-600" />
            <CardTitle>Grow the Network, Get Rewarded</CardTitle>
          </div>
          <CardDescription className="pt-2">
            Share your unique link to invite other professionals. You'll earn a <strong className="font-bold text-purple-600">30% recurring commission</strong> on any subscription they purchase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-grow w-full">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                readOnly
                value={referralLink}
                className="pl-10 pr-24"
              />
            </div>
            <Button onClick={handleCopy} className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-px">
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* === STATS GRID === */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Referrals" value={referralStats.referral_count} icon={Users} color="blue" />
        <StatCard title="Paid Conversions" value={referralStats.conversion_count} icon={TrendingUp} color="green" />
        <StatCard title="Pending Earnings" value={`$${referralStats.pending_earnings.toFixed(2)}`} icon={Hourglass} color="purple" />
      </div>

      {/* === REFERRAL LIST === */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            <CardTitle>Your Referrals</CardTitle>
          </div>
          <CardDescription>A detailed list of users you've referred will appear here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {referredUsers.length > 0 ? (
            referredUsers.map((refUser) => (
              <div key={refUser.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={refUser.avatar_url ?? undefined} alt={refUser.full_name || 'User'} />
                    <AvatarFallback>{getInitials(refUser.full_name ?? '')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{refUser.full_name}</p>
                    <p className="text-sm text-muted-foreground">@{refUser.username}</p>
                  </div>
                </div>
                {refUser.has_converted && <Badge className="bg-purple-100 text-purple-800">Converted</Badge>}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No referral history yet. Start sharing your link!</p>
          )}
        </CardContent>
      </Card>

    </div>
  </Layout>
);

}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/auth', permanent: false } };
  }

  // Fetch the user's referral code from their profile
  let { data: profile } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', session.user.id)
    .single();

  // If no referral code exists yet, generate and save one.
  if (!profile?.referral_code) {
    // Use a simple but unique-enough code for now.
    const generatedCode = session.user.id.slice(0, 8);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ referral_code: generatedCode })
      .eq('id', session.user.id);

    if (updateError) {
      console.error("Error generating referral code:", updateError);
    }
    profile = { referral_code: generatedCode };
  }

  // Fetch all referrals made using the user's code, and join with the referred user's profile info.
  const { data: referrals, error: referralsError } = await supabase
    .from('referrals')
    .select(`
      referred_user_id,
      stripe_subscription_id,
      profiles:referred_user_id (
        id,
        full_name,
        username,
        avatar_url
      )
    `)
    .eq('referral_code_used', profile?.referral_code);

  if (referralsError) {
    console.error("Error fetching referrals:", referralsError);
  }

  const referredUsers: ReferredUser[] = (referrals || [])
    .map(r => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return {
        id: profile?.id,
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
        username: profile?.username,
        has_converted: !!r.stripe_subscription_id,
      };
    })
    .filter(u => u.id); // Filter out any potential null profiles

  const referral_count = referredUsers.length;
  const conversion_count = referredUsers.filter(u => u.has_converted).length;

  // In a real app, this would be a SUM over a 'commissions' table.
  // For now, we can estimate it based on a fixed commission amount per conversion.
  const pending_earnings = conversion_count * (19 * 0.30); // Assuming $19/mo plan, 30% commission

  const referralStats: ReferralStats = {
    referral_count,
    conversion_count,
    pending_earnings,
  };

  return {
    props: {
      referralCode: profile?.referral_code || null,
      referralStats,
      referredUsers,
    },
  };
};

// Add a custom 'success' variant to the Badge component if it doesn't exist.
// This is a common pattern. You might add this to your badge component file or a global CSS file.
/* In your globals.css or a relevant CSS file:
.bg-success { background-color: hsl(var(--success)); }
.text-success-foreground { color: hsl(var(--success-foreground)); }

In your tailwind.config.js, under theme.extend.colors:
success: {
  DEFAULT: "hsl(142.1 76.2% 36.3%)",
  foreground: "hsl(142.1 70.6% 95.3%)",
},
*/