declare module '@heojeongbo/expo-live-activity' {
  export function startActivity(activityName: string, state: unknown): Promise<unknown>;
  export function updateActivity(activityName: string, state: unknown): Promise<unknown>;
  export function endActivity(activityName: string, options?: unknown): Promise<unknown>;
  export function getActivityStatus(activityName: string): Promise<{ isActive?: boolean } | null>;
}
