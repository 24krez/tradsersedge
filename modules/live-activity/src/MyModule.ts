import { NativeModule, requireNativeModule } from 'expo';

type TraderEdgeLiveActivityModuleEvents = {};

declare class TraderEdgeLiveActivityModule extends NativeModule<TraderEdgeLiveActivityModuleEvents> {
  startActivity(missionId: string, objective: string, currentFocus: string, status: string, threatsIdentified: number, timeRemaining: string, sessionLabel: string, sessionRemainingPercent: number, coachingMessage: string): Promise<string | null>;
  updateActivity(activityId: string, missionId: string, objective: string, currentFocus: string, status: string, threatsIdentified: number, timeRemaining: string, sessionLabel: string, sessionRemainingPercent: number, coachingMessage: string): Promise<boolean>;
  endActivity(activityId: string): Promise<boolean>;
  updateCoachingWidget(messageId: string, rectangularText: string, circularText: string, category: string, style: string, maxSurface: string, expiresAt: string): Promise<boolean>;
}

function loadNativeModule(): TraderEdgeLiveActivityModule | null {
  try {
    return requireNativeModule<TraderEdgeLiveActivityModule>('TraderEdgeLiveActivity');
  } catch {
    return null;
  }
}

export default loadNativeModule();
