import { User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { firestore } from './firebase';
import { AlertSettings } from '../contexts/AuthContext';

export const defaultAlertSettings: AlertSettings = {
  behavioral: {
    missionStatusWarnings: true,
    highRiskAlerts: true,
    lockedInRecognition: true,
    cautionAlerts: false,
  },
  mission: {
    missionStart: true,
    midSessionCheckIn: false,
    missionComplete: true,
    fifteenMinutesToClose: true,
    volatilityAlerts: true,
    debriefReminder: true,
  },
  intelligence: {
    weeklyIntelligenceReport: true,
    behavioralPatternReports: false,
    monthlyPerformanceSummary: true,
    rankPromotionAlerts: true,
  },
  lockScreen: {
    missionBriefings: true,
    lockScreenCoaching: true,
    nookMonitoring: false,
    liveActivityUpdates: true,
  },
  coaching: {
    style: 'operator',
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
};

export async function createUserProfile({ user }: CreateUserProfileParams) {
  const userRef = doc(firestore, 'users', user.uid);

  await setDoc(
    userRef,
    {
      callsign: '',
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      motto: '',
      onboardingStatus: 'welcome_started',
      subscriptionTier: 'founder',
      alertSettings: defaultAlertSettings,
      uid: user.uid,
    },
    { merge: true },
  );
}

export async function updateUserProfile(userId: string, updates: Partial<any>) {
  const userRef = doc(firestore, 'users', userId);
  await updateDoc(userRef, {
    ...updates,
    lastSeenAt: serverTimestamp(),
  });
}
