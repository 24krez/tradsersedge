import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MissionStackNavigationProp, RootStackParamList } from '../../App';
import { useAuth, useIsPro } from '../contexts/AuthContext';
import { getCoachMessage } from '../features/coaching/coachEngine';
import { firestore } from '../services/firebase';
import type { MissionSummary } from '../services/missionSummary';

type MissionDetailProps = {
  missionId: string;
  onBack?: () => void;
};

type DetailState = {
  mission: any | null;
  debrief: any | null;
  readiness: any | null;
  notes: any[];
};

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

export function MissionDetailRouteScreen() {
  const navigation = useNavigation<MissionStackNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'MissionDetail'>>();

  return (
    <MissionDetailScreen
      missionId={route.params.missionId}
      onBack={() => navigation.goBack()}
    />
  );
}

export function MissionDetailScreen({ missionId, onBack }: MissionDetailProps) {
  const { user } = useAuth();
  const isPro = useIsPro();
  const [state, setState] = useState<DetailState>({
    mission: null,
    debrief: null,
    readiness: null,
    notes: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !missionId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const userId = user.uid;

    async function loadDetail() {
      setIsLoading(true);
      try {
        const missionSnap = await getDoc(doc(firestore, 'missions', missionId));
        const mission = missionSnap.exists() ? { id: missionSnap.id, ...missionSnap.data() } : null;

        const debriefQuery = query(
          collection(firestore, 'mission_debriefs'),
          where('missionId', '==', missionId),
          where('userId', '==', userId),
          limit(1),
        );
        const debriefSnap = await getDocs(debriefQuery);
        const debrief = debriefSnap.empty
          ? null
          : { id: debriefSnap.docs[0].id, ...debriefSnap.docs[0].data() };

        const readinessQuery = query(
          collection(firestore, 'mindset_checkins'),
          where('missionId', '==', missionId),
          where('userId', '==', userId),
          where('type', '==', 'pre_session'),
          orderBy('createdAt', 'desc'),
          limit(1),
        );
        const readinessSnap = await getDocs(readinessQuery);
        const readiness = readinessSnap.empty ? null : readinessSnap.docs[0].data();

        const notesQuery = query(
          collection(firestore, 'session_notes'),
          where('missionId', '==', missionId),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(20),
        );
        const notesSnap = await getDocs(notesQuery);
        const notes = notesSnap.docs.map((note) => ({ id: note.id, ...note.data() }));

        if (isMounted) {
          setState({ mission, debrief, readiness, notes });
        }
      } catch (error) {
        console.error('Error loading mission detail:', error);
        if (isMounted) {
          setState({ mission: null, debrief: null, readiness: null, notes: [] });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [missionId, user]);

  const { mission, debrief, readiness, notes } = state;
  const summary = mission?.missionSummary as MissionSummary | undefined;
  const summaryReadiness = summary?.readiness || {};
  const summaryDiscipline = summary?.discipline || {};
  const summaryThreats = summary?.threats || mission?.threats || [];
  const dateLabel = formatDate(summary?.completedAt || mission?.completedAt || summary?.createdAt || mission?.createdAt || debrief?.createdAt);
  const objective = labelFor(summary?.objective || mission?.objective, objectiveLabels);
  const focus = labelFor(summary?.coreFocus || mission?.coreFocus, focusLabels);
  const threat = Array.isArray(summaryThreats) && summaryThreats.length > 0
    ? labelFor(summaryThreats[0], threatLabels)
    : '—';
  const discipline = debrief?.discipline || debrief?.result || {};
  const score = numberLabel(summaryDiscipline.score ?? discipline.score);
  const rawScore = summaryDiscipline.score ?? discipline.score;
  const grade = summaryDiscipline.grade || discipline.grade || '—';
  const strongestBehavior = summaryDiscipline.strongestBehavior || discipline.strongestBehavior;
  const hasDebrief = Boolean(summary?.debriefId || mission?.debriefId || debrief || rawScore !== undefined || grade !== '—');
  const savedReflection = messageText(summary?.missionReflection || mission?.missionReflection);
  const fallbackReflection = getCoachMessage({
    alertType: 'missionReflection',
    coachingStyle: 'tactical',
    coreFocus: summary?.coreFocus || mission?.coreFocus,
    disciplineScore: typeof rawScore === 'number' ? rawScore : undefined,
    grade,
    hasDebrief,
    missionStatus: (summaryReadiness.missionStatus || readiness?.missionStatus || mission?.missionStatus) as any,
    objective: summary?.objective || mission?.objective,
    screenContext: 'vault_reflection',
    threat: summaryThreats[0],
  }).body;
  const missionReflection = savedReflection || fallbackReflection;
  const sessionStartedAt = dateFromUnknown(mission?.sessionStartedAt || mission?.startedAt);
  const sessionEndedAt = dateFromUnknown(mission?.sessionEndedAt || mission?.endedAt || summary?.completedAt || mission?.completedAt);
  const sessionDuration = formatDuration(sessionStartedAt, sessionEndedAt, debrief?.summary?.sessionLengthMinutes);
  const sessionLabel = (debrief?.session || mission?.session || 'new_york').toString().replace(/_/g, ' ').toUpperCase();
  const tradeStatus = (summary?.tradeStatus || debrief?.execution?.tradeStatus || '—').toString().replace(/_/g, ' ').toUpperCase();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.loadingText}>Loading mission detail...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!mission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          {onBack && (
            <Pressable onPress={onBack} style={styles.backButton}>
              <Text style={styles.backText}>BACK</Text>
            </Pressable>
          )}
          <Text style={styles.emptyTitle}>MISSION NOT FOUND</Text>
          <Text style={styles.emptyText}>This archive record is unavailable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>BACK</Text>
          </Pressable>
        )}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>ARCHIVE RECORD</Text>
          <Text style={styles.title}>MISSION DETAIL</Text>
          <Text style={styles.subtitle}>{dateLabel || 'SESSION DATE UNAVAILABLE'}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.accent} />
          <Text style={styles.sectionTitle}>MISSION PARAMETERS</Text>
          <DetailRow label="OBJECTIVE" value={objective} />
          <DetailRow label="THREAT" value={threat} isThreat />
          <DetailRow label="CORE FOCUS" value={focus} noBorder />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>SESSION DETAILS</Text>
          <View style={styles.grid}>
            <Metric label="SESSION" value={sessionLabel} />
            <Metric label="TRADE STATUS" value={tradeStatus} />
            <Metric label="STARTED" value={formatTime(sessionStartedAt)} />
            <Metric label="ENDED" value={formatTime(sessionEndedAt)} />
            <Metric label="DURATION" value={sessionDuration} />
            <Metric label="PHASE" value={(mission?.missionPhase || mission?.status || '—').toString().replace(/_/g, ' ').toUpperCase()} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>READINESS CHECK</Text>
          <View style={styles.grid}>
            <Metric label="CONFIDENCE" value={readiness?.confidence || '—'} />
            <Metric label="PATIENCE" value={readiness?.patience || '—'} />
            <Metric label="FOCUS" value={readiness?.focus || '—'} />
            <Metric label="STATE" value={(summaryReadiness.missionStatus || readiness?.missionStatus || mission.missionStatus || '—').toString().toUpperCase()} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>MISSION REFLECTION</Text>
          <Text style={styles.coachText}>{missionReflection}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>DEBRIEF</Text>
          <DetailRow label="TRADE STATUS" value={(debrief?.execution?.tradeStatus || '—').toString().toUpperCase()} />
          <DetailRow label="EMOTIONAL STATE" value={(debrief?.psychology?.emotions?.[0] || '—').toString().toUpperCase()} />
          <DetailRow label="LESSON" value={debrief?.lesson?.text || 'No lesson captured.'} noBorder />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>DISCIPLINE SCORE</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>{score}</Text>
            <View style={styles.gradeBadge}>
              <Text style={styles.gradeText}>{grade}</Text>
            </View>
          </View>
          <Text style={styles.rewardText}>
            {strongestBehavior
              ? `Strongest behavior: ${strongestBehavior}`
              : 'Complete debriefs to build a stronger archive.'}
          </Text>
        </View>

        {isPro && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>SESSION NOTES</Text>
            {notes.length === 0 ? (
              <Text style={styles.mutedText}>No session notes saved.</Text>
            ) : (
              notes.map((note) => (
                <View key={note.id} style={styles.noteItem}>
                  <Text style={styles.noteType}>{(note.noteType || 'GENERAL').toString().replace(/_/g, ' ').toUpperCase()}</Text>
                  <Text style={styles.noteText}>{note.content || note.text || '—'}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, isThreat, noBorder }: { label: string; value: string; isThreat?: boolean; noBorder?: boolean }) {
  return (
    <View style={[styles.detailRow, !noBorder && styles.detailRowBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, isThreat && styles.threatValue]}>{value}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function labelFor(value: unknown, labels: Record<string, string>): string {
  if (typeof value !== 'string' || !value) return '—';
  return labels[value] || value.replace(/([A-Z])/g, ' $1').trim().toUpperCase();
}

function formatDate(value: any): string {
  const date = dateFromUnknown(value);
  if (!date) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date).toUpperCase();
}

function numberLabel(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}/100` : '—';
}

function dateFromUnknown(value: any): Date | null {
  const date = value?.toDate?.() || (value instanceof Date ? value : null);
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function formatTime(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).toUpperCase();
}

function formatDuration(start: Date | null, end: Date | null, fallbackMinutes?: number): string {
  const minutes = start && end
    ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000))
    : fallbackMinutes;

  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return '—';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours <= 0) return `${remainder}M`;
  if (remainder === 0) return `${hours}H`;
  return `${hours}H ${remainder}M`;
}

function messageText(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value.text === 'string') return value.text;
  if (typeof value.body === 'string') return value.body;
  return null;
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#101415',
    flex: 1,
  },
  container: {
    padding: 22,
    paddingBottom: 48,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#8a8f93',
    fontSize: 13,
    fontWeight: '700',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 18,
    paddingVertical: 8,
  },
  backText: {
    color: '#e9c176',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  header: {
    marginBottom: 22,
  },
  eyebrow: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#8a8f93',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 6,
  },
  card: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
    position: 'relative',
  },
  accent: {
    backgroundColor: '#e9c176',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 3,
  },
  sectionTitle: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  detailRowBorder: {
    borderBottomColor: '#2a3135',
    borderBottomWidth: 1,
  },
  detailLabel: {
    color: '#8a8f93',
    flex: 0.42,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  detailValue: {
    color: '#f8fafc',
    flex: 0.58,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 17,
    textAlign: 'right',
  },
  threatValue: {
    color: '#e27b7b',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metric: {
    backgroundColor: '#0a0f10',
    borderColor: '#2a3135',
    borderWidth: 1,
    flexGrow: 1,
    minWidth: '46%',
    padding: 13,
  },
  metricLabel: {
    color: '#8a8f93',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 7,
  },
  metricValue: {
    color: '#e9c176',
    fontSize: 14,
    fontWeight: '900',
  },
  coachText: {
    color: '#d1c5b4',
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '600',
    lineHeight: 21,
  },
  scoreRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scoreText: {
    color: '#e9c176',
    fontSize: 30,
    fontWeight: '900',
  },
  gradeBadge: {
    backgroundColor: '#e9c176',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  gradeText: {
    color: '#101415',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  rewardText: {
    color: '#d1c5b4',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  mutedText: {
    color: '#8a8f93',
    fontSize: 13,
    lineHeight: 20,
  },
  noteItem: {
    borderTopColor: '#2a3135',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  noteType: {
    color: '#e9c176',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  noteText: {
    color: '#f8fafc',
    fontSize: 13,
    lineHeight: 20,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyText: {
    color: '#8a8f93',
    fontSize: 13,
    textAlign: 'center',
  },
});
