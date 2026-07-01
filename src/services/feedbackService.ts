import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { firestore } from './firebase';

export type FeedbackSource = 'profile' | 'mission_results' | 'onboarding' | 'general';

type SubmitFeedbackParams = {
  userId: string;
  email?: string | null;
  message: string;
  source: FeedbackSource;
  callsign?: string;
};

export async function submitFeedback({
  userId,
  email,
  message,
  source,
  callsign,
}: SubmitFeedbackParams): Promise<void> {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    throw new Error('Feedback message is required.');
  }

  await addDoc(collection(firestore, 'feedback'), {
    userId,
    email: email || '',
    callsign: callsign || '',
    message: trimmedMessage,
    source,
    status: 'new',
    createdAt: serverTimestamp(),
  });
}
