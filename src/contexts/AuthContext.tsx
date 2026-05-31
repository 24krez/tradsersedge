import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { firebaseAuth, firestore } from '../services/firebase';

export type SubscriptionTier = 'free' | 'pro' | 'lifetime' | 'founder';

export interface UserProfile {
  callsign: string;
  motto: string;
  subscriptionTier: SubscriptionTier;
  onboardingStatus: string;
  missionPreferences?: {
    objective: string;
    threats: string[];
    coreFocus: string;
  };
  uid: string;
  [key: string]: any;
}

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  subscriptionTier: SubscriptionTier;
  isLoading: boolean;
  isPro: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userProfile: null,
  subscriptionTier: 'free',
  isLoading: true,
  isPro: false,
});

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

  const isPro = useMemo(() => {
    return subscriptionTier === 'pro' || subscriptionTier === 'lifetime' || subscriptionTier === 'founder';
  }, [subscriptionTier]);

  const value = useMemo(
    () => ({ user, userProfile, subscriptionTier, isLoading, isPro }),
    [user, userProfile, subscriptionTier, isLoading, isPro],
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

export function canAccessProFeature(tier: SubscriptionTier): boolean {
  return tier === 'pro' || tier === 'lifetime' || tier === 'founder';
}
