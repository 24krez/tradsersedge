import { coachMessages } from './coachMessages';
import type { AlertType, CoachEngineInput, CoachMessage, CoachingStyle } from './coachTypes';

const defaultAlertType: AlertType = 'daily_mission';
const defaultCoachingStyle: CoachingStyle = 'tactical';

const alertTitles: Record<AlertType, string> = {
  daily_mission: 'Mission Briefing Ready',
  session_start: 'Trading Window Open',
  mid_session_checkin: 'Status Check',
  caution: 'Caution Detected',
  high_risk: 'High Risk State',
  locked_in: 'Locked In',
  mission_complete: 'Mission Complete',
  debrief_reminder: 'Debrief Reminder',
  widget: 'Mission Active',
  lock_screen: "Trader's Edge",
};

const priorityByAlertType: Record<AlertType, 'low' | 'normal' | 'high'> = {
  daily_mission: 'normal',
  session_start: 'normal',
  mid_session_checkin: 'normal',
  caution: 'high',
  high_risk: 'high',
  locked_in: 'normal',
  mission_complete: 'normal',
  debrief_reminder: 'normal',
  widget: 'low',
  lock_screen: 'low',
};

export function getCoachMessage(input: CoachEngineInput): CoachMessage {
  const alertType = input.alertType ?? defaultAlertType;
  const coachingStyle = input.coachingStyle ?? defaultCoachingStyle;
  const messages =
    coachMessages[coachingStyle]?.[alertType] ??
    coachMessages[defaultCoachingStyle][alertType] ??
    coachMessages[defaultCoachingStyle][defaultAlertType];
  const baseBody = messages?.[0] ?? 'Mission briefing ready. Protect capital and follow the plan.';

  return {
    title: alertTitles[alertType],
    body: personalizeMessage(baseBody, input, alertType),
    tone: coachingStyle,
    alertType,
    priority: priorityByAlertType[alertType],
  };
}

function personalizeMessage(baseBody: string, input: CoachEngineInput, alertType: AlertType): string {
  const addOns: string[] = [];

  if (input.threat && (alertType === 'caution' || alertType === 'high_risk')) {
    addOns.push(`Your threat today is ${input.threat}. Do not let it control the session.`);
  }

  if (input.coreFocus) {
    addOns.push(`Your focus is ${input.coreFocus}. Keep the mission simple.`);
  }

  if (input.lastLesson && (alertType === 'daily_mission' || alertType === 'session_start')) {
    addOns.push(`Remember your last lesson: ${input.lastLesson}`);
  }

  return [baseBody, ...addOns].join(' ');
}
