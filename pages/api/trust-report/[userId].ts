import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

type ApiError = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<unknown | ApiError>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;
  if (typeof userId !== 'string') {
    return res.status(400).json({ error: 'A valid userId is required.' });
  }

  const supabase = createPagesServerClient({ req, res });
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  // This endpoint intentionally returns a private dossier, not a public profile.
  if (user.id !== userId) {
    return res.status(403).json({ error: 'You can only view your own Trust Dossier.' });
  }

  try {
    const [
      profileResult,
      githubResult,
      experiencesResult,
      educationResult,
      skillsResult,
      submissionsResult,
      professionalResult,
      historyResult,
    ] = await Promise.all([
      supabase.from('profiles')
        .select('id, username, full_name, avatar_url, bio, headline, trust_score, badge_level, verification_level, created_at, followers_count, following_count, github_username')
        .eq('id', user.id)
        .maybeSingle(),
      // Explicit projection: never return the stored OAuth token.
      supabase.from('github_profiles')
        .select('username, followers, public_repos, synced_at')
        .eq('id', user.id)
        .maybeSingle(),
      supabase.from('experiences')
        .select('id, title, company, start_date, end_date, is_current, description, created_at')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false }),
      supabase.from('education')
        .select('id, school, degree, field_of_study, start_date, end_date, created_at')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false }),
      supabase.from('skills')
        .select('id, name, created_at')
        .eq('user_id', user.id)
        .order('name', { ascending: true }),
      supabase.from('verification_submissions')
        .select('id, verification_type, status, created_at, reviewed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('professional_verifications')
        .select('id, verifier_id, candidate_id, related_entity_id, status, created_at')
        .or(`candidate_id.eq.${user.id},verifier_id.eq.${user.id}`)
        .order('created_at', { ascending: false }),
      supabase.from('score_history')
        .select('delta, reason, created_at, new_score')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (!profileResult.data) return res.status(404).json({ error: 'Profile not found.' });

    const errors = [
      githubResult.error,
      experiencesResult.error,
      educationResult.error,
      skillsResult.error,
      submissionsResult.error,
      professionalResult.error,
      historyResult.error,
    ].filter(Boolean);
    if (errors.length) {
      // Do not silently omit evidence categories from a dossier that claims completeness.
      console.error('Trust Dossier query failed for one or more evidence sources.');
      return res.status(500).json({ error: 'Could not load all Trust Dossier evidence.' });
    }

    const github = githubResult.data;
    const followers = Math.max(0, Number(github?.followers ?? 0));
    const publicRepos = Math.max(0, Number(github?.public_repos ?? 0));
    const calculatedScore = Math.min(1000, 200 + Math.round(followers * 0.2 + publicRepos));

    return res.status(200).json({
      profile: profileResult.data,
      github,
      experiences: experiencesResult.data ?? [],
      education: educationResult.data ?? [],
      skills: skillsResult.data ?? [],
      verificationSubmissions: submissionsResult.data ?? [],
      professionalVerifications: professionalResult.data ?? [],
      scoreHistory: historyResult.data ?? [],
      scoreExplanation: {
        storedScore: profileResult.data.trust_score ?? null,
        scoreFromCurrentInputs: calculatedScore,
        maxScore: 1000,
        formula: '200 baseline + 0.2 × connected GitHub followers + connected GitHub public repositories, capped at 1000',
        isStale: profileResult.data.trust_score != null
          && Number(profileResult.data.trust_score) !== calculatedScore,
      },
    });
  } catch {
    console.error('Trust Dossier request failed.');
    return res.status(500).json({ error: 'Unable to load Trust Dossier.' });
  }
}
