import { User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { firestore } from './firebase';

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
      uid: user.uid,
    },
    { merge: true },
  );
}
