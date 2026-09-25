import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const supabase = createPagesServerClient({ req, res });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data: githubProfile, error: pErr } = await supabase
      .from('github_profiles')
      .select('token')
      .eq('id', user.id)
      .single();

    if (pErr || !githubProfile?.token) {
      return res.status(400).json({ error: 'GitHub token not found. Please reconnect.' });
    }

    const githubToken = githubProfile.token;

    // Fetch user data from GitHub API using the provider token
    const githubResp = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!githubResp.ok) {
      const body = await githubResp.text();
      console.error('GitHub API error', body);
      return res.status(502).json({ error: 'Failed to query GitHub' });
    }

    const gh = await githubResp.json();
    const { login: username, followers, public_repos } = gh;

    // Upsert the data into the `github_profiles` table
    const { error: upsertError } = await supabase
      .from('github_profiles')
      .upsert({
        id: user.id,
        username,
        followers: followers || 0,
        public_repos: public_repos || 0,
        synced_at: new Date().toISOString(),
      });

    if (upsertError) throw upsertError;

    // After syncing, call the RPC to recalculate the trust score
    const { error: rpcError } = await supabase.rpc('calculate_and_update_trust_score', { profile_id: user.id });
    if (rpcError) throw rpcError;

    return res.status(200).json({ message: `GitHub data for ${username} synced successfully.` });
  } catch (error: any) {
    console.error('API Error in /api/sync-github:', error);
    return res.status(500).json({ error: error.message || 'An internal server error occurred.' });
  }
}