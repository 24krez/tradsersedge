import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

import { firestore } from './firebase';

type TradeStatus = 'traded' | 'no_trade';

type UpdateUserStatsParams = {
  completedAt?: Date;
  debriefId: string;
  score: number;
  tradeStatus: TradeStatus;
  userId: string;
};

type UpdateUserStatsResult = {
  applied: boolean;
};

const USER_STATS_VERSION = 'v1';

export async function updateUserStatsAfterDebrief({
  completedAt = new Date(),
  debriefId,
  score,
  tradeStatus,
  userId,
}: UpdateUserStatsParams): Promise<UpdateUserStatsResult> {
  const statsRef = doc(firestore, 'user_stats', userId);
  const debriefRef = doc(firestore, 'mission_debriefs', debriefId);
  const completedDateKey = formatLocalDateKey(completedAt);

  return runTransaction(firestore, async (transaction) => {
    const [debriefSnapshot, statsSnapshot] = await Promise.all([
      transaction.get(debriefRef),
      transaction.get(statsRef),
    ]);

    if (!debriefSnapshot.exists()) {
      throw new Error('Cannot update user stats for a missing debrief.');
    }

    const debriefData = debriefSnapshot.data();
    if (debriefData.statsApplied === true) {
      return { applied: false };
    }

    const currentStats = statsSnapshot.exists() ? statsSnapshot.data() : {};
    const previousDebriefTotal = numberFrom(currentStats.totalDebriefsCompleted ?? currentStats.totalDebriefs);
    const previousAverage = numberFrom(currentStats.averageDisciplineScore);
    const totalDebriefsCompleted = previousDebriefTotal + 1;
    const averageDisciplineScore = calculateRunningAverage(previousAverage, previousDebriefTotal, score);
    const bestDisciplineScore = Math.max(numberFrom(currentStats.bestDisciplineScore), score);
    const currentStreak = calculateCurrentStreak(
      stringFrom(currentStats.lastMissionCompletedDate),
      numberFrom(currentStats.currentStreak),
      completedDateKey,
    );
    const longestStreak = Math.max(numberFrom(currentStats.longestStreak), currentStreak);
    const tradedSessionsCount = numberFrom(currentStats.tradedSessionsCount ?? currentStats.tradeDays) + (tradeStatus === 'traded' ? 1 : 0);
    const noTradeSessionsCount = numberFrom(currentStats.noTradeSessionsCount ?? currentStats.noTradeDays) + (tradeStatus === 'no_trade' ? 1 : 0);

    transaction.set(
      statsRef,
      {
        averageDisciplineScore,
        bestDisciplineScore,
        bestGrade: gradeFromScore(bestDisciplineScore),
        currentStreak,
        lastCompletedDate: completedAt.toISOString(),
        lastDebriefId: debriefId,
        lastMissionCompletedDate: completedDateKey,
        longestStreak,
        noTradeDays: noTradeSessionsCount,
        noTradeSessionsCount,
        statsVersion: USER_STATS_VERSION,
        totalDebriefs: totalDebriefsCompleted,
        totalDebriefsCompleted,
        totalMissionsCompleted: numberFrom(currentStats.totalMissionsCompleted) + 1,
        tradeDays: tradedSessionsCount,
        tradedSessionsCount,
        updatedAt: serverTimestamp(),
        ...(statsSnapshot.exists() ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true },
    );

    transaction.update(debriefRef, {
      statsApplied: true,
      statsAppliedAt: serverTimestamp(),
      statsVersion: USER_STATS_VERSION,
      updatedAt: serverTimestamp(),
    });

    return { applied: true };
  });
}

function calculateRunningAverage(previousAverage: number, previousTotal: number, nextScore: number): number {
  if (previousTotal <= 0) return nextScore;
  return roundToTwoDecimals(((previousAverage * previousTotal) + nextScore) / (previousTotal + 1));
}

function calculateCurrentStreak(previousDateKey: string, previousStreak: number, completedDateKey: string): number {
  if (!previousDateKey) return 1;
  if (previousDateKey === completedDateKey) return Math.max(previousStreak, 1);
  if (daysBetween(previousDateKey, completedDateKey) === 1) return previousStreak + 1;
  return 1;
}

function daysBetween(startDateKey: string, endDateKey: string): number {
  return Math.round((dateKeyToLocalTime(endDateKey) - dateKeyToLocalTime(startDateKey)) / 86400000);
}

function dateKeyToLocalTime(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
}

function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function gradeFromScore(score: number): string {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  return 'Recovery Required';
}

function numberFrom(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function stringFrom(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
