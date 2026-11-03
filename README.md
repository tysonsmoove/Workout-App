# Morning Laps

Single-page workout log for Tyson's mornings at Anytime Fitness Avon (1124 N SR 267).

- Live app: https://claude.ai/artifact/WpxQrh73Td3TuyfYKvHaMr
- Source: `index.html` (published as a Claude artifact; uses the artifact `db` capability for account storage, with a localStorage fallback when signed out)

## What it does

- Push → Pull → Legs rotation that is not tied to weekdays. The next lift is the one after the last **counted** lift day, so a missed morning never desyncs the plan.
- Every session opens with an Apple Fitness+ treadmill block (20 / 25 / 30 min by phase).
- Weight suggestions per exercise from the last logged weight and reps, with a "Can't go higher" hold that switches to rep / set progression.
- Back-dated logging: pick any past day from the 7-day strip or the date field. Future dates are not loggable.
- Phases unlock after each completed week (3 counted lift days, Mon–Sun): Phase 2 adds exercises, Phase 3 swaps in squats, lunges and flys.
- Bodyweight core finisher (crunches, lying leg raises, bench knee tucks) on Pull and Legs days.
- Swap any machine for a dumbbell / barbell / cable fallback from the exercise's ··· menu (that workout only); the Program tab sets defaults for future workouts. The same menu holds "Can't go higher", Add a set (up to 5), Exercise details and Collapse.

## How records work

- Unsaved input is a **draft**, kept in this browser's localStorage per date (drafts older than 14 days are pruned). It survives swaps, tab switches, date changes and reloads, and is only cleared by Save or Discard.
- Save classifies the entry from its content, never from the selected tab: any logged set makes a lift entry; treadmill minutes alone make a treadmill entry; Rest is rest.
- A lift entry **counts as a lift day** (advances the rotation, earns weekly lift credit) when at least 2 non-core lifts have a logged set, or when the checkbox above Save is set by hand. Partial sessions still save.
- Sets are `null` when not entered; `0` is a recorded failed set. Only logged sets feed the weight rule.
- Each record stores its own exercise keys, phase, planned list and swaps, so later program changes never rewrite history.
- Records saved by the first version (no `v` field) are read conservatively: zeros are shown as not logged, and a "lift day" with no sets is surfaced as treadmill-only / needs review.

## Timezone

"Today" is computed in `America/Indiana/Indianapolis`; all other date math is pure calendar arithmetic (UTC), so DST changes never shift a day.

## Tests

`tests/test.js` (Playwright; serve a doctype-wrapped copy of `index.html` on http://127.0.0.1:8765 and run `node tests/test.js`) covers draft stability, classification, blank-vs-zero, progression, chronology, phase isolation, week/DST/year boundaries, layouts and a fake-db sync/failure scenario. 148 checks, plus `scratch review.js` state screenshots (menu open, 5 sets, long names, validation, save failed, 125% text, short viewport).
