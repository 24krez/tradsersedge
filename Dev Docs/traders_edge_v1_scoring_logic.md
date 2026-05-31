# Trader's Edge V1 Scoring Logic

Version: 1.0
Status: Implementation Spec
Last updated: 2026-05-30

## Purpose

The Discipline Score measures whether the trader followed a disciplined process. It never scores profitability, trading skill, market prediction, broker performance, or trade outcome.

The scoring system must feel:

- Fair
- Explainable
- Deterministic
- Based only on user-provided mission and debrief data
- Calm and improvement-oriented

## Non-negotiable Product Rule

Do not score or infer from:

- P&L
- Win rate
- Trade count
- Account balance
- Market direction
- Broker data
- Trade imports
- Chart data

Use only:

- Mission Setup
- Readiness Check
- Mid-session Check-ins
- Session Notes
- Mission Debrief
- Mission Complete event

## Required Inputs

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

No score is generated if any required input is missing.

## Score Categories

Total score: 100 points.

- Execution Integrity: 20
- Risk Discipline: 20
- Emotional Control: 20
- Mission Adherence: 20
- Self-Awareness: 20

## Calculation Order

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

## Execution Integrity

Input:

- `followedPlan`

Scoring:

- Yes = 20
- Mostly = 10
- No = 0

Grade caps:

- Mostly = max A-
- No = max B

## Risk Discipline

Inputs:

- `respectedStop`
- `stoppedAppropriately`

Scoring:

- Yes + Yes = 20
- Yes + Mostly = 15
- Mostly + Yes = 15
- Mostly + Mostly = 10
- Any one No = 5
- No + No = 0

Grade caps:

- Any one No = max B+
- No + No = max C

## Emotional Control

Inputs:

- `avoidedFomo`
- `avoidedRevenge`
- `emotionalControlValue`

Scoring:

- Avoided FOMO: Yes = 8, Mostly = 4, No = 0
- Avoided Revenge Trading: Yes = 8, Mostly = 4, No = 0
- Slider 80-100 = 4
- Slider 60-79 = 3
- Slider 40-59 = 2
- Slider 20-39 = 1
- Slider 0-19 = 0

Grade cap:

- Avoided FOMO = No and avoided revenge trading = No: max B

## Mission Adherence

Mission Adherence links the debrief back to the mission the user set before trading.

Scoring:

- Followed mission objective = 10
- Avoided primary threat = 5
- Stayed aligned with core focus = 5

Traded-day mapping:

- `followedPlan` maps to followed mission objective.
- The selected primary threat maps to the matching debrief behavior when available.
- `emotionalControlValue` plus selected core focus may support stayed-aligned scoring, but the app must show the exact reason used.

No-trade-day mapping:

- `followedMissionObjective` maps to followed mission objective.
- `avoidedForcingTrades` maps to avoided primary threat when the threat is FOMO, overtrading, entering early, or revenge trading.
- `remainedPatient` maps to stayed aligned with core focus when the core focus is Patience, Discipline, Emotional Control, or Risk Control.

If a mission setup item cannot be mapped to a concrete debrief input, award 0 for that sub-item and show `insufficient supporting input` in the score explanation.

## Self-Awareness

Inputs:

- Debrief completion
- `biggestLesson`
- `emotionalState`
- `selfAssessment`

Scoring:

- Completed Debrief = 5
- Entered Biggest Lesson Today = 5
- Selected Emotional State = 5
- Completed Self-Assessment = 5

`biggestLesson` must be non-empty and meaningful enough to display back to the user. V1 should use a simple validation threshold, such as at least 12 non-whitespace characters.

## No-trade Logic

If `didTrade = false`, use no-trade debrief scoring.

Input scoring:

- Yes = full credit for related item
- Mostly = half credit for related item
- No = zero credit for related item

The no-trade minimum rule applies when the user answered Yes to all three:

- Avoided forcing trades
- Protected capital
- Remained patient

If eligible, the final numeric score minimum is 90.

Important constraints:

- The no-trade minimum raises a lower score to 90; it does not raise any score above 90.
- It applies only after all required no-trade fields are present.
- It does not apply if any required no-trade discipline answer is Mostly or No.
- It does not apply if `biggestLesson` is blank or too short.
- It does not apply if the mission is missing objective, threat, or focus data.

Purpose: Trader's Edge rewards patience and capital protection, not activity.

## Numeric Score Caps

Numeric caps modify the final numeric score.

- Missing required input: no score generated.
- Debrief completed after 24 hours: max score 95.
- Mission completed without readiness check: max score 85.
- Mission completed without any mid-session check-in for sessions longer than 90 minutes: max score 90.

If multiple numeric caps apply, use the strictest cap.

## Grade System

- 95-100 = S
- 90-94 = A+
- 85-89 = A
- 80-84 = A-
- 75-79 = B+
- 70-74 = B
- 60-69 = C
- Below 60 = Recovery Required

Do not use D or F.

## Grade Caps

Grade caps modify only the displayed grade, not the numeric score.

- Followed plan = Mostly: max A-
- Followed plan = No: max B
- Either risk discipline answer = No: max B+
- Both risk discipline answers = No: max C
- Avoided FOMO = No and avoided revenge trading = No: max B

If multiple grade caps apply, use the strictest cap.

When a grade cap applies, show:

- Numeric score
- Capped grade
- Reason for capped grade

Example:

```text
Score: 91
Grade: B
Reason: Grade capped because trading plan was not followed.
```

## Score Explanation Contract

Every score result must include:

- Total numeric score
- Final grade
- Category breakdown
- Inputs used
- Points awarded
- Numeric caps applied
- Grade caps applied
- Strongest behavior
- Improvement area

Language should be direct but not shame-heavy.

Good:

```text
Your risk discipline was strong. The main improvement area is execution integrity because the mission plan was not followed.
```

Avoid:

```text
You failed your plan and lost discipline.
```

## Score Record Rules

Score records should be immutable.

Required stored fields:

- `id`
- `missionId`
- `userId`
- `executionIntegrity`
- `riskDiscipline`
- `emotionalControl`
- `missionAdherence`
- `selfAwareness`
- `rawTotalScore`
- `finalScore`
- `gradeBeforeCaps`
- `finalGrade`
- `numericCapsApplied`
- `gradeCapsApplied`
- `strongestBehavior`
- `improvementArea`
- `createdAt`

Users cannot write score records directly. Scores are generated server-side.

## Deterministic Test Cases

### Perfect Traded Session

Inputs:

- followedPlan = Yes
- respectedStop = Yes
- stoppedAppropriately = Yes
- avoidedFomo = Yes
- avoidedRevenge = Yes
- emotionalControlValue = 85
- complete self-awareness fields

Expected:

- Final score: 100
- Final grade: S
- No caps

### High Score With Plan Violation

Inputs:

- followedPlan = No
- all other categories strong

Expected:

- Numeric score may remain high depending on other inputs
- Final grade max: B
- Explanation must show plan cap reason

### Risk Failure

Inputs:

- respectedStop = No
- stoppedAppropriately = No

Expected:

- Risk Discipline: 0
- Final grade max: C

### Strong No-trade Discipline

Inputs:

- didTrade = false
- avoidedForcingTrades = Yes
- protectedCapital = Yes
- remainedPatient = Yes
- followedMissionObjective = Yes
- complete self-awareness fields

Expected:

- Final score minimum: 90
- Grade based on final score after caps

### No-trade With Partial Discipline

Inputs:

- didTrade = false
- avoidedForcingTrades = Mostly
- protectedCapital = Yes
- remainedPatient = Yes

Expected:

- No no-trade minimum
- Score calculated from actual category points

### Missing Input

Inputs:

- missing `emotionalControlValue` on traded debrief

Expected:

- No score generated
- Validation error returned

## Implementation Principle

The same inputs must always produce the same score. If the app cannot explain exactly why points were awarded, capped, or withheld, the logic is not ready for V1.

