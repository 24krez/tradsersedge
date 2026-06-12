import type { CoachingStyle } from '../features/coaching/coachTypes';

export type MissionSummary = {
  missionId: string;
  userId?: string;
  debriefId?: string;
  status: 'completed';
  objective?: string;
  coreFocus?: string;
  session?: string;
  threats: string[];
  primaryThreat?: string | null;
  createdAt?: unknown;
  completedAt?: unknown;
  tradeStatus?: 'traded' | 'no_trade';
  missionStatus?: string;
  readiness?: {
    missionStatus?: string;
    currentMindsetStatus?: string;
    score?: number;
  };
  discipline?: {
    score?: number;
    grade?: string;
    strongestBehavior?: string;
    improvementArea?: string;
  };
  coachMessage?: unknown;
  coachingStyle?: CoachingStyle | null;
  missionReflection?: unknown;
  currentRank?: string;
  rankProgress?: number;
  currentStreak?: number;
};

export function buildMissionSummary({
  completedAt,
  debriefId,
  discipline,
  mission,
  tradeStatus,
  currentRank,
  rankProgress,
  currentStreak,
}: {
  completedAt?: unknown;
  debriefId?: string;
  discipline?: {
    score?: number;
    grade?: string;
    strongestBehavior?: string;
    improvementArea?: string;
  };
  mission: any;
  tradeStatus?: 'traded' | 'no_trade';
  currentRank?: string;
  rankProgress?: number;
  currentStreak?: number;
}): MissionSummary {
  const threats = Array.isArray(mission?.threats) ? mission.threats : [];

  return stripUndefined({
    missionId: mission?.id,
    userId: mission?.userId,
    debriefId,
    status: 'completed',
    objective: mission?.objective,
    coreFocus: mission?.coreFocus,
    session: mission?.session,
    threats,
    primaryThreat: threats[0] || null,
    createdAt: mission?.createdAt,
    completedAt,
    tradeStatus,
    missionStatus: mission?.missionStatus,
    readiness: {
      missionStatus: mission?.missionStatus,
      currentMindsetStatus: mission?.currentMindsetStatus,
      score: mission?.readinessScore ?? mission?.lastMindsetScore ?? mission?.readinessCheck?.score,
    },
    discipline: discipline
      ? {
          score: discipline.score,
          grade: discipline.grade,
          strongestBehavior: discipline.strongestBehavior,
          improvementArea: discipline.improvementArea,
        }
      : undefined,
    coachMessage: mission?.coachMessage || null,
    coachingStyle: mission?.coachingStyle || null,
    currentRank,
    rankProgress,
    currentStreak,
  }) as MissionSummary;
}

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUndefined);
  }

  if (!value || typeof value !== 'object' || !isPlainObject(value)) {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>((result, [key, entry]) => {
    if (entry !== undefined) {
      result[key] = stripUndefined(entry);
    }
    return result;
  }, {});
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
