# Morning Laps

Single-page workout log for Tyson's mornings at Anytime Fitness Avon (1124 N SR 267).

- Live app: https://claude.ai/artifact/WpxQrh73Td3TuyfYKvHaMr
- Source: `index.html` (published as a Claude artifact; uses the artifact `db` capability for storage)

## What it does

- Push → Pull → Legs rotation that is not tied to weekdays. The next lift is always the one after the last logged lift, so a missed morning never desyncs the plan.
- Every session opens with an Apple Fitness+ treadmill block (20 / 25 / 30 min by phase).
- Weight suggestions per exercise from the last logged weight and reps, with a "Can't go higher" hold that switches to rep / set / tempo progression.
- Back-dated logging: pick any past day from the 7-day strip or the date field.
- Phases unlock after each completed week (3 logged lift days, Mon–Sun): Phase 2 adds exercises, Phase 3 swaps in squats, lunges and flys.
- Bodyweight core finisher (crunches, lying leg raises, bench knee tucks) on Pull and Legs days.
- Swap any machine for a dumbbell / barbell / cable fallback if the gym lacks it or it is busy.
