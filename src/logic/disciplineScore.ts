export type YesMostlyNo = "Yes" | "Mostly" | "No";
export type Grade =
  | "S"
  | "A+"
  | "A"
  | "A-"
  | "B+"
  | "B"
  | "B-"
  | "C+"
  | "C"
  | "C-"
  | "D+"
  | "D"
  | "D-"
  | "Recovery Required";

export interface MissionScoringContext {
  objective?: string;
  primaryThreat?: string;
  coreFocus?: string;
  hasReadinessCheck?: boolean;
  midSessionCheckinCount?: number;
  sessionDurationMinutes?: number;
  completedAt?: Date;
  debriefCompletedAt?: Date;
}

export interface BaseDebriefInput {
  didTrade: boolean;
  emotionalState: string;
  biggestLesson: string;
  selfAssessment: string;
}

export interface TradedDebriefInput extends BaseDebriefInput {
  didTrade: true;
  followedPlan: YesMostlyNo;
  respectedStop: YesMostlyNo;
  stoppedAppropriately: YesMostlyNo;
  avoidedFomo: YesMostlyNo;
  avoidedRevenge: YesMostlyNo;
  emotionalControlValue: number;
}

export interface NoTradeDebriefInput extends BaseDebriefInput {
  didTrade: false;
  avoidedForcingTrades: YesMostlyNo;
  remainedPatient: YesMostlyNo;
  protectedCapital: YesMostlyNo;
  followedMissionObjective: YesMostlyNo;
}

export type DebriefInput = TradedDebriefInput | NoTradeDebriefInput;
export type DisciplineScoreInput = Partial<BaseDebriefInput> &
  Partial<Omit<TradedDebriefInput, keyof BaseDebriefInput | "didTrade">> &
  Partial<Omit<NoTradeDebriefInput, keyof BaseDebriefInput | "didTrade">> & {
    didTrade: boolean;
  };

export interface ScoreCap {
  type: "numeric" | "grade";
  cap: number | Grade;
  reason: string;
}

export interface DisciplineScoreBreakdown {
  executionIntegrity: number;
  riskDiscipline: number;
  emotionalControl: number;
  missionAdherence: number;
  selfAwareness: number;
}

export interface DisciplineScoreResult {
  score: number;
  grade: Grade;
  breakdown: DisciplineScoreBreakdown;
  executionIntegrity: number;
  riskDiscipline: number;
  emotionalControl: number;
  missionAdherence: number;
  selfAwareness: number;
  rawTotalScore: number;
  finalScore: number;
  gradeBeforeCaps: Grade;
  finalGrade: Grade;
  numericCapsApplied: ScoreCap[];
  gradeCapsApplied: ScoreCap[];
  strongestBehavior: string;
  improvementArea: string;
  explanation: string[];
}

const GRADE_ORDER: Grade[] = [
  "Recovery Required",
  "D-",
  "D",
  "D+",
  "C-",
  "C",
  "C+",
  "B-",
  "B",
  "B+",
  "A-",
  "A",
  "A+",
  "S",
];
const DEFAULT_YES_MOSTLY_NO: YesMostlyNo = "No";

export function calculateDisciplineScore(
  debrief: DisciplineScoreInput,
  mission: MissionScoringContext = {},
): DisciplineScoreResult {
  const normalizedDebrief = normalizeDebrief(debrief);
  const normalizedMission = normalizeMissionContext(mission);

  const executionIntegrity = calculateExecutionIntegrity(normalizedDebrief);
  const riskDiscipline = calculateRiskDiscipline(normalizedDebrief);
  const emotionalControl = calculateEmotionalControl(normalizedDebrief);
  const missionAdherence = calculateMissionAdherence(normalizedDebrief, normalizedMission);
  const selfAwareness = calculateSelfAwareness(normalizedDebrief);

  const rawTotalScore =
    executionIntegrity + riskDiscipline + emotionalControl + missionAdherence + selfAwareness;

  let finalScore = rawTotalScore;
  const numericCapsApplied: ScoreCap[] = [];
  const gradeCapsApplied: ScoreCap[] = [];

  if (isNoTradeMinimumEligible(normalizedDebrief, normalizedMission) && finalScore < 90) {
    finalScore = 90;
  }

  for (const cap of getNumericCaps(normalizedMission)) {
    if (typeof cap.cap === "number" && finalScore > cap.cap) {
      finalScore = cap.cap;
      numericCapsApplied.push(cap);
    }
  }

  finalScore = Math.round(finalScore);

  const gradeBeforeCaps = gradeFromScore(finalScore);
  let finalGrade = gradeBeforeCaps;

  for (const cap of getGradeCaps(normalizedDebrief)) {
    if (typeof cap.cap === "string" && compareGrades(finalGrade, cap.cap) > 0) {
      finalGrade = cap.cap;
      gradeCapsApplied.push(cap);
    }
  }

  const categories = {
    "Execution Integrity": executionIntegrity,
    "Risk Discipline": riskDiscipline,
    "Emotional Control": emotionalControl,
    "Mission Adherence": missionAdherence,
    "Self-Awareness": selfAwareness,
  };
  const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const breakdown = {
    executionIntegrity,
    riskDiscipline,
    emotionalControl,
    missionAdherence,
    selfAwareness,
  };

  return {
    score: finalScore,
    grade: finalGrade,
    breakdown,
    executionIntegrity,
    riskDiscipline,
    emotionalControl,
    missionAdherence,
    selfAwareness,
    rawTotalScore,
    finalScore,
    gradeBeforeCaps,
    finalGrade,
    numericCapsApplied,
    gradeCapsApplied,
    strongestBehavior: sorted[0][0],
    improvementArea: sorted[sorted.length - 1][0],
    explanation: buildExplanation(categories, numericCapsApplied, gradeCapsApplied),
  };
}

function normalizeDebrief(debrief: DisciplineScoreInput): DebriefInput {
  const base = {
    emotionalState: stringOrEmpty(debrief.emotionalState),
    biggestLesson: stringOrEmpty(debrief.biggestLesson),
    selfAssessment: stringOrEmpty(debrief.selfAssessment),
  };

  if (debrief.didTrade) {
    return {
      ...base,
      didTrade: true,
      followedPlan: normalizeYesMostlyNo(debrief.followedPlan),
      respectedStop: normalizeYesMostlyNo(debrief.respectedStop),
      stoppedAppropriately: normalizeYesMostlyNo(debrief.stoppedAppropriately),
      avoidedFomo: normalizeYesMostlyNo(debrief.avoidedFomo),
      avoidedRevenge: normalizeYesMostlyNo(debrief.avoidedRevenge),
      emotionalControlValue: clampScore(debrief.emotionalControlValue),
    };
  }

  return {
    ...base,
    didTrade: false,
    avoidedForcingTrades: normalizeYesMostlyNo(debrief.avoidedForcingTrades),
    remainedPatient: normalizeYesMostlyNo(debrief.remainedPatient),
    protectedCapital: normalizeYesMostlyNo(debrief.protectedCapital),
    followedMissionObjective: normalizeYesMostlyNo(debrief.followedMissionObjective),
  };
}

function normalizeMissionContext(mission: MissionScoringContext): MissionScoringContext {
  return {
    ...mission,
    objective: stringOrUndefined(mission.objective),
    primaryThreat: stringOrUndefined(mission.primaryThreat),
    coreFocus: stringOrUndefined(mission.coreFocus),
  };
}

function calculateExecutionIntegrity(debrief: DebriefInput): number {
  if (debrief.didTrade === false) return yesMostlyNoPoints(debrief.followedMissionObjective, 20, 10);
  return yesMostlyNoPoints(debrief.followedPlan, 20, 10);
}

function calculateRiskDiscipline(debrief: DebriefInput): number {
  if (debrief.didTrade === false) {
    return yesMostlyNoPoints(debrief.protectedCapital, 20, 10);
  }

  const answers = [debrief.respectedStop, debrief.stoppedAppropriately];
  const noCount = answers.filter((answer) => answer === "No").length;
  if (noCount === 2) return 0;
  if (noCount === 1) return 5;
  if (answers.every((answer) => answer === "Yes")) return 20;
  if (answers.includes("Mostly")) return answers.every((answer) => answer === "Mostly") ? 10 : 15;
  return 0;
}

function calculateEmotionalControl(debrief: DebriefInput): number {
  if (debrief.didTrade === false) return yesMostlyNoPoints(debrief.remainedPatient, 20, 10);

  return (
    yesMostlyNoPoints(debrief.avoidedFomo, 8, 4) +
    yesMostlyNoPoints(debrief.avoidedRevenge, 8, 4) +
    emotionalSliderPoints(debrief.emotionalControlValue)
  );
}

function calculateMissionAdherence(debrief: DebriefInput, mission: MissionScoringContext): number {
  if (!mission.objective || !mission.primaryThreat || !mission.coreFocus) return 0;

  if (debrief.didTrade === false) {
    return (
      yesMostlyNoPoints(debrief.followedMissionObjective, 10, 5) +
      yesMostlyNoPoints(debrief.avoidedForcingTrades, 5, 2.5) +
      yesMostlyNoPoints(debrief.remainedPatient, 5, 2.5)
    );
  }

  return (
    yesMostlyNoPoints(debrief.followedPlan, 10, 5) +
    yesMostlyNoPoints(mapThreatAnswer(debrief, mission.primaryThreat), 5, 2.5) +
    coreFocusPoints(debrief, mission.coreFocus)
  );
}

function calculateSelfAwareness(debrief: DebriefInput): number {
  return (
    5 +
    (isMeaningfulText(debrief.biggestLesson) ? 5 : 0) +
    (debrief.emotionalState.trim() ? 5 : 0) +
    (debrief.selfAssessment.trim() ? 5 : 0)
  );
}

function getNumericCaps(mission: MissionScoringContext): ScoreCap[] {
  const caps: ScoreCap[] = [];

  if (mission.completedAt && mission.debriefCompletedAt) {
    const hours =
      (mission.debriefCompletedAt.getTime() - mission.completedAt.getTime()) / (1000 * 60 * 60);
    if (hours > 24) caps.push({ type: "numeric", cap: 95, reason: "Debrief completed after 24 hours." });
  }

  if (mission.hasReadinessCheck === false) {
    caps.push({ type: "numeric", cap: 85, reason: "Mission completed without readiness check." });
  }

  if (
    (mission.sessionDurationMinutes ?? 0) > 90 &&
    (mission.midSessionCheckinCount ?? 0) === 0
  ) {
    caps.push({
      type: "numeric",
      cap: 90,
      reason: "Long session completed without mid-session check-in.",
    });
  }

  return caps.sort((a, b) => Number(a.cap) - Number(b.cap));
}

function getGradeCaps(debrief: DebriefInput): ScoreCap[] {
  if (!debrief.didTrade) return [];

  const caps: ScoreCap[] = [];
  if (debrief.followedPlan === "Mostly") {
    caps.push({ type: "grade", cap: "A-", reason: "Trading plan was only mostly followed." });
  }
  if (debrief.followedPlan === "No") {
    caps.push({ type: "grade", cap: "B", reason: "Trading plan was not followed." });
  }
  if (debrief.respectedStop === "No" || debrief.stoppedAppropriately === "No") {
    caps.push({ type: "grade", cap: "B+", reason: "Risk discipline had a No answer." });
  }
  if (debrief.respectedStop === "No" && debrief.stoppedAppropriately === "No") {
    caps.push({ type: "grade", cap: "C", reason: "Both risk discipline answers were No." });
  }
  if (debrief.avoidedFomo === "No" && debrief.avoidedRevenge === "No") {
    caps.push({ type: "grade", cap: "B", reason: "FOMO and revenge trading were not avoided." });
  }

  return caps.sort((a, b) => compareGrades(String(a.cap) as Grade, String(b.cap) as Grade));
}

function isNoTradeMinimumEligible(debrief: DebriefInput, mission: MissionScoringContext): boolean {
  return (
    debrief.didTrade === false &&
    debrief.avoidedForcingTrades === "Yes" &&
    debrief.protectedCapital === "Yes" &&
    debrief.remainedPatient === "Yes" &&
    isMeaningfulText(debrief.biggestLesson) &&
    Boolean(mission.objective && mission.primaryThreat && mission.coreFocus)
  );
}

function yesMostlyNoPoints(answer: YesMostlyNo, yes: number, mostly: number): number {
  if (answer === "Yes") return yes;
  if (answer === "Mostly") return mostly;
  return 0;
}

function emotionalSliderPoints(value: number): number {
  if (value >= 80) return 4;
  if (value >= 60) return 3;
  if (value >= 40) return 2;
  if (value >= 20) return 1;
  return 0;
}

function mapThreatAnswer(debrief: TradedDebriefInput, threat: string): YesMostlyNo {
  const normalized = threat.toLowerCase();
  if (normalized.includes("fomo") || normalized.includes("early")) return debrief.avoidedFomo;
  if (normalized.includes("revenge")) return debrief.avoidedRevenge;
  if (normalized.includes("stop") || normalized.includes("risk")) return debrief.respectedStop;
  if (normalized.includes("overtrading")) return debrief.stoppedAppropriately;
  return "No";
}

function coreFocusPoints(debrief: TradedDebriefInput, focus: string): number {
  const normalized = focus.toLowerCase();
  if (normalized.includes("patience") || normalized.includes("emotional")) {
    return debrief.emotionalControlValue >= 80 ? 5 : debrief.emotionalControlValue >= 60 ? 2.5 : 0;
  }
  if (normalized.includes("risk")) return yesMostlyNoPoints(debrief.respectedStop, 5, 2.5);
  if (normalized.includes("execution") || normalized.includes("discipline")) {
    return yesMostlyNoPoints(debrief.followedPlan, 5, 2.5);
  }
  return 0;
}

function gradeFromScore(score: number): Grade {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  return "Recovery Required";
}

function compareGrades(a: Grade, b: Grade): number {
  return GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b);
}

function normalizeYesMostlyNo(value: unknown): YesMostlyNo {
  if (value === "Yes" || value === "Mostly" || value === "No") return value;
  return DEFAULT_YES_MOSTLY_NO;
}

function clampScore(value: unknown): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Number(value)));
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function isMeaningfulText(value: string): boolean {
  return value.trim().length >= 12;
}

function buildExplanation(
  categories: Record<string, number>,
  numericCaps: ScoreCap[],
  gradeCaps: ScoreCap[],
): string[] {
  return [
    ...Object.entries(categories).map(([name, points]) => `${name}: ${points}/20`),
    ...numericCaps.map((cap) => `Numeric cap applied: ${cap.reason}`),
    ...gradeCaps.map((cap) => `Grade cap applied: ${cap.reason}`),
  ];
}
