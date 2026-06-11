# Future Feature: Elite Note Categories

## Status: Planned (Not Yet Scheduled)

## Summary

Elite account holders should be able to label and categorize their saved session notes when saving them. This provides better organization and faster recall during reviews.

## Note Categories

| Category | Description |
|---|---|
| **General** | Standard trading notes, observations, and reminders |
| **Impulse** | Notes capturing impulsive thoughts or urges that arose during the session |
| **Rule Warning** | Notes documenting rule violations, near-misses, or rule-related observations |
| **Emotional** | Notes capturing emotional states, triggers, and emotional patterns |

## Implementation Notes

- This is a **Pro/Elite-only** feature (gated by subscription tier).
- When a user saves a session note, they should be able to select a category.
- Default category should be **General** if no selection is made.
- Notes should be filterable/searchable by category in the Vault.
- The category label should be visually distinct on each note card (e.g., color-coded chip/tag).
- Firestore `session_notes` documents should include a `category` field.
- Category options may be expanded in future versions.

## Firestore Schema Addition

```typescript
// session_notes/{noteId}
{
  // ... existing fields
  category: 'general' | 'impulse' | 'rule_warning' | 'emotional';
}
```

## UI Considerations

- Category selector during note save (chip/pill style selector).
- Category badge/tag on note cards in the Vault and mission review screens.
- Filter controls in the Vault to filter by category.
- Color coding:
  - General → neutral/default
  - Impulse → amber/warning
  - Rule Warning → red/alert
  - Emotional → blue/cool tone
