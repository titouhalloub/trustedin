import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // ✅ Create Supabase admin client using SERVICE ROLE KEY
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Make sure this is added in your .env (ONLY used in API routes, NEVER on frontend)
  );

  // ✅ Query Supabase Auth directly
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) return res.status(500).json({ error: error.message });

  const exists = users.users.some((u) => u.email?.toLowerCase() === email.toLowerCase());

  return res.status(200).json({ exists });
}
