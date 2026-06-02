import type { AlertType, CoachingStyle } from './coachTypes';

export const coachMessages: Record<CoachingStyle, Partial<Record<AlertType, string[]>>> = {
  tactical: {
    daily_mission: [
      'Mission briefing ready. Define the objective before the market tests you.',
      'Set the mission. Protect capital. Execute clean.',
    ],
    session_start: [
      'Trading window open. Review the threat. Follow the plan.',
      'Session live. No impulse trades. Execute only your setup.',
    ],
    mid_session_checkin: [
      'Status check. Are you trading the plan or chasing the move?',
      'Mid-session check. Confirm your discipline before the next setup.',
    ],
    caution: [
      'Caution state detected. Slow down before the next decision.',
      'Pause. Re-check your rules. One bad trade can undo a clean session.',
    ],
    high_risk: [
      'High Risk state. Step back. Capital protection comes first.',
      'Stop and reassess. The mission is survival before profit.',
    ],
    locked_in: [
      'Locked in. Stay precise. Do not get creative.',
      'Good state. Keep the same discipline through the next setup.',
    ],
    mission_complete: [
      'Mission complete. Lock in the lesson before moving on.',
      'Session complete. Debrief, extract the data, and reset.',
    ],
    debrief_reminder: [
      'Mission complete. Debrief while the lesson is still fresh.',
      "Log the lesson. Today's data builds tomorrow's edge.",
    ],
    widget: [
      'Mission active. Stay disciplined.',
      'Focus locked. Execute the plan.',
    ],
    lock_screen: [
      'Protect capital. Follow the plan.',
      'Your mission is active. Stay sharp.',
    ],
  },
  positive: {
    daily_mission: [
      'Your mission is ready. Start calm. Trade with intention.',
      'New session, new opportunity to build discipline.',
    ],
    session_start: [
      'Stay patient. You do not need every move, only the right one.',
      'You are prepared. Let the plan lead.',
    ],
    mid_session_checkin: [
      'Take a breath. Reset your focus before the next decision.',
      'Check in with yourself. Calm execution wins.',
    ],
    caution: [
      'Slow down. You can reset right now. One calm decision changes the session.',
      'Take a breath. Protect your progress.',
    ],
    high_risk: [
      'Pause for a moment. Protecting yourself is strength.',
      'Step back. You can always trade again when your mind is clear.',
    ],
    locked_in: [
      'You are focused. Keep trusting your process.',
      'Great discipline. Stay steady and let the setup come to you.',
    ],
    mission_complete: [
      'Good work completing the mission. Capture the lesson and keep growing.',
      'You showed up. Now turn the session into wisdom.',
    ],
    debrief_reminder: [
      'Good work showing up. Capture the lesson before it fades.',
      'Your growth is in the review. Complete the debrief.',
    ],
    widget: [
      'Stay steady. One decision at a time.',
      'Your focus is active. Keep it simple.',
    ],
    lock_screen: [
      'You are building discipline today.',
      'Stay calm. Let the plan lead.',
    ],
  },
};
