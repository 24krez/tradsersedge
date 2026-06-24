import { User, deleteUser, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';

import { firebaseAuth, firestore } from './firebase';

const USER_ID_COLLECTIONS = [
  'missions',
  'mindset_checkins',
  'session_notes',
  'mission_debriefs',
  'discipline_scores',
  'notification_preferences',
];

const DIRECT_USER_DOC_COLLECTIONS = [
  'users',
  'user_stats',
  'notification_settings',
];

function recentLoginError() {
  return Object.assign(new Error('Recent login required.'), { code: 'auth/requires-recent-login' });
}

async function assertRecentlyAuthenticated(user: User) {
  const token = await user.getIdTokenResult(true);
  const authTime = new Date(token.authTime).getTime();
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

  if (!authTime || authTime < fiveMinutesAgo) {
    throw recentLoginError();
  }
}

async function deleteUserOwnedQuery(collectionName: string, userId: string) {
  const snapshot = await getDocs(query(collection(firestore, collectionName), where('userId', '==', userId)));
  if (snapshot.empty) return;

  let batch = writeBatch(firestore);
  let pendingWrites = 0;

  for (const document of snapshot.docs) {
    batch.delete(document.ref);
    pendingWrites += 1;

    if (pendingWrites === 450) {
      await batch.commit();
      batch = writeBatch(firestore);
      pendingWrites = 0;
    }
  }

  if (pendingWrites > 0) {
    await batch.commit();
  }
}

async function deleteDirectUserDocs(userId: string) {
  await Promise.all(
    DIRECT_USER_DOC_COLLECTIONS.map((collectionName) =>
      deleteDoc(doc(firestore, collectionName, userId)).catch((error) => {
        if ((error as any)?.code === 'not-found') return;
        throw error;
      }),
    ),
  );
}

export async function deleteCurrentUserAccount(user: User) {
  const userId = user.uid;

  await assertRecentlyAuthenticated(user);

  for (const collectionName of USER_ID_COLLECTIONS) {
    await deleteUserOwnedQuery(collectionName, userId);
  }

  await deleteDirectUserDocs(userId);

  try {
    await deleteUser(user);
  } catch (error) {
    const code = (error as any)?.code;
    if (code === 'auth/requires-recent-login') {
      throw error;
    }

    throw error;
  }

  await signOut(firebaseAuth).catch(() => undefined);
}
