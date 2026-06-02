import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import {
  NotificationSettings,
  NotificationSettingsUpdate,
  ReminderType,
  cancelReminder,
  loadNotificationSettings,
  requestNotificationPermission,
  scheduleDailyReminder,
  scheduleDebriefReminder,
  scheduleSessionReminder,
  updateNotificationSetting,
} from '../services/notificationSettings';

type NotificationSettingsScreenProps = {
  onBack?: () => void;
};

const activeTrackColor = '#cda35a';
const inactiveTrackColor = '#2b3334';
const activeThumbColor = '#f1c977';
const inactiveThumbColor = '#b8b6ad';

export function NotificationSettingsScreen({ onBack }: NotificationSettingsScreenProps) {
  const { user, isPro } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      if (!user) {
        setSettings(null);
        setIsLoading(false);
        return;
      }

      try {
        const loadedSettings = await loadNotificationSettings(user.uid);
        if (isMounted) {
          setSettings(loadedSettings);
        }
      } catch (error) {
        console.error('Error loading notification settings:', error);
        if (isMounted) {
          setStatusMessage('Alert settings are offline. Try again in a moment.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const permissionLabel = useMemo(() => {
    if (!settings) return 'CHECKING';
    return settings.permissionStatus.toUpperCase();
  }, [settings]);

  async function handlePermissionRequest() {
    if (!user || !settings || isSaving) return;

    setIsSaving(true);
    setStatusMessage('');

    try {
      const permissionStatus = await requestNotificationPermission();
      const nextSettings = { ...settings, permissionStatus };

      setSettings(nextSettings);
      await updateNotificationSetting(user.uid, { permissionStatus });

      if (permissionStatus === 'granted') {
        await syncCoreSchedules(nextSettings);
        setStatusMessage('Notifications enabled. Device schedule synced.');
      } else {
        setStatusMessage('Notifications are not enabled on this device.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setStatusMessage('Permission request failed. Check device settings.');
    } finally {
      setIsSaving(false);
    }
  }

  async function applyUpdates(updates: NotificationSettingsUpdate, changedReminder?: ReminderType) {
    if (!user || !settings || isSaving) return;

    const nextSettings = { ...settings, ...updates };
    setSettings(nextSettings);
    setIsSaving(true);
    setStatusMessage('');

    try {
      await updateNotificationSetting(user.uid, updates);

      if (changedReminder === 'daily') {
        await scheduleDailyReminder(nextSettings);
      } else if (changedReminder === 'session') {
        await scheduleSessionReminder(nextSettings);
      } else if (changedReminder === 'debrief') {
        await scheduleDebriefReminder(nextSettings);
      } else if (changedReminder) {
        await cancelReminder(changedReminder);
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      setSettings(settings);
      setStatusMessage('Update failed. Previous settings restored.');
    } finally {
      setIsSaving(false);
    }
  }

  async function syncCoreSchedules(nextSettings: NotificationSettings) {
    await Promise.all([
      scheduleDailyReminder(nextSettings),
      isPro ? scheduleSessionReminder(nextSettings) : cancelReminder('session'),
      isPro ? scheduleDebriefReminder(nextSettings) : cancelReminder('debrief'),
    ]);
  }

  function handleUnlockPro() {
    console.log('TODO: Present RevenueCat paywall for notification upgrades');
    setStatusMessage('Pro unlock flow is coming online soon.');
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator color="#e9c176" />
        </View>
      </SafeAreaView>
    );
  }

  if (!settings) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.title}>MISSION ALERTS</Text>
          <Text style={styles.bodyCopy}>Sign in to configure trading reminders.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <View style={styles.topBar}>
          {onBack ? (
            <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>‹</Text>
            </Pressable>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}
          <Text style={styles.topBarTitle}>ALERTS COMMAND CENTER</Text>
          <View style={styles.statusDot} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>MISSION ALERTS</Text>
          <Text style={styles.subtitle}>
            Configure and preview how the terminal communicates critical session data to your mobile device.
          </Text>
        </View>

        <PermissionCard
          isSaving={isSaving}
          onRequestPermission={handlePermissionRequest}
          permissionLabel={permissionLabel}
          status={settings.permissionStatus}
        />

        <AlertPreview settings={settings} />

        <View style={styles.sectionCard}>
          <SectionHeader kicker="ACTIVE PROTOCOL" title="Daily Mission Reminder" />
          <ReminderRow
            description="Mission Briefing Ready"
            enabled={settings.dailyReminderEnabled}
            onTimeChange={(dailyReminderTime) => applyUpdates({ dailyReminderTime }, 'daily')}
            onToggle={(dailyReminderEnabled) => applyUpdates({ dailyReminderEnabled }, 'daily')}
            time={settings.dailyReminderTime}
          />
          <Text style={styles.reminderCopy}>Check today's trading mission before you enter the market.</Text>
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader isLocked={!isPro} isPro title="Session Start Reminder" />
          <ReminderRow
            description="Session Starting"
            disabled={!isPro}
            enabled={isPro && settings.sessionReminderEnabled}
            onTimeChange={(sessionReminderTime) => applyUpdates({ sessionReminderTime }, 'session')}
            onToggle={(sessionReminderEnabled) => applyUpdates({ sessionReminderEnabled }, 'session')}
            time={settings.sessionReminderTime}
          />
          <Text style={styles.reminderCopy}>
            Your trading window is opening. Stay patient and follow the plan.
          </Text>
          {!isPro && <ProLockedState onUnlock={handleUnlockPro} />}
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader isLocked={!isPro} isPro title="Debrief Reminder" />
          <ReminderRow
            description="Complete Your Debrief"
            disabled={!isPro}
            enabled={isPro && settings.debriefReminderEnabled}
            onTimeChange={(debriefReminderTime) => applyUpdates({ debriefReminderTime }, 'debrief')}
            onToggle={(debriefReminderEnabled) => applyUpdates({ debriefReminderEnabled }, 'debrief')}
            time={settings.debriefReminderTime}
          />
          <Text style={styles.reminderCopy}>
            Log what happened, score your discipline, and close the session right.
          </Text>
          {!isPro && <ProLockedState onUnlock={handleUnlockPro} />}
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader isLocked={!isPro} isPro title="Advanced Notifications" />
          <AdvancedToggle
            disabled={!isPro}
            enabled={isPro && settings.missedDebriefReminderEnabled}
            label="Missed Debrief Reminder"
            onValueChange={(missedDebriefReminderEnabled) =>
              applyUpdates({ missedDebriefReminderEnabled }, 'missedDebrief')
            }
          />
          <AdvancedToggle
            disabled={!isPro}
            enabled={isPro && settings.disciplineResetReminderEnabled}
            label="Discipline Reset Reminder"
            onValueChange={(disciplineResetReminderEnabled) =>
              applyUpdates({ disciplineResetReminderEnabled }, 'disciplineReset')
            }
          />
          <AdvancedToggle
            disabled={!isPro}
            enabled={isPro && settings.weeklyRecapEnabled}
            label="Weekly Performance Recap"
            onValueChange={(weeklyRecapEnabled) => applyUpdates({ weeklyRecapEnabled }, 'weeklyRecap')}
          />
          {!isPro && <ProLockedState onUnlock={handleUnlockPro} compact />}
        </View>

        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>DEVICE TIMEZONE</Text>
          <Text style={styles.metaValue}>{settings.timezone}</Text>
        </View>

        {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PermissionCard({
  isSaving,
  onRequestPermission,
  permissionLabel,
  status,
}: {
  isSaving: boolean;
  onRequestPermission: () => void;
  permissionLabel: string;
  status: NotificationSettings['permissionStatus'];
}) {
  const isGranted = status === 'granted';

  return (
    <View style={[styles.permissionCard, isGranted && styles.permissionCardGranted]}>
      <View>
        <Text style={styles.cardEyebrow}>DEVICE LINK</Text>
        <Text style={styles.permissionTitle}>Permission Status</Text>
        <Text style={[styles.permissionStatus, isGranted && styles.permissionStatusGranted]}>{permissionLabel}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={isSaving || isGranted}
        onPress={onRequestPermission}
        style={({ pressed }) => [
          styles.primaryButton,
          (isSaving || isGranted) && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>{isGranted ? 'ENABLED' : 'ENABLE NOTIFICATIONS'}</Text>
      </Pressable>
    </View>
  );
}

function AlertPreview({ settings }: { settings: NotificationSettings }) {
  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewKicker}>LOCK SCREEN BRIEFING</Text>
      <View style={styles.previewContent}>
        <View style={styles.previewIcon}>
          <Text style={styles.previewIconText}>◎</Text>
        </View>
        <View style={styles.previewTextBlock}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewEyebrow}>MISSION BRIEFING</Text>
            <Text style={styles.previewNow}>Now</Text>
          </View>
          <Text style={styles.previewTitle}>Mission Briefing Ready</Text>
          <Text style={styles.previewBody}>
            Check today's trading mission before you enter the market at {settings.dailyReminderTime}.
          </Text>
        </View>
        <Text style={styles.previewChevron}>›</Text>
      </View>
    </View>
  );
}

function SectionHeader({
  isLocked,
  isPro,
  kicker,
  title,
}: {
  isLocked?: boolean;
  isPro?: boolean;
  kicker?: string;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        {kicker ? <Text style={styles.cardEyebrow}>{kicker}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {isPro ? (
        <View style={styles.lockBadge}>
          <Text style={styles.lockBadgeText}>{isLocked ? 'PRO LOCK' : 'PRO'}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ReminderRow({
  description,
  disabled,
  enabled,
  onTimeChange,
  onToggle,
  time,
}: {
  description: string;
  disabled?: boolean;
  enabled: boolean;
  onTimeChange: (time: string) => void;
  onToggle: (enabled: boolean) => void;
  time: string;
}) {
  const [draftTime, setDraftTime] = useState(time);

  useEffect(() => {
    setDraftTime(time);
  }, [time]);

  function commitTime() {
    if (isValidTime(draftTime) && draftTime !== time) {
      onTimeChange(draftTime);
    } else {
      setDraftTime(time);
    }
  }

  return (
    <View style={styles.reminderRow}>
      <View style={styles.reminderMain}>
        <Text style={[styles.reminderTitle, disabled && styles.lockedText]}>{description}</Text>
        <TextInput
          accessibilityLabel={`${description} time`}
          editable={!disabled}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          onBlur={commitTime}
          onChangeText={setDraftTime}
          placeholder="06:30"
          placeholderTextColor="#5b6263"
          style={[styles.timeInput, disabled && styles.timeInputDisabled]}
          value={draftTime}
        />
      </View>
      <Switch
        disabled={disabled}
        ios_backgroundColor={inactiveTrackColor}
        onValueChange={onToggle}
        thumbColor={enabled ? activeThumbColor : inactiveThumbColor}
        trackColor={{ false: inactiveTrackColor, true: activeTrackColor }}
        value={enabled}
      />
    </View>
  );
}

function AdvancedToggle({
  disabled,
  enabled,
  label,
  onValueChange,
}: {
  disabled?: boolean;
  enabled: boolean;
  label: string;
  onValueChange: (enabled: boolean) => void;
}) {
  return (
    <View style={styles.advancedRow}>
      <Text style={[styles.advancedLabel, disabled && styles.lockedText]}>{label}</Text>
      <Switch
        disabled={disabled}
        ios_backgroundColor={inactiveTrackColor}
        onValueChange={onValueChange}
        thumbColor={enabled ? activeThumbColor : inactiveThumbColor}
        trackColor={{ false: inactiveTrackColor, true: activeTrackColor }}
        value={enabled}
      />
    </View>
  );
}

function ProLockedState({ compact, onUnlock }: { compact?: boolean; onUnlock: () => void }) {
  return (
    <View style={[styles.proLockedState, compact && styles.compactLockedState]}>
      <View style={styles.lockCopy}>
        <Text style={styles.lockTitle}>PROTOCOL LOCKED</Text>
        <Text style={styles.lockDescription}>Upgrade to Pro to activate this reminder channel.</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onUnlock}
        style={({ pressed }) => [styles.unlockButton, pressed && styles.buttonPressed]}
      >
        <Text style={styles.unlockButtonText}>UNLOCK PRO</Text>
      </Pressable>
    </View>
  );
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#070c14',
    flex: 1,
  },
  scroll: {
    backgroundColor: '#070c14',
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  backButtonPlaceholder: {
    height: 32,
    width: 32,
  },
  backButtonText: {
    color: '#e9c176',
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 30,
  },
  topBarTitle: {
    color: '#e9c176',
    flex: 1,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginHorizontal: 8,
  },
  statusDot: {
    backgroundColor: '#e9c176',
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 12,
  },
  subtitle: {
    color: '#d8d2c7',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 23,
  },
  bodyCopy: {
    color: '#d8d2c7',
    fontSize: 15,
    lineHeight: 23,
  },
  permissionCard: {
    backgroundColor: '#11181a',
    borderColor: '#2b3334',
    borderLeftColor: '#e9c176',
    borderLeftWidth: 3,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    marginBottom: 24,
    padding: 18,
  },
  permissionCardGranted: {
    borderLeftColor: '#79d284',
  },
  cardEyebrow: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  permissionTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  permissionStatus: {
    color: '#e9c176',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  permissionStatusGranted: {
    color: '#79d284',
  },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#e9c176',
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#070c14',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  previewCard: {
    marginBottom: 24,
  },
  previewKicker: {
    color: '#d8d2c7',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginBottom: 12,
  },
  previewContent: {
    alignItems: 'center',
    backgroundColor: '#181d20',
    borderColor: '#2b3334',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  previewIcon: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    borderRadius: 4,
    height: 44,
    justifyContent: 'center',
    width: 32,
  },
  previewIconText: {
    color: '#070c14',
    fontSize: 18,
    fontWeight: '900',
  },
  previewTextBlock: {
    flex: 1,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  previewEyebrow: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  previewNow: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '900',
  },
  previewTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  previewBody: {
    color: '#f8fafc',
    fontSize: 13,
    lineHeight: 18,
  },
  previewChevron: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#14191a',
    borderColor: '#272f31',
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  sectionHeader: {
    alignItems: 'flex-start',
    borderBottomColor: '#242b2d',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 12,
  },
  sectionTitle: {
    color: '#e9c176',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  lockBadge: {
    backgroundColor: 'rgba(233, 193, 118, 0.1)',
    borderColor: 'rgba(233, 193, 118, 0.5)',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  lockBadgeText: {
    color: '#e9c176',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  reminderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  reminderMain: {
    flex: 1,
  },
  reminderTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  timeInput: {
    backgroundColor: '#080c0d',
    borderColor: '#7f7b71',
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
    height: 42,
    paddingHorizontal: 10,
    width: 110,
  },
  timeInputDisabled: {
    borderColor: '#30383a',
    color: '#777f80',
  },
  reminderCopy: {
    color: '#d8d2c7',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 12,
  },
  advancedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  advancedLabel: {
    color: '#f8fafc',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    paddingRight: 12,
  },
  lockedText: {
    color: '#777f80',
  },
  proLockedState: {
    alignItems: 'center',
    backgroundColor: '#101416',
    borderColor: 'rgba(233, 193, 118, 0.25)',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    padding: 12,
  },
  compactLockedState: {
    marginTop: 10,
  },
  lockCopy: {
    flex: 1,
  },
  lockTitle: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  lockDescription: {
    color: '#a9aaa4',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  unlockButton: {
    alignItems: 'center',
    borderColor: '#e9c176',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
  },
  unlockButtonText: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  metaCard: {
    backgroundColor: '#101416',
    borderColor: '#272f31',
    borderWidth: 1,
    marginTop: 4,
    padding: 14,
  },
  metaLabel: {
    color: '#8a8f93',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  metaValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },
  statusMessage: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 14,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
