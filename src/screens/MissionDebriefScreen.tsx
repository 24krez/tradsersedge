import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { MissionStackNavigationProp, RootStackParamList } from '../../App';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDocs, getDoc } from 'firebase/firestore';
import { firestore } from '../services/firebase';
import { buildMissionSummary } from '../services/missionSummary';
import { updateUserStatsAfterDebrief } from '../services/userStats';
import { getRandomCoachMessage } from '../features/coaching/coachEngine';
import { calculateDisciplineScore, DisciplineScoreResult, YesMostlyNo } from '../logic/disciplineScore';

type MissionData = {
  id: string;
  objective: string;
  threats: string[];
  coreFocus: string;
  session?: string;
  status: string;
  createdAt: any;
  missionStatus?: string;
  readinessScore?: number;
  lastMindsetScore?: number;
};

type ArchivedDisciplineOutput = ReturnType<typeof buildDisciplineOutput>;

const EMOTIONS = [
  { id: 'calm', icon: '😌', label: 'Calm' },
  { id: 'confident', icon: '🙂', label: 'Confident' },
  { id: 'neutral', icon: '😐', label: 'Neutral' },
  { id: 'frustrated', icon: '🤬', label: 'Frust.' },
  { id: 'impulsive', icon: '😤', label: 'Impuls.' },
  { id: 'stress', icon: '😰', label: 'Stress' },
] as const;

const NO_TRADE_REASONS = [
  'NO VALID SETUPS',
  'OBSERVATION DAY',
  'MARKET CONDITIONS POOR',
  'PERSONAL DISCIPLINE CHOICE',
  'TIME CONSTRAINTS',
  'OTHER'
];

const DISCIPLINE_SCORING_VERSION = 'v1-client';

function buildDisciplineOutput(scoreResult: DisciplineScoreResult) {
  return {
    score: scoreResult.score,
    grade: scoreResult.grade,
    strongestBehavior: scoreResult.strongestBehavior,
    improvementArea: scoreResult.improvementArea,
    explanation: scoreResult.explanation,
    breakdown: scoreResult.breakdown,
    rawTotalScore: scoreResult.rawTotalScore,
    gradeBeforeCaps: scoreResult.gradeBeforeCaps,
    numericCapsApplied: scoreResult.numericCapsApplied,
    gradeCapsApplied: scoreResult.gradeCapsApplied,
  };
}

function buildArchivedDisciplineResult(discipline: ArchivedDisciplineOutput): DisciplineScoreResult {
  const breakdown = discipline.breakdown || {
    executionIntegrity: 0,
    riskDiscipline: 0,
    emotionalControl: 0,
    missionAdherence: 0,
    selfAwareness: 0,
  };
  const score = Number.isFinite(discipline.score) ? discipline.score : 0;
  const grade = discipline.grade || 'Recovery Required';

  return {
    score,
    grade,
    breakdown,
    executionIntegrity: breakdown.executionIntegrity || 0,
    riskDiscipline: breakdown.riskDiscipline || 0,
    emotionalControl: breakdown.emotionalControl || 0,
    missionAdherence: breakdown.missionAdherence || 0,
    selfAwareness: breakdown.selfAwareness || 0,
    rawTotalScore: discipline.rawTotalScore || score,
    finalScore: score,
    gradeBeforeCaps: discipline.gradeBeforeCaps || grade,
    finalGrade: grade,
    numericCapsApplied: discipline.numericCapsApplied || [],
    gradeCapsApplied: discipline.gradeCapsApplied || [],
    strongestBehavior: discipline.strongestBehavior || 'Mission Adherence',
    improvementArea: discipline.improvementArea || 'Execution Integrity',
    explanation: discipline.explanation || [],
  };
}

function buildDisciplineScoreDocument({
  debriefId,
  disciplineOutput,
  missionData,
  traded,
  userId,
}: {
  debriefId: string;
  disciplineOutput: ReturnType<typeof buildDisciplineOutput>;
  missionData: MissionData;
  traded: boolean | null;
  userId: string;
}) {
  return {
    userId,
    missionId: missionData.id,
    debriefId,
    score: disciplineOutput.score,
    grade: disciplineOutput.grade,
    strongestBehavior: disciplineOutput.strongestBehavior,
    improvementArea: disciplineOutput.improvementArea,
    explanation: disciplineOutput.explanation,
    breakdown: disciplineOutput.breakdown,
    result: disciplineOutput,
    scoring: {
      version: DISCIPLINE_SCORING_VERSION,
      source: 'client',
      status: 'client_calculated',
      serverVerified: false,
    },
    missionSnapshot: {
      objective: missionData.objective,
      threatsIdentified: missionData.threats || [],
      coreFocus: missionData.coreFocus,
      session: missionData.session || 'custom',
      tradeStatus: traded ? 'traded' : 'no_trade',
    },
    createdAt: serverTimestamp(),
  };
}

function dateFromFirestoreValue(value: any): Date | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function formatDebriefDate(date: Date | null): string {
  if (!date) return '';

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date).toUpperCase();
}

function formatSessionLength(mission: MissionData | null, fallbackMinutes?: number): string {
  const startedAt = dateFromFirestoreValue((mission as any)?.sessionStartedAt || (mission as any)?.startedAt);
  const endedAt = dateFromFirestoreValue((mission as any)?.sessionEndedAt || (mission as any)?.endedAt || (mission as any)?.completedAt);
  const minutes = startedAt && endedAt
    ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000))
    : fallbackMinutes;

  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return '—';

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours <= 0) return `${remainingMinutes}M`;
  if (remainingMinutes === 0) return `${hours}H`;
  return `${hours}H ${remainingMinutes}M`;
}

export function MissionDebriefScreen() {
  const navigation = useNavigation<MissionStackNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'MissionDebrief'>>();
  const { t } = useTranslation('mission');
  const { user, isPro } = useAuth(); 

  const isReadOnly = route.params?.readOnly || false;
  const routeMissionId = route.params?.missionId;

  const [missionData, setMissionData] = useState<MissionData | null>(null);
  const [debriefDate, setDebriefDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Gateway
  const [traded, setTraded] = useState<boolean | null>(null); 
  
  // Traded State
  const [followedPlan, setFollowedPlan] = useState<YesMostlyNo | null>(null);
  const [respectedStop, setRespectedStop] = useState<YesMostlyNo | null>(null);
  const [stoppedAppropriately, setStoppedAppropriately] = useState<YesMostlyNo | null>(null);
  const [avoidedFomo, setAvoidedFomo] = useState<YesMostlyNo | null>(null);
  const [avoidedRevenge, setAvoidedRevenge] = useState<YesMostlyNo | null>(null);
  
  // No Trade State
  const [avoidedForcingTrades, setAvoidedForcingTrades] = useState<YesMostlyNo | null>(null);
  const [remainedPatient, setRemainedPatient] = useState<YesMostlyNo | null>(null);
  const [protectedCapital, setProtectedCapital] = useState<YesMostlyNo | null>(null);
  const [followedMissionObjective, setFollowedMissionObjective] = useState<YesMostlyNo | null>(null);
  
  const [whyNotTradeReason, setWhyNotTradeReason] = useState<string | null>(null);
  
  // Elite / General State
  const [pulseScore, setPulseScore] = useState<number>(50); 
  const [emotion, setEmotion] = useState<typeof EMOTIONS[number]['id'] | null>(null);
  
  const getPulseLabel = (score: number) => {
    if (score >= 80) return 'ELITE';
    if (score >= 60) return 'FOCUSED';
    if (score >= 40) return 'NEUTRAL';
    if (score >= 20) return 'TILTED';
    return 'FRANTIC';
  };

  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingDebriefId, setExistingDebriefId] = useState<string | null>(null);
  const [existingDiscipline, setExistingDiscipline] = useState<ArchivedDisciplineOutput | null>(null);
  const hasArchivedDebrief = Boolean(existingDebriefId);
  const isArchivedMode = isReadOnly || hasArchivedDebrief;

  const applyExistingDebrief = (debriefId: string, data: any) => {
    const isTraded = data.execution?.tradeStatus === 'traded';

    setExistingDebriefId(debriefId);
    setExistingDiscipline(data.discipline || null);
    setTraded(isTraded);

    if (isTraded) {
      setFollowedPlan(data.execution?.followedPlan || null);
      setRespectedStop(data.execution?.respectedStopLoss || null);
      setStoppedAppropriately(data.execution?.stoppedWhenShouldHave || null);
      setAvoidedFomo(data.execution?.avoidedFomo || null);
      setAvoidedRevenge(data.execution?.avoidedRevengeTrading || null);
    } else {
      setAvoidedForcingTrades(data.execution?.avoidedForcingTrades || null);
      setRemainedPatient(data.execution?.remainedPatient || null);
      setProtectedCapital(data.execution?.protectedCapital || null);
      setFollowedMissionObjective(data.execution?.followedMissionObjective || null);
      setWhyNotTradeReason(data.noTradeReason?.label || null);
    }

    setPulseScore(data.psychology?.stateScore || 50);
    setEmotion(data.psychology?.emotions?.[0] || null);
    setNotes(data.lesson?.text || '');
    setDebriefDate(dateFromFirestoreValue(data.date || data.createdAt));
  };

  const clearExistingDebrief = () => {
    setExistingDebriefId(null);
    setExistingDiscipline(null);
  };

  const loadExistingDebrief = async (missionId: string) => {
    if (!user) return null;

    const debriefQuery = query(
      collection(firestore, 'mission_debriefs'),
      where('missionId', '==', missionId),
      where('userId', '==', user.uid),
      limit(1)
    );
    const debriefSnap = await getDocs(debriefQuery);

    if (debriefSnap.empty) {
      clearExistingDebrief();
      return null;
    }

    const debriefDoc = debriefSnap.docs[0];
    applyExistingDebrief(debriefDoc.id, debriefDoc.data());
    return debriefDoc.id;
  };

  useEffect(() => {
    if (!user) return;
    
    // Load Mission Data
    let q;
    if (routeMissionId) {
      // We can't query 'id' field if it's the doc id, so we just use the doc ref, 
      // but if we want to use onSnapshot it's easier to just use doc ref.
      const unsubscribe = onSnapshot(doc(firestore, 'missions', routeMissionId), async (docSnap) => {
        if (docSnap.exists()) {
          const mission = { id: docSnap.id, ...docSnap.data() } as MissionData;
          setMissionData(mission);
          setDebriefDate(dateFromFirestoreValue(mission.createdAt));

          try {
            const foundDebriefId = await loadExistingDebrief(routeMissionId);
            if (isReadOnly && !foundDebriefId) {
              Alert.alert("Missing Data", "No debrief record was found for this mission. It may be from an older version of the app.");
              navigation.goBack();
            }
          } catch (e) {
            console.error("Error fetching debrief", e);
            Alert.alert("Error", "Could not load debrief data.");
            navigation.goBack();
          }
        } else {
          setMissionData(null);
        }
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      q = query(
        collection(firestore, 'missions'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();
          const mission = { id: docSnap.id, ...data } as MissionData;
          setMissionData(mission);
          setDebriefDate(dateFromFirestoreValue(data.createdAt));

          try {
            await loadExistingDebrief(mission.id);
          } catch (e) {
            console.error("Error checking existing debrief", e);
          }
        } else {
          setMissionData(null);
          clearExistingDebrief();
        }
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user, routeMissionId, isReadOnly]);

  function calculateCurrentDisciplineScore() {
    if (traded === null) return null;
    
    try {
      const missionContext = { 
        objective: missionData?.objective,
        primaryThreat: missionData?.threats?.[0] || 'none',
        coreFocus: missionData?.coreFocus
      };

      // Provide valid fallbacks to bypass the strict validateDebrief requirements 
      // for Free users who are locked out of entering these fields.
      const fallbackEmotion = emotion || 'neutral';
      const fallbackLesson = notes.length > 10 ? notes : 'Routine execution check completed.';
      const fallbackAssessment = 'N/A';

      if (traded === true) {
        if (!followedPlan || !respectedStop || !stoppedAppropriately || !avoidedFomo || !avoidedRevenge) return null;
        
        return calculateDisciplineScore({
          didTrade: true,
          followedPlan,
          respectedStop,
          stoppedAppropriately,
          avoidedFomo,
          avoidedRevenge,
          emotionalControlValue: pulseScore,
          emotionalState: fallbackEmotion,
          biggestLesson: fallbackLesson,
          selfAssessment: fallbackAssessment
        }, missionContext);
      } else {
        if (!avoidedForcingTrades || !remainedPatient || !protectedCapital || !followedMissionObjective) return null;
        
        return calculateDisciplineScore({
          didTrade: false,
          avoidedForcingTrades,
          remainedPatient,
          protectedCapital,
          followedMissionObjective,
          emotionalState: fallbackEmotion,
          biggestLesson: fallbackLesson,
          selfAssessment: fallbackAssessment
        }, missionContext);
      }
    } catch (e) {
      console.warn("Discipline score calculation blocked:", e);
      return null;
    }
  }

  // Live Score Calculation
  const currentDisciplineScore = useMemo(() => {
    if (existingDiscipline) return buildArchivedDisciplineResult(existingDiscipline);
    if (hasArchivedDebrief) return null;
    return calculateCurrentDisciplineScore();
  }, [existingDiscipline, hasArchivedDebrief, traded, followedPlan, respectedStop, stoppedAppropriately, avoidedFomo, avoidedRevenge, avoidedForcingTrades, remainedPatient, protectedCapital, followedMissionObjective, pulseScore, emotion, notes, missionData]);
  const headerDate = useMemo(() => {
    return formatDebriefDate(debriefDate || dateFromFirestoreValue(missionData?.createdAt));
  }, [debriefDate, missionData?.createdAt]);
  const sessionLengthDisplay = useMemo(() => {
    return formatSessionLength(missionData, 120);
  }, [missionData]);

  const handleSubmit = async () => {
    if (existingDebriefId) {
      Alert.alert(
        "Debrief Archived",
        "This mission already has a completed debrief. Archived debriefs are locked to protect your stats and score history.",
        [
          {
            text: "View Results",
            onPress: () => navigation.replace('MissionResults', {
              debriefId: existingDebriefId,
              missionId: missionData?.id,
            }),
          },
          { text: "OK", style: "cancel" },
        ],
      );
      return;
    }

    const completedScore = calculateCurrentDisciplineScore();

    if (!user || !missionData || isSubmitting || !completedScore) return;
    
    // If No Trade, they must pick a reason
    if (traded === false && !whyNotTradeReason) return;
    
    // Notes and emotion are completely optional for Elite users.

    Alert.alert(
      "Confirm Submission",
      "Are you sure? Once completed, this mission and its discipline score are permanently locked and cannot be changed.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Complete Debrief", 
          style: "default",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const now = new Date();
              const archivedDebriefId = await loadExistingDebrief(missionData.id);
              if (archivedDebriefId) {
                navigation.replace('MissionResults', {
                  debriefId: archivedDebriefId,
                  missionId: missionData.id,
                });
                return;
              }

              const disciplineOutput = buildDisciplineOutput(completedScore);
              const savedEmotion = emotion || 'neutral';
      
      // 1. Save massive debrief document
      const debriefRef = await addDoc(collection(firestore, 'mission_debriefs'), {
        userId: user.uid,
        missionId: missionData.id,
        date: now.toISOString().split('T')[0],
        session: missionData.session || 'custom',
        missionSnapshot: {
          objective: missionData.objective,
          threatsIdentified: missionData.threats || [],
          coreFocus: missionData.coreFocus,
          session: missionData.session || 'custom',
        },
        execution: traded ? {
          tradeStatus: 'traded',
          followedPlan,
          respectedStopLoss: respectedStop,
          avoidedFomo,
          avoidedRevengeTrading: avoidedRevenge,
          stoppedWhenShouldHave: stoppedAppropriately
        } : {
          tradeStatus: 'no_trade',
          avoidedForcingTrades,
          remainedPatient,
          protectedCapital,
          followedMissionObjective
        },
        noTradeReason: traded === false ? {
          selected: true,
          label: whyNotTradeReason
        } : { selected: false, label: null },
        psychology: {
          stateScore: pulseScore,
          stateLabel: getPulseLabel(pulseScore),
          emotions: [savedEmotion]
        },
        lesson: { text: notes },
        summary: {
          sessionLengthMinutes: 120, // Mock
          missionStart: missionData.createdAt?.toDate().toISOString() || now.toISOString(),
          missionStatus: traded ? 'TRADED' : 'NO TRADE DAY'
        },
        discipline: disciplineOutput,
        archive: {
          readyForArchive: true,
          includedInStats: true,
          includedInWeeklyReview: isPro
        },
        access: {
          isProFeature: false,
          createdWhilePro: isPro
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(firestore, 'discipline_scores'), {
        ...buildDisciplineScoreDocument({
          userId: user.uid,
          missionData,
          debriefId: debriefRef.id,
          disciplineOutput,
          traded,
        }),
      });

      // 2. Update User Stats FIRST so we can use the fresh data for the mission summary
      const tradeStatus = traded ? 'traded' : 'no_trade';
      await updateUserStatsAfterDebrief({
        completedAt: now,
        debriefId: debriefRef.id,
        score: disciplineOutput.score,
        tradeStatus,
        userId: user.uid,
      });

      // 3. Fetch updated stats to calculate rank for the mission summary
      const updatedStatsSnap = await getDoc(doc(firestore, 'user_stats', user.uid));
      const updatedStats = updatedStatsSnap.exists() ? updatedStatsSnap.data() : {};
      
      const averageDisciplineScore = typeof updatedStats.averageDisciplineScore === 'number' ? updatedStats.averageDisciplineScore : disciplineOutput.score;
      const completedMissions = typeof updatedStats.totalMissionsCompleted === 'number' ? updatedStats.totalMissionsCompleted : 1;
      const currentStreak = typeof updatedStats.currentStreak === 'number' ? updatedStats.currentStreak : 1;

      // Calculate rank with fresh stats
      const { calculateRankProgression } = await import('../logic/rankProgression');
      const rank = calculateRankProgression({
        averageDisciplineScore,
        completedMissions,
        currentStreak,
      });

      // Get coach message for the summary
      const coachingStyle = (user as any)?.coachingStyle || 'tactical';
      const coachMsg = getRandomCoachMessage({
        alertType: 'mission_results',
        coachingStyle: coachingStyle as any,
        missionStatus: 'completed',
      });

      // 4. Update existing Mission doc with everything
      const completedAt = serverTimestamp();
      const completedMissionStatus = traded ? 'TRADED' : 'NO TRADE DAY';

      await updateDoc(doc(firestore, 'missions', missionData.id), {
        status: 'completed',
        completedAt,
        debriefId: debriefRef.id,
        disciplineScore: disciplineOutput.score,
        disciplineGrade: disciplineOutput.grade,
        strongestBehavior: disciplineOutput.strongestBehavior,
        improvementArea: disciplineOutput.improvementArea,
        missionStatus: completedMissionStatus,
        missionSummary: buildMissionSummary({
          completedAt,
          debriefId: debriefRef.id,
          discipline: disciplineOutput,
          mission: {
            ...missionData,
            missionStatus: completedMissionStatus,
            coachMessage: coachMsg.body,
            coachingStyle: coachingStyle,
          },
          tradeStatus,
          currentRank: rank.currentRank,
          rankProgress: rank.progressPercentage,
          currentStreak,
        }),
      });
      
      if (isPro) {
        navigation.replace('MissionResults', {
          debriefId: debriefRef.id,
          missionId: missionData.id,
        });
      } else {
        navigation.replace('MissionActive');
      }

            } catch (e: any) {
              console.error('Error saving debrief:', e);
              Alert.alert("Submission Failed", e.message || "An error occurred while saving your debrief.");
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const renderTriPill = (value: YesMostlyNo | null, setter: (val: YesMostlyNo) => void) => (
    <View style={styles.triPillContainer}>
      <Pressable style={[styles.triPill, value === 'Yes' && styles.triPillActive]} onPress={() => setter('Yes')}>
        <Text style={[styles.triPillText, value === 'Yes' && styles.triPillTextActive]}>YES</Text>
      </Pressable>
      <Pressable style={[styles.triPill, value === 'Mostly' && styles.triPillActive]} onPress={() => setter('Mostly')}>
        <Text style={[styles.triPillText, value === 'Mostly' && styles.triPillTextActive]}>MOSTLY</Text>
      </Pressable>
      <Pressable style={[styles.triPill, value === 'No' && styles.triPillActive]} onPress={() => setter('No')}>
        <Text style={[styles.triPillText, value === 'No' && styles.triPillTextActive]}>NO</Text>
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#e9c176" />
      </View>
    );
  }

  if (!missionData) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerEyebrow}>POST-SESSION ANALYSIS</Text>
            <Text style={styles.headerTitle}>MISSION DEBRIEF</Text>
            {headerDate ? <Text style={styles.headerDate}>{headerDate}</Text> : null}
            <View style={styles.headerDivider} />
          </View>

          {isArchivedMode && (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.replace('MissionActive')}
              style={({ pressed }) => [styles.returnToMissionButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.returnToMissionText}>BACK TO ACTIVE MISSION</Text>
            </Pressable>
          )}

          {/* Top Mission Summary Card (Matches Readiness Check) */}
          <View style={styles.summaryCard}>
            <View style={styles.cornerDetail} />
            <View style={styles.summaryTopRow}>
              <View>
                <Text style={styles.summaryLabel}>{t('readinessCheck.summary.objective', "TODAY'S MISSION: OBJECTIVE")}</Text>
                <Text style={styles.summaryObjective}>
                  {missionData.objective ? t(`data.objectives.${missionData.objective}.title`, missionData.objective.replace(/_/g, ' ')).toUpperCase() : ''}
                </Text>
              </View>
              <Text style={styles.fadedSymbol}>◎</Text>
            </View>

            <View style={styles.innerDivider} />

            <View>
              <Text style={styles.summaryLabel}>{t('readinessCheck.summary.threats', 'THREATS IDENTIFIED')}</Text>
              <Text style={styles.summaryThreats}>
                {missionData.threats?.length > 0 
                  ? missionData.threats.map(threat => t(`data.threats.${threat}`, threat.replace(/_/g, ' ')).toUpperCase()).join(' • ') 
                  : ''}
              </Text>
            </View>

            <View style={{ marginTop: 16 }}>
              <Text style={styles.summaryLabel}>{t('readinessCheck.summary.focus', 'CORE FOCUS')}</Text>
              <Text style={styles.summaryFocus}>
                {missionData.coreFocus ? t(`data.focusAreas.${missionData.coreFocus}`, missionData.coreFocus.replace(/_/g, ' ')).toUpperCase() : ''}
              </Text>
            </View>
          </View>

          <View pointerEvents={isArchivedMode ? 'none' : 'auto'}>
            <Text style={styles.sectionHeader}>EXECUTION INTEGRITY</Text>

          {/* Gateway Question */}
          <View style={styles.card}>
            <Text style={styles.questionTextBold}>Operational Check: Did you trade today?</Text>
            <View style={styles.pillContainer}>
              <Pressable style={[styles.gatewayPill, traded === true && styles.gatewayPillActive]} onPress={() => setTraded(true)}>
                <Text style={[styles.gatewayPillText, traded === true && styles.gatewayPillTextActive]}>YES, TRADED</Text>
              </Pressable>
              <Pressable style={[styles.gatewayPill, traded === false && styles.gatewayPillActive]} onPress={() => setTraded(false)}>
                <Text style={[styles.gatewayPillText, traded === false && styles.gatewayPillTextActive]}>NO TRADE</Text>
              </Pressable>
            </View>
            {!isArchivedMode && (
              <Pressable 
                onPress={() => navigation.replace('MissionActive')} 
                style={({ pressed }) => [styles.skipDebriefBtn, pressed && styles.buttonPressed]}
              >
                <Text style={styles.skipDebriefBtnText}>SKIP DEBRIEF</Text>
              </Pressable>
            )}
          </View>

          {traded === true && (
            <>
              <View style={styles.card}><Text style={styles.questionTextBold}>DID YOU FOLLOW YOUR TRADING PLAN?</Text>{renderTriPill(followedPlan, setFollowedPlan)}</View>
              <View style={styles.card}><Text style={styles.questionTextBold}>DID YOU RESPECT YOUR STOP LOSS?</Text>{renderTriPill(respectedStop, setRespectedStop)}</View>
              <View style={styles.card}><Text style={styles.questionTextBold}>DID YOU AVOID FOMO?</Text>{renderTriPill(avoidedFomo, setAvoidedFomo)}</View>
              <View style={styles.card}><Text style={styles.questionTextBold}>DID YOU AVOID REVENGE TRADING?</Text>{renderTriPill(avoidedRevenge, setAvoidedRevenge)}</View>
              <View style={styles.card}><Text style={styles.questionTextBold}>DID YOU STOP WHEN YOU SHOULD HAVE?</Text>{renderTriPill(stoppedAppropriately, setStoppedAppropriately)}</View>
            </>
          )}

          {traded === false && (
            <>
              <View style={styles.card}><Text style={styles.questionTextBold}>DID YOU AVOID FORCING TRADES?</Text>{renderTriPill(avoidedForcingTrades, setAvoidedForcingTrades)}</View>
              <View style={styles.card}><Text style={styles.questionTextBold}>DID YOU REMAIN PATIENT?</Text>{renderTriPill(remainedPatient, setRemainedPatient)}</View>
              <View style={styles.card}><Text style={styles.questionTextBold}>DID YOU PROTECT CAPITAL?</Text>{renderTriPill(protectedCapital, setProtectedCapital)}</View>
              <View style={styles.card}><Text style={styles.questionTextBold}>DID YOU FOLLOW MISSION OBJECTIVE?</Text>{renderTriPill(followedMissionObjective, setFollowedMissionObjective)}</View>
              
              <View style={styles.card}>
                <Text style={styles.questionTextBold}>Why did you not trade?</Text>
                <View style={styles.grid2Col}>
                  {NO_TRADE_REASONS.map(reason => (
                    <Pressable key={reason} style={[styles.gridButton, whyNotTradeReason === reason && styles.gridButtonActive]} onPress={() => setWhyNotTradeReason(reason)}>
                      <Text style={[styles.gridButtonText, whyNotTradeReason === reason && styles.gridButtonTextActive]}>{reason}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          )}

          {traded !== null && (
            <View style={styles.card}>
              <View style={styles.pulseHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.questionTextBold}>Psychological State</Text>
                  {!isPro && <Text style={styles.proLockIcon}> 🔒</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.dynamicPulseLabel}>DYNAMIC PULSE</Text>
                  <Text style={[styles.dynamicPulseValue, !isPro && { color: '#5a5f63' }]}>{getPulseLabel(pulseScore)}</Text>
                </View>
              </View>
              
              <View style={[styles.lockedOverlayContainer, !isPro && { opacity: 0.5 }]}>
                <Slider
                  style={{ width: '100%', height: 40, marginBottom: 8 }}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={pulseScore}
                  onValueChange={(val) => setPulseScore(val)}
                  minimumTrackTintColor="#e9c176"
                  maximumTrackTintColor="#2a3135"
                  thumbTintColor="#e9c176"
                  disabled={!isPro || isArchivedMode}
                />
                <View style={styles.sliderLabels}><Text style={styles.sliderLabelText}>FRANTIC</Text><Text style={styles.sliderLabelText}>ELITE</Text></View>
                <Text style={styles.todayIFeltLabel}>TODAY I FELT</Text>
                <View style={styles.emojiGrid}>
                  {EMOTIONS.map(e => (
                    <Pressable key={e.id} style={[styles.emojiButton, emotion === e.id && styles.emojiButtonActive]} onPress={() => setEmotion((current) => current === e.id ? null : e.id)}>
                      <Text style={[styles.emojiButtonText, emotion === e.id && styles.emojiButtonTextActive]}>{e.icon} {e.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}

          {traded !== null && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={[styles.questionTextBold, { marginBottom: 0 }]}>OPERATIONAL INTELLIGENCE</Text>
                {!isPro && <Text style={styles.proLockIcon}> 🔒</Text>}
              </View>
              <View pointerEvents={isPro ? 'auto' : 'none'}>
                <TextInput
                  style={[styles.notesInput, !isPro && { opacity: 0.5 }]}
                  placeholder={isPro ? "Deconstruct your qualitative findings here..." : "Upgrade to Elite to unlock session notes and journaling."}
                  placeholderTextColor="#5a5f63"
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                  editable={isPro && !isArchivedMode}
                />
              </View>
            </View>
          )}
          </View>

          {traded !== null && currentDisciplineScore && (
            <View style={styles.missionSummaryCard}>
              <View style={styles.missionSummaryRow}>
                <View style={styles.goldDot} />
                <Text style={styles.missionSummaryTitle}>MISSION SUMMARY</Text>
              </View>
              <View style={styles.summaryItemRow}><Text style={styles.summaryItemLabel}>SESSION LENGTH</Text><Text style={styles.summaryItemValue}>{sessionLengthDisplay}</Text></View>
              <View style={styles.summaryItemRow}><Text style={styles.summaryItemLabel}>OBJECTIVE</Text><Text style={styles.summaryItemValue}>{t(`data.objectives.${missionData.objective}.title`, missionData.objective.replace(/_/g, ' ')).toUpperCase()}</Text></View>
              <View style={[styles.summaryItemRow, { marginTop: 12 }]}><Text style={styles.summaryItemLabel}>MISSION STATUS</Text>
                <View style={styles.statusChip}><Text style={styles.statusChipText}>{traded ? 'TRADED' : 'NO TRADE DAY'}</Text></View>
              </View>

              <Text style={styles.disciplineGradingLabel}>DISCIPLINE GRADE</Text>
              <View style={styles.gradeDisplayContainer}>
                <View style={styles.gradeDisplayAccent} />
                <View style={styles.gradeDisplayContent}>
                  <View style={styles.gradeDisplayLeft}>
                    {(() => {
                      const tierName = ['S', 'A+', 'A', 'A-'].includes(currentDisciplineScore.finalGrade) ? 'ELITE' :
                                     ['B+', 'B', 'B-'].includes(currentDisciplineScore.finalGrade) ? 'STRONG' :
                                     ['C+', 'C'].includes(currentDisciplineScore.finalGrade) ? 'AVERAGE' : 'RECOVERY REQUIRED';
                      return (
                        <Text 
                          style={[styles.gradeDisplayTier, tierName.length > 10 && { fontSize: 14 }]}
                          adjustsFontSizeToFit
                          numberOfLines={1}
                        >
                          {tierName}
                        </Text>
                      );
                    })()}
                    <Text style={styles.gradeDisplayScore}>{currentDisciplineScore.finalScore} / 100 PTS</Text>
                  </View>
                  <View style={styles.gradeDisplayRight}>
                    <Text style={styles.gradeDisplayLetter}>
                      {currentDisciplineScore.finalGrade}
                    </Text>
                  </View>
                </View>
              </View>

              {!isArchivedMode ? (
                <>
                  <View style={styles.archiveBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={styles.archiveIcon}>📁</Text>
                      <Text style={styles.archiveBoxTitle}>MISSION READY FOR ARCHIVE</Text>
                    </View>
                    <Text style={styles.archiveBullet}>• DISCIPLINE SCORE INTEGRATION</Text>
                    <Text style={styles.archiveBullet}>• PROGRESS ANALYTICS SYNC</Text>
                    {isPro && <Text style={styles.archiveBullet}>• VAULT INTELLIGENCE UPDATE</Text>}
                  </View>
                  
                  <Pressable
                    style={({ pressed }) => [styles.submitButton, (!currentDisciplineScore) && styles.submitButtonDisabled, pressed && { opacity: 0.8 }]}
                    onPress={handleSubmit}
                    disabled={!currentDisciplineScore || isSubmitting || (traded === false && !whyNotTradeReason)}
                  >
                    <Text style={styles.submitButtonText}>{isSubmitting ? 'SAVING...' : 'COMPLETE DEBRIEF'}</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={[styles.submitButton, styles.submitButtonDisabled, { marginTop: 32 }]}
                  disabled={true}
                >
                  <Text style={styles.submitButtonText}>DEBRIEF ARCHIVED</Text>
                </Pressable>
              )}
            </View>
          )}
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#101415' },
  container: { flex: 1, backgroundColor: '#101415' },
  scrollContent: { padding: 24, paddingBottom: 60 },
  header: { marginBottom: 24 },
  headerEyebrow: { color: '#e9c176', fontFamily: 'Montserrat', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  headerTitle: { color: '#f8fafc', fontFamily: 'Montserrat', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  headerDate: { color: '#8a8f93', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginTop: 8, textTransform: 'uppercase' },
  headerDivider: { height: 2, backgroundColor: '#e9c176', width: '100%', marginTop: 12 },
  returnToMissionButton: { alignItems: 'center', borderColor: '#4e4639', borderWidth: 1, justifyContent: 'center', marginBottom: 24, minHeight: 48 },
  returnToMissionText: { color: '#e9c176', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  
  summaryCard: { backgroundColor: '#1f2324', borderColor: 'rgba(154, 143, 128, 0.18)', borderWidth: 1, paddingHorizontal: 18, paddingVertical: 19, position: 'relative', marginBottom: 32 },
  cornerDetail: { backgroundColor: '#c5a059', height: 20, left: 0, position: 'absolute', top: 0, width: 4 },
  summaryTopRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: 'rgba(209, 197, 180, 0.65)', fontSize: 12, fontWeight: '800', letterSpacing: 1.3, marginBottom: 5, textTransform: 'uppercase' },
  summaryObjective: { color: '#f0c978', fontSize: 18, fontWeight: '900', textTransform: 'uppercase' },
  fadedSymbol: { color: 'rgba(233, 193, 118, 0.35)', fontSize: 28, fontWeight: '900' },
  innerDivider: { backgroundColor: 'rgba(154, 143, 128, 0.12)', height: 1, marginVertical: 17 },
  summaryThreats: { color: '#ffb4ab', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  summaryFocus: { color: '#e0e3e5', fontSize: 18, fontWeight: '900', textTransform: 'uppercase' },
  
  sectionHeader: { color: '#8a8f93', fontFamily: 'Montserrat', fontSize: 12, fontWeight: '700', letterSpacing: 2, marginBottom: 16 },
  card: { backgroundColor: '#1a1e1f', padding: 20, marginBottom: 16 },
  questionTextBold: { color: '#f8fafc', fontFamily: 'Montserrat', fontSize: 13, fontWeight: '700', marginBottom: 16 },
  proLockIcon: { fontSize: 12, color: '#8a8f93' },
  
  pillContainer: { flexDirection: 'row', gap: 12 },
  gatewayPill: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 4, borderWidth: 1, borderColor: '#4e4639', backgroundColor: '#101415' },
  gatewayPillActive: { backgroundColor: '#e9c176', borderColor: '#e9c176' },
  gatewayPillText: { color: '#8a8f93', fontFamily: 'Montserrat', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  gatewayPillTextActive: { color: '#101415' },
  
  skipDebriefBtn: { alignItems: 'center', borderColor: '#4e4639', borderWidth: 1, justifyContent: 'center', marginTop: 16, minHeight: 48 },
  skipDebriefBtnText: { color: '#8a8f93', fontFamily: 'Montserrat', fontSize: 10, fontWeight: '700', letterSpacing: 2 },

  triPillContainer: { flexDirection: 'row', gap: 0 },
  triPill: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2a3135', backgroundColor: '#101415' },
  triPillActive: { backgroundColor: '#1a1e1f', borderColor: '#4e4639' },
  triPillText: { color: '#5a5f63', fontFamily: 'Montserrat', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  triPillTextActive: { color: '#e0e3e5' },

  grid2Col: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  gridButton: { width: '48%', minHeight: 48, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2a3135', backgroundColor: '#101415' },
  gridButtonActive: { borderColor: '#4e4639', backgroundColor: '#1a1e1f' },
  gridButtonText: { color: '#5a5f63', fontFamily: 'Montserrat', fontSize: 8, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  gridButtonTextActive: { color: '#e0e3e5' },

  lockedOverlayContainer: { },
  pulseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  dynamicPulseLabel: { color: '#5a5f63', fontFamily: 'Montserrat', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  dynamicPulseValue: { color: '#e9c176', fontFamily: 'Montserrat', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 4 },
  sliderLabelText: { color: '#5a5f63', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  
  todayIFeltLabel: { color: '#5a5f63', fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 12 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  emojiButton: { width: '31%', paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2a3135', backgroundColor: '#101415', borderRadius: 24 },
  emojiButtonActive: { borderColor: '#4e4639', backgroundColor: '#1a1e1f' },
  emojiButtonText: { color: '#8a8f93', fontSize: 11, fontWeight: '700' },
  emojiButtonTextActive: { color: '#e0e3e5' },

  notesInput: { minHeight: 80, color: '#e0e3e5', fontSize: 14, textAlignVertical: 'top', paddingTop: 0 },

  missionSummaryCard: { backgroundColor: '#1a1e1f', padding: 24, marginTop: 16 },
  missionSummaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  goldDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e9c176', marginRight: 8 },
  missionSummaryTitle: { color: '#e9c176', fontFamily: 'Montserrat', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  summaryItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryItemLabel: { color: '#8a8f93', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  summaryItemValue: { color: '#e0e3e5', fontSize: 12, fontWeight: '700' },
  statusChip: { borderWidth: 1, borderColor: '#4e4639', paddingHorizontal: 12, paddingVertical: 4 },
  statusChipText: { color: '#8a8f93', fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  disciplineGradingLabel: { color: '#8a8f93', fontFamily: 'Montserrat', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginTop: 32, marginBottom: 12 },
  gradeDisplayContainer: { backgroundColor: '#101415', borderColor: 'rgba(233, 193, 118, 0.4)', borderWidth: 1, position: 'relative', padding: 24, marginVertical: 8 },
  gradeDisplayAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#e9c176' },
  gradeDisplayContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gradeDisplayLeft: { flex: 1 },
  gradeDisplayRight: { justifyContent: 'center', alignItems: 'flex-end', minWidth: 80 },
  gradeDisplayTier: { color: '#f8fafc', fontFamily: 'Montserrat', fontSize: 24, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  gradeDisplayScore: { color: '#e9c176', fontFamily: 'Montserrat', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  gradeDisplayLetter: { color: '#e9c176', fontFamily: 'Montserrat', fontSize: 64, fontWeight: '900', letterSpacing: -2, lineHeight: 68 },

  archiveBox: { backgroundColor: '#101415', padding: 20, marginTop: 32, marginBottom: 24 },
  archiveIcon: { fontSize: 16, marginRight: 8 },
  archiveBoxTitle: { color: '#e9c176', fontFamily: 'Montserrat', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  archiveBullet: { color: '#8a8f93', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },

  submitButton: { backgroundColor: '#e9c176', paddingVertical: 18, alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#4e4639' },
  submitButtonText: { color: '#412d00', fontFamily: 'Montserrat', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  buttonPressed: { opacity: 0.72 },
});
