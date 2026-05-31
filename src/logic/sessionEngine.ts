import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export type TradingSession = 'new_york' | 'london' | 'asia' | 'custom';
export type SessionStatus = 'preparing' | 'active' | 'completed' | 'market_closed';

export type TimeRemaining = {
  hours: number;
  minutes: number;
  seconds: number;
  totalMinutes: number;
  formatted: string;
};

const ET_TIMEZONE = 'America/New_York';

export interface SessionBounds {
  start: Date;
  end: Date;
}

export const SESSION_LABELS: Record<TradingSession, string> = {
  new_york: 'NY Session',
  london: 'London Session',
  asia: 'Asia Session',
  custom: 'Custom Session',
};

/**
 * Returns the UTC boundaries for a specific session relative to the given NY date.
 * Handles the overnight Asia session properly.
 */
function getSessionBounds(session: TradingSession, nyTime: Date): SessionBounds {
  const year = nyTime.getFullYear();
  const month = nyTime.getMonth();
  const date = nyTime.getDate();
  const hours = nyTime.getHours();

  let startLocal: Date;
  let endLocal: Date;

  switch (session) {
    case 'new_york':
      // 09:30 to 16:00
      startLocal = new Date(year, month, date, 9, 30, 0, 0);
      endLocal = new Date(year, month, date, 16, 0, 0, 0);
      break;
    case 'london':
      // 03:00 to 11:30
      startLocal = new Date(year, month, date, 3, 0, 0, 0);
      endLocal = new Date(year, month, date, 11, 30, 0, 0);
      break;
    case 'asia':
      // 19:00 to 04:00 (crosses midnight)
      if (hours < 12) {
        // We are in the morning (e.g. 02:00 AM). The session started *yesterday*.
        startLocal = new Date(year, month, date - 1, 19, 0, 0, 0);
        endLocal = new Date(year, month, date, 4, 0, 0, 0);
      } else {
        // We are in the evening (e.g. 20:00 PM). The session starts *today* and ends *tomorrow*.
        startLocal = new Date(year, month, date, 19, 0, 0, 0);
        endLocal = new Date(year, month, date + 1, 4, 0, 0, 0);
      }
      break;
    default:
      // Fallback custom (e.g. 09:30 to 16:00)
      startLocal = new Date(year, month, date, 9, 30, 0, 0);
      endLocal = new Date(year, month, date, 16, 0, 0, 0);
  }

  // Convert the local ET times to actual UTC Dates
  return {
    start: fromZonedTime(startLocal, ET_TIMEZONE),
    end: fromZonedTime(endLocal, ET_TIMEZONE),
  };
}

export function isHoliday(date: Date = new Date()): boolean {
  // V1 Placeholder: No holidays implemented yet.
  return false;
}

export function isWeekend(nyTime: Date): boolean {
  const day = nyTime.getDay();
  // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
}

export function getSessionStatus(session: TradingSession, date: Date = new Date()): SessionStatus {
  const nyTime = toZonedTime(date, ET_TIMEZONE);

  if (!__DEV__ && (isWeekend(nyTime) || isHoliday(date))) {
    return 'market_closed';
  }

  const { start, end } = getSessionBounds(session, nyTime);
  const nowMs = date.getTime();

  if (nowMs < start.getTime()) {
    return 'preparing';
  } else if (nowMs >= start.getTime() && nowMs < end.getTime()) {
    return 'active';
  } else {
    return 'completed';
  }
}

export function isSessionActive(session: TradingSession, date: Date = new Date()): boolean {
  return getSessionStatus(session, date) === 'active';
}

export function getCurrentSession(
  date: Date = new Date(),
): { session: TradingSession | null; label: string | null } {
  const nyTime = toZonedTime(date, ET_TIMEZONE);

  if (!__DEV__ && (isWeekend(nyTime) || isHoliday(date))) {
    return { session: null, label: 'MARKET CLOSED' };
  }

  // To handle overlap properly, we check all active sessions.
  // The user requested: "Previous session should take primary".
  // This means the session that started *earliest* (has the smallest start timestamp)
  // that is currently active wins.
  const sessions: TradingSession[] = ['new_york', 'london', 'asia'];
  
  let activeSessions = sessions
    .map((s) => {
      const bounds = getSessionBounds(s, nyTime);
      return {
        session: s,
        bounds,
        isActive: date.getTime() >= bounds.start.getTime() && date.getTime() < bounds.end.getTime(),
      };
    })
    .filter((s) => s.isActive);

  if (activeSessions.length === 0) {
    return { session: null, label: null };
  }

  // Sort by start time ascending (earliest start time wins)
  activeSessions.sort((a, b) => a.bounds.start.getTime() - b.bounds.start.getTime());

  const primary = activeSessions[0].session;
  return { session: primary, label: SESSION_LABELS[primary] };
}

export function getTimeRemaining(session: TradingSession, date: Date = new Date()): TimeRemaining {
  const nyTime = toZonedTime(date, ET_TIMEZONE);
  const { end } = getSessionBounds(session, nyTime);
  
  const msRemaining = end.getTime() - date.getTime();
  
  if (msRemaining <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, totalMinutes: 0, formatted: '0h 0m Remaining' };
  }

  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);

  let formatted = '';
  if (hours > 0) {
    formatted = `${hours}h ${minutes}m Remaining`;
  } else if (minutes > 0) {
    formatted = `${minutes}m ${seconds}s Remaining`;
  } else {
    formatted = `${seconds}s Remaining`;
  }

  return { hours, minutes, seconds, totalMinutes, formatted };
}

export function getSessionProgress(session: TradingSession, date: Date = new Date()): number {
  const nyTime = toZonedTime(date, ET_TIMEZONE);
  const { start, end } = getSessionBounds(session, nyTime);

  const totalDuration = end.getTime() - start.getTime();
  const elapsed = date.getTime() - start.getTime();

  if (elapsed <= 0) return 0;
  if (elapsed >= totalDuration) return 100;

  return Math.floor((elapsed / totalDuration) * 100);
}
