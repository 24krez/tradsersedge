import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { firestore } from '../services/firebase';
import { MissionDetailScreen } from './MissionDetailScreen';

type VaultScreenProps = {
  onNavigateToMission?: (missionId: string) => void;
};

type MissionArchiveRecord = {
  id: string;
  objective?: string;
  coreFocus?: string;
  threats?: string[];
  createdAt?: any;
  readinessScore?: number;
  coachMessage?: any;
  [key: string]: any;
};

type DebriefArchiveRecord = {
  id: string;
  missionId?: string;
  discipline?: {
    score?: number;
    grade?: string;
  };
  coachMessage?: any;
  [key: string]: any;
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

export function VaultScreen({ onNavigateToMission }: VaultScreenProps) {
  const { user } = useAuth();
  const [missions, setMissions] = useState<MissionArchiveRecord[]>([]);
  const [debriefs, setDebriefs] = useState<DebriefArchiveRecord[]>([]);
  const [hasLoadedMissions, setHasLoadedMissions] = useState(false);
  const [hasLoadedDebriefs, setHasLoadedDebriefs] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setMissions([]);
      setDebriefs([]);
      setHasLoadedMissions(true);
      setHasLoadedDebriefs(true);
      return;
    }

    const missionsQuery = query(
      collection(firestore, 'missions'),
      where('userId', '==', user.uid),
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc'),
      limit(100),
    );

    const debriefsQuery = query(
      collection(firestore, 'mission_debriefs'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(100),
    );

    const unsubscribeMissions = onSnapshot(
      missionsQuery,
      (snapshot) => {
        setMissions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MissionArchiveRecord)));
        setHasLoadedMissions(true);
      },
      (error) => {
        console.error('Error loading vault missions:', error);
        setMissions([]);
        setHasLoadedMissions(true);
      },
    );

    const unsubscribeDebriefs = onSnapshot(
      debriefsQuery,
      (snapshot) => {
        setDebriefs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DebriefArchiveRecord)));
        setHasLoadedDebriefs(true);
      },
      (error) => {
        console.error('Error loading vault debriefs:', error);
        setDebriefs([]);
        setHasLoadedDebriefs(true);
      },
    );

    return () => {
      unsubscribeMissions();
      unsubscribeDebriefs();
    };
  }, [user]);

  const debriefByMissionId = useMemo(() => {
    const map = new Map<string, DebriefArchiveRecord>();
    debriefs.forEach((debrief) => {
      if (debrief.missionId && !map.has(debrief.missionId)) {
        map.set(debrief.missionId, debrief);
      }
    });
    return map;
  }, [debriefs]);

  const archive = useMemo(() => {
    return missions.map((mission) => ({
      mission,
      debrief: debriefByMissionId.get(mission.id) || null,
    }));
  }, [missions, debriefByMissionId]);

  const stats = useMemo(() => {
    const scores = archive
      .map((item) => item.debrief?.discipline?.score)
      .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
    const grades = archive
      .map((item) => item.debrief?.discipline?.grade)
      .filter((grade): grade is string => typeof grade === 'string' && grade.length > 0);

    return {
      total: archive.length,
      averageScore: scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
      bestGrade: bestGrade(grades),
    };
  }, [archive]);

  if (selectedMissionId) {
    return <MissionDetailScreen missionId={selectedMissionId} onBack={() => setSelectedMissionId(null)} />;
  }

  const isLoading = !hasLoadedMissions || !hasLoadedDebriefs;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.eyebrow}>COMPLETED SESSION ARCHIVE</Text>
          </View>
          <Text style={styles.title}>MISSION VAULT</Text>
        </View>

        <View style={styles.statsRow}>
          <StatBox label="COMPLETED" value={String(stats.total)} />
          <StatBox label="AVG SCORE" value={stats.averageScore === null ? '—' : String(stats.averageScore)} />
          <StatBox label="BEST GRADE" value={stats.bestGrade || '—'} />
        </View>

        {isLoading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>LOADING ARCHIVE</Text>
            <Text style={styles.emptyText}>Retrieving completed missions...</Text>
          </View>
        ) : archive.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>NO COMPLETED MISSIONS YET</Text>
            <Text style={styles.emptyText}>
              Finish your first trading session to unlock your mission history.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {archive.map(({ mission, debrief }) => (
              <VaultCard
                debrief={debrief}
                key={mission.id}
                mission={mission}
                onView={() => {
                  if (onNavigateToMission) {
                    onNavigateToMission(mission.id);
                  } else {
                    setSelectedMissionId(mission.id);
                  }
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function VaultCard({
  mission,
  debrief,
  onView,
}: {
  mission: MissionArchiveRecord;
  debrief: DebriefArchiveRecord | null;
  onView: () => void;
}) {
  const objective = labelFor(mission.objective, objectiveLabels);
  const focus = labelFor(mission.coreFocus, focusLabels);
  const threat = Array.isArray(mission.threats) && mission.threats.length > 0
    ? labelFor(mission.threats[0], threatLabels)
    : '—';
  const score = debrief?.discipline?.score;
  const grade = debrief?.discipline?.grade;
  const messageText = messageSnippet(mission.coachMessage || debrief?.coachMessage);

  return (
    <View style={styles.card}>
      <View style={styles.cardAccent} />
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardEyebrow}>MISSION RECORD</Text>
          <Text style={styles.cardDate}>{formatDate(mission.createdAt)}</Text>
        </View>
        {grade && (
          <View style={styles.gradeBadge}>
            <Text style={styles.gradeText}>{grade}</Text>
          </View>
        )}
      </View>

      <View style={styles.parameters}>
        <ParameterPill label="OBJECTIVE" value={objective} />
        <ParameterPill label="THREAT" value={threat} isThreat />
        <ParameterPill label="FOCUS" value={focus} />
      </View>

      <View style={styles.metricsRow}>
        <SmallMetric label="DISCIPLINE" value={typeof score === 'number' ? `${score}/100` : '—'} />
        <SmallMetric label="READINESS" value={typeof mission.readinessScore === 'number' ? `${mission.readinessScore}/100` : '—'} />
      </View>

      {messageText && (
        <View style={styles.messageBox}>
          <Text style={styles.messageLabel}>SAVED SIGNAL</Text>
          <Text style={styles.messageText} numberOfLines={2}>{messageText}</Text>
        </View>
      )}

      <Pressable onPress={onView} style={({ pressed }) => [styles.viewButton, pressed && styles.buttonPressed]}>
        <Text style={styles.viewButtonText}>VIEW DETAILS</Text>
      </Pressable>
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ParameterPill({ label, value, isThreat }: { label: string; value: string; isThreat?: boolean }) {
  return (
    <View style={styles.parameterPill}>
      <Text style={styles.parameterLabel}>{label}</Text>
      <Text style={[styles.parameterValue, isThreat && styles.threatValue]}>{value}</Text>
    </View>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.smallMetric}>
      <Text style={styles.smallMetricLabel}>{label}</Text>
      <Text style={styles.smallMetricValue}>{value}</Text>
    </View>
  );
}

function labelFor(value: unknown, labels: Record<string, string>): string {
  if (typeof value !== 'string' || !value) return '—';
  return labels[value] || value.replace(/([A-Z])/g, ' $1').trim().toUpperCase();
}

function formatDate(value: any): string {
  const date = value?.toDate?.() || (value instanceof Date ? value : null);
  if (!date) return 'DATE UNAVAILABLE';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date).toUpperCase();
}

function messageSnippet(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.text === 'string') return value.text;
  if (typeof value.body === 'string') return value.body;
  return '';
}

function bestGrade(grades: string[]): string | null {
  if (grades.length === 0) return null;
  const order = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'C', 'Recovery Required'];
  return [...grades].sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] || grades[0];
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
  header: {
    marginBottom: 22,
    marginTop: 10,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
  statusDot: {
    backgroundColor: '#e9c176',
    height: 8,
    marginRight: 8,
    width: 8,
  },
  eyebrow: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  title: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  statLabel: {
    color: '#8a8f93',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  statValue: {
    color: '#e9c176',
    fontSize: 22,
    fontWeight: '900',
  },
  emptyCard: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    padding: 22,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyText: {
    color: '#8a8f93',
    fontSize: 13,
    lineHeight: 20,
  },
  list: {
    gap: 14,
  },
  card: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    padding: 18,
    position: 'relative',
  },
  cardAccent: {
    backgroundColor: '#e9c176',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 3,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardEyebrow: {
    color: '#8a8f93',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 5,
  },
  cardDate: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  gradeBadge: {
    backgroundColor: '#e9c176',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  gradeText: {
    color: '#101415',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  parameters: {
    gap: 8,
    marginBottom: 14,
  },
  parameterPill: {
    backgroundColor: '#0a0f10',
    borderColor: '#2a3135',
    borderWidth: 1,
    padding: 12,
  },
  parameterLabel: {
    color: '#8a8f93',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 5,
  },
  parameterValue: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  threatValue: {
    color: '#e27b7b',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  smallMetric: {
    backgroundColor: '#1b2022',
    flex: 1,
    padding: 12,
  },
  smallMetricLabel: {
    color: '#8a8f93',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  smallMetricValue: {
    color: '#e9c176',
    fontSize: 13,
    fontWeight: '900',
  },
  messageBox: {
    borderTopColor: '#2a3135',
    borderTopWidth: 1,
    marginBottom: 14,
    paddingTop: 12,
  },
  messageLabel: {
    color: '#e9c176',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  messageText: {
    color: '#d1c5b4',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  viewButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    justifyContent: 'center',
    minHeight: 46,
  },
  viewButtonText: {
    color: '#101415',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
