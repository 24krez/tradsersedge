import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { MissionStackNavigationProp } from '../../App';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../services/firebase';

type MissionData = {
  id: string;
  objective: string;
  coreFocus: string;
  threats: string[];
  status: string;
  createdAt: any;
};

const EMOTIONS = [
  { id: 'calm', icon: '😌', label: 'Calm' },
  { id: 'confident', icon: '🙂', label: 'Confident' },
  { id: 'neutral', icon: '😐', label: 'Neutral' },
  { id: 'frustrated', icon: '🤬', label: 'Frust.' },
  { id: 'impulsive', icon: '😤', label: 'Impuls.' },
  { id: 'stress', icon: '😰', label: 'Stress' },
] as const;

const GRADES = [
  { id: 'elite', label: 'ELITE' },
  { id: 'strong', label: 'STRONG' },
  { id: 'average', label: 'AVERAGE' },
  { id: 'needs_work', label: 'NEEDS WORK' },
] as const;

const NO_TRADE_REASONS = [
  'NO VALID SETUPS',
  'OBSERVATION DAY',
  'MARKET CONDITIONS POOR',
  'PERSONAL DISCIPLINE CHOICE',
  'TIME CONSTRAINTS',
  'OTHER'
];

type PillValue = 'yes' | 'mostly' | 'no' | null;

export function MissionDebriefScreen() {
  const navigation = useNavigation<MissionStackNavigationProp>();
  const { t } = useTranslation('mission');
  const { user } = useAuth();
  const [missionData, setMissionData] = useState<MissionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [showDropdown, setShowDropdown] = useState(false);
  const [traded, setTraded] = useState<boolean | null>(null); // true = YES, false = NO TRADE
  
  // Execution Integrity (5 questions)
  const [followedPlan, setFollowedPlan] = useState<PillValue>(null);
  const [respectedStop, setRespectedStop] = useState<PillValue>(null);
  const [avoidedFomo, setAvoidedFomo] = useState<PillValue>(null);
  const [avoidedRevenge, setAvoidedRevenge] = useState<PillValue>(null);
  const [stoppedInTime, setStoppedInTime] = useState<PillValue>(null);

  const [whyNotTradeReason, setWhyNotTradeReason] = useState<string | null>(null);
  const [pulseScore, setPulseScore] = useState<number>(50); // 0-100 placeholder
  const [emotion, setEmotion] = useState<typeof EMOTIONS[number]['id'] | null>(null);
  const [notes, setNotes] = useState('');
  const [disciplineGrade, setDisciplineGrade] = useState<typeof GRADES[number]['id'] | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
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
        setMissionData({ id: docSnap.id, ...docSnap.data() } as MissionData);
      } else {
        setMissionData(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !missionData || isSubmitting) return;
    
    // Validate minimum required fields
    if (traded === null || !emotion) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'mission_debriefs'), {
        userId: user.uid,
        missionId: missionData.id,
        date: new Date().toISOString().split('T')[0],
        traded,
        executionIntegrity: {
          followedPlan,
          respectedStop,
          avoidedFomo,
          avoidedRevenge,
          stoppedInTime
        },
        whyNotTradeReason: traded === false ? whyNotTradeReason : null,
        pulseScore,
        emotion,
        notes,
        disciplineGrade,
        createdAt: serverTimestamp(),
      });
      
      // Navigate back to Active Mission so they can see the completed archive block
      navigation.replace('MissionActive');
    } catch (e) {
      console.error('Error saving debrief:', e);
      setIsSubmitting(false);
    }
  };

  const renderTriPill = (value: PillValue, setter: (val: PillValue) => void) => (
    <View style={styles.triPillContainer}>
      <Pressable style={[styles.triPill, value === 'yes' && styles.triPillActive]} onPress={() => setter('yes')}>
        <Text style={[styles.triPillText, value === 'yes' && styles.triPillTextActive]}>YES</Text>
      </Pressable>
      <Pressable style={[styles.triPill, value === 'mostly' && styles.triPillActive]} onPress={() => setter('mostly')}>
        <Text style={[styles.triPillText, value === 'mostly' && styles.triPillTextActive]}>MOSTLY</Text>
      </Pressable>
      <Pressable style={[styles.triPill, value === 'no' && styles.triPillActive]} onPress={() => setter('no')}>
        <Text style={[styles.triPillText, value === 'no' && styles.triPillTextActive]}>NO</Text>
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
            <View style={styles.headerDivider} />
          </View>

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

          <Text style={styles.sectionHeader}>EXECUTION INTEGRITY</Text>

          {/* Gateway Question (Pill Layout) */}
          <View style={styles.card}>
            <Text style={styles.questionTextBold}>Operational Check: Did you trade today?</Text>
            <View style={styles.pillContainer}>
              <Pressable
                style={[styles.gatewayPill, traded === true && styles.gatewayPillActive]}
                onPress={() => setTraded(true)}
              >
                <Text style={[styles.gatewayPillText, traded === true && styles.gatewayPillTextActive]}>YES, TRADED</Text>
              </Pressable>
              <Pressable
                style={[styles.gatewayPill, traded === false && styles.gatewayPillActive]}
                onPress={() => setTraded(false)}
              >
                <Text style={[styles.gatewayPillText, traded === false && styles.gatewayPillTextActive]}>NO TRADE (OBSERVATION)</Text>
              </Pressable>
            </View>
          </View>

          {/* Execution Questions (Always visible in UI mock, but we'll show them once gateway is picked) */}
          {traded !== null && (
            <>
              <View style={styles.card}>
                <Text style={styles.questionTextBold}>DID YOU FOLLOW YOUR TRADING PLAN?</Text>
                {renderTriPill(followedPlan, setFollowedPlan)}
              </View>
              <View style={styles.card}>
                <Text style={styles.questionTextBold}>DID YOU RESPECT YOUR STOP LOSS?</Text>
                {renderTriPill(respectedStop, setRespectedStop)}
              </View>
              <View style={styles.card}>
                <Text style={styles.questionTextBold}>DID YOU AVOID FOMO?</Text>
                {renderTriPill(avoidedFomo, setAvoidedFomo)}
              </View>
              <View style={styles.card}>
                <Text style={styles.questionTextBold}>DID YOU AVOID REVENGE TRADING?</Text>
                {renderTriPill(avoidedRevenge, setAvoidedRevenge)}
              </View>
              <View style={styles.card}>
                <Text style={styles.questionTextBold}>DID YOU STOP WHEN YOU SHOULD HAVE?</Text>
                {renderTriPill(stoppedInTime, setStoppedInTime)}
              </View>

              {/* Why did you not trade grid (Only if NO TRADE) */}
              {traded === false && (
                <View style={styles.card}>
                  <Text style={styles.questionTextBold}>Why did you not trade?</Text>
                  <View style={styles.grid2Col}>
                    {NO_TRADE_REASONS.map(reason => (
                      <Pressable 
                        key={reason} 
                        style={[styles.gridButton, whyNotTradeReason === reason && styles.gridButtonActive]}
                        onPress={() => setWhyNotTradeReason(reason)}
                      >
                        <Text style={[styles.gridButtonText, whyNotTradeReason === reason && styles.gridButtonTextActive]}>
                          {reason}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Psychological State */}
              <View style={styles.card}>
                <View style={styles.pulseHeader}>
                  <Text style={styles.questionTextBold}>Psychological State</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.dynamicPulseLabel}>DYNAMIC PULSE</Text>
                    <Text style={styles.dynamicPulseValue}>FOCUSED</Text>
                  </View>
                </View>
                
                {/* Custom Slider Mock */}
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderThumb, { left: '60%' }]} />
                </View>
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabelText}>FRANTIC</Text>
                  <Text style={styles.sliderLabelText}>ELITE</Text>
                </View>

                <Text style={styles.todayIFeltLabel}>TODAY I FELT</Text>
                <View style={styles.emojiGrid}>
                  {EMOTIONS.map(e => (
                    <Pressable 
                      key={e.id}
                      style={[styles.emojiButton, emotion === e.id && styles.emojiButtonActive]}
                      onPress={() => setEmotion(e.id)}
                    >
                      <Text style={[styles.emojiButtonText, emotion === e.id && styles.emojiButtonTextActive]}>
                        {e.icon} {e.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Operational Intelligence */}
              <View style={styles.card}>
                <Text style={styles.questionTextBold}>OPERATIONAL INTELLIGENCE / LESSONS</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Deconstruct your qualitative findings here..."
                  placeholderTextColor="#5a5f63"
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              {/* Mission Summary Display */}
              <View style={styles.missionSummaryCard}>
                <View style={styles.missionSummaryRow}>
                  <View style={styles.goldDot} />
                  <Text style={styles.missionSummaryTitle}>MISSION SUMMARY</Text>
                </View>
                <View style={styles.summaryItemRow}><Text style={styles.summaryItemLabel}>SESSION LENGTH</Text><Text style={styles.summaryItemValue}>--:--</Text></View>
                <View style={styles.summaryItemRow}><Text style={styles.summaryItemLabel}>MISSION START</Text><Text style={styles.summaryItemValue}>--:--</Text></View>
                <View style={styles.summaryItemRow}><Text style={styles.summaryItemLabel}>OBJECTIVE</Text><Text style={styles.summaryItemValue}>{t(`data.objectives.${missionData.objective}.title`, missionData.objective.replace(/_/g, ' ')).toUpperCase()}</Text></View>
                <View style={styles.summaryItemRow}><Text style={styles.summaryItemLabel}>CORE FOCUS</Text><Text style={[styles.summaryItemValue, {color: '#e9c176'}]}>{t(`data.focusAreas.${missionData.coreFocus}`, missionData.coreFocus.replace(/_/g, ' ')).toUpperCase()}</Text></View>
                <View style={[styles.summaryItemRow, { marginTop: 12 }]}>
                  <Text style={styles.summaryItemLabel}>MISSION STATUS</Text>
                  <View style={styles.statusChip}>
                    <Text style={styles.statusChipText}>{traded ? 'TRADED' : 'NO TRADE DAY'}</Text>
                  </View>
                </View>

                {/* Discipline Grading */}
                <Text style={styles.disciplineGradingLabel}>DISCIPLINE GRADING</Text>
                <View style={styles.grid2Col}>
                  {GRADES.map(grade => (
                    <Pressable 
                      key={grade.id} 
                      style={[styles.gradeButton, disciplineGrade === grade.id && styles.gradeButtonActive]}
                      onPress={() => setDisciplineGrade(grade.id)}
                    >
                      <Text style={[styles.gradeButtonText, disciplineGrade === grade.id && styles.gradeButtonTextActive]}>
                        {grade.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Archive Ready Box */}
                <View style={styles.archiveBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={styles.archiveIcon}>📁</Text>
                    <Text style={styles.archiveBoxTitle}>MISSION READY FOR ARCHIVE</Text>
                  </View>
                  <Text style={styles.archiveBullet}>• DISCIPLINE SCORE INTEGRATION</Text>
                  <Text style={styles.archiveBullet}>• PROGRESS ANALYTICS SYNC</Text>
                  <Text style={styles.archiveBullet}>• VAULT INTELLIGENCE UPDATE</Text>
                  <Text style={styles.archiveBullet}>• BEHAVIORAL REPORT GENERATION</Text>
                </View>
                
                {/* Complete Button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.submitButton,
                    (!emotion) && styles.submitButtonDisabled, // Basic validation
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={handleSubmit}
                  disabled={!emotion || isSubmitting}
                >
                  <Text style={styles.submitButtonText}>
                    {isSubmitting ? 'SAVING...' : 'COMPLETE DEBRIEF'}
                  </Text>
                </Pressable>
              </View>
            </>
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
  headerDivider: { height: 2, backgroundColor: '#e9c176', width: '100%', marginTop: 12 },
  
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
  
  pillContainer: { flexDirection: 'row', gap: 12 },
  gatewayPill: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 4, borderWidth: 1, borderColor: '#4e4639', backgroundColor: '#101415' },
  gatewayPillActive: { backgroundColor: '#e9c176', borderColor: '#e9c176' },
  gatewayPillText: { color: '#8a8f93', fontFamily: 'Montserrat', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  gatewayPillTextActive: { color: '#101415' },

  triPillContainer: { flexDirection: 'row', gap: 0 },
  triPill: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2a3135', backgroundColor: '#101415' },
  triPillActive: { backgroundColor: '#1a1e1f', borderColor: '#4e4639' },
  triPillText: { color: '#5a5f63', fontFamily: 'Montserrat', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  triPillTextActive: { color: '#e0e3e5' },

  grid2Col: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  gridButton: { width: '48%', paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2a3135', backgroundColor: '#101415' },
  gridButtonActive: { borderColor: '#4e4639', backgroundColor: '#1a1e1f' },
  gridButtonText: { color: '#5a5f63', fontFamily: 'Montserrat', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  gridButtonTextActive: { color: '#e0e3e5' },

  pulseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  dynamicPulseLabel: { color: '#5a5f63', fontFamily: 'Montserrat', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  dynamicPulseValue: { color: '#e9c176', fontFamily: 'Montserrat', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  
  sliderTrack: { height: 4, backgroundColor: '#2a3135', borderRadius: 2, marginBottom: 8, position: 'relative' },
  sliderThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#e9c176', position: 'absolute', top: -6 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
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

  disciplineGradingLabel: { color: '#e0e3e5', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 32, marginBottom: 16, textAlign: 'center' },
  gradeButton: { width: '48%', paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2a3135', backgroundColor: '#101415' },
  gradeButtonActive: { borderColor: '#4e4639', backgroundColor: '#1a1e1f' },
  gradeButtonText: { color: '#e0e3e5', fontFamily: 'Montserrat', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  gradeButtonTextActive: { color: '#e9c176' },

  archiveBox: { backgroundColor: '#101415', padding: 20, marginTop: 32, marginBottom: 24 },
  archiveIcon: { fontSize: 16, marginRight: 8 },
  archiveBoxTitle: { color: '#e9c176', fontFamily: 'Montserrat', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  archiveBullet: { color: '#8a8f93', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },

  submitButton: { backgroundColor: '#e9c176', paddingVertical: 18, alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#4e4639' },
  submitButtonText: { color: '#412d00', fontFamily: 'Montserrat', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
});
