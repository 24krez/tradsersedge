export type BehavioralClassification =
  | "Discipline First Trader"
  | "Capital Preserver"
  | "Patience Specialist"
  | "Risk Controller"
  | "Execution Focused"
  | "Consistency Builder"
  | "Recovery Operator"
  | "Caution Profile";

export interface BehavioralStats {
  averageDisciplineScore: number;
  missionCompletionRate: number;
  riskDisciplineAverage: number;
  avoidedFomoAverage: number;
  executionIntegrityAverage: number;
  currentStreak: number;
  lastFiveScoreImprovement: number;
  fomoOrRevengeCountLastTen: number;
  highestScoringCategory: "executionIntegrity" | "riskDiscipline" | "emotionalControl" | "missionAdherence" | "selfAwareness";
}

export interface BehavioralClassificationResult {
  classification: BehavioralClassification;
  reason: string;
}

export function classifyBehavior(stats: BehavioralStats): BehavioralClassificationResult {
  if (stats.averageDisciplineScore >= 85 && stats.missionCompletionRate >= 0.8) {
    return {
      classification: "Discipline First Trader",
      reason: "Average discipline score is at least 85 and mission completion rate is at least 80%.",
    };
  }

  if (stats.riskDisciplineAverage >= 90) {
    return { classification: "Capital Preserver", reason: "Risk discipline average is at least 90." };
  }

  if (stats.avoidedFomoAverage >= 90) {
    return { classification: "Patience Specialist", reason: "Avoided FOMO average is at least 90." };
  }

  if (stats.highestScoringCategory === "riskDiscipline") {
    return { classification: "Risk Controller", reason: "Risk discipline is the highest scoring category." };
  }

  if (stats.executionIntegrityAverage >= 90) {
    return { classification: "Execution Focused", reason: "Execution integrity average is at least 90." };
  }

  if (stats.currentStreak >= 14) {
    return { classification: "Consistency Builder", reason: "Current streak is at least 14 days." };
  }

  if (stats.lastFiveScoreImprovement >= 10) {
    return {
      classification: "Recovery Operator",
      reason: "Last five mission scores improved by at least 10 total points.",
    };
  }

  return {
    classification: "Caution Profile",
    reason:
      stats.averageDisciplineScore < 70 || stats.fomoOrRevengeCountLastTen >= 5
        ? "Recent missions show elevated discipline risk."
        : "No higher-priority classification matched yet.",
  };
}
