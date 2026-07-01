import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Alert } from 'react-native';

import { firestore } from './firebase';

type ReviewPromptSource = 'onboarding_completed' | 'mission_completed';

type RequestAppReviewParams = {
  userId?: string;
  userProfile?: Record<string, any> | null;
  source: ReviewPromptSource;
  missionId?: string;
};

export async function requestAppReviewIfEligible({
  userId,
  userProfile,
  source,
  missionId,
}: RequestAppReviewParams): Promise<void> {
  if (!userId || userProfile?.hasRatedOrReviewedApp) return;

  if (source === 'mission_completed' && missionId && userProfile?.lastReviewPromptedMissionId === missionId) {
    return;
  }

  await markReviewPromptShown(userId, source, missionId);

  const promptBody =
    source === 'onboarding_completed'
      ? 'If Trader\'s Edge helps sharpen your discipline, a quick rating helps more traders find it.'
      : 'Mission complete. If Trader\'s Edge is helping your execution, would you leave a quick rating?';

  Alert.alert('RATE TRADER\'S EDGE', promptBody, [
    { text: 'Not now', style: 'cancel' },
    {
      text: 'Rate now',
      onPress: async () => {
        await markReviewAccepted(userId);
        try {
          const StoreReview = await import('expo-store-review');
          if (await StoreReview.isAvailableAsync()) {
            await StoreReview.requestReview();
          }
        } catch (error) {
          console.warn('[AppReview] Unable to show store review prompt:', error);
        }
      },
    },
  ]);
}

async function markReviewPromptShown(userId: string, source: ReviewPromptSource, missionId?: string) {
  await updateDoc(doc(firestore, 'users', userId), {
    lastReviewPromptedAt: serverTimestamp(),
    lastReviewPromptSource: source,
    ...(missionId ? { lastReviewPromptedMissionId: missionId } : {}),
  });
}

async function markReviewAccepted(userId: string) {
  await updateDoc(doc(firestore, 'users', userId), {
    hasRatedOrReviewedApp: true,
    ratedOrReviewedAt: serverTimestamp(),
  });
}
