import { NativeModule, requireNativeModule } from 'expo';

type TraderEdgeLiveActivityModuleEvents = {};

declare class TraderEdgeLiveActivityModule extends NativeModule<TraderEdgeLiveActivityModuleEvents> {
  startActivity(title: string, missionId: string, objective: string, status: string, threatsIdentified: number, timeRemaining: string): Promise<string | null>;
  updateActivity(activityId: string, missionId: string, objective: string, status: string, threatsIdentified: number, timeRemaining: string): Promise<boolean>;
  endActivity(activityId: string): Promise<boolean>;
}

function loadNativeModule(): TraderEdgeLiveActivityModule | null {
  try {
    return requireNativeModule<TraderEdgeLiveActivityModule>('TraderEdgeLiveActivity');
  } catch {
    return null;
  }
}

export default loadNativeModule();
