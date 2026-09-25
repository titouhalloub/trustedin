export interface ScoreBreakdown {
  linkedin: number;
  github: number;
  activity: number;
  endorsements: number;
}

export const mockScoreBreakdown: ScoreBreakdown = {
  linkedin: 90,
  github: 80,
  activity: 75,
  endorsements: 92,
};

type TrustTier = 'bronze' | 'silver' | 'gold' | 'platinum';

interface TrustData {
  overall: number;
  tier: TrustTier;
  breakdown: ScoreBreakdown;
}

export const getTrustScoreData = (scores: ScoreBreakdown): TrustData => {
  const { linkedin, github, activity, endorsements } = scores;
  
  // Example weighting
  const overall = Math.round(
    linkedin * 0.3 +
    github * 0.2 +
    activity * 0.25 +
    endorsements * 0.25
  );

  let tier: TrustTier = 'bronze';
  if (overall >= 90) tier = 'platinum';
  else if (overall >= 80) tier = 'gold';
  else if (overall >= 60) tier = 'silver';

  return { overall, tier, breakdown: scores };
};