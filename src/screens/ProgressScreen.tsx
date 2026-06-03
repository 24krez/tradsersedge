import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { firestore } from '../services/firebase';

type ProgressScreenProps = {
  onStartMission?: () => void;
};

export type UserStats = {
  averageDisciplineScore?: number;
  bestDisciplineScore?: number;
  bestGrade?: string;
  currentRank?: string;
  currentStreak?: number;
  growthArea?: string;
  growthAreaChange?: number;
  longestStreak?: number;
  missionSuccessRate?: number;
  nextRank?: string;
  rankProgress?: number;
  totalDebriefs?: number;
  totalDebriefsCompleted?: number;
  totalMissions?: number;
  totalMissionsCompleted?: number;
  tradeDays?: number;
  tradedSessionsCount?: number;
  noTradeDays?: number;
  noTradeSessionsCount?: number;
};

export type MissionRecord = {
  id: string;
  objective?: string;
  coreFocus?: string;
  primaryThreat?: string;
  selectedThreats?: string[];
  threat?: string;
  threats?: string[];
  status?: string;
  createdAt?: unknown;
  completedAt?: unknown;
  disciplineScore?: number;
};

export type DebriefRecord = {
  id: string;
  createdAt?: unknown;
  date?: string;
  missionId?: string;
  mistakes?: string[];
  positiveBehaviors?: string[];
  primaryThreat?: string;
  selectedThreats?: string[];
  discipline?: {
    score?: number;
    grade?: string;
    strongestBehavior?: string;
    improvementArea?: string;
    breakdown?: Record<string, number>;
  };
  execution?: {
    tradeStatus?: string;
  };
  missionSnapshot?: {
    objective?: string;
    threatsIdentified?: string[];
    coreFocus?: string;
  };
};

type CountItem = {
  label: string;
  value: number;
};

type TrendBar = {
  key: string;
  score: number | null;
};

const objectiveLabels: Record<string, string> = {
  protectCapital: 'Protect Capital',
  passChallenge: 'Pass Challenge',
  onlyASetups: 'Take Only A+ Setups',
  observationMode: 'Observation Mode',
};

const focusLabels: Record<string, string> = {
  patience: 'Patience',
  discipline: 'Discipline',
  riskControl: 'Risk Control',
  execution: 'Execution',
  confidence: 'Confidence',
  consistency: 'Consistency',
};

const threatLabels: Record<string, string> = {
  fomo: 'FOMO',
  overtrading: 'Overtrading',
  revengeTrading: 'Revenge Trading',
  movingStops: 'Moving Stops',
  enteringEarly: 'Entering Early',
  chasingBreakouts: 'Chasing Breakouts',
  lackOfPatience: 'Lack of Patience',
  overLeverage: 'Over-Leverage',
};

const improvementRecommendations: Record<string, string> = {
  FOMO: 'Patience During Breakouts',
  Overtrading: 'Wait For A+ Setups',
  'Entering Early': 'Confirmation Before Entry',
  'Lack Of Patience': 'Wait For Confirmation',
  'Lack of Patience': 'Wait For Confirmation',
  'Moving Stops': 'Trust Your Risk Plan',
  'Revenge Trading': 'Reset Before Re-entry',
  'Risk Discipline': 'Trust Your Risk Plan',
  'Emotional Control': 'Reset Before Re-entry',
  'Execution Integrity': 'Confirmation Before Entry',
  'Mission Adherence': 'Wait For A+ Setups',
  'Self-Awareness': 'Journal The Lesson',
};

export function ProgressScreen({ onStartMission }: ProgressScreenProps) {
  const { user, userProfile } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [missions, setMissions] = useState<MissionRecord[]>([]);
  const [debriefs, setDebriefs] = useState<DebriefRecord[]>([]);
  const [hasLoadedStats, setHasLoadedStats] = useState(false);
  const [hasLoadedMissions, setHasLoadedMissions] = useState(false);
  const [hasLoadedDebriefs, setHasLoadedDebriefs] = useState(false);

  useEffect(() => {
    if (!user) {
      setUserStats(null);
      setHasLoadedStats(true);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(firestore, 'user_stats', user.uid),
      (snapshot) => {
        setUserStats(snapshot.exists() ? (snapshot.data() as UserStats) : null);
        setHasLoadedStats(true);
      },
      (error) => {
        console.error('Error loading progress stats:', error);
        setUserStats(null);
        setHasLoadedStats(true);
      },
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setMissions([]);
      setHasLoadedMissions(true);
      return;
    }

    const missionsQuery = query(
      collection(firestore, 'missions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(100),
    );

    const unsubscribe = onSnapshot(
      missionsQuery,
      (snapshot) => {
        setMissions(snapshot.docs.map((missionDoc) => ({ id: missionDoc.id, ...missionDoc.data() } as MissionRecord)));
        setHasLoadedMissions(true);
      },
      (error) => {
        console.error('Error loading progress missions:', error);
        setMissions([]);
        setHasLoadedMissions(true);
      },
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setDebriefs([]);
      setHasLoadedDebriefs(true);
      return;
    }

    const debriefsQuery = query(
      collection(firestore, 'mission_debriefs'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(100),
    );

    const unsubscribe = onSnapshot(
      debriefsQuery,
      (snapshot) => {
        setDebriefs(snapshot.docs.map((debriefDoc) => ({ id: debriefDoc.id, ...debriefDoc.data() } as DebriefRecord)));
        setHasLoadedDebriefs(true);
      },
      (error) => {
        console.error('Error loading progress debriefs:', error);
        setDebriefs([]);
        setHasLoadedDebriefs(true);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const model = useMemo(() => buildProgressModel(userStats, missions, debriefs), [userStats, missions, debriefs]);
  const isLoading = !hasLoadedStats || !hasLoadedMissions || !hasLoadedDebriefs;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>LOADING PROGRESS CENTER...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (model.completedMissions === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>YOUR EDGE IS BEING BUILT.</Text>
          <Text style={styles.emptyBody}>
            {missions.length > 0
              ? 'You have started building your trading history. Complete a debrief after your next session to unlock discipline insights.'
              : 'Complete your first mission and debrief to start tracking discipline, streaks, growth areas, and rank progress.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onStartMission}
            style={({ pressed }) => [styles.startButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.startButtonText}>START MISSION</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Text style={styles.menuIcon}>☰</Text>
          <Text style={styles.brand}>TRADER'S EDGE</Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>TE</Text>
          </View>
        </View>

        <RankCard model={model} callsign={userProfile?.activeCallsign || userProfile?.callsign || ''} />
        <MissionCompletionCard completed={model.completedMissions} completionRate={model.completionRate} />
        <MissionInsightsCard hasLowData={model.hasLowData} signalContext={model.threatSignalContext} strongestTraits={model.strongestTraits} threats={model.commonThreats} />
        <ImprovementCard improvement={model.primaryImprovement} />
        <PerformanceInsightsCard model={model} />
        <TradeMixCard model={model} />
        <LastSevenDaysCard days={model.lastSevenDays} />

        <Text style={styles.footerMotto}>PRECISION IS THE ONLY MEASURE OF SUCCESS</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function RankCard({ model, callsign }: { model: ProgressModel; callsign: string }) {
  return (
    <View style={styles.rankCard}>
      <View style={styles.rankHeader}>
        <View style={styles.rankIdentity}>
          <Text style={styles.rankKicker}>CURRENT RANK</Text>
          <Text style={styles.rankTitle}>{model.currentRank.toUpperCase()}</Text>
        </View>
        {callsign ? (
          <View style={[styles.rankBadge, { borderRadius: 4, paddingHorizontal: 16, marginTop: 0 }]}>
            <Text style={[styles.rankBadgeText, { color: '#101415' }]}>{callsign.toUpperCase()}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.rankStatsRow}>
        <View style={styles.rankStatBlock}>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.rankStatLabel}>DISCIPLINE GRADE</Text>
          <Text style={styles.rankStatValue}>{model.grade}</Text>
        </View>
        <View style={styles.rankStatBlock}>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.rankStatLabel}>COMPLETION RATE</Text>
          <Text style={styles.rankStatValue}>{model.completionRate}%</Text>
        </View>
      </View>

      <View style={styles.rankMetricRow}>
        <View style={styles.scorePanel}>
          <View style={styles.scoreRing}>
            <Text style={styles.scoreRingText}>{model.averageScore}</Text>
          </View>
          <View style={styles.scoreCopy}>
            <Text adjustsFontSizeToFit numberOfLines={2} style={styles.scoreLabel}>DISCIPLINE SCORE</Text>
          </View>
        </View>
        <View style={styles.streakPanel}>
          <View>
            <Text style={styles.panelLabel}>STREAK</Text>
            <Text style={styles.streakValue}>{model.currentStreak}D</Text>
          </View>
          <View style={styles.flameBox}>
            <Text style={styles.flame}>◉</Text>
          </View>
        </View>
      </View>

      <Text style={styles.growthLine}>CURRENT GROWTH AREA: <Text style={styles.goldText}>{model.growthArea}</Text></Text>
      <View style={styles.trendHeader}>
        <Text style={styles.trendLabel}>30-DAY DISCIPLINE TREND</Text>
        <Text style={styles.nextRank}>NEXT RANK: {model.nextRank || 'MAX RANK'}</Text>
      </View>
      {model.hasLowData ? (
        <Text style={styles.lowDataText}>More missions needed to build a reliable trend.</Text>
      ) : null}
      <View style={styles.trendBars}>
        {model.trendBars.map((bar) => (
          <View key={bar.key} style={styles.trendBarSlot}>
            <View
              style={[
                styles.trendBar,
                bar.score === null && styles.trendBarEmpty,
                bar.score !== null && {
                  height: 8 + Math.max(0, Math.min(1, bar.score / 100)) * 34,
                  opacity: 0.45 + Math.max(0, Math.min(1, bar.score / 100)) * 0.55,
                },
              ]}
            />
          </View>
        ))}
      </View>
      <Text style={styles.remainingText}>{model.remainingRequirement}</Text>
    </View>
  );
}

function MissionCompletionCard({ completed, completionRate }: { completed: number; completionRate: number }) {
  return (
    <View style={styles.centerCard}>
      <Text style={styles.centerCardTitle}>MISSION COMPLETION</Text>
      <Text style={styles.completionNumber}>{completed}</Text>
      <Text style={styles.completionLabel}>MISSIONS COMPLETED</Text>
      <View style={styles.successRateRow}>
        <Text style={styles.successRateLabel}>COMPLETION RATE</Text>
        <Text style={styles.successRateValue}>{completionRate}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${completionRate}%` }]} />
      </View>
    </View>
  );
}

function MissionInsightsCard({
  hasLowData,
  signalContext,
  strongestTraits,
  threats,
}: {
  hasLowData: boolean;
  signalContext: string;
  strongestTraits: CountItem[];
  threats: CountItem[];
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>MISSION INSIGHTS</Text>
      <Text style={styles.cardSubtext}>{signalContext}</Text>
      {hasLowData ? <Text style={styles.cardHint}>Complete 3 missions to unlock stronger insights.</Text> : null}
      <View style={styles.twoColumn}>
        <InsightList accent="pink" emptyText="No selected threat signals yet." icon="△" items={threats} title="THREAT SIGNALS" />
        <InsightList accent="gold" emptyText="More completed debriefs needed." icon="◎" items={strongestTraits} title="STRENGTH SIGNALS" />
      </View>
    </View>
  );
}

function InsightList({ accent, emptyText, icon, items, title }: { accent: 'gold' | 'pink'; emptyText: string; icon: string; items: CountItem[]; title: string }) {
  return (
    <View style={styles.insightColumn}>
      <View style={styles.insightHeader}>
        <Text style={[styles.insightIcon, accent === 'pink' && styles.pinkText]}>{icon}</Text>
        <Text style={styles.insightTitle}>{title}</Text>
      </View>
      <View style={styles.insightRule} />
      {items.length > 0 ? items.map((item) => (
        <View key={item.label} style={styles.insightRow}>
          <Text style={styles.insightName}>{item.label}</Text>
          <Text style={[styles.insightCount, accent === 'pink' && styles.pinkText]}>{item.value}</Text>
        </View>
      )) : <Text style={styles.mutedText}>{emptyText}</Text>}
    </View>
  );
}

function ImprovementCard({ improvement }: { improvement: ImprovementModel | null }) {
  if (!improvement) {
    return (
      <View style={[styles.card, styles.improvementCard]}>
        <View style={styles.improvementTextBlock}>
          <Text style={styles.improvementEyebrow}>PRIMARY GROWTH AREA</Text>
          <Text style={styles.noPatternText}>No clear pattern yet.</Text>
        </View>
      </View>
    );
  }

  const signalPressure = improvement.count >= 10 ? 'HIGH' : improvement.count >= 4 ? 'BUILDING' : 'EARLY';
  const filledSegments = improvement.count >= 10 ? 4 : improvement.count >= 7 ? 3 : improvement.count >= 3 ? 2 : 1;

  return (
    <View style={[styles.card, styles.improvementCard]}>
      <View style={styles.improvementTextBlock}>
        <Text style={styles.improvementEyebrow}>PRIMARY GROWTH AREA</Text>
        <Text style={styles.improvementTitle}>{improvement.label}</Text>
        {improvement.isEarly ? <Text style={styles.earlyPatternText}>Early Pattern</Text> : null}
        <Text style={styles.recommendation}>Recommended Focus: {improvement.recommendation}</Text>
        <Text style={styles.improvementAction}>Make this the first checkpoint before every setup.</Text>
      </View>
      <View style={styles.occurrenceBox}>
        <Text style={styles.occurrenceKicker}>PATTERN PRESSURE</Text>
        <Text style={styles.occurrenceNumber}>{improvement.count}</Text>
        <Text style={styles.occurrenceLabel}>{improvement.count === 1 ? 'SIGNAL LOGGED' : 'SIGNALS LOGGED'}</Text>
        <View style={styles.pressureMeter}>
          {[0, 1, 2, 3].map((segment) => (
            <View
              key={segment}
              style={[
                styles.pressureSegment,
                segment < filledSegments && styles.pressureSegmentActive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.pressureLabel}>{signalPressure}</Text>
      </View>
    </View>
  );
}

function PerformanceInsightsCard({ model }: { model: ProgressModel }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>PERFORMANCE INSIGHTS</Text>
      
      {/* Most Used Row */}
      <View style={styles.performanceRow}>
        <PerformanceItem label="MOST USED OBJECTIVE" value={model.mostUsedObjective} />
        <PerformanceItem label="MOST USED FOCUS" value={model.mostUsedFocus} />
      </View>
      
      {/* Highest Scoring Row */}
      <View style={styles.performanceRow}>
        <PerformanceItem label="HIGHEST SCORING OBJECTIVE" value={model.highestScoringObjective} />
        <PerformanceItem label="HIGHEST SCORING FOCUS" value={model.highestScoringFocus} />
      </View>
      
      <View style={styles.scoreGrid}>
        <ScoreLine label="AVG OBJ SCORE" value={model.averageObjectiveScore} />
        <ScoreLine label="AVG FOCUS SCORE" value={model.averageFocusScore} />
      </View>
    </View>
  );
}

function PerformanceItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.performanceItem}>
      <Text style={styles.performanceLabel}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={2} style={styles.performanceValue}>{value}</Text>
    </View>
  );
}

function ScoreLine({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.scoreLine}>
      <View style={styles.scoreLineHeader}>
        <Text style={styles.performanceLabel}>{label}</Text>
        <Text style={styles.scoreLineValue}>{value}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(4, value)}%` }]} />
      </View>
    </View>
  );
}

function TradeMixCard({ model }: { model: ProgressModel }) {
  const total = model.tradeDays + model.noTradeDays + model.incompleteMissions;
  const tradePercent = total > 0 ? (model.tradeDays / total) * 100 : 0;
  const noTradePercent = total > 0 ? (model.noTradeDays / total) * 100 : 0;
  const missedPercent = total > 0 ? (model.incompleteMissions / total) * 100 : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>TRADE / NO-TRADE MIX</Text>
      
      <View style={styles.mixVisualContainer}>
        {total === 0 ? (
          <View style={[styles.mixVisualSegment, styles.mixVisualEmpty, { width: '100%' }]} />
        ) : (
          <>
            {tradePercent > 0 && <View style={[styles.mixVisualSegment, styles.mixVisualTrade, { width: `${tradePercent}%` }]} />}
            {noTradePercent > 0 && <View style={[styles.mixVisualSegment, styles.mixVisualNoTrade, { width: `${noTradePercent}%` }]} />}
            {missedPercent > 0 && <View style={[styles.mixVisualSegment, styles.mixVisualMissed, { width: `${missedPercent}%` }]} />}
          </>
        )}
      </View>

      <View style={styles.mixLegendRow}>
        <MixLegendItem label="TRADE" type="trade" value={model.tradeDays} />
        <MixLegendItem label="NO TRADE" type="notrade" value={model.noTradeDays} />
        <MixLegendItem label="MISSED" type="missed" value={model.incompleteMissions} />
      </View>
    </View>
  );
}

function MixLegendItem({ label, value, type }: { label: string; type: 'missed' | 'notrade' | 'trade'; value: number }) {
  const getDotStyle = () => {
    switch (type) {
      case 'trade': return styles.mixVisualTrade;
      case 'notrade': return styles.mixVisualNoTrade;
      case 'missed': return styles.mixVisualMissed;
    }
  };

  return (
    <View style={styles.mixLegendItem}>
      <View style={styles.mixLegendTop}>
        <View style={[styles.mixLegendDot, getDotStyle()]} />
        <Text style={styles.mixLegendValue}>{value}</Text>
      </View>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.mixLegendLabel}>{label}</Text>
    </View>
  );
}

function LastSevenDaysCard({ days }: { days: DayDot[] }) {
  return (
    <View style={styles.card}>
      <View style={styles.lastDaysHeader}>
        <View style={styles.lastDaysTitleRow}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>LAST 7 DAYS</Text>
          <Pressable style={({ pressed }) => [styles.calendarButton, pressed && styles.buttonPressed]}>
            <Text style={styles.calendarText}>VIEW CALENDAR</Text>
          </Pressable>
        </View>
        <Text style={styles.tapHint}>Tap Any Day To View Summary</Text>
      </View>
      <View style={styles.dayRow}>
        {days.map((day) => (
          <View key={day.key} style={styles.dayItem}>
            <Text style={styles.dayLabel}>{day.label}</Text>
            <View
              style={[
                styles.dayDot,
                day.status === 'completed' && styles.dayDotComplete,
                day.status === 'risk' && styles.dayDotRisk,
              ]}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

type DayDot = {
  key: string;
  label: string;
  status: 'none' | 'completed' | 'risk';
};

type ImprovementModel = {
  count: number;
  isEarly: boolean;
  label: string;
  recommendation: string;
};

export type ProgressModel = {
  averageFocusScore: number;
  averageObjectiveScore: number;
  averageScore: number;
  commonThreats: CountItem[];
  completionRate: number;
  completedMissions: number;
  currentRank: string;
  currentStreak: number;
  grade: string;
  growthArea: string;
  hasLowData: boolean;
  highestScoringFocus: string;
  highestScoringObjective: string;
  incompleteMissions: number;
  lastSevenDays: DayDot[];
  mostUsedFocus: string;
  mostUsedObjective: string;
  nextRank: string | null;
  noTradeDays: number;
  primaryImprovement: ImprovementModel | null;
  remainingRequirement: string;
  strongestTraits: CountItem[];
  tradeDays: number;
  threatSignalContext: string;
  trendBars: TrendBar[];
  trendDirection: string;
  trendScores: number[];
};

export function buildProgressModel(userStats: UserStats | null, missions: MissionRecord[], debriefs: DebriefRecord[]): ProgressModel {
  const scoreDebriefs = debriefs.filter((debrief) => isNumber(debrief.discipline?.score));
  const scores = scoreDebriefs.map((debrief) => numberFrom(debrief.discipline?.score));
  const completedMissionRecords = missions.filter((mission) => mission.status === 'completed');
  const completedMissionsCount = Math.max(numberFrom(userStats?.totalMissionsCompleted), completedMissionRecords.length);
  const totalMissionsStarted = missions.length;
  const averageScore = Math.round(numberFrom(userStats?.averageDisciplineScore) || average(scores));
  const completionRate = clampPercent(totalMissionsStarted ? (completedMissionsCount / totalMissionsStarted) * 100 : 0);
  const currentStreak = numberFrom(userStats?.currentStreak);
  const rank = rankFromCompletedMissions(completedMissionsCount);
  const currentRank = rank.currentRank;
  const nextRank = rank.nextRank;
  const trendScores = scores.slice(0, 30).reverse();
  const trendBars = buildTrendBars(trendScores);
  const threatSignals = calculateThreatSignals(missions, debriefs);
  const commonThreats = topCounts(threatSignals.counts, 3);
  const totalThreatSignals = [...threatSignals.counts.values()].reduce((sum, count) => sum + count, 0);
  const hasLowData = completedMissionsCount < 3;
  const strongestTraits = hasLowData ? [] : topCounts(countTraits(scoreDebriefs, completedMissionRecords), 3);
  const improvementCounts = countImprovementAreas(scoreDebriefs);
  const primaryImprovement = buildPrimaryImprovement(commonThreats[0] || topCounts(improvementCounts, 1)[0], completedMissionsCount);
  const growthArea = userStats?.growthArea || (primaryImprovement ? `${primaryImprovement.label}${primaryImprovement.isEarly ? '' : ` ↑ ${numberFrom(userStats?.growthAreaChange) || primaryImprovement.count}%`}` : 'No Pattern Yet');
  const tradeDays = numberFrom(userStats?.tradeDays ?? userStats?.tradedSessionsCount) || debriefs.filter((debrief) => debrief.execution?.tradeStatus === 'traded').length;
  const noTradeDays = numberFrom(userStats?.noTradeDays ?? userStats?.noTradeSessionsCount) || debriefs.filter((debrief) => debrief.execution?.tradeStatus === 'no_trade').length;
  const incompleteMissions = missions.filter((mission) => mission.status === 'incomplete' || mission.status === 'abandoned' || mission.status === 'pending' || mission.status === 'active').length;
  const performance = buildPerformanceInsights(scoreDebriefs, completedMissionRecords);

  return {
    averageFocusScore: performance.averageFocusScore,
    averageObjectiveScore: performance.averageObjectiveScore,
    averageScore,
    commonThreats,
    completionRate,
    completedMissions: completedMissionsCount,
    currentRank,
    currentStreak,
    grade: displayGrade(gradeFromScore(averageScore)),
    growthArea,
    hasLowData,
    highestScoringFocus: performance.highestScoringFocus,
    highestScoringObjective: performance.highestScoringObjective,
    incompleteMissions,
    lastSevenDays: buildLastSevenDays(missions, scoreDebriefs),
    mostUsedFocus: performance.mostUsedFocus,
    mostUsedObjective: performance.mostUsedObjective,
    nextRank,
    noTradeDays,
    primaryImprovement,
    remainingRequirement: rank.remainingRequirement,
    strongestTraits,
    tradeDays,
    threatSignalContext: totalThreatSignals > 0
      ? `${totalThreatSignals} signals across ${threatSignals.sessions} missions.`
      : 'Signals detected across your mission logs.',
    trendBars,
    trendDirection: trendDirection(trendScores),
    trendScores,
  };
}

function buildPerformanceInsights(debriefs: DebriefRecord[], missions: MissionRecord[]) {
  const objectiveCounts = new Map<string, number>();
  const focusCounts = new Map<string, number>();
  const objectiveScores = new Map<string, number[]>();
  const focusScores = new Map<string, number[]>();

  missions.forEach((mission) => {
    increment(objectiveCounts, labelObjective(mission.objective));
    increment(focusCounts, labelFocus(mission.coreFocus));
  });

  debriefs.forEach((debrief) => {
    const score = numberFrom(debrief.discipline?.score);
    const objective = labelObjective(debrief.missionSnapshot?.objective);
    const focus = labelFocus(debrief.missionSnapshot?.coreFocus);
    pushScore(objectiveScores, objective, score);
    pushScore(focusScores, focus, score);
  });

  return {
    averageFocusScore: Math.round(average([...focusScores.values()].flat())),
    averageObjectiveScore: Math.round(average([...objectiveScores.values()].flat())),
    highestScoringFocus: highestAverageLabel(focusScores),
    highestScoringObjective: highestAverageLabel(objectiveScores),
    mostUsedFocus: topCounts(focusCounts, 1)[0]?.label || 'Not Enough Data',
    mostUsedObjective: topCounts(objectiveCounts, 1)[0]?.label || 'Not Enough Data',
  };
}

function buildLastSevenDays(missions: MissionRecord[], debriefs: DebriefRecord[]): DayDot[] {
  const missionByDate = new Map<string, MissionRecord[]>();
  const debriefByDate = new Map<string, DebriefRecord[]>();

  missions.forEach((mission) => pushByDate(missionByDate, dateKeyFromUnknown(mission.completedAt) || dateKeyFromUnknown(mission.createdAt), mission));
  debriefs.forEach((debrief) => pushByDate(debriefByDate, debrief.date || dateKeyFromUnknown(debrief.createdAt), debrief));

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = formatDateKey(date);
    const dayDebriefs = debriefByDate.get(key) || [];
    const dayMissions = missionByDate.get(key) || [];
    const lowScore = dayDebriefs.some((debrief) => numberFrom(debrief.discipline?.score) < 70);
    const hasCompleted = dayDebriefs.length > 0 || dayMissions.some((mission) => mission.status === 'completed');
    const hasRisk = lowScore || dayMissions.some((mission) => mission.status && mission.status !== 'completed');

    return {
      key,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1).toUpperCase(),
      status: hasRisk ? 'risk' : hasCompleted ? 'completed' : 'none',
    };
  });
}

function calculateThreatSignals(missions: MissionRecord[], debriefs: DebriefRecord[]) {
  const counts = new Map<string, number>();
  const sessionSignals = new Map<string, Set<string>>();

  missions.forEach((mission) => {
    addThreatSignalSet(
      sessionSignals,
      mission.id,
      selectedValues(mission.selectedThreats, mission.threats, mission.primaryThreat, mission.threat),
    );
  });
  debriefs.forEach((debrief) => {
    addThreatSignalSet(
      sessionSignals,
      debrief.missionId || debrief.id,
      selectedValues(debrief.selectedThreats, debrief.mistakes, debrief.primaryThreat),
    );
  });

  sessionSignals.forEach((signals) => {
    signals.forEach((signal) => increment(counts, signal));
  });

  return { counts, sessions: sessionSignals.size };
}

function addThreatSignalSet(map: Map<string, Set<string>>, sessionId: string, threats: string[]) {
  if (!sessionId || threats.length === 0) return;
  const existing = map.get(sessionId) || new Set<string>();
  threats.forEach((threat) => existing.add(labelThreat(threat)));
  map.set(sessionId, existing);
}

function countTraits(debriefs: DebriefRecord[], completedMissions: MissionRecord[]) {
  const counts = new Map<string, number>();
  debriefs.forEach((debrief) => {
    (debrief.positiveBehaviors || []).forEach((behavior) => increment(counts, normalizeInsightLabel(behavior)));
    Object.entries(debrief.discipline?.breakdown || {}).forEach(([key, value]) => {
      if (numberFrom(value) >= 18) increment(counts, normalizeInsightLabel(key));
    });
  });
  completedMissions.forEach((mission) => {
    if (mission.coreFocus) increment(counts, labelFocus(mission.coreFocus));
  });
  return counts;
}

function countImprovementAreas(debriefs: DebriefRecord[]) {
  const counts = new Map<string, number>();
  debriefs.forEach((debrief) => {
    const improvement = debrief.discipline?.improvementArea;
    if (improvement) increment(counts, normalizeInsightLabel(improvement));
  });
  return counts;
}

function buildPrimaryImprovement(item: CountItem | undefined, completedMissions: number): ImprovementModel | null {
  if (!item) return null;
  return {
    count: item.value,
    isEarly: completedMissions < 3,
    label: item.label,
    recommendation: improvementRecommendations[item.label] || 'Review This Pattern',
  };
}

function buildTrendBars(scores: number[]): TrendBar[] {
  const recentScores = scores.slice(-7);
  return Array.from({ length: 7 }).map((_, index) => ({
    key: `trend-${index}`,
    score: recentScores[index] ?? null,
  }));
}

export function rankFromCompletedMissions(completedMissions: number) {
  const bands = [
    { rank: 'Recruit', min: 0 },
    { rank: 'Operator', min: 3 },
    { rank: 'Specialist', min: 8 },
    { rank: 'Strategist', min: 15 },
    { rank: 'Commander', min: 25 },
    { rank: 'Elite Operator', min: 40 },
  ];
  const currentIndex = bands.reduce((bestIndex, band, index) => completedMissions >= band.min ? index : bestIndex, 0);
  const currentRank = bands[currentIndex].rank;
  const next = bands[currentIndex + 1] || null;
  const currentMin = bands[currentIndex].min;
  
  let progressPercentage = 100;
  if (next) {
    const diff = next.min - currentMin;
    const progressInBand = completedMissions - currentMin;
    progressPercentage = Math.max(0, Math.min(100, Math.round((progressInBand / diff) * 100)));
  }

  return {
    currentRank,
    nextRank: next?.rank || null,
    progressPercentage,
    remainingRequirement: next ? `${next.min - completedMissions} missions remaining to next rank` : 'Rank requirements complete',
  };
}

function selectedValues(...sources: Array<string | string[] | undefined>) {
  const values = sources.flatMap((source) => Array.isArray(source) ? source : source ? [source] : []);
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim()))];
}

function topCounts(counts: Map<string, number>, take: number): CountItem[] {
  return [...counts.entries()]
    .filter(([label]) => label && label !== 'Not Enough Data')
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([label, value]) => ({ label, value }));
}

function trendDirection(scores: number[]) {
  if (scores.length < 2) return 'Precision';
  const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
  const secondHalf = scores.slice(Math.ceil(scores.length / 2));
  const delta = average(secondHalf) - average(firstHalf);
  if (delta >= 3) return 'Improving';
  if (delta <= -3) return 'Needs Focus';
  return 'Stable';
}

function highestAverageLabel(groups: Map<string, number[]>) {
  let bestLabel = 'Not Enough Data';
  let bestAverage = -1;
  groups.forEach((scores, label) => {
    const scoreAverage = average(scores);
    if (scoreAverage > bestAverage) {
      bestAverage = scoreAverage;
      bestLabel = label;
    }
  });
  return bestLabel;
}

function pushScore(map: Map<string, number[]>, key: string, score: number) {
  if (!score) return;
  map.set(key, [...(map.get(key) || []), score]);
}

function pushByDate<T>(map: Map<string, T[]>, key: string, value: T) {
  if (!key) return;
  map.set(key, [...(map.get(key) || []), value]);
}

function increment(map: Map<string, number>, key: string, by = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + by);
}

function labelObjective(key?: string) {
  if (!key) return 'Not Enough Data';
  return objectiveLabels[key] || titleCase(key);
}

function labelFocus(key?: string) {
  if (!key) return 'Not Enough Data';
  return focusLabels[key] || normalizeInsightLabel(key);
}

function labelThreat(key?: string) {
  if (!key) return 'Unknown Threat';
  return threatLabels[key] || normalizeInsightLabel(key);
}

function normalizeInsightLabel(label: string) {
  const normalized = label
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\bStops\b/i, 'Stop Discipline')
    .replace(/\bRisk Mgmt\b/i, 'Risk Management');
  return titleCase(normalized);
}

function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function average(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function numberFrom(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function isNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function gradeFromScore(score: number) {
  if (score >= 95) return 'S';
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'Recovery Required';
}

function displayGrade(grade: string) {
  return grade === 'Recovery Required' ? 'F' : grade;
}

function dateKeyFromUnknown(value: unknown) {
  const maybeTimestamp = value as { toDate?: () => Date } | undefined;
  if (maybeTimestamp?.toDate) return formatDateKey(maybeTimestamp.toDate());
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return formatDateKey(date);
  }
  return '';
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#050707',
    flex: 1,
  },
  content: {
    paddingBottom: 42,
  },
  loadingState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  emptyTitle: {
    color: '#ffdda1',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 16,
  },
  emptyBody: {
    color: '#b6b0aa',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 28,
  },
  startButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    paddingVertical: 16,
  },
  startButtonText: {
    color: '#101415',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: '#111617',
    borderBottomColor: '#252a2b',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 88,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  menuIcon: {
    color: '#ffdda1',
    fontSize: 28,
    fontWeight: '900',
  },
  brand: {
    color: '#ffdda1',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 7,
  },
  avatar: {
    alignItems: 'center',
    borderColor: '#b28d43',
    borderRadius: 28,
    borderWidth: 2,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  avatarText: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '900',
  },
  rankCard: {
    backgroundColor: '#191d1e',
    borderLeftColor: '#e9c176',
    borderLeftWidth: 5,
    margin: 22,
    marginBottom: 16,
    padding: 28,
  },
  rankHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rankIdentity: {
    flex: 1,
    minWidth: 0,
  },
  rankKicker: {
    color: '#8f8981',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  rankTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
    maxWidth: 205,
  },
  rankBadge: {
    alignItems: 'center',
    backgroundColor: '#ffdda1',
    height: 28,
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  rankBadgeText: {
    color: '#121719',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  rankStatsRow: {
    borderTopColor: 'rgba(233, 193, 118, 0.22)',
    borderTopWidth: 1,
    columnGap: 14,
    flexDirection: 'row',
    marginTop: 24,
    paddingTop: 18,
  },
  rankStatBlock: {
    flex: 1,
    minWidth: 0,
  },
  rankStatLabel: {
    color: '#8f8981',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    lineHeight: 14,
  },
  rankStatValue: {
    color: '#ffdda1',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
    marginTop: 6,
  },
  rankMetricRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 28,
  },
  scorePanel: {
    alignItems: 'center',
    backgroundColor: '#141819',
    borderLeftColor: '#6d6048',
    borderLeftWidth: 3,
    flex: 1,
    flexDirection: 'column',
    gap: 12,
    minHeight: 96,
    padding: 14,
  },
  scoreRing: {
    alignItems: 'center',
    borderColor: '#ffdda1',
    borderRadius: 33,
    borderWidth: 4,
    height: 66,
    minWidth: 66,
    justifyContent: 'center',
    width: 66,
  },
  scoreRingText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  scoreCopy: {
    alignItems: 'center',
    width: '100%',
  },
  scoreLabel: {
    color: '#8f8981',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    lineHeight: 15,
    textAlign: 'center',
  },
  streakPanel: {
    alignItems: 'center',
    backgroundColor: '#141819',
    borderLeftColor: '#6d6048',
    borderLeftWidth: 3,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 96,
    padding: 14,
  },
  panelLabel: {
    color: '#8f8981',
    fontSize: 12,
    fontWeight: '800',
  },
  streakValue: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '900',
  },
  flameBox: {
    alignItems: 'center',
    backgroundColor: '#302b21',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  flame: {
    color: '#ffdda1',
    fontSize: 24,
  },
  growthLine: {
    color: '#8f8981',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 24,
  },
  goldText: {
    color: '#e9c176',
  },
  trendHeader: {
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 26,
  },
  trendLabel: {
    color: '#8f8981',
    fontSize: 14,
    fontWeight: '900',
  },
  nextRank: {
    color: '#e9c176',
    fontSize: 13,
    fontWeight: '900',
  },
  lowDataText: {
    color: '#6d6862',
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '700',
    marginTop: 8,
  },
  trendBars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    height: 48,
    marginTop: 12,
  },
  trendBarSlot: {
    alignItems: 'stretch',
    flex: 1,
    height: 48,
    justifyContent: 'flex-end',
  },
  trendBar: {
    backgroundColor: '#ffdda1',
    minHeight: 4,
    width: '100%',
  },
  trendBarEmpty: {
    backgroundColor: '#3b3f40',
    height: 10,
    opacity: 0.45,
  },
  remainingText: {
    color: '#6d6257',
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '800',
    marginTop: 10,
  },
  centerCard: {
    alignItems: 'center',
    backgroundColor: '#191d1e',
    borderLeftColor: '#e9c176',
    borderLeftWidth: 5,
    marginHorizontal: 22,
    marginBottom: 16,
    padding: 34,
  },
  centerCardTitle: {
    color: '#9f978d',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 34,
  },
  completionNumber: {
    color: '#ffdda1',
    fontSize: 82,
    fontWeight: '900',
    lineHeight: 88,
  },
  completionLabel: {
    color: '#8f8981',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 26,
  },
  successRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 280,
    width: '100%',
  },
  successRateLabel: {
    color: '#c7bfb5',
    fontSize: 13,
    fontWeight: '800',
  },
  successRateValue: {
    color: '#ffdda1',
    fontSize: 28,
    fontWeight: '900',
  },
  progressTrack: {
    backgroundColor: '#22292e',
    height: 3,
    marginTop: 8,
    width: '100%',
  },
  progressFill: {
    backgroundColor: '#e9c176',
    height: '100%',
  },
  card: {
    backgroundColor: '#191d1e',
    borderLeftColor: '#e9c176',
    borderLeftWidth: 5,
    marginHorizontal: 22,
    marginBottom: 16,
    padding: 28,
  },
  sectionTitle: {
    color: '#9f978d',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 24,
  },
  cardHint: {
    color: '#6d6862',
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '700',
    marginBottom: 18,
    marginTop: -12,
  },
  cardSubtext: {
    color: '#6d6862',
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 16,
    marginTop: -14,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 20,
  },
  insightColumn: {
    flex: 1,
  },
  insightHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 42,
  },
  insightIcon: {
    color: '#ffdda1',
    fontSize: 22,
  },
  pinkText: {
    color: '#f3a0a4',
  },
  insightTitle: {
    color: '#f1eee9',
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 18,
  },
  insightRule: {
    backgroundColor: '#51483f',
    height: 1,
    marginBottom: 14,
    marginTop: 10,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  insightName: {
    color: '#c7bfb5',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  insightCount: {
    color: '#e9c176',
    fontSize: 15,
    fontWeight: '900',
  },
  mutedText: {
    color: '#6d6862',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 12,
  },
  improvementCard: {
    alignItems: 'stretch',
    borderLeftColor: '#f3a0a4',
    flexDirection: 'row',
    gap: 18,
    justifyContent: 'space-between',
  },
  improvementTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  improvementEyebrow: {
    color: '#f3a0a4',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 16,
  },
  improvementTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
  },
  earlyPatternText: {
    color: '#f3a0a4',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  recommendation: {
    color: '#c7bfb5',
    fontSize: 16,
    fontStyle: 'italic',
    fontWeight: '600',
    lineHeight: 23,
  },
  improvementAction: {
    color: '#8f8981',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 14,
  },
  noPatternText: {
    color: '#c7bfb5',
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  occurrenceBox: {
    alignItems: 'flex-start',
    borderColor: '#694b4d',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 178,
    padding: 16,
    width: 138,
  },
  occurrenceKicker: {
    color: '#8f8981',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
    lineHeight: 12,
    marginBottom: 12,
  },
  occurrenceNumber: {
    color: '#f3a0a4',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 46,
    marginBottom: 4,
  },
  occurrenceLabel: {
    color: '#f3a0a4',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    lineHeight: 13,
  },
  pressureMeter: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 16,
    width: '100%',
  },
  pressureSegment: {
    backgroundColor: '#2c3031',
    flex: 1,
    height: 5,
  },
  pressureSegmentActive: {
    backgroundColor: '#f3a0a4',
  },
  pressureLabel: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 10,
  },
  performanceGrid: {
    columnGap: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
  },
  performanceRow: {
    flexDirection: 'row',
    columnGap: 20,
    marginBottom: 16,
  },
  performanceItem: {
    minHeight: 70,
    flex: 1,
  },
  performanceLabel: {
    color: '#8f8981',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 6,
  },
  performanceValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
  },
  scoreGrid: {
    columnGap: 20,
    flexDirection: 'row',
    marginTop: 20,
  },
  scoreLine: {
    flex: 1,
  },
  scoreLineHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreLineValue: {
    color: '#e9c176',
    fontSize: 18,
    fontWeight: '900',
  },
  mixVisualContainer: {
    backgroundColor: '#121617',
    borderRadius: 4,
    flexDirection: 'row',
    gap: 2,
    height: 8,
    marginBottom: 24,
    overflow: 'hidden',
  },
  mixVisualSegment: {
    height: '100%',
  },
  mixVisualEmpty: {
    backgroundColor: '#2b3031',
  },
  mixVisualTrade: {
    backgroundColor: '#e9c176',
  },
  mixVisualNoTrade: {
    backgroundColor: '#4a5052',
  },
  mixVisualMissed: {
    backgroundColor: '#f3a0a4',
  },
  mixLegendRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  mixLegendItem: {
    alignItems: 'center',
    backgroundColor: '#121617',
    borderColor: '#2b3031',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  mixLegendTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  mixLegendDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  mixLegendValue: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 22,
  },
  mixLegendLabel: {
    color: '#8f8981',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  lastDaysHeader: {
    flexDirection: 'column',
    gap: 8,
  },
  lastDaysTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tapHint: {
    color: '#5d554d',
    fontSize: 12,
    fontWeight: '800',
  },
  calendarButton: {
    borderColor: '#6d6048',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  calendarText: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
  },
  dayItem: {
    alignItems: 'center',
    gap: 12,
  },
  dayLabel: {
    color: '#8f8981',
    fontSize: 11,
    fontWeight: '900',
  },
  dayDot: {
    backgroundColor: '#3b3f40',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  dayDotComplete: {
    backgroundColor: '#e9c176',
  },
  dayDotRisk: {
    backgroundColor: '#f3a0a4',
  },
  footerMotto: {
    color: '#4a3e2b',
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 24,
    textAlign: 'center',
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
