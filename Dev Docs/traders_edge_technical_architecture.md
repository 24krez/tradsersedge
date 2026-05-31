# Trader's Edge Technical Architecture

## Document Purpose

This document defines the recommended technical architecture for Trader's Edge V1.

Trader's Edge is a trading discipline and mindset operating system. It helps traders create missions, stay focused during sessions, complete debriefs, receive discipline scores, and build behavioral intelligence over time.

The app does not connect to brokers in V1 and does not track P&L, win rate, trades, or account balances.

---

# Recommended Stack

## Mobile App

**Recommended:** React Native with Expo

### Why

- Single codebase for iOS and Android
- Faster MVP development
- Strong notification support
- Easier future web/desktop expansion
- Good developer ecosystem
- Works well with Firebase and RevenueCat

### V1 Target Platforms

- iOS
- Android

### V1.5 / V2

- Desktop companion
- Apple Watch
- Web dashboard

---

# Backend

## Recommended Backend

**Firebase**

### Services

- Firebase Authentication
- Firestore Database
- Firebase Cloud Functions
- Firebase Cloud Messaging
- Firebase Storage if needed later
- Firebase Analytics

### Why Firebase

- Fast MVP backend
- Strong mobile support
- Good authentication system
- Good notification ecosystem
- Serverless functions for score calculations and reports
- Works well with React Native / Expo

---

# Payments

## Recommended Payment Platform

**RevenueCat**

### Why

- Handles iOS and Android subscriptions
- Simplifies App Store and Google Play billing
- Supports trials, subscriptions, lifetime purchases, and restore purchases
- Easier entitlement management

### Entitlements

#### Free

`mission_mode`

#### Pro

`operator_intelligence`

---

# Localization

## Recommended Libraries

- i18next
- react-i18next
- expo-localization

Localization should be implemented before building screens.

All UI text, notifications, Live Activity text, Nook text, reports, and mission content should use localization keys.

### Folder Structure

```text
/locales
  /en
    common.json
    mission.json
    debrief.json
    progress.json
    vault.json
    profile.json
    notifications.json
  /es
    common.json
    mission.json
    debrief.json
    progress.json
    vault.json
    profile.json
    notifications.json
```

### V1 Language

- English

### Future Languages

- Spanish
- Portuguese
- French
- German

---

# App Architecture

## Recommended Folder Structure

```text
/src
  /app
    navigation
    routes
    providers

  /features
    /auth
    /onboarding
    /mission-setup
    /mission-active
    /readiness
    /debrief
    /progress
    /vault
    /profile
    /alerts
    /paywall
    /live-activities
    /nook

  /components
    /ui
    /cards
    /forms
    /charts
    /modals

  /services
    firebase.ts
    authService.ts
    missionService.ts
    scoringService.ts
    notificationService.ts
    subscriptionService.ts
    localizationService.ts

  /logic
    disciplineScore.ts
    missionStatus.ts
    rankProgression.ts
    behavioralClassification.ts
    notificationRules.ts

  /constants
    objectives.ts
    threats.ts
    coreFocus.ts
    ranks.ts
    grades.ts
    missionTemplates.ts

  /types
    user.ts
    mission.ts
    checkin.ts
    debrief.ts
    score.ts
    notification.ts

  /locales
```

---

# Core Product Flow

```text
Onboarding
↓
Mission Setup
↓
Readiness Check
↓
Mission Active
↓
Mid-Session Check-Ins
↓
Mission Complete
↓
Mission Debrief
↓
Mission Complete Modal
↓
Progress + Vault + Profile Updates
```

---

# Free vs Pro Architecture

## Free Tier: Mission Mode

Free users can access:

- Mission Setup
- Objective selection
- Threat selection
- Core Focus selection
- Readiness Check
- Mission Active Lite
- Lock Screen Mission Briefings
- Dynamic Island / Nook
- Mid-Session Check-Ins
- Basic Session Notes
- Mission Status

Free users do not receive:

- Discipline Score
- Mission Debrief
- Progress Dashboard
- Vault
- Mission Reports
- Rank Progression
- Behavioral Intelligence Reports

---

## Pro Tier: Operator Intelligence

Pro users can access:

- Mission Debrief
- Discipline Score
- Behavior Grade
- Mission Complete Modal
- Progress Dashboard
- Vault
- Mission Archive
- Mission Reports
- Rank Progression
- Behavioral Classification
- Weekly Intelligence Reports
- Advanced Mission Active Dashboard
- Custom Mission Templates

---

# Entitlement Checks

All premium features should check RevenueCat entitlement:

```text
operator_intelligence
```

If entitlement is inactive, show upgrade prompt.

Feature gating should happen at both:

- UI level
- service/function level

---

# Firestore Data Architecture

## users

```json
{
  "id": "user_id",
  "email": "user@email.com",
  "name": "Torez",
  "callsign": "Raven",
  "operatorMotto": "Protect Capital First",
  "rank": "Elite Operator",
  "behavioralClassification": "Discipline First Trader",
  "isPro": false,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

## missions

```json
{
  "id": "mission_id",
  "userId": "user_id",
  "date": "2026-05-29",
  "objective": "protect_capital",
  "threats": ["fomo", "overtrading"],
  "coreFocus": "patience",
  "session": "new_york",
  "status": "active",
  "startTime": "09:30",
  "endTime": "13:00",
  "completedAt": null,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Mission Status Options

```text
draft
active
completed
archived
```

---

## mindset_checkins

```json
{
  "id": "checkin_id",
  "missionId": "mission_id",
  "userId": "user_id",
  "type": "pre_session",
  "confidence": "High",
  "patience": "Medium",
  "focus": "High",
  "missionStatus": "On Track",
  "createdAt": "timestamp"
}
```

### Type Options

```text
pre_session
mid_session
manual_update
```

---

## session_notes

```json
{
  "id": "note_id",
  "missionId": "mission_id",
  "userId": "user_id",
  "note": "Need more patience after first loss.",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

## mission_debriefs

```json
{
  "id": "debrief_id",
  "missionId": "mission_id",
  "userId": "user_id",
  "didTrade": true,
  "followedPlan": "Yes",
  "respectedStop": "Yes",
  "avoidedFomo": "Mostly",
  "avoidedRevenge": "Yes",
  "stoppedAppropriately": "Yes",
  "emotionalControlValue": 82,
  "emotionalState": "Focused",
  "exitReason": "No More Setups",
  "biggestLesson": "Wait for confirmation before entering.",
  "selfAssessment": "Strong",
  "completedAt": "timestamp"
}
```

---

## discipline_scores

```json
{
  "id": "score_id",
  "missionId": "mission_id",
  "userId": "user_id",
  "executionIntegrity": 20,
  "riskDiscipline": 20,
  "emotionalControl": 15,
  "missionAdherence": 18,
  "selfAwareness": 20,
  "totalScore": 93,
  "grade": "A+",
  "classification": "High Discipline Session",
  "createdAt": "timestamp"
}
```

---

## notification_preferences

```json
{
  "userId": "user_id",
  "missionStart": true,
  "midSessionCheckIns": true,
  "behavioralAlerts": true,
  "lockScreenBriefings": true,
  "nookMonitoring": true,
  "weeklyReports": true,
  "quietHoursEnabled": true,
  "quietStart": "18:00",
  "quietEnd": "07:00",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

## subscription_status

```json
{
  "userId": "user_id",
  "entitlement": "operator_intelligence",
  "status": "active",
  "productId": "traders_edge_pro_monthly",
  "expiresAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

# Firestore Security Rules

## Core Rules

- Users can only read and write their own documents.
- Missions must belong to the authenticated user.
- Check-ins must belong to the authenticated user.
- Debriefs must belong to the authenticated user.
- Scores must belong to the authenticated user.
- Notification preferences must belong to the authenticated user.

## Required Protections

- Prevent users from writing scores directly if scores are generated server-side.
- Prevent users from modifying rank directly.
- Prevent users from modifying behavioral classification directly.
- Prevent users from modifying subscription entitlements directly.

---

# Cloud Functions

## Required V1 Functions

### onDebriefCompleted

Triggered when Mission Debrief is completed.

Responsibilities:

- Calculate Discipline Score
- Calculate Grade
- Calculate Session Classification
- Update Mission status
- Update Progress metrics
- Update Rank if needed
- Update Behavioral Classification if needed
- Create Mission Report entry
- Trigger Mission Complete Modal data

---

### calculateWeeklyIntelligenceReport

Triggered weekly for Pro users.

Responsibilities:

- Analyze last 7 days of missions
- Identify most common threat
- Identify strongest trait
- Identify highest scoring focus
- Generate weekly insight report

---

### syncRevenueCatWebhook

Triggered by RevenueCat webhook.

Responsibilities:

- Update user entitlement
- Update subscription status
- Enable/disable Pro access

---

### scheduleMissionNotifications

Triggered when mission starts.

Responsibilities:

- Schedule mission start notification
- Schedule mid-session check-ins
- Schedule mission complete reminder
- Schedule debrief reminder

---

# Core Logic Modules

## disciplineScore.ts

Responsible for:

- Execution Integrity score
- Risk Discipline score
- Emotional Control score
- Mission Adherence score
- Self-Awareness score
- Total score
- Grade
- Session classification

---

## missionStatus.ts

Responsible for:

- On Track
- Caution
- High Risk
- Locked In

Inputs:

- Confidence
- Patience
- Focus
- Previous check-ins

---

## rankProgression.ts

Responsible for:

- Current rank
- Next rank
- Rank progress percentage
- Strong sessions remaining

Inputs:

- Average Discipline Score
- Completed Missions
- Current Streak

---

## behavioralClassification.ts

Responsible for:

- Discipline First Trader
- Capital Preserver
- Patience Specialist
- Risk Controller
- Execution Focused
- Consistency Builder
- Recovery Operator
- Caution Profile

Inputs:

- Last 30 missions
- Discipline scores
- Threat frequency
- Streak data

---

## notificationRules.ts

Responsible for:

- Mission start messages
- Mid-session check-ins
- Caution messages
- High Risk messages
- Locked In messages
- Mission complete reminders
- Weekly report reminders

---

# Notification Architecture

## Notification Types

### Mission Start

Trigger:

- Session start time

### Mid-Session Check-In

Trigger:

- Every 60 minutes during active session

### Behavioral Alert

Trigger:

- Mission Status becomes Caution or High Risk

### Positive Reinforcement

Trigger:

- Mission Status becomes Locked In

### Mission Complete Reminder

Trigger:

- Session end time

### Debrief Reminder

Trigger:

- 30 minutes after session end if Debrief incomplete

### Weekly Intelligence Report

Trigger:

- Sunday evening for Pro users

---

# Live Activities / Lock Screen

## iOS

Live Activities should be implemented using ActivityKit.

### Lock Screen Content

- Mission briefing title
- Coaching message
- Today's focus
- Mission status
- Session context
- Authority verified label

### Tap Behavior

Tap opens Mission Active.

---

# Dynamic Island / Nook

## States

### Compact

- Status icon
- Current focus

### Expanded

- Mission status
- Current focus
- Session
- Objective

### Check-In

- Mindset update due
- Tap to respond

### Caution

- Patience declining
- Tap to review mission

### High Risk

- Slow down
- Protect capital

### Locked In

- Patience maintained
- Mission on track

### Mission Complete

- Discipline Score ready
- Tap to Debrief

---

# Android Lock Screen Equivalent

Android will not exactly match iOS Dynamic Island.

Recommended Android V1:

- Push notifications
- Persistent notification during active session
- Home screen widget later
- Lock screen notification content

Android Nook equivalent should be treated as a future platform-specific adaptation.

---

# Analytics

## Recommended

Firebase Analytics

## Events To Track

- account_created
- onboarding_completed
- mission_created
- mission_started
- readiness_completed
- mindset_updated
- mission_completed
- debrief_started
- debrief_completed
- score_generated
- paywall_viewed
- subscription_started
- subscription_restored
- subscription_cancelled
- vault_opened
- progress_opened
- lock_screen_enabled
- nook_enabled

---

# Error Handling

## Required States

- No active mission
- Mission already active
- Debrief already completed
- Missing check-in data
- Notification permissions denied
- Subscription status unavailable
- Network unavailable
- Firestore write failed
- Cloud Function failed

---

# Offline Support

## V1 Recommendation

Basic offline support only.

Allow users to:

- View current mission
- Add session note
- Complete debrief locally

Sync when connection returns.

Use local storage:

- AsyncStorage
- MMKV

---

# Privacy

Trader's Edge stores sensitive behavioral data but not financial account data.

## Privacy Requirements

- No broker credentials
- No trading account balances
- No P&L tracking
- No trade execution data
- Allow data export
- Allow account deletion
- Clearly explain what data is collected

---

# V1 Technical Priorities

## Must Work

- Authentication
- Mission creation
- Mission active state
- Mindset check-ins
- Notifications
- Debrief
- Discipline score
- Paywall
- Progress
- Vault
- Profile

## Can Be V1.5

- Weekly Intelligence Reports
- Advanced behavioral reports
- Dynamic Island advanced states
- Android home screen widget
- Custom mission templates

---

# Technical Risks

## Live Activities

Risk:

- ActivityKit requires native iOS support and may be more complex in Expo.

Mitigation:

- Use Expo Dev Client or bare React Native if needed.

## Notifications

Risk:

- Scheduled notifications can behave differently across iOS and Android.

Mitigation:

- Test on real devices early.

## RevenueCat

Risk:

- Subscription state delays or webhook sync issues.

Mitigation:

- Use both local entitlement checks and webhook updates.

## Scoring Trust

Risk:

- Users may feel score is fake.

Mitigation:

- Always show "Why This Score?" breakdown.

---

# Recommended Build Order

1. Localization
2. Authentication
3. Firestore data models
4. Mission Setup
5. Readiness Check
6. Mission Active Lite
7. Mission Status Engine
8. Notifications
9. Mission Debrief
10. Discipline Score Engine
11. Mission Complete Modal
12. Paywall / RevenueCat
13. Progress
14. Vault
15. Profile
16. Alerts Command Center
17. Lock Screen Live Activity
18. Nook / Dynamic Island
19. QA
20. App Store Launch

---

# Final Technical Principle

Every piece of intelligence must come from:

- Mission Setup
- Mindset Check-ins
- Mission Debrief
- Session Notes
- Mission Activity

If the app cannot trace a result to real user input or mission activity, do not display it.

Trader's Edge should feel intelligent, but never fake.
