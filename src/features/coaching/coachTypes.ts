export type CoachingStyle = 'tactical' | 'positive';

export type AlertType =
  | 'daily_mission'
  | 'session_start'
  | 'mid_session_checkin'
  | 'caution'
  | 'high_risk'
  | 'locked_in'
  | 'mission_complete'
  | 'mission_results'
  | 'debrief_reminder'
  | 'widget'
  | 'lock_screen'
  | 'missionReflection';

export type MissionStatus =
  | 'briefing'
  | 'active'
  | 'completed'
  | 'on_track'
  | 'caution'
  | 'high_risk'
  | 'locked_in';

export type ScreenContext =
  | 'before_trading'
  | 'during_trading'
  | 'risk_state'
  | 'post_session'
  | 'mission_results'
  | 'lock_screen'
  | 'widget'
  | 'vault_reflection'
  | 'idle';

export type CoachEngineInput = {
  alertType?: AlertType;
  coachingStyle?: CoachingStyle;
  missionStatus?: MissionStatus;
  objective?: string;
  threat?: string;
  coreFocus?: string;
  lastLesson?: string;
  disciplineScore?: number;
  grade?: string;
  hasDebrief?: boolean;
  screenContext?: ScreenContext;
};

export type CoachMessage = {
  title: string;
  body: string;
  tone: CoachingStyle;
  alertType: AlertType;
  priority: 'low' | 'normal' | 'high';
};

export type CoachMessageState = {
  text: string;
  title: string;
  style: CoachingStyle;
  category: AlertType;
  screenContext: ScreenContext;
  missionId?: string;
  updatedAt: number;
};

/** Display labels for coaching styles */
export const COACHING_STYLE_LABELS: Record<CoachingStyle, string> = {
  tactical: 'CALM OPERATOR',
  positive: 'HYPE COACH',
};
