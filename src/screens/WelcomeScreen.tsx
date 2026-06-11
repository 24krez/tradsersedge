import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  getAuthErrorMessage,
  loginWithEmail,
  sendPasswordReset,
  signInWithGoogleCredential,
  signUpWithEmail,
  validateEmail,
  validatePassword,
} from '../services/authService';

type AuthView = 'login' | 'signup' | 'forgotPassword';

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

export function WelcomeScreen() {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');

  function clearForm() {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMessage(null);
    setShowPassword(false);
  }

  function switchView(newView: AuthView) {
    clearForm();
    setView(newView);
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async function handleLogin() {
    if (isLoading) return;
    setError(null);

    try {
      setIsLoading(true);
      await loginWithEmail(email, password);
      // AuthProvider listener fires → navigation handled by App.tsx
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setIsLoading(false);
    }
  }

  // ─── Sign Up ──────────────────────────────────────────────────────────────

  async function handleSignUp() {
    if (isLoading) return;
    setError(null);

    // Client-side validation
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) { setError(emailCheck.error!); return; }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) { setError(passwordCheck.error!); return; }

    if (password !== confirmPassword) {
      setError('Passwords don\'t match.');
      return;
    }

    try {
      setIsLoading(true);
      await signUpWithEmail(email, password);
      // AuthProvider listener fires → navigation handled by App.tsx
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setIsLoading(false);
    }
  }

  // ─── Forgot Password ─────────────────────────────────────────────────────

  async function handleForgotPassword() {
    if (isLoading) return;
    setError(null);
    setSuccessMessage(null);

    try {
      setIsLoading(true);
      await sendPasswordReset(email);
      setSuccessMessage('Reset link sent. Check your inbox to regain access.');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Google Sign-In ───────────────────────────────────────────────────────

  async function handleGoogleSignIn() {
    if (isLoading || !GOOGLE_CLIENT_ID) {
      if (!GOOGLE_CLIENT_ID) {
        setError('Google Sign-In is not configured yet. Use email/password to continue.');
      }
      return;
    }

    setError(null);

    try {
      setIsLoading(true);

      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString(36),
      );

      const redirectUri = AuthSession.makeRedirectUri();

      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.IdToken,
        extraParams: { nonce },
      });

      const result = await request.promptAsync(discovery!);

      if (result.type === 'success' && result.params?.id_token) {
        await signInWithGoogleCredential(result.params.id_token);
        // AuthProvider listener fires → navigation handled by App.tsx
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        setIsLoading(false);
      } else {
        setError('Google Sign-In failed. Try again.');
        setIsLoading(false);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setIsLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branding */}
        <View style={styles.branding}>
          <Text style={styles.brandEyebrow}>TRADER'S EDGE</Text>
          <Text style={styles.brandTagline}>
            {view === 'login' ? 'MISSION CONTROL' : view === 'signup' ? 'OPERATOR REGISTRATION' : 'ACCESS RECOVERY'}
          </Text>
          <View style={styles.brandRule} />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {view === 'login' ? 'Log In' : view === 'signup' ? 'Create Account' : 'Reset Password'}
        </Text>
        <Text style={styles.subtitle}>
          {view === 'login'
            ? 'Access your mission dashboard and continue your trading discipline journey.'
            : view === 'signup'
              ? 'Join the mission. Build discipline. Protect capital.'
              : 'Enter your email to receive a password reset link.'}
        </Text>

        {/* Error / Success */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        )}
        {successMessage && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✓ {successMessage}</Text>
          </View>
        )}

        {/* Email Field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!isLoading}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="operator@tradersedge.com"
            placeholderTextColor="#4e4639"
            style={styles.input}
            value={email}
          />
        </View>

        {/* Password Field */}
        {view !== 'forgotPassword' && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View style={styles.passwordRow}>
              <TextInput
                autoCapitalize="none"
                autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
                autoCorrect={false}
                editable={!isLoading}
                onChangeText={setPassword}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                placeholderTextColor="#4e4639"
                secureTextEntry={!showPassword}
                style={[styles.input, styles.passwordInput]}
                value={password}
              />
              <Pressable
                accessibilityLabel="Toggle password visibility"
                accessibilityRole="button"
                onPress={() => setShowPassword(!showPassword)}
                style={styles.toggleButton}
              >
                <Text style={styles.toggleText}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Confirm Password (sign up only) */}
        {view === 'signup' && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              editable={!isLoading}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              placeholderTextColor="#4e4639"
              secureTextEntry={!showPassword}
              style={styles.input}
              value={confirmPassword}
            />
          </View>
        )}

        {/* Primary Action */}
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={view === 'login' ? handleLogin : view === 'signup' ? handleSignUp : handleForgotPassword}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            isLoading && styles.buttonDisabled,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color="#101415" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {view === 'login' ? 'LOG IN' : view === 'signup' ? 'CREATE ACCOUNT' : 'SEND RESET LINK'}
            </Text>
          )}
        </Pressable>

        {/* Google Sign-In */}
        {view !== 'forgotPassword' && (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={isLoading}
              onPress={handleGoogleSignIn}
              style={({ pressed }) => [
                styles.googleButton,
                pressed && styles.buttonPressed,
                isLoading && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.googleButtonText}>SIGN IN WITH GOOGLE</Text>
            </Pressable>
          </>
        )}

        {/* Forgot Password Link (login only) */}
        {view === 'login' && (
          <Pressable
            accessibilityRole="link"
            onPress={() => switchView('forgotPassword')}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Forgot Password?</Text>
          </Pressable>
        )}

        {/* Switch View Links */}
        <View style={styles.switchRow}>
          {view === 'login' && (
            <Pressable accessibilityRole="link" onPress={() => switchView('signup')}>
              <Text style={styles.switchText}>
                Don't have an account? <Text style={styles.switchHighlight}>Sign Up</Text>
              </Text>
            </Pressable>
          )}
          {view === 'signup' && (
            <Pressable accessibilityRole="link" onPress={() => switchView('login')}>
              <Text style={styles.switchText}>
                Already have an account? <Text style={styles.switchHighlight}>Log In</Text>
              </Text>
            </Pressable>
          )}
          {view === 'forgotPassword' && (
            <Pressable accessibilityRole="link" onPress={() => switchView('login')}>
              <Text style={styles.switchText}>
                <Text style={styles.switchHighlight}>Back to Log In</Text>
              </Text>
            </Pressable>
          )}
        </View>

        {/* Trial Promo (signup only) */}
        {view === 'signup' && (
          <View style={styles.trialPromo}>
            <View style={styles.trialAccent} />
            <Text style={styles.trialLabel}>ELITE ACCESS</Text>
            <Text style={styles.trialText}>
              Every new account includes 7 days of full Elite access — no credit card required.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#101415',
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
    paddingTop: 56,
  },
  // ─── Branding ───────────────────────────────────────────────────────
  branding: {
    marginBottom: 40,
  },
  brandEyebrow: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  brandTagline: {
    color: '#8a8f93',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  brandRule: {
    backgroundColor: '#e9c176',
    height: 2,
    width: 56,
  },
  // ─── Title ──────────────────────────────────────────────────────────
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: '#d1c5b4',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 28,
  },
  // ─── Error / Success ────────────────────────────────────────────────
  errorBox: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderLeftColor: '#ff6b6b',
    borderLeftWidth: 3,
    borderWidth: 1,
    marginBottom: 20,
    padding: 14,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  successBox: {
    backgroundColor: 'rgba(106, 196, 131, 0.1)',
    borderColor: 'rgba(106, 196, 131, 0.3)',
    borderLeftColor: '#6ac483',
    borderLeftWidth: 3,
    borderWidth: 1,
    marginBottom: 20,
    padding: 14,
  },
  successText: {
    color: '#6ac483',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  // ─── Fields ─────────────────────────────────────────────────────────
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0a0f10',
    borderColor: '#2a3135',
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 15,
    minHeight: 54,
    paddingHorizontal: 16,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  passwordInput: {
    flex: 1,
  },
  toggleButton: {
    alignItems: 'center',
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderLeftWidth: 0,
    borderWidth: 1,
    justifyContent: 'center',
    minWidth: 60,
    paddingHorizontal: 14,
  },
  toggleText: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  // ─── Primary Button ─────────────────────────────────────────────────
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 56,
    paddingHorizontal: 18,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.58,
  },
  primaryButtonText: {
    color: '#101415',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  // ─── Google Button ──────────────────────────────────────────────────
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 20,
  },
  dividerLine: {
    backgroundColor: '#2a3135',
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: '#8a8f93',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginHorizontal: 16,
  },
  googleButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: '#2a3135',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
  },
  googleButtonText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  // ─── Links ──────────────────────────────────────────────────────────
  linkButton: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  linkText: {
    color: '#e9c176',
    fontSize: 13,
    fontWeight: '700',
  },
  switchRow: {
    alignItems: 'center',
    marginTop: 24,
  },
  switchText: {
    color: '#8a8f93',
    fontSize: 14,
    fontWeight: '600',
  },
  switchHighlight: {
    color: '#e9c176',
    fontWeight: '800',
  },
  // ─── Trial Promo ────────────────────────────────────────────────────
  trialPromo: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    marginTop: 32,
    padding: 18,
    position: 'relative',
  },
  trialAccent: {
    backgroundColor: '#e9c176',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 3,
  },
  trialLabel: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  trialText: {
    color: '#d1c5b4',
    fontSize: 13,
    lineHeight: 19,
  },
});
