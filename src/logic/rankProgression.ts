export type OperatorRank =
  | "Recruit"
  | "Operator"
  | "Senior Operator"
  | "Elite Operator"
  | "Special Agent"
  | "Director";

export interface RankInput {
  averageDisciplineScore: number;
  completedMissions: number;
  currentStreak: number;
}

export interface RankProgressionResult {
  currentRank: OperatorRank;
  nextRank: OperatorRank | null;
  progressPercentage: number;
  requirementsRemaining: string[];
}

interface RankRequirement {
  rank: OperatorRank;
  minAverageScore: number;
  minCompletedMissions: number;
  minCurrentStreak: number;
}

const RANKS: RankRequirement[] = [
  { rank: "Recruit", minAverageScore: 0, minCompletedMissions: 0, minCurrentStreak: 0 },
  { rank: "Operator", minAverageScore: 60, minCompletedMissions: 3, minCurrentStreak: 0 },
  { rank: "Senior Operator", minAverageScore: 75, minCompletedMissions: 7, minCurrentStreak: 0 },
  { rank: "Elite Operator", minAverageScore: 85, minCompletedMissions: 14, minCurrentStreak: 0 },
  { rank: "Special Agent", minAverageScore: 90, minCompletedMissions: 25, minCurrentStreak: 5 },
  { rank: "Director", minAverageScore: 95, minCompletedMissions: 50, minCurrentStreak: 10 },
];

export function calculateRankProgression(input: RankInput): RankProgressionResult {
  const currentIndex = RANKS.reduce((bestIndex, requirement, index) => {
    return meetsRequirement(input, requirement) ? index : bestIndex;
  }, 0);

  const currentRank = RANKS[currentIndex].rank;
  const next = RANKS[currentIndex + 1] ?? null;

  if (!next) {
    return {
      currentRank,
      nextRank: null,
      progressPercentage: 100,
      requirementsRemaining: [],
    };
  }

  return {
    currentRank,
    nextRank: next.rank,
    progressPercentage: calculateProgress(input, next),
    requirementsRemaining: requirementsRemaining(input, next),
  };
}

function meetsRequirement(input: RankInput, requirement: RankRequirement): boolean {
  return (
    input.averageDisciplineScore >= requirement.minAverageScore &&
    input.completedMissions >= requirement.minCompletedMissions &&
    input.currentStreak >= requirement.minCurrentStreak
  );
}

function calculateProgress(input: RankInput, requirement: RankRequirement): number {
  const scoreProgress = ratio(input.averageDisciplineScore, requirement.minAverageScore || 1);
  const missionProgress = ratio(input.completedMissions, requirement.minCompletedMissions || 1);
  const streakProgress = ratio(input.currentStreak, requirement.minCurrentStreak || 1);
  return Math.round(Math.min(1, (scoreProgress + missionProgress + streakProgress) / 3) * 100);
}

function requirementsRemaining(input: RankInput, requirement: RankRequirement): string[] {
  const remaining: string[] = [];
  if (input.averageDisciplineScore < requirement.minAverageScore) {
    remaining.push(`${Math.ceil(requirement.minAverageScore - input.averageDisciplineScore)} average score points`);
  }
  if (input.completedMissions < requirement.minCompletedMissions) {
    remaining.push(`${requirement.minCompletedMissions - input.completedMissions} completed missions`);
  }
  if (input.currentStreak < requirement.minCurrentStreak) {
    remaining.push(`${requirement.minCurrentStreak - input.currentStreak} streak days`);
  }
  return remaining;
}

function ratio(value: number, required: number): number {
  if (required <= 0) return 1;
  return Math.min(1, value / required);
}
