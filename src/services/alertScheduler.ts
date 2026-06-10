import * as Notifications from 'expo-notifications';

import { AlertSettings } from '../contexts/AuthContext';
import {
  NotificationSettings,
  ReminderType,
  loadNotificationSettings,
  scheduleDailyReminder,
  scheduleDebriefReminder,
  scheduleSessionReminder,
} from './notificationSettings';

export type AlertId =
  | 'daily_mission_briefing'
  | 'lock_screen_coaching'
  | 'basic_debrief_reminder'
  | 'session_start_reminder'
  | 'mid_session_check_in'
  | 'risk_warning_placeholder'
  | 'custom_alert_time'
  | 'multiple_daily_reminders'
  | 'advanced_coaching_alerts';

export type AlertScheduleType = 'daily' | 'sessionBased' | 'eventBased' | 'manual';
export type AlertDeliveryType = 'push' | 'lockScreen' | 'liveActivity' | 'inApp';
export type AlertSchedulingBehavior =
  | 'active'
  | 'placeholder_ready'
  | 'pro_locked'
  | 'event_based_future'
  | 'manual_only'
  | 'unsupported';
export type AlertScheduleStatus =
  | 'scheduled'
  | 'cancelled'
  | 'permission_needed'
  | 'placeholder_ready'
  | 'pro_locked'
  | 'event_based_future'
  | 'manual_only'
  | 'unsupported'
  | 'error';

export type AlertPreference = {
  category: 'behavioral' | 'mission' | 'intelligence' | 'lockScreen' | 'coaching';
  deliveryType: AlertDeliveryType;
  enabled: boolean;
  id: AlertId;
  isPro: boolean;
  scheduleType: AlertScheduleType;
  schedulingBehavior: AlertSchedulingBehavior;
  title: string;
};

export type AlertScheduleResult = {
  alertId: AlertId;
  deliveryType: AlertDeliveryType;
  enabled: boolean;
  error?: unknown;
  scheduleType: AlertScheduleType;
  status: AlertScheduleStatus;
};

const traderEdgeDataKey = 'traderEdgeAlertId';

/**
 * V1 Notification Map (Day 12 Lock)
 * 
 * ACTIVE ALERTS (WEEKLY expo-notification cron schedules):
 * 1. daily_mission_briefing (Free) -> lockScreen.missionBriefings -> 6:30 AM
 * 2. session_start_reminder (Free) -> mission.missionStart -> User Trading Start Time (default 7:00 AM)
 * 3. basic_debrief_reminder (Pro) -> mission.debriefReminder -> 10 mins before User Trading End Time
 * 
 * INACTIVE/STUBS (Honest statuses, not wired to mission engine yet):
 * - lock_screen_coaching (Free) -> event_based_future
 * - mid_session_check_in (Pro) -> event_based_future
 * - risk_warning_placeholder (Pro) -> placeholder_ready
 * - custom_alert_time (Pro) -> manual_only
 * - multiple_daily_reminders (Pro) -> placeholder_ready
 * - advanced_coaching_alerts (Pro) -> event_based_future
 */
export const alertPreferenceCatalog: Record<AlertId, Omit<AlertPreference, 'enabled'>> = {
  daily_mission_briefing: {
    id: 'daily_mission_briefing',
    title: 'Daily Mission Briefing',
    category: 'lockScreen',
    scheduleType: 'daily',
    deliveryType: 'lockScreen',
    isPro: false,
    schedulingBehavior: 'active',
  },
  lock_screen_coaching: {
    id: 'lock_screen_coaching',
    title: 'Lock Screen Coaching',
    category: 'lockScreen',
    scheduleType: 'eventBased',
    deliveryType: 'lockScreen',
    isPro: false,
    schedulingBehavior: 'event_based_future',
  },
  basic_debrief_reminder: {
    id: 'basic_debrief_reminder',
    title: 'Debrief Reminder',
    category: 'mission',
    scheduleType: 'daily',
    deliveryType: 'push',
    isPro: true,
    schedulingBehavior: 'active',
  },
  session_start_reminder: {
    id: 'session_start_reminder',
    title: 'Session Start Reminder',
    category: 'mission',
    scheduleType: 'sessionBased',
    deliveryType: 'push',
    isPro: false,
    schedulingBehavior: 'active',
  },
  mid_session_check_in: {
    id: 'mid_session_check_in',
    title: 'Mid-Session Check-In',
    category: 'mission',
    scheduleType: 'sessionBased',
    deliveryType: 'push',
    isPro: true,
    schedulingBehavior: 'event_based_future',
  },
  risk_warning_placeholder: {
    id: 'risk_warning_placeholder',
    title: 'Risk Warning',
    category: 'behavioral',
    scheduleType: 'eventBased',
    deliveryType: 'push',
    isPro: true,
    schedulingBehavior: 'placeholder_ready',
  },
  custom_alert_time: {
    id: 'custom_alert_time',
    title: 'Custom Alert Time',
    category: 'coaching',
    scheduleType: 'manual',
    deliveryType: 'push',
    isPro: true,
    schedulingBehavior: 'manual_only',
  },
  multiple_daily_reminders: {
    id: 'multiple_daily_reminders',
    title: 'Multiple Daily Reminders',
    category: 'coaching',
    scheduleType: 'daily',
    deliveryType: 'push',
    isPro: true,
    schedulingBehavior: 'placeholder_ready',
  },
  advanced_coaching_alerts: {
    id: 'advanced_coaching_alerts',
    title: 'Advanced Coaching Alerts',
    category: 'coaching',
    scheduleType: 'eventBased',
    deliveryType: 'push',
    isPro: true,
    schedulingBehavior: 'event_based_future',
  },
};

export function buildAlertPreferences(settings: AlertSettings): AlertPreference[] {
  return [
    withEnabled('daily_mission_briefing', settings.lockScreen.missionBriefings),
    withEnabled('lock_screen_coaching', settings.lockScreen.lockScreenCoaching),
    withEnabled('basic_debrief_reminder', settings.mission.debriefReminder),
    withEnabled('session_start_reminder', settings.mission.missionStart),
    withEnabled('mid_session_check_in', settings.mission.midSessionCheckIn),
    withEnabled('risk_warning_placeholder', settings.behavioral.highRiskAlerts || settings.behavioral.cautionAlerts),
    withEnabled('custom_alert_time', settings.coaching.frequency !== 'low'),
    withEnabled('multiple_daily_reminders', settings.mission.fifteenMinutesToClose || settings.mission.volatilityAlerts),
    withEnabled('advanced_coaching_alerts', settings.intelligence.behavioralPatternReports || settings.lockScreen.liveActivityUpdates),
  ];
}

export async function scheduleAlertPreference(
  alertPreference: AlertPreference,
  options: { isProUser: boolean; legacySettings: NotificationSettings; permissionStatus?: string },
): Promise<AlertScheduleResult> {
  const permissionStatus = options.permissionStatus || options.legacySettings.permissionStatus;

  try {
    if (alertPreference.isPro && !options.isProUser) {
      return logAlertAction(alertPreference, 'pro_locked');
    }

    if (!alertPreference.enabled) {
      await cancelAlert(alertPreference.id);
      return logAlertAction(alertPreference, 'cancelled');
    }

    if (alertPreference.schedulingBehavior === 'placeholder_ready') {
      return logAlertAction(alertPreference, 'placeholder_ready');
    }

    if (alertPreference.schedulingBehavior === 'event_based_future') {
      return logAlertAction(alertPreference, 'event_based_future');
    }

    if (alertPreference.schedulingBehavior === 'manual_only' || alertPreference.scheduleType === 'manual') {
      return logAlertAction(alertPreference, 'manual_only');
    }

    if (alertPreference.schedulingBehavior === 'unsupported') {
      return logAlertAction(alertPreference, 'unsupported');
    }

    if (permissionStatus !== 'granted') {
      return logAlertAction(alertPreference, 'permission_needed');
    }

    await routeActiveSchedule(alertPreference, {
      ...options.legacySettings,
      permissionStatus: 'granted',
    });
    return logAlertAction(alertPreference, 'scheduled');
  } catch (error) {
    return logAlertAction(alertPreference, 'error', error);
  }
}

export async function syncAlertSchedules(
  userId: string,
  settings: AlertSettings,
  options: { isProUser?: boolean; permissionStatus?: string; tradingStartTime?: string; tradingEndTime?: string } = {},
): Promise<AlertScheduleResult[]> {
  const legacySettings = await loadNotificationSettings(userId);
  const isProUser = options.isProUser ?? true;

  // Override legacy times with user-selected trading times if available
  if (options.tradingStartTime) {
    legacySettings.sessionReminderTime = options.tradingStartTime;
  }
  if (options.tradingEndTime) {
    legacySettings.debriefReminderTime = subtractMinutes(options.tradingEndTime, 10);
  }

  const results: AlertScheduleResult[] = [];
  for (const preference of buildAlertPreferences(settings)) {
    results.push(await scheduleAlertPreference(preference, {
      isProUser,
      legacySettings,
      permissionStatus: options.permissionStatus,
    }));
  }
  return results;
}

/** Subtract minutes from a HH:mm time string, wrapping around midnight if needed. */
function subtractMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  let totalMinutes = (h || 0) * 60 + (m || 0) - mins;
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export async function sendTestNotification(alertId: AlertId): Promise<AlertScheduleResult> {
  const preference = withEnabled(alertId, true);

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: preference.title,
        body: 'Trader\'s Edge test alert.',
        data: {
          [traderEdgeDataKey]: alertId,
          test: true,
        },
      },
      trigger: null,
    });
    return logAlertAction(preference, 'scheduled');
  } catch (error) {
    return logAlertAction(preference, 'error', error);
  }
}

export async function cancelAlert(alertId: AlertId): Promise<AlertScheduleResult> {
  const preference = withEnabled(alertId, false);
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const matchingNotifications = scheduledNotifications.filter((notification) => {
    return notification.content.data?.[traderEdgeDataKey] === alertId || notification.content.data?.alertId === alertId;
  });

  await Promise.all(
    matchingNotifications.map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );
  await cancelLegacyReminderForAlert(alertId);

  return logAlertAction(preference, 'cancelled');
}

export async function cancelAllTraderEdgeAlerts(): Promise<AlertScheduleResult> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const traderEdgeNotifications = scheduledNotifications.filter((notification) => {
    return Boolean(notification.content.data?.[traderEdgeDataKey] || notification.content.data?.alertId || notification.content.data?.reminderType);
  });

  await Promise.all(
    traderEdgeNotifications.map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );

  const preference = withEnabled('daily_mission_briefing', false);
  return logAlertAction(preference, 'cancelled');
}

export async function getScheduledTraderEdgeAlerts() {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const traderEdgeNotifications = scheduledNotifications.filter((notification) => {
    return Boolean(notification.content.data?.[traderEdgeDataKey] || notification.content.data?.alertId || notification.content.data?.reminderType);
  });

  console.log('[TraderEdgeAlerts]', {
    action: 'list',
    count: traderEdgeNotifications.length,
    timestamp: new Date().toISOString(),
  });

  return traderEdgeNotifications;
}

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
  }

  return currentTotal >= startTotal || currentTotal <= endTotal;
}

export function shouldSuppressAlert(settings: AlertSettings, isHighPriority: boolean): boolean {
  if (isHighPriority) return false;
  return isInQuietHours(settings);
}

/**
 * Routes alerts to their respective scheduling logic.
 * Currently, only 'daily_mission_briefing', 'session_start_reminder', and 'basic_debrief_reminder'
 * are actively wired up to schedule expo-notifications.
 */
async function routeActiveSchedule(preference: AlertPreference, legacySettings: NotificationSettings): Promise<void> {
  if (preference.scheduleType === 'daily') {
    await scheduleDailyMissionBriefing(preference, legacySettings);
    return;
  }

  if (preference.scheduleType === 'sessionBased') {
    await scheduleSessionAlert(preference, legacySettings);
    return;
  }

  if (preference.scheduleType === 'eventBased') {
    await scheduleEventBasedAlert(preference);
  }
}

async function scheduleDailyMissionBriefing(preference: AlertPreference, legacySettings: NotificationSettings): Promise<void> {
  if (preference.id === 'daily_mission_briefing') {
    await scheduleDailyReminder({ ...legacySettings, dailyReminderEnabled: true });
    await tagLegacyReminder('daily', preference.id);
    return;
  }

  if (preference.id === 'basic_debrief_reminder') {
    await scheduleDebriefReminder({ ...legacySettings, debriefReminderEnabled: true });
    await tagLegacyReminder('debrief', preference.id);
  }
}

async function scheduleSessionAlert(preference: AlertPreference, legacySettings: NotificationSettings): Promise<void> {
  if (preference.id === 'session_start_reminder') {
    await scheduleSessionReminder({ ...legacySettings, sessionReminderEnabled: true });
    await tagLegacyReminder('session', preference.id);
  }
}

async function scheduleEventBasedAlert(_preference: AlertPreference): Promise<void> {
  // Event-based alerts need runtime mission events before they can be scheduled honestly.
}

async function cancelLegacyReminderForAlert(alertId: AlertId): Promise<void> {
  const reminderType = legacyReminderTypeForAlert(alertId);
  if (!reminderType) return;

  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const matchingNotifications = scheduledNotifications.filter((notification) => {
    return notification.content.data?.reminderType === reminderType;
  });

  await Promise.all(
    matchingNotifications.map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );
}

async function tagLegacyReminder(reminderType: ReminderType, alertId: AlertId): Promise<void> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const matchingNotifications = scheduledNotifications.filter((notification) => {
    return notification.content.data?.reminderType === reminderType;
  });

  if (matchingNotifications.length === 0) return;
  console.log('[TraderEdgeAlerts]', {
    action: 'legacy_reminder_scheduled',
    alertId,
    reminderType,
    scheduledCount: matchingNotifications.length,
    timestamp: new Date().toISOString(),
  });
}

function legacyReminderTypeForAlert(alertId: AlertId): ReminderType | null {
  if (alertId === 'daily_mission_briefing') return 'daily';
  if (alertId === 'session_start_reminder') return 'session';
  if (alertId === 'basic_debrief_reminder') return 'debrief';
  return null;
}

function withEnabled(id: AlertId, enabled: boolean): AlertPreference {
  return { ...alertPreferenceCatalog[id], enabled };
}

function logAlertAction(preference: AlertPreference, status: AlertScheduleStatus, error?: unknown): AlertScheduleResult {
  const result: AlertScheduleResult = {
    alertId: preference.id,
    deliveryType: preference.deliveryType,
    enabled: preference.enabled,
    error,
    scheduleType: preference.scheduleType,
    status,
  };

  console.log('[TraderEdgeAlerts]', {
    alertId: preference.id,
    deliveryType: preference.deliveryType,
    enabled: preference.enabled,
    error,
    scheduleType: preference.scheduleType,
    scheduledStatus: status,
    timestamp: new Date().toISOString(),
  });

  return result;
}
