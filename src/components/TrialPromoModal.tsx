import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { firestore } from '../services/firebase';
import { updateUserProfile } from '../services/userProfile';

type TrialPromoModalProps = {
  onOpenPaywall?: () => void;
};

export function TrialPromoModal({ onOpenPaywall }: TrialPromoModalProps) {
  const { user, userProfile, isInTrial } = useAuth();
  const [modalType, setModalType] = useState<'welcome' | 'ending' | 'expired' | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    if (!user || !userProfile) return;

    const q = query(collection(firestore, 'missions'), where('userId', '==', user.uid), limit(1));
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty && !isDismissing) {
        let trialEndsAtDate;
        if (typeof userProfile.trialEndsAt?.toDate === 'function') {
          trialEndsAtDate = userProfile.trialEndsAt.toDate();
        } else if (userProfile.trialEndsAt) {
          trialEndsAtDate = new Date(userProfile.trialEndsAt);
        } else {
          return;
        }

        const hoursRemaining = (trialEndsAtDate.getTime() - Date.now()) / (1000 * 60 * 60);

        if (hoursRemaining < 0 && !userProfile.hasSeenTrialExpired) {
          setModalType('expired');
        } else if (hoursRemaining >= 0 && hoursRemaining <= 24 && !userProfile.hasSeenTrialEnding) {
          setModalType('ending');
        } else if (hoursRemaining > 24 && !userProfile.hasSeenTrialWelcome) {
          setModalType('welcome');
        }
      }
    });

    return () => unsubscribe();
  }, [user, userProfile, isDismissing]);

  const handleDismiss = async (isUpgradeAction = false) => {
    if (!userProfile) return;
    setIsDismissing(true);
    const type = modalType;
    setModalType(null);

    try {
      if (type === 'welcome') {
        await updateUserProfile(userProfile.uid, { hasSeenTrialWelcome: true });
      } else if (type === 'ending') {
        await updateUserProfile(userProfile.uid, { hasSeenTrialEnding: true });
      } else if (type === 'expired') {
        await updateUserProfile(userProfile.uid, { hasSeenTrialExpired: true });
      }
    } catch (e) {
      console.error('Error updating trial seen flag', e);
    } finally {
      setIsDismissing(false);
      if (isUpgradeAction && onOpenPaywall) {
        onOpenPaywall();
      }
    }
  };

  if (!modalType) return null;

  return (
    <Modal animationType="fade" transparent visible={!!modalType} onRequestClose={() => handleDismiss()}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.accent, modalType === 'expired' && { backgroundColor: '#e27b7b' }]} />
          
          <Text style={[styles.title, modalType === 'expired' && { color: '#e27b7b' }]}>
            {modalType === 'welcome' 
              ? 'ELITE TRIAL ACTIVATED' 
              : modalType === 'ending' 
                ? 'TRIAL ENDING SOON' 
                : 'TRIAL EXPIRED'}
          </Text>
          
          <Text style={styles.description}>
            {modalType === 'welcome' 
              ? "Your 7-day Elite trial is active. You now have full access to Pro Mission Briefings, the Discipline Engine, and your Operator Dossier.\n\nProtect your capital and follow your protocols." 
              : modalType === 'ending'
                ? "Your 7-day Elite trial expires in less than 24 hours. Subscribe to maintain access to your intelligence dossier, debriefs, and discipline tracking."
                : "Your Elite trial has ended. You have been placed on the Free tier. Upgrade to Elite to regain access to advanced mission intelligence and your discipline tracking."}
          </Text>

          {modalType === 'expired' ? (
            <View style={{ gap: 12 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleDismiss(true)}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.primaryButtonText}>UPGRADE TO ELITE</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleDismiss()}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.secondaryButtonText}>CONTINUE ON FREE TIER</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => handleDismiss()}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.primaryButtonText}>
                {modalType === 'welcome' ? 'ACKNOWLEDGE' : 'CONTINUE'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(10, 15, 16, 0.9)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  accent: {
    backgroundColor: '#e9c176',
    height: 3,
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  title: {
    color: '#e9c176',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 16,
    marginTop: 8,
  },
  description: {
    color: '#d1c5b4',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 32,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    height: 48,
    justifyContent: 'center',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: '#5a5f63',
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: '#101415',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  secondaryButtonText: {
    color: '#8a8f93',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
