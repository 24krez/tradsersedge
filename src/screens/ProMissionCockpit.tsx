import { useNavigation } from '@react-navigation/native';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { MissionStackNavigationProp } from '../../App';
import { useAuth, useIsPro } from '../contexts/AuthContext';
import {
  CockpitMindsetStatus,
  cockpitStatusToDisplayLabel,
  cockpitStatusToLevels,
  getCoachingMessage,
  mapMissionStatusToCockpit,
} from '../logic/missionPhase';
import {
  getCurrentSession,
  getSessionProgress,
  getTimeRemaining,
  SESSION_LABELS,
} from '../logic/sessionEngine';
import { firestore } from '../services/firebase';
import { CompactMindsetModule } from './MissionActiveScreen';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProMissionCockpitProps = {
  mission: any;
};

type NoteType = 'general' | 'impulse' | 'rule_warning' | 'emotional_shift';

const NOTE_TYPES: Array<{ type: NoteType; label: string; icon: string }> = [
  { type: 'general', label: 'GENERAL', icon: '📝' },
  { type: 'impulse', label: 'IMPULSE', icon: '⚡' },
  { type: 'rule_warning', label: 'RULE WARNING', icon: '⚠' },
  { type: 'emotional_shift', label: 'EMOTIONAL', icon: '🔄' },
];

// Removed MINDSET_BUTTONS

// ---------------------------------------------------------------------------
// Animated Header Component
// ---------------------------------------------------------------------------

function AnimatedMissionHeader() {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    scanLoop.start();

    return () => {
      pulseLoop.stop();
      scanLoop.stop();
    };
  }, [pulseAnim, scanAnim]);

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.18],
  });

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.015],
  });

  const scanTranslateX = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, 140],
  });

  const scanOpacity = scanAnim.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.8, 0.8, 0],
  });

  return (
    <View style={animatedHeaderStyles.container}>
      <Animated.View
        style={[
          animatedHeaderStyles.glowEffect,
          {
            opacity: glowOpacity,
            transform: [{ scale }],
          },
        ]}
      />
      <View style={animatedHeaderStyles.statusRow}>
        <Animated.View
          style={[
            animatedHeaderStyles.liveDot,
            {
              opacity: glowOpacity,
              transform: [{ scale }],
            },
          ]}
        />
        <Text style={animatedHeaderStyles.statusText}>SESSION LIVE</Text>
      </View>
      <Animated.Text
        style={[
          animatedHeaderStyles.title,
          {
            transform: [{ scale }],
          },
        ]}
      >
        ACTIVE MISSION
      </Animated.Text>
      <View style={animatedHeaderStyles.underline}>
        <Animated.View
          style={[
            animatedHeaderStyles.scanLine,
            {
              opacity: scanOpacity,
              transform: [{ translateX: scanTranslateX }],
            },
          ]}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProMissionCockpit({ mission }: ProMissionCockpitProps) {
  const navigation = useNavigation<MissionStackNavigationProp>();
  const { t } = useTranslation('mission');
  const { user } = useAuth();
  const isPro = useIsPro();

  // Mindset
  const currentMindset: CockpitMindsetStatus =
    mission.currentMindsetStatus ||
    mapMissionStatusToCockpit(mission.missionStatus);

  // Session notes
  const [selectedNoteType, setSelectedNoteType] = useState<NoteType | null>(
    null,
  );
  const [noteText, setNoteText] = useState('');
  const [isNoteSaving, setIsNoteSaving] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(false);

  // Complete modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Elapsed timer
  const [elapsed, setElapsed] = useState('00:00:00');
  const [elapsedMs, setElapsedMs] = useState(0);

  // Session info
  const [sessionInfo, setSessionInfo] = useState(getCurrentSession());

  const objectiveKey = mission.objective;
  const focusKey = mission.coreFocus;
  const threats: string[] = mission.threats || [];

  // ── Elapsed Timer ──
  useEffect(() => {
    const startDate = mission.sessionStartedAt?.toDate?.();
    if (!startDate) return;

    // If session has ended, show final elapsed
    const endDate = mission.sessionEndedAt?.toDate?.();

    function update() {
      const now = endDate || new Date();
      const diff = Math.max(0, now.getTime() - startDate.getTime());
      setElapsedMs(diff);
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const sec = Math.floor((diff % 60_000) / 1_000);
      setElapsed(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`,
      );
    }

    update();

    // If session has ended, don't run interval
    if (endDate) return;

    const interval = setInterval(update, 1_000);
    return () => clearInterval(interval);
  }, [mission.sessionStartedAt, mission.sessionEndedAt]);

  // ── Session Refresh ──
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionInfo(getCurrentSession());
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const currentSessionKey = sessionInfo.session || 'new_york';
  const remaining = getTimeRemaining(currentSessionKey);
  const progress = getSessionProgress(currentSessionKey);

  // ── Started at display ──
  const startedAtDisplay = useMemo(() => {
    const d = mission.sessionStartedAt?.toDate?.();
    if (!d) return '--:--';
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, [mission.sessionStartedAt]);

  const currentTimeDisplay = useMemo(() => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, [elapsed]); // re-compute each second

  // ── Session Note Handler ──
  const handleSaveNote = async () => {
    if (!user || !mission.id || !noteText.trim() || isNoteSaving) return;

    setIsNoteSaving(true);
    try {
      await addDoc(collection(firestore, 'session_notes'), {
        missionId: mission.id,
        userId: user.uid,
        content: noteText.trim(),
        noteType: selectedNoteType || 'general',
        createdAt: serverTimestamp(),
      });
      setNoteText('');
      setSelectedNoteType(null);
      setNoteSuccess(true);
      setTimeout(() => setNoteSuccess(false), 2000);
    } catch (e) {
      console.error('Error saving note:', e);
    } finally {
      setIsNoteSaving(false);
    }
  };

  // ── Mission Complete Handler ──
  const handleCompleteMission = async () => {
    if (!user || !mission.id || isCompleting) return;

    setIsCompleting(true);
    try {
      await updateDoc(doc(firestore, 'missions', mission.id), {
        status: 'completed',
        missionPhase: 'completed',
        endedAt: serverTimestamp(),
        sessionEndedAt: serverTimestamp(),
      });
      setShowCompleteModal(false);

      if (isPro) {
        navigation.replace('MissionDebrief');
      } else {
        navigation.replace('ProUpsell');
      }
    } catch (e) {
      console.error('Error completing mission:', e);
      setIsCompleting(false);
    }
  };

  const coachingMessage = getCoachingMessage(currentMindset);

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Animated Active Mission Header (replaces top header) ── */}
        <AnimatedMissionHeader />
        
        {/* ── Session Meta Info ── */}
        <View style={s.headerMeta}>
          <View style={s.metaRow}>
            <Text style={s.metaText}>
              {SESSION_LABELS[currentSessionKey].toUpperCase()} ACTIVE
            </Text>
            <View style={s.proBadge}>
              <Text style={s.proBadgeText}>PRO</Text>
            </View>
          </View>
          <Text style={s.timeRemaining}>
            {remaining.formatted.toUpperCase()} | {progress}% SESSION REMAINING
          </Text>
        </View>

        {/* ── Primary Objective Card ── */}
        <View style={s.objectiveCard}>
          <View style={s.goldAccent} />
          <View style={s.objectiveTop}>
            <Text style={s.objectiveEyebrow}>PRIMARY OBJECTIVE</Text>
            <Text style={s.objectiveIcon}>◎</Text>
          </View>
          <Text style={s.objectiveText}>
            {objectiveKey
              ? t(`data.objectives.${objectiveKey}.title`).toUpperCase()
              : '—'}
          </Text>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={s.objectiveBottom}>
            <Text style={s.progressLabel}>SESSION PROGRESS: {progress}%</Text>
            <Text style={s.stateLabel}>OPERATIONAL STATE: <Text style={{ color: '#79d284' }}>ACTIVE</Text></Text>
          </View>
        </View>

        {/* ── Threat + Focus Split ── */}
        <View style={s.splitRow}>
          <View style={s.threatCard}>
            <View style={s.splitCardHeader}>
              <Text style={s.threatIcon}>⚡</Text>
              <Text style={s.threatCardTitle}>THREAT{'\n'}ASSESSMENT</Text>
            </View>
            <Text style={s.splitLabel}>THREAT LEVEL</Text>
            <Text style={s.splitValue}>
              {currentMindset === 'high_risk'
                ? 'HIGH'
                : currentMindset === 'caution'
                  ? 'MODERATE'
                  : 'LOW'}
            </Text>
            <Text style={s.splitLabel}>STATE</Text>
            <Text style={s.splitValue}>
              {cockpitStatusToDisplayLabel(currentMindset).toUpperCase()}
            </Text>
            {threats.length > 0 && (
              <>
                <Text style={s.splitLabel}>WATCH FOR</Text>
                <Text style={s.watchForText}>
                  {t(`data.threats.${threats[0]}`).toUpperCase()}
                </Text>
              </>
            )}
          </View>

          <View style={s.focusCard}>
            <View style={s.splitCardHeader}>
              <Text style={s.focusIcon}>⍟</Text>
              <Text style={s.focusCardTitle}>CORE FOCUS</Text>
            </View>
            <Text style={s.focusName}>
              {focusKey
                ? t(`data.focusAreas.${focusKey}`).toUpperCase()
                : '—'}
            </Text>
            <Text style={s.focusMeta}>🔒 MINDSET LOCK ACTIVE</Text>
          </View>
        </View>

        {/* ── Session Status ── */}
        <View style={s.sessionCard}>
          <Text style={s.sectionEyebrow}>SESSION STATUS</Text>
          <View style={s.sessionGrid}>
            <View style={s.sessionGridItem}>
              <Text style={s.gridLabel}>STARTED</Text>
              <Text style={s.gridValue}>{startedAtDisplay}</Text>
            </View>
            <View style={s.sessionGridItem}>
              <Text style={s.gridLabel}>ELAPSED</Text>
              <Text style={s.gridValue}>{elapsed}</Text>
            </View>
          </View>
          <View style={s.sessionGrid}>
            <View style={s.sessionGridItem}>
              <Text style={s.gridLabel}>CURRENT TIME</Text>
              <Text style={s.gridValue}>{currentTimeDisplay}</Text>
            </View>
            <View style={s.sessionGridItem}>
              <Text style={s.gridLabel}>SESSION PROGRESS</Text>
              <Text style={s.gridValue}>{progress}%</Text>
            </View>
          </View>
        </View>

        {/* ── Coaching Message ── */}
        <View
          style={[
            s.coachingCard,
            currentMindset === 'high_risk' && s.coachingCardDanger,
            currentMindset === 'caution' && s.coachingCardWarning,
          ]}
        >
          <Text style={s.coachingEyebrow}>MISSION INTELLIGENCE</Text>
          <Text style={s.coachingText}>{coachingMessage}</Text>
        </View>

        {/* ── Mindset Controls ── */}
        <View style={{ marginHorizontal: 20 }}>
          <CompactMindsetModule missionId={mission.id} />
        </View>

        {/* ── Session Note Shortcuts ── */}
        <Text style={[s.sectionTitle, { marginTop: 24 }]}>SESSION NOTES</Text>
        {noteSuccess && (
          <View style={s.successBanner}>
            <Text style={s.successBannerText}>✓ NOTE SAVED</Text>
          </View>
        )}
        <View style={s.noteTypeGrid}>
          {NOTE_TYPES.map((nt) => {
            const isActive = selectedNoteType === nt.type;
            return (
              <Pressable
                key={nt.type}
                onPress={() =>
                  setSelectedNoteType(isActive ? null : nt.type)
                }
                style={[s.noteTypeButton, isActive && s.noteTypeButtonActive]}
              >
                <Text style={s.noteTypeIcon}>{nt.icon}</Text>
                <Text
                  style={[
                    s.noteTypeLabel,
                    isActive && s.noteTypeLabelActive,
                  ]}
                >
                  {nt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectedNoteType && (
          <View style={s.noteInputContainer}>
            <TextInput
              multiline
              onChangeText={setNoteText}
              placeholder={`Add ${selectedNoteType.replace('_', ' ')} note...`}
              placeholderTextColor="#5a5f63"
              style={s.noteInput}
              value={noteText}
            />
            <Pressable
              disabled={!noteText.trim() || isNoteSaving}
              onPress={handleSaveNote}
              style={[
                s.noteSaveButton,
                (!noteText.trim() || isNoteSaving) && s.noteSaveDisabled,
              ]}
            >
              <Text style={s.noteSaveText}>
                {isNoteSaving ? '...' : 'SAVE NOTE'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* ── Intelligence Feed ── */}
        <View style={s.intelligenceFeed}>
          <Text style={s.sectionEyebrow}>INTELLIGENCE FEED</Text>
          <View style={s.feedQuote}>
            <Text style={s.feedQuoteMark}>❝</Text>
            <Text style={s.feedQuoteText}>
              One trade means nothing. Your next 100 trades mean everything.
              Focus on the process, not the outcome.
            </Text>
            <Text style={s.feedQuoteMarkEnd}>❞</Text>
          </View>
        </View>

        {/* ── Mission Complete ── */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowCompleteModal(true)}
          style={({ pressed }) => [
            s.completeButton,
            pressed && s.completeButtonPressed,
          ]}
        >
          <Text style={s.completeButtonText}>MISSION COMPLETE</Text>
          <View style={s.completeCheckmark}>
            <Text style={s.completeCheckmarkText}>✓</Text>
          </View>
        </Pressable>

        <Text style={s.footerMeta}>
          {SESSION_LABELS[currentSessionKey].toUpperCase()} END PROTOCOL ACTIVE
        </Text>
      </ScrollView>

      {/* ── Confirm Complete Modal ── */}
      <Modal
        animationType="fade"
        onRequestClose={() => setShowCompleteModal(false)}
        transparent
        visible={showCompleteModal}
      >
        <Pressable
          onPress={() => setShowCompleteModal(false)}
          style={modalS.overlay}
        >
          <Pressable style={modalS.card}>
            <View style={modalS.accent} />
            <Text style={modalS.title}>END SESSION?</Text>
            <Text style={modalS.description}>
              This will close your active trading session and begin the
              post-session debrief. Your session data, mindset updates, and
              notes will be preserved.
            </Text>
            <View style={modalS.row}>
              <Text style={modalS.metaLabel}>SESSION TIME</Text>
              <Text style={modalS.metaValue}>{elapsed}</Text>
            </View>
            <View style={modalS.actions}>
              <Pressable
                disabled={isCompleting}
                onPress={handleCompleteMission}
                style={({ pressed }) => [
                  modalS.confirmButton,
                  (pressed || isCompleting) && modalS.buttonPressed,
                ]}
              >
                <Text style={modalS.confirmText}>
                  {isCompleting ? 'CLOSING...' : 'COMPLETE MISSION'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowCompleteModal(false)}
                style={({ pressed }) => [
                  modalS.cancelButton,
                  pressed && modalS.buttonPressed,
                ]}
              >
                <Text style={modalS.cancelText}>KEEP TRADING</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
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

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  liveRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  liveDot: {
    backgroundColor: '#79d284',
    borderRadius: 5,
    height: 10,
    shadowColor: '#79d284',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    width: 10,
  },
  headerEyebrow: {
    color: '#79d284',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  proBadge: {
    backgroundColor: 'rgba(233, 193, 118, 0.12)',
    borderColor: 'rgba(233, 193, 118, 0.5)',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  proBadgeText: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  headerObjective: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  headerMeta: {
    backgroundColor: '#14181a',
    borderColor: 'rgba(233, 193, 118, 0.1)',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaText: {
    color: '#79d284',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  timeRemaining: {
    color: '#8a8f93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // Objective card
  objectiveCard: {
    backgroundColor: '#1a1e1f',
    borderColor: 'rgba(233, 193, 118, 0.2)',
    borderWidth: 1,
    marginBottom: 16,
    marginHorizontal: 20,
    overflow: 'hidden',
    padding: 22,
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
  objectiveTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  objectiveEyebrow: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  objectiveIcon: {
    color: 'rgba(233, 193, 118, 0.35)',
    fontSize: 24,
  },
  objectiveText: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 18,
  },
  progressTrack: {
    backgroundColor: 'rgba(233, 193, 118, 0.12)',
    borderRadius: 2,
    height: 6,
    marginBottom: 14,
    width: '100%',
  },
  progressFill: {
    backgroundColor: '#e9c176',
    borderRadius: 2,
    height: '100%',
  },
  objectiveBottom: {
    flexDirection: 'column',
    gap: 4,
  },
  progressLabel: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  stateLabel: {
    color: '#8a8f93',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Split row
  splitRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    marginHorizontal: 20,
  },
  threatCard: {
    backgroundColor: '#1a1e1f',
    borderColor: 'rgba(233, 193, 118, 0.12)',
    borderWidth: 1,
    flex: 1,
    padding: 16,
  },
  focusCard: {
    backgroundColor: '#1a1e1f',
    borderColor: 'rgba(233, 193, 118, 0.12)',
    borderWidth: 1,
    flex: 1,
    padding: 16,
  },
  splitCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  threatIcon: {
    color: '#e27b7b',
    fontSize: 14,
  },
  threatCardTitle: {
    color: '#e27b7b',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    lineHeight: 14,
  },
  focusIcon: {
    color: '#e9c176',
    fontSize: 16,
  },
  focusCardTitle: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  splitLabel: {
    color: '#8a8f93',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 3,
    marginTop: 10,
  },
  splitValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
  watchForText: {
    color: '#e27b7b',
    fontSize: 12,
    fontWeight: '800',
  },
  focusName: {
    color: '#e9c176',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  focusMeta: {
    color: '#8a8f93',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Session card
  sessionCard: {
    backgroundColor: '#1a1e1f',
    borderColor: 'rgba(233, 193, 118, 0.2)',
    borderWidth: 1,
    marginBottom: 16,
    marginHorizontal: 20,
    padding: 20,
  },
  sectionEyebrow: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  sessionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  sessionGridItem: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  gridLabel: {
    color: '#8a8f93',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  gridValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
  },

  // Coaching
  coachingCard: {
    backgroundColor: '#14181a',
    borderColor: 'rgba(233, 193, 118, 0.2)',
    borderLeftColor: '#79d284',
    borderLeftWidth: 3,
    borderWidth: 1,
    marginBottom: 24,
    marginHorizontal: 20,
    padding: 18,
  },
  coachingCardWarning: {
    borderLeftColor: '#f0c978',
  },
  coachingCardDanger: {
    borderLeftColor: '#e27b7b',
  },
  coachingEyebrow: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  coachingText: {
    color: '#d1c5b4',
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '600',
    lineHeight: 22,
  },

  // Mindset
  sectionTitle: {
    color: '#e9c176',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  mindsetGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    marginHorizontal: 20,
  },
  mindsetButton: {
    alignItems: 'center',
    backgroundColor: '#1a1e1f',
    borderColor: '#2a3135',
    borderWidth: 1.5,
    flex: 1,
    overflow: 'hidden',
    paddingVertical: 14,
  },
  mindsetButtonIcon: {
    fontSize: 18,
    marginBottom: 6,
  },
  mindsetButtonLabel: {
    color: '#8a8f93',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  mindsetActiveBar: {
    bottom: 0,
    height: 3,
    left: 0,
    position: 'absolute',
    right: 0,
  },

  // Session notes
  successBanner: {
    backgroundColor: 'rgba(121, 210, 132, 0.12)',
    borderColor: 'rgba(121, 210, 132, 0.3)',
    borderWidth: 1,
    marginBottom: 10,
    marginHorizontal: 20,
    padding: 10,
  },
  successBannerText: {
    color: '#79d284',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  noteTypeGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  noteTypeButton: {
    alignItems: 'center',
    backgroundColor: '#1a1e1f',
    borderColor: '#2a3135',
    borderWidth: 1,
    flex: 1,
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  noteTypeButtonActive: {
    borderColor: '#e9c176',
  },
  noteTypeIcon: {
    fontSize: 16,
  },
  noteTypeLabel: {
    color: '#8a8f93',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  noteTypeLabelActive: {
    color: '#e9c176',
  },
  noteInputContainer: {
    marginBottom: 24,
    marginHorizontal: 20,
  },
  noteInput: {
    backgroundColor: '#0a0f10',
    borderColor: '#2a3135',
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 14,
    minHeight: 80,
    padding: 14,
    textAlignVertical: 'top',
  },
  noteSaveButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    marginTop: 10,
    paddingVertical: 12,
  },
  noteSaveDisabled: {
    backgroundColor: '#2a3135',
  },
  noteSaveText: {
    color: '#101415',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  // Intelligence feed
  intelligenceFeed: {
    marginBottom: 24,
    marginHorizontal: 20,
  },
  feedQuote: {
    backgroundColor: '#14181a',
    borderColor: 'rgba(233, 193, 118, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 20,
  },
  feedQuoteMark: {
    color: '#2a3135',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
  },
  feedQuoteText: {
    color: '#d1c5b4',
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 22,
  },
  feedQuoteMarkEnd: {
    alignSelf: 'flex-end',
    color: '#2a3135',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },

  // Complete button
  completeButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginHorizontal: 20,
    minHeight: 58,
    shadowColor: '#e9c176',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  completeButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  completeButtonText: {
    color: '#101415',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  completeCheckmark: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 20, 21, 0.15)',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  completeCheckmarkText: {
    color: '#101415',
    fontSize: 14,
    fontWeight: '900',
  },
  footerMeta: {
    color: '#343b40',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginHorizontal: 20,
    marginTop: 16,
    textAlign: 'center',
  },
});

const modalS = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#0b1111',
    borderColor: '#252d2d',
    borderWidth: 1,
    maxWidth: 420,
    overflow: 'hidden',
    padding: 26,
    width: '100%',
  },
  accent: {
    backgroundColor: '#e9c176',
    height: 4,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 72,
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    color: '#d1c5b4',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  row: {
    alignItems: 'center',
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
    padding: 14,
  },
  metaLabel: {
    color: '#8a8f93',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  metaValue: {
    color: '#e9c176',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  actions: {
    gap: 12,
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cancelButton: {
    alignItems: 'center',
    borderColor: '#4e4639',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  confirmText: {
    color: '#101415',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  cancelText: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  buttonPressed: {
    opacity: 0.7,
  },
});

const animatedHeaderStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#121719',
    borderColor: 'rgba(233, 193, 118, 0.18)',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 16,
    marginHorizontal: 20,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingVertical: 18,
    position: 'relative',
  },
  glowEffect: {
    backgroundColor: 'rgba(233, 193, 118, 0.22)',
    borderRadius: 999,
    height: 28,
    left: '15%',
    position: 'absolute',
    top: 24,
    width: '70%',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  liveDot: {
    backgroundColor: '#79d284',
    borderRadius: 4,
    height: 8,
    shadowColor: '#79d284',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    width: 8,
  },
  statusText: {
    color: '#79d284',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  title: {
    color: '#e9c176',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(233, 193, 118, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  underline: {
    backgroundColor: '#e9c176',
    borderRadius: 1.5,
    height: 3,
    marginTop: 12,
    overflow: 'hidden',
    width: 160,
  },
  scanLine: {
    backgroundColor: '#fff4d8',
    height: '100%',
    width: 56,
  },
});
