import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { gradeFromScore } from '../logic/disciplineScore';
import { firestore } from '../services/firebase';
import type { MissionSummary } from '../services/missionSummary';
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
  completedAt?: any;
  readinessScore?: number;
  lastMindsetScore?: number;
  readinessCheck?: {
    score?: number;
  };
  coachMessage?: any;
  disciplineScore?: number;
  disciplineGrade?: string;
  missionSummary?: MissionSummary;
  [key: string]: any;
};

type SessionNoteRecord = {
  id: string;
  missionId?: string;
  content?: string;
  text?: string;
  [key: string]: any;
};

type VaultQuickFilter = 'all' | 'debriefed' | 'missing' | 'best';
type VaultListRange = 'recent10' | 'last30' | 'all';

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
  const [sessionNotes, setSessionNotes] = useState<SessionNoteRecord[]>([]);
  const [hasLoadedMissions, setHasLoadedMissions] = useState(false);
  const [hasLoadedNotes, setHasLoadedNotes] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<VaultQuickFilter>('all');
  const [listRange, setListRange] = useState<VaultListRange>('recent10');

  useEffect(() => {
    if (!user) {
      setMissions([]);
      setSessionNotes([]);
      setHasLoadedMissions(true);
      setHasLoadedNotes(true);
      return;
    }

    const missionsQuery = query(
      collection(firestore, 'missions'),
      where('userId', '==', user.uid),
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc'),
      limit(100),
    );

    const notesQuery = query(
      collection(firestore, 'session_notes'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(200),
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

    const unsubscribeNotes = onSnapshot(
      notesQuery,
      (snapshot) => {
        setSessionNotes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SessionNoteRecord)));
        setHasLoadedNotes(true);
      },
      (error) => {
        console.error('Error loading vault session notes:', error);
        setSessionNotes([]);
        setHasLoadedNotes(true);
      },
    );

    return () => {
      unsubscribeMissions();
      unsubscribeNotes();
    };
  }, [user]);

  const notesByMissionId = useMemo(() => {
    const map = new Map<string, SessionNoteRecord[]>();
    sessionNotes.forEach((note) => {
      if (!note.missionId) return;
      const existing = map.get(note.missionId) || [];
      existing.push(note);
      map.set(note.missionId, existing);
    });
    return map;
  }, [sessionNotes]);

  const archive = useMemo(() => {
    return missions.map((mission) => ({
      mission,
      notes: notesByMissionId.get(mission.id) || [],
    }));
  }, [missions, notesByMissionId]);

  const calendarDays = useMemo(() => buildCalendarDays(archive.map((item) => item.mission)), [archive]);

  // When a calendar day is selected, filter to that day only.
  // When no day is selected (user tapped a range/filter button), show all dates.
  const filteredArchive = useMemo(() => {
    return archive.filter(({ mission }) => {
      if (selectedDateKey && missionDateKey(mission) !== selectedDateKey) return false;

      if (quickFilter === 'debriefed') return missionHasDebrief(mission);
      if (quickFilter === 'missing') return !missionHasDebrief(mission);
      if (quickFilter === 'best') return missionIsBestScore(mission);

      return true;
    });
  }, [archive, quickFilter, selectedDateKey]);

  const visibleArchive = useMemo(() => {
    // When a specific day is selected on the calendar, show ALL missions for that day (no range cap)
    if (selectedDateKey) return filteredArchive;

    if (listRange === 'all') return filteredArchive;

    if (listRange === 'last30') {
      const cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
      cutoff.setDate(cutoff.getDate() - 29);
      return filteredArchive.filter(({ mission }) => {
        const date = missionCompletedDate(mission);
        return date ? date >= cutoff : false;
      });
    }

    return filteredArchive.slice(0, 10);
  }, [filteredArchive, listRange, selectedDateKey]);

  const stats = useMemo(() => {
    const scores = archive
      .map((item) => item.mission.missionSummary?.discipline?.score ?? item.mission.disciplineScore)
      .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
    const grades = archive
      .map((item) => item.mission.missionSummary?.discipline?.grade ?? item.mission.disciplineGrade)
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

  const isLoading = !hasLoadedMissions || !hasLoadedNotes;

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

        {!isLoading && archive.length > 0 && (
          <MissionCalendar
            days={calendarDays}
            onSelectDate={(dateKey) => {
              // Selecting a calendar day: show that single day, reset range
              setSelectedDateKey(dateKey);
              setListRange('recent10');
              setQuickFilter('all');
            }}
            onSelectListRange={(range) => {
              // Selecting a range: clear the day selection so all dates are visible
              setSelectedDateKey(null);
              setListRange(range);
            }}
            onSelectQuickFilter={(filter) => {
              // Selecting a quick filter: clear the day selection
              setSelectedDateKey(null);
              setQuickFilter(filter);
            }}
            listRange={listRange}
            quickFilter={quickFilter}
            selectedDateKey={selectedDateKey}
          />
        )}

        {isLoading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>LOADING ARCHIVE</Text>
            <Text style={styles.emptyText}>Retrieving completed missions...</Text>
          </View>
        ) : archive.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>NO RECORDED MISSION DATA</Text>
            <Text style={styles.emptyText}>
              Completed missions will appear here.
            </Text>
          </View>
        ) : visibleArchive.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>NO MATCHING RECORDS</Text>
            <Text style={styles.emptyText}>Clear the calendar or filter selection to review more missions.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {visibleArchive.map(({ mission, notes }) => (
              <VaultCard
                key={mission.id}
                mission={mission}
                notes={notes}
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
  notes,
  onView,
}: {
  mission: MissionArchiveRecord;
  notes: SessionNoteRecord[];
  onView: () => void;
}) {
  const summary = mission.missionSummary;
  const threats = summary?.threats || mission.threats || [];
  const objective = labelFor(summary?.objective || mission.objective, objectiveLabels);
  const focus = labelFor(summary?.coreFocus || mission.coreFocus, focusLabels);
  const threat = Array.isArray(threats) && threats.length > 0
    ? labelFor(threats[0], threatLabels)
    : '—';
  const score = summary?.discipline?.score ?? mission.disciplineScore;
  const grade = summary?.discipline?.grade ?? mission.disciplineGrade ?? (typeof score === 'number' ? gradeFromScore(score) : undefined);
  const readinessScore = summary?.readiness?.score ?? mission.readinessScore ?? mission.lastMindsetScore ?? mission.readinessCheck?.score;
  const hasDebrief = Boolean(summary?.debriefId || mission.debriefId || grade || typeof score === 'number');
  const noteText = notes.map(noteSnippet).filter(Boolean).join(' ');

  return (
    <View style={styles.card}>
      <View style={styles.cardAccent} />
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardEyebrow}>MISSION RECORD</Text>
          <Text style={styles.cardDate}>{formatDate(summary?.completedAt || mission.completedAt || summary?.createdAt || mission.createdAt)}</Text>
        </View>
        <View style={[styles.gradeBadge, !hasDebrief && styles.noDebriefBadge]}>
          <Text style={[styles.gradeText, !hasDebrief && styles.noDebriefText]}>
            {hasDebrief ? grade || '—' : 'DEBRIEF MISSING'}
          </Text>
        </View>
      </View>

      <View style={styles.parameters}>
        <ParameterPill label="OBJECTIVE" value={objective} />
        <ParameterPill label="THREAT" value={threat} isThreat />
        <ParameterPill label="FOCUS" value={focus} />
      </View>

      <View style={styles.metricsRow}>
        <SmallMetric label="DISCIPLINE" value={typeof score === 'number' ? `${score}/100` : '—'} />
        <SmallMetric label="READINESS" value={typeof readinessScore === 'number' ? `${readinessScore}/100` : '—'} />
      </View>

      <View style={styles.messageBox}>
        <Text style={styles.messageLabel}>SESSION NOTES</Text>
        <Text style={styles.messageText} numberOfLines={2}>
          {noteText || 'No session notes.'}
        </Text>
      </View>

      <Pressable onPress={onView} style={({ pressed }) => [styles.viewButton, pressed && styles.buttonPressed]}>
        <Text style={styles.viewButtonText}>VIEW DETAILS</Text>
      </Pressable>
    </View>
  );
}

function MissionCalendar({
  days,
  listRange,
  onSelectDate,
  onSelectListRange,
  onSelectQuickFilter,
  quickFilter,
  selectedDateKey,
}: {
  days: CalendarDay[];
  listRange: VaultListRange;
  onSelectDate: (dateKey: string) => void;
  onSelectListRange: (range: VaultListRange) => void;
  onSelectQuickFilter: (filter: VaultQuickFilter) => void;
  quickFilter: VaultQuickFilter;
  selectedDateKey: string | null;
}) {
  const calendarScrollRef = useRef<ScrollView | null>(null);
  const filters: Array<{ key: VaultQuickFilter; label: string }> = [
    { key: 'all', label: 'ALL' },
    { key: 'debriefed', label: 'DEBRIEFED' },
    { key: 'missing', label: 'NO DEBRIEF' },
    { key: 'best', label: 'BEST SCORES' },
  ];

  return (
    <View style={styles.calendarSection}>
      <View style={styles.calendarHeader}>
        <View>
          <Text style={styles.calendarTitle}>MISSION CALENDAR</Text>
          <Text style={styles.calendarHelper}>Tap a day to review completed sessions.</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        ref={calendarScrollRef}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.calendarStrip}
        onContentSizeChange={() => calendarScrollRef.current?.scrollToEnd({ animated: false })}
      >
        {days.map((day) => {
          const isSelected = selectedDateKey === day.key;
          return (
            <Pressable
              key={day.key}
              onPress={() => onSelectDate(day.key)}
              style={[styles.dayCell, isSelected && styles.dayCellSelected]}
            >
              <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>{day.weekday}</Text>
              <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>{day.day}</Text>
              <View style={styles.dayIndicatorRow}>
                {day.hasCompleted && (
                  <View
                    style={[
                      styles.dayIndicator,
                      day.hasBestScore && styles.dayIndicatorBest,
                      day.hasMissingDebrief && styles.dayIndicatorWarning,
                    ]}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.quickFilters}>
        <Pressable
          onPress={() => onSelectListRange('recent10')}
          style={[styles.quickFilterButton, !selectedDateKey && listRange === 'recent10' && styles.quickFilterButtonActive]}
        >
          <Text style={[styles.quickFilterText, !selectedDateKey && listRange === 'recent10' && styles.quickFilterTextActive]}>LATEST 10</Text>
        </Pressable>
        <Pressable
          onPress={() => onSelectListRange('last30')}
          style={[styles.quickFilterButton, !selectedDateKey && listRange === 'last30' && styles.quickFilterButtonActive]}
        >
          <Text style={[styles.quickFilterText, !selectedDateKey && listRange === 'last30' && styles.quickFilterTextActive]}>LAST 30 DAYS</Text>
        </Pressable>
        <Pressable
          onPress={() => onSelectListRange('all')}
          style={[styles.quickFilterButton, !selectedDateKey && listRange === 'all' && styles.quickFilterButtonActive]}
        >
          <Text style={[styles.quickFilterText, !selectedDateKey && listRange === 'all' && styles.quickFilterTextActive]}>ALL</Text>
        </Pressable>
        {filters.filter(f => f.key !== 'all').map((filter) => {
          const isActive = !selectedDateKey && quickFilter === filter.key;
          return (
            <Pressable
              key={filter.key}
              onPress={() => onSelectQuickFilter(filter.key)}
              style={[styles.quickFilterButton, isActive && styles.quickFilterButtonActive]}
            >
              <Text style={[styles.quickFilterText, isActive && styles.quickFilterTextActive]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </View>
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

function noteSnippet(note: SessionNoteRecord): string {
  return note.content || note.text || '';
}

function bestGrade(grades: string[]): string | null {
  if (grades.length === 0) return null;
  const order = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'Recovery Required', 'C-', 'D+', 'D', 'D-'];
  return [...grades].sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] || grades[0];
}

type CalendarDay = {
  key: string;
  weekday: string;
  day: string;
  hasCompleted: boolean;
  hasBestScore: boolean;
  hasMissingDebrief: boolean;
};

function buildCalendarDays(missions: MissionArchiveRecord[]): CalendarDay[] {
  return Array.from({ length: 14 }).map((_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (13 - index));
    const key = formatDateKey(date);
    const dayMissions = missions.filter((mission) => missionDateKey(mission) === key);

    return {
      key,
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3).toUpperCase(),
      day: String(date.getDate()),
      hasCompleted: dayMissions.length > 0,
      hasBestScore: dayMissions.some(missionIsBestScore),
      hasMissingDebrief: dayMissions.some((mission) => !missionHasDebrief(mission)),
    };
  });
}

function missionDateKey(mission: MissionArchiveRecord): string {
  const date = missionCompletedDate(mission);
  return date ? formatDateKey(date) : '';
}

function missionCompletedDate(mission: MissionArchiveRecord): Date | null {
  const summary = mission.missionSummary;
  return dateFromUnknown(summary?.completedAt || mission.completedAt || summary?.createdAt || mission.createdAt);
}

function missionHasDebrief(mission: MissionArchiveRecord): boolean {
  const summary = mission.missionSummary;
  const score = summary?.discipline?.score ?? mission.disciplineScore;
  const grade = summary?.discipline?.grade ?? mission.disciplineGrade;
  return Boolean(summary?.debriefId || mission.debriefId || grade || typeof score === 'number');
}

function missionIsBestScore(mission: MissionArchiveRecord): boolean {
  const summary = mission.missionSummary;
  const score = summary?.discipline?.score ?? mission.disciplineScore;
  const grade = summary?.discipline?.grade ?? mission.disciplineGrade;
  return (typeof score === 'number' && score >= 90) || ['S', 'A+', 'A', 'A-'].includes(grade || '');
}

function dateFromUnknown(value: any): Date | null {
  const date = value?.toDate?.() || (value instanceof Date ? value : null);
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  calendarSection: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    marginBottom: 18,
    padding: 14,
  },
  calendarHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  calendarTitle: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  calendarHelper: {
    color: '#8a8f93',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  calendarStrip: {
    gap: 8,
    paddingBottom: 12,
  },
  dayCell: {
    alignItems: 'center',
    backgroundColor: '#0a0f10',
    borderColor: '#2a3135',
    borderWidth: 1,
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  dayCellSelected: {
    borderColor: '#e9c176',
  },
  dayName: {
    color: '#8a8f93',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  dayNameSelected: {
    color: '#e9c176',
  },
  dayNumber: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '900',
  },
  dayNumberSelected: {
    color: '#e9c176',
  },
  dayIndicatorRow: {
    alignItems: 'center',
    height: 8,
    justifyContent: 'center',
    marginTop: 5,
  },
  dayIndicator: {
    backgroundColor: '#e9c176',
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  dayIndicatorBest: {
    backgroundColor: '#79d284',
  },
  dayIndicatorWarning: {
    backgroundColor: '#f0c978',
    borderRadius: 0,
  },
  quickFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  quickFilterButton: {
    backgroundColor: '#0a0f10',
    borderColor: '#2a3135',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  quickFilterButtonActive: {
    borderColor: '#e9c176',
  },
  quickFilterText: {
    color: '#8a8f93',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  quickFilterTextActive: {
    color: '#e9c176',
  },
  emptyCard: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    padding: 22,
  },
  emptyTitle: {
    color: '#f3a0a4',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: '#8a8f93',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
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
  noDebriefBadge: {
    backgroundColor: '#1b2022',
    borderColor: '#2a3135',
    borderWidth: 1,
  },
  gradeText: {
    color: '#101415',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  noDebriefText: {
    color: '#8a8f93',
    fontSize: 9,
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
