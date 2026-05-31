export type MindsetLevel = "Low" | "Medium" | "High";
export type MissionStatus = "On Track" | "Caution" | "High Risk" | "Locked In";

export interface MindsetCheckin {
  confidence: MindsetLevel;
  patience: MindsetLevel;
  focus: MindsetLevel;
}

export interface MissionStatusResult {
  status: MissionStatus;
  score: number;
  message: string;
}

const LEVEL_VALUES: Record<MindsetLevel, number> = {
  Low: 30,
  Medium: 65,
  High: 90,
};

export function calculateMissionStatus(
  current: MindsetCheckin,
  previous?: MindsetCheckin,
): MissionStatusResult {
  const values = [current.confidence, current.patience, current.focus];
  const lowCount = values.filter((value) => value === "Low").length;
  const allHigh = values.every((value) => value === "High");
  const previousAllHigh =
    previous && [previous.confidence, previous.patience, previous.focus].every((value) => value === "High");

  if (lowCount >= 2) {
    return result("High Risk", current, "Slow down. Protect capital.");
  }

  if (allHigh && previousAllHigh) {
    return result("Locked In", current, "Patience maintained. Mission on track.");
  }

  if (lowCount === 1) {
    return result("Caution", current, "One discipline metric is low. Review your mission.");
  }

  return result("On Track", current, "Mission is stable. Keep executing the plan.");
}

export function mindsetLevelValue(level: MindsetLevel): number {
  return LEVEL_VALUES[level];
}

function result(status: MissionStatus, checkin: MindsetCheckin, message: string): MissionStatusResult {
  const score = Math.round(
    (LEVEL_VALUES[checkin.confidence] + LEVEL_VALUES[checkin.patience] + LEVEL_VALUES[checkin.focus]) / 3,
  );

  return { status, score, message };
}
