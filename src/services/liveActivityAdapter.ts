import { Platform } from 'react-native';

import { getTimeRemaining, TradingSession } from '../logic/sessionEngine';

let lastKnownMissionId: string | null = null;
let lastKnownStatus: MissionLiveActivityResult['status'] = 'ended';

export type MissionLiveActivityStatus =
  | 'active'
  | 'updated'
  | 'ended'
  | 'unsupported'
  | 'dev_build_required'
  | 'not_available_on_device'
  | 'error';

export type MissionLiveActivityResult = {
  status: MissionLiveActivityStatus;
  message?: string;
  error?: string;
};

export type MissionActivityState = {
  missionId: string;
  objective: string;
  currentFocus: string;
  primaryThreat: string;
  status: 'on_track' | 'caution' | 'high_risk' | 'locked_in';
  threatsIdentified: number;
  timeRemaining: string;
  sessionLabel: string;
  sessionRemainingPercent: number;
  coachingMessage: string;
};

export type MissionLiveActivityMission = {
  id?: string;
  missionId?: string;
  objective?: string;
  threats?: string[];
  selectedThreats?: string[];
  primaryThreat?: string;
  threat?: string;
  coreFocus?: string;
  status?: string;
  missionStatus?: string;
  currentMindsetStatus?: string;
  session?: TradingSession | string;
  sessionRemainingPercent?: number;
  threatsIdentified?: number;
  timeRemaining?: string;
  currentCoachingMessage?: string;
  coachingStyle?: string;
};

const SESSION_LABELS: Partial<Record<TradingSession, string>> = {
  new_york: 'NY Session',
  london: 'London Session',
  asia: 'Asia Session',
  custom: 'Custom Session',
};

const FOCUS_LABELS: Record<string, string> = {
  patience: 'Patience',
  discipline: 'Discipline',
  riskControl: 'Risk Control',
  execution: 'Execution',
  confidence: 'Confidence',
  consistency: 'Consistency',
};

const OBJECTIVE_LABELS: Record<string, string> = {
  protectCapital: 'Protect Capital',
  passChallenge: 'Pass Challenge',
  onlyASetups: 'Take Only A+ Setups',
  observationMode: 'Observation Mode',
};

const THREAT_LABELS: Record<string, string> = {
  fomo: 'FOMO',
  overtrading: 'Overtrading',
  revengeTrading: 'Revenge Trading',
  movingStops: 'Moving Stops',
  enteringEarly: 'Entering Early',
  chasingBreakouts: 'Chasing Breakouts',
  lackOfPatience: 'Lack of Patience',
  overLeverage: 'Over-Leverage',
};

function labelize(value?: string): string {
  if (!value) return '';
  return value
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusResult(
  status: MissionLiveActivityStatus,
  message?: string,
  error?: unknown,
): MissionLiveActivityResult {
  return {
    status,
    message,
    error: error instanceof Error ? error.message : typeof error === 'string' ? error : undefined,
  };
}

function unsupportedResult(): MissionLiveActivityResult {
  return statusResult('unsupported', 'Live Activities are not supported on this platform.');
}

function buildMissionActivityState(mission: MissionLiveActivityMission): MissionActivityState {
  const missionId = mission.missionId || mission.id || 'unknown';
  const rawObjective = mission.objective || mission.coreFocus || '';
  const objective = OBJECTIVE_LABELS[rawObjective] || labelize(rawObjective) || 'Active Mission';
  const currentFocus = FOCUS_LABELS[mission.coreFocus || ''] || labelize(mission.coreFocus) || 'Mission Discipline';
  const rawThreat = mission.primaryThreat || mission.threat || mission.selectedThreats?.[0] || mission.threats?.[0] || '';
  const primaryThreat = THREAT_LABELS[rawThreat] || labelize(rawThreat) || 'No Threats';

  // Resolve the status from various possible fields
  const rawStatus = mission.currentMindsetStatus || mission.missionStatus || mission.status || 'on_track';
  const validStatuses = ['on_track', 'caution', 'high_risk', 'locked_in'] as const;
  const status = (validStatuses as readonly string[]).includes(rawStatus)
    ? (rawStatus as MissionActivityState['status'])
    : 'on_track';

  // Count threats
  const threatsIdentified =
    mission.threatsIdentified ??
    mission.selectedThreats?.length ??
    mission.threats?.length ??
    0;

  // Resolve time remaining
  let timeRemaining = mission.timeRemaining || '';
  if (!timeRemaining && mission.session && typeof mission.session === 'string') {
    const validSessions: TradingSession[] = ['new_york', 'london', 'asia', 'custom'];
    if (validSessions.includes(mission.session as TradingSession)) {
      const remaining = getTimeRemaining(mission.session as TradingSession);
      if (remaining) {
        const h = String(remaining.hours).padStart(2, '0');
        const m = String(remaining.minutes).padStart(2, '0');
        timeRemaining = `${h}:${m}`;
      }
    }
  }

  const sessionKey = typeof mission.session === 'string' ? (mission.session as TradingSession) : undefined;
  const sessionLabel = (sessionKey && SESSION_LABELS[sessionKey]) || 'Active Session';
  const sessionRemainingPercent =
    typeof mission.sessionRemainingPercent === 'number'
      ? Math.max(0, Math.min(100, Math.round(mission.sessionRemainingPercent)))
      : 100;
  const coachingMessage =
    mission.currentCoachingMessage ||
    (primaryThreat !== 'No Threats'
      ? `Monitor ${primaryThreat.toLowerCase()}. Protect capital.`
      : 'Your discipline is your edge.');

  return {
    missionId,
    objective,
    currentFocus,
    primaryThreat,
    status,
    threatsIdentified,
    timeRemaining,
    sessionLabel,
    sessionRemainingPercent,
    coachingMessage,
  };
}

// ---------------------------------------------------------------------------
// Native module loader — uses the local TraderEdgeLiveActivity module.
//
// The local module bridges to MyModule.swift which calls
// Activity<TraderEdgeAttributes>.request() — this is what makes
// the TraderEdgeLiveActivity widget render on the Lock Screen
// and Dynamic Island.
//
// ---------------------------------------------------------------------------

let _nativeModule: any = null;
let _moduleLoadAttempted = false;
let _moduleError: Error | null = null;

const NATIVE_MODULE_NAME = 'TraderEdgeLiveActivity';

function getNativeModule(): any {
  if (Platform.OS !== 'ios') return null;

  // Return cached module if already loaded
  if (_moduleLoadAttempted) {
    if (_moduleError) {
      console.debug('[LiveActivityAdapter] Native module unavailable (previously failed)');
    }
    return _nativeModule;
  }

  _moduleLoadAttempted = true;

  try {
    const { requireNativeModule } = require('expo');

    _nativeModule = requireNativeModule(NATIVE_MODULE_NAME);
    console.log(`[LiveActivityAdapter] Loaded native module: ${NATIVE_MODULE_NAME}`);
    return _nativeModule;
  } catch (error) {
    _moduleError = error instanceof Error ? error : new Error(String(error));
    console.warn('[LiveActivityAdapter] Failed to load native module:', _moduleError.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Core Live Activity Functions
// ---------------------------------------------------------------------------

export async function startMissionLiveActivity(
  mission: MissionLiveActivityMission,
): Promise<MissionLiveActivityResult> {
  const state = buildMissionActivityState(mission);
  console.log('[LiveActivityAdapter] startMissionLiveActivity', state);

  if (Platform.OS !== 'ios') return unsupportedResult();

  try {
    const mod = getNativeModule();
    if (!mod) {
      const msg = _moduleError
        ? `Native module error: ${_moduleError.message}`
        : 'Native live activity module not available on this device.';
      console.warn('[LiveActivityAdapter] Cannot start activity:', msg);
      return statusResult('not_available_on_device', msg);
    }

    if (!mod?.startActivity) {
      console.warn('[LiveActivityAdapter] Native module missing startActivity method');
      return statusResult('error', 'Live Activity method not available');
    }

    // Call the native module with individual parameters
    // Signature: startActivity(missionId, objective, currentFocus, status, threatsIdentified, timeRemaining, sessionLabel, sessionRemainingPercent, coachingMessage)
    const activityId = await mod.startActivity(
      state.missionId,
      state.objective,
      state.currentFocus,
      state.status,
      state.threatsIdentified,
      state.timeRemaining,
      state.sessionLabel,
      state.sessionRemainingPercent,
      state.coachingMessage,
    );

    if (activityId) {
      lastKnownMissionId = activityId;
      lastKnownStatus = 'active';
      console.log('[LiveActivityAdapter] Live Activity started with id:', activityId);
      return statusResult('active', 'Live Activity started.');
    } else {
      return statusResult('error', 'Unable to start Live Activity.');
    }
  } catch (error) {
    console.warn('[LiveActivityAdapter] Failed to start Live Activity:', error);
    return statusResult('error', 'Unable to start Live Activity.', error);
  }
}

export async function updateMissionLiveActivity(
  mission: MissionLiveActivityMission,
): Promise<MissionLiveActivityResult> {
  const state = buildMissionActivityState(mission);
  console.log('[LiveActivityAdapter] updateMissionLiveActivity', state);

  if (Platform.OS !== 'ios') return unsupportedResult();

  try {
    const mod = getNativeModule();
    if (!mod) {
      const msg = _moduleError
        ? `Native module error: ${_moduleError.message}`
        : 'Native live activity module not available on this device.';
      console.warn('[LiveActivityAdapter] Cannot update activity:', msg);
      return statusResult('not_available_on_device', msg);
    }

    if (!mod?.updateActivity || !lastKnownMissionId) {
      console.warn('[LiveActivityAdapter] Cannot update: missing method or activity id');
      return statusResult('error', 'No active Live Activity to update');
    }

    // Call the native module with individual parameters
    // Signature: updateActivity(activityId, missionId, objective, currentFocus, status, threatsIdentified, timeRemaining, sessionLabel, sessionRemainingPercent, coachingMessage)
    const success = await mod.updateActivity(
      lastKnownMissionId,
      state.missionId,
      state.objective,
      state.currentFocus,
      state.status,
      state.threatsIdentified,
      state.timeRemaining,
      state.sessionLabel,
      state.sessionRemainingPercent,
      state.coachingMessage,
    );

    if (success) {
      lastKnownStatus = 'updated';
      return statusResult('updated', 'Live Activity updated.');
    } else {
      return statusResult('error', 'Unable to update Live Activity.');
    }
  } catch (error) {
    console.warn('[LiveActivityAdapter] Failed to update Live Activity:', error);
    return statusResult('error', 'Unable to update Live Activity.', error);
  }
}

export async function endMissionLiveActivity(reason = 'mission_ended'): Promise<MissionLiveActivityResult> {
  console.log('[LiveActivityAdapter] endMissionLiveActivity', { missionId: lastKnownMissionId, reason });

  if (Platform.OS !== 'ios') return unsupportedResult();

  try {
    const mod = getNativeModule();
    if (!mod) {
      const msg = _moduleError
        ? `Native module error: ${_moduleError.message}`
        : 'Native live activity module not available on this device.';
      console.warn('[LiveActivityAdapter] Cannot end activity:', msg);
      // Still clear state even if native call fails
      lastKnownMissionId = null;
      lastKnownStatus = 'ended';
      return statusResult('ended', 'Live Activity cleared locally (native unavailable).');
    }

    if (!mod?.endActivity || !lastKnownMissionId) {
      console.warn('[LiveActivityAdapter] Cannot end: missing method or activity id');
      lastKnownMissionId = null;
      lastKnownStatus = 'ended';
      return statusResult('ended', 'No active Live Activity to end.');
    }

    // Call the native module
    // Signature: endActivity(activityId)
    await mod.endActivity(lastKnownMissionId);

    lastKnownMissionId = null;
    lastKnownStatus = 'ended';
    return statusResult('ended', 'Live Activity ended.');
  } catch (error) {
    console.warn('[LiveActivityAdapter] Failed to end Live Activity:', error);
    // Always clear state locally even if native call failed
    lastKnownMissionId = null;
    lastKnownStatus = 'ended';
    return statusResult('ended', 'Live Activity ended (with error).', error);
  }
}

export async function getMissionLiveActivityStatus(): Promise<MissionLiveActivityResult> {
  if (Platform.OS !== 'ios') return unsupportedResult();

  // Fall back to local state tracking since the local module
  // doesn't expose a status query API
  if (lastKnownStatus === 'active' || lastKnownStatus === 'updated') {
    return statusResult('active', 'Live Activity was started in this app session.');
  }

  return statusResult('not_available_on_device', 'No active Live Activity in this session.');
}

// ---------------------------------------------------------------------------
// Convenience aliases
// ---------------------------------------------------------------------------

export async function startMissionActivity(state: MissionLiveActivityMission): Promise<MissionLiveActivityResult> {
  return startMissionLiveActivity(state);
}

export async function updateMissionActivity(state: MissionLiveActivityMission): Promise<MissionLiveActivityResult> {
  return updateMissionLiveActivity(state);
}

export async function endMissionActivity(_missionId?: string): Promise<MissionLiveActivityResult> {
  return endMissionLiveActivity('mission_completed');
}

// ---------------------------------------------------------------------------
// Diagnostics & Resilience
// ---------------------------------------------------------------------------

/**
 * Check if the native live activity module is available and working
 */
export function isNativeModuleAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;
  const mod = getNativeModule();
  return mod !== null && typeof mod.startActivity === 'function';
}

/**
 * Get detailed error information if the native module failed to load
 */
export function getNativeModuleError(): string | null {
  if (!_moduleError) return null;
  return _moduleError.message;
}

/**
 * Reset the module cache to retry loading on next call
 * Useful during dev when rebuilding native binaries
 */
export function resetNativeModuleCache(): void {
  console.log('[LiveActivityAdapter] Resetting native module cache');
  _nativeModule = null;
  _moduleLoadAttempted = false;
  _moduleError = null;
}
