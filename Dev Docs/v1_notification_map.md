# V1 Notification Architecture & Map (Day 12)

This document describes the current implementation of alerts and notifications within Trader's Edge.
As of Day 12, we are using **expo-notifications** with a WEEKLY trigger schedule for basic time-based reminders.

## 1. Active Alerts
These alerts are actively wired into `alertScheduler.ts` and `notificationSettings.ts` and will schedule real notifications.

| Alert | UI Toggle Source | Default Time | Behavior | Gating |
|---|---|---|---|---|
| **Daily Mission Briefing** | `lockScreen.missionBriefings` | 6:30 AM | `active` | Free |
| **Session Start Reminder** | `mission.missionStart` | User's Trading Start Time | `active` | Free |
| **Debrief Reminder** | `mission.debriefReminder` | 10 mins before Trading End Time | `active` | Pro |

*Note: Times use device local timezone. They trigger Monday through Friday.*

## 2. Inactive / Stubbed Alerts
These alerts exist in the settings UI and data models, but return honest statuses when synced instead of pretending to schedule. They are waiting for the Mission Engine state machine to dispatch runtime events.

| Alert | UI Toggle Source | Return Status | Gating |
|---|---|---|---|
| **Lock Screen Coaching** | `lockScreen.lockScreenCoaching` | `event_based_future` | Free |
| **Mid-Session Check-In** | `mission.midSessionCheckIn` | `event_based_future` | Pro |
| **Risk Warning** | `behavioral.highRiskAlerts` (or caution) | `placeholder_ready` | Pro |
| **Custom Alert Time** | `coaching.frequency !== 'low'` | `manual_only` | Pro |
| **Multiple Daily Reminders**| `mission.fifteenMinutesToClose` (or volatility) | `placeholder_ready` | Pro |
| **Advanced Coaching Alerts**| `intelligence.behavioralPatternReports` (or live activity) | `event_based_future` | Pro |

## 3. Data Flow & Save Behavior

1. **Local Editing:**
   - The user modifies settings in `NotificationSettingsScreen.tsx`.
   - Edits are held in local state `settings`. The "SAVE CHANGES" button animates in.
2. **Batch Save:**
   - On save, `settingsHaveNewEnables` checks if new permissions need requesting.
   - Profile's `alertSettings` is updated in Firestore.
   - `syncAlertSchedules()` is called, passing the user's custom Trading Hours.
3. **Reconciliation:**
   - `buildAlertPreferences()` maps the JSON toggles to the 9 defined alerts above.
   - `scheduleAlertPreference()` checks Pro gating, enabled status, and stub behavior.
   - It routes active alerts to `expo-notifications`, and cancels any that were disabled.
   - Actionable logs are printed via `logAlertAction()`.
4. **Deprecated Fields:**
   - Handled gracefully via `normalizeAlertSettings()` in the UI layer. Missing fields inherit `defaultAlertSettings`.

## Future Work (Post V1)
Event-based alerts require the `SessionEngine` and `MissionCockpit` to dispatch events (e.g. "Mission Hit High Risk", "Mission Completed") to the alert scheduler at runtime.
