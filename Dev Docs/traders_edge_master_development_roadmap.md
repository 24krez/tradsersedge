# Trader's Edge Master Development Roadmap

## Status Review

**Last reviewed:** June 1, 2026

Trader's Edge is currently an Expo React Native app backed by Firebase Auth and Firestore. The build has a working authenticated shell, mission setup, readiness check, active mission state, mid-session mindset updates, session notes, mission completion, Pro-gated debrief entry, discipline scoring logic, Firestore persistence, profile editing, and multi-language resource files.

The app is not launch-ready yet. The largest unfinished surfaces are email/password auth, notification delivery, Live Activities/Dynamic Island, real subscription billing, full Mission Results reports, Progress, Vault, rank/classification integration, QA coverage, and store preparation.

## Current Implementation Snapshot

**Implemented or mostly implemented**
- Expo React Native app shell with bottom tabs for Mission, Progress, Vault, and Profile.
- Firebase config, anonymous sign-in, auth listener, user profile listener, and session persistence.
- Firestore security rules for users, missions, mindset check-ins, session notes, mission debriefs, discipline scores, notification preferences, and user stats.
- i18next setup with namespaces for common, mission, debrief, progress, vault, profile, and notifications across English, Spanish, French, and German.
- Mission setup with objective, threat, core focus, quick templates, mission preview, Firestore mission creation, and preference saving.
- Readiness check-in with confidence, patience, focus, mission status calculation, and Firestore check-in creation.
- Active mission screen with objective, threats, focus, mission status, session timer, mid-session mindset update, session notes, and mission completion flow.
- Debrief screen with traded and no-trade paths, Pro-gated psychological state and journaling controls, score preview, Firestore debrief persistence, mission completion update, and transactional user stats update.
- Discipline score, mission status, notification rule, session timer, rank progression, and behavioral classification logic modules.
- Profile screen with callsign, motto, subscription badge, read-only rank/classification display, user stats summary, save, and sign out.
- Pro upsell shell and subscription-tier gate using the current user profile.

**Partially implemented**
- User model contains callsign, motto, subscription tier, onboarding status, and mission preferences. Rank and classification are displayed but not computed or persisted.
- Mission results route now shows an initial reward/feedback report after debrief, but the full report experience is still incomplete.
- Progress and Vault tabs exist, but both screens are placeholders.
- Notification rule generation exists, but device scheduling, permissions, settings, and delivery are not implemented.
- Firestore indexes file exists, but required composite indexes have not been captured.
- Rank and behavioral classification engines exist, but they are not wired into profile, progress, results, or stats updates.
- Pro access is simulated through profile subscription tier. RevenueCat and real entitlement sync are not implemented.

**Not implemented**
- Email/password sign-up, login, and password reset.
- Onboarding flow beyond anonymous "connect via Firebase".
- Cloud Functions.
- Push notifications, local notifications, quiet hours, notification preferences UI, and notification execution.
- iOS Live Activities and Dynamic Island/Nook surfaces.
- RevenueCat subscriptions, restore purchases, and production paywall.
- Mission report/dossier screens.
- Progress analytics dashboard.
- Vault archive/search/filter/report experience.
- Automated tests and release QA suite.

---

## Phase 0 - Product Foundation

### Epic 0: Localization & Internationalization

**Goal:** Future-proof Trader's Edge for global expansion.

**Status:** Mostly implemented.

**Tasks**
- [x] Install i18next
- [x] Install react-i18next
- [x] Install expo-localization
- [x] Configure i18n bootstrap
- [x] Configure fallback language
- [x] Create localized resource namespaces
- [x] Add common translations
- [x] Add mission translations
- [x] Add debrief translations
- [x] Add progress translations
- [x] Add vault translations
- [x] Add profile translations
- [x] Add notifications translations
- [x] Add English resources
- [x] Add Spanish resources
- [x] Add French resources
- [x] Add German resources
- [x] Add locale-aware date/time format helpers
- [x] Add locale-aware number/percent format helpers
- [x] Keep translation architecture RTL-ready
- [ ] Replace remaining hard-coded UI strings in screens
- [ ] Add translation coverage check before release

---

## Phase 1 - Core Infrastructure

### Epic 1: Authentication & User Management

**Goal:** Create operator accounts and durable user identity.

**Status:** Anonymous auth is working. Production account auth is still needed.

**Tasks**
- [x] Firebase setup
- [x] Firebase Authentication setup
- [x] Anonymous sign-in
- [x] Auth state listener
- [x] Session persistence
- [x] Firestore user profile listener
- [x] Create user profile on first sign-in
- [x] Callsign field
- [x] Operator motto field
- [x] Subscription tier field
- [x] Mission preferences field
- [ ] Email/password sign-up
- [ ] Email/password login
- [ ] Password reset
- [ ] Account upgrade path from anonymous to email/password
- [ ] Onboarding completion state machine
- [ ] Rank field persistence
- [ ] Classification field persistence

### Epic 2: Database Architecture

**Goal:** Create all core collections and data access rules.

**Status:** Firestore client writes and rules exist for the core collections. Server-side processing and final index coverage are still open.

**Collections**
- [x] Users
- [x] User stats
- [x] Missions
- [x] Mindset check-ins
- [x] Session notes
- [x] Mission debriefs
- [x] Discipline scores rules coverage
- [x] Notification preferences rules coverage
- [x] Discipline score collection writes
- [ ] Notification preferences UI and writes
- [ ] Mission reports collection
- [ ] Weekly intelligence reports collection

**Backend**
- [x] Security rules
- [x] Firestore indexes file
- [ ] Required composite indexes for production queries
- [ ] Cloud Functions setup
- [ ] Server-side score aggregation
- [ ] Server-side rank/classification aggregation
- [x] Transactional user stats update after debrief
- [ ] Analytics events

---

## Phase 2 - Mission System (Free Tier)

### Epic 3: Mission Creation System

**Goal:** Allow users to create missions.

**Status:** Implemented for core V1 mission creation.

**Tasks**
- [x] Objective selection
- [x] Threat selection
- [x] Core focus selection
- [x] Mission preview
- [x] Default mission templates
- [x] Save mission to Firestore
- [x] Save mission preferences to user profile
- [x] Pending mission state
- [ ] Explicit session selection
- [ ] Custom session support in UI
- [ ] Validation and error messaging on save failures

### Epic 4: Readiness Engine

**Goal:** Assess mindset before trading.

**Status:** Implemented in logic and connected to Firestore.

**Tasks**
- [x] Confidence check
- [x] Patience check
- [x] Focus check
- [x] Readiness check-in persistence
- [x] Mission status calculation
- [x] On Track status
- [x] Caution status
- [x] High Risk status
- [x] Locked In status
- [x] Active mission update from readiness check
- [ ] Readiness history view
- [ ] Better empty/error states when no pending mission exists

### Epic 5: Mission Active Lite

**Goal:** Provide daily discipline support.

**Status:** Core active mission experience is implemented.

**Free Features**
- [x] Objective card
- [x] Threat display
- [x] Core focus display
- [x] Mission status display
- [x] Session timer
- [x] Session progress bar
- [x] Update mindset
- [x] Session notes
- [x] Stats preview widgets when user stats exist
- [x] Complete mission modal
- [x] Completed mission state
- [x] Restart mission from completed state
- [ ] Robust loading and offline states
- [ ] Empty-state polish for first mission
- [ ] Better navigation after Free mission completion

**Pro Features**
- [x] Pro Mission Briefing (Pre-trade checklist & session gate)
- [x] Pro Mission Cockpit (Live mission tracking, intelligence & coaching)
- [x] Pro Mission Accomplished (Post-session review & discipline grade preview)
- [x] Market closed routing & restriction logic
- [x] Pro UI Intelligence components (coaching messages, mindset status)

### Epic 6: Notification Engine

**Goal:** Power mission coaching.

**Status:** Rule generation, local notification scheduling, and notification settings UI are implemented. Push notifications and Firebase Cloud Messaging integration remain open.

**Tasks**
- [x] Mission start rule
- [x] Mid-session check-in rule
- [x] Mission complete rule
- [x] Debrief reminder rule
- [x] Caution behavioral alert rule
- [x] High Risk behavioral alert rule
- [x] Locked In positive reinforcement rule
- [x] Quiet-hours filtering logic
- [x] Notification permissions
- [x] Local notification scheduling
- [ ] Push notification setup
- [ ] Firebase Cloud Messaging integration
- [x] Notification settings screen
- [ ] Polish Alert Screen UI
- [ ] Create Alert Preview component
- [ ] Quiet hours UI
- [ ] Delivery testing

### Epic 7: Lock Screen Live Activities

**Goal:** Keep mission visible while trading.

**Status:** Not implemented.

**States**
- [ ] Mission Briefing
- [ ] Mission Active
- [ ] Caution
- [ ] High Risk
- [ ] Locked In
- [ ] Mission Complete

**Features**
- [ ] Native iOS Live Activity bridge or plugin decision
- [ ] Deep linking
- [ ] Live updates
- [ ] Activity close on mission completion

### Epic 8: Dynamic Island / Nook

**Goal:** Glanceable mission awareness.

**Status:** Not implemented.

**Compact**
- [ ] Focus
- [ ] Status

**Expanded**
- [ ] Objective
- [ ] Remaining session
- [ ] Status

**Alert States**
- [ ] Caution
- [ ] High Risk
- [ ] Locked In

**Mission Complete**
- [ ] Debrief shortcut

---

## Phase 3 - Intelligence System (Pro Tier)

### Epic 9: Mission Debrief

**Goal:** Convert sessions into intelligence.

**Status:** Debrief entry, persistence, and initial reward feedback are implemented. Full results/report experience is still incomplete.

**Tasks**
- [x] Pro-gated debrief route
- [x] Traded/no-trade gateway
- [x] Traded execution checklist
- [x] No-trade checklist
- [x] No-trade reason capture
- [x] Psychological state slider
- [x] Emotion capture
- [x] Lesson/journal capture
- [x] Live discipline score preview
- [x] Firestore debrief persistence
- [x] User stats update after debrief completion
- [x] Duplicate stats update guard for archived debriefs
- [x] Read-only archived debrief loading
- [x] Existing debrief reuse instead of duplicate debrief creation
- [x] Duplicate score save guard for archived debriefs
- [x] Edit prevention and clearer locked archive state
- [ ] Self-assessment field
- [ ] Session duration calculation
- [ ] Full localization of debrief copy

### Epic 10: Discipline Engine

**Goal:** Calculate discipline score.

**Status:** Implemented in client logic and used by the debrief screen.

**Components**
- [x] Execution Integrity
- [x] Risk Discipline
- [x] Emotional Control
- [x] Mission Adherence
- [x] Self Awareness

**Outputs**
- [x] Discipline Score
- [x] Grade
- [x] Strongest behavior
- [x] Improvement area
- [x] Explanation strings
- [x] Numeric caps
- [x] Grade caps
- [x] Persist dedicated discipline_scores documents
- [ ] Add automated score fixture tests
- [ ] Move score finalization server-side or protect against client tampering

### Epic 11: Mission Results Experience

**Goal:** Deliver immediate feedback.

**Status:** Initial reward/feedback screen is implemented. Full report and progression details are still pending.

**Tasks**
- [x] Results screen UI
- [x] Reward/feedback command message
- [x] Grade display from saved debrief
- [x] Discipline score display
- [ ] Score breakdown display
- [x] Strongest trait
- [x] Improvement area
- [ ] Lesson captured
- [ ] Rank progress
- [ ] Free-to-Pro upgrade prompt where applicable

---

## Phase 4 - Growth Intelligence (Pro Tier)

### Epic 12: Progress Center

**Goal:** Visualize trader improvement.

**Status:** Tab exists, screen is a placeholder.

**Performance**
- [ ] Discipline trend
- [ ] Streak tracking
- [ ] Mission completion
- [ ] Trade/no-trade mix
- [ ] Average discipline score

**Insights**
- [ ] Threat analysis
- [ ] Strength analysis
- [ ] Improvement area
- [ ] Recent lesson highlights

**Rank Progress**
- [ ] Current rank
- [ ] Next rank
- [ ] Progress percentage

### Epic 13: Rank Progression System

**Goal:** Create long-term progression.

**Status:** Logic exists. Product integration is not wired.

**Ranks**
- [x] Recruit
- [x] Operator
- [x] Senior Operator
- [x] Elite Operator
- [x] Special Agent
- [x] Director

**Logic**
- [x] Rank calculation module
- [x] Next-rank progress percentage
- [x] Remaining requirements
- [ ] User stats integration
- [ ] Profile integration
- [ ] Progress integration
- [ ] Promotion event handling

### Epic 14: Behavioral Classification Engine

**Goal:** Define trader identity.

**Status:** Logic exists. Product integration is not wired.

**Classifications**
- [x] Discipline First Trader
- [x] Capital Preserver
- [x] Patience Specialist
- [x] Risk Controller
- [x] Execution Focused
- [x] Consistency Builder
- [x] Recovery Operator
- [x] Caution Profile

**Tasks**
- [x] Classification calculation module
- [x] Classification reasons
- [ ] Stats aggregation inputs
- [ ] Profile integration
- [ ] Report integration
- [ ] Automated classification tests

---

## Phase 5 - Intelligence Archive (Pro Tier)

### Epic 15: Vault

**Goal:** Store trader intelligence.

**Status:** Tab exists, screen is a placeholder.

**Features**
- [ ] Mission archive list
- [ ] Mission archive detail
- [ ] Search
- [ ] Filters
- [ ] Session notes archive
- [ ] Session notes search
- [ ] Weekly reports
- [ ] Behavioral reports
- [ ] Insight cards

### Epic 16: Mission Report System

**Goal:** Generate mission dossiers.

**Status:** Not implemented.

**Features**
- [ ] Mission report screen
- [ ] Session summary
- [ ] Threat review
- [ ] Grade breakdown
- [ ] Lesson archive
- [ ] Export/share support

---

## Phase 6 - Identity & Configuration

### Epic 17: Operator Dossier

**Goal:** Build trader identity.

**Status:** Basic profile editing is implemented. Computed identity still needs integration.

**Features**
- [x] Callsign
- [x] Motto
- [x] Subscription badge
- [x] Rank display placeholder/default
- [x] Classification display placeholder/default
- [x] Save profile
- [x] Sign out
- [ ] Rank persistence
- [ ] Classification persistence
- [ ] Mission preferences editor
- [x] Statistics summary
- [ ] Account management

### Epic 18: Alerts Command Center

**Goal:** Manage coaching systems.

**Status:** Not implemented.

**Features**
- [ ] Behavioral alerts toggle
- [ ] Mission alerts toggle
- [ ] Intelligence reports toggle
- [ ] Live Activities toggle
- [ ] Nook controls
- [ ] Coaching style
- [ ] Quiet hours

---

## Phase 7 - Monetization

### Epic 19: Subscription System

**Goal:** Convert Free users to Operator Intelligence.

**Status:** Pro gating shell exists. Real billing does not.

**Free Tier - Mission Mode**
- [x] Mission Setup
- [x] Mission Active Lite
- [x] Mid-session check-ins
- [x] Session Notes
- [x] Mission Status
- [ ] Lock Screen Briefings
- [ ] Dynamic Island / Nook

**Pro Tier - Operator Intelligence**
- [x] Mission Debrief screen
- [x] Discipline Score
- [x] Pro-only debrief controls
- [x] Archived debrief loading
- [x] Mission Results reward screen
- [ ] Progress
- [ ] Vault
- [ ] Rank Progression integration
- [ ] Behavioral Classification integration
- [ ] Weekly Reports
- [ ] Mission Archive
- [ ] Intelligence Reports

**Tasks**
- [x] Profile-based Pro gate
- [x] Pro upsell placeholder screen
- [ ] RevenueCat integration
- [ ] Entitlement sync
- [ ] Subscription management
- [ ] Restore purchases
- [ ] Production paywall screen
- [ ] Upgrade prompts across locked features

---

## Phase 8 - Launch Preparation

### Epic 20: QA & Testing

**Goal:** Prove the product works reliably before release.

**Status:** No automated test suite is currently defined in package scripts.

**Functional Testing**
- [ ] Mission flow
- [ ] Readiness flow
- [ ] Active mission mindset update flow
- [ ] Session notes flow
- [ ] Debrief flow
- [ ] Scoring engine fixtures
- [ ] Rank engine fixtures
- [ ] Classification engine fixtures
- [ ] Firestore rules tests

**Notification Testing**
- [ ] Lock Screen
- [ ] Nook
- [ ] Behavioral alerts
- [ ] Quiet hours

**Release Quality**
- [ ] TypeScript check script
- [ ] Lint script
- [ ] Unit test script
- [ ] Device smoke test checklist
- [ ] Error and empty-state audit

### Epic 21: App Store Launch

**Goal:** Prepare the public release.

**Assets**
- [ ] App icon
- [ ] Screenshots
- [ ] Promo video

**Store Listing**
- [ ] Description
- [ ] Keywords
- [ ] Metadata
- [ ] Privacy details
- [ ] Subscription copy

**Marketing**
- [ ] Landing page
- [ ] Waitlist
- [ ] TikTok content
- [ ] Reddit launch strategy

---

## Recommended Next Build Sequence

1. Finish the core loop by replacing `MissionResultsScreen`, `ProgressScreen`, and `VaultScreen` placeholders.
2. Add a real auth path: email/password sign-up, login, password reset, and anonymous-account upgrade.
3. Wire rank progression and behavioral classification into user stats, profile, progress, and results.
4. Add notification permissions, scheduling, settings, and quiet-hours UI before starting native Live Activities.
5. Integrate RevenueCat and replace profile-tier simulation with real entitlement sync.
6. Add automated tests for scoring, mission status, rank progression, classification, and Firestore rules.
7. Polish localization by removing remaining hard-coded strings from screens.

## MVP Completion Criteria

Trader's Edge V1 is complete when a trader can:

Create Mission -> Start Session -> Receive Coaching -> Use Lock Screen / Nook -> Complete Debrief -> Receive Discipline Score -> Track Progress -> Build Intelligence -> Upgrade To Pro

At that point, Trader's Edge delivers its core promise:

**"A discipline and mindset operating system for traders."**

---

## Future Architecture Note: Unified Mission Timeline

Do not build `mission_activity_events` on Day 6.

For now, continue using the existing collections:

* `missions`
* `mindset_checkins`
* `session_notes`
* `mission_debriefs`

However, leave the code structured so a future unified mission timeline can be added later.

### Future collection idea:
`mission_activity_events`

**Purpose:**
Create one unified timeline of everything that happens during a mission. This would make future Vault, Mission Reports, Weekly Intelligence, Progress insights, and behavioral analysis easier to build.

**Future document shape:**
```ts
{
  userId: string;
  missionId: string;
  type:
    | 'mission_started'
    | 'mindset_update'
    | 'session_note'
    | 'impulse_log'
    | 'rule_warning'
    | 'emotional_shift'
    | 'mission_completed'
    | 'debrief_completed';

  status?: 'locked_in' | 'on_track' | 'caution' | 'high_risk';
  note?: string;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
}
```

**Future use cases:**
* Vault mission timeline
* Mission detail history
* Mission report/dossier generation
* Weekly intelligence reports
* Behavioral pattern detection
* AI-style session recap
* Progress insights

**Important:**
Do not implement this collection now. Just avoid tightly coupling the Day 6 Pro Mission screens to the current collection structure so this timeline layer can be introduced later without a major rewrite.
