import { GoogleAuthProvider, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { firebaseAuth } from './firebase';
import { createUserProfile } from './userProfile';

// ─── Validation ──────────────────────────────────────────────────────────────

export type ValidationResult = { valid: boolean; error?: string };

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) return { valid: false, error: 'Email is required.' };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return { valid: false, error: 'Enter a valid email address.' };

  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return { valid: false, error: 'Password is required.' };
  if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters.' };
  if (!/[A-Z]/.test(password)) return { valid: false, error: 'Password must include at least one uppercase letter.' };
  if (!/[0-9]/.test(password)) return { valid: false, error: 'Password must include at least one number.' };

  return { valid: true };
}

// ─── Email / Password ────────────────────────────────────────────────────────

export async function signUpWithEmail(email: string, password: string) {
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) throw new Error(emailCheck.error);

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) throw new Error(passwordCheck.error);

  const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
  await createUserProfile({ user: credential.user });
  return credential;
}

export async function loginWithEmail(email: string, password: string) {
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) throw new Error(emailCheck.error);

  if (!password) throw new Error('Password is required.');

  return signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
}

// ─── Google Sign-In ──────────────────────────────────────────────────────────

export async function signInWithGoogleCredential(idToken: string) {
  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(firebaseAuth, credential);

  // Create profile if this is a new user
  if (userCredential.user.metadata.creationTime === userCredential.user.metadata.lastSignInTime) {
    await createUserProfile({ user: userCredential.user });
  }

  return userCredential;
}

// ─── Password Reset ─────────────────────────────────────────────────────────

export async function sendPasswordReset(email: string) {
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) throw new Error(emailCheck.error);

  await sendPasswordResetEmail(firebaseAuth, email.trim());
}

// ─── Logout ─────────────────────────────────────────────────────────────────

export async function logout() {
  await signOut(firebaseAuth);
}

// ─── Firebase Error Mapping ─────────────────────────────────────────────────

export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'An unexpected error occurred.';

  const code = (error as any).code || '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 8 characters with a mix of uppercase and numbers.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    default:
      return error.message || 'Authentication failed.';
  }
}
