# Morning Laps

A phone-first fitness tracker for two people, Tyson and Jacquie: workouts, nutrition, water, a weekly competition scored fairly against each person's own goals, badges, and a look each profile sets for itself.

- Live app: https://claude.ai/artifact/WpxQrh73Td3TuyfYKvHaMr
- Built page: `index.html` (generated; do not edit by hand) plus `foods.json`
- Source: `src/`, built with `node build.js`

## Layout of the repo

| Path | What it holds |
|---|---|
| `src/shell.html`, `src/style.css` | Page shell and styles |
| `src/00-core.js` | Dates, state, looks, the path-addressed store (account database or this browser) |
| `src/10-program.js` | Lifting program: Push / Pull / Legs rotation, drafts, weight suggestions |
| `src/20-activities.js` | Pick-your-own menu of gentle activities |
| `src/30-score.js` | Weekly targets locked per week, weekly score, coaching tips, competition history, team weeks, badges |
| `src/40-nutrition.js` | Calorie and water targets, food log, food search, Nutrition Facts label |
| `src/45-health.js`, `src/72-ui-health.js` | Apple Health import: parser for text pasted from a Shortcut, and the paste box |
| `src/50-fx.js` | Overlays, confetti, celebrations |
| `src/55-rest.js` | Rest timer: its own bar outside the page, never part of the render loop |
| `src/60…80-ui-*.js` | Screens: Train, Fuel, Compete, Me |
| `src/90-main.js` | Render loop, events, routing, boot |
| `tools/build_foods.py` | Builds `foods.json` from USDA FoodData Central downloads |
| `tests/` | Playwright suites |

`build.js` concatenates the numbered modules into one closure, so they share a scope in filename order.

## Profiles

Two fixed profiles, `tyson` and `jacquie`. The signed-in person's account remembers which one they use, so the chooser shows once (see "What the account remembers" below); the button at the top right switches. A profile holds its name, avatar, look, workout style, body numbers, doctor's numbers, weigh-ins, favorites and earned badges.

Workout style is a profile setting:

- **Lifting program** (Tyson by default): the Push → Pull → Legs rotation with an Apple Fitness+ treadmill block, weight suggestions, phases and drafts. Unchanged from the earlier single-user version.
- **Pick-your-own** (Jacquie by default): choose from about 35 low-impact activities (walks, stretching, easy cardio, light strength, recovery, everyday movement) and log minutes. A day counts as active at a personal minimum (10 minutes by default). Areas with old injuries can be marked; activities that load them are flagged, sorted lower and skipped by Surprise me.

## Weekly competition

Monday to Sunday, 100 points, each person scored against their own goals:

| Part | Points | How |
|---|---|---|
| Move | 50 | Share of the personal weekly goal. Lifting program: 30 for activity days + 20 for lift days (3). Pick-your-own: 50 for active days. On either style, a day with no lift counts as an activity day with a treadmill entry or the minimum minutes of anything else (10 on the lifting program). |
| Fuel | 20 | Weeks from Mon 2026-11-23 (scoring version 2): each day is 0.7 for the calorie range (80–110% of target; a logged day outside it earns half of that) plus 0.3 for reaching 90% of the person's protein target. Five full days fills it. Earlier weeks (version 1): the calorie range alone. |
| Water | 15 | Each day earns the share of the water goal drunk. Five full days fills it. |
| Bonus | 15 | 5 each: more active minutes than your own last week, three kinds of activity, moving on Saturday or Sunday. The Apple Watch top-up adds minutes but is not a kind of activity. |

Scores are derived from the saved logs, so edits never double-count. The Compete tab lists actions available today with the points each would add, and the shortest set that passes the other person.

**Targets lock per week.** The first time the app is opened in a week it stores each person's targets at `profiles/<pid>/weekgoals/<monday>`: plan, move goal, lift goal, minutes that count, calorie target and range, water, protein, and the scoring version. Everything that scores a week (`weekGoals` → `dayInfo`, `weekFacts`, `scoreFacts`, `fuelParts`, `waterFrac`, `coach`, badge stats, the Fuel rings) reads that snapshot, so a settings change starts the next Monday and the screen says so. The earliest snapshot is never rewritten, with one exception: a week locked on placeholder calorie targets takes the person's first real ones. Weeks from before snapshots existed use the earliest later one. Snapshots are created in `lockWeeks()` (from `openWeek`, on load and on a new day), never from `render()`.

**Provisional, then final.** A finished week stays open through Tuesday for late entries. Until then the app shows only a quiet "Provisional: … leads" line. From Wednesday `closeWeeks()` stores the result at `results/<monday>` (scores, winner, that week's stakes, whether it was a team week); only then is the winner announced, once per phone (`ml.seenFinalWeek`). A stored result is never changed.

**Stakes** belong to one week (`comp/settings.stakesBy[<monday>]`), are copied into the result when the week closes, and the new week starts empty.

**Team.** A team week is one where both fill their own Move score. The Team card shows this week's progress, the streak of team weeks in a row (badges at 2 and 4), and an optional shared countdown (`comp/settings.countdown`: date, label, the day it was set) with the team weeks banked since it was set. When the points race is out of reach, the coach points to the team week.

Badges are derived from the logs and recorded on the profile the day they are earned, so later goal changes do not remove them.

## Nutrition

- **Targets.** Calories: Mifflin-St Jeor resting energy × activity factor, adjusted for the chosen pace (±250 or −500 kcal), never below 1,200 (women) / 1,500 (men). Water: the National Academies beverage guideline by sex (about 9 cups / 72 oz for women, 13 cups / 104 oz for men), raised to half of body weight in ounces when that is more, capped at 128 oz. A calorie or water number entered from a doctor replaces the estimate. These are general estimates, not medical advice.
- **Food database.** `foods.json` holds 12,625 foods from USDA FoodData Central (FNDDS 2021–2023 and SR Legacy, public domain) with 14 nutrients per 100 g and up to five household portions each. Rebuild with:

  ```
  python3 tools/build_foods.py <sr_legacy_csv_dir> <fndds_csv_dir> foods.json
  ```

- **Logging.** Search, pick a portion and quantity, see the Nutrition Facts label, add to a meal. Logged items store their own nutrient values, so rebuilding the database, or editing or deleting a custom food, never changes history. Quick add and saved custom foods cover anything not in the list; a custom food's sheet has Edit and Delete, usable by either person.

## Lifting log extras

- **One day, two kinds of entry.** A lift or treadmill record can carry an `acts` list. The program content decides the kind; the activities are extras whose minutes and kinds count. `logActivity` adds to a program day, saving a lift keeps the day's activities, and removing the lift from a combined day keeps them too.
- **Apple Watch top-up.** The day's Exercise Minutes stay on `profiles/<pid>/health/<date>.exercise`. The `hk-exercise` entry holds only `max(0, Watch total − hand-logged movement minutes)` and is recomputed in the same write whenever an activity is added, changed or removed (`watchTopUp`). On a lift or treadmill day the Watch minutes are shown, not added.
- **Swaps.** `EX[k].alt` is a list. A swap is never offered to an exercise already planned in another slot of that day (for default swaps: in any phase the exercise appears in). If two slots would land on the same exercise, the later one goes back to its planned exercise (`settleSwaps`), so a day always keeps its full count.
- **Set shortcuts.** "Same as last time" fills the suggested weight and last session's reps into empty fields; "Repeat for all sets" copies set 1 into the empty sets.
- **Rest timer** (`src/55-rest.js`). Logging a set for today starts a countdown (60, 90 or 120 seconds for main lifts, set on the Program tab; 60 for core and bodyweight). It is its own element outside `#main` and never calls `render()`.
- **Gym.** `profile.place`, edited on Me, shown in the header and the morning plan.

## Apple Health and Apple Watch

A web page cannot read Apple Health. A Shortcut on the iPhone copies the day's Exercise Minutes, steps, active calories, water and weight as text, and the user pastes it into the app. The steps to build the Shortcut are in `docs/apple-health-shortcut.md` and inside the app under Me. Imports are idempotent: Exercise Minutes become one entry holding only the minutes not already logged by hand.

## Storage

One path-addressed document store, backed by the artifact database when signed in with write access, otherwise by this browser's localStorage.

| Path | Contents |
|---|---|
| `sessions/<date>`, `settings/program` | Tyson's lifting log and program settings (original location, kept) |
| `profiles/<pid>` | Profile |
| `profiles/<pid>/sessions/<date>` | Other profile's workout log |
| `profiles/<pid>/food/<date>` | Food items and water for a day |
| `profiles/<pid>/health/<date>` | Steps, exercise minutes, active calories and distance imported from Apple Health |
| `profiles/<pid>/settings/program` | Lifting settings for a non-Tyson profile |
| `foods/<id>` | Custom foods, shared |
| `results/<monday>` | Final weekly results: scores, winner, stakes, team week. Written once, never changed |
| `profiles/<pid>/weekgoals/<monday>` | One snapshot of a person's targets for a week (see "Targets lock per week") |
| `comp/settings` | Competition start week, stakes per week (`stakesBy`), the shared countdown |
| `data/users/<id>/prefs` | Private to one signed-in person: which profile they use and the last weekly result shown (both per kind of device), badges already celebrated |
| `data/users/<id>/drafts` | Private to one signed-in person: unsaved lifting drafts |

The artifact declares `db` with read and write at the `interact` level, so someone who only has a view link sees none of the health data. Unsaved lifting drafts stay in localStorage per profile and are mirrored to the account.

### What the account remembers

An iPhone can empty a page's own storage between visits. The profile choice, the weekly result and badges already shown, and unsaved lifting drafts are therefore also written to `data/users/<id>/`, which only that signed-in person can read. Device storage answers first when it still holds a value; the account fills in when it does not. The page is not drawn until a profile is known, and the chooser appears only when neither the device nor the account knows one, or the account cannot be reached within ten seconds. Drafts are written 1.5 seconds after typing stops and at once when the page goes to the background; a draft older than the day's saved record is ignored. Two identical phones signed in to the same Claude account cannot be told apart, so each person should use their own account.

"Today" is the calendar day in `America/Indiana/Indianapolis`; all other date math is pure calendar arithmetic.

## Tests

Serve a doctype-wrapped copy of `index.html` with `foods.json` beside it on `http://127.0.0.1:8765`, then:

```
node tests/test.js       # lifting program: drafts, classification, blank sets, progression, dates, layouts, sync (148 checks)
node tests/app.test.js   # profiles, looks, pick-your-own, nutrition, competition, badges, storage paths, Apple Health import, sync, layouts (162 checks)
node tests/review.test.js # review regressions: writes before the log loads, old-day drafts, double taps, day rollover, season tally, coach gains, calorie floor, plural food search, lead changes, a dead connection (50 checks)
node tests/account.test.js # account memory: profile choice, weekly result and badges shown once, unsaved drafts, on a phone that empties its storage (29 checks)
node tests/v12.test.js     # version 12: swaps, weekly locks, provisional/final results, Watch top-up, combined days, gym, stakes, custom foods, team, set shortcuts, rest timer, protein scoring, smoke of every tab (135 checks)
```
