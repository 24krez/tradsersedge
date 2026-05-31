import { useNavigation } from '@react-navigation/native';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MissionStackNavigationProp } from '../../App';
import { firebaseAuth, firestore } from '../services/firebase';

function LiveTimerModule({ focusKey }: { focusKey: string }) {
  const { t } = useTranslation('mission');
  // We'll mock the countdown for now as static or simple ticking
  const [timeLeft, setTimeLeft] = useState('02:14:10');

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
            <Text style={timerStyles.sessionText}>{t('missionActive.nySession')}</Text>
          </View>
        </View>

        <View style={timerStyles.timeBlock}>
          <Text style={timerStyles.timeText}>{timeLeft}</Text>
          <Text style={timerStyles.untilClose}>{t('missionActive.untilClose')}</Text>
        </View>
      </View>

      <View style={timerStyles.progressTrack}>
        <View style={timerStyles.progressFill} />
      </View>
    </View>
  );
}

export function MissionActiveScreen() {
  const navigation = useNavigation<MissionStackNavigationProp>();
  const { t } = useTranslation('mission');
  const [missionData, setMissionData] = useState<any>(null);
  const [isLive, setIsLive] = useState(false);

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
                style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
              >
                <Text style={styles.startButtonText}>{t('missionActive.startTradingDay')}</Text>
                <Text style={styles.startLightning}>ϟ</Text>
              </Pressable>
              <Text style={styles.encryptedText}>{t('missionActive.encryptedLink')}</Text>
            </>
          ) : (
            <LiveTimerModule focusKey={focusKey} />
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
    padding: 24,
    paddingBottom: 48,
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
  startButtonPressed: {
    opacity: 0.85,
  },
  startButtonText: {
    color: '#101415',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
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
