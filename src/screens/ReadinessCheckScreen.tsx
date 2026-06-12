import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { MissionStackNavigationProp, RootStackParamList } from '../../App';
import { firebaseAuth, firestore } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { calculateMissionStatus } from '../logic/missionStatus';
import { getCurrentSession } from '../logic/sessionEngine';

type ReadinessLevel = 'Low' | 'Medium' | 'High';

type AssessmentKey = 'executionConfidence' | 'patienceReserve' | 'marketFocus';

const levels: ReadinessLevel[] = ['Low', 'Medium', 'High'];

function getMissionCreatedTime(mission: any) {
  const createdAt = mission?.createdAt;

  if (createdAt?.toMillis) return createdAt.toMillis();
  if (createdAt?.toDate) return createdAt.toDate().getTime();
  if (typeof createdAt === 'string') {
    const parsed = Date.parse(createdAt);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getMissionThreats(mission: any): string[] {
  if (Array.isArray(mission?.threats)) return mission.threats;
  if (Array.isArray(mission?.selectedThreats)) return mission.selectedThreats;
  if (mission?.primaryThreat) return [mission.primaryThreat];
  if (mission?.threat) return [mission.threat];
  return [];
}

export function ReadinessCheckScreen() {
  const { t } = useTranslation('mission');
  const navigation = useNavigation<MissionStackNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'ReadinessCheck'>>();
  
  const assessmentItems: Array<{
    key: AssessmentKey;
    title: string;
    description: string;
  }> = [
    {
      key: 'executionConfidence',
      title: t('readinessCheck.assessment.executionConfidence.title'),
      description: t('readinessCheck.assessment.executionConfidence.description'),
    },
    {
      key: 'patienceReserve',
      title: t('readinessCheck.assessment.patienceReserve.title'),
      description: t('readinessCheck.assessment.patienceReserve.description'),
    },
    {
      key: 'marketFocus',
      title: t('readinessCheck.assessment.marketFocus.title'),
      description: t('readinessCheck.assessment.marketFocus.description'),
    },
  ];

  const [ratings, setRatings] = useState<Record<AssessmentKey, ReadinessLevel>>({
    executionConfidence: 'High',
    patienceReserve: 'Medium',
    marketFocus: 'High',
  });

  const [missionData, setMissionData] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    if (route.params?.missionId) {
      setMissionData({
        id: route.params.missionId,
        objective: route.params.objective,
        threats: route.params.threats || [],
        coreFocus: route.params.coreFocus,
      });

      const unsubscribe = onSnapshot(
        doc(firestore, 'missions', route.params.missionId),
        (docSnap) => {
          if (docSnap.exists()) {
            console.log('Found pending mission by param:', docSnap.id);
            setMissionData({ id: docSnap.id, ...docSnap.data() });
          }
        },
        (error) => {
          console.error('onSnapshot error in ReadinessCheckScreen mission doc:', error);
        }
      );

      return () => unsubscribe();
    }

    const q = query(
      collection(firestore, 'missions'),
      where('userId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        console.log('ReadinessCheckScreen onSnapshot fired. Docs count:', snapshot.size);
        if (!snapshot.empty) {
          const latestPendingMission = snapshot.docs
            .map((docSnap) => ({ docSnap, data: docSnap.data() }))
            .sort((a, b) => getMissionCreatedTime(b.data) - getMissionCreatedTime(a.data))[0];

          console.log('Found pending mission:', latestPendingMission.docSnap.id);
          setMissionData({ id: latestPendingMission.docSnap.id, ...latestPendingMission.data });
        } else {
          console.log('No pending missions found for user:', user.uid);
          setMissionData(null);
        }
      },
      (error) => {
        console.error('onSnapshot error in ReadinessCheckScreen:', error);
      }
    );

    return () => unsubscribe();
  }, [route.params, user]);

  const isLockedIn = useMemo(() => {
    return Object.values(ratings).every((rating) => rating !== 'Low');
  }, [ratings]);

  function updateRating(key: AssessmentKey, rating: ReadinessLevel) {
    setRatings((currentRatings) => ({
      ...currentRatings,
      [key]: rating,
    }));
  }

  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const displayedThreats = getMissionThreats(missionData);

  function handleEditMission() {
    setShowEditModal(false);
    navigation.navigate('MissionSetup', missionData?.id ? {
      missionId: missionData.id,
      objective: missionData.objective,
      threats: displayedThreats,
      coreFocus: missionData.coreFocus,
    } : undefined);
  }

  async function handleBeginSession() {
    if (isSaving || !missionData || !user) {
      console.log('Cannot begin session:', { isSaving, hasMissionData: !!missionData, hasUser: !!user });
      return;
    }

    try {
      setIsSaving(true);
      
      const newStatusResult = calculateMissionStatus({
        confidence: ratings.executionConfidence,
        patience: ratings.patienceReserve,
        focus: ratings.marketFocus,
      });
      
      await addDoc(collection(firestore, 'mindset_checkins'), {
        missionId: missionData.id,
        userId: user.uid,
        type: 'pre_session',
        confidence: ratings.executionConfidence,
        patience: ratings.patienceReserve,
        focus: ratings.marketFocus,
        score: newStatusResult.score,
        missionStatus: newStatusResult.status,
        createdAt: serverTimestamp(),
      });

      // Update the mission document to mark it as active and save initial status
      await updateDoc(doc(firestore, 'missions', missionData.id), {
        status: 'active',
        missionStatus: newStatusResult.status,
        missionPhase: 'active',
        session: getCurrentSession().session || missionData.session || 'custom',
        sessionStartedAt: serverTimestamp(),
        readinessScore: newStatusResult.score,
        lastMindsetScore: newStatusResult.score,
        readinessCheck: {
          confidence: ratings.executionConfidence,
          patience: ratings.patienceReserve,
          focus: ratings.marketFocus,
          score: newStatusResult.score,
          missionStatus: newStatusResult.status,
        },
        currentMindsetStatus: newStatusResult.status === 'Locked In' ? 'locked_in' : newStatusResult.status === 'On Track' ? 'on_track' : newStatusResult.status === 'Caution' ? 'caution' : 'high_risk',
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error saving readiness check-in:', error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.shieldMark}>⬟</Text>
            <Text style={styles.topBarTitle}>{t('readinessCheck.topBarTitle')}</Text>
          </View>
          <View style={styles.operatorBadge}>
            <Text style={styles.operatorBadgeText}>{t('readinessCheck.operatorBadge')}</Text>
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t('readinessCheck.eyebrow')}</Text>
          <Text style={styles.title}>{t('readinessCheck.title')}</Text>
          <Text style={styles.subtitle}>{t('readinessCheck.subtitle')}</Text>
        </View>

        <View style={styles.goldDivider} />

        <View style={styles.statusCard}>
          <View style={styles.statusCopy}>
            <Text style={styles.statusLabel}>{t('readinessCheck.status.label')}</Text>
            <View style={styles.statusHeadlineRow}>
              <View style={[styles.statusDot, !isLockedIn && styles.warningDot]} />
              <Text style={styles.statusHeadline}>{isLockedIn ? t('readinessCheck.status.lockedIn') : t('readinessCheck.status.reviewRequired')}</Text>
            </View>
            <Text style={styles.statusDescription}>
              {isLockedIn
                ? t('readinessCheck.status.lockedInDesc')
                : t('readinessCheck.status.reviewRequiredDesc')}
            </Text>
          </View>
        </View>

        <View style={styles.assessmentSection}>
          <Text style={styles.sectionLabel}>{t('readinessCheck.assessment.label')}</Text>

          {assessmentItems.map((item) => (
            <View key={item.key} style={styles.assessmentCard}>
              <View style={styles.assessmentCopy}>
                <Text style={styles.assessmentTitle}>{item.title}</Text>
                <Text style={styles.assessmentDescription}>{item.description}</Text>
              </View>

              <View style={styles.segmentedControl}>
                {levels.map((level) => {
                  const isSelected = ratings[item.key] === level;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      key={level}
                      onPress={() => updateRating(item.key, level)}
                      style={[styles.segmentButton, isSelected && styles.selectedSegmentButton]}
                    >
                      <Text style={[styles.segmentText, isSelected && styles.selectedSegmentText]}>{t(`readinessCheck.levels.${level}`)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.briefingCard}>
          <Text style={styles.briefingIcon}>!</Text>
          <View style={styles.briefingCopy}>
            <Text style={styles.briefingLabel}>{t('readinessCheck.briefing.label')}</Text>
            <Text style={styles.briefingText}>
              {t('readinessCheck.briefing.text')}
            </Text>
            <Text style={styles.briefingSource}>{t('readinessCheck.briefing.source')}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setShowEditModal(true)}
          style={({ pressed }) => [styles.summaryCard, pressed && styles.summaryCardPressed]}
        >
          <View style={styles.cornerDetail} />
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.summaryLabel}>{t('readinessCheck.summary.objective')}</Text>
              <Text style={styles.summaryObjective}>{missionData?.objective ? t(`data.objectives.${missionData.objective}.title`) : t('readinessCheck.summary.defaultObjective')}</Text>
            </View>
            <Text style={styles.fadedSymbol}>◎</Text>
          </View>

          <View style={styles.innerDivider} />

          <View>
            <Text style={styles.summaryLabel}>{t('readinessCheck.summary.threats')}</Text>
            <Text style={styles.summaryThreats}>
              {displayedThreats.length > 0 ? displayedThreats.map((threatKey: string) => t(`data.threats.${threatKey}`).toUpperCase()).join(' • ') : t('readinessCheck.summary.defaultThreats')}
            </Text>
          </View>

          <View>
            <Text style={styles.summaryLabel}>{t('readinessCheck.summary.focus')}</Text>
            <Text style={styles.summaryFocus}>{missionData?.coreFocus ? t(`data.focusAreas.${missionData.coreFocus}`) : t('readinessCheck.summary.defaultFocus')}</Text>
          </View>

          <Text style={styles.tapHint}>{t('readinessCheck.summary.tapHint')}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={handleBeginSession}
          style={({ pressed }) => [styles.startButton, (pressed || isSaving) && styles.startButtonPressed]}
        >
          <Text style={styles.startButtonText}>
            {isSaving ? t('readinessCheck.action.beginDeploying') : t('readinessCheck.action.beginSession')}
          </Text>
          <Text style={styles.startButtonArrow}>ϟ</Text>
        </Pressable>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
        transparent
        visible={showEditModal}
      >
        <Pressable
          onPress={() => setShowEditModal(false)}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalCard}>
            <View style={styles.modalAccent} />
            <Text style={styles.modalTitle}>Edit Mission?</Text>
            <Text style={styles.modalDescription}>
              This will take you back to Mission Setup to reconfigure your objective, threats, and focus.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowEditModal(false)}
                style={({ pressed }) => [styles.modalCancelButton, pressed && styles.modalButtonPressed]}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleEditMission}
                style={({ pressed }) => [styles.modalConfirmButton, pressed && styles.modalButtonPressed]}
              >
                <Text style={styles.modalConfirmText}>Edit Mission</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f1415',
    flex: 1,
  },
  content: {
    paddingBottom: 34,
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: '#0a0f10',
    borderBottomColor: 'rgba(233, 193, 118, 0.2)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 62,
    paddingHorizontal: 18,
  },
  topBarLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  shieldMark: {
    color: '#e9c176',
    fontSize: 18,
    fontWeight: '900',
    marginTop: -1,
  },
  topBarTitle: {
    color: '#e9c176',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  operatorBadge: {
    alignItems: 'center',
    backgroundColor: '#272a2c',
    borderColor: 'rgba(154, 143, 128, 0.2)',
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  operatorBadgeText: {
    color: '#d1c5b4',
    fontSize: 11,
    fontWeight: '900',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 17,
  },
  eyebrow: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#e0e3e5',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.4,
    lineHeight: 32,
  },
  subtitle: {
    color: '#d1c5b4',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  goldDivider: {
    backgroundColor: 'rgba(233, 193, 118, 0.38)',
    height: 1,
    marginBottom: 24,
    marginHorizontal: 16,
  },
  summaryCard: {
    backgroundColor: '#1f2324',
    borderColor: 'rgba(154, 143, 128, 0.18)',
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 19,
    position: 'relative',
  },
  cornerDetail: {
    backgroundColor: '#c5a059',
    height: 20,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  summaryTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: 'rgba(209, 197, 180, 0.65)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  summaryObjective: {
    color: '#f0c978',
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  fadedSymbol: {
    color: 'rgba(233, 193, 118, 0.35)',
    fontSize: 28,
    fontWeight: '900',
  },
  innerDivider: {
    backgroundColor: 'rgba(154, 143, 128, 0.12)',
    height: 1,
    marginVertical: 17,
  },
  summaryThreats: {
    color: '#ffb4ab',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 18,
    textTransform: 'uppercase',
  },
  summaryFocus: {
    color: '#e0e3e5',
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  briefingCard: {
    alignItems: 'flex-start',
    backgroundColor: '#0a192f',
    borderColor: 'rgba(233, 193, 118, 0.35)',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginHorizontal: 16,
    marginTop: 32,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  briefingIcon: {
    borderColor: '#e9c176',
    borderRadius: 18,
    borderWidth: 2,
    color: '#e9c176',
    fontSize: 14,
    fontWeight: '900',
    height: 36,
    lineHeight: 31,
    textAlign: 'center',
    width: 36,
  },
  briefingCopy: {
    flex: 1,
  },
  briefingLabel: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  briefingText: {
    color: '#e0e3e5',
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 25,
  },
  briefingSource: {
    color: 'rgba(209, 197, 180, 0.62)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: 22,
    textTransform: 'uppercase',
  },
  assessmentSection: {
    gap: 16,
    marginTop: 32,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    color: '#d1c5b4',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  assessmentCard: {
    backgroundColor: '#1f2324',
    borderColor: 'rgba(154, 143, 128, 0.14)',
    borderWidth: 1,
    gap: 15,
    paddingHorizontal: 18,
    paddingVertical: 19,
  },
  assessmentCopy: {
    gap: 4,
  },
  assessmentTitle: {
    color: '#e0e3e5',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  assessmentDescription: {
    color: '#d1c5b4',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    lineHeight: 17,
    textTransform: 'uppercase',
  },
  segmentedControl: {
    backgroundColor: '#15191a',
    borderColor: 'rgba(154, 143, 128, 0.24)',
    borderWidth: 1,
    flexDirection: 'row',
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
  },
  selectedSegmentButton: {
    backgroundColor: '#f0c978',
  },
  segmentText: {
    color: '#d1c5b4',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  selectedSegmentText: {
    color: '#412d00',
  },
  statusCard: {
    backgroundColor: '#0b0f10',
    borderColor: 'rgba(233, 193, 118, 0.55)',
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 0,
    minHeight: 150,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  statusCopy: {
    flex: 1,
  },
  statusLabel: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  statusHeadlineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  statusDot: {
    backgroundColor: '#10b981',
    borderRadius: 7,
    height: 14,
    width: 14,
  },
  warningDot: {
    backgroundColor: '#ff6b5f',
  },
  statusHeadline: {
    color: '#e0e3e5',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  statusDescription: {
    color: '#d1c5b4',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  startButton: {
    alignItems: 'center',
    backgroundColor: '#f0c978',
    flexDirection: 'row',
    gap: 18,
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 36,
    minHeight: 56,
  },
  startButtonPressed: {
    opacity: 0.82,
  },
  startButtonText: {
    color: '#412d00',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  startButtonArrow: {
    color: '#412d00',
    fontSize: 22,
    fontWeight: '900',
  },
  editMissionLink: {
    marginTop: 18,
  },
  editMissionText: {
    color: '#e9c176',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  summaryCardPressed: {
    opacity: 0.85,
  },
  tapHint: {
    color: 'rgba(233, 193, 118, 0.5)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modalCard: {
    backgroundColor: '#1a1e1f',
    borderColor: 'rgba(233, 193, 118, 0.4)',
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 28,
    width: '100%',
  },
  modalAccent: {
    backgroundColor: '#e9c176',
    height: 3,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  modalTitle: {
    color: '#e0e3e5',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  modalDescription: {
    color: '#d1c5b4',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 26,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    alignItems: 'center',
    borderColor: 'rgba(154, 143, 128, 0.3)',
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  modalConfirmButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  modalButtonPressed: {
    opacity: 0.75,
  },
  modalCancelText: {
    color: '#d1c5b4',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  modalConfirmText: {
    color: '#1a1e1f',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
