import { useNavigation } from '@react-navigation/native';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { MissionStackNavigationProp } from '../../App';

export function ProUpsellScreen() {
  const navigation = useNavigation<MissionStackNavigationProp>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
          <Text style={styles.eyebrow}>MISSION DEBRIEF</Text>
          <Text style={styles.title}>Mission Debrief is a Pro feature.</Text>
          <Text style={styles.description}>
            Upgrade to review your session, notes, mindset, and trading behavior after each mission.
          </Text>
        </View>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={() => console.log('TODO: Implement RevenueCat Paywall')}
            style={({ pressed }) => [styles.upgradeButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.upgradeText}>UPGRADE TO PRO</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('ReadinessCheck')}
            style={({ pressed }) => [styles.returnButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.returnText}>RETURN TO DASHBOARD</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#101415',
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: '#1a1e1f',
    borderColor: '#2a3135',
    borderRadius: 32,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    marginBottom: 24,
    width: 64,
  },
  lockIcon: {
    fontSize: 24,
  },
  eyebrow: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 16,
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    color: '#8a8f93',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  footer: {
    gap: 16,
  },
  upgradeButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    borderRadius: 8,
    minHeight: 56,
    justifyContent: 'center',
  },
  upgradeText: {
    color: '#101415',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  returnButton: {
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  returnText: {
    color: '#8a8f93',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
