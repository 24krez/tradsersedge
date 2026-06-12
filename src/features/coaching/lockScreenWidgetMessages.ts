import { getRandomCoachMessage } from './coachEngine';
import type { CoachingStyle } from './coachTypes';

export type LockScreenWidgetSurface = 'circular' | 'rectangular' | 'home';

export type LockScreenWidgetMessage = {
  id: string;
  text: string;
  category: 'quote' | 'inspo' | 'tradingInsight' | 'habitInsight';
  style: 'calm' | 'direct';
  maxSurface: LockScreenWidgetSurface;
  expiresAt?: string;
};

type LockScreenMessageInput = {
  coachingStyle?: CoachingStyle;
  timeOfDay?: 'active_session' | 'daytime' | 'outside_session';
  fallback?: string;
};

const DEFAULT_FALLBACK = 'No setup, no trade.';

const calmOperatorMessages = [
  'No setup, no trade.',
  'Wait for confirmation.',
  'Protect capital first.',
  'One clean setup.',
  'Patience is the edge.',
  'Discipline before execution.',
  'Let price come to you.',
  'Follow the mission.',
  'Stay calm. Stay selective.',
  'Process over outcome.',
];

const directOperatorMessages = [
  'Do not chase.',
  'Respect your stop.',
  'No revenge trades.',
  'Stick to the plan.',
  'One trade at a time.',
  'Wait. Confirm. Execute.',
  'Control the impulse.',
  'Protect the account.',
  'Your rules come first.',
  'Clean entries only.',
];

const circularFallbacks = [
  'No chase.',
  'Wait. Confirm.',
  'Protect capital.',
  'Stay selective.',
  'Rules first.',
];

export function getLockScreenCoachingMessage({
  coachingStyle = 'tactical',
  fallback = DEFAULT_FALLBACK,
}: LockScreenMessageInput): LockScreenWidgetMessage {
  const styleBank = coachingStyle === 'positive' ? calmOperatorMessages : directOperatorMessages;
  const engineMessage = getRandomCoachMessage({
    alertType: 'lock_screen',
    coachingStyle,
    screenContext: 'lock_screen',
  }).body;

  const candidates = [
    engineMessage,
    ...styleBank,
    fallback,
    DEFAULT_FALLBACK,
  ].filter((message): message is string => Boolean(message?.trim()));

  const text = candidates.find((message) => isRectangularSafe(message)) || fallbackForSurface('rectangular', fallback);

  return {
    id: stableMessageId(text),
    text,
    category: categoryForText(text),
    style: coachingStyle === 'positive' ? 'calm' : 'direct',
    maxSurface: 'rectangular',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

export function formatWidgetMessage(
  message: LockScreenWidgetMessage,
  surface: LockScreenWidgetSurface,
): string {
  const fallback = fallbackForSurface(surface, DEFAULT_FALLBACK);
  const text = sanitizeMessage(message.text);

  if (surface === 'circular') {
    return isCircularSafe(text) ? text : fallback;
  }

  if (surface === 'rectangular') {
    return isRectangularSafe(text) ? text : DEFAULT_FALLBACK;
  }

  return wordCount(text) <= 14 && text.length <= 70 ? text : DEFAULT_FALLBACK;
}

function fallbackForSurface(surface: LockScreenWidgetSurface, fallback: string): string {
  if (surface === 'circular') {
    return circularFallbacks.find(isCircularSafe) || 'Rules first.';
  }

  return isRectangularSafe(fallback) ? fallback : DEFAULT_FALLBACK;
}

function isCircularSafe(text: string): boolean {
  const clean = sanitizeMessage(text);
  const words = wordCount(clean);
  return words >= 1 && words <= 6 && clean.length <= 32 && !hasMarketPredictionLanguage(clean);
}

function isRectangularSafe(text: string): boolean {
  const clean = sanitizeMessage(text);
  const words = wordCount(clean);
  return words >= 1 && words <= 12 && clean.length <= 56 && !hasMarketPredictionLanguage(clean);
}

function sanitizeMessage(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function wordCount(text: string): number {
  const words = sanitizeMessage(text).match(/[A-Za-z0-9+]+/g);
  return words?.length ?? 0;
}

function hasMarketPredictionLanguage(text: string): boolean {
  return /\b(will|guaranteed|guarantee|sure thing|must go|going to pump|going to dump|target price)\b/i.test(text);
}

function stableMessageId(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return `lock-widget-${hash.toString(16)}`;
}

function categoryForText(text: string): LockScreenWidgetMessage['category'] {
  const lower = text.toLowerCase();
  if (lower.includes('threat') || lower.includes('setup') || lower.includes('trade')) return 'tradingInsight';
  if (lower.includes('discipline') || lower.includes('process') || lower.includes('patience')) return 'habitInsight';
  return 'inspo';
}
