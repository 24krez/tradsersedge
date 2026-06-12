import { Platform } from 'react-native';

import { getSessionProgress, getTimeRemaining, TradingSession } from '../logic/sessionEngine';

const ACTIVITY_NAME = 'TraderEdgeLiveActivity';

let LiveActivity: any = null;
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
  status: 'on_track' | 'caution' | 'high_risk' | 'locked_in';
  threatsIdentified: number;
  timeRemaining?: string;
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

async function getLiveActivity() {
  if (Platform.OS !== 'ios') return null;
  if (LiveActivity) return LiveActivity;

  try {
    LiveActivity = await import('@heojeongbo/expo-live-activity');
    return LiveActivity;
  } catch (error) {
    console.warn('[LiveActivityAdapter] Native module unavailable. Install/run a development build with the Live Activity module.', error);
    return null;
  }
}

function normalizeStatus(status?: string): MissionActivityState['status'] {
  const key = (status || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (key.includes('locked')) return 'locked_in';
  if (key.includes('high') || key.includes('risk')) return 'high_risk';
  if (key.includes('caution')) return 'caution';
  return 'on_track';
}

function getThreats(mission: MissionLiveActivityMission): string[] {
  if (typeof mission.threatsIdentified === 'number' && mission.threatsIdentified > 0) {
    return Array.from({ length: mission.threatsIdentified }, (_, index) => `threat-${index}`);
  }
  if (Array.isArray(mission.threats)) return mission.threats;
  if (Array.isArray(mission.selectedThreats)) return mission.selectedThreats;
  if (mission.primaryThreat) return [mission.primaryThreat];
  if (mission.threat) return [mission.threat];
  return [];
}

function formatSessionRemaining(session?: string, sessionRemainingPercent?: number): string | undefined {
  if (typeof sessionRemainingPercent === 'number' && Number.isFinite(sessionRemainingPercent)) {
    return `${Math.max(0, Math.min(100, Math.round(sessionRemainingPercent)))}% Remaining`;
  }

  if (session === 'new_york' || session === 'london' || session === 'asia' || session === 'custom') {
    return session === 'custom'
      ? undefined
      : getTimeRemaining(session).formatted;
  }

  return undefined;
}

export function buildMissionActivityState(mission: MissionLiveActivityMission): MissionActivityState {
  const missionId = mission.id || mission.missionId || 'unknown-mission';
  const session = mission.session;
  const remainingPercent = typeof mission.sessionRemainingPercent === 'number'
    ? mission.sessionRemainingPercent
    : session === 'new_york' || session === 'london' || session === 'asia'
      ? 100 - getSessionProgress(session)
      : undefined;

  return {
    missionId,
    objective: mission.objective || 'Mission Active',
    status: normalizeStatus(mission.currentMindsetStatus || mission.missionStatus || mission.status),
    threatsIdentified: getThreats(mission).length,
    timeRemaining: mission.timeRemaining || formatSessionRemaining(session, remainingPercent),
  };
}

function unsupportedResult(): MissionLiveActivityResult {
  if (Platform.OS !== 'ios') {
    return statusResult('unsupported', 'Live Activities are only supported on iOS.');
  }

  return statusResult(
    'dev_build_required',
    'Live Activity native module is not compiled into this app yet. Rebuild the installed development app with the iOS Live Activity bridge and widget extension.',
  );
}

export async function startMissionLiveActivity(
  mission: MissionLiveActivityMission,
): Promise<MissionLiveActivityResult> {
  const state = buildMissionActivityState(mission);
  console.log('[LiveActivityAdapter] startMissionLiveActivity', state);

  if (Platform.OS !== 'ios') return unsupportedResult();

  try {
    const la = await getLiveActivity();
    if (!la?.startActivity) return unsupportedResult();

    await la.startActivity(ACTIVITY_NAME, state);
    lastKnownMissionId = state.missionId;
    lastKnownStatus = 'active';
    return statusResult('active', 'Live Activity started.');
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
    const la = await getLiveActivity();
    if (!la?.updateActivity) return unsupportedResult();

    await la.updateActivity(ACTIVITY_NAME, state);
    lastKnownMissionId = state.missionId;
    lastKnownStatus = 'updated';
    return statusResult('updated', 'Live Activity updated.');
  } catch (error) {
    console.warn('[LiveActivityAdapter] Failed to update Live Activity:', error);
    return statusResult('error', 'Unable to update Live Activity.', error);
  }
}

export async function endMissionLiveActivity(reason = 'mission_ended'): Promise<MissionLiveActivityResult> {
  console.log('[LiveActivityAdapter] endMissionLiveActivity', { missionId: lastKnownMissionId, reason });

  if (Platform.OS !== 'ios') return unsupportedResult();

  try {
    const la = await getLiveActivity();
    if (!la?.endActivity) return unsupportedResult();

    await la.endActivity(ACTIVITY_NAME, { reason });
    lastKnownStatus = 'ended';
    lastKnownMissionId = null;
    return statusResult('ended', 'Live Activity ended.');
  } catch (error) {
    console.warn('[LiveActivityAdapter] Failed to end Live Activity:', error);
    return statusResult('error', 'Unable to end Live Activity.', error);
  }
}

export async function getMissionLiveActivityStatus(): Promise<MissionLiveActivityResult> {
  if (Platform.OS !== 'ios') return unsupportedResult();

  const la = await getLiveActivity();
  if (!la) return unsupportedResult();

  if (typeof la.getActivityStatus === 'function') {
    try {
      const nativeStatus = await la.getActivityStatus(ACTIVITY_NAME);
      if (nativeStatus?.isActive) return statusResult('active', 'Native Live Activity is active.');
      return statusResult('ended', 'No active Live Activity reported by native layer.');
    } catch (error) {
      return statusResult('error', 'Unable to read Live Activity status.', error);
    }
  }

  if (lastKnownStatus === 'active' || lastKnownStatus === 'updated') {
    return statusResult('active', 'Live Activity was started in this app session.');
  }

  return statusResult('not_available_on_device', 'Native status API is not available on this device/build.');
}

export async function startMissionActivity(state: MissionLiveActivityMission): Promise<MissionLiveActivityResult> {
  return startMissionLiveActivity(state);
}

export async function updateMissionActivity(state: MissionLiveActivityMission): Promise<MissionLiveActivityResult> {
  return updateMissionLiveActivity(state);
}

export async function endMissionActivity(_missionId?: string): Promise<MissionLiveActivityResult> {
  return endMissionLiveActivity('mission_completed');
}
