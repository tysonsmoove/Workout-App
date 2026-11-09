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
| `src/30-score.js` | Weekly score, coaching tips, competition history, badges |
| `src/40-nutrition.js` | Calorie and water targets, food log, food search, Nutrition Facts label |
| `src/50-fx.js` | Overlays, confetti, celebrations |
| `src/60…80-ui-*.js` | Screens: Train, Fuel, Compete, Me |
| `src/90-main.js` | Render loop, events, routing, boot |
| `tools/build_foods.py` | Builds `foods.json` from USDA FoodData Central downloads |
| `tests/` | Playwright suites |

`build.js` concatenates the numbered modules into one closure, so they share a scope in filename order.

## Profiles

Two fixed profiles, `tyson` and `jacquie`. Each phone remembers which one it uses (`localStorage ml.me`); the button at the top right switches. A profile holds its name, avatar, look, workout style, body numbers, doctor's numbers, weigh-ins, favorites and earned badges.

Workout style is a profile setting:

- **Lifting program** (Tyson by default): the Push → Pull → Legs rotation with an Apple Fitness+ treadmill block, weight suggestions, phases and drafts. Unchanged from the earlier single-user version.
- **Pick-your-own** (Jacquie by default): choose from about 35 low-impact activities (walks, stretching, easy cardio, light strength, recovery, everyday movement) and log minutes. A day counts as active at a personal minimum (10 minutes by default). Areas with old injuries can be marked; activities that load them are flagged, sorted lower and skipped by Surprise me.

## Weekly competition

Monday to Sunday, 100 points, each person scored against their own goals:

| Part | Points | How |
|---|---|---|
| Move | 50 | Share of the personal weekly goal. Lifting program: 30 for activity days + 20 for lift days (3). Pick-your-own: 50 for active days. |
| Fuel | 20 | Days logged inside the calorie range (80–110% of target). Five fills it; a logged day outside the range earns half. |
| Water | 15 | Each day earns the share of the water goal drunk. Five full days fills it. |
| Bonus | 15 | 5 each: more active minutes than your own last week, three kinds of activity, moving on Saturday or Sunday. |

Scores are derived from the saved logs, so edits never double-count. A finished week stays open through Tuesday for late entries, then its result is stored at `results/<monday>` and is final. The Compete tab lists actions available today with the points each would add, and the shortest set that passes the other person.

Badges are derived from the logs and recorded on the profile the day they are earned, so later goal changes do not remove them.

## Nutrition

- **Targets.** Calories: Mifflin-St Jeor resting energy × activity factor, adjusted for the chosen pace (±250 or −500 kcal), never below 1,200 (women) / 1,500 (men). Water: the National Academies beverage guideline by sex (about 9 cups / 72 oz for women, 13 cups / 104 oz for men), raised to half of body weight in ounces when that is more, capped at 128 oz. A calorie or water number entered from a doctor replaces the estimate. These are general estimates, not medical advice.
- **Food database.** `foods.json` holds 12,625 foods from USDA FoodData Central (FNDDS 2021–2023 and SR Legacy, public domain) with 14 nutrients per 100 g and up to five household portions each. Rebuild with:

  ```
  python3 tools/build_foods.py <sr_legacy_csv_dir> <fndds_csv_dir> foods.json
  ```

- **Logging.** Search, pick a portion and quantity, see the Nutrition Facts label, add to a meal. Logged items store their own nutrient values, so rebuilding the database never changes history. Quick add and saved custom foods cover anything not in the list.

## Storage

One path-addressed document store, backed by the artifact database when signed in with write access, otherwise by this browser's localStorage.

| Path | Contents |
|---|---|
| `sessions/<date>`, `settings/program` | Tyson's lifting log and program settings (original location, kept) |
| `profiles/<pid>` | Profile |
| `profiles/<pid>/sessions/<date>` | Other profile's workout log |
| `profiles/<pid>/food/<date>` | Food items and water for a day |
| `profiles/<pid>/settings/program` | Lifting settings for a non-Tyson profile |
| `foods/<id>` | Custom foods, shared |
| `results/<monday>` | Final weekly results |
| `comp/settings` | Competition start week, what is on the line |

The artifact declares `db` with read and write at the `interact` level, so someone who only has a view link sees none of the health data. Unsaved lifting drafts stay in localStorage per profile.

"Today" is the calendar day in `America/Indiana/Indianapolis`; all other date math is pure calendar arithmetic.

## Tests

Serve a doctype-wrapped copy of `index.html` with `foods.json` beside it on `http://127.0.0.1:8765`, then:

```
node tests/test.js       # lifting program: drafts, classification, blank sets, progression, dates, layouts, sync (148 checks)
node tests/app.test.js   # profiles, looks, pick-your-own, nutrition, competition, badges, storage paths, layouts (127 checks)
```
