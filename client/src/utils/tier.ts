/**
 * ELO → Tier mapping. Mirrors the RankBadge tier set so the leaderboard,
 * profile, and badge display stay in lockstep.
 */
export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

const ORDERED_TIERS: { tier: Tier; min: number }[] = [
  { tier: 'Diamond',  min: 1800 },
  { tier: 'Platinum', min: 1650 },
  { tier: 'Gold',     min: 1500 },
  { tier: 'Silver',   min: 1300 },
  { tier: 'Bronze',   min: 0    },
];

export function eloToTier(rating: number): Tier {
  for (const { tier, min } of ORDERED_TIERS) {
    if (rating >= min) return tier;
  }
  return 'Bronze';
}

export const TIER_ORDER: Tier[] = ['Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze'];
