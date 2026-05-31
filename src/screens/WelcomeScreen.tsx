import { signInAnonymously } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { firebaseAuth } from '../services/firebase';
import { createUserProfile } from '../services/userProfile';

export function WelcomeScreen() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleStart() {
    setIsLoading(true);
    setError(null);

    try {
      const credential = await signInAnonymously(firebaseAuth);
      await createUserProfile({ user: credential.user });
      // Navigation is automatically handled by AuthProvider when user state changes
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed.';
      setError(message);
      setIsLoading(false); // Only set false on error, on success we navigate away
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>TRADER'S EDGE</Text>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>A discipline and mindset operating system for traders.</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
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
        {isLoading ? (
          <ActivityIndicator color="#101415" />
        ) : (
          <Text style={styles.buttonLabel}>CONNECT VIA FIREBASE</Text>
        )}
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
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: 16,
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
