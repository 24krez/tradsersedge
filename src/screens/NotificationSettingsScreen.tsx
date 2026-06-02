import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';

import { AlertSettings, useAuth, useIsPro } from '../contexts/AuthContext';
import { syncAlertSchedules } from '../services/alertScheduler';
import { defaultAlertSettings, updateUserProfile } from '../services/userProfile';
import { requestNotificationPermission, NotificationPermissionStatus } from '../services/notificationSettings';

type NotificationSettingsScreenProps = {
  onBack?: () => void;
};

const activeTrackColor = '#cda35a';
const inactiveTrackColor = '#2b3334';
const activeThumbColor = '#f1c977';
const inactiveThumbColor = '#b8b6ad';

export function NotificationSettingsScreen({ onBack }: NotificationSettingsScreenProps) {
  const { user, userProfile } = useAuth();
  const isPro = useIsPro();
  
  // Local state to hold settings while editing
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>('undetermined');

  useEffect(() => {
    Notifications.getPermissionsAsync().then((status) => {
      setPermissionStatus(status.status === 'granted' || status.status === 'denied' ? status.status : 'undetermined');
    });
  }, []);

  const permissionLabel = permissionStatus.toUpperCase();

  async function handlePermissionRequest() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const newStatus = await requestNotificationPermission();
      setPermissionStatus(newStatus);
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (userProfile) {
      setSettings(userProfile.alertSettings || defaultAlertSettings);
    }
  }, [userProfile]);

  if (!userProfile || !settings) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator color="#e9c176" />
        </View>
      </SafeAreaView>
    );
  }

  // Handle nested updates
  const updateSettingGroup = async <K extends keyof AlertSettings>(
    group: K,
    updates: Partial<AlertSettings[K]>
  ) => {
    if (!user || isSaving) return;
    
    setIsSaving(true);
    
    const newGroup = { ...settings[group], ...updates };
    const newSettings = { ...settings, [group]: newGroup };
    
    // Optimistic update
    setSettings(newSettings);
    
    try {
      await updateUserProfile(user.uid, { alertSettings: newSettings });
      await syncAlertSchedules(user.uid, newSettings);
    } catch (error) {
      console.error('Failed to update alert settings:', error);
      // Revert on failure
      setSettings(settings); 
    } finally {
      setIsSaving(false);
    }
  };

  function handleProUpsell() {
    Alert.alert('PRO REQUIRED', 'Upgrade to Pro to unlock advanced alerts and customizations.', [
      { text: 'Not Now', style: 'cancel' },
      { text: 'Unlock Pro', onPress: () => console.log('TODO: Present RevenueCat paywall') },
    ]);
  }

  const handleEnableBehavioral = async () => {
    const updates = isPro 
      ? { missionStatusWarnings: true, highRiskAlerts: true, lockedInRecognition: true, cautionAlerts: true }
      : { missionStatusWarnings: true };
    await updateSettingGroup('behavioral', updates);
  };

  const handleEnableMission = async () => {
    const updates = isPro
      ? { missionStart: true, midSessionCheckIn: true, missionComplete: true, fifteenMinutesToClose: true, volatilityAlerts: true, debriefReminder: true }
      : { missionStart: true, missionComplete: true };
    await updateSettingGroup('mission', updates);
  };

  const handleEnableIntelligence = async () => {
    if (!isPro) {
      handleProUpsell();
      return;
    }
    const updates = { weeklyIntelligenceReport: true, behavioralPatternReports: true, monthlyPerformanceSummary: true, rankPromotionAlerts: true };
    await updateSettingGroup('intelligence', updates);
  };

  const handleEnableLockScreen = async () => {
    const updates = isPro
      ? { missionBriefings: true, lockScreenCoaching: true, nookMonitoring: true, liveActivityUpdates: true }
      : { missionBriefings: true, nookMonitoring: true };
    await updateSettingGroup('lockScreen', updates);
  };

  const handleEnableQuietHours = async () => {
    await updateSettingGroup('quietHours', { enabled: true });
  };

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
          status={permissionStatus}
        />

        <AlertPreview />

        {/* BEHAVIORAL ALERTS */}
        <View style={styles.sectionCard}>
          <SectionHeader 
            title="BEHAVIORAL ALERTS" 
            actionLabel={isPro ? "ENABLE ALL" : "ENABLE FREE"}
            onAction={handleEnableBehavioral}
          />
          <ToggleRow
            label="Mission Status Warnings"
            value={settings.behavioral.missionStatusWarnings}
            onToggle={(val) => updateSettingGroup('behavioral', { missionStatusWarnings: val })}
          />
          <ToggleRow
            label="High Risk Alerts"
            value={settings.behavioral.highRiskAlerts}
            onToggle={(val) => updateSettingGroup('behavioral', { highRiskAlerts: val })}
            isProOnly
            isProUser={isPro}
            onProUpsell={handleProUpsell}
          />
          <ToggleRow
            label="Locked In Recognition"
            value={settings.behavioral.lockedInRecognition}
            onToggle={(val) => updateSettingGroup('behavioral', { lockedInRecognition: val })}
            isProOnly
            isProUser={isPro}
            onProUpsell={handleProUpsell}
          />
          <ToggleRow
            label="Caution Alerts"
            value={settings.behavioral.cautionAlerts}
            onToggle={(val) => updateSettingGroup('behavioral', { cautionAlerts: val })}
            isProOnly
            isProUser={isPro}
            onProUpsell={handleProUpsell}
          />
        </View>

        {/* MISSION ALERTS */}
        <View style={styles.sectionCard}>
          <SectionHeader 
            title="MISSION ALERTS" 
            actionLabel={isPro ? "ENABLE ALL" : "ENABLE FREE"}
            onAction={handleEnableMission}
          />
          <ToggleRow
            label="Mission Start"
            value={settings.mission.missionStart}
            onToggle={(val) => updateSettingGroup('mission', { missionStart: val })}
          />
          <ToggleRow
            label="Mid-Session Check-In"
            value={settings.mission.midSessionCheckIn}
            onToggle={(val) => updateSettingGroup('mission', { midSessionCheckIn: val })}
            isProOnly
            isProUser={isPro}
            onProUpsell={handleProUpsell}
          />
          <ToggleRow
            label="Mission Complete"
            value={settings.mission.missionComplete}
            onToggle={(val) => updateSettingGroup('mission', { missionComplete: val })}
          />
          <ToggleRow
            label="15 Minutes to Close"
            value={settings.mission.fifteenMinutesToClose}
            onToggle={(val) => updateSettingGroup('mission', { fifteenMinutesToClose: val })}
            isProOnly
            isProUser={isPro}
            onProUpsell={handleProUpsell}
          />
          <ToggleRow
            label="Volatility Alerts"
            value={settings.mission.volatilityAlerts}
            onToggle={(val) => updateSettingGroup('mission', { volatilityAlerts: val })}
            isProOnly
            isProUser={isPro}
            onProUpsell={handleProUpsell}
          />
          <ToggleRow
            label="Debrief Reminder"
            value={settings.mission.debriefReminder}
            onToggle={(val) => updateSettingGroup('mission', { debriefReminder: val })}
            isProOnly
            isProUser={isPro}
            onProUpsell={handleProUpsell}
          />
        </View>

        {/* INTELLIGENCE REPORTS */}
        <View style={styles.sectionCard}>
          <SectionHeader 
            title="INTELLIGENCE REPORTS" 
            actionLabel={isPro ? "ENABLE ALL" : "UNLOCK PRO"}
            onAction={handleEnableIntelligence}
          />
          <ToggleRow
            label="Weekly Intelligence Report"
            value={settings.intelligence.weeklyIntelligenceReport}
            onToggle={(val) => updateSettingGroup('intelligence', { weeklyIntelligenceReport: val })}
            isProOnly
            isProUser={isPro}
            onProUpsell={handleProUpsell}
          />
          <ToggleRow
            label="Behavioral Pattern Reports"
            value={settings.intelligence.behavioralPatternReports}
            onToggle={(val) => updateSettingGroup('intelligence', { behavioralPatternReports: val })}
            isProOnly
            isProUser={isPro}
            onProUpsell={handleProUpsell}
          />
          <ToggleRow
            label="Monthly Performance Summary"
            value={settings.intelligence.monthlyPerformanceSummary}
            onToggle={(val) => updateSettingGroup('intelligence', { monthlyPerformanceSummary: val })}
            isProOnly
            isProUser={isPro}
            onProUpsell={handleProUpsell}
          />
          <ToggleRow
            label="Rank Promotion Alerts"
            value={settings.intelligence.rankPromotionAlerts}
            onToggle={(val) => updateSettingGroup('intelligence', { rankPromotionAlerts: val })}
            isProOnly
            isProUser={isPro}
            onProUpsell={handleProUpsell}
          />
        </View>

        {/* LOCK SCREEN & NOOK */}
        <View style={styles.sectionCard}>
          <SectionHeader 
            title="LOCK SCREEN & NOOK" 
            actionLabel={isPro ? "ENABLE ALL" : "ENABLE FREE"}
            onAction={handleEnableLockScreen}
          />
          <ToggleRow
            label="Mission Briefings"
            value={settings.lockScreen.missionBriefings}
            onToggle={(val) => updateSettingGroup('lockScreen', { missionBriefings: val })}
          />
          <ToggleRow
            label="Lock Screen Coaching"
            value={settings.lockScreen.lockScreenCoaching}
            onToggle={(val) => updateSettingGroup('lockScreen', { lockScreenCoaching: val })}
            isProOnly
            isProUser={isPro}
            onProUpsell={handleProUpsell}
          />
          <ToggleRow
            label="Nook Monitoring"
            value={settings.lockScreen.nookMonitoring}
            onToggle={(val) => updateSettingGroup('lockScreen', { nookMonitoring: val })}
          />
          <ToggleRow
            label="Live Activity Updates"
            value={settings.lockScreen.liveActivityUpdates}
            onToggle={(val) => updateSettingGroup('lockScreen', { liveActivityUpdates: val })}
            isProOnly
            isProUser={isPro}
            onProUpsell={handleProUpsell}
          />
        </View>

        {/* COACHING DELIVERY */}
        <View style={styles.sectionCard}>
          <SectionHeader 
            title="COACHING DELIVERY" 
            actionLabel={isPro ? "CUSTOMIZE" : "CUSTOMIZE PRO"}
            onAction={isPro ? undefined : handleProUpsell} // Only Free users have action here to open upsell modal if they tap header action
          />
          
          <Text style={styles.groupLabel}>COACHING STYLE</Text>
          <View style={styles.buttonGrid}>
            <OptionButton 
              label="OPERATOR" 
              selected={settings.coaching.style === 'operator'}
              onPress={() => updateSettingGroup('coaching', { style: 'operator' })}
            />
            <OptionButton 
              label="COACH" 
              selected={settings.coaching.style === 'coach'}
              onPress={() => updateSettingGroup('coaching', { style: 'coach' })}
              isProOnly
              isProUser={isPro}
              onProUpsell={handleProUpsell}
            />
            <OptionButton 
              label="DIRECT" 
              selected={settings.coaching.style === 'direct'}
              onPress={() => updateSettingGroup('coaching', { style: 'direct' })}
              isProOnly
              isProUser={isPro}
              onProUpsell={handleProUpsell}
            />
            <OptionButton 
              label="MINIMAL" 
              selected={settings.coaching.style === 'minimal'}
              onPress={() => updateSettingGroup('coaching', { style: 'minimal' })}
              isProOnly
              isProUser={isPro}
              onProUpsell={handleProUpsell}
            />
          </View>

          <Text style={[styles.groupLabel, { marginTop: 24 }]}>COACHING FREQUENCY</Text>
          <View style={styles.buttonRow}>
            <OptionButton 
              label="LOW" 
              selected={settings.coaching.frequency === 'low'}
              onPress={() => updateSettingGroup('coaching', { frequency: 'low' })}
              style={{ flex: 1 }}
            />
            <OptionButton 
              label="MEDIUM" 
              selected={settings.coaching.frequency === 'medium'}
              onPress={() => updateSettingGroup('coaching', { frequency: 'medium' })}
              style={{ flex: 1 }}
              isProOnly
              isProUser={isPro}
              onProUpsell={handleProUpsell}
            />
            <OptionButton 
              label="HIGH" 
              selected={settings.coaching.frequency === 'high'}
              onPress={() => updateSettingGroup('coaching', { frequency: 'high' })}
              style={{ flex: 1 }}
              isProOnly
              isProUser={isPro}
              onProUpsell={handleProUpsell}
            />
          </View>
        </View>

        {/* QUIET HOURS */}
        <View style={styles.sectionCard}>
          <View style={styles.quietHoursHeaderRow}>
            <Text style={styles.sectionTitle}>QUIET HOURS</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable onPress={handleEnableQuietHours} style={styles.headerActionButton}>
                <Text style={styles.headerActionText}>ENABLE</Text>
              </Pressable>
              <Switch
                ios_backgroundColor={inactiveTrackColor}
                onValueChange={(val) => updateSettingGroup('quietHours', { enabled: val })}
                thumbColor={settings.quietHours.enabled ? activeThumbColor : inactiveThumbColor}
                trackColor={{ false: inactiveTrackColor, true: activeTrackColor }}
                value={settings.quietHours.enabled}
              />
            </View>
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>START TIME</Text>
              <TextInput
                style={styles.timeInput}
                value={settings.quietHours.startTime}
                onChangeText={(val) => updateSettingGroup('quietHours', { startTime: val })}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>END TIME</Text>
              <TextInput
                style={styles.timeInput}
                value={settings.quietHours.endTime}
                onChangeText={(val) => updateSettingGroup('quietHours', { endTime: val })}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>

          <Text style={styles.quietHoursCopy}>
            SYSTEM OVERRIDE: ALERTS WILL BE SUPPRESSED EXCEPT FOR HIGH-PRIORITY BEHAVIORAL WARNINGS DURING THIS WINDOW.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ 
  title, 
  actionLabel, 
  onAction 
}: { 
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} style={styles.headerActionButton}>
          <Text style={styles.headerActionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
  isProOnly,
  isProUser,
  onProUpsell,
}: {
  label: string;
  value: boolean;
  onToggle: (val: boolean) => void;
  isProOnly?: boolean;
  isProUser?: boolean;
  onProUpsell?: () => void;
}) {
  const disabled = isProOnly && !isProUser;

  const handleToggle = (val: boolean) => {
    if (disabled && onProUpsell) {
      onProUpsell();
    } else {
      onToggle(val);
    }
  };

  return (
    <View style={styles.advancedRow}>
      <View style={styles.advancedLabelContainer}>
        <Text style={[styles.advancedLabel, disabled && styles.lockedText]}>{label}</Text>
        {isProOnly && (
          <View style={styles.proPill}>
            <Text style={styles.proPillText}>PRO</Text>
          </View>
        )}
      </View>
      <Switch
        disabled={false}
        ios_backgroundColor={inactiveTrackColor}
        onValueChange={handleToggle}
        thumbColor={value && !disabled ? activeThumbColor : inactiveThumbColor}
        trackColor={{ false: inactiveTrackColor, true: activeTrackColor }}
        value={value && !disabled}
      />
      {disabled && (
        <Pressable style={StyleSheet.absoluteFill} onPress={onProUpsell} />
      )}
    </View>
  );
}

function OptionButton({ 
  label, 
  selected, 
  onPress,
  style,
  isProOnly,
  isProUser,
  onProUpsell,
}: { 
  label: string; 
  selected: boolean; 
  onPress: () => void;
  style?: any;
  isProOnly?: boolean;
  isProUser?: boolean;
  onProUpsell?: () => void;
}) {
  const disabled = isProOnly && !isProUser;

  const handlePress = () => {
    if (disabled && onProUpsell) {
      onProUpsell();
    } else {
      onPress();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.optionButton,
        selected && !disabled ? styles.optionButtonSelected : styles.optionButtonUnselected,
        disabled && styles.optionButtonDisabled,
        style
      ]}
    >
      <View style={styles.optionContent}>
        <Text style={[
          styles.optionButtonText,
          selected && !disabled ? styles.optionTextSelected : styles.optionTextUnselected,
          disabled && styles.lockedText
        ]}>
          {label}
        </Text>
        {isProOnly && <Text style={styles.optionProLock}> 🔒</Text>}
      </View>
    </Pressable>
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
  status: NotificationPermissionStatus;
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

function AlertPreview() {
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
            Check today's trading mission before you enter the market.
          </Text>
        </View>
        <Text style={styles.previewChevron}>›</Text>
      </View>
    </View>
  );
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
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.7,
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
    alignItems: 'center',
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
  headerActionButton: {
    backgroundColor: 'rgba(233, 193, 118, 0.1)',
    borderColor: 'rgba(233, 193, 118, 0.3)',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerActionText: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  advancedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  advancedLabelContainer: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingRight: 12,
  },
  advancedLabel: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  lockedText: {
    color: '#777f80',
  },
  proPill: {
    backgroundColor: 'rgba(233, 193, 118, 0.1)',
    borderColor: 'rgba(233, 193, 118, 0.4)',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proPillText: {
    color: '#e9c176',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  groupLabel: {
    color: '#d8d2c7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    alignItems: 'center',
    borderColor: '#2b3334',
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: '48%',
  },
  optionButtonSelected: {
    backgroundColor: '#e9c176',
    borderColor: '#e9c176',
  },
  optionButtonUnselected: {
    backgroundColor: 'transparent',
  },
  optionButtonDisabled: {
    backgroundColor: 'transparent',
    borderColor: '#1a1f20',
  },
  optionContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  optionButtonText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  optionTextSelected: {
    color: '#070c14',
  },
  optionTextUnselected: {
    color: '#e9c176',
  },
  optionProLock: {
    fontSize: 10,
  },
  quietHoursHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    color: '#d8d2c7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  timeInput: {
    backgroundColor: '#080c0d',
    borderColor: '#2b3334',
    borderWidth: 1,
    color: '#e9c176',
    fontSize: 14,
    fontWeight: '800',
    height: 44,
    paddingHorizontal: 12,
  },
  quietHoursCopy: {
    color: '#777f80',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    lineHeight: 14,
    marginTop: 8,
  },
});
