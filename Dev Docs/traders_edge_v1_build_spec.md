# Trader's Edge V1 Build Spec

Version: 1.0
Status: Build Source of Truth
Owner: Torez Mitchell
Last updated: 2026-05-30

## 1. Product Definition

Trader's Edge V1 is a mobile discipline and mindset operating system for traders.

The product helps users:

- Create a daily trading mission
- Check readiness before a session
- Stay aware of mindset during the session
- Receive discipline-focused reminders and alerts
- Complete a post-session debrief
- Convert user-entered behavior into discipline intelligence
- Track progress over time through Pro features

Trader's Edge does not provide trade signals, execute trades, connect to brokers, import trades, predict markets, or score profitability.

## 2. V1 Product Principle

Every piece of intelligence shown to the user must be traceable to one or more of:

- Mission Setup
- Readiness Check
- Mid-session Check-ins
- Session Notes
- Mission Debrief
- Mission Complete event

The app may feel intelligent, but it must never imply that it detected trading behavior automatically or analyzed brokerage/trading-account data.

Do not score:

- P&L
- Win rate
- Trade count
- Account balance
- Market direction
- Broker performance

Score only:

- Discipline
- Risk control
- Emotional control
- Mission adherence
- Self-awareness

## 3. Canonical V1 Scope

### Included In V1

- Authentication
- Onboarding
- Operator profile basics
- Localization framework
- Mission Setup
- Readiness Check
- Mission Active Lite
- Mission Status Engine
- Mid-session Check-ins
- Basic Session Notes
- Notifications
- iOS Lock Screen Live Activity
- Dynamic Island / Nook core states for iOS
- Mission Complete flow
- Mission Debrief for Pro users
- Discipline Score for Pro users
- Mission Results modal for Pro users
- Progress Center for Pro users
- Vault / Mission Archive for Pro users
- Rank Progression for Pro users
- Behavioral Classification for Pro users
- RevenueCat subscription system
- Firebase backend
- Basic offline support
- Privacy controls: data export and account deletion

### Explicitly Deferred From V1

- Broker integrations
- Prop firm integrations
- MT4 / MT5 integrations
- TradeLocker integrations
- Trade imports
- Trade execution
- P&L analytics
- Win-rate analytics
- AI coaching
- AI trade review
- AI setup grading
- Social features
- Friends
- Leaderboards
- Communities
- Apple Watch
- Desktop companion
- Web dashboard
- Android Dynamic Island/Nook equivalent
- Android home-screen widget
- Advanced behavioral reports
- Custom mission templates

## 4. Platform And Stack

### Mobile

- React Native with Expo
- V1 platforms: iOS and Android
- iOS-specific: ActivityKit for Live Activities and Dynamic Island/Nook
- Android V1 equivalent: push notifications, persistent active-session notification, and lock-screen notification content

### Backend

- Firebase Authentication
- Firestore
- Firebase Cloud Functions
- Firebase Cloud Messaging
- Firebase Analytics
- Firebase Storage only if later needed for user-generated assets

### Payments

- RevenueCat
- Canonical Pro entitlement: `operator_intelligence`

### Localization

Localization must be implemented before production screen work.

Required V1 locale:

- English

Initial namespace structure:

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
```

All UI text, notification copy, Live Activity copy, Nook copy, reports, and mission content must use localization keys.

## 5. Free Vs Pro Boundary

The canonical V1 commercial rule:

Free users can run live discipline missions. Pro users unlock post-session intelligence, scoring, history, and growth.

### Free Tier: Mission Mode

Free users can access:

- Mission Setup
- Objective selection
- Threat selection
- Core Focus selection
- Readiness Check
- Mission Active Lite
- Mission Status
- Mid-session Check-ins
- Basic Session Notes
- Lock Screen Mission Briefings
- Dynamic Island / Nook core monitoring on iOS
- Notification settings required for the free mission experience

Free users cannot access:

- Mission Debrief
- Discipline Score
- Behavior Grade
- Mission Results modal
- Progress Center
- Vault / Mission Archive
- Mission Reports
- Rank Progression
- Behavioral Classification
- Weekly Intelligence Reports
- Advanced Mission Active Dashboard
- Custom Mission Templates

### Pro Tier: Operator Intelligence

Pro users can access:

- Everything in Free
- Mission Debrief
- Discipline Score
- Behavior Grade
- Session Classification
- Mission Results modal
- Progress Center
- Vault / Mission Archive
- Mission Reports
- Rank Progression
- Behavioral Classification
- Weekly Intelligence Reports
- Advanced Mission Active Dashboard
- Future custom mission templates

### Upgrade Moment

The primary upgrade trigger occurs after mission completion.

Free users should see a mission-complete state that confirms the session is archived, then presents Pro as the way to unlock:

- Discipline Score
- Behavior Grade
- Biggest Threat
- Strongest Trait
- Weekly Reports
- Rank Progression

The paywall must not block creation or completion of a live mission.

## 6. Core User Flow

```text
Onboarding
-> Mission Setup
-> Readiness Check
-> Mission Active
-> Mid-session Check-ins
-> Mission Complete
-> Pro Paywall or Mission Debrief
-> Discipline Score
-> Mission Results
-> Progress / Vault / Profile Updates
```

## 7. Feature Requirements

### 7.1 Onboarding

Users must be able to:

- Create an account
- Set basic profile information
- Set a callsign
- Set or skip an operator motto
- Accept notification permission prompts at the right moment
- Understand that Trader's Edge tracks behavior and discipline, not profitability

Acceptance criteria:

- A user can complete onboarding and land in Mission Setup.
- A user can skip nonessential identity fields and edit them later.
- The app does not ask for broker credentials or trading-account data.

### 7.2 Mission Setup

Users must be able to create a mission with:

- Objective
- Primary threats
- Core focus
- Session
- Start time
- End time

Initial objective examples:

- Protect Capital
- Wait For Confirmation
- Follow The Plan
- Trade Less, Execute Better
- Stay Patient

Initial threat examples:

- FOMO
- Revenge Trading
- Overtrading
- Entering Early
- Ignoring Stop Loss
- Moving Targets

Initial core focus examples:

- Patience
- Risk Control
- Emotional Control
- Execution Quality
- Discipline

Acceptance criteria:

- A user can create one active mission for the selected day/session.
- The mission cannot start without objective, threat, focus, session, start time, and end time.
- If an active mission already exists, the user is routed to Mission Active instead of creating a duplicate active mission.

### 7.3 Readiness Check

Before starting a mission, users must enter:

- Confidence: Low / Medium / High
- Patience: Low / Medium / High
- Focus: Low / Medium / High

Acceptance criteria:

- Readiness Check creates a `pre_session` mindset check-in.
- Initial Mission Status is calculated immediately after completion.
- Mission Active opens after the readiness check.

### 7.4 Mission Active Lite

Free users must see:

- Objective
- Threats
- Core Focus
- Session timer
- Mission Status
- Latest check-in values
- Update Mindset action
- Add Session Note action
- Complete Mission action

Pro users may see additional intelligence previews, but V1 should avoid building a separate complex Pro dashboard until the free mission flow is stable.

Acceptance criteria:

- Mission Active clearly displays current mission status.
- A user can update mindset during the session.
- A user can add notes during the session.
- A user can complete the mission manually.
- Session end triggers a Mission Complete reminder if the mission is still active.

### 7.5 Mission Status Engine

Mission Status uses Confidence, Patience, and Focus.

Internal values:

- Low = 30
- Medium = 65
- High = 90

Display labels:

- On Track
- Caution
- High Risk
- Locked In

Rules:

- On Track: all three metrics are Medium or High.
- Caution: any one metric is Low.
- High Risk: two or more metrics are Low.
- Locked In: all three metrics are High for two consecutive check-ins.

Acceptance criteria:

- Status updates after every readiness check and mindset update.
- If multiple status rules match, use the most specific/highest-priority state in this order: High Risk, Locked In, Caution, On Track.
- Status is available to Mission Active, notifications, Live Activity, and Nook.

### 7.6 Mid-session Check-ins

Users must be prompted every 60 minutes during an active session.

Each check-in captures:

- Confidence
- Patience
- Focus
- Mission Status generated from those values

Acceptance criteria:

- Check-ins are not sent outside the active mission window.
- Quiet hours are respected.
- Check-ins are stored with `type = mid_session`.
- A missed check-in does not block mission completion.

### 7.7 Session Notes

Users must be able to create short notes during a mission.

Acceptance criteria:

- Notes belong to a mission and user.
- Notes can be created offline and synced later.
- Notes may be used as supporting context in Pro mission reports, but V1 must not infer unsupported behavior from notes.

### 7.8 Mission Complete

Users must be able to complete a mission manually.

Mission completion should:

- Set mission status to `completed`
- Set `completedAt`
- Stop mission reminders
- Route Free users to the Pro upgrade moment
- Route Pro users to Mission Debrief

Acceptance criteria:

- Completing a mission is idempotent.
- Completing a mission does not generate a Discipline Score unless a Pro debrief is completed.
- Free users can complete missions without upgrading.

### 7.9 Mission Debrief

Mission Debrief is a Pro feature in V1.

Traded-flow inputs:

- Did you trade today?
- Did you follow your trading plan?
- Did you respect your stop loss?
- Did you stop when you should have?
- Did you avoid FOMO?
- Did you avoid revenge trading?
- Emotional control slider: 0-100
- Emotional state
- Exit reason
- Biggest lesson today
- Self-assessment

No-trade-flow inputs:

- Did you avoid forcing trades?
- Did you remain patient?
- Did you protect capital?
- Did you follow your mission objective?
- Emotional state
- Biggest lesson today
- Self-assessment

Acceptance criteria:

- A debrief can be completed only once per completed mission.
- Required scoring fields must be present before score generation.
- Debrief completion triggers score generation.
- The user can see why each score was assigned.

### 7.10 Discipline Score

Discipline Score is a Pro feature in V1.

Total score: 100 points. The score measures discipline quality, not trading outcome.

Categories:

- Execution Integrity: 20 points
- Risk Discipline: 20 points
- Emotional Control: 20 points
- Mission Adherence: 20 points
- Self-Awareness: 20 points

#### Required Inputs

All scored debriefs require:

- `missionId`
- `userId`
- `didTrade`
- `emotionalState`
- `biggestLesson`
- `selfAssessment`

Traded debriefs also require:

- `followedPlan`
- `respectedStop`
- `stoppedAppropriately`
- `avoidedFomo`
- `avoidedRevenge`
- `emotionalControlValue`

No-trade debriefs also require:

- `avoidedForcingTrades`
- `remainedPatient`
- `protectedCapital`
- `followedMissionObjective`

If any required input is missing, score generation must fail with a validation error and no partial score should be saved.

#### Order Of Operations

Score generation must run in this order:

1. Validate user owns the mission and debrief.
2. Validate `operator_intelligence` entitlement.
3. Validate all required debrief inputs.
4. Calculate raw category scores.
5. Calculate raw total score.
6. Apply no-trade minimum rule if eligible.
7. Apply numeric score caps.
8. Assign grade from final numeric score.
9. Apply grade caps.
10. Create immutable score record.
11. Update progress, rank, classification, and mission report.

Score records should be treated as immutable. If V1 needs correction behavior later, create a replacement score with a reference to the prior score instead of editing the old score in place.

#### Execution Integrity

Question:

- Did you follow your trading plan?

Scoring:

- Yes = 20
- Mostly = 10
- No = 0

Rule:

- If answer is No, final grade cannot exceed B even if the numeric score is higher.
- If answer is Mostly, final grade cannot exceed A-.

#### Risk Discipline

Questions:

- Did you respect your stop loss?
- Did you stop when you should have?

Scoring:

- Yes + Yes = 20
- Yes + Mostly = 15
- Mostly + Mostly = 10
- Any No = 5
- No + No = 0

Rule:

- If either risk answer is No, final grade cannot exceed B+.
- If both risk answers are No, final grade cannot exceed C.

#### Emotional Control

Inputs:

- Did you avoid FOMO?
- Did you avoid revenge trading?
- Emotional control slider

Scoring:

- Avoided FOMO: Yes = 8, Mostly = 4, No = 0
- Avoided Revenge Trading: Yes = 8, Mostly = 4, No = 0
- Slider 80-100 = 4
- Slider 60-79 = 3
- Slider 40-59 = 2
- Slider 20-39 = 1
- Slider 0-19 = 0

Rule:

- If avoided FOMO and avoided revenge trading are both No, final grade cannot exceed B.

#### Mission Adherence

Based on Mission Setup.

Scoring:

- Followed mission objective = 10
- Avoided primary threat = 5
- Stayed aligned with core focus = 5

For traded days:

- `followedPlan` maps to followed mission objective.
- The selected primary threat maps to the matching debrief behavior when available.
- `emotionalControlValue` plus selected core focus may support stayed-aligned scoring, but the app must show the exact reason used.

For no-trade days:

- `followedMissionObjective` maps to followed mission objective.
- `avoidedForcingTrades` maps to avoided primary threat when the threat is FOMO, overtrading, entering early, or revenge trading.
- `remainedPatient` maps to stayed aligned with core focus when core focus is Patience, Discipline, Emotional Control, or Risk Control.

If the app cannot map a mission setup item to a concrete debrief input, award 0 for that sub-item and show "insufficient supporting input" in the score explanation.

#### Self-Awareness

Scoring:

- Completed Debrief = 5
- Entered Biggest Lesson Today = 5
- Selected Emotional State = 5
- Completed Self-Assessment = 5

#### No-trade Day Logic

If user did not trade:

- Yes = full credit for the related item
- Mostly = half credit for the related item
- No = zero credit for the related item

If user answered Yes to all three:

- Avoided forcing trades
- Protected capital
- Remained patient

Then minimum Discipline Score is 90.

The no-trade minimum applies only after all required no-trade fields are present. It raises the raw score to 90 if the calculated score is below 90. It does not raise the score above 90.

The no-trade minimum is not eligible if:

- The user marks any required no-trade discipline answer as Mostly or No.
- The biggest lesson field is blank or too short to show meaningful reflection.
- The user has no completed mission setup data for objective, threat, and focus.

Purpose: Trader's Edge rewards discipline, not activity.

#### Caps

Score caps modify the final numeric score. Grade caps modify only the displayed grade.

Numeric score caps:

- Missing required input: no score generated.
- Debrief completed after 24 hours: max score 95.
- Mission completed without any readiness check: max score 85.
- Mission completed without any mid-session check-in for sessions longer than 90 minutes: max score 90.

Grade caps:

- Followed plan = Mostly: max grade A-.
- Followed plan = No: max grade B.
- Either risk discipline answer = No: max grade B+.
- Both risk discipline answers = No: max grade C.
- Avoided FOMO = No and avoided revenge trading = No: max grade B.

When multiple caps apply, use the strictest cap.

#### Grade System

- 95-100 = S
- 90-94 = A+
- 85-89 = A
- 80-84 = A-
- 75-79 = B+
- 70-74 = B
- 60-69 = C
- Below 60 = Recovery Required

Do not use D or F.

If a grade cap applies, show both:

- Numeric score
- Capped grade
- Reason for capped grade

Example: `Score: 91, Grade: B, capped because trading plan was not followed.`

#### Score Explanation

Every score result must include a "Why This Score?" breakdown:

- Category score
- Inputs used
- Points awarded
- Caps applied
- One strongest behavior
- One improvement area

The explanation must avoid shame-heavy language. Use direct, calm language focused on next-session improvement.

Acceptance criteria:

- Score generation runs server-side.
- Users cannot directly write discipline scores.
- The score explanation shows category breakdowns.
- Grade caps are applied after numeric score calculation.
- No-trade minimum score cannot override missing required debrief inputs.
- Every score has a deterministic test case.
- The same inputs must always produce the same score.
- Score logic must not read P&L, win rate, broker data, trade count, or account balance.

### 7.11 Mission Results

Mission Results is a Pro feature in V1.

Results must show:

- Discipline Score
- Grade
- Strongest trait
- Improvement area
- Lesson captured
- Rank progress
- Link to full Mission Report or Vault entry

Acceptance criteria:

- Results are generated from the completed debrief and mission data.
- Results do not claim automatic trade detection.
- Results remain accessible later from Vault.

### 7.12 Progress Center

Progress Center is a Pro feature in V1.

Must show:

- Discipline trend
- Current streak
- Completed missions
- Average Discipline Score
- Rank
- Progress toward next rank
- Strongest category
- Most frequent threat

Acceptance criteria:

- Progress metrics update after score generation.
- Progress uses only completed missions with completed debriefs.
- Empty states explain that progress appears after completed Pro debriefs.

### 7.13 Vault / Mission Archive

Vault is a Pro feature in V1.

Must show:

- Completed mission archive
- Search
- Filters
- Mission report detail
- Score breakdown
- Debrief summary
- Lesson archive

Acceptance criteria:

- Users can open a completed mission from the archive.
- Users can filter by score, grade, session, threat, focus, and date range.
- Vault never shows another user's mission data.

### 7.14 Rank Progression

Rank is a Pro feature in V1.

Ranks:

- Recruit
- Operator
- Senior Operator
- Elite Operator
- Special Agent
- Director

Requirements:

- Recruit: average score 0-59
- Operator: average score 60-74 and 3+ completed missions
- Senior Operator: average score 75-84 and 7+ completed missions
- Elite Operator: average score 85-94 and 14+ completed missions
- Special Agent: average score 95+, 10+ completed missions, and 5+ current streak
- Director: average score 95+, 30+ completed missions, and 21+ current streak

Inputs:

- Average Discipline Score
- Completed Missions
- Current Streak

Acceptance criteria:

- Rank updates after score generation.
- Rank does not use profitability or trade count.
- User cannot directly modify rank.
- UI shows current rank, next rank, and progress requirement.

### 7.15 Behavioral Classification

Behavioral Classification is a Pro feature in V1.

Use the last 30 completed missions.

Classifications:

- Discipline First Trader: average Discipline Score >= 85 and mission completion rate >= 80%
- Capital Preserver: Risk Discipline average >= 90
- Patience Specialist: Avoided FOMO average >= 90
- Risk Controller: Risk Discipline is highest scoring category
- Execution Focused: Execution Integrity average >= 90
- Consistency Builder: current streak >= 14 days
- Recovery Operator: last 5 mission scores improved by 10+ points total
- Caution Profile: average Discipline Score < 70, or FOMO/Revenge Trading appears 5+ times in last 10 missions

Priority order:

1. Discipline First Trader
2. Capital Preserver
3. Patience Specialist
4. Risk Controller
5. Execution Focused
6. Consistency Builder
7. Recovery Operator
8. Caution Profile

Acceptance criteria:

- Classification updates after score generation.
- If multiple classifications match, priority order determines the display.
- Classification must show a simple reason based on user data.
- User cannot directly modify classification.

### 7.16 Notifications

Notification types:

- Mission Start
- Mid-session Check-in
- Behavioral Alert
- Positive Reinforcement
- Mission Complete Reminder
- Debrief Reminder
- Weekly Intelligence Report for Pro users

Triggers:

- Mission Start: selected session start time
- Mid-session Check-in: every 60 minutes during active session
- Behavioral Alert: Mission Status becomes Caution or High Risk
- Positive Reinforcement: Mission Status becomes Locked In
- Mission Complete Reminder: session end time
- Debrief Reminder: 30 minutes after session end if Pro debrief is incomplete
- Weekly Intelligence Report: Sunday evening for Pro users

Acceptance criteria:

- Notifications respect quiet hours.
- Notification permission denied state is handled gracefully.
- Notification copy uses localization keys.
- Tapping a mission notification opens the relevant mission screen.

### 7.17 iOS Live Activity And Dynamic Island / Nook

iOS Live Activity content:

- Mission briefing title
- Coaching message
- Today's focus
- Mission status
- Session context
- Authority verified label

Tap behavior:

- Tap opens Mission Active.

Dynamic Island / Nook states:

- Compact: status icon and current focus
- Expanded: mission status, focus, session, objective
- Check-In: mindset update due
- Caution: patience declining or similar status-specific warning
- High Risk: slow down / protect capital
- Locked In: mission on track
- Mission Complete: Debrief or upgrade action

Acceptance criteria:

- iOS Live Activity updates when Mission Status changes.
- Live Activity ends when mission is completed.
- Advanced Dynamic Island states may be simplified for launch if core mission visibility works reliably.

### 7.18 Android Lock-screen Equivalent

Android V1 should support:

- Push notifications
- Persistent notification during active session
- Lock-screen notification content

Acceptance criteria:

- Android users receive the core mission reminders and status updates.
- Android V1 does not promise an exact Dynamic Island/Nook equivalent.

## 8. Data Model

### users

```json
{
  "id": "user_id",
  "email": "user@email.com",
  "name": "Torez",
  "callsign": "Raven",
  "operatorMotto": "Protect Capital First",
  "rank": "Recruit",
  "behavioralClassification": null,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

Do not treat `isPro` as an independently editable source of truth. Entitlement state comes from RevenueCat and the server-managed subscription record.

### missions

```json
{
  "id": "mission_id",
  "userId": "user_id",
  "date": "2026-05-30",
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

Mission status values:

- draft
- active
- completed
- archived

### mindset_checkins

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

Type values:

- pre_session
- mid_session
- manual_update

### session_notes

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

### mission_debriefs

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

### discipline_scores

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

### notification_preferences

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

### subscription_status

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

## 9. Cloud Functions

### onDebriefCompleted

Triggered when a Pro Mission Debrief is completed.

Responsibilities:

- Validate entitlement
- Validate debrief ownership
- Validate required scoring inputs
- Calculate Discipline Score
- Calculate Grade
- Apply grade caps
- Calculate Session Classification
- Update Mission status if needed
- Update Progress metrics
- Update Rank if needed
- Update Behavioral Classification if needed
- Create or update Mission Report entry
- Return Mission Results payload

### calculateWeeklyIntelligenceReport

Triggered weekly for Pro users.

Responsibilities:

- Analyze last 7 days of completed scored missions
- Identify most common threat
- Identify strongest trait
- Identify highest scoring focus
- Generate weekly insight report from deterministic data

### syncRevenueCatWebhook

Triggered by RevenueCat webhook.

Responsibilities:

- Verify webhook authenticity
- Update `subscription_status`
- Enable or disable access to `operator_intelligence`
- Avoid exposing direct client-side writes to entitlements

### scheduleMissionNotifications

Triggered when mission starts or changes.

Responsibilities:

- Schedule mission start notification
- Schedule mid-session check-ins
- Schedule mission complete reminder
- Schedule debrief reminder when applicable
- Respect quiet hours and notification preferences

## 10. Security Rules

Required protections:

- Users can read and write only their own user-scoped documents.
- Missions must belong to the authenticated user.
- Check-ins must belong to the authenticated user.
- Session notes must belong to the authenticated user.
- Debriefs must belong to the authenticated user.
- Scores must belong to the authenticated user.
- Notification preferences must belong to the authenticated user.
- Users cannot write discipline scores directly.
- Users cannot modify rank directly.
- Users cannot modify behavioral classification directly.
- Users cannot modify subscription entitlements directly.

## 11. Analytics Events

Track:

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

Analytics must not include sensitive lesson text or full session notes unless explicitly approved later.

## 12. Offline Support

V1 supports basic offline behavior only.

Users may:

- View current mission
- Add session note
- Complete debrief locally

When connection returns:

- Sync pending writes
- Recalculate server-side score after synced debrief
- Show sync failure if server validation fails

Recommended local storage:

- AsyncStorage
- MMKV

## 13. Error States

Required states:

- No active mission
- Mission already active
- Debrief already completed
- Missing check-in data
- Missing required debrief field
- Notification permissions denied
- Subscription status unavailable
- Network unavailable
- Firestore write failed
- Cloud Function failed
- RevenueCat entitlement unavailable
- Offline data waiting to sync

## 14. Privacy Requirements

V1 must:

- Never ask for broker credentials
- Never ask for trading account balances
- Never track P&L
- Never execute trades
- Explain what behavioral data is collected
- Allow data export
- Allow account deletion
- Avoid using notes or lessons in analytics events

## 15. Recommended Build Order

1. Localization foundation
2. Authentication
3. Firestore models and security rules
4. RevenueCat entitlement foundation
5. Onboarding and operator profile basics
6. Mission Setup
7. Readiness Check
8. Mission Active Lite
9. Mission Status Engine
10. Session Notes
11. Notifications
12. Mission Complete
13. Paywall and upgrade moment
14. Mission Debrief
15. Discipline Score Engine
16. Mission Results
17. Progress Center
18. Vault / Mission Archive
19. Rank Progression
20. Behavioral Classification
21. iOS Live Activity
22. Dynamic Island / Nook core states
23. Android notification equivalent
24. Analytics
25. Offline sync polish
26. QA and launch preparation

## 16. V1 Completion Criteria

Trader's Edge V1 is complete when a trader can:

```text
Create Mission
-> Start Session
-> Receive Coaching
-> Use Lock Screen / Nook where supported
-> Complete Mission
-> Upgrade To Pro
-> Complete Debrief
-> Receive Discipline Score
-> Track Progress
-> Build Vault History
```

The launch version succeeds when the product delivers the core promise:

"A discipline and mindset operating system for traders."
