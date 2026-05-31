import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import { MissionStackNavigationProp } from '../../App';
import { firebaseAuth, firestore } from '../services/firebase';

type ReadinessLevel = 'Low' | 'Medium' | 'High';

type AssessmentKey = 'executionConfidence' | 'patienceReserve' | 'marketFocus';

type AssessmentItem = {
  key: AssessmentKey;
  title: string;
  description: string;
};

const assessmentItems: AssessmentItem[] = [
  {
    key: 'executionConfidence',
    title: 'Execution Confidence',
    description: 'Belief in strategy execution without hesitation.',
  },
  {
    key: 'patienceReserve',
    title: 'Patience Reserve',
    description: 'Ability to wait for high-probability setups.',
  },
  {
    key: 'marketFocus',
    title: 'Market Focus',
    description: 'Mental clarity and absence of external distractions.',
  },
];

const levels: ReadinessLevel[] = ['Low', 'Medium', 'High'];

export function ReadinessCheckScreen() {
  const navigation = useNavigation<MissionStackNavigationProp>();
  const [ratings, setRatings] = useState<Record<AssessmentKey, ReadinessLevel>>({
    executionConfidence: 'High',
    patienceReserve: 'Medium',
    marketFocus: 'High',
  });

  const [missionData, setMissionData] = useState<any>(null);

  useEffect(() => {
    const user = firebaseAuth.currentUser;
    if (!user) return;

    const q = query(
      collection(firestore, 'missions'),
      where('userId', '==', user.uid),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setMissionData(snapshot.docs[0].data());
      } else {
        setMissionData(null);
      }
    });

    return () => unsubscribe();
  }, []);

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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.shieldMark}>⬟</Text>
            <Text style={styles.topBarTitle}>MISSION READINESS</Text>
          </View>
          <View style={styles.operatorBadge}>
            <Text style={styles.operatorBadgeText}>ID</Text>
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>PRE-SESSION ANALYSIS</Text>
          <Text style={styles.title}>MISSION READINESS</Text>
          <Text style={styles.subtitle}>Assess your operational state before entering the market.</Text>
        </View>

        <View style={styles.goldDivider} />

        <View style={styles.statusCard}>
          <View style={styles.statusCopy}>
            <Text style={styles.statusLabel}>Mission Status</Text>
            <View style={styles.statusHeadlineRow}>
              <View style={[styles.statusDot, !isLockedIn && styles.warningDot]} />
              <Text style={styles.statusHeadline}>{isLockedIn ? 'Locked In' : 'Review Required'}</Text>
            </View>
            <Text style={styles.statusDescription}>
              {isLockedIn
                ? 'Operational state verified. Readiness standards met for full deployment.'
                : 'One or more readiness standards need attention before deployment.'}
            </Text>
          </View>
        </View>

        <View style={styles.assessmentSection}>
          <Text style={styles.sectionLabel}>Readiness Assessment</Text>

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
                      <Text style={[styles.segmentText, isSelected && styles.selectedSegmentText]}>{level}</Text>
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
            <Text style={styles.briefingLabel}>Operator Briefing</Text>
            <Text style={styles.briefingText}>
              "The market rewards patience. Protect capital and wait for confirmation. Precision is your primary edge."
            </Text>
            <Text style={styles.briefingSource}>Source: Operational Command</Text>
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
              <Text style={styles.summaryLabel}>Objective</Text>
              <Text style={styles.summaryObjective}>{missionData?.objective || 'Protect Capital'}</Text>
            </View>
            <Text style={styles.fadedSymbol}>◎</Text>
          </View>

          <View style={styles.innerDivider} />

          <View>
            <Text style={styles.summaryLabel}>Threats</Text>
            <Text style={styles.summaryThreats}>
              {missionData?.threats?.join(' • ').toUpperCase() || 'FOMO • OVERTRADING'}
            </Text>
          </View>

          <View>
            <Text style={styles.summaryLabel}>Core Focus</Text>
            <Text style={styles.summaryFocus}>{missionData?.coreFocus || 'Patience'}</Text>
          </View>

          <Text style={styles.tapHint}>Tap to edit mission</Text>
        </Pressable>

        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}>
          <Text style={styles.startButtonText}>Begin Session</Text>
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
                onPress={() => {
                  setShowEditModal(false);
                  navigation.navigate('MissionSetup');
                }}
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
