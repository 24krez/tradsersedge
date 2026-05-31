import { signInAnonymously } from 'firebase/auth';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { firebaseAuth } from '../services/firebase';
import { createUserProfile } from '../services/userProfile';

export function WelcomeScreen() {
  const [status, setStatus] = useState('Ready to connect Firebase.');
  const [isLoading, setIsLoading] = useState(false);

  async function handleStart() {
    setIsLoading(true);
    setStatus('Connecting...');

    try {
      const credential = await signInAnonymously(firebaseAuth);

      await createUserProfile({ user: credential.user });
      setStatus(`Connected as ${credential.user.uid.slice(0, 8)}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firebase connection failed.';

      setStatus(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>TRADER'S EDGE</Text>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>{status}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={isLoading}
        onPress={handleStart}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          isLoading && styles.buttonDisabled,
        ]}
      >
        <Text style={styles.buttonLabel}>{isLoading ? 'Connecting' : 'Start Mission'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#101415',
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 32,
  },
  content: {
    gap: 12,
    paddingTop: 96,
  },
  eyebrow: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: '#f8fafc',
    fontSize: 36,
    fontWeight: '800',
  },
  subtitle: {
    color: '#d1c5b4',
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.58,
  },
  buttonLabel: {
    color: '#101415',
    fontSize: 15,
    fontWeight: '800',
  },
});
