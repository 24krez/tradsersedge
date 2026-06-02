import { useNavigation } from '@react-navigation/native';
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { MissionStackNavigationProp } from '../../App';
import { useAuth } from '../contexts/AuthContext';
import {
  DEFAULT_CHECKLIST,
  PreTradeChecklist,
  getBehaviorReminder,
  getTradingFact,
  mapMissionStatusToCockpit,
} from '../logic/missionPhase';
import {
  getCurrentSession,
  getSessionProgress,
  getTimeRemaining,
  SESSION_LABELS,
} from '../logic/sessionEngine';
import { firestore } from '../services/firebase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProMissionBriefingProps = {
  mission: any;
};

type ReadinessData = {
  confidence: string;
  patience: string;
  focus: string;
  missionStatus?: string;
} | null;

// ---------------------------------------------------------------------------
// Checklist Item Labels
// ---------------------------------------------------------------------------

const CHECKLIST_ITEMS: Array<{
  key: keyof PreTradeChecklist;
  label: string;
  description: string;
}> = [
  {
    key: 'biasReviewed',
    label: 'BIAS REVIEWED',
    description: 'Identified and acknowledged current market bias',
  },
  {
    key: 'levelsMarked',
    label: 'LEVELS MARKED',
    description: 'Key support and resistance levels plotted on chart',
  },
  {
    key: 'riskDefined',
    label: 'RISK DEFINED',
    description: 'Maximum loss per trade and per session calculated',
  },
  {
    key: 'newsChecked',
    label: 'NEWS CHECKED',
    description: 'Reviewed economic calendar for high-impact events',
  },
  {
    key: 'maxLossAccepted',
    label: 'MAX LOSS ACCEPTED',
    description: 'Mentally prepared to accept worst-case scenario',
  },
  {
    key: 'strategyConfirmed',
    label: 'STRATEGY CONFIRMED',
    description: 'Trading plan is clear and rules are defined',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProMissionBriefing({ mission }: ProMissionBriefingProps) {
  const navigation = useNavigation<MissionStackNavigationProp>();
  const { t } = useTranslation('mission');
  const { user } = useAuth();

  const [checklist, setChecklist] = useState<PreTradeChecklist>({
    ...DEFAULT_CHECKLIST,
  });
  const [readiness, setReadiness] = useState<ReadinessData>(null);
  const [previousLesson, setPreviousLesson] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(getCurrentSession());

  const objectiveKey = mission.objective;
  const focusKey = mission.coreFocus;
  const threats: string[] = mission.threats || [];

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionInfo(getCurrentSession());
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Load readiness from latest pre_session mindset checkin
  useEffect(() => {
    if (!user || !mission.id) return;

    (async () => {
      try {
        const q = query(
          collection(firestore, 'mindset_checkins'),
          where('missionId', '==', mission.id),
          where('userId', '==', user.uid),
          where('type', '==', 'pre_session'),
          orderBy('createdAt', 'desc'),
          limit(1),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setReadiness({
            confidence: data.confidence || 'Medium',
            patience: data.patience || 'Medium',
            focus: data.focus || 'Medium',
            missionStatus: data.missionStatus,
          });
        }
      } catch (e) {
        console.error('Error loading readiness:', e);
      }
    })();
  }, [user, mission.id]);

  // Load previous lesson from most recent debrief
  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const q = query(
          collection(firestore, 'mission_debriefs'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(1),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const lesson = snap.docs[0].data()?.lesson?.text;
          if (lesson && lesson.length > 5) {
            setPreviousLesson(lesson);
          }
        }
      } catch (e) {
        console.error('Error loading previous lesson:', e);
      }
    })();
  }, [user]);

  const toggleChecklistItem = (key: keyof PreTradeChecklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const allChecked = completedCount === CHECKLIST_ITEMS.length;

  const handleStartTrading = async () => {
    if (!user || !mission.id || isStarting) return;
    setIsStarting(true);

    try {
      await updateDoc(doc(firestore, 'missions', mission.id), {
        preTradeChecklist: checklist,
      });
      setIsStarting(false);
      navigation.navigate('ReadinessCheck');
    } catch (e) {
      console.error('Error starting trading session:', e);
      setIsStarting(false);
    }
  };

  // Session details
  const currentSessionKey = sessionInfo.session || 'new_york';
  const remaining = getTimeRemaining(currentSessionKey);
  const progress = getSessionProgress(currentSessionKey);

  // Overall readiness status
  const readinessLabel = readiness
    ? readiness.missionStatus || 'ON TRACK'
    : 'PENDING';

  const isMarketClosed = sessionInfo.session === null;

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header (Cockpit Style) ── */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <View style={s.liveRow}>
              <View 
                style={[
                  s.liveDot, 
                  isMarketClosed 
                    ? { backgroundColor: '#e27b7b', shadowColor: '#e27b7b' }
                    : { backgroundColor: '#79d284', shadowColor: '#79d284' }
                ]} 
              />
              <Text 
                style={[
                  s.headerEyebrow, 
                  { color: isMarketClosed ? '#e27b7b' : '#79d284' }
                ]}
              >
                {isMarketClosed 
                  ? 'MARKET CLOSED'
                  : sessionInfo.label 
                    ? sessionInfo.label.toUpperCase() 
                    : 'ACTIVE SESSION'}
              </Text>
            </View>
            <View style={s.proBadge}>
              <Text style={s.proBadgeText}>PRO</Text>
            </View>
          </View>
          <Text style={s.headerObjective}>MISSION BRIEFING</Text>
          <Text style={s.headerMeta}>
            SESSION PENDING | AWAITING DEPLOYMENT
          </Text>
        </View>

        {/* ── Primary Objective Card (Cockpit Style) ── */}
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
            <View style={[s.progressFill, { width: `0%` }]} />
          </View>
          <View style={s.objectiveBottom}>
            <Text style={s.progressLabel}>SESSION PROGRESS: 0%</Text>
            <Text style={s.stateLabel}>OPERATIONAL STATE: PENDING</Text>
          </View>
        </View>

        {/* ── Threat + Focus Split (Cockpit Style) ── */}
        <View style={s.splitRow}>
          <View style={s.threatCard}>
            <View style={s.splitCardHeader}>
              <Text style={s.threatIcon}>⚡</Text>
              <Text style={s.threatCardTitle}>THREAT{'\n'}ASSESSMENT</Text>
            </View>
            <Text style={s.splitLabel}>THREAT LEVEL</Text>
            <Text style={s.splitValue}>EVALUATING</Text>
            <Text style={s.splitLabel}>STATE</Text>
            <Text style={s.splitValue}>PENDING</Text>
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
            <Text style={s.focusMeta}>PENDING DEPLOYMENT</Text>
          </View>
        </View>

        {/* ── Quote ── */}
        <View style={s.quoteCard}>
          <Text style={s.quoteMark}>❞</Text>
          <Text style={s.quoteText}>
            Your discipline is your edge. The market pays the patient and
            punishes the impulsive.
          </Text>
        </View>

        {/* ── Trading Fact ── */}
        <View style={s.factCard}>
          <Text style={s.factEyebrow}>TRADING FACT OF THE DAY</Text>
          <Text style={s.factText}>{getTradingFact()}</Text>
        </View>

        {/* ── Active Session ── */}
        <View style={s.sessionCard}>
          <View style={s.sessionHeader}>
            <Text style={s.sessionEyebrow}>
              {isMarketClosed ? 'MARKET CLOSED' : 'ACTIVE SESSION'}
            </Text>
            <View 
              style={[
                s.sessionDot,
                isMarketClosed
                  ? { backgroundColor: '#e27b7b' }
                  : { backgroundColor: '#79d284' }
              ]} 
            />
          </View>
          <Text style={s.sessionName}>
            {SESSION_LABELS[currentSessionKey].toUpperCase()}
          </Text>
          <View style={s.sessionGrid}>
            <View style={s.sessionGridItem}>
              <Text style={s.sessionGridLabel}>REMAINING</Text>
              <Text style={s.sessionGridValue}>{remaining.formatted}</Text>
            </View>
            <View style={s.sessionGridItem}>
              <Text style={s.sessionGridLabel}>PROGRESS</Text>
              <Text style={s.sessionGridValue}>{progress}%</Text>
            </View>
          </View>
        </View>

        {/* ── Readiness Summary ── */}
        {readiness && (
          <View style={s.readinessCard}>
            <Text style={s.sectionEyebrow}>STATE PROFILE</Text>
            <ReadinessRow label="Confidence" value={readiness.confidence} />
            <ReadinessRow label="Patience" value={readiness.patience} />
            <ReadinessRow label="Focus" value={readiness.focus} />
          </View>
        )}

        {/* ── Pro Intelligence Cards ── */}
        <Text style={s.sectionTitle}>PRO INTELLIGENCE</Text>

        <IntelligenceCard
          icon="⚡"
          title="PRIMARY RISK"
          body={
            threats.length > 0
              ? `Watch for ${t(`data.threats.${threats[0]}`).toLowerCase()}. This is your highest-probability failure mode today.`
              : 'No specific threats identified. Maintain general discipline.'
          }
        />

        <IntelligenceCard
          icon="◎"
          title="RECOMMENDED FOCUS"
          body={
            focusKey
              ? `Lock onto ${t(`data.focusAreas.${focusKey}`).toLowerCase()} as your primary behavioral anchor for this session.`
              : 'Maintain standard operational discipline.'
          }
        />

        <IntelligenceCard
          icon="⬟"
          title="BEHAVIOR REMINDER"
          body={getBehaviorReminder(objectiveKey)}
        />

        {previousLesson && (
          <IntelligenceCard
            icon="📋"
            title="PREVIOUS LESSON"
            body={`"${previousLesson}"`}
            isItalic
          />
        )}

        {/* ── Pre-Trade Checklist ── */}
        <View style={s.checklistSection}>
          <View style={s.checklistHeader}>
            <Text style={s.sectionTitle}>PRE-TRADE CHECKLIST</Text>
            <Text style={s.checklistCount}>
              {completedCount}/{CHECKLIST_ITEMS.length}
            </Text>
          </View>

          <View style={s.checklistProgressTrack}>
            <View
              style={[
                s.checklistProgressFill,
                {
                  width: `${(completedCount / CHECKLIST_ITEMS.length) * 100}%`,
                },
              ]}
            />
          </View>

          {CHECKLIST_ITEMS.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => toggleChecklistItem(item.key)}
              style={[
                s.checklistItem,
                checklist[item.key] && s.checklistItemChecked,
              ]}
            >
              <View
                style={[
                  s.checkBox,
                  checklist[item.key] && s.checkBoxChecked,
                ]}
              >
                {checklist[item.key] && (
                  <Text style={s.checkMark}>✓</Text>
                )}
              </View>
              <View style={s.checklistCopy}>
                <Text
                  style={[
                    s.checklistLabel,
                    checklist[item.key] && s.checklistLabelChecked,
                  ]}
                >
                  {item.label}
                </Text>
                <Text style={s.checklistDesc}>{item.description}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* ── Start Trading CTA ── */}
        <Pressable
          accessibilityRole="button"
          disabled={isStarting || isMarketClosed}
          onPress={handleStartTrading}
          style={({ pressed }) => [
            s.ctaButton,
            (!allChecked || isMarketClosed) && s.ctaButtonIncomplete,
            (pressed || isStarting) && s.ctaButtonPressed,
          ]}
        >
          <Text style={s.ctaButtonText}>
            {isMarketClosed
              ? 'MARKET CLOSED'
              : isStarting
              ? 'INITIALIZING...'
              : allChecked
                ? 'START TRADING SESSION'
                : 'COMPLETE CHECKLIST'}
          </Text>
          {!isStarting && !isMarketClosed && <Text style={s.ctaArrow}>ϟ</Text>}
        </Pressable>

        {!allChecked && !isMarketClosed && (
          <Text style={s.ctaHint}>
            Complete all checklist items for optimal readiness.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function ReadinessRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.readinessRow}>
      <Text style={s.readinessLabel}>{label}</Text>
      <View
        style={[
          s.readinessBadge,
          value === 'High' && s.readinessBadgeHigh,
          value === 'Low' && s.readinessBadgeLow,
        ]}
      >
        <Text style={s.readinessBadgeText}>{value.toUpperCase()}</Text>
      </View>
    </View>
  );
}

function IntelligenceCard({
  body,
  icon,
  isItalic,
  title,
}: {
  body: string;
  icon: string;
  isItalic?: boolean;
  title: string;
}) {
  return (
    <View style={s.proIntelCard}>
      <View style={s.proIntelHeader}>
        <Text style={s.proIntelIcon}>{icon}</Text>
        <Text style={s.proIntelTitle}>{title}</Text>
      </View>
      <Text style={[s.proIntelBody, isItalic && s.italicText]}>{body}</Text>
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
    color: '#8a8f93',
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
    backgroundColor: '#8a8f93',
    borderRadius: 2,
    height: '100%',
  },
  objectiveBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: '#8a8f93',
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
    color: '#8a8f93',
    fontSize: 14,
  },
  threatCardTitle: {
    color: '#8a8f93',
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

  // Quote
  quoteCard: {
    backgroundColor: '#14181a',
    borderColor: 'rgba(233, 193, 118, 0.08)',
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 20,
    marginHorizontal: 20,
    padding: 20,
  },
  quoteMark: {
    color: '#2a3135',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 42,
    marginRight: 14,
  },
  quoteText: {
    color: '#d1c5b4',
    flex: 1,
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 22,
  },

  // Trading fact
  factCard: {
    backgroundColor: '#0a192f',
    borderColor: 'rgba(233, 193, 118, 0.25)',
    borderWidth: 1,
    marginBottom: 20,
    marginHorizontal: 20,
    marginTop: 8,
    padding: 20,
  },
  factEyebrow: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  factText: {
    color: '#e0e3e5',
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 22,
  },

  // Session card
  sessionCard: {
    backgroundColor: '#1a1e1f',
    borderColor: 'rgba(233, 193, 118, 0.2)',
    borderWidth: 1,
    marginBottom: 20,
    marginHorizontal: 20,
    padding: 20,
  },
  sessionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sessionEyebrow: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  sessionDot: {
    backgroundColor: '#e9c176',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  sessionName: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 16,
  },
  sessionGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  sessionGridItem: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  sessionGridLabel: {
    color: '#8a8f93',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  sessionGridValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
  },

  // Readiness
  readinessCard: {
    backgroundColor: '#1a1e1f',
    borderColor: 'rgba(233, 193, 118, 0.2)',
    borderWidth: 1,
    marginBottom: 24,
    marginHorizontal: 20,
    padding: 20,
  },
  sectionEyebrow: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  readinessRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  readinessLabel: {
    color: '#d1c5b4',
    fontSize: 14,
    fontWeight: '700',
  },
  readinessBadge: {
    backgroundColor: '#e9c176',
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  readinessBadgeHigh: {
    backgroundColor: '#79d284',
  },
  readinessBadgeLow: {
    backgroundColor: '#e27b7b',
  },
  readinessBadgeText: {
    color: '#101415',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },

  // Section title
  sectionTitle: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 14,
    marginHorizontal: 20,
    marginTop: 4,
  },

  // Intelligence cards
  proIntelCard: {
    backgroundColor: '#14181a',
    borderColor: 'rgba(233, 193, 118, 0.12)',
    borderLeftColor: '#e9c176',
    borderLeftWidth: 3,
    borderWidth: 1,
    marginBottom: 10,
    marginHorizontal: 20,
    padding: 18,
  },
  proIntelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  proIntelIcon: {
    color: '#e9c176',
    fontSize: 16,
  },
  proIntelTitle: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  proIntelBody: {
    color: '#d1c5b4',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  italicText: {
    fontStyle: 'italic',
  },

  // Checklist
  checklistSection: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
  },
  checklistHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  checklistCount: {
    color: '#e9c176',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  checklistProgressTrack: {
    backgroundColor: 'rgba(233, 193, 118, 0.1)',
    borderRadius: 2,
    height: 4,
    marginBottom: 16,
    width: '100%',
  },
  checklistProgressFill: {
    backgroundColor: '#e9c176',
    borderRadius: 2,
    height: '100%',
  },
  checklistItem: {
    alignItems: 'center',
    backgroundColor: '#1a1e1f',
    borderColor: '#2a3135',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 8,
    padding: 16,
  },
  checklistItemChecked: {
    borderColor: 'rgba(233, 193, 118, 0.35)',
  },
  checkBox: {
    alignItems: 'center',
    borderColor: '#5a5f63',
    borderRadius: 3,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkBoxChecked: {
    backgroundColor: '#e9c176',
    borderColor: '#e9c176',
  },
  checkMark: {
    color: '#101415',
    fontSize: 14,
    fontWeight: '900',
  },
  checklistCopy: {
    flex: 1,
  },
  checklistLabel: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 3,
  },
  checklistLabelChecked: {
    color: '#e9c176',
  },
  checklistDesc: {
    color: '#8a8f93',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },

  // CTA
  ctaButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    minHeight: 58,
    shadowColor: '#e9c176',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  ctaButtonIncomplete: {
    backgroundColor: '#c5a059',
    shadowOpacity: 0.15,
  },
  ctaButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  ctaButtonText: {
    color: '#101415',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  ctaArrow: {
    color: '#101415',
    fontSize: 22,
    fontWeight: '900',
  },
  ctaHint: {
    color: '#5a5f63',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginTop: 10,
    textAlign: 'center',
  },
});
