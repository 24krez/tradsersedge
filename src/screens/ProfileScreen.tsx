import { signOut } from 'firebase/auth';
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { firebaseAuth, firestore } from '../services/firebase';
import { calculateRankProgression } from '../logic/rankProgression';
import { syncAlertSchedules } from '../services/alertScheduler';
import { NotificationSettingsScreen } from './NotificationSettingsScreen';
import { LockScreenBriefingScreen } from './LockScreenBriefingScreen';
import { buildProgressModel, DebriefRecord, MissionRecord, UserStats } from './ProgressScreen';

export function ProfileScreen() {
  const { t } = useTranslation('profile');
  const { user, userProfile } = useAuth();

  const [callsign, setCallsign] = useState('');
  const [motto, setMotto] = useState('');
  const [activeCallsign, setActiveCallsign] = useState('');
  const [tradingStartTime, setTradingStartTime] = useState('09:30');
  const [tradingEndTime, setTradingEndTime] = useState('16:00');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [missions, setMissions] = useState<MissionRecord[]>([]);
  const [debriefs, setDebriefs] = useState<DebriefRecord[]>([]);
  const [hasLoadedStats, setHasLoadedStats] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const hasChanges =
    callsign.trim() !== (userProfile?.callsign || '') ||
    motto.trim() !== (userProfile?.motto || '') ||
    activeCallsign.trim() !== (userProfile?.activeCallsign || '') ||
    tradingStartTime.trim() !== (userProfile?.tradingStartTime || '09:30') ||
    tradingEndTime.trim() !== (userProfile?.tradingEndTime || '16:00');
  const [isShowingNotifications, setIsShowingNotifications] = useState(false);
  const [isShowingBriefing, setIsShowingBriefing] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setCallsign(userProfile.callsign || '');
      setMotto(userProfile.motto || '');
      setActiveCallsign(userProfile.activeCallsign || '');
      setTradingStartTime(userProfile.tradingStartTime || '09:30');
      setTradingEndTime(userProfile.tradingEndTime || '16:00');
    }
  }, [userProfile]);

  useEffect(() => {
    if (!user) {
      setUserStats(null);
      setMissions([]);
      setDebriefs([]);
      setHasLoadedStats(true);
      return;
    }

    const unsubStats = onSnapshot(
      doc(firestore, 'user_stats', user.uid),
      (snapshot) => {
        setUserStats(snapshot.exists() ? (snapshot.data() as UserStats) : null);
        setHasLoadedStats(true);
      },
      (error) => {
        console.error('Error loading profile stats:', error);
        setUserStats(null);
        setHasLoadedStats(true);
      },
    );

    const missionsQuery = query(
      collection(firestore, 'missions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(100),
    );

    const unsubMissions = onSnapshot(missionsQuery, (snapshot) => {
      setMissions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MissionRecord)));
    });

    const debriefsQuery = query(
      collection(firestore, 'mission_debriefs'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(100),
    );

    const unsubDebriefs = onSnapshot(debriefsQuery, (snapshot) => {
      setDebriefs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DebriefRecord)));
    });

    return () => {
      unsubStats();
      unsubMissions();
      unsubDebriefs();
    };
  }, [user]);

  async function handleSave() {
    if (!user || saveStatus === 'saving' || !hasChanges) return;
    
    const trimmedCallsign = callsign.trim();
    const trimmedMotto = motto.trim();
    const trimmedActive = activeCallsign.trim();
    const trimmedStart = tradingStartTime.trim() || '09:30';
    const trimmedEnd = tradingEndTime.trim() || '16:00';

    // Validate time format
    const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(trimmedStart) || !timeRegex.test(trimmedEnd)) {
      Alert.alert('INVALID TIME', 'Use HH:MM format (e.g. 09:30 or 16:00).');
      return;
    }

    setSaveStatus('saving');
    try {
      await updateDoc(doc(firestore, 'users', user.uid), {
        callsign: trimmedCallsign,
        motto: trimmedMotto,
        activeCallsign: trimmedActive,
        tradingStartTime: trimmedStart,
        tradingEndTime: trimmedEnd,
      });

      // Sync alert schedules with the new trading times
      if (userProfile?.alertSettings) {
        await syncAlertSchedules(user.uid, userProfile.alertSettings, {
          tradingStartTime: trimmedStart,
          tradingEndTime: trimmedEnd,
        });
        console.log('[ProfileScreen] Alert schedules synced with new trading window:', trimmedStart, '→', trimmedEnd);
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Error saving profile:', e);
      setSaveStatus('idle');
    }
  }

  async function handleSignOut() {
    try {
      await signOut(firebaseAuth);
    } catch (e) {
      console.error('Error signing out:', e);
    }
  }

  if (isShowingNotifications) {
    return <NotificationSettingsScreen onBack={() => setIsShowingNotifications(false)} />;
  }

  if (isShowingBriefing) {
    return (
      <LockScreenBriefingScreen
        onBack={() => setIsShowingBriefing(false)}
        onNavigateToActiveProtocols={() => {
          setIsShowingBriefing(false);
          setIsShowingNotifications(true);
        }}
      />
    );
  }

  const progress = buildProgressModel(userStats, missions, debriefs);
  const rank = calculateRankProgression({
    averageDisciplineScore: progress.averageScore,
    completedMissions: progress.completedMissions,
    currentStreak: progress.currentStreak,
  });
  const remainingRequirement = rank.requirementsRemaining.length > 0
    ? rank.requirementsRemaining[0]
    : 'Rank requirements complete';

  const displayCallsign = activeCallsign || callsign || 'OPERATOR';
  const displayRank = rank.currentRank || 'Recruit';
  const displayScore = progress.completedMissions > 0 ? progress.averageScore : '--';
  const displayStreak = progress.currentStreak || 0;

  const predefinedCallsigns = ['RAVEN', 'GHOST', 'ATLAS', 'SENTINEL', 'GOAT'];
  const customCallsign = callsign.trim().toUpperCase();
  const activeOptions = [...predefinedCallsigns];
  if (customCallsign && !activeOptions.includes(customCallsign)) {
    activeOptions.push(customCallsign);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Page Header */}
        <View style={styles.header}>
          <Text style={styles.title}>OPERATOR DOSSIER</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {userProfile?.subscriptionTier === 'founder' 
                ? t('founderBadge') 
                : userProfile?.subscriptionTier?.toUpperCase() || 'FREE'}
            </Text>
          </View>
        </View>

        {/* Dossier Header Card */}
        <View style={styles.dossierCard}>
          <View style={styles.dossierTop}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>TE</Text>
            </View>
            <View style={styles.dossierTitles}>
              <Text style={styles.dossierCallsign}>{displayCallsign.toUpperCase()}</Text>
              <Text style={styles.dossierRank}>{displayRank.toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.dossierStatsDivider} />
          
          <View style={styles.dossierStatsRow}>
            <View style={styles.dossierStatBlock}>
              <Text style={styles.dossierStatLabel}>DISCIPLINE SCORE</Text>
              <View style={styles.dossierScoreRow}>
                <Text style={styles.dossierStatValue}>{displayScore}</Text>
                {displayScore !== '--' && <Text style={styles.dossierScoreSuffix}>/100</Text>}
              </View>
            </View>
            <View style={styles.dossierStatBlock}>
              <Text style={styles.dossierStatLabel}>STREAK</Text>
              <View style={styles.dossierScoreRow}>
                <Text style={styles.dossierStatValue}>{displayStreak}</Text>
                <Text style={styles.dossierScoreSuffix}>DAYS</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.dossierPromoBox}>
            <View style={styles.rankHeaderRow}>
              <Text style={styles.dossierPromoLabel}>FIELD RANK PROGRESSION</Text>
              <Text style={styles.rankPercentText}>{rank.progressPercentage}%</Text>
            </View>
            <View style={styles.rankTrack}>
              <View style={[styles.rankFill, { width: `${rank.progressPercentage}%` }]} />
            </View>
            <View style={styles.rankLabelsRow}>
              <Text style={styles.rankLabelText}>{rank.currentRank.toUpperCase()}</Text>
              {rank.nextRank && <Text style={styles.rankLabelText}>{rank.nextRank.toUpperCase()}</Text>}
            </View>
            <Text style={[styles.dossierPromoText, { marginTop: 12, color: '#e9c176' }]}>
              {remainingRequirement.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Editable Fields */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('callsignLabel')}</Text>
          <TextInput
            maxLength={9}
            onChangeText={setCallsign}
            placeholder={t('callsignPlaceholder')}
            placeholderTextColor="#4e4639"
            style={styles.input}
            value={callsign}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('mottoLabel')}</Text>
          <TextInput
            multiline
            onChangeText={setMotto}
            placeholder={t('mottoPlaceholder')}
            placeholderTextColor="#4e4639"
            style={[styles.input, styles.textArea]}
            value={motto}
          />
        </View>

        {/* Active Callsign */}
        <View style={styles.section}>
          <Text style={styles.label}>ACTIVE CALLSIGN</Text>
          <View style={styles.callsignGrid}>
            {activeOptions.map(opt => {
              const isActive = activeCallsign.toUpperCase() === opt;
              return (
                <Pressable 
                  key={opt}
                  style={[styles.callsignChip, isActive && styles.callsignChipActive]}
                  onPress={() => setActiveCallsign(opt)}
                >
                  <Text style={[styles.callsignChipText, isActive && styles.callsignChipTextActive]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Operator Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.statsSectionTitle}>CAREER STATISTICS</Text>
          {progress.completedMissions === 0 ? (
            <View style={styles.emptyStatsCard}>
              <Text style={styles.emptyStatsTitle}>NO MISSIONS RECORDED</Text>
              <Text style={styles.emptyStatsText}>
                Stats unlock after your first mission.
              </Text>
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <StatWidget label="MISSIONS COMPLETED" value={String(progress.completedMissions)} />
              <StatWidget label="HIGHEST DISCIPLINE SCORE" value={userStats?.bestDisciplineScore ? String(userStats.bestDisciplineScore) : '—'} />
              <StatWidget label="LONGEST STREAK" value={String(userStats?.longestStreak || 0)} />
              <StatWidget label="BEST GRADE" value={progress.completedMissions > 0 ? progress.grade : '—'} />
            </View>
          )}
        </View>

        {/* Trading Window */}
        <View style={styles.section}>
          <Text style={styles.statsSectionTitle}>TRADING WINDOW</Text>
          <View style={styles.tradingWindowCard}>
            <Text style={styles.tradingWindowHelper}>
              Set your active trading hours. Session reminders and debrief alerts will sync to this window.
            </Text>
            <View style={styles.tradingTimeRow}>
              <View style={styles.tradingTimeBlock}>
                <Text style={styles.tradingTimeLabel}>START TIME</Text>
                <TextInput
                  style={styles.tradingTimeInput}
                  value={tradingStartTime}
                  onChangeText={setTradingStartTime}
                  placeholder="09:30"
                  placeholderTextColor="#4e4639"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
              <View style={styles.tradingTimeDivider}>
                <Text style={styles.tradingTimeDividerText}>→</Text>
              </View>
              <View style={styles.tradingTimeBlock}>
                <Text style={styles.tradingTimeLabel}>END TIME</Text>
                <TextInput
                  style={styles.tradingTimeInput}
                  value={tradingEndTime}
                  onChangeText={setTradingEndTime}
                  placeholder="16:00"
                  placeholderTextColor="#4e4639"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            </View>
            <Text style={styles.tradingWindowNote}>
              DEBRIEF REMINDER FIRES 10 MIN BEFORE END TIME
            </Text>
          </View>
        </View>

        {/* Mission Parameters */}
        <View style={styles.section}>
          <Text style={styles.statsSectionTitle}>MISSION PARAMETERS</Text>
          <View style={styles.parametersCard}>
            <ParameterRow label="PRIMARY OBJECTIVE" value={progress.mostUsedObjective !== 'Not Enough Data' ? progress.mostUsedObjective.toUpperCase() : 'TAKE ONLY A+ SETUPS'} />
            <ParameterRow label="PRIMARY FOCUS" value={progress.mostUsedFocus !== 'Not Enough Data' ? progress.mostUsedFocus.toUpperCase() : 'DISCIPLINE'} />
            <ParameterRow label="STRONGEST BEHAVIOR" value={progress.strongestTraits[0] ? progress.strongestTraits[0].label.toUpperCase() : 'BUILDING PROFILE'} />
            <ParameterRow label="BIGGEST THREAT" value={progress.commonThreats[0] ? progress.commonThreats[0].label.toUpperCase() : 'NOT ENOUGH DATA'} isThreat />
            <ParameterRow label="DISCIPLINE RATE" value={progress.completedMissions > 0 ? `${progress.completionRate}%` : '—'} noBorder />
          </View>
        </View>

        {/* Mission Intelligence Protocols */}
        <View style={styles.section}>
          <Text style={styles.statsSectionTitle}>MISSION INTELLIGENCE PROTOCOLS</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsShowingNotifications(true)}
            style={({ pressed }) => [styles.alertsCard, pressed && styles.buttonPressed]}
          >
            <View style={styles.alertsContent}>
              <Text style={styles.alertsEyebrow}>ALERTS & AUTOMATION</Text>
              <Text style={styles.alertsTitle}>ACTIVE PROTOCOLS</Text>
            </View>
            <View style={styles.alertsActionColumn}>
              <Text style={styles.alertsActionText}>MANAGE</Text>
              <Text style={styles.alertsActionText}>ALERTS</Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => setIsShowingBriefing(true)}
            style={({ pressed }) => [styles.alertsCard, pressed && styles.buttonPressed, { marginTop: 12 }]}
          >
            <View style={styles.alertsContent}>
              <Text style={styles.alertsEyebrow}>LOCK SCREEN COACHING</Text>
              <Text style={styles.alertsTitle}>BRIEFING PREVIEW</Text>
            </View>
            <View style={styles.alertsActionColumn}>
              <Text style={styles.alertsActionText}>OPEN</Text>
            </View>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!hasChanges || saveStatus === 'saving'}
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveButton,
            (!hasChanges || saveStatus === 'saving') && styles.saveButtonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.saveButtonText, (!hasChanges || saveStatus === 'saving') && styles.saveButtonTextDisabled]}>
            {saveStatus === 'saving' ? t('saving') : saveStatus === 'saved' ? 'DOSSIER UPDATED' : 'SAVE DOSSIER'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.signOutText}>{t('signOutBtn')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatWidget({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statWidget}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ParameterRow({ label, value, isThreat, noBorder }: { label: string; value: string; isThreat?: boolean; noBorder?: boolean }) {
  return (
    <View style={[styles.parameterRow, !noBorder && styles.parameterRowBorder]}>
      <Text style={styles.parameterLabel}>{label}</Text>
      <Text style={[styles.parameterValue, isThreat && styles.parameterValueThreat]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#101415',
    flex: 1,
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 16,
  },
  title: {
    color: '#e9c176',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  badge: {
    backgroundColor: 'rgba(233, 193, 118, 0.1)',
    borderColor: 'rgba(233, 193, 118, 0.3)',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dossierCard: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderLeftColor: '#e9c176',
    borderLeftWidth: 3,
    borderWidth: 1,
    marginBottom: 32,
    padding: 20,
  },
  dossierTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    backgroundColor: '#0a0f10',
    borderColor: '#e9c176',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#e9c176',
    fontSize: 20,
    fontWeight: '900',
  },
  dossierTitles: {
    flex: 1,
  },
  dossierCallsign: {
    color: '#e9c176',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  dossierRank: {
    color: '#8a8f93',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  dossierStatsDivider: {
    backgroundColor: '#2a3135',
    height: 1,
    marginBottom: 16,
  },
  dossierStatsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dossierStatBlock: {
    flex: 1,
  },
  dossierStatLabel: {
    color: '#8a8f93',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  dossierScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dossierStatValue: {
    color: '#e9c176',
    fontSize: 24,
    fontWeight: '900',
  },
  dossierScoreSuffix: {
    color: '#e9c176',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
    opacity: 0.8,
  },
  dossierPromoBox: {
    backgroundColor: '#1b2022',
    borderRadius: 4,
    padding: 12,
  },
  dossierPromoLabel: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  dossierPromoText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  label: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#0a0f10',
    borderColor: '#2a3135',
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 14,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  textArea: {
    minHeight: 96,
    paddingTop: 16,
    paddingBottom: 16,
    textAlignVertical: 'top',
  },
  callsignGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  callsignChip: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '45%',
    flexGrow: 1,
  },
  callsignChipActive: {
    borderColor: '#e9c176',
  },
  callsignChipText: {
    color: '#8a8f93',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  callsignChipTextActive: {
    color: '#e9c176',
  },
  statsSection: {
    marginBottom: 32,
  },
  statsSectionTitle: {
    color: '#8a8f93',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statWidget: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    padding: 16,
    width: '48%',
  },
  statLabel: {
    color: '#8a8f93',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  statValue: {
    color: '#e9c176',
    fontSize: 20,
    fontWeight: '900',
  },
  emptyStatsCard: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    padding: 18,
  },
  emptyStatsTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyStatsText: {
    color: '#8a8f93',
    fontSize: 13,
    lineHeight: 19,
  },
  parametersCard: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    padding: 16,
  },
  parameterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  parameterRowBorder: {
    borderBottomColor: '#2a3135',
    borderBottomWidth: 1,
  },
  parameterLabel: {
    color: '#8a8f93',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  parameterValue: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  parameterValueThreat: {
    color: '#ff6b6b',
  },
  rankHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  rankPercentText: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  rankTrack: {
    height: 4,
    backgroundColor: '#2a3135',
    marginBottom: 8,
  },
  rankFill: {
    height: '100%',
    backgroundColor: '#e9c176',
  },
  rankLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rankLabelText: {
    color: '#8a8f93',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  alertsCard: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    minHeight: 80,
  },
  alertsContent: {
    flex: 1,
  },
  alertsEyebrow: {
    color: '#8a8f93',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  alertsTitle: {
    color: '#e9c176',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  alertsActionColumn: {
    alignItems: 'flex-end',
  },
  alertsActionText: {
    color: '#e9c176',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    lineHeight: 12,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 56,
  },
  saveButtonDisabled: {
    backgroundColor: '#1b2022',
    borderColor: '#2a3135',
    borderWidth: 1,
  },
  saveButtonText: {
    color: '#101415',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  saveButtonTextDisabled: {
    color: '#8a8f93',
  },
  signOutButton: {
    alignItems: 'center',
    borderColor: '#2a3135',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 56,
  },
  signOutText: {
    color: '#8a8f93',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  tradingWindowCard: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    padding: 16,
  },
  tradingWindowHelper: {
    color: '#8a8f93',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 16,
  },
  tradingTimeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  tradingTimeBlock: {
    flex: 1,
  },
  tradingTimeLabel: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  tradingTimeInput: {
    backgroundColor: '#0a0f10',
    borderColor: '#2a3135',
    borderWidth: 1,
    color: '#e9c176',
    fontSize: 16,
    fontWeight: '800',
    height: 50,
    paddingHorizontal: 14,
    textAlign: 'center',
    letterSpacing: 2,
  },
  tradingTimeDivider: {
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  tradingTimeDividerText: {
    color: '#4e4639',
    fontSize: 18,
    fontWeight: '600',
  },
  tradingWindowNote: {
    color: '#4e4639',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
