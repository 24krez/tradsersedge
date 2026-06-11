import { firebaseAuth } from '../services/firebase';

/**
 * Returns the current authenticated user's UID.
 * Throws if not authenticated — use as a guard in operations
 * that must never run without a valid user.
 */
export function requireAuthUid(): string {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.uid;
}
