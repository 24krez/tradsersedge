import * as Notifications from 'expo-notifications';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { firestore } from './firebase';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export type ReminderType = 'daily' | 'session' | 'debrief' | 'missedDebrief' | 'disciplineReset' | 'weeklyRecap';

export type NotificationSettings = {
  userId: string;
  permissionStatus: NotificationPermissionStatus;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  sessionReminderEnabled: boolean;
  sessionReminderTime: string;
  debriefReminderEnabled: boolean;
  debriefReminderTime: string;
  missedDebriefReminderEnabled: boolean;
  disciplineResetReminderEnabled: boolean;
  weeklyRecapEnabled: boolean;
  timezone: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type NotificationSettingsUpdate = Partial<
  Omit<NotificationSettings, 'userId' | 'createdAt' | 'updatedAt'>
>;

const collectionName = 'notification_settings';

const reminderCopy: Record<
  'daily' | 'session' | 'debrief',
  { title: string; body: string }
> = {
  daily: {
    title: 'Mission Briefing Ready',
    body: "Check today's trading mission before you enter the market.",
  },
  session: {
    title: 'Session Starting',
    body: 'Your trading window is opening. Stay patient and follow the plan.',
  },
  debrief: {
    title: 'Complete Your Debrief',
    body: 'Log what happened, score your discipline, and close the session right.',
  },
};

export async function loadNotificationSettings(userId: string): Promise<NotificationSettings> {
  const settingsRef = doc(firestore, collectionName, userId);
  const snapshot = await getDoc(settingsRef);

  if (snapshot.exists()) {
    return snapshot.data() as NotificationSettings;
  }

  return createDefaultNotificationSettings(userId);
}

export async function createDefaultNotificationSettings(userId: string): Promise<NotificationSettings> {
  const defaults = defaultNotificationSettings(userId);

  await setDoc(doc(firestore, collectionName, userId), {
    ...defaults,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return defaults;
}

export async function updateNotificationSetting(
  userId: string,
  updates: NotificationSettingsUpdate,
): Promise<void> {
  await updateDoc(doc(firestore, collectionName, userId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  const current = await Notifications.getPermissionsAsync();

  if (current.status === 'granted') {
    return 'granted';
  }

  const requested = await Notifications.requestPermissionsAsync();
  return normalizePermissionStatus(requested.status);
}

export async function scheduleDailyReminder(settings: NotificationSettings): Promise<void> {
  console.log(`[Notification Engine] Processing 'daily' reminder. Enabled: ${settings.dailyReminderEnabled}, Permission: ${settings.permissionStatus}`);
  if (!settings.dailyReminderEnabled || settings.permissionStatus !== 'granted') {
    await cancelReminder('daily');
    return;
  }

  await scheduleDailyNotification('daily', settings.dailyReminderTime);
}

export async function scheduleSessionReminder(settings: NotificationSettings): Promise<void> {
  console.log(`[Notification Engine] Processing 'session' reminder. Enabled: ${settings.sessionReminderEnabled}, Permission: ${settings.permissionStatus}`);
  if (!settings.sessionReminderEnabled || settings.permissionStatus !== 'granted') {
    await cancelReminder('session');
    return;
  }

  await scheduleDailyNotification('session', settings.sessionReminderTime);
}

export async function scheduleDebriefReminder(settings: NotificationSettings): Promise<void> {
  console.log(`[Notification Engine] Processing 'debrief' reminder. Enabled: ${settings.debriefReminderEnabled}, Permission: ${settings.permissionStatus}`);
  if (!settings.debriefReminderEnabled || settings.permissionStatus !== 'granted') {
    await cancelReminder('debrief');
    return;
  }

  await scheduleDailyNotification('debrief', settings.debriefReminderTime);
}

export async function cancelReminder(type: ReminderType): Promise<void> {
  console.log(`[Notification Engine] Canceling scheduled reminders for type: ${type}`);
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const matchingNotifications = scheduledNotifications.filter((notification) => {
      return notification.content.data?.reminderType === type;
    });

    if (matchingNotifications.length > 0) {
      console.log(`[Notification Engine] Found ${matchingNotifications.length} existing reminders to cancel for ${type}.`);
      await Promise.all(
        matchingNotifications.map((notification) => {
          return Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }),
      );
      console.log(`[Notification Engine] Successfully canceled ${type} reminders.`);
    } else {
      console.log(`[Notification Engine] No existing reminders found to cancel for ${type}.`);
    }
  } catch (error) {
    console.error(`[Notification Engine] Error canceling reminders for ${type}:`, error);
  }
}

function defaultNotificationSettings(userId: string): NotificationSettings {
  return {
    userId,
    permissionStatus: 'undetermined',
    dailyReminderEnabled: true,
    dailyReminderTime: '06:30',
    sessionReminderEnabled: false,
    sessionReminderTime: '07:00',
    debriefReminderEnabled: false,
    debriefReminderTime: '11:15',
    missedDebriefReminderEnabled: false,
    disciplineResetReminderEnabled: false,
    weeklyRecapEnabled: false,
    timezone: getDeviceTimezone(),
  };
}

async function scheduleDailyNotification(
  type: 'daily' | 'session' | 'debrief',
  time: string,
): Promise<void> {
  const parsedTime = parseReminderTime(time);

  await cancelReminder(type);
  try {
    // We want to skip weekends. 
    // In expo-notifications WEEKLY trigger, Sunday = 1, Monday = 2, ..., Saturday = 7
    const weekdays = [2, 3, 4, 5, 6]; // Mon - Fri

    const alertIds = await Promise.all(
      weekdays.map(async (weekday) => {
        return await Notifications.scheduleNotificationAsync({
          content: {
            title: reminderCopy[type].title,
            body: reminderCopy[type].body,
            data: {
              reminderType: type,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour: parsedTime.hour,
            minute: parsedTime.minute,
          },
        });
      })
    );

    console.log(`[Notification Engine] Successfully scheduled '${type}' reminders for weekdays at ${parsedTime.hour}:${parsedTime.minute}. alertIds: ${alertIds.join(', ')}`);
  } catch (error) {
    console.error(`[Notification Engine] Failed to schedule '${type}' reminders:`, error);
  }
}

function parseReminderTime(time: string): { hour: number; minute: number } {
  const [hourValue, minuteValue] = time.split(':').map((value) => Number(value));

  return {
    hour: Number.isFinite(hourValue) ? Math.min(Math.max(hourValue, 0), 23) : 6,
    minute: Number.isFinite(minuteValue) ? Math.min(Math.max(minuteValue, 0), 59) : 30,
  };
}

function normalizePermissionStatus(status: Notifications.PermissionStatus): NotificationPermissionStatus {
  if (status === 'granted' || status === 'denied') {
    return status;
  }

  return 'undetermined';
}

function getDeviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
