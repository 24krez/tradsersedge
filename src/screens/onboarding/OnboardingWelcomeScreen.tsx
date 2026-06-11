import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, StyleSheet, Text, View, Pressable, Image } from 'react-native';

const appIcon = require('../../../assets/images/TradersEdge_appicon.png');

import { OnboardingNavigationProp } from './OnboardingNavigator';

export function OnboardingWelcomeScreen() {
  const navigation = useNavigation<OnboardingNavigationProp>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepText}>STEP 1 OF 6</Text>
        </View>
        <View style={styles.content}>
          <Image source={appIcon} style={styles.appIcon} resizeMode="contain" />
          
          <View style={styles.statusHeader}>
            <View style={styles.statusLine} />
            <Text style={styles.statusText}>STATUS: INITIALIZING</Text>
            <View style={styles.statusLine} />
          </View>
          <Text style={styles.brandTitle}>TRADER'S EDGE</Text>

          <View style={styles.mainTextContainer}>
            <Text style={styles.welcomeText}>Welcome Agent.</Text>
            <Text style={styles.goldText}>Your edge isn't</Text>
            <Text style={styles.goldText}>strategy.</Text>
            <Text style={styles.disciplineText}>Your edge is</Text>
            <Text style={styles.disciplineText}>discipline.</Text>
          </View>

          <Text style={styles.bodyText}>
            Strategy is the map. Discipline is the edge. TraderEdge helps you prepare, execute, and review every session.
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.ctaWrapper}>
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerBottomRight} />
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('OnboardingSession')}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.primaryButtonText}>BEGIN MISSION</Text>
            </Pressable>
          </View>

          <View style={styles.encryptedFooter}>
            <Text style={styles.encryptedText}>ENCRYPTED PROTOCOL 04-X</Text>
          </View>
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
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  appIcon: {
    height: 64,
    marginBottom: 32,
    width: 64,
  },
  statusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
  statusLine: {
    backgroundColor: '#e9c176',
    height: 1,
    width: 24,
  },
  statusText: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
    marginHorizontal: 12,
  },
  brandTitle: {
    color: '#8a8f93',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 48,
  },
  mainTextContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeText: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  goldText: {
    color: '#e9c176',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  disciplineText: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  bodyText: {
    color: '#d1c5b4',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  footer: {
    alignItems: 'center',
    gap: 32,
  },
  ctaWrapper: {
    padding: 16,
    position: 'relative',
    width: '100%',
  },
  cornerTopLeft: {
    borderColor: '#4e4639',
    borderLeftWidth: 1,
    borderTopWidth: 1,
    height: 16,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 16,
  },
  cornerBottomRight: {
    borderBottomWidth: 1,
    borderColor: '#4e4639',
    borderRightWidth: 1,
    bottom: 0,
    height: 16,
    position: 'absolute',
    right: 0,
    width: 16,
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
  encryptedFooter: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  encryptedText: {
    color: '#4e4639',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
