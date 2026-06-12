import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { collection, doc, limit, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Signal, Crosshair } from 'lucide-react-native';

import { MissionStackNavigationProp, RootStackParamList } from '../../App';
import { useAuth } from '../contexts/AuthContext';
import { getRandomCoachMessage } from '../features/coaching/coachEngine';
import { gradeFromScore } from '../logic/disciplineScore';
import { firestore } from '../services/firebase';
import { getRankBadge } from '../utils/rankBadges';

type MissionResultsRouteProp = RouteProp<RootStackParamList, 'MissionResults'>;

type DisciplineResult = {
  score?: number;
  grade?: string;
  strongestBehavior?: string;
  improvementArea?: string;
  explanation?: string[];
  breakdown?: Record<string, number>;
};

type DebriefExecution = {
  tradeStatus?: 'traded' | 'no_trade';
  followedPlan?: string;
  respectedStopLoss?: string;
  avoidedFomo?: string;
  avoidedRevengeTrading?: string;
  stoppedWhenShouldHave?: string;
  avoidedForcingTrades?: string;
  remainedPatient?: string;
  protectedCapital?: string;
  followedMissionObjective?: string;
};

type DebriefResultData = {
  discipline?: DisciplineResult;
  execution?: DebriefExecution;
  lesson?: {
    text?: string;
  };
  missionId?: string;
};

type UserStatsData = {
  averageDisciplineScore?: number;
  currentStreak?: number;
};

type ParameterRow = {
  label: string;
  value?: string;
};

export function MissionResultsScreen() {
  const navigation = useNavigation<MissionStackNavigationProp>();
  const route = useRoute<MissionResultsRouteProp>();
  const { user, userProfile } = useAuth();
  const [debrief, setDebrief] = useState<DebriefResultData | null>(null);
  const [userStats, setUserStats] = useState<UserStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const routeDebriefId = route.params?.debriefId;
  const routeMissionId = route.params?.missionId;

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      doc(firestore, 'user_stats', user.uid),
      (snapshot) => {
        setUserStats(snapshot.exists() ? (snapshot.data() as UserStatsData) : null);
      },
      (error) => {
        console.error('Error loading user stats for mission results:', error);
        setUserStats(null);
      },
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    if (routeDebriefId) {
      const unsubscribe = onSnapshot(
        doc(firestore, 'mission_debriefs', routeDebriefId),
        (snapshot) => {
          setDebrief(snapshot.exists() ? (snapshot.data() as DebriefResultData) : null);
          setIsLoading(false);
        },
        (error) => {
          console.error('Error loading mission results:', error);
          setDebrief(null);
          setIsLoading(false);
        },
      );

      return () => unsubscribe();
    }

    const latestDebriefQuery = query(
      collection(firestore, 'mission_debriefs'),
      where('userId', '==', user.uid),
      limit(1),
    );

    const unsubscribe = onSnapshot(
      latestDebriefQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          setDebrief(snapshot.docs[0].data() as DebriefResultData);
        } else {
          setDebrief(null);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading latest mission results:', error);
        setDebrief(null);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [routeDebriefId, user]);

  const discipline = debrief?.discipline;
  const score = typeof discipline?.score === 'number' ? discipline.score : undefined;
  const grade = discipline?.grade || (score !== undefined ? gradeFromScore(score) : undefined);
  const displayGrade = grade || 'Pending';
  const strongestBehavior = discipline?.strongestBehavior || 'Discipline';
  const improvementArea = discipline?.improvementArea || 'Emotional Control';
  const operatorName = userProfile?.callsign?.trim() || 'Operator';
  const currentStreak = userStats?.currentStreak ?? 0;
  const averageScore = Math.round(userStats?.averageDisciplineScore ?? score ?? 0);
  const operatorRank = userProfile?.rank || 'Recruit';
  const parameters = buildParameterRows(debrief?.execution);

  const commandMessage = useMemo(() => {
    const coachingStyle = (userProfile as any)?.coachingStyle || 'tactical';
    const msg = getRandomCoachMessage({
      alertType: 'mission_results',
      coachingStyle: coachingStyle as any,
      missionStatus: 'completed',
    });
    return `"${msg.body}"`;
  }, [userProfile]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>GENERATING INTELLIGENCE REPORT...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!discipline) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <Text style={styles.emptyTitle}>REPORT UNAVAILABLE</Text>
          <Text style={styles.emptyText}>No discipline score was found for this debrief.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.replace('MissionActive')}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.secondaryButtonText}>BACK TO COMMAND</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.frame}>
          <View style={styles.cornerVertical} />
          <View style={styles.cornerHorizontal} />

          <Pressable
            accessibilityLabel="Back to command"
            accessibilityRole="button"
            onPress={() => navigation.replace('MissionActive')}
            style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.closeButtonText}>X</Text>
          </Pressable>

          <View style={styles.header}>
            <View style={styles.statusPlate}>
              <Text style={styles.statusPlateText}>MISSION COMPLETE</Text>
            </View>
            <Text style={styles.title}>INTELLIGENCE</Text>
            <Text style={styles.title}>REPORT</Text>
          </View>

          <View style={styles.heroGrid}>
            <View style={styles.bentoCard}>
              <View style={styles.goldRail} />
              <Text style={styles.panelLabel}>PERFORMANCE RANK</Text>
              <View style={styles.gradeRow}>
                <Text style={styles.gradeLetter}>{displayGrade}</Text>
                <View style={styles.gradeBadge}>
                  <Text style={styles.gradeBadgeText}>{gradeLabel(grade || '')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.bentoCard}>
              <View style={styles.goldRail} />
              <Text style={styles.panelLabel}>DISCIPLINE SCORE</Text>
              <View style={styles.scoreRing}>
                <Text style={styles.scoreValue}>{score !== undefined ? `${score}%` : '--'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <StatTile IconComponent={Signal} label="STREAK STATUS" value={`${currentStreak || 1} Day Maintained`} />
            <StatTile label="OPERATOR RANK" value={operatorRank} rankName={operatorRank} />
            <StatTile IconComponent={Crosshair} label="EXECUTION" value={`${averageScore}% Target Hit`} />
          </View>

          <View style={styles.behaviorGrid}>
            <BehaviorCard
              accent="STRONGEST BEHAVIOR"
              label={strongestBehavior}
              text="Operational parameters adhered with surgical precision."
            />

            <BehaviorCard
              accent="IMPROVEMENT AREA"
              label={improvementArea}
              text="Review the lesson, reset, and tighten execution before the next session."
            />
          </View>

          <View style={styles.parametersSection}>
            <Text style={styles.parametersTitle}>WHY THIS SCORE</Text>
            {parameters.map((parameter) => (
              <View key={parameter.label} style={styles.parameterRow}>
                <Text style={styles.parameterLabel}>{parameter.label}</Text>
                <Text style={[styles.parameterMark, isPositiveAnswer(parameter.value) ? styles.positiveMark : styles.negativeMark]}>
                  {isPositiveAnswer(parameter.value) ? '✓' : '×'}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.commandBox}>
            <View style={styles.commandAccent} />
            <View style={styles.handlerAvatar}>
              <Text style={styles.handlerAvatarText}>TE</Text>
            </View>
            <View style={styles.commandCopy}>
              <Text style={styles.commandLabel}>COMMAND MESSAGE</Text>
              <Text style={styles.commandText}>{commandMessage}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('Vault')}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.primaryButtonText}>VIEW VAULT</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.replace('MissionActive')}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.secondaryButtonText}>BACK TO COMMAND</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({
  accent,
  label,
  value,
  rankName,
  IconComponent,
}: {
  accent?: string;
  label: string;
  value: string;
  rankName?: string;
  IconComponent?: React.ElementType;
}) {
  return (
    <View style={styles.statTile}>
      <View style={styles.statIcon}>
        {rankName ? (
          <Image source={getRankBadge(rankName)} style={styles.statBadgeImage} resizeMode="contain" />
        ) : IconComponent ? (
          <IconComponent color="#e9c176" size={20} />
        ) : (
          <Text style={styles.statIconText}>{accent}</Text>
        )}
      </View>
      <View style={styles.statCopy}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

function BehaviorCard({
  accent,
  label,
  text,
}: {
  accent: string;
  label: string;
  text: string;
}) {
  return (
    <View style={styles.behaviorCard}>
      <Text style={styles.behaviorAccent}>{accent}</Text>
      <Text style={styles.behaviorLabel}>{label}</Text>
      <Text style={styles.behaviorText}>{text}</Text>
    </View>
  );
}

function buildParameterRows(execution?: DebriefExecution): ParameterRow[] {
  if (execution?.tradeStatus === 'no_trade') {
    return [
      { label: 'AVOIDED FORCING TRADES', value: execution.avoidedForcingTrades },
      { label: 'REMAINED PATIENT', value: execution.remainedPatient },
      { label: 'PROTECTED CAPITAL', value: execution.protectedCapital },
      { label: 'FOLLOWED MISSION OBJECTIVE', value: execution.followedMissionObjective },
    ];
  }

  return [
    { label: 'FOLLOWED PLAN', value: execution?.followedPlan },
    { label: 'RESPECTED STOPS', value: execution?.respectedStopLoss },
    { label: 'AVOIDED REVENGE TRADING', value: execution?.avoidedRevengeTrading },
    { label: 'AVOIDED FOMO', value: execution?.avoidedFomo },
    { label: 'STOPPED APPROPRIATELY', value: execution?.stoppedWhenShouldHave },
  ];
}

function isPositiveAnswer(value?: string): boolean {
  return value === 'Yes' || value === 'Mostly';
}

function gradeLabel(grade: string): string {
  if (['S', 'A+', 'A', 'A-'].includes(grade)) return 'EXC';
  if (['B+', 'B', 'B-'].includes(grade)) return 'STR';
  if (['C+', 'C'].includes(grade)) return 'AVG';
  if (['D+', 'D', 'D-', 'F'].includes(grade)) return 'REC';
  return 'PEND';
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#050707',
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  frame: {
    backgroundColor: '#0a1010',
    borderColor: '#202827',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 28,
    paddingTop: 70,
    position: 'relative',
  },
  cornerVertical: {
    backgroundColor: '#e9c176',
    height: 72,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 6,
  },
  cornerHorizontal: {
    backgroundColor: '#e9c176',
    height: 6,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 86,
  },
  closeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    top: 18,
    width: 44,
    zIndex: 2,
  },
  closeButtonText: {
    color: '#d1c5b4',
    fontSize: 28,
    fontWeight: '300',
  },
  header: {
    alignItems: 'center',
    marginBottom: 34,
  },
  statusPlate: {
    alignItems: 'center',
    backgroundColor: 'rgba(233, 193, 118, 0.08)',
    borderColor: '#4e4639',
    borderWidth: 1,
    marginBottom: 18,
    minWidth: 220,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  statusPlateText: {
    color: '#e9c176',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 4,
  },
  title: {
    color: '#f8fafc',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 1,
    lineHeight: 48,
    textAlign: 'center',
  },
  heroGrid: {
    gap: 28,
    marginBottom: 28,
  },
  bentoCard: {
    alignItems: 'center',
    backgroundColor: '#071a33',
    justifyContent: 'center',
    minHeight: 220,
    overflow: 'hidden',
    padding: 24,
    position: 'relative',
  },
  goldRail: {
    backgroundColor: '#e9c176',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 6,
  },
  panelLabel: {
    color: '#d1c5b4',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 16,
  },
  gradeRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  gradeLetter: {
    color: '#e9c176',
    fontSize: 84,
    fontWeight: '900',
    lineHeight: 96,
    textShadowColor: 'rgba(233, 193, 118, 0.25)',
    textShadowOffset: { height: 8, width: 0 },
    textShadowRadius: 18,
  },
  gradeBadge: {
    backgroundColor: '#e9c176',
    marginLeft: 10,
    marginTop: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  gradeBadgeText: {
    color: '#101415',
    fontSize: 14,
    fontWeight: '900',
  },
  scoreRing: {
    alignItems: 'center',
    borderColor: '#e9c176',
    borderRadius: 76,
    borderWidth: 8,
    height: 152,
    justifyContent: 'center',
    width: 152,
  },
  scoreValue: {
    color: '#e9c176',
    fontSize: 36,
    fontWeight: '900',
  },
  statsGrid: {
    gap: 14,
    marginBottom: 28,
  },
  statTile: {
    alignItems: 'center',
    backgroundColor: '#171c1c',
    borderColor: '#252d2d',
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 84,
    padding: 18,
  },
  statIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    minWidth: 38,
  },
  statBadgeImage: {
    height: 38,
    width: 38,
    flexShrink: 0,
    aspectRatio: 1,
  },
  statIconText: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '900',
  },
  statCopy: {
    flex: 1,
  },
  statLabel: {
    color: '#d1c5b4',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 5,
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
  },
  behaviorGrid: {
    gap: 18,
    marginBottom: 28,
  },
  behaviorCard: {
    backgroundColor: '#171c1c',
    borderColor: '#252d2d',
    borderWidth: 1,
    padding: 22,
  },
  behaviorAccent: {
    color: '#e9c176',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  behaviorLabel: {
    color: '#f8fafc',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 10,
  },
  behaviorText: {
    color: '#d1c5b4',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  parametersSection: {
    marginBottom: 28,
  },
  parametersTitle: {
    borderBottomColor: '#202827',
    borderBottomWidth: 1,
    color: '#e9c176',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 14,
    paddingBottom: 10,
  },
  parameterRow: {
    alignItems: 'center',
    borderBottomColor: '#151d1d',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 42,
  },
  parameterLabel: {
    color: '#d1c5b4',
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
  },
  parameterMark: {
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 16,
  },
  positiveMark: {
    color: '#e9c176',
  },
  negativeMark: {
    color: '#ffb4ab',
  },
  commandBox: {
    backgroundColor: '#050707',
    flexDirection: 'row',
    marginBottom: 28,
    minHeight: 112,
    padding: 22,
    position: 'relative',
  },
  commandAccent: {
    backgroundColor: '#e9c176',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 5,
  },
  handlerAvatar: {
    alignItems: 'center',
    backgroundColor: '#111818',
    height: 44,
    justifyContent: 'center',
    marginRight: 16,
    marginTop: 12,
    width: 44,
  },
  handlerAvatarText: {
    color: '#8a8f93',
    fontSize: 11,
    fontWeight: '900',
  },
  commandCopy: {
    flex: 1,
  },
  commandLabel: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 6,
  },
  commandText: {
    color: '#f8fafc',
    fontSize: 15,
    fontStyle: 'italic',
    fontWeight: '700',
    lineHeight: 21,
  },
  actions: {
    gap: 18,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    justifyContent: 'center',
    minHeight: 58,
  },
  primaryButtonText: {
    color: '#101415',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#e9c176',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 58,
  },
  secondaryButtonText: {
    color: '#e9c176',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  buttonPressed: {
    opacity: 0.72,
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
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
  },
  emptyText: {
    color: '#8a8f93',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
});
