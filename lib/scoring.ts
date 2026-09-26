import { SupabaseClient } from '@supabase/supabase-js';

// --- Constants for Weights ---
const WEIGHTS = {
  IDENTITY: 0.30,
  NETWORK: 0.25,
  ENGAGEMENT: 0.20,
  CONTENT: 0.15,
  ACTIVITY: 0.10,
};

const MAX_SCORE = 1000;

// --- Badge Mapping ---
export function getBadgeForScore(score: number): string {
  if (score >= 800) return 'Authority';
  if (score >= 600) return 'Highly Trusted';
  if (score >= 400) return 'Trusted';
  if (score >= 200) return 'Contributor';
  return 'Newcomer';
}

/**
 * Calculates the score contribution from identity verification.
 * @param profile - The user's profile object.
 * @returns A score between 0 and MAX_SCORE.
 */
async function calculateIdentityScore(profile: any): Promise<number> {
  let score = 0;
  if (profile.is_email_verified) score += 100;
  if (profile.is_phone_verified) score += 150;
  if (profile.is_linkedin_connected) score += 350;
  if (profile.is_kyc_verified) score += 400; // KYC is a strong signal
  return Math.min(score, MAX_SCORE);
}

/**
 * Calculates the score contribution from network and endorsements.
 * (Simplified for V1)
 * @param userId - The ID of the user.
 * @param supabase - The Supabase client.
 * @returns A score between 0 and MAX_SCORE.
 */
async function calculateNetworkScore(userId: string, supabase: SupabaseClient): Promise<number> {
  // V1: Simple count of followers and endorsements given/received.
  const { count: followersCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);

  const { count: endorsementsGiven } = await supabase
    .from('endorsements')
    .select('*', { count: 'exact', head: true })
    .eq('endorser_id', userId);

  // More points for followers, encouraging network growth.
  let score = (followersCount || 0) * 5 + (endorsementsGiven || 0) * 2;
  
  // Logarithmic scaling to provide diminishing returns
  return Math.min(150 * Math.log1p(score), MAX_SCORE);
}

/**
 * Calculates the score contribution from activity and consistency.
 * (Simplified for V1 - focuses on inactivity decay)
 * @param profile - The user's profile object.
 * @returns A score adjustment (can be negative).
 */
async function calculateActivityScore(profile: any): Promise<number> {
    const lastSignIn = profile.last_sign_in_at ? new Date(profile.last_sign_in_at) : new Date();
    const now = new Date();
    const daysInactive = (now.getTime() - lastSignIn.getTime()) / (1000 * 3600 * 24);

    // Decay starts after 14 days of inactivity
    if (daysInactive > 14) {
        const decay = Math.floor(daysInactive - 14) * 2; // Lose 2 points per day after 2 weeks
        return -decay;
    }
    
    // Small bonus for recent activity
    if (daysInactive < 2) {
        return 10;
    }

    return 0;
}

/**
 * The main service function to calculate a user's total trust score.
 * @param userId - The ID of the user to score.
 * @param supabase - The Supabase client.
 */
export async function calculateUserScore(userId: string, supabase: SupabaseClient) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.error(`Scoring failed: Could not fetch profile for user ${userId}`);
    return;
  }

  // --- Calculate scores for each category ---
  // For simplicity, other categories are stubbed for now.
  const identityScore = await calculateIdentityScore(profile);
  const networkScore = await calculateNetworkScore(userId, supabase);
  const activityAdjustment = await calculateActivityScore(profile);

  // --- Combine scores with weights ---
  let totalScore = 0;
  totalScore += identityScore * WEIGHTS.IDENTITY;
  totalScore += networkScore * WEIGHTS.NETWORK;
  // Engagement, Content, and Activity are more complex and will be added in future iterations.
  // For now, we'll just apply the activity adjustment.
  
  let finalScore = Math.round(totalScore) + activityAdjustment;

  // Clamp the score between 0 and 1000
  finalScore = Math.max(0, Math.min(finalScore, MAX_SCORE));

  const oldScore = profile.trust_score || 0;
  const delta = finalScore - oldScore;
  const newBadge = getBadgeForScore(finalScore);

  // --- Update the database ---
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ trust_score: finalScore, badge_level: newBadge })
    .eq('id', userId);

  if (updateError) {
    console.error(`Scoring failed: Could not update profile for user ${userId}`, updateError);
    return;
  }

  // --- Record the change in history ---
  if (delta !== 0) {
    const { error: historyError } = await supabase.from('score_history').insert({
      user_id: userId,
      reason: delta > 0 ? 'identity_verification' : 'inactivity_decay', // Simplified reason for V1
      delta: delta,
      new_score: finalScore,
    });

    if (historyError) {
      console.error(`Scoring failed: Could not write to score_history for user ${userId}`, historyError);
    }
  }

  console.log(`Score for user ${userId} updated to ${finalScore} (Badge: ${newBadge})`);
}