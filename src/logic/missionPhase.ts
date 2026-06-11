/**
 * Mission phase logic for Elite Mission Active experience.
 *
 * Provides types, inference, and coaching copy used by
 * ProMissionBriefing and ProMissionCockpit screens.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MissionPhase = 'briefing' | 'active' | 'completed';

export type CockpitMindsetStatus = 'locked_in' | 'on_track' | 'caution' | 'high_risk';

export type PreTradeChecklist = {
  biasReviewed: boolean;
  levelsMarked: boolean;
  riskDefined: boolean;
  newsChecked: boolean;
  maxLossAccepted: boolean;
  strategyConfirmed: boolean;
};

export const DEFAULT_CHECKLIST: PreTradeChecklist = {
  biasReviewed: false,
  levelsMarked: false,
  riskDefined: false,
  newsChecked: false,
  maxLossAccepted: false,
  strategyConfirmed: false,
};

// ---------------------------------------------------------------------------
// Phase Inference (backward-compatible)
// ---------------------------------------------------------------------------

/**
 * Derives the mission phase from existing document fields.
 * If `missionPhase` is explicitly set, it wins.
 * Otherwise we infer from the legacy `status` field.
 */
export function inferMissionPhase(mission: {
  missionPhase?: MissionPhase;
  status?: string;
}): MissionPhase {
  if (mission.missionPhase) return mission.missionPhase;
  if (mission.status === 'completed') return 'completed';
  if (mission.status === 'active') return 'briefing'; // active but no phase yet → briefing
  return 'briefing'; // pending or unknown
}

// ---------------------------------------------------------------------------
// Coaching Messages
// ---------------------------------------------------------------------------

const COACHING_MESSAGES: Record<CockpitMindsetStatus, string> = {
  locked_in:
    'Locked in. Stay precise. Do not get creative. Execute the plan.',
  on_track:
    'You are on track. Keep following the mission. No forced trades.',
  caution:
    'Caution state detected. Slow down. Re-check your rules before the next trade.',
  high_risk:
    'High risk state. Pause trading. Protect capital first.',
};

export function getCoachingMessage(status: CockpitMindsetStatus): string {
  return COACHING_MESSAGES[status];
}

// ---------------------------------------------------------------------------
// Mindset Mapping
// ---------------------------------------------------------------------------

/**
 * Map the existing display-facing MissionStatus string (e.g. "Locked In")
 * to the Firestore-safe CockpitMindsetStatus enum value.
 */
export function mapMissionStatusToCockpit(
  missionStatus?: string,
): CockpitMindsetStatus {
  if (!missionStatus) return 'on_track';
  const key = missionStatus.toLowerCase().replace(/\s+/g, '_');
  if (key === 'locked_in') return 'locked_in';
  if (key === 'on_track') return 'on_track';
  if (key === 'caution') return 'caution';
  if (key === 'high_risk') return 'high_risk';
  return 'on_track';
}

/**
 * Map a CockpitMindsetStatus back to the display-facing MissionStatus string
 * used by existing UI components and Firestore documents.
 */
export function cockpitStatusToDisplayLabel(
  status: CockpitMindsetStatus,
): string {
  switch (status) {
    case 'locked_in':
      return 'Locked In';
    case 'on_track':
      return 'On Track';
    case 'caution':
      return 'Caution';
    case 'high_risk':
      return 'High Risk';
  }
}

/**
 * Map a cockpit status to the mindset levels stored in mindset_checkins.
 * This keeps Elite cockpit updates compatible with the existing data model.
 */
export function cockpitStatusToLevels(status: CockpitMindsetStatus): {
  confidence: 'Low' | 'Medium' | 'High';
  patience: 'Low' | 'Medium' | 'High';
  focus: 'Low' | 'Medium' | 'High';
} {
  switch (status) {
    case 'locked_in':
      return { confidence: 'High', patience: 'High', focus: 'High' };
    case 'on_track':
      return { confidence: 'High', patience: 'Medium', focus: 'High' };
    case 'caution':
      return { confidence: 'Medium', patience: 'Medium', focus: 'Low' };
    case 'high_risk':
      return { confidence: 'Low', patience: 'Low', focus: 'Low' };
  }
}

// ---------------------------------------------------------------------------
// Behavior Reminders (keyed by objective slug)
// ---------------------------------------------------------------------------

export const BEHAVIOR_REMINDERS: Record<string, string> = {
  protect_capital:
    'Capital preservation is your edge. Never risk more than your pre-defined maximum.',
  consistent_execution:
    'Execute your system rules with precision. No improvisations, no deviations.',
  manage_emotions:
    'Acknowledge what you feel, then act on what you know. Discipline over impulse.',
  follow_the_plan:
    'Trust the plan you created with a clear mind. Mid-session changes are emotional noise.',
  avoid_overtrading:
    'Quality over quantity. One disciplined trade is worth more than five forced entries.',
  improve_entries:
    'Wait for your exact entry criteria. Patience at the trigger saves capital.',
};

export function getBehaviorReminder(objective?: string): string {
  if (!objective) return 'Stay disciplined. Follow your rules.';
  return (
    BEHAVIOR_REMINDERS[objective] || 'Stay disciplined. Follow your rules.'
  );
}

// ---------------------------------------------------------------------------
// Trading Facts (rotated by day)
// ---------------------------------------------------------------------------

const TRADING_FACTS = [
  'A trader risking 1% per trade can survive 20 consecutive losses and still retain over 80% of their capital.',
  'Studies show that traders who journal their decisions outperform those who don\'t by an average of 30%.',
  'The best traders spend 90% of their time waiting and only 10% executing.',
  'Professional fund managers review their risk parameters before every single trading session.',
  'Consistently profitable traders have a pre-session checklist — just like pilots before takeoff.',
  'The most common mistake among retail traders is not having a defined exit strategy before entering a trade.',
  'Trading psychology research shows that losses feel roughly 2.5x more intense than equivalent gains.',
];

export function getTradingFact(): string {
  const dayIndex = new Date().getDate() % TRADING_FACTS.length;
  return TRADING_FACTS[dayIndex];
}
