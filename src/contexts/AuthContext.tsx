import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { firebaseAuth, firestore } from '../services/firebase';
import type { CoachingStyle } from '../features/coaching/coachTypes';

export type SubscriptionTier = 'free' | 'pro' | 'lifetime' | 'founder';

export interface AlertSettings {
  behavioral: {
    missionStatusWarnings: boolean;
    highRiskAlerts: boolean;
    lockedInRecognition: boolean;
    cautionAlerts: boolean;
  };
  mission: {
    missionStart: boolean;
    midSessionCheckIn: boolean;
    missionComplete: boolean;
    fifteenMinutesToClose: boolean;
    volatilityAlerts: boolean;
    debriefReminder: boolean;
  };
  intelligence: {
    weeklyIntelligenceReport: boolean;
    behavioralPatternReports: boolean;
    monthlyPerformanceSummary: boolean;
    rankPromotionAlerts: boolean;
  };
  lockScreen: {
    missionBriefings: boolean;
    lockScreenCoaching: boolean;
    nookMonitoring: boolean;
    liveActivityUpdates: boolean;
  };
  coaching: {
    style: CoachingStyle;
    frequency: 'low' | 'medium' | 'high';
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
}

export interface UserProfile {
  callsign: string;
  motto: string;
  subscriptionTier: SubscriptionTier;
  onboardingStatus: string;
  email?: string;
  tradingSession?: 'new_york' | 'london' | 'asia' | 'custom';
  tradingStartTime?: string; // HH:mm format, e.g. '09:30'
  tradingEndTime?: string;   // HH:mm format, e.g. '16:00'
  trialStartedAt?: any;
  trialEndsAt?: any;         // Firestore Timestamp — trial expiration
  hasSeenTrialWelcome?: boolean;
  hasSeenTrialEnding?: boolean;
  hasSeenTrialExpired?: boolean;
  missionPreferences?: {
    objective: string;
    threats: string[];
    coreFocus: string;
  };
  alertSettings?: AlertSettings;
  uid: string;
  [key: string]: any;
}

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  subscriptionTier: SubscriptionTier;
  isLoading: boolean;
  isPro: boolean;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isInTrial: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userProfile: null,
  subscriptionTier: 'free',
  isLoading: true,
  isPro: false,
  isAuthenticated: false,
  isAnonymous: false,
  isInTrial: false,
});

function checkTrialActive(userProfile: UserProfile | null): boolean {
  if (!userProfile?.trialEndsAt) return false;

  const trialEnd = typeof userProfile.trialEndsAt.toDate === 'function'
    ? userProfile.trialEndsAt.toDate()
    : new Date(userProfile.trialEndsAt);

  return new Date() < trialEnd;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserProfile(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to Firestore user profile when authenticated
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      doc(firestore, 'users', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setUserProfile(snapshot.data() as UserProfile);
        } else {
          setUserProfile(null);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error listening to user profile:', error);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const subscriptionTier = userProfile?.subscriptionTier || 'free';
  const isAuthenticated = user != null;
  const isAnonymous = user?.isAnonymous ?? false;
  const isInTrial = useMemo(() => checkTrialActive(userProfile), [userProfile]);

  const isPro = useMemo(() => {
    const paidTier = subscriptionTier === 'pro' || subscriptionTier === 'lifetime' || subscriptionTier === 'founder';
    return paidTier || isInTrial;
  }, [subscriptionTier, isInTrial]);

  const value = useMemo(
    () => ({ user, userProfile, subscriptionTier, isLoading, isPro, isAuthenticated, isAnonymous, isInTrial }),
    [user, userProfile, subscriptionTier, isLoading, isPro, isAuthenticated, isAnonymous, isInTrial],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useIsPro() {
  const { isPro } = useAuth();
  return isPro;
}

export function useRequireAuth() {
  const auth = useAuth();
  if (!auth.user) {
    throw new Error('Authentication required');
  }
  return auth;
}

export function canAccessProFeature(tier: SubscriptionTier): boolean {
  return tier === 'pro' || tier === 'lifetime' || tier === 'founder';
}
