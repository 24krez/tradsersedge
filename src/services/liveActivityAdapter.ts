import { Platform } from 'react-native';

// Lazy-loaded reference — resolved at runtime only on iOS to avoid
// bundler errors when the native module isn't installed (e.g. Expo Go).
let LiveActivity: any = null;

async function getLiveActivity() {
  if (LiveActivity) return LiveActivity;
  if (Platform.OS !== 'ios') return null;
  try {
    LiveActivity = await import('@heojeongbo/expo-live-activity');
    return LiveActivity;
  } catch {
    console.warn('[LiveActivityAdapter] Native module not available — running in Expo Go?');
    return null;
  }
}

export type MissionActivityState = {
  missionId: string;
  objective: string;
  status: 'on_track' | 'caution' | 'high_risk' | 'locked_in';
  threatsIdentified: number;
  timeRemaining?: string; // e.g. "01:45"
};

/**
 * Safely starts a Live Activity.
 * Gracefully logs and prevents crashes if running in Expo Go or an unsupported environment.
 */
export async function startMissionActivity(state: MissionActivityState) {
  console.log('[LiveActivityAdapter] Requesting start for mission:', state.missionId, state);
  
  if (Platform.OS !== 'ios') {
    console.log('[LiveActivityAdapter] Skipped: Live Activities are only supported on iOS.');
    return;
  }

  try {
    const la = await getLiveActivity();
    if (!la) return;
    // The exact API signature depends on the plugin version, 
    // but typically it accepts an object matching the Swift ActivityAttributes struct.
    await la.startActivity('TraderEdgeLiveActivity', state);
    console.log('[LiveActivityAdapter] Live Activity started successfully.');
  } catch (err) {
    console.warn('[LiveActivityAdapter] Error starting live activity (Are you in Expo Go?):', err);
  }
}

/**
 * Updates an ongoing Live Activity.
 */
export async function updateMissionActivity(state: MissionActivityState) {
  console.log('[LiveActivityAdapter] Requesting update for mission:', state.missionId, state);
  
  if (Platform.OS !== 'ios') return;

  try {
    const la = await getLiveActivity();
    if (!la) return;
    await la.updateActivity('TraderEdgeLiveActivity', state);
    console.log('[LiveActivityAdapter] Live Activity updated successfully.');
  } catch (err) {
    console.warn('[LiveActivityAdapter] Error updating live activity:', err);
  }
}

/**
 * Ends the Live Activity.
 */
export async function endMissionActivity(missionId: string) {
  console.log('[LiveActivityAdapter] Requesting end for mission:', missionId);
  
  if (Platform.OS !== 'ios') return;

  try {
    const la = await getLiveActivity();
    if (!la) return;
    await la.endActivity('TraderEdgeLiveActivity');
    console.log('[LiveActivityAdapter] Live Activity ended successfully.');
  } catch (err) {
    console.warn('[LiveActivityAdapter] Error ending live activity:', err);
  }
}
