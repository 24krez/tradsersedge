import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { firestore } from '../services/firebase';
import { calculateRankProgression } from '../logic/rankProgression';
import { gradeFromScore } from '../logic/disciplineScore';
import type { MissionSummary } from '../services/missionSummary';

type ProgressScreenProps = {
  onOpenVault?: () => void;
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
  missionSummary?: MissionSummary;
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

export function ProgressScreen({ onOpenVault, onStartMission }: ProgressScreenProps) {
  const { user, userProfile, isPro } = useAuth();
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

  if (!isPro) {
    return <LockedProgressPreview />;
  }

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
          <Text style={styles.emptyTitle}>NO PROGRESS DATA YET</Text>
          <Text style={styles.emptyBody}>
            Complete your first mission to start building your discipline profile.
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
        {/* Page Header */}
        <View style={styles.header}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>OPERATOR ONLINE</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {userProfile?.subscriptionTier === 'founder' 
                  ? 'FOUNDER' 
                  : userProfile?.subscriptionTier?.toUpperCase() || 'FREE'}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>PROGRESS CENTER</Text>
          <Text style={styles.subtitle}>PERFORMANCE REVIEW | DISCIPLINE INTEL</Text>
        </View>

        <RankCard model={model} callsign={userProfile?.activeCallsign || userProfile?.callsign || ''} />
        <MissionCompletionCard completed={model.completedMissions} completionRate={model.completionRate} />
        <MissionInsightsCard hasLowData={model.hasLowData} signalContext={model.threatSignalContext} strongestTraits={model.strongestTraits} threats={model.commonThreats} />
        <DisciplinePatternInsightsCard insights={model.disciplineInsights} />
        <ImprovementCard improvement={model.primaryImprovement} />
        <PerformanceInsightsCard model={model} />
        <TradeMixCard model={model} />
        <LastSevenDaysCard days={model.lastSevenDays} onOpenVault={onOpenVault} />

        <Text style={styles.footerMotto}>PRECISION IS THE ONLY MEASURE OF SUCCESS</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function LockedProgressPreview() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.lockedPreview}>
        <View style={styles.lockedShell}>
          <View style={styles.lockedHeaderRow}>
            <View style={styles.lockedTitleBlock}>
              <Text style={styles.lockedKicker}>PROGRESS CENTER</Text>
              <Text style={styles.lockedTitle}>Unlock Progress Insights</Text>
            </View>
            <View style={styles.lockedBadge}>
              <Text style={styles.lockedBadgeText}>PRO</Text>
            </View>
          </View>

          <Text style={styles.lockedBody}>
            Track your discipline score, mission streaks, repeated threats, and improvement patterns over time.
          </Text>
          <View style={styles.lockedCta}>
            <Text style={styles.lockedCtaText}>UPGRADE TO PRO</Text>
          </View>

          <View style={styles.previewRankCard}>
            <View style={styles.previewRankTop}>
              <View>
                <Text style={styles.previewLabel}>CURRENT RANK</Text>
                <Text style={styles.previewRank}>OPERATOR</Text>
              </View>
              <Text style={styles.previewLock}>LOCKED</Text>
            </View>
            <View style={styles.previewMetrics}>
              <PreviewMetric label="DISCIPLINE" value="--" />
              <PreviewMetric label="STREAK" value="--" />
              <PreviewMetric label="MISSIONS" value="--" />
            </View>
            <View style={styles.previewTrack}>
              <View style={styles.previewFill} />
            </View>
          </View>

          <View style={styles.previewInsightGrid}>
            <View style={styles.previewInsight}>
              <Text style={styles.previewLabel}>THREAT SIGNALS</Text>
              <Text style={styles.previewInsightLine}>Pattern detection</Text>
            </View>
            <View style={styles.previewInsight}>
              <Text style={styles.previewLabel}>STRENGTH SIGNALS</Text>
              <Text style={styles.previewInsightLine}>Behavior tracking</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.previewMetric}>
      <Text style={styles.previewMetricValue}>{value}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.previewMetricLabel}>{label}</Text>
    </View>
  );
}

function RankCard({ model, callsign }: { model: ProgressModel; callsign: string }) {
  return (
    <View style={styles.rankCard}>
      <View style={styles.rankHeader}>
        <View style={styles.rankIdentity}>
          <Text style={styles.rankKicker}>CURRENT RANK</Text>
          <Text style={styles.rankTitle}>{model.currentRank.toUpperCase()}</Text>
          <Text style={styles.nextRank}>NEXT RANK: {model.nextRank || 'MAX RANK'}</Text>
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
        <Text style={styles.trendLabel}>DISCIPLINE GRADE TREND</Text>
      </View>
      {model.hasLowData ? (
        <Text style={styles.lowDataText}>More missions needed to build a reliable trend.</Text>
      ) : null}
      <View style={styles.trendBars}>
        {model.trendBars.map((bar) => (
          <View key={bar.key} style={styles.trendBarSlot}>
            <View style={styles.trendBarColumn}>
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
            <Text style={styles.trendBarValue}>{bar.score === null ? '—' : bar.score}</Text>
          </View>
        ))}
      </View>
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
      <Text style={styles.cardSubtext}>{hasLowData ? 'Building your pattern profile.' : signalContext}</Text>
      {hasLowData ? <Text style={styles.cardHint}>Complete more missions to unlock stronger insights.</Text> : null}
      <View style={styles.twoColumn}>
        <InsightList accent="pink" emptyText="No selected threat signals yet." icon="△" items={threats} subtitle="Discipline challenges" title="THREAT SIGNALS" />
        <InsightList accent="gold" emptyText="More completed debriefs needed." icon="◎" items={strongestTraits} subtitle="Behaviors executed well" title="STRENGTH SIGNALS" />
      </View>
    </View>
  );
}

function DisciplinePatternInsightsCard({ insights }: { insights: DisciplineInsight[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>DISCIPLINE INSIGHTS</Text>
      <View style={styles.disciplineInsightList}>
        {insights.map((insight) => (
          <View key={`${insight.type}-${insight.message}`} style={styles.disciplineInsightRow}>
            <View style={styles.disciplineInsightMeta}>
              <Text style={styles.disciplineInsightType}>{insight.type}</Text>
              <Text style={styles.disciplineInsightMessage}>{insight.message}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function InsightList({ accent, emptyText, icon, items, subtitle, title }: { accent: 'gold' | 'pink'; emptyText: string; icon: string; items: CountItem[]; subtitle?: string; title: string }) {
  return (
    <View style={styles.insightColumn}>
      <View style={styles.insightHeader}>
        <Text style={[styles.insightIcon, accent === 'pink' && styles.pinkText]}>{icon}</Text>
        <Text style={styles.insightTitle}>{title}</Text>
      </View>
      {subtitle ? <Text style={styles.insightSubtext}>{subtitle}</Text> : null}
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

  const signalPressure = improvement.count >= 10 ? 'HIGH PRIORITY' : improvement.count >= 4 ? 'BUILDING' : 'EARLY';
  const filledSegments = improvement.count >= 10 ? 4 : improvement.count >= 7 ? 3 : improvement.count >= 3 ? 2 : 1;

  return (
    <View style={[styles.card, styles.improvementCard]}>
      <View style={styles.improvementTextBlock}>
        <Text style={styles.improvementEyebrow}>PRIMARY GROWTH AREA</Text>
        <Text style={styles.improvementTitle}>{improvement.label}</Text>
        {improvement.isEarly ? <Text style={styles.earlyPatternText}>Early Pattern</Text> : null}
        <Text style={styles.recommendation}>Recommended Focus: {improvement.recommendation}</Text>
        <Text style={styles.improvementAction}>Most repeated pattern. Make this your first checkpoint.</Text>
      </View>
      <View style={styles.occurrenceBox}>
        <Text style={styles.occurrenceKicker}>PATTERN PRESSURE</Text>
        <Text style={styles.occurrenceNumber}>{improvement.count}</Text>
        <Text style={styles.occurrenceLabel}>{improvement.count === 1 ? 'MISSION SIGNAL' : 'MISSION SIGNALS'}</Text>
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

function LastSevenDaysCard({ days, onOpenVault }: { days: DayDot[]; onOpenVault?: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.lastDaysHeader}>
        <View style={styles.lastDaysTitleRow}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>LAST 7 DAYS</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onOpenVault}
            style={({ pressed }) => [styles.calendarButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.calendarText}>VIEW VAULT</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.dayRow}>
        {days.map((day) => (
          <View key={day.key} style={[styles.dayItem, day.isToday && styles.dayItemToday]}>
            <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>{day.label}</Text>
            <View
              style={[
                styles.dayDot,
                day.status === 'trade' && styles.dayDotTrade,
                day.status === 'no_trade' && styles.dayDotNoTrade,
                day.status === 'missed' && styles.dayDotRisk,
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
  isToday: boolean;
  status: 'missed' | 'no_trade' | 'none' | 'trade';
};

type ImprovementModel = {
  count: number;
  isEarly: boolean;
  label: string;
  recommendation: string;
};

type DisciplineInsight = {
  message: string;
  type: 'Improvement Insight' | 'Pattern Insight' | 'Strength Insight' | 'Trend Insight';
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
  disciplineInsights: DisciplineInsight[];
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
  const totalMissionsStarted = Math.max(numberFrom(userStats?.totalMissions), missions.length, completedMissionsCount);
  const storedAverageScore = numberFrom(userStats?.averageDisciplineScore);
  const averageScore = Math.round(storedAverageScore || average(scores));
  const storedCompletionRate = numberFrom(userStats?.missionSuccessRate);
  const completionRate = clampPercent(storedCompletionRate || (totalMissionsStarted ? (completedMissionsCount / totalMissionsStarted) * 100 : 0));
  const currentStreak = numberFrom(userStats?.currentStreak);
  const rank = calculateRankProgression({
    averageDisciplineScore: averageScore,
    completedMissions: completedMissionsCount,
    currentStreak,
  });
  const currentRank = rank.currentRank;
  const nextRank = rank.nextRank;
  const trendScores = scores.slice(0, 30).reverse();
  const trendBars = buildTrendBars(trendScores);
  const threatSignals = calculateThreatSignals(completedMissionRecords, debriefs);
  const commonThreats = topCounts(threatSignals.counts, 3);
  const totalThreatSignals = [...threatSignals.counts.values()].reduce((sum, count) => sum + count, 0);
  const hasLowData = completedMissionsCount < 3;
  const strongestTraits = topCounts(countTraits(scoreDebriefs, completedMissionRecords), 3);
  const improvementCounts = countImprovementAreas(scoreDebriefs);
  const primaryImprovement = buildPrimaryImprovement(commonThreats[0] || topCounts(improvementCounts, 1)[0], completedMissionsCount);
  const disciplineInsights = buildDisciplineInsights({
    commonThreats,
    completedMissions: completedMissionsCount,
    primaryImprovement,
    strongestTraits,
    trendScores,
  });
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
    remainingRequirement: rank.requirementsRemaining.length > 0
      ? rank.requirementsRemaining[0]
      : 'Rank requirements complete',
    disciplineInsights,
    strongestTraits,
    tradeDays,
    threatSignalContext: totalThreatSignals > 0
      ? `${totalThreatSignals} signals tracked across ${threatSignals.sessions} missions.`
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
    increment(objectiveCounts, labelObjective(mission.missionSummary?.objective || mission.objective));
    increment(focusCounts, labelFocus(mission.missionSummary?.coreFocus || mission.coreFocus));
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
    const hasTrade = dayDebriefs.some((debrief) => debrief.execution?.tradeStatus === 'traded');
    const hasNoTrade = dayDebriefs.some((debrief) => debrief.execution?.tradeStatus === 'no_trade');
    const hasMissed = dayMissions.some((mission) => mission.status && mission.status !== 'completed');

    return {
      key,
      isToday: index === 6,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1).toUpperCase(),
      status: hasTrade ? 'trade' : hasNoTrade ? 'no_trade' : hasMissed ? 'missed' : 'none',
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
      selectedValues(mission.missionSummary?.threats, mission.selectedThreats, mission.threats, mission.primaryThreat, mission.threat),
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
    const focus = mission.missionSummary?.coreFocus || mission.coreFocus;
    if (focus) increment(counts, labelFocus(focus));
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

function buildDisciplineInsights({
  commonThreats,
  completedMissions,
  primaryImprovement,
  strongestTraits,
  trendScores,
}: {
  commonThreats: CountItem[];
  completedMissions: number;
  primaryImprovement: ImprovementModel | null;
  strongestTraits: CountItem[];
  trendScores: number[];
}): DisciplineInsight[] {
  if (completedMissions < 3) {
    return [
      {
        type: 'Pattern Insight',
        message: 'Building your pattern profile. Complete more missions to unlock stronger discipline insights.',
      },
    ];
  }

  const insights: DisciplineInsight[] = [];
  const topThreat = commonThreats[0];
  const topStrength = strongestTraits[0];

  if (topThreat) {
    insights.push({
      type: 'Pattern Insight',
      message: `${topThreat.label} has appeared most often in your completed missions. Stay patient and wait for confirmation.`,
    });
  }

  if (topStrength) {
    insights.push({
      type: 'Strength Insight',
      message: `Your strongest focus area is ${topStrength.label}. Keep protecting capital first.`,
    });
  }

  const lastThreeScores = trendScores.slice(-3);
  if (lastThreeScores.length === 3) {
    const delta = lastThreeScores[2] - lastThreeScores[0];
    if (delta >= 3) {
      insights.push({
        type: 'Trend Insight',
        message: 'Your discipline score is improving over your last 3 missions.',
      });
    } else if (delta <= -3) {
      insights.push({
        type: 'Trend Insight',
        message: 'Your discipline score has softened over your last 3 missions. Reset your process before the next session.',
      });
    }
  }

  if (primaryImprovement && insights.length < 3) {
    insights.push({
      type: 'Improvement Insight',
      message: `${primaryImprovement.label} is the next checkpoint. Keep this visible before entering a trade.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'Pattern Insight',
      message: 'Your discipline profile is forming. Keep completing missions to sharpen the signal.',
    });
  }

  return insights.slice(0, 3);
}

function buildTrendBars(scores: number[]): TrendBar[] {
  const recentScores = scores.slice(-7);
  return Array.from({ length: 7 }).map((_, index) => ({
    key: `trend-${index}`,
    score: recentScores[index] ?? null,
  }));
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

function displayGrade(grade: string) {
  return grade;
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
    backgroundColor: '#101415',
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
  lockedPreview: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  lockedShell: {
    backgroundColor: '#191d1e',
    borderColor: '#2a3135',
    borderLeftColor: '#e9c176',
    borderLeftWidth: 3,
    borderWidth: 1,
    padding: 22,
  },
  lockedHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  lockedTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  lockedKicker: {
    color: '#8f8981',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  lockedTitle: {
    color: '#ffdda1',
    flexShrink: 1,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  lockedBadge: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    height: 30,
    justifyContent: 'center',
    minWidth: 48,
    paddingHorizontal: 10,
  },
  lockedBadgeText: {
    color: '#101415',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  lockedBody: {
    color: '#c7bfb5',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
    marginTop: 18,
  },
  lockedCta: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#e9c176',
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  lockedCtaText: {
    color: '#101415',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  previewRankCard: {
    backgroundColor: '#141819',
    borderColor: '#2a3135',
    borderWidth: 1,
    marginTop: 24,
    padding: 18,
  },
  previewRankTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  previewLabel: {
    color: '#8f8981',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  previewRank: {
    color: '#e9c176',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 6,
  },
  previewLock: {
    color: '#f3a0a4',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  previewMetrics: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  previewMetric: {
    backgroundColor: '#101415',
    borderColor: '#283034',
    borderWidth: 1,
    flex: 1,
    minHeight: 68,
    padding: 10,
  },
  previewMetricValue: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  previewMetricLabel: {
    color: '#8f8981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 6,
  },
  previewTrack: {
    backgroundColor: '#22292e',
    height: 3,
    marginTop: 16,
  },
  previewFill: {
    backgroundColor: '#e9c176',
    height: '100%',
    width: '38%',
  },
  previewInsightGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  previewInsight: {
    backgroundColor: '#141819',
    borderColor: '#2a3135',
    borderWidth: 1,
    flex: 1,
    minHeight: 76,
    padding: 14,
  },
  previewInsightLine: {
    color: '#c7bfb5',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 10,
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
  header: {
    marginBottom: 16,
    marginTop: 24,
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
    backgroundColor: '#72c875',
    height: 8,
    marginRight: 8,
    width: 8,
  },
  statusText: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
  },
  badge: {
    backgroundColor: 'rgba(233, 193, 118, 0.1)',
    borderColor: 'rgba(233, 193, 118, 0.3)',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#8a8f93',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 8,
  },
  rankCard: {
    backgroundColor: '#191d1e',
    borderColor: '#2a3135',
    borderLeftColor: '#e9c176',
    borderLeftWidth: 3,
    borderWidth: 1,
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
    color: '#e9c176',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
    maxWidth: 205,
  },
  rankBadge: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
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
    color: '#e9c176',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
  },
  rankMetricRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 28,
  },
  scorePanel: {
    alignItems: 'center',
    backgroundColor: '#141819',
    borderColor: '#2a3135',
    borderLeftColor: '#6d6048',
    borderLeftWidth: 3,
    borderWidth: 1,
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
    borderColor: '#2a3135',
    borderLeftColor: '#6d6048',
    borderLeftWidth: 3,
    borderWidth: 1,
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
    marginTop: 8,
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
    height: 66,
    marginTop: 12,
  },
  trendBarSlot: {
    alignItems: 'center',
    flex: 1,
    height: 66,
    justifyContent: 'flex-end',
  },
  trendBarColumn: {
    alignItems: 'stretch',
    height: 48,
    justifyContent: 'flex-end',
    width: '100%',
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
  trendBarValue: {
    color: '#8f8981',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 12,
    marginTop: 6,
    textAlign: 'center',
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
    borderColor: '#2a3135',
    borderWidth: 1,
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
    borderColor: '#2a3135',
    borderWidth: 1,
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
    gap: 18,
  },
  disciplineInsightList: {
    gap: 12,
  },
  disciplineInsightRow: {
    backgroundColor: '#141819',
    borderColor: '#2a3135',
    borderLeftColor: '#e9c176',
    borderLeftWidth: 3,
    borderWidth: 1,
    padding: 14,
  },
  disciplineInsightMeta: {
    gap: 6,
  },
  disciplineInsightType: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  disciplineInsightMessage: {
    color: '#c7bfb5',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
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
  insightSubtext: {
    color: '#8f8981',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    marginLeft: 32,
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
    borderColor: 'transparent',
    borderWidth: 1,
    gap: 12,
    minWidth: 30,
    paddingHorizontal: 5,
    paddingVertical: 6,
  },
  dayItemToday: {
    borderColor: 'rgba(233, 193, 118, 0.55)',
  },
  dayLabel: {
    color: '#8f8981',
    fontSize: 11,
    fontWeight: '900',
  },
  dayLabelToday: {
    color: '#e9c176',
  },
  dayDot: {
    backgroundColor: '#3b3f40',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  dayDotTrade: {
    backgroundColor: '#e9c176',
  },
  dayDotNoTrade: {
    backgroundColor: '#79d284',
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
