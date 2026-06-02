export type CoachingStyle = 'tactical' | 'positive';

export type AlertType =
  | 'daily_mission'
  | 'session_start'
  | 'mid_session_checkin'
  | 'caution'
  | 'high_risk'
  | 'locked_in'
  | 'mission_complete'
  | 'debrief_reminder'
  | 'widget'
  | 'lock_screen';

export type MissionStatus =
  | 'briefing'
  | 'active'
  | 'completed'
  | 'on_track'
  | 'caution'
  | 'high_risk'
  | 'locked_in';

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
};

export type CoachMessage = {
  title: string;
  body: string;
  tone: CoachingStyle;
  alertType: AlertType;
  priority: 'low' | 'normal' | 'high';
};
