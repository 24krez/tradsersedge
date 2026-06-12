import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MissionStackNavigationProp } from '../../App';
import { useAuth, useIsPro } from '../contexts/AuthContext';
import { useCoachMessage } from '../features/coaching/useCoachMessage';
import { getCurrentSession, getSessionProgress, SESSION_LABELS, TradingSession } from '../logic/sessionEngine';
import { firestore } from '../services/firebase';
import {
  endMissionLiveActivity,
  getMissionLiveActivityStatus,
  startMissionLiveActivity,
  updateMissionLiveActivity,
} from '../services/liveActivityAdapter';
import { sendMissionCoachingLockScreenNotification } from '../services/lockScreenCoachingService';

type LockScreenBriefingProps = {
  onBack: () => void;
  onNavigateToMission?: () => void;
  onNavigateToActiveProtocols?: () => void;
};

export function LockScreenBriefingRouteScreen() {
  const navigation = useNavigation<MissionStackNavigationProp>();

  return (
    <LockScreenBriefingScreen
      onBack={() => navigation.goBack()}
      onNavigateToMission={() => navigation.navigate('MissionSetup')}
    />
  );
}

export function LockScreenBriefingScreen({ onBack, onNavigateToMission, onNavigateToActiveProtocols }: LockScreenBriefingProps) {
  const { user, userProfile } = useAuth();
  const isPro = useIsPro();
  const [missionData, setMissionData] = useState<any>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activityResult, setActivityResult] = useState<{ status: string; message?: string } | null>(null);

  // Load latest mission
  useEffect(() => {
    if (!user) {
      setHasLoaded(true);
      return;
    }

    const q = query(
      collection(firestore, 'missions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(1),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        setMissionData({ id: docSnap.id, ...data });
      } else {
        setMissionData(null);
      }
      setHasLoaded(true);
    });

    return () => unsubscribe();
  }, [user]);

  const hasMission = !!missionData;
  const isActive = missionData?.status === 'active';
  const sessionInfo = getCurrentSession();
  const missionSession = missionData?.session;
  const sessionKey: TradingSession =
    missionSession === 'new_york' || missionSession === 'london' || missionSession === 'asia' || missionSession === 'custom'
      ? missionSession
      : sessionInfo.session || 'custom';
  const sessionElapsedPercent = sessionKey === 'custom' ? 0 : getSessionProgress(sessionKey);
  const sessionRemainingPercent = sessionKey === 'custom' ? 100 : Math.max(0, 100 - sessionElapsedPercent);

  // Coach message hook
  const screenContext = isActive ? 'lock_screen' : 'idle';
  const { message, refresh, coachingStyle, styleLabel } = useCoachMessage({
    screenContext,
    missionData: hasMission ? missionData : null,
  });

  // Resolve mission labels
  const objectiveLabels: Record<string, string> = {
    protectCapital: 'PROTECT CAPITAL',
    passChallenge: 'PASS CHALLENGE',
    onlyASetups: 'TAKE ONLY A+ SETUPS',
    observationMode: 'OBSERVATION MODE',
  };

  const focusLabels: Record<string, string> = {
    patience: 'PATIENCE',
    discipline: 'DISCIPLINE',
    riskControl: 'RISK CONTROL',
    execution: 'EXECUTION',
    confidence: 'CONFIDENCE',
    consistency: 'CONSISTENCY',
  };

  const threatLabels: Record<string, string> = {
    fomo: 'FOMO',
    overtrading: 'OVERTRADING',
    revengeTrading: 'REVENGE TRADING',
    movingStops: 'MOVING STOPS',
    enteringEarly: 'ENTERING EARLY',
    chasingBreakouts: 'CHASING BREAKOUTS',
    lackOfPatience: 'LACK OF PATIENCE',
    overLeverage: 'OVER-LEVERAGE',
  };

  const objectiveDisplay = objectiveLabels[missionData?.objective] || missionData?.objective?.toUpperCase() || '—';
  const focusDisplay = focusLabels[missionData?.coreFocus] || missionData?.coreFocus?.toUpperCase() || '—';
  const threatDisplay = missionData?.threats?.[0]
    ? (threatLabels[missionData.threats[0]] || missionData.threats[0].toUpperCase())
    : '—';
  const nookThreatDisplay = missionData?.threats?.[0] ? threatDisplay : 'NO THREATS';
  const activityMission = {
    ...missionData,
    objective: objectiveDisplay === '—' ? missionData?.objective : objectiveDisplay,
    currentCoachingMessage: message?.text,
    coachingStyle,
    session: sessionKey,
    sessionRemainingPercent,
  };

  async function runActivityControl(action: 'start' | 'update' | 'end' | 'status' | 'coach') {
    if (!missionData?.id) return;

    const result = action === 'start'
      ? await startMissionLiveActivity(activityMission)
      : action === 'update'
        ? await updateMissionLiveActivity(activityMission)
        : action === 'end'
          ? await endMissionLiveActivity('dev_control')
          : action === 'coach'
            ? await sendMissionCoachingLockScreenNotification({
              alertSettings: userProfile?.alertSettings,
              coachingStyle,
              mission: missionData,
              screenContext: 'lock_screen',
            })
            : await getMissionLiveActivityStatus();

    setActivityResult(result);
  }

  if (!hasLoaded) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.loadingContainer}>
          <Text style={s.loadingText}>Loading briefing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <Pressable onPress={onBack} style={s.backButton}>
          <Text style={s.backText}>← BACK</Text>
        </Pressable>

        {/* Header */}
        <View style={s.header}>
          <View style={s.statusRow}>
            <View style={s.statusLeft}>
              <View style={[s.statusDot, isActive && s.statusDotActive]} />
              <Text style={s.statusText}>
                {isActive ? 'MISSION ACTIVE' : 'STANDBY'}
              </Text>
            </View>
            {isPro && (
              <View style={s.proBadge}>
                <Text style={s.proBadgeText}>{styleLabel.toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Text style={s.title}>LOCK SCREEN{'\n'}BRIEFING</Text>
          <Text style={s.subtitle}>
            Your mission stays visible when the market gets loud.
          </Text>
          {onNavigateToActiveProtocols && (
            <Pressable
              onPress={onNavigateToActiveProtocols}
              style={({ pressed }) => [s.activeProtocolsButton, pressed && s.buttonPressed]}
            >
              <Text style={s.activeProtocolsButtonText}>
                CHANGE COACHING STYLE IN ACTIVE PROTOCOLS
              </Text>
            </Pressable>
          )}
        </View>

        {/* ── No Mission Empty State ── */}
        {!hasMission || !isActive ? (
          <View style={s.emptyCard}>
            <View style={s.emptyGoldAccent} />
            <Text style={s.emptyIcon}>◎</Text>
            <Text style={s.emptyTitle}>NO ACTIVE MISSION BRIEFED</Text>
            <Text style={s.emptyBody}>
              Create today's mission to activate lock screen coaching.
            </Text>
            {onNavigateToMission && (
              <Pressable
                onPress={onNavigateToMission}
                style={({ pressed }) => [s.emptyButton, pressed && s.buttonPressed]}
              >
                <Text style={s.emptyButtonText}>CREATE MISSION</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            <Text style={s.liveEventLabel}>LIVE EVENT PREVIEW</Text>

            {/* ── Current Mission Summary ── */}
            <View style={s.missionCard}>
              <View style={s.goldAccent} />
              <Text style={s.sectionEyebrow}>CURRENT MISSION</Text>
              <View style={s.missionGrid}>
                <View style={s.missionGridItem}>
                  <Text style={s.gridLabel}>OBJECTIVE</Text>
                  <Text style={s.gridValue}>{objectiveDisplay}</Text>
                </View>
                <View style={s.missionGridItem}>
                  <Text style={s.gridLabel}>THREAT</Text>
                  <Text style={[s.gridValue, s.gridValueThreat]}>{threatDisplay}</Text>
                </View>
                <View style={s.missionGridItem}>
                  <Text style={s.gridLabel}>FOCUS</Text>
                  <Text style={s.gridValue}>{focusDisplay}</Text>
                </View>
                <View style={s.missionGridItem}>
                  <Text style={s.gridLabel}>SESSION</Text>
                  <Text style={s.gridValue}>{sessionRemainingPercent}% LEFT</Text>
                </View>
              </View>
            </View>

            {/* ── Current Mission Signal ── */}
            <View style={s.signalCard}>
              <View style={s.signalHeader}>
                <Text style={s.sectionEyebrow}>CURRENT MISSION SIGNAL</Text>
                <View style={s.styleBadge}>
                  <Text style={s.styleBadgeText}>{styleLabel}</Text>
                </View>
              </View>
              <Text style={s.signalText}>
                {message?.text || 'Generating signal...'}
              </Text>
            </View>

            {/* ── Lock Screen Preview ── */}
            <PreviewLabel label="LOCK SCREEN PREVIEW" />
            <View style={s.lockScreenPreview}>
              <View style={s.lockScreenTime}>
                <Text style={s.lockScreenTimeText}>
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </Text>
                <Text style={s.lockScreenDate}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
              </View>
              <View style={s.lockScreenNotification}>
                <View style={s.lockScreenNotifHeader}>
                  <View style={s.lockScreenAppIcon}>
                    <Text style={s.lockScreenAppIconText}>TE</Text>
                  </View>
                  <Text style={s.lockScreenAppName}>TRADER'S EDGE</Text>
                  <Text style={s.lockScreenTimestamp}>now</Text>
                </View>
                <Text style={s.lockScreenNotifTitle}>
                  {message?.title || "Trader's Edge"}
                </Text>
                <Text style={s.lockScreenNotifBody} numberOfLines={2}>
                  {message?.text || ''}
                </Text>
              </View>
            </View>

            {/* ── Dynamic Nook Preview ── */}
            <PreviewLabel label="DYNAMIC NOOK PREVIEW" />
            <View style={s.nookContainer}>
              <View style={s.nookPill}>
                <View style={s.nookDot} />
                <Text style={s.nookText}>MISSION ACTIVE</Text>
                <Text style={s.nookProgress}>{sessionRemainingPercent}%</Text>
              </View>
            </View>

            {/* ── Dynamic Nook Expanded ── */}
            <View style={s.nookExpandedContainer}>
              <View style={s.nookExpanded}>
                <View style={s.nookExpandedTop}>
                  <View>
                    <Text style={s.nookExpandedEyebrow}>MISSION ACTIVE</Text>
                    <Text style={s.nookExpandedObjective}>{objectiveDisplay}</Text>
                  </View>
                  <View style={s.nookExpandedRight}>
                    <Text style={s.nookExpandedSessionLabel}>SESSION</Text>
                    <Text style={s.nookExpandedSessionValue}>{sessionRemainingPercent}% REMAINING</Text>
                  </View>
                </View>
                <View style={s.nookExpandedGrid}>
                  <View style={s.nookExpandedGridItem}>
                    <Text style={s.nookExpandedGridLabel}>Threat</Text>
                    <Text style={s.nookExpandedGridValue}>{nookThreatDisplay}</Text>
                  </View>
                  <View style={s.nookExpandedGridItem}>
                    <Text style={s.nookExpandedGridLabel}>Focus</Text>
                    <Text style={s.nookExpandedGridValue}>{focusDisplay}</Text>
                  </View>
                </View>
                <View style={s.nookProgressTrack}>
                  <View style={[s.nookProgressFill, { width: `${sessionElapsedPercent}%` }]} />
                </View>
              </View>
            </View>

            {/* ── Widget Preview ── */}
            <PreviewLabel isProOnly label="WIDGET PREVIEW" />
            <View style={s.widgetPreview}>
              <View style={s.widgetHeader}>
                <View style={s.widgetLogo}>
                  <Text style={s.widgetLogoText}>TE</Text>
                </View>
                <Text style={s.widgetAppName}>TRADER'S EDGE</Text>
              </View>
              <Text style={s.widgetObjective}>{objectiveDisplay}</Text>
              <Text style={s.widgetMessage} numberOfLines={2}>
                {message?.text || ''}
              </Text>
              <View style={s.widgetFooter}>
                <Text style={s.widgetFooterLabel}>
                  {SESSION_LABELS[sessionKey].toUpperCase()} • {sessionRemainingPercent}% LEFT
                </Text>
              </View>
            </View>

            {/* ── Message Rotation ── */}
            <View style={s.rotationCard}>
              <View style={s.rotationHeader}>
                <Text style={s.sectionEyebrow}>MESSAGE ROTATION</Text>
                <Text style={s.rotationCategory}>
                  {message?.category?.replace(/_/g, ' ').toUpperCase() || '—'}
                </Text>
              </View>
              <Text style={s.rotationBody}>
                Tap rotate to cycle through coaching messages for this mission context.
                Messages are drawn from the {styleLabel.toLowerCase()} message library.
              </Text>
              <Pressable
                onPress={refresh}
                style={({ pressed }) => [s.rotateButton, pressed && s.buttonPressed]}
              >
                <Text style={s.rotateButtonText}>↻ ROTATE MESSAGE</Text>
              </Pressable>
            </View>

            {__DEV__ && (
              <View style={s.devControlsCard}>
                <Text style={s.sectionEyebrow}>DEV LOCK SCREEN</Text>
                <View style={s.devControlsRow}>
                  <Pressable onPress={() => runActivityControl('coach')} style={({ pressed }) => [s.devControlButton, pressed && s.buttonPressed]}>
                    <Text style={s.devControlText}>COACH</Text>
                  </Pressable>
                  <Pressable onPress={() => runActivityControl('start')} style={({ pressed }) => [s.devControlButton, pressed && s.buttonPressed]}>
                    <Text style={s.devControlText}>START</Text>
                  </Pressable>
                  <Pressable onPress={() => runActivityControl('update')} style={({ pressed }) => [s.devControlButton, pressed && s.buttonPressed]}>
                    <Text style={s.devControlText}>UPDATE</Text>
                  </Pressable>
                  <Pressable onPress={() => runActivityControl('end')} style={({ pressed }) => [s.devControlButton, pressed && s.buttonPressed]}>
                    <Text style={s.devControlText}>END</Text>
                  </Pressable>
                  <Pressable onPress={() => runActivityControl('status')} style={({ pressed }) => [s.devControlButton, pressed && s.buttonPressed]}>
                    <Text style={s.devControlText}>STATUS</Text>
                  </Pressable>
                </View>
                {activityResult && (
                  <Text style={s.devStatusText}>
                    {activityResult.status.toUpperCase()}{activityResult.message ? ` - ${activityResult.message}` : ''}
                  </Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PreviewLabel({ isProOnly, label }: { isProOnly?: boolean; label: string }) {
  return (
    <View style={s.previewLabelRow}>
      <Text style={s.previewLabel}>{label}</Text>
      {isProOnly && (
        <View style={s.previewProPill}>
          <Text style={s.previewProPillText}>ELITE</Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  safeArea: {
    backgroundColor: '#101415',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#8a8f93',
    fontSize: 14,
  },

  // Back
  backButton: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backText: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  // Header
  header: {
    marginBottom: 24,
    marginTop: 8,
    paddingHorizontal: 22,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLeft: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  statusDot: {
    backgroundColor: '#8a8f93',
    height: 8,
    marginRight: 8,
    width: 8,
  },
  statusDotActive: {
    backgroundColor: '#72c875',
  },
  statusText: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  proBadge: {
    backgroundColor: 'rgba(233, 193, 118, 0.1)',
    borderColor: 'rgba(233, 193, 118, 0.3)',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proBadgeText: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
    lineHeight: 38,
  },
  subtitle: {
    color: '#8a8f93',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 8,
  },

  // Active protocols button
  activeProtocolsButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(233, 193, 118, 0.1)',
    borderColor: '#e9c176',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  activeProtocolsButtonText: {
    color: '#e9c176',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  // Section eyebrow
  sectionEyebrow: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 12,
  },
  liveEventLabel: {
    color: '#8a8f93',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
    marginHorizontal: 22,
  },

  // Empty state
  emptyCard: {
    backgroundColor: '#1a1e1f',
    borderColor: '#2a3135',
    borderWidth: 1,
    marginHorizontal: 22,
    overflow: 'hidden',
    padding: 28,
    position: 'relative',
  },
  emptyGoldAccent: {
    backgroundColor: '#e9c176',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 3,
  },
  emptyIcon: {
    color: 'rgba(233, 193, 118, 0.3)',
    fontSize: 40,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyBody: {
    color: '#8a8f93',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    paddingVertical: 14,
  },
  emptyButtonText: {
    color: '#101415',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  // Mission card
  missionCard: {
    backgroundColor: '#1a1e1f',
    borderColor: 'rgba(233, 193, 118, 0.2)',
    borderWidth: 1,
    marginBottom: 16,
    marginHorizontal: 22,
    overflow: 'hidden',
    padding: 20,
    position: 'relative',
  },
  goldAccent: {
    backgroundColor: '#e9c176',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 3,
  },
  missionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  missionGridItem: {
    minWidth: '45%',
  },
  gridLabel: {
    color: '#8a8f93',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  gridValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
  gridValueThreat: {
    color: '#e27b7b',
  },

  // Signal card
  signalCard: {
    backgroundColor: '#1a1e1f',
    borderColor: '#2a3135',
    borderWidth: 1,
    marginBottom: 24,
    marginHorizontal: 22,
    padding: 20,
  },
  signalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  styleBadge: {
    backgroundColor: 'rgba(233, 193, 118, 0.1)',
    borderColor: 'rgba(233, 193, 118, 0.3)',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  styleBadgeText: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  signalText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },

  // Preview label
  previewLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    marginHorizontal: 22,
  },
  previewLabel: {
    color: '#8a8f93',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
  },
  previewProPill: {
    backgroundColor: 'rgba(233, 193, 118, 0.1)',
    borderColor: 'rgba(233, 193, 118, 0.35)',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  previewProPillText: {
    color: '#e9c176',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Lock screen preview
  lockScreenPreview: {
    backgroundColor: '#000000',
    borderColor: '#2a3135',
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 24,
    marginHorizontal: 22,
    overflow: 'hidden',
    paddingBottom: 28,
    paddingTop: 40,
  },
  lockScreenTime: {
    alignItems: 'center',
    marginBottom: 40,
  },
  lockScreenTimeText: {
    color: '#ffffff',
    fontSize: 64,
    fontWeight: '200',
    letterSpacing: -2,
  },
  lockScreenDate: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '500',
    marginTop: -4,
  },
  lockScreenNotification: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 14,
  },
  lockScreenNotifHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 6,
  },
  lockScreenAppIcon: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    borderRadius: 4,
    height: 20,
    justifyContent: 'center',
    marginRight: 6,
    width: 20,
  },
  lockScreenAppIconText: {
    color: '#101415',
    fontSize: 8,
    fontWeight: '900',
  },
  lockScreenAppName: {
    color: 'rgba(255, 255, 255, 0.5)',
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  lockScreenTimestamp: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 11,
    fontWeight: '600',
  },
  lockScreenNotifTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },
  lockScreenNotifBody: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    lineHeight: 18,
  },

  // Dynamic Nook preview
  nookContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  nookPill: {
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 20,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  nookDot: {
    backgroundColor: '#72c875',
    borderRadius: 4,
    height: 8,
    marginRight: 8,
    width: 8,
  },
  nookText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginRight: 10,
  },
  nookProgress: {
    color: '#e9c176',
    fontSize: 11,
    fontWeight: '900',
  },

  // Dynamic Nook expanded
  nookExpandedContainer: {
    marginBottom: 24,
    marginHorizontal: 22,
  },
  nookExpanded: {
    backgroundColor: '#000000',
    borderRadius: 24,
    overflow: 'hidden',
    padding: 18,
  },
  nookExpandedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  nookExpandedEyebrow: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  nookExpandedObjective: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
  },
  nookExpandedRight: {
    alignItems: 'flex-end',
  },
  nookExpandedSessionLabel: {
    color: '#8a8f93',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  nookExpandedSessionValue: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
  },
  nookExpandedGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  nookExpandedGridItem: {
    backgroundColor: '#1a1e1f',
    borderLeftColor: '#e9c176',
    borderLeftWidth: 2,
    flex: 1,
    padding: 10,
  },
  nookExpandedGridLabel: {
    color: 'rgba(233, 193, 118, 0.5)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  nookExpandedGridValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
  },
  nookProgressTrack: {
    backgroundColor: '#2a3135',
    borderRadius: 2,
    height: 4,
    width: '100%',
  },
  nookProgressFill: {
    backgroundColor: '#e9c176',
    borderRadius: 2,
    height: '100%',
  },

  // Widget preview
  widgetPreview: {
    backgroundColor: '#1a1e1f',
    borderColor: '#2a3135',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    marginHorizontal: 22,
    padding: 16,
  },
  widgetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  widgetLogo: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    borderRadius: 6,
    height: 24,
    justifyContent: 'center',
    marginRight: 8,
    width: 24,
  },
  widgetLogoText: {
    color: '#101415',
    fontSize: 9,
    fontWeight: '900',
  },
  widgetAppName: {
    color: '#8a8f93',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  widgetObjective: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  widgetMessage: {
    color: '#b0b5b8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  widgetFooter: {
    borderColor: '#2a3135',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  widgetFooterLabel: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  // Rotation card
  rotationCard: {
    backgroundColor: '#1a1e1f',
    borderColor: '#2a3135',
    borderWidth: 1,
    marginBottom: 16,
    marginHorizontal: 22,
    padding: 20,
  },
  rotationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rotationCategory: {
    color: '#8a8f93',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  rotationBody: {
    color: '#8a8f93',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  rotateButton: {
    alignItems: 'center',
    borderColor: '#e9c176',
    borderWidth: 1,
    paddingVertical: 12,
  },
  rotateButtonText: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  devControlsCard: {
    backgroundColor: '#15191a',
    borderColor: '#2a3135',
    borderWidth: 1,
    marginBottom: 16,
    marginHorizontal: 22,
    padding: 16,
  },
  devControlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  devControlButton: {
    alignItems: 'center',
    borderColor: 'rgba(233, 193, 118, 0.5)',
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  devControlText: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  devStatusText: {
    color: '#8a8f93',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 12,
  },

  buttonPressed: {
    opacity: 0.7,
  },
});
