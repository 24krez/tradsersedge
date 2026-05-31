import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { firebaseAuth, firestore } from '../services/firebase';

export function ProfileScreen() {
  const { t } = useTranslation('profile');
  const { user, userProfile } = useAuth();

  const [callsign, setCallsign] = useState('');
  const [motto, setMotto] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setCallsign(userProfile.callsign || '');
      setMotto(userProfile.motto || '');
    }
  }, [userProfile]);

  async function handleSave() {
    if (!user || isSaving) return;
    
    const trimmedCallsign = callsign.trim();
    const trimmedMotto = motto.trim();

    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, 'users', user.uid), {
        callsign: trimmedCallsign,
        motto: trimmedMotto,
      });
      // Optionally show a success toast here
    } catch (e) {
      console.error('Error saving profile:', e);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut(firebaseAuth);
    } catch (e) {
      console.error('Error signing out:', e);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>{t('title')}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {userProfile?.subscriptionTier === 'founder' 
                ? t('founderBadge') 
                : userProfile?.subscriptionTier?.toUpperCase() || 'FREE'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('callsignLabel')}</Text>
          <TextInput
            onChangeText={setCallsign}
            placeholder={t('callsignPlaceholder')}
            placeholderTextColor="#4e4639"
            style={styles.input}
            value={callsign}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('mottoLabel')}</Text>
          <TextInput
            multiline
            onChangeText={setMotto}
            placeholder={t('mottoPlaceholder')}
            placeholderTextColor="#4e4639"
            style={[styles.input, styles.textArea]}
            value={motto}
          />
        </View>

        <View style={styles.readOnlySection}>
          <View style={styles.readOnlyRow}>
            <Text style={styles.label}>{t('rankLabel')}</Text>
            <Text style={styles.readOnlyValue}>{userProfile?.rank || t('defaultRank')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.readOnlyRow}>
            <Text style={styles.label}>{t('classificationLabel')}</Text>
            <Text style={styles.readOnlyValue}>{userProfile?.classification || t('defaultClassification')}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.buttonPressed,
            isSaving && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.saveButtonText}>{isSaving ? t('saving') : t('saveBtn')}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.signOutText}>{t('signOutBtn')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#101415',
    flex: 1,
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    marginTop: 16,
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  badge: {
    backgroundColor: 'rgba(233, 193, 118, 0.1)',
    borderColor: 'rgba(233, 193, 118, 0.3)',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0a0f10',
    borderColor: '#2a3135',
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 14,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  textArea: {
    minHeight: 96,
    paddingTop: 16,
    paddingBottom: 16,
    textAlignVertical: 'top',
  },
  readOnlySection: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    marginBottom: 32,
  },
  readOnlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  readOnlyValue: {
    color: '#8a8f93',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    backgroundColor: '#2a3135',
    height: 1,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 56,
  },
  saveButtonText: {
    color: '#101415',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  signOutButton: {
    alignItems: 'center',
    borderColor: '#2a3135',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 56,
  },
  signOutText: {
    color: '#8a8f93',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
