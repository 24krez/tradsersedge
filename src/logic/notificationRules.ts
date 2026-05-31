import type { MissionStatus } from "./missionStatus";

export type NotificationType =
  | "mission_start"
  | "mid_session_checkin"
  | "behavioral_alert"
  | "positive_reinforcement"
  | "mission_complete"
  | "debrief_reminder"
  | "weekly_intelligence_report";

export interface NotificationRuleInput {
  missionId: string;
  sessionName: string;
  missionStatus?: MissionStatus;
  isPro: boolean;
  sessionStartAt: Date;
  sessionEndAt: Date;
  quietHours?: {
    enabled: boolean;
    startHour: number;
    endHour: number;
  };
}

export interface NotificationRule {
  type: NotificationType;
  scheduledAt: Date;
  titleKey: string;
  bodyKey: string;
  data: Record<string, string>;
}

export function buildMissionNotificationRules(input: NotificationRuleInput): NotificationRule[] {
  const rules: NotificationRule[] = [
    rule("mission_start", input.sessionStartAt, "notifications.missionStart.title", "notifications.missionStart.body", input),
    rule(
      "mission_complete",
      input.sessionEndAt,
      "notifications.missionComplete.title",
      "notifications.missionComplete.body",
      input,
    ),
    rule(
      "debrief_reminder",
      addMinutes(input.sessionEndAt, 30),
      "notifications.debriefReminder.title",
      input.isPro ? "notifications.debriefReminder.proBody" : "notifications.debriefReminder.freeBody",
      input,
    ),
  ];

  for (const checkinAt of hourlyCheckins(input.sessionStartAt, input.sessionEndAt)) {
    rules.push(
      rule(
        "mid_session_checkin",
        checkinAt,
        "notifications.midSessionCheckin.title",
        "notifications.midSessionCheckin.body",
        input,
      ),
    );
  }

  if (input.missionStatus === "Caution" || input.missionStatus === "High Risk") {
    rules.push(
      rule(
        "behavioral_alert",
        new Date(),
        `notifications.behavioralAlert.${input.missionStatus === "Caution" ? "caution" : "highRisk"}.title`,
        `notifications.behavioralAlert.${input.missionStatus === "Caution" ? "caution" : "highRisk"}.body`,
        input,
      ),
    );
  }

  if (input.missionStatus === "Locked In") {
    rules.push(
      rule(
        "positive_reinforcement",
        new Date(),
        "notifications.positiveReinforcement.title",
        "notifications.positiveReinforcement.body",
        input,
      ),
    );
  }

  return rules.filter((item) => !isDuringQuietHours(item.scheduledAt, input.quietHours));
}

export function weeklyIntelligenceReportRule(userId: string, scheduledAt: Date): NotificationRule {
  return {
    type: "weekly_intelligence_report",
    scheduledAt,
    titleKey: "notifications.weeklyIntelligenceReport.title",
    bodyKey: "notifications.weeklyIntelligenceReport.body",
    data: { userId },
  };
}

function rule(
  type: NotificationType,
  scheduledAt: Date,
  titleKey: string,
  bodyKey: string,
  input: NotificationRuleInput,
): NotificationRule {
  return {
    type,
    scheduledAt,
    titleKey,
    bodyKey,
    data: {
      missionId: input.missionId,
      sessionName: input.sessionName,
    },
  };
}

function hourlyCheckins(start: Date, end: Date): Date[] {
  const checkins: Date[] = [];
  let next = addMinutes(start, 60);
  while (next < end) {
    checkins.push(next);
    next = addMinutes(next, 60);
  }
  return checkins;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function isDuringQuietHours(
  date: Date,
  quietHours?: NotificationRuleInput["quietHours"],
): boolean {
  if (!quietHours?.enabled) return false;

  const hour = date.getHours();
  if (quietHours.startHour < quietHours.endHour) {
    return hour >= quietHours.startHour && hour < quietHours.endHour;
  }

  return hour >= quietHours.startHour || hour < quietHours.endHour;
}
