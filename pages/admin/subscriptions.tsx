import { useState, useEffect, useCallback } from 'react';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  subscription: {
    plan_name: string;
    status: string;
    current_period_ends_at: string;
  } | null;
}

// These names must exactly match the `name` column in your `products` table.
const planOptions = [
  'Pro / Growth',
  'Business',
  'Recruiter Starter',
  'Recruiter Pro',
  'Recruiter Enterprise',
];

const UserSubscriptionRow = ({ profile, onUpdate }: { profile: Profile, onUpdate: () => void }) => {
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState(profile.subscription?.plan_name || planOptions[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: 'start_trial' | 'start_subscription') => {
    setIsLoading(true);
    const { error } = await supabase.rpc('admin_update_subscription', {
      p_user_id: profile.id,
      p_plan_name: selectedPlan,
      p_action: action,
    });

    if (error) {
      toast({ title: 'Error updating subscription', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Subscription updated successfully!' });
      onUpdate(); // Refresh the list
    }
    setIsLoading(false);
  };

  const getStatusVariant = (status: string | undefined) => {
    switch (status) {
      case 'active':
      case 'trialing':
        return 'success';
      case 'canceled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{profile.full_name}</div>
        <div className="text-sm text-muted-foreground">{profile.email}</div>
      </TableCell>
      <TableCell>
        {profile.subscription ? (
          <div className="flex flex-col">
            <Badge variant={getStatusVariant(profile.subscription.status)} className="w-fit">
              {profile.subscription.plan_name} ({profile.subscription.status})
            </Badge>
            <span className="text-xs text-muted-foreground mt-1">
              Ends: {new Date(profile.subscription.current_period_ends_at).toLocaleDateString()}
            </span>
          </div>
        ) : (
          <Badge variant="outline">No Subscription</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {planOptions.map(plan => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="secondary" onClick={() => handleAction('start_trial')}>Grant 7-Day Trial</Button>
              <Button size="sm" onClick={() => handleAction('start_subscription')}>Activate Paid Sub</Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default function AdminSubscriptionsPage({ profiles, ssrError }: { profiles: Profile[], ssrError?: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = useSupabaseClient();
  const { toast } = useToast();

  // The page now relies on getServerSideProps for data fetching.
  // We can add a refresh function if needed, but the initial client-side fetch is removed.
  const refreshProfiles = () => {
    // This will re-run getServerSideProps
    window.location.reload();
  };

  const filteredProfiles = profiles.filter(p =>
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
          <CardDescription>Manually activate paid subscriptions after Wise payment, or grant free trials.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4 max-w-sm"
          />
          {ssrError ? (
            <div className="text-center py-10 text-red-500">
              <p>Error loading users: {ssrError}</p>
              <Button onClick={refreshProfiles} className="mt-4">Try Again</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Current Subscription</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map(profile => (
                  <UserSubscriptionRow key={profile.id} profile={profile} onUpdate={refreshProfiles} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/auth', permanent: false } };
  }

  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  const isAdmin = profile?.role === 'admin';

  // Deny access unless the user has role='admin' on their profile
  if (profileError || !isAdmin) {
    return { notFound: true };
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { persistSession: false } }
  );

  try {
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;
    const usersMap = new Map(users.map(u => [u.id, u]));

    const { data: profilesData, error: profilesError } = await supabaseAdmin.from('profiles').select('id, full_name');
    if (profilesError) throw profilesError;

    const { data: productsData, error: productsError } = await supabaseAdmin.from('products').select('id, name');
    if (productsError) throw productsError;
    const productsMap = new Map(productsData.map(p => [p.id, p.name]));

    const { data: pricesData, error: pricesError } = await supabaseAdmin.from('prices').select('id, product_id');
    if (pricesError) throw pricesError;
    const pricesMap = new Map(pricesData.map(p => [p.id, productsMap.get(p.product_id) || 'Unknown Plan']));

    const { data: subscriptionsData, error: subscriptionsError } = await supabaseAdmin.from('subscriptions').select('user_id, status, current_period_end, price_id');
    if (subscriptionsError) throw subscriptionsError;
    const subscriptionsMap = new Map(subscriptionsData.map(s => [s.user_id, {
      ...s,
      plan_name: pricesMap.get(s.price_id) || 'Unknown Plan'
    }]));

    const profilesResult: Profile[] = profilesData
      .filter(p => usersMap.has(p.id)) // Ensure profile corresponds to a valid user
      .map(p => {
        const user = usersMap.get(p.id)!;
        const subscription = subscriptionsMap.get(p.id);
        return {
          id: p.id,
          full_name: p.full_name || '',
          email: user.email || '',
          subscription: subscription ? {
            plan_name: subscription.plan_name,
            status: subscription.status,
            current_period_ends_at: subscription.current_period_end,
          } : null,
        };
      });

    return {
      props: {
        profiles: profilesResult,
      },
    };
  } catch (error: any) {
    console.error('Error in getServerSideProps for subscriptions:', error);
    return { props: { profiles: [], ssrError: error.message || 'Internal server error' } };
  }
};