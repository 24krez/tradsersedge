export const RANK_BADGES: Record<string, any> = {
  "Recruit": require('../../assets/images/TE_Recruit_Badge.png'),
  "Operator": require('../../assets/images/TE_Operator_Badge.png'),
  "Senior Operator": require('../../assets/images/TE_SeniorOperator_Badge.png'),
  "Elite Operator": require('../../assets/images/TE_EliteOperator_Badge.png'),
  "Special Agent": require('../../assets/images/TE_SpecAgent_Badge.png'),
  "Director": require('../../assets/images/TE_Director_Badge.png'),
};

export function getRankBadge(rankName: string) {
  // Try exact match first
  if (RANK_BADGES[rankName]) {
    return RANK_BADGES[rankName];
  }
  
  // Try case-insensitive matching
  const normalizedRank = rankName.toLowerCase();
  for (const [key, image] of Object.entries(RANK_BADGES)) {
    if (key.toLowerCase() === normalizedRank) {
      return image;
    }
  }

  // Fallback to Recruit if unknown
  return RANK_BADGES["Recruit"];
}
