import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = createServerSupabaseClient({ req, res });

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Check if the user is an admin or the super admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  const isSuperAdmin = session.user.email === process.env.SUPER_ADMIN_EMAIL;
  const isAdmin = profile?.role === 'admin';

  if (profileError || (!isAdmin && !isSuperAdmin)) {
    return res.status(403).json({ error: 'Forbidden: User is not an admin' });
  }

  // For admin actions, we need to create a new client with the service_role key.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { persistSession: false } }
  );

  try {
    // 1. Get all users (for emails)
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;
    const usersMap = new Map(users.map(u => [u.id, u]));

    // 2. Get all profiles
    const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('id, full_name');
    if (profilesError) throw profilesError;

    // 3. Get all products
    const { data: productsData, error: productsError } = await supabase.from('products').select('id, name');
    if (productsError) throw productsError;
    const productsMap = new Map(productsData.map(p => [p.id, p.name]));

    // 4. Get all prices
    const { data: pricesData, error: pricesError } = await supabase.from('prices').select('id, product_id');
    if (pricesError) throw pricesError;
    const pricesMap = new Map(pricesData.map(p => [p.id, productsMap.get(p.product_id) || 'Unknown Plan']));

    // 5. Get all subscriptions
    const { data: subscriptionsData, error: subscriptionsError } = await supabase.from('subscriptions').select('user_id, status, current_period_end, price_id');
    if (subscriptionsError) throw subscriptionsError;
    const subscriptionsMap = new Map(subscriptionsData.map(s => [s.user_id, {
      ...s,
      plan_name: pricesMap.get(s.price_id) || 'Unknown Plan'
    }]));

    // 6. Join and return
    const result = profilesData.map(p => {
      const user = usersMap.get(p.id);
      const subscription = subscriptionsMap.get(p.id);
      return {
        id: p.id,
        full_name: p.full_name,
        email: user ? user.email : '',
        subscription: subscription ? {
          plan_name: subscription.plan_name,
          status: subscription.status,
          current_period_ends_at: subscription.current_period_end,
        } : null,
      };
    });

    res.status(200).json(result);

  } catch (error: any) {
    console.error('Error in /api/admin/subscriptions:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}