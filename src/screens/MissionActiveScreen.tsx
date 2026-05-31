import { useNavigation } from '@react-navigation/native';
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { MissionStackNavigationProp } from '../../App';
import {
  getCurrentSession,
  getSessionProgress,
  getTimeRemaining,
  SESSION_LABELS,
  TradingSession,
} from '../logic/sessionEngine';
import { firebaseAuth, firestore } from '../services/firebase';

type ReadinessLevel = 'Low' | 'Medium' | 'High';
type AssessmentKey = 'executionConfidence' | 'patienceReserve' | 'marketFocus';

function CompactMindsetModule({ missionId }: { missionId: string }) {
  const { t } = useTranslation('mission');
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [ratings, setRatings] = useState<Record<AssessmentKey, ReadinessLevel>>({
    executionConfidence: 'High',
    patienceReserve: 'Medium',
    marketFocus: 'High',
  });

  const levels: ReadinessLevel[] = ['Low', 'Medium', 'High'];
  
  const assessmentItems: Array<{ key: AssessmentKey; title: string }> = [
    { key: 'executionConfidence', title: 'Confidence' },
    { key: 'patienceReserve', title: 'Patience' },
    { key: 'marketFocus', title: 'Focus' },
  ];

  const handleUpdate = async () => {
    if (!firebaseAuth.currentUser || !missionId) return;
    setIsSaving(true);
    try {
      await addDoc(collection(firestore, 'mindset_checkins'), {
        missionId,
        userId: firebaseAuth.currentUser.uid,
        type: 'mid_session',
        confidence: ratings.executionConfidence,
        patience: ratings.patienceReserve,
        focus: ratings.marketFocus,
        createdAt: serverTimestamp(),
      });
      // Collapse after successful save
      setIsExpanded(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isExpanded) {
    return (
      <Pressable onPress={() => setIsExpanded(true)} style={mindsetStyles.toggleBtn}>
        <Text style={mindsetStyles.toggleBtnText}>+ UPDATE MINDSET</Text>
      </Pressable>
    );
  }

  return (
    <View style={mindsetStyles.container}>
      <View style={mindsetStyles.accentLine} />
      <View style={mindsetStyles.headerRow}>
        <Text style={mindsetStyles.label}>{t('missionActive.mindsetUpdateLabel')}</Text>
        <Pressable onPress={() => setIsExpanded(false)} style={mindsetStyles.closeBtn}>
          <Text style={mindsetStyles.closeBtnText}>✕</Text>
        </Pressable>
      </View>
      {assessmentItems.map(item => (
        <View key={item.key} style={mindsetStyles.row}>
          <Text style={mindsetStyles.title}>{item.title}</Text>
          <View style={mindsetStyles.segments}>
            {levels.map(level => {
              const isSelected = ratings[item.key] === level;
              return (
                <Pressable
                  key={level}
                  onPress={() => setRatings(prev => ({ ...prev, [item.key]: level }))}
                  style={[mindsetStyles.segment, isSelected && mindsetStyles.segmentSelected]}
                >
                  <Text style={[mindsetStyles.segmentText, isSelected && mindsetStyles.segmentTextSelected]}>
                    {t(`readinessCheck.levels.${level}`)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      ))}
      <Pressable onPress={handleUpdate} disabled={isSaving} style={mindsetStyles.saveBtn}>
        <Text style={mindsetStyles.saveBtnText}>{isSaving ? '...' : t('missionActive.updateMindsetBtn')}</Text>
      </Pressable>
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
            <Text style={timerStyles.lockIcon}>🔒</Text>
          </View>
          <View style={timerStyles.textColumn}>
            <Text style={timerStyles.protocolText}>{t('missionActive.protocolActive')}</Text>
            <Text style={timerStyles.lockText}>
              {focusKey ? t(`data.focusAreas.${focusKey}`).toUpperCase() : ''} {t('missionActive.lockSuffix')}
            </Text>
            <Text style={timerStyles.sessionText}>
              {SESSION_LABELS[sessionKey].toUpperCase()} MONITORING
            </Text>
          </View>
        </View>

        <View style={timerStyles.timeBlock}>
          <Text style={timerStyles.timeText}>{timeLeft}</Text>
          <Text style={timerStyles.untilClose}>{t('missionActive.untilClose')}</Text>
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
  const [missionData, setMissionData] = useState<any>(null);
  const [isLive, setIsLive] = useState(false);
  const [currentSession, setCurrentSession] = useState(getCurrentSession());

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
      where('status', '==', 'active'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setMissionData({ id: docSnap.id, ...docSnap.data() });
      } else {
        setMissionData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const objectiveKey = missionData?.objective;
  const threats = missionData?.threats || [];
  const focusKey = missionData?.coreFocus;

  // Placeholder timestamp
  const timestamp = 'MAY 29, 2026 | 08:30 EST';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.eyebrow}>{t('missionActive.liveFeed')}</Text>
          </View>
          <Text style={styles.title}>{t('missionActive.briefingTitle')}</Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>

        <View style={styles.objectiveCard}>
          <View style={styles.objectiveTopRow}>
            <Text style={styles.objectiveEyebrow}>{t('missionActive.primaryObjective')}</Text>
            <Text style={styles.targetIcon}>◎</Text>
          </View>
          <Text style={styles.objectiveText}>
            {objectiveKey ? t(`data.objectives.${objectiveKey}.title`).toUpperCase() : '...'}
          </Text>
          <View style={styles.goldDivider} />
          <View style={styles.objectiveBottomRow}>
            <Text style={styles.priorityText}>{t('missionActive.priorityMax')}</Text>
            <Text style={styles.stateText}>{t('missionActive.operationalStateReady')}</Text>
          </View>
        </View>

        <View style={styles.splitRow}>
          <View style={styles.threatsCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.threatIcon}>⚠</Text>
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
              <Text style={styles.focusIcon}>⍟</Text>
              <Text style={styles.focusLabel}>{t('missionActive.coreFocusLabel')}</Text>
            </View>
            <Text style={styles.focusText}>
              {focusKey ? t(`data.focusAreas.${focusKey}`).toUpperCase() : '...'}
            </Text>
            <Text style={styles.focusSubtext}>{t('missionActive.mindsetLock')}</Text>
          </View>
        </View>

        <View style={styles.quoteCard}>
          <Text style={styles.quoteMark}>❞</Text>
          <Text style={styles.quoteText}>{t('missionActive.quote')}</Text>
        </View>

        <View style={styles.footer}>
          {!isLive ? (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsLive(true)}
                style={({ pressed }) => [
                  styles.startButton,
                  pressed && styles.startButtonPressed,
                ]}
              >
                <Text style={styles.startButtonText}>
                  {t('missionActive.startTradingDay')}
                </Text>
                <Text style={styles.startLightning}>ϟ</Text>
              </Pressable>
              <Text style={styles.encryptedText}>{t('missionActive.encryptedLink')}</Text>
            </>
          ) : (
            <View style={{ width: '100%' }}>
              <LiveTimerModule 
                focusKey={focusKey} 
                sessionKey={currentSession.session || 'new_york'} 
              />
              <CompactMindsetModule missionId={missionData?.id} />
              <SessionNotesModule missionId={missionData?.id} />
              <Pressable
                accessibilityRole="button"
                onPress={() => console.log('Mission Complete')}
                style={({ pressed }) => [
                  styles.endButton,
                  pressed && styles.startButtonPressed,
                ]}
              >
                <Text style={styles.startButtonText}>
                  {t('missionActive.missionComplete')}
                </Text>
                <Text style={styles.startLightning}>✓</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const timerStyles = StyleSheet.create({
  container: {
    backgroundColor: '#14181a',
    borderColor: 'rgba(233, 193, 118, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
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
    flexDirection: 'row',
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
    justifyContent: 'center',
  },
  protocolText: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  lockText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sessionText: {
    color: '#8a8f93',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
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
    justifyContent: 'center',
  },
  timeText: {
    color: '#e9c176',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  untilClose: {
    color: '#8a8f93',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#101415',
    flex: 1,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityText: {
    color: '#e9c176',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  stateText: {
    color: '#8a8f93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
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

const mindsetStyles = StyleSheet.create({
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
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  segments: {
    backgroundColor: '#0a0f10',
    borderColor: '#2a3135',
    borderWidth: 1,
    flexDirection: 'row',
    padding: 2,
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  segmentSelected: {
    backgroundColor: '#e9c176',
  },
  segmentText: {
    color: '#8a8f93',
    fontSize: 10,
    fontWeight: '800',
  },
  segmentTextSelected: {
    color: '#101415',
  },
  saveBtn: {
    alignItems: 'center',
    borderColor: '#e9c176',
    borderWidth: 1,
    marginTop: 8,
    paddingVertical: 12,
  },
  saveBtnText: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
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
