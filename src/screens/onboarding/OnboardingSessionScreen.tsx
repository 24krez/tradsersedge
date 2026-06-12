import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';

import { OnboardingNavigationProp } from './OnboardingNavigator';

type SessionType = 'new_york' | 'london' | 'asia';

const SESSIONS = [
  {
    id: 'new_york' as SessionType,
    title: 'New York',
    subtitle: '08:00—17:00 EST • HIGH VOLATILITY',
    icon: 'NY',
    startTime: '08:00',
    endTime: '17:00',
  },
  {
    id: 'london' as SessionType,
    title: 'London',
    subtitle: '03:00—12:00 EST • LIQUIDITY PEAK',
    icon: 'LD',
    startTime: '03:00',
    endTime: '12:00',
  },
  {
    id: 'asia' as SessionType,
    title: 'Asia',
    subtitle: '19:00—04:00 EST • OVERNIGHT SESSION',
    icon: 'AS',
    startTime: '19:00',
    endTime: '04:00',
  },
];

export function OnboardingSessionScreen() {
  const navigation = useNavigation<OnboardingNavigationProp>();
  const [selectedSessionId, setSelectedSessionId] = useState<SessionType>('new_york');

  function handleContinue() {
    const selectedSession = SESSIONS.find((s) => s.id === selectedSessionId);
    if (!selectedSession) return;

    navigation.navigate('OnboardingThreat', {
      tradingSession: selectedSession.id,
      tradingStartTime: selectedSession.startTime,
      tradingEndTime: selectedSession.endTime,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepText}>STEP 2 OF 6</Text>
        </View>
        
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Select Active Session</Text>
          <Text style={styles.bodyText}>
            Choose the market session you usually trade. TraderEdge will use this to time your mission reminders and debrief flow.
          </Text>

          <View style={styles.sessionsContainer}>
            {SESSIONS.map((session) => {
              const isSelected = selectedSessionId === session.id;
              return (
                <Pressable
                  key={session.id}
                  onPress={() => setSelectedSessionId(session.id)}
                  style={[styles.sessionCard, isSelected && styles.sessionCardSelected]}
                >
                  {isSelected && <View style={styles.selectedRail} />}
                  <View style={styles.iconContainer}>
                    <Text style={styles.iconText}>{session.icon}</Text>
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionSubtitle}>{session.subtitle}</Text>
                  </View>
                  <View style={[styles.toggleTrack, isSelected && styles.toggleTrackActive]}>
                    <View style={[styles.toggleKnob, isSelected && styles.toggleKnobActive]} />
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.mindsetBox}>
            <Text style={styles.mindsetLabel}>SESSION MINDSET</Text>
            <Text style={styles.mindsetText}>
              Active sessions define the parameters of your cognitive load. Focus on your primary session for optimal decision-making precision.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>CONTINUE</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#050707',
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 16,
  },
  stepHeader: {
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  stepText: {
    color: '#e9c176',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 0,
    paddingBottom: 40,
  },
  title: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  bodyText: {
    color: '#d1c5b4',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 40,
  },
  sessionsContainer: {
    gap: 16,
    marginBottom: 40,
  },
  sessionCard: {
    alignItems: 'center',
    backgroundColor: '#0a1010',
    borderColor: '#151d1d',
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 80,
    paddingHorizontal: 16,
    paddingVertical: 16,
    position: 'relative',
  },
  sessionCardSelected: {
    backgroundColor: '#071a33',
    borderColor: '#0f2b55',
  },
  selectedRail: {
    backgroundColor: '#e9c176',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: '#111818',
    height: 48,
    justifyContent: 'center',
    marginRight: 16,
    width: 48,
  },
  iconText: {
    color: '#e9c176',
    fontSize: 16,
    fontWeight: '900',
  },
  sessionInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  sessionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  sessionSubtitle: {
    color: '#8a8f93',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  toggleTrack: {
    backgroundColor: '#151d1d',
    borderColor: '#202827',
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    padding: 2,
    width: 40,
  },
  toggleTrackActive: {
    borderColor: '#e9c176',
  },
  toggleKnob: {
    backgroundColor: '#4e4639',
    height: 14,
    width: 14,
  },
  toggleKnobActive: {
    backgroundColor: '#e9c176',
    transform: [{ translateX: 20 }],
  },
  mindsetBox: {
    backgroundColor: '#171c1c',
    borderLeftColor: '#e9c176',
    borderLeftWidth: 4,
    padding: 20,
  },
  mindsetLabel: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  mindsetText: {
    color: '#d1c5b4',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    borderTopColor: '#151d1d',
    borderTopWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    justifyContent: 'center',
    minHeight: 56,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: '#101415',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
