import { signOut } from 'firebase/auth';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { deleteCurrentUserAccount } from '../services/accountDeletion';
import { firebaseAuth } from '../services/firebase';

export function OnboardingAccountActions() {
  const { user } = useAuth();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  if (!user) return null;

  async function handleSignOut() {
    try {
      await signOut(firebaseAuth);
    } catch (error) {
      console.error('Error signing out during onboarding:', error);
      Alert.alert('LOG OUT FAILED', 'Could not log out. Try again.');
    }
  }

  function handleDeleteAccount() {
    if (!user || isDeletingAccount) return;

    Alert.alert(
      'DELETE ACCOUNT',
      'This permanently deletes your account, profile, trial, missions, debriefs, stats, and notification settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingAccount(true);
            try {
              await deleteCurrentUserAccount(user);
              Alert.alert('ACCOUNT DELETED', 'Your account has been permanently deleted.');
            } catch (error) {
              const code = (error as any)?.code;
              if (code === 'auth/requires-recent-login') {
                Alert.alert(
                  'SIGN IN AGAIN',
                  'For security, please log out and sign back in, then return here to delete your account.',
                );
              } else {
                const message = error instanceof Error ? error.message : 'Could not delete your account. Try again.';
                Alert.alert('DELETE FAILED', message);
              }
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          style={({ pressed }) => [styles.actionButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.actionText}>LOG OUT</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isDeletingAccount}
          onPress={handleDeleteAccount}
          style={({ pressed }) => [
            styles.actionButton,
            styles.deleteButton,
            pressed && styles.buttonPressed,
            isDeletingAccount && styles.buttonDisabled,
          ]}
        >
          <Text style={[styles.actionText, styles.deleteText]}>
            {isDeletingAccount ? 'DELETING...' : 'DELETE ACCOUNT'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    left: 16,
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 20,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 20, 21, 0.92)',
    borderColor: '#2a3135',
    borderWidth: 1,
    minHeight: 34,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  deleteButton: {
    borderColor: 'rgba(226, 123, 123, 0.55)',
  },
  actionText: {
    color: '#d8d2c7',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  deleteText: {
    color: '#f3a0a4',
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonDisabled: {
    opacity: 0.58,
  },
});
