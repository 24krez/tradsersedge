import { User } from 'firebase/auth';
import { Timestamp, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { firestore } from './firebase';
import { AlertSettings } from '../contexts/AuthContext';

export const defaultAlertSettings: AlertSettings = {
  behavioral: {
    missionStatusWarnings: true,
    highRiskAlerts: false,
    lockedInRecognition: false,
    cautionAlerts: false,
  },
  mission: {
    missionStart: true,
    midSessionCheckIn: false,
    missionComplete: true,
    fifteenMinutesToClose: false,
    volatilityAlerts: false,
    debriefReminder: false,
  },
  intelligence: {
    weeklyIntelligenceReport: false,
    behavioralPatternReports: false,
    monthlyPerformanceSummary: false,
    rankPromotionAlerts: false,
  },
  lockScreen: {
    missionBriefings: true,
    lockScreenCoaching: true,
    nookMonitoring: true,
    liveActivityUpdates: true,
  },
  coaching: {
    style: 'tactical',
    frequency: 'medium',
  },
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '06:00',
  },
};

type CreateUserProfileParams = {
  user: User;
  providerProfile?: {
    displayName?: string;
    providerId?: string;
    providerUid?: string;
  };
};

export async function createUserProfile({ user, providerProfile }: CreateUserProfileParams) {
  const userRef = doc(firestore, 'users', user.uid);
  const existingProfile = await getDoc(userRef);

  if (existingProfile.exists()) {
    await updateDoc(userRef, {
      email: user.email || existingProfile.data().email || '',
      lastSeenAt: serverTimestamp(),
      name: providerProfile?.displayName || user.displayName || existingProfile.data().name || '',
      providerId: providerProfile?.providerId || user.providerData[0]?.providerId || existingProfile.data().providerId || '',
      providerUid: providerProfile?.providerUid || user.providerData[0]?.uid || existingProfile.data().providerUid || '',
    });
    return;
  }

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 7);

  await setDoc(userRef, {
    callsign: '',
    createdAt: serverTimestamp(),
    email: user.email || '',
    lastSeenAt: serverTimestamp(),
    motto: '',
    name: providerProfile?.displayName || user.displayName || '',
    onboardingStatus: 'welcome_started',
    providerId: providerProfile?.providerId || user.providerData[0]?.providerId || '',
    providerUid: providerProfile?.providerUid || user.providerData[0]?.uid || '',
    subscriptionTier: 'free',
    trialStartedAt: serverTimestamp(),
    trialEndsAt: Timestamp.fromDate(trialEnd),
    alertSettings: defaultAlertSettings,
    uid: user.uid,
  });
}

export async function updateUserProfile(userId: string, updates: Partial<any>) {
  const userRef = doc(firestore, 'users', userId);
  await updateDoc(userRef, {
    ...updates,
    lastSeenAt: serverTimestamp(),
  });
}
