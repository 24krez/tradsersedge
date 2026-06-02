import { AlertSettings } from '../contexts/AuthContext';
import {
  NotificationSettings,
  loadNotificationSettings,
  scheduleDailyReminder,
  scheduleDebriefReminder,
  scheduleSessionReminder,
} from './notificationSettings';

export function isInQuietHours(settings: AlertSettings): boolean {
  if (!settings.quietHours.enabled) return false;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const [startHour, startMinute] = settings.quietHours.startTime.split(':').map(Number);
  const [endHour, endMinute] = settings.quietHours.endTime.split(':').map(Number);

  const currentTotal = currentHour * 60 + currentMinute;
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;

  if (startTotal <= endTotal) {
    return currentTotal >= startTotal && currentTotal <= endTotal;
  } else {
    // Overnight schedule (e.g. 22:00 to 06:00)
    return currentTotal >= startTotal || currentTotal <= endTotal;
  }
}

export function shouldSuppressAlert(settings: AlertSettings, isHighPriority: boolean): boolean {
  if (isHighPriority) return false;
  return isInQuietHours(settings);
}

export async function scheduleMissionStartAlert(userId: string, settings: AlertSettings): Promise<void> {
  const oldSettings = await loadNotificationSettings(userId);
  const mockSettings: NotificationSettings = {
    ...oldSettings,
    sessionReminderEnabled: settings.mission.missionStart,
  };
  await scheduleSessionReminder(mockSettings);
}

export async function scheduleMidSessionCheckInAlert(userId: string, settings: AlertSettings): Promise<void> {
  // Stubbed for now
  return Promise.resolve();
}

export async function scheduleMissionCompleteAlert(userId: string, settings: AlertSettings): Promise<void> {
  // Stubbed for now
  return Promise.resolve();
}

export async function scheduleDebriefReminderAlert(userId: string, settings: AlertSettings): Promise<void> {
  const oldSettings = await loadNotificationSettings(userId);
  const mockSettings: NotificationSettings = {
    ...oldSettings,
    debriefReminderEnabled: settings.mission.debriefReminder,
  };
  await scheduleDebriefReminder(mockSettings);
}

// Stub unsupported alerts
export async function scheduleVolatilityAlerts(userId: string, settings: AlertSettings): Promise<void> {
  return Promise.resolve();
}

export async function scheduleWeeklyIntelligenceReport(userId: string, settings: AlertSettings): Promise<void> {
  return Promise.resolve();
}

export async function scheduleBehavioralPatternReports(userId: string, settings: AlertSettings): Promise<void> {
  return Promise.resolve();
}

export async function scheduleMonthlyPerformanceSummary(userId: string, settings: AlertSettings): Promise<void> {
  return Promise.resolve();
}

export async function scheduleRankPromotionAlerts(userId: string, settings: AlertSettings): Promise<void> {
  return Promise.resolve();
}

export async function syncAlertSchedules(userId: string, settings: AlertSettings): Promise<void> {
  await Promise.all([
    scheduleMissionStartAlert(userId, settings),
    scheduleMidSessionCheckInAlert(userId, settings),
    scheduleMissionCompleteAlert(userId, settings),
    scheduleDebriefReminderAlert(userId, settings),
    scheduleVolatilityAlerts(userId, settings),
    scheduleWeeklyIntelligenceReport(userId, settings),
    scheduleBehavioralPatternReports(userId, settings),
    scheduleMonthlyPerformanceSummary(userId, settings),
    scheduleRankPromotionAlerts(userId, settings),
  ]);
}
