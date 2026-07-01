import { useNavigation } from '@react-navigation/native';
import { addDoc, collection, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Animated, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Target, AlertTriangle, Compass, Quote, Lock } from 'lucide-react-native';

import { MissionStackNavigationProp } from '../../App';
import {
  getCurrentSession,
  getSessionStatus,
  getSessionProgress,
  getTimeRemaining,
  SESSION_LABELS,
  TradingSession,
} from '../logic/sessionEngine';
import { firebaseAuth, firestore } from '../services/firebase';
import { buildMissionSummary } from '../services/missionSummary';
import { useAuth, useIsPro } from '../contexts/AuthContext';
import { useCoachMessage } from '../features/coaching/useCoachMessage';
import { ProMissionBriefing } from './ProMissionBriefing';
import { ProMissionCockpit } from './ProMissionCockpit';
import { ProMissionAccomplished } from './ProMissionAccomplished';
import { CompactMindsetModule } from './CompactMindsetModule';
import { gradeFromScore } from '../logic/disciplineScore';
import { endMissionLiveActivity, updateMissionLiveActivity } from '../services/liveActivityAdapter';

type UserStats = {
  bestDisciplineScore?: number;
  bestGrade?: string;
  totalDebriefs?: number;
  totalDebriefsCompleted?: number;
  totalMissionsCompleted?: number;
};

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

function SessionNotesModule({ missionId }: { missionId: string }) {
  const { t } = useTranslation('mission');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSave = async () => {
    if (!firebaseAuth.currentUser || !missionId || !note.trim()) return;
    setIsSaving(true);
    try {
      await addDoc(collection(firestore, 'session_notes'), {
        missionId,
        userId: firebaseAuth.currentUser.uid,
        content: note.trim(),
        createdAt: serverTimestamp(),
      });
      setNote('');
      setIsExpanded(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isExpanded) {
    return (
      <Pressable onPress={() => setIsExpanded(true)} style={notesStyles.toggleBtn}>
        <Text style={notesStyles.toggleBtnText}>+ ADD SESSION NOTE</Text>
      </Pressable>
    );
  }

  return (
    <View style={notesStyles.container}>
      <View style={notesStyles.accentLine} />
      <View style={notesStyles.headerRow}>
        <Text style={notesStyles.label}>{t('missionActive.sessionNotesLabel')}</Text>
        <Pressable onPress={() => setIsExpanded(false)} style={notesStyles.closeBtn}>
          <Text style={notesStyles.closeBtnText}>✕</Text>
        </Pressable>
      </View>
      <TextInput
        style={notesStyles.input}
        multiline
        placeholder={t('missionActive.sessionNotesPlaceholder')}
        placeholderTextColor="#5a5f63"
        value={note}
        onChangeText={setNote}
      />
      <Pressable onPress={handleSave} disabled={isSaving || !note.trim()} style={[notesStyles.saveBtn, (!note.trim() || isSaving) && notesStyles.saveBtnDisabled]}>
        <Text style={notesStyles.saveBtnText}>{isSaving ? '...' : t('missionActive.saveNoteBtn')}</Text>
      </Pressable>
    </View>
  );
}

function LiveTimerModule({
  focusKey,
  sessionKey,
}: {
  focusKey: string;
  sessionKey: TradingSession;
}) {
  const { t } = useTranslation('mission');
  const [timeLeft, setTimeLeft] = useState('...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const remaining = getTimeRemaining(sessionKey);
      
      const pad = (n: number) => n.toString().padStart(2, '0');
      const h = pad(remaining.hours);
      const m = pad(remaining.minutes);
      const s = pad(remaining.seconds);
      
      setTimeLeft(`${h}:${m}:${s}`);
      setProgress(getSessionProgress(sessionKey));
    }

    update(); // Initial run
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [sessionKey]);

  return (
    <View style={timerStyles.container}>
      <View style={timerStyles.topRow}>
        <View style={timerStyles.infoRow}>
          <View style={timerStyles.iconCircle}>
            <Lock color="#101415" size={20} />
          </View>
          <View style={timerStyles.textColumn}>
            <Text style={timerStyles.protocolText}>{t('missionActive.protocolActive')}</Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={timerStyles.lockText}>
              {focusKey ? t(`data.focusAreas.${focusKey}`).toUpperCase() : ''} {t('missionActive.lockSuffix')}
            </Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={timerStyles.sessionText}>
              {SESSION_LABELS[sessionKey].toUpperCase()} MONITORING
            </Text>
          </View>
        </View>

        <View style={timerStyles.timeBlock}>
          <Text adjustsFontSizeToFit minimumFontScale={0.64} numberOfLines={1} style={timerStyles.timeText}>{timeLeft}</Text>
          <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={timerStyles.untilClose}>{t('missionActive.untilClose')}</Text>
        </View>
      </View>

      <View style={timerStyles.progressTrack}>
        <View style={[timerStyles.progressFill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

export function MissionActiveScreen() {
  const navigation = useNavigation<MissionStackNavigationProp>();
  const { t } = useTranslation('mission');
  const { user, userProfile } = useAuth();
  const [missionData, setMissionData] = useState<any>(undefined);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentCompletedCount, setRecentCompletedCount] = useState(0);
  const [currentSession, setCurrentSession] = useState(getCurrentSession());
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const isPro = useIsPro();
  const liveActivitiesEnabled = isPro && userProfile?.alertSettings?.lockScreen?.liveActivityUpdates !== false;

  async function handleCompleteMission() {
    if (!missionData?.id || isCompleting) return;
    setIsCompleting(true);
    try {
      const completedAt = serverTimestamp();
      await updateDoc(doc(firestore, 'missions', missionData.id), {
        status: 'completed',
        endedAt: completedAt,
        coachMessage: freeCoachMessage || null,
        coachingStyle: freeCoachMessage?.style || null,
        missionSummary: buildMissionSummary({
          completedAt,
          mission: {
            ...missionData,
            coachMessage: freeCoachMessage || missionData.coachMessage,
            coachingStyle: freeCoachMessage?.style || missionData.coachingStyle,
          },
        }),
      });
      await endMissionLiveActivity('mission_completed');
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
  }

  const [isRestarting, setIsRestarting] = useState(false);
  const [hasDebrief, setHasDebrief] = useState(true);

  useEffect(() => {
    if (missionData?.id && missionData.status === 'completed' && user) {
      const checkDebrief = async () => {
        try {
          const q = query(
            collection(firestore, 'mission_debriefs'),
            where('missionId', '==', missionData.id),
            where('userId', '==', user.uid),
            limit(1)
          );
          const snap = await getDocs(q);
          setHasDebrief(!snap.empty);
        } catch (e) {
          console.error('Error checking for debrief:', e);
        }
      };
      checkDebrief();
    }
  }, [missionData?.id, missionData?.status, user]);

  const handleRestartMission = async () => {
    if (!firebaseAuth.currentUser || !missionData || isRestarting) return;

    const startNewMission = async () => {
      setIsRestarting(true);
      try {
        await addDoc(collection(firestore, 'missions'), {
          userId: firebaseAuth.currentUser!.uid,
          objective: missionData.objective,
          coreFocus: missionData.coreFocus,
          threats: missionData.threats,
          session: getCurrentSession().session || missionData.session || 'custom',
          status: 'pending',
          createdAt: serverTimestamp(),
          lastMindsetScore: 100,
        });
        // The onSnapshot listener will automatically pick up the new mission and switch the UI to pending.
      } catch (error) {
        console.error('Error restarting mission:', error);
      } finally {
        setIsRestarting(false);
      }
    };

    if (!hasDebrief) {
      Alert.alert(
        'Incomplete Debrief',
        'You have not completed the debrief for this mission. No debrief data will be saved. Are you sure you want to start a new mission?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start New Mission', style: 'destructive', onPress: startNewMission }
        ]
      );
    } else {
      startNewMission();
    }
  };

  useEffect(() => {
    if (!user) {
      setUserStats(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(firestore, 'user_stats', user.uid),
      (snapshot) => {
        setUserStats(snapshot.exists() ? (snapshot.data() as UserStats) : null);
      },
      (error) => {
        console.error('Error loading mission stats:', error);
        setUserStats(null);
      },
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setRecentCompletedCount(0);
      return;
    }
    const q = query(
      collection(firestore, 'missions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecentCompletedCount(snapshot.docs.filter((doc) => doc.data().status === 'completed').length);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSession(getCurrentSession());
    }, 10000); // Check session every 10 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const user = firebaseAuth.currentUser;
    if (!user) return;

    const q = query(
      collection(firestore, 'missions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        
        // Check if mission is from today
        const isToday = (date: Date) => {
          const today = new Date();
          return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
        };

        const createdAtDate = data.createdAt ? data.createdAt.toDate() : new Date();
        
        if (data.status === 'completed' && !isToday(createdAtDate)) {
          // If it's a completed mission from a previous day, ignore it so they can create a new one
          setMissionData(null);
        } else {
          setMissionData({ id: docSnap.id, ...data });
        }
      } else {
        setMissionData(null);
      }
    }, (error) => {
      console.error("Firestore Error:", error);
    });

    return () => unsubscribe();
  }, []);

  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (missionData !== undefined) {
      setHasLoaded(true);
    }
  }, [missionData]);

  useEffect(() => {
    if (hasLoaded && missionData === null) {
      navigation.replace('MissionSetup');
    }
  }, [hasLoaded, missionData, navigation]);

  const missionStatusForCoach = missionData?.status;
  const isPendingForCoach = missionStatusForCoach === 'pending';
  const isCompletedForCoach = missionStatusForCoach === 'completed';

  // Coach engine for free users. Keep this before early returns so hook order stays stable.
  const { message: freeCoachMessage, styleLabel: freeCoachStyleLabel } = useCoachMessage({
    alertType: !isPendingForCoach && !isCompletedForCoach ? 'widget' : undefined,
    screenContext: isPendingForCoach ? 'before_trading' : isCompletedForCoach ? 'post_session' : 'during_trading',
    missionData: missionData || null,
  });

  const activeMissionSessionKey: TradingSession =
    missionData?.session === 'new_york' || missionData?.session === 'london' || missionData?.session === 'asia' || missionData?.session === 'custom'
      ? missionData.session
      : currentSession.session || 'custom';
  const activeSessionProgress = activeMissionSessionKey === 'custom' ? 0 : getSessionProgress(activeMissionSessionKey);
  const activeSessionRemainingPercent = activeMissionSessionKey === 'custom' ? 100 : Math.max(0, 100 - activeSessionProgress);

  useEffect(() => {
    if (!liveActivitiesEnabled || !missionData?.id || missionData.status !== 'active') return;

    updateMissionLiveActivity({
      ...missionData,
      currentCoachingMessage: freeCoachMessage?.text,
      coachingStyle: freeCoachMessage?.style,
      session: activeMissionSessionKey,
      sessionRemainingPercent: activeSessionRemainingPercent,
    });
  }, [
    missionData?.id,
    missionData?.objective,
    missionData?.coreFocus,
    missionData?.status,
    missionData?.missionStatus,
    missionData?.currentMindsetStatus,
    missionData?.session,
    JSON.stringify(missionData?.threats || []),
    freeCoachMessage?.text,
    freeCoachMessage?.style,
    activeMissionSessionKey,
    activeSessionRemainingPercent,
    liveActivitiesEnabled,
  ]);

  useEffect(() => {
    if (liveActivitiesEnabled || !missionData?.id || missionData.status !== 'active') return;
    endMissionLiveActivity('disabled_by_user');
  }, [liveActivitiesEnabled, missionData?.id, missionData?.status]);

  useEffect(() => {
    if (!missionData?.id || missionData.status !== 'active' || activeMissionSessionKey === 'custom') return;
    if (getSessionStatus(activeMissionSessionKey) === 'completed') {
      endMissionLiveActivity('market_closed');
    }
  }, [missionData?.id, missionData?.status, activeMissionSessionKey, activeSessionProgress]);

  if (!missionData) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.loadingText}>Initializing Mission Data...</Text>
      </View>
    );
  }

  const { objective, coreFocus, threats, status } = missionData;
  const isPending = status === 'pending';
  const isCompleted = status === 'completed';
  const objectiveKey = objective;
  const focusKey = coreFocus;
  const shouldShowStats = hasStats(userStats);
  const progress = activeSessionProgress;

  // ── Elite Phase Routing ──
  // Elite users get Briefing for pending missions, and Cockpit for active missions.
  // Completed states fall through to the existing Free UI.
  if (isPro) {
    if (status === 'pending') {
      return <ProMissionBriefing mission={missionData} />;
    }
    if (status === 'active') {
      return <ProMissionCockpit mission={missionData} />;
    }
    if (status === 'completed') {
      return (
        <ProMissionAccomplished 
          mission={missionData} 
          hasDebrief={hasDebrief} 
          isRestarting={isRestarting} 
          onRestartMission={handleRestartMission} 
        />
      );
    }
  }

  // ── Free Mission Active Lite (unchanged) ──
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {!isPending && !isCompleted ? (
            <AnimatedMissionHeader />
          ) : (
            <View style={styles.header}>
              <View style={styles.liveIndicator}>
                <View style={[styles.liveDot, isCompleted && { backgroundColor: '#8a8f93', shadowColor: 'transparent' }]} />
                <Text style={styles.eyebrow}>
                  {isCompleted ? 'MISSION ARCHIVE' : isPending ? 'MISSION BRIEFING' : t('missionActive.liveFeed')}
                </Text>
              </View>
              <Text style={styles.title}>{t('missionActive.briefingTitle')}</Text>
            </View>
          )}

            <View style={styles.objectiveCard}>
              <View style={styles.objectiveTopRow}>
                <Text style={styles.objectiveEyebrow}>{t('missionActive.primaryObjective')}</Text>
                <Target color="rgba(233, 193, 118, 0.4)" size={20} />
              </View>
              <Text style={styles.objectiveText}>
                {objectiveKey ? t(`data.objectives.${objectiveKey}.title`).toUpperCase() : '...'}
              </Text>
              <View style={styles.goldDivider} />
              <View style={styles.objectiveBottomRow}>
                <Text style={styles.priorityText}>SESSION PROGRESS: {progress || 0}%</Text>
                <Text style={styles.stateText}>
                  OPERATIONAL STATE: <Text style={{ color: isPending ? '#e9c176' : '#79d284' }}>{isPending ? 'PENDING' : 'ACTIVE'}</Text>
                </Text>
              </View>
            </View>

            {/* Mission Signal (Free users) */}
            {freeCoachMessage && (
              <View style={styles.coachSignalCard}>
                <View style={styles.coachSignalHeader}>
                  <Text style={styles.coachSignalEyebrow}>MISSION SIGNAL</Text>
                  <View style={styles.coachSignalBadge}>
                    <Text style={styles.coachSignalBadgeText}>{freeCoachStyleLabel}</Text>
                  </View>
                </View>
                <Text style={styles.coachSignalText}>{freeCoachMessage.text}</Text>
              </View>
            )}

            {shouldShowStats && (
              <View style={styles.activeStatsRow}>
                <ActiveStatWidget label="MISSIONS COMPLETED" value={String(Math.max(numberFrom(userStats?.totalMissionsCompleted), recentCompletedCount))} />
                {isPro && <ActiveStatWidget label="BEST GRADE" value={bestGradeFromStats(userStats)} />}
              </View>
            )}

            <View style={styles.splitRow}>
              <View style={styles.threatsCard}>
                <View style={styles.cardHeader}>
                  <AlertTriangle color="#e27b7b" size={14} style={{ marginRight: 8 }} />
                  <Text style={styles.threatsLabel}>{t('missionActive.threatsLabel')}</Text>
                </View>
                <View style={styles.threatList}>
                  {threats.map((threat: string) => (
                    <View key={threat} style={styles.threatItem}>
                      <View style={styles.threatBullet} />
                      <Text style={styles.threatText}>{t(`data.threats.${threat}`).toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.focusCard}>
                <View style={styles.cardHeader}>
                  <Compass color="#e9c176" size={16} style={{ marginRight: 8 }} />
                  <Text style={styles.focusLabel}>{t('missionActive.coreFocusLabel')}</Text>
                </View>
                <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.focusText}>
                  {focusKey ? t(`data.focusAreas.${focusKey}`).toUpperCase() : '...'}
                </Text>
                <Text style={styles.focusSubtext}>{t('missionActive.mindsetLock')}</Text>
              </View>
            </View>

            <View style={styles.quoteCard}>
              <Quote color="#2a3135" size={48} style={{ marginRight: 16 }} />
              <Text style={styles.quoteText}>{t('missionActive.quote')}</Text>
            </View>

          {isPending ? (
            <View style={styles.pendingContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.startTradingButton,
                  pressed && styles.startTradingButtonPressed,
                ]}
                onPress={() => navigation.navigate('ReadinessCheck', {
                  missionId: missionData.id,
                  objective: missionData.objective,
                  threats: missionData.threats || [],
                  coreFocus: missionData.coreFocus,
                })}
              >
                <Text style={styles.startTradingButtonText}>START TRADING</Text>
              </Pressable>
            </View>
          ) : isCompleted ? (
            <View style={styles.completedContainer}>
              <Text style={styles.completedTitle}>{isPro ? 'MISSION ACCOMPLISHED' : 'MISSION COMPLETE'}</Text>
              <Text style={styles.completedSubtitle}>
                {isPro
                  ? hasDebrief
                    ? 'Review your debrief and stats for this session.'
                    : 'You have an incomplete debrief for this mission.'
                  : 'Session archived.'}
              </Text>
              {!isPro && (
                <View style={styles.lockedGradeCard}>
                  <View style={styles.lockedGradeHeader}>
                    <Text style={styles.lockedGradeLabel}>DISCIPLINE GRADE</Text>
                    <Text style={styles.lockedGradePill}>ELITE</Text>
                  </View>
                  <View style={styles.lockedGradeBody}>
                    <Text style={styles.lockedGradeValue}>--</Text>
                    <View style={styles.lockedGradeCopy}>
                      <Text style={styles.lockedGradeTitle}>GRADE LOCKED</Text>
                      <Text style={styles.lockedGradeText}>
                        Complete an Elite debrief to generate your grade, score breakdown, and mission report.
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              <Pressable
                style={({ pressed }) => [
                  isPro ? styles.startTradingButton : styles.lockedDebriefButton,
                  { width: '100%' }, // Make it full width inside the centered container
                  pressed && styles.startTradingButtonPressed,
                ]}
                onPress={() => {
                  if (isPro) {
                    navigation.navigate('MissionDebrief', { missionId: missionData?.id, readOnly: hasDebrief });
                  } else {
                    navigation.replace('ProUpsell');
                  }
                }}
              >
                <Text style={isPro ? styles.startTradingButtonText : styles.lockedDebriefButtonText}>
                  {isPro ? (hasDebrief ? 'VIEW DEBRIEF' : 'COMPLETE YOUR DEBRIEF') : 'UNLOCK DEBRIEF'}
                </Text>
              </Pressable>
              
              <Pressable
                style={({ pressed }) => [
                  styles.discouragedButton,
                  pressed && { opacity: 0.6 },
                ]}
                onPress={handleRestartMission}
                disabled={isRestarting}
              >
                <Text style={styles.discouragedButtonText}>
                  {isRestarting ? 'STARTING...' : 'START ANOTHER MISSION'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <LiveTimerModule 
                focusKey={focusKey} 
                sessionKey={activeMissionSessionKey}
              />
              <CompactMindsetModule
                alertSettings={userProfile?.alertSettings}
                liveActivitiesEnabled={liveActivitiesEnabled}
                missionId={missionData?.id}
              />
              <SessionNotesModule missionId={missionData?.id} />
              
              <Pressable
                style={({ pressed }) => [
                  styles.completeButton,
                  pressed && styles.completeButtonPressed,
                ]}
                onPress={() => setShowCompleteModal(true)}
              >
                <Text style={styles.completeButtonText}>{t('missionActive.missionComplete')}</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setShowCompleteModal(false)}
        transparent
        visible={showCompleteModal}
      >
        <Pressable
          onPress={() => setShowCompleteModal(false)}
          style={modalStyles.overlay}
        >
          <Pressable style={modalStyles.card}>
            <View style={modalStyles.accent} />
            <Text style={modalStyles.title}>{t('missionActive.endSessionTitle')}</Text>
            <Text style={modalStyles.description}>{t('missionActive.endSessionDesc')}</Text>
            <View style={modalStyles.actions}>
              <Pressable
                disabled={isCompleting}
                onPress={handleCompleteMission}
                style={({ pressed }) => [modalStyles.confirmButton, (pressed || isCompleting) && modalStyles.buttonPressed]}
              >
                <Text adjustsFontSizeToFit numberOfLines={1} style={modalStyles.confirmText}>
                  {isCompleting ? '...' : t('missionActive.completeMissionBtn')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowCompleteModal(false)}
                style={({ pressed }) => [modalStyles.cancelButton, pressed && modalStyles.buttonPressed]}
              >
                <Text adjustsFontSizeToFit numberOfLines={1} style={modalStyles.cancelText}>
                  {t('missionActive.cancelBtn')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function ActiveStatWidget({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.activeStatWidget}>
      <View style={styles.activeStatLabelBlock}>
        <Text style={styles.activeStatEyebrow}>OPERATOR STAT</Text>
        <Text style={styles.activeStatLabel}>{label.replace(' ', '\n')}</Text>
      </View>
      <View style={styles.activeStatValueBadge}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.activeStatValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function bestGradeFromStats(stats: UserStats | null): string {
  if (stats?.bestGrade) return stats.bestGrade;
  return gradeFromScore(numberFrom(stats?.bestDisciplineScore));
}

function hasStats(stats: UserStats | null): boolean {
  return numberFrom(stats?.totalMissionsCompleted) > 0 || numberFrom(stats?.totalDebriefsCompleted ?? stats?.totalDebriefs) > 0;
}

function numberFrom(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

const timerStyles = StyleSheet.create({
  container: {
    backgroundColor: '#14181a',
    borderColor: 'rgba(233, 193, 118, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 20,
    paddingBottom: 24,
    width: '100%',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
    paddingRight: 12,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginRight: 16,
    width: 48,
  },
  lockIcon: {
    color: '#101415',
    fontSize: 20,
  },
  textColumn: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  protocolText: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
    flexShrink: 1,
  },
  lockText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
    flexShrink: 1,
  },
  sessionText: {
    color: '#8a8f93',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    flexShrink: 1,
  },
  progressTrack: {
    backgroundColor: 'rgba(233, 193, 118, 0.1)',
    borderRadius: 2,
    height: 4,
    width: '100%',
  },
  progressFill: {
    backgroundColor: '#e9c176',
    borderRadius: 2,
    height: '100%',
    width: '65%',
  },
  timeBlock: {
    alignItems: 'flex-end',
    flexShrink: 1,
    justifyContent: 'center',
    maxWidth: 112,
    minWidth: 86,
  },
  timeText: {
    color: '#e9c176',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
    maxWidth: '100%',
  },
  untilClose: {
    color: '#8a8f93',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    maxWidth: '100%',
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#101415',
  },
  container: {
    flex: 1,
    padding: 24,
  },
  loadingText: {
    color: '#e0e3e5',
    fontFamily: 'Montserrat',
    fontSize: 16,
  },
  pendingContainer: {
    marginTop: 24,
    width: '100%',
  },
  completedContainer: {
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#1a1e1f',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4e4639',
  },
  completedTitle: {
    color: '#e9c176',
    fontFamily: 'Montserrat',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  completedSubtitle: {
    color: '#8a8f93',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  lockedGradeCard: {
    alignSelf: 'stretch',
    backgroundColor: '#101415',
    borderColor: '#2a3135',
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  lockedGradeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  lockedGradeLabel: {
    color: '#8a8f93',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  lockedGradePill: {
    backgroundColor: '#e9c176',
    color: '#101415',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lockedGradeBody: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  lockedGradeValue: {
    color: '#4e4639',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 1,
  },
  lockedGradeCopy: {
    flex: 1,
  },
  lockedGradeTitle: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  lockedGradeText: {
    color: '#8a8f93',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  startTradingButton: {
    backgroundColor: '#e9c176',
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#e9c176',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  startTradingButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  startTradingButtonText: {
    color: '#412d00',
    fontFamily: 'Montserrat',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 1,
  },
  lockedDebriefButton: {
    alignItems: 'center',
    backgroundColor: '#1b2022',
    borderColor: '#2a3135',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 56,
  },
  lockedDebriefButtonText: {
    color: '#e9c176',
    fontFamily: 'Montserrat',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  discouragedButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discouragedButtonText: {
    color: '#5a5f63', // Dim gray to make it blend into the background
    fontFamily: 'Montserrat',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textDecorationLine: 'underline',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  completeButton: {
    backgroundColor: '#e9c176',
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#e9c176',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  completeButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  completeButtonText: {
    color: '#412d00',
    fontFamily: 'Montserrat',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 1,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 80,
  },
  header: {
    marginBottom: 32,
  },
  liveIndicator: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
  liveDot: {
    backgroundColor: '#e9c176',
    height: 8,
    marginRight: 8,
    width: 8,
  },
  eyebrow: {
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
    marginBottom: 8,
  },
  timestamp: {
    color: '#8a8f93',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  objectiveCard: {
    backgroundColor: '#1a1e1f',
    borderColor: 'rgba(233, 193, 118, 0.2)',
    borderLeftColor: '#e9c176',
    borderLeftWidth: 3,
    borderWidth: 1,
    marginBottom: 16,
    padding: 24,
  },
  objectiveTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  objectiveEyebrow: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  targetIcon: {
    color: 'rgba(233, 193, 118, 0.4)',
    fontSize: 20,
  },
  objectiveText: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
  },
  goldDivider: {
    backgroundColor: '#e9c176',
    height: 2,
    marginBottom: 16,
    marginTop: 24,
    width: '100%',
  },
  objectiveBottomRow: {
    flexDirection: 'column',
    gap: 4,
  },
  coachSignalCard: {
    backgroundColor: '#1a1e1f',
    borderColor: '#2a3135',
    borderWidth: 1,
    marginBottom: 24,
    padding: 16,
    borderLeftColor: '#e9c176',
    borderLeftWidth: 3,
  },
  coachSignalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  coachSignalEyebrow: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  coachSignalBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(233, 193, 118, 0.1)',
    borderColor: 'rgba(233, 193, 118, 0.3)',
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 7,
    paddingTop: 2,
    paddingBottom: 3,
    transform: [{ translateY: -2 }],
  },
  coachSignalBadgeText: {
    color: '#e9c176',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    lineHeight: 9,
  },
  coachSignalText: {
    color: '#f8fafc',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  priorityText: {
    color: '#e9c176',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  stateText: {
    color: '#8a8f93',
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
  },
  headerStatusChip: {
    backgroundColor: '#1a1e1f',
    borderColor: '#4e4639',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerStatusText: {
    color: '#e0e3e5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  threatsCard: {
    backgroundColor: '#1a1e1f',
    borderColor: 'rgba(233, 193, 118, 0.1)',
    borderWidth: 1,
    flex: 1,
    padding: 20,
  },
  focusCard: {
    backgroundColor: '#1a1e1f',
    borderColor: 'rgba(233, 193, 118, 0.1)',
    borderWidth: 1,
    flex: 1,
    padding: 20,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  threatIcon: {
    color: '#e27b7b',
    fontSize: 14,
    marginRight: 8,
  },
  threatsLabel: {
    color: '#e27b7b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  threatList: {
    gap: 12,
  },
  threatItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  threatBullet: {
    backgroundColor: '#e27b7b',
    height: 4,
    marginRight: 10,
    width: 4,
  },
  threatText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  focusIcon: {
    color: '#e9c176',
    fontSize: 16,
    marginRight: 8,
  },
  focusLabel: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  focusText: {
    color: '#e9c176',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 8,
  },
  focusSubtext: {
    color: '#8a8f93',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  quoteCard: {
    backgroundColor: '#14181a',
    borderColor: 'rgba(233, 193, 118, 0.05)',
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 40,
    padding: 24,
  },
  quoteMark: {
    color: '#2a3135',
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 48,
    marginRight: 16,
  },
  quoteText: {
    color: '#d1c5b4',
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 22,
    marginTop: 4,
  },
  activeStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  activeStatWidget: {
    alignItems: 'center',
    backgroundColor: '#14181a',
    borderColor: 'rgba(233, 193, 118, 0.18)',
    borderLeftColor: '#e9c176',
    borderLeftWidth: 3,
    borderWidth: 1,
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 74,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  activeStatLabelBlock: {
    flex: 1,
    paddingRight: 8,
  },
  activeStatEyebrow: {
    color: '#4e4639',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 5,
  },
  activeStatValue: {
    color: '#101415',
    fontSize: 18,
    fontWeight: '900',
    maxWidth: 76,
    textAlign: 'center',
  },
  activeStatValueBadge: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 48,
    paddingHorizontal: 9,
  },
  activeStatLabel: {
    color: '#d1c5b4',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    lineHeight: 13,
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  startButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 64,
    width: '100%',
  },
  endButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 64,
    width: '100%',
    marginTop: 16,
  },
  startButtonDisabled: {
    backgroundColor: '#2a3135',
  },
  startButtonPressed: {
    opacity: 0.85,
  },
  startButtonText: {
    color: '#101415',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  startButtonTextDisabled: {
    color: '#8a8f93',
  },
  startLightning: {
    color: '#101415',
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 8,
  },
  encryptedText: {
    color: '#343b40',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 24,
  },
});

const modalStyles = StyleSheet.create({
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
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 23,
    marginBottom: 28,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
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
  confirmButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  cancelText: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    maxWidth: '100%',
    textAlign: 'center',
  },
  confirmText: {
    color: '#101415',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    maxWidth: '100%',
    textAlign: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
  },
});

const notesStyles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1e1f',
    borderColor: 'rgba(233, 193, 118, 0.2)',
    borderWidth: 1,
    marginTop: 16,
    padding: 24,
    width: '100%',
  },
  accentLine: {
    backgroundColor: '#e9c176',
    height: '12.5%',
    left: -1,
    position: 'absolute',
    top: 24,
    width: 3,
  },
  label: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: '#8a8f93',
    fontSize: 14,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#0a0f10',
    borderColor: '#2a3135',
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 14,
    minHeight: 80,
    padding: 12,
    textAlignVertical: 'top',
  },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    marginTop: 16,
    paddingVertical: 12,
  },
  saveBtnDisabled: {
    backgroundColor: '#2a3135',
  },
  saveBtnText: {
    color: '#101415',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  statusChipsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 16,
  },
  statusChip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#1a1e1f',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a3135',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statusChipActive: {
    backgroundColor: '#2a3135',
    borderColor: '#e9c176',
  },
  statusChipText: {
    color: '#808d93',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusChipTextActive: {
    color: '#e0e3e5',
  },
  toggleBtn: {
    alignItems: 'center',
    backgroundColor: '#1a1e1f',
    borderColor: 'rgba(233, 193, 118, 0.2)',
    borderLeftColor: '#e9c176',
    borderLeftWidth: 3,
    borderWidth: 1,
    marginTop: 16,
    paddingVertical: 16,
    width: '100%',
  },
  toggleBtnText: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
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
    marginBottom: 24,
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
    fontFamily: 'Montserrat',
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
