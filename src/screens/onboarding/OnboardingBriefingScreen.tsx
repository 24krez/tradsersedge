import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, SafeAreaView, StyleSheet, Text, View, Pressable } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { RouteProp, useRoute } from '@react-navigation/native';

import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile } from '../../services/userProfile';
import { OnboardingStackParamList } from './OnboardingNavigator';

export function OnboardingBriefingScreen() {
  const { user } = useAuth();
  const route = useRoute<RouteProp<OnboardingStackParamList, 'OnboardingBriefing'>>();
  const [isInitializing, setIsInitializing] = useState(false);

  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate to a massive number to avoid loop reset stutter
    Animated.timing(rotation, {
      toValue: 10000,
      duration: 3000 * 10000, // 3 seconds per 360-degree revolution
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.2,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [rotation, pulse]);

  const spin = rotation.interpolate({
    inputRange: [0, 10000],
    outputRange: ['0deg', '3600000deg'],
  });

  async function handleInitialize() {
    if (!user) return;
    setIsInitializing(true);
    try {
      const { tradingStartTime, tradingEndTime, callSign, threat, focus } = route.params;

      await updateUserProfile(user.uid, {
        onboardingStatus: 'completed',
        tradingStartTime,
        tradingEndTime,
        callsign: callSign,
        missionPreferences: {
          objective: 'protectCapital', // Default safe objective
          threats: [threat],
          coreFocus: focus,
        },
      });
      // The auth context will detect the change and App.tsx will switch navigators.
    } catch (error) {
      console.error('Failed to complete onboarding', error);
      setIsInitializing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepText}>STEP 6 OF 6</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Mission Briefing</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>STATUS: Profile Calibrated</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.targetIconContainer}>
            <View style={styles.targetOuterRing}>
              <View style={styles.targetInnerRing}>
                <Animated.View style={[styles.targetBullseye, { transform: [{ scale: pulse }] }]} />
              </View>
            </View>
            
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin }] }]}>
              <Svg height="120" width="120" viewBox="0 0 120 120">
                <Defs>
                  <LinearGradient id="radarSweep" x1="50%" y1="0%" x2="0%" y2="50%">
                    <Stop offset="0%" stopColor="#e9c176" stopOpacity="0.4" />
                    <Stop offset="80%" stopColor="#e9c176" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Path d="M60,60 L60,0 A60,60 0 0,0 0,60 Z" fill="url(#radarSweep)" />
                <Path d="M60,60 L60,0" stroke="#e9c176" strokeWidth="1.5" strokeOpacity="0.8" />
              </Svg>
            </Animated.View>

            <View style={styles.crosshairVertical} />
            <View style={styles.crosshairHorizontal} />
          </View>

          <Text style={styles.headline}>Your first mission is ready to set up.</Text>
          <Text style={styles.bodyText}>
            Define your objective, confirm your threat, and lock in your focus before the trading day begins.
          </Text>

          <View style={styles.ctaContainer}>
            <Pressable
              accessibilityRole="button"
              disabled={isInitializing}
              onPress={handleInitialize}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || isInitializing) && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {isInitializing ? 'INITIALIZING...' : 'INITIALIZE MISSION SETUP'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footerInfoBox}>
          <View style={styles.footerRail} />
          <Text style={styles.footerLabel}>QUICK INTEL // OPERATIONAL FACT</Text>
          <Text style={styles.footerText}>
            "Strategy dictates what you should do. Discipline ensures you actually do it. In the markets, execution without discipline is just gambling with a plan." — Operational Doctrine
          </Text>
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
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  stepHeader: {
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  stepText: {
    color: '#e9c176',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  header: {
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 40,
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  statusDot: {
    backgroundColor: '#ffb4ab',
    borderRadius: 4,
    height: 8,
    marginRight: 8,
    width: 8,
  },
  statusText: {
    color: '#8a8f93',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  content: {
    alignItems: 'center',
    backgroundColor: '#071a33',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  targetIconContainer: {
    alignItems: 'center',
    height: 120,
    justifyContent: 'center',
    marginBottom: 32,
    position: 'relative',
    width: 120,
  },
  targetOuterRing: {
    alignItems: 'center',
    borderColor: '#233853',
    borderRadius: 60,
    borderWidth: 1,
    height: 120,
    justifyContent: 'center',
    width: 120,
  },
  targetInnerRing: {
    alignItems: 'center',
    borderColor: '#233853',
    borderRadius: 40,
    borderWidth: 1,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  targetBullseye: {
    borderColor: '#e9c176',
    borderRadius: 12,
    borderWidth: 3,
    height: 24,
    width: 24,
  },
  crosshairVertical: {
    backgroundColor: '#233853',
    height: '100%',
    left: '50%',
    position: 'absolute',
    width: 1,
  },
  crosshairHorizontal: {
    backgroundColor: '#233853',
    height: 1,
    position: 'absolute',
    top: '50%',
    width: '100%',
  },
  headline: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  bodyText: {
    color: '#d1c5b4',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  ctaContainer: {
    width: '100%',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    justifyContent: 'center',
    minHeight: 56,
    width: '100%',
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
  footerInfoBox: {
    backgroundColor: '#0a1010',
    marginTop: 24,
    padding: 20,
    position: 'relative',
  },
  footerRail: {
    backgroundColor: '#e9c176',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  footerLabel: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  footerText: {
    color: '#d1c5b4',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
