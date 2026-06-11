import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth, useIsPro } from '../../contexts/AuthContext';
import {
  alertTypeForContext,
  buildCoachMessageState,
  getRandomCoachMessage,
  setCurrentCoachMessage,
} from './coachEngine';
import type {
  AlertType,
  CoachMessageState,
  CoachingStyle,
  ScreenContext,
} from './coachTypes';

type UseCoachMessageInput = {
  /** Explicit alert type pool to draw from. Falls back to screenContext mapping. */
  alertType?: AlertType;
  /** Screen context determines which alert type pool to draw from */
  screenContext: ScreenContext;
  /** Mission data from the active mission (optional) */
  missionData?: {
    id?: string;
    objective?: string;
    coreFocus?: string;
    threats?: string[];
    missionStatus?: string;
    currentMindsetStatus?: string;
  } | null;
  /** Override coaching style (otherwise reads from user profile) */
  styleOverride?: CoachingStyle;
};

type UseCoachMessageResult = {
  /** The current coaching message */
  message: CoachMessageState | null;
  /** Rotate to a new random message from the same pool */
  refresh: () => void;
  /** The resolved coaching style being used */
  coachingStyle: CoachingStyle;
  /** Display label for the coaching style */
  styleLabel: string;
};

/**
 * Shared hook that wraps the Day 6 coach engine for consistent
 * coaching message usage across all screens.
 *
 * - Free users are locked to 'tactical' (Calm Operator)
 * - Elite users use their saved preference or 'tactical' default
 * - Messages auto-rotate when screenContext or mission status changes
 */
export function useCoachMessage({
  alertType,
  screenContext,
  missionData,
  styleOverride,
}: UseCoachMessageInput): UseCoachMessageResult {
  const { userProfile } = useAuth();
  const isPro = useIsPro();

  // Resolve coaching style
  const savedStyle = userProfile?.alertSettings?.coaching?.style as CoachingStyle | undefined;
  const coachingStyle: CoachingStyle = styleOverride
    ?? (isPro ? (savedStyle || 'tactical') : 'tactical');

  const styleLabel = coachingStyle === 'positive' ? 'HYPE COACH' : 'CALM OPERATOR';

  const [message, setMessage] = useState<CoachMessageState | null>(null);

  // Track previous context to detect changes
  const prevContextRef = useRef<string>('');

  const generateMessage = useCallback(() => {
    const missionStatus = missionData?.missionStatus || missionData?.currentMindsetStatus;
    const resolvedAlertType = alertType || alertTypeForContext(screenContext, missionStatus);
    const threat = missionData?.threats?.[0];

    const coachMsg = getRandomCoachMessage({
      alertType: resolvedAlertType,
      coachingStyle,
      missionStatus: missionStatus as any,
      objective: missionData?.objective,
      threat,
      coreFocus: missionData?.coreFocus,
    });

    const state = buildCoachMessageState(
      coachMsg,
      screenContext,
      missionData?.id,
    );

    setMessage(state);
    setCurrentCoachMessage(state);
  }, [alertType, screenContext, coachingStyle, missionData?.id, missionData?.missionStatus, missionData?.currentMindsetStatus, missionData?.objective, missionData?.coreFocus, missionData?.threats]);

  // Generate initial message and auto-rotate on context/status changes
  useEffect(() => {
    const contextKey = `${alertType || ''}:${screenContext}:${coachingStyle}:${missionData?.missionStatus || ''}:${missionData?.currentMindsetStatus || ''}`;
    if (contextKey !== prevContextRef.current) {
      prevContextRef.current = contextKey;
      generateMessage();
    }
  }, [alertType, screenContext, coachingStyle, missionData?.missionStatus, missionData?.currentMindsetStatus, generateMessage]);

  // Refresh / rotate message manually
  const refresh = useCallback(() => {
    generateMessage();
  }, [generateMessage]);

  return { message, refresh, coachingStyle, styleLabel };
}
