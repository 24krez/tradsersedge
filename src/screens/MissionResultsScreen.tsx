import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { collection, doc, limit, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MissionStackNavigationProp, RootStackParamList } from '../../App';
import { useAuth } from '../contexts/AuthContext';
import { firestore } from '../services/firebase';

type MissionResultsRouteProp = RouteProp<RootStackParamList, 'MissionResults'>;

type DisciplineResult = {
  score?: number;
  grade?: string;
  strongestBehavior?: string;
  improvementArea?: string;
  explanation?: string[];
  breakdown?: Record<string, number>;
};

type DebriefResultData = {
  discipline?: DisciplineResult;
  missionId?: string;
};

export function MissionResultsScreen() {
  const navigation = useNavigation<MissionStackNavigationProp>();
  const route = useRoute<MissionResultsRouteProp>();
  const { user, userProfile } = useAuth();
  const [debrief, setDebrief] = useState<DebriefResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const routeDebriefId = route.params?.debriefId;
  const routeMissionId = route.params?.missionId;

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
  const score = typeof discipline?.score === 'number' ? discipline.score : 0;
  const grade = discipline?.grade || '--';
  const strongestBehavior = discipline?.strongestBehavior || 'Discipline';
  const improvementArea = discipline?.improvementArea || 'Emotional Control';
  const operatorName = userProfile?.callsign?.trim() || 'Operator';

  const commandMessage = useMemo(() => {
    return `Mission Debrief Complete. Discipline Score: ${score} - Grade ${grade}. Strongest behavior: ${strongestBehavior}. Improvement area: ${improvementArea}. Good work, ${operatorName}. Log the lesson and prepare for the next session.`;
  }, [grade, improvementArea, operatorName, score, strongestBehavior]);

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
          <View style={styles.topRow}>
            <View style={styles.statusPlate}>
              <Text style={styles.statusPlateText}>MISSION COMPLETE</Text>
            </View>
            <Pressable
              accessibilityLabel="Back to command"
              accessibilityRole="button"
              onPress={() => navigation.replace('MissionActive')}
              style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.closeButtonText}>X</Text>
            </Pressable>
          </View>

          <Text style={styles.title}>INTELLIGENCE REPORT</Text>

          <View style={styles.rankPanel}>
            <View style={styles.goldRail} />
            <Text style={styles.panelLabel}>PERFORMANCE RANK</Text>
            <View style={styles.gradeRow}>
              <Text style={styles.gradeLetter}>{grade === 'Recovery Required' ? 'F' : grade}</Text>
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeBadgeText}>{gradeLabel(grade)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.scorePanel}>
            <View style={styles.goldRail} />
            <Text style={styles.panelLabel}>DISCIPLINE SCORE</Text>
            <View style={styles.scoreRing}>
              <Text style={styles.scoreValue}>{score}</Text>
              <Text style={styles.scoreSuffix}>/100</Text>
            </View>
          </View>

          <BehaviorCard
            accent="STRENGTH"
            label={strongestBehavior}
            text={`${strongestBehavior} led the session. Operational discipline held where it mattered most.`}
          />

          <BehaviorCard
            accent="FOCUS"
            label={improvementArea}
            text={`${improvementArea} is the next refinement target. Review the lesson, reset, and tighten execution.`}
          />

          <View style={styles.commandBox}>
            <Text style={styles.commandLabel}>COMMAND MESSAGE</Text>
            <Text style={styles.commandText}>{commandMessage}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.replace('MissionActive')}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.secondaryButtonText}>BACK TO COMMAND</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate('MissionDebrief', {
                  missionId: routeMissionId || debrief.missionId,
                  readOnly: true,
                })
              }
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.primaryButtonText}>VIEW MISSION REPORT</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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

function gradeLabel(grade: string): string {
  if (['S', 'A+', 'A', 'A-'].includes(grade)) return 'EXC';
  if (['B+', 'B'].includes(grade)) return 'STR';
  if (grade === 'C') return 'AVG';
  return 'REC';
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#060909',
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  frame: {
    backgroundColor: '#0b1111',
    borderColor: '#202827',
    borderWidth: 1,
    padding: 24,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusPlate: {
    alignItems: 'center',
    borderColor: '#4e4639',
    borderWidth: 1,
    minWidth: 210,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statusPlateText: {
    color: '#e9c176',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 4,
  },
  closeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  closeButtonText: {
    color: '#d1c5b4',
    fontSize: 28,
    fontWeight: '300',
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '300',
    marginBottom: 28,
  },
  rankPanel: {
    alignItems: 'center',
    backgroundColor: '#071a33',
    justifyContent: 'center',
    marginBottom: 28,
    minHeight: 210,
    overflow: 'hidden',
    padding: 24,
    position: 'relative',
  },
  scorePanel: {
    alignItems: 'center',
    backgroundColor: '#071a33',
    justifyContent: 'center',
    marginBottom: 28,
    minHeight: 250,
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
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  gradeRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  gradeLetter: {
    color: '#e9c176',
    fontSize: 92,
    fontWeight: '900',
    lineHeight: 104,
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
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 46,
  },
  scoreSuffix: {
    color: '#d1c5b4',
    fontSize: 13,
    fontWeight: '800',
  },
  behaviorCard: {
    backgroundColor: '#171c1c',
    borderColor: '#252d2d',
    borderWidth: 1,
    marginBottom: 22,
    padding: 22,
  },
  behaviorAccent: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  behaviorLabel: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  behaviorText: {
    color: '#d1c5b4',
    fontSize: 16,
    lineHeight: 23,
  },
  commandBox: {
    backgroundColor: '#060909',
    borderColor: '#151d1d',
    borderWidth: 1,
    marginBottom: 24,
    marginTop: 8,
    padding: 22,
  },
  commandLabel: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 14,
    textAlign: 'center',
  },
  commandText: {
    color: '#f8fafc',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  actions: {
    gap: 18,
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
