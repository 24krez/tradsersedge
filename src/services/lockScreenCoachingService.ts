import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { AlertSettings } from '../contexts/AuthContext';
import { getRandomCoachMessage } from '../features/coaching/coachEngine';
import {
  formatWidgetMessage,
  getLockScreenCoachingMessage,
  LockScreenWidgetMessage,
} from '../features/coaching/lockScreenWidgetMessages';
import type { CoachingStyle, ScreenContext } from '../features/coaching/coachTypes';

type CoachingDeliveryStatus =
  | 'delivered'
  | 'disabled'
  | 'permission_needed'
  | 'home_widget_native_required'
  | 'widget_updated'
  | 'unsupported'
  | 'error';

type CoachingDeliveryResult = {
  status: CoachingDeliveryStatus;
  message?: string;
  notificationId?: string;
  error?: string;
};

type MissionSnapshot = {
  id?: string;
  objective?: string;
  coreFocus?: string;
  threats?: string[];
  missionStatus?: string;
  currentMindsetStatus?: string;
};

type SendLockScreenCoachingInput = {
  alertSettings?: AlertSettings;
  coachingStyle?: CoachingStyle;
  mission: MissionSnapshot;
  screenContext: ScreenContext;
};

type UpdateLockScreenCoachingWidgetInput = {
  alertSettings?: AlertSettings;
  coachingStyle?: CoachingStyle;
  fallback?: string;
};

const traderEdgeAlertId = 'lock_screen_coaching';
const nativeModuleName = 'TraderEdgeLiveActivity';

function result(status: CoachingDeliveryStatus, message?: string, error?: unknown): CoachingDeliveryResult {
  return {
    status,
    message,
    error: error instanceof Error ? error.message : typeof error === 'string' ? error : undefined,
  };
}

function lockScreenCoachingEnabled(settings?: AlertSettings): boolean {
  return settings?.lockScreen?.lockScreenCoaching !== false;
}

function humanize(value?: string): string | undefined {
  if (!value) return undefined;
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function missionStatusForCoach(mission: MissionSnapshot) {
  const status = mission.currentMindsetStatus || mission.missionStatus;
  if (!status) return undefined;
  const key = status.toLowerCase().replace(/[\s-]+/g, '_');
  if (key.includes('locked')) return 'locked_in';
  if (key.includes('high')) return 'high_risk';
  if (key.includes('caution')) return 'caution';
  if (key.includes('track')) return 'on_track';
  return undefined;
}

export async function sendMissionCoachingLockScreenNotification({
  alertSettings,
  coachingStyle = 'tactical',
  mission,
  screenContext,
}: SendLockScreenCoachingInput): Promise<CoachingDeliveryResult> {
  if (!lockScreenCoachingEnabled(alertSettings)) {
    return result('disabled', 'Lock Screen Coaching is disabled.');
  }

  try {
    const permissions = await Notifications.getPermissionsAsync();
    if (permissions.status !== 'granted') {
      return result('permission_needed', 'Notification permission is needed before coaching can appear on the lock screen.');
    }

    const coachMessage = getRandomCoachMessage({
      alertType: 'lock_screen',
      coachingStyle,
      coreFocus: humanize(mission.coreFocus),
      missionStatus: missionStatusForCoach(mission),
      objective: humanize(mission.objective),
      threat: humanize(mission.threats?.[0]),
      screenContext,
    });

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: coachMessage.title,
        body: coachMessage.body,
        data: {
          alertId: traderEdgeAlertId,
          missionId: mission.id,
          screenContext,
          traderEdgeAlertId,
        },
      },
      trigger: null,
    });

    return {
      status: 'delivered',
      message: 'Coaching message sent to lock screen.',
      notificationId,
    };
  } catch (error) {
    return result('error', 'Unable to send lock-screen coaching message.', error);
  }
}

export async function updateLockScreenCoachingWidget({
  alertSettings,
  coachingStyle = 'tactical',
  fallback,
}: UpdateLockScreenCoachingWidgetInput = {}): Promise<CoachingDeliveryResult & { widgetMessage?: LockScreenWidgetMessage }> {
  if (!lockScreenCoachingEnabled(alertSettings)) {
    return result('disabled', 'Lock Screen Coaching is disabled.');
  }

  const widgetMessage = getLockScreenCoachingMessage({
    coachingStyle,
    fallback,
  });

  if (Platform.OS !== 'ios') {
    return {
      ...result('unsupported', 'Lock Screen coaching widgets are only supported on iOS.'),
      widgetMessage,
    };
  }

  try {
    const { requireNativeModule } = require('expo');
    const mod = requireNativeModule(nativeModuleName);

    if (!mod?.updateCoachingWidget) {
      return {
        ...result('home_widget_native_required', 'Native coaching widget updater is unavailable.'),
        widgetMessage,
      };
    }

    await mod.updateCoachingWidget(
      widgetMessage.id,
      formatWidgetMessage(widgetMessage, 'rectangular'),
      formatWidgetMessage(widgetMessage, 'circular'),
      widgetMessage.category,
      widgetMessage.style,
      widgetMessage.maxSurface,
      widgetMessage.expiresAt || '',
    );

    return {
      ...result('widget_updated', 'Lock Screen coaching widget updated.'),
      widgetMessage,
    };
  } catch (error) {
    return {
      ...result('error', 'Unable to update Lock Screen coaching widget.', error),
      widgetMessage,
    };
  }
}

export async function updateHomeScreenCoachingWidget(
  input: UpdateLockScreenCoachingWidgetInput = {},
): Promise<CoachingDeliveryResult> {
  return updateLockScreenCoachingWidget(
    input.fallback ? input : { ...input, fallback: 'Process over outcome.' },
  );
}
