import { coachMessages } from './coachMessages';
import type {
  AlertType,
  CoachEngineInput,
  CoachMessage,
  CoachMessageState,
  CoachingStyle,
  ScreenContext,
} from './coachTypes';

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
  mission_results: 'Intelligence Report',
  debrief_reminder: 'Debrief Reminder',
  widget: 'Mission Active',
  lock_screen: "Trader's Edge",
  missionReflection: 'Mission Reflection',
};

const priorityByAlertType: Record<AlertType, 'low' | 'normal' | 'high'> = {
  daily_mission: 'normal',
  session_start: 'normal',
  mid_session_checkin: 'normal',
  caution: 'high',
  high_risk: 'high',
  locked_in: 'normal',
  mission_complete: 'normal',
  mission_results: 'normal',
  debrief_reminder: 'normal',
  widget: 'low',
  lock_screen: 'low',
  missionReflection: 'low',
};

// ── Module-level current message state ──
let _currentCoachMessage: CoachMessageState | null = null;

export function getCurrentCoachMessage(): CoachMessageState | null {
  return _currentCoachMessage;
}

export function setCurrentCoachMessage(message: CoachMessageState): void {
  _currentCoachMessage = message;
}

// ── Original getCoachMessage (deterministic, always first) ──
export function getCoachMessage(input: CoachEngineInput): CoachMessage {
  const alertType = input.alertType ?? defaultAlertType;
  const coachingStyle = input.coachingStyle ?? defaultCoachingStyle;
  const messages =
    coachMessages[coachingStyle]?.[alertType] ??
    coachMessages[defaultCoachingStyle][alertType] ??
    coachMessages[defaultCoachingStyle][defaultAlertType];
  const baseBody = alertType === 'missionReflection'
    ? selectMissionReflectionMessage(messages, input)
    : messages?.[0] ?? 'Mission briefing ready. Protect capital and follow the plan.';

  return {
    title: alertTitles[alertType],
    body: personalizeMessage(baseBody, input, alertType),
    tone: coachingStyle,
    alertType,
    priority: priorityByAlertType[alertType],
  };
}

// ── New: Random message selection for rotation ──
export function getRandomCoachMessage(input: CoachEngineInput): CoachMessage {
  const alertType = input.alertType ?? defaultAlertType;
  const coachingStyle = input.coachingStyle ?? defaultCoachingStyle;
  const messages =
    coachMessages[coachingStyle]?.[alertType] ??
    coachMessages[defaultCoachingStyle][alertType] ??
    coachMessages[defaultCoachingStyle][defaultAlertType];

  const pool = messages ?? ['Mission briefing ready. Protect capital and follow the plan.'];
  const index = Math.floor(Math.random() * pool.length);
  const baseBody = alertType === 'missionReflection'
    ? selectMissionReflectionMessage(messages, input)
    : pool[index];

  return {
    title: alertTitles[alertType],
    body: personalizeMessage(baseBody, input, alertType),
    tone: coachingStyle,
    alertType,
    priority: priorityByAlertType[alertType],
  };
}

// ── Build a CoachMessageState from a CoachMessage ──
export function buildCoachMessageState(
  msg: CoachMessage,
  screenContext: ScreenContext,
  missionId?: string,
): CoachMessageState {
  return {
    text: msg.body,
    title: msg.title,
    style: msg.tone,
    category: msg.alertType,
    screenContext,
    missionId,
    updatedAt: Date.now(),
  };
}

// ── Resolve which alert type to use given a screen context ──
export function alertTypeForContext(
  screenContext: ScreenContext,
  missionStatus?: string,
): AlertType {
  switch (screenContext) {
    case 'before_trading':
      return 'session_start';
    case 'during_trading':
      if (missionStatus === 'high_risk') return 'high_risk';
      if (missionStatus === 'caution') return 'caution';
      if (missionStatus === 'locked_in') return 'locked_in';
      return 'mid_session_checkin';
    case 'risk_state':
      if (missionStatus === 'high_risk') return 'high_risk';
      return 'caution';
    case 'post_session':
      return 'mission_complete';
    case 'mission_results':
      return 'mission_results';
    case 'lock_screen':
      return 'lock_screen';
    case 'widget':
      return 'widget';
    case 'vault_reflection':
      return 'missionReflection';
    case 'idle':
    default:
      return 'daily_mission';
  }
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

function selectMissionReflectionMessage(messages: string[] | undefined, input: CoachEngineInput): string {
  const pool = messages ?? coachMessages[defaultCoachingStyle].missionReflection ?? [];
  const objective = normalize(input.objective);
  const threat = normalize(input.threat);
  const coreFocus = normalize(input.coreFocus);
  const missionStatus = normalize(input.missionStatus);
  const grade = normalize(input.grade);
  const score = typeof input.disciplineScore === 'number' ? input.disciplineScore : null;
  const hasDebrief = input.hasDebrief !== false;

  const target =
    !hasDebrief ? 'without a debrief'
    : score !== null && score >= 85 ? 'discipline score'
    : score !== null && score < 70 ? 'grade leaves room'
    : grade.includes('recovery') || grade === 'c' ? 'grade leaves room'
    : objective.includes('protect') ? 'capital-first'
    : objective.includes('challenge') || objective.includes('pass') ? 'challenge mission'
    : coreFocus.includes('risk') ? 'risk control'
    : coreFocus.includes('patience') ? 'patience'
    : threat.includes('fomo') ? 'fomo'
    : threat.includes('revenge') ? 'revenge trading'
    : threat.includes('moving') || threat.includes('stop') ? 'moving stops'
    : missionStatus.includes('high') ? 'high risk'
    : missionStatus.includes('caution') ? 'caution'
    : missionStatus.includes('track') || missionStatus.includes('locked') ? 'on track'
    : 'completed mission';

  return pool.find((message) => normalize(message).includes(target)) ?? pool[0] ?? 'This completed mission adds another data point to the archive.';
}

function normalize(value: unknown): string {
  return typeof value === 'string'
    ? value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase()
    : '';
}
