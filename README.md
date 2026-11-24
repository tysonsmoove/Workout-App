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
| `src/55-rest.js` | Rest timer: a bar in the foot of the lift sheet, patched in place, never part of the render loop |
| `src/60…80-ui-*.js` | Screens: Train, Fuel, Compete, Me |
| `src/57-moves.js` | The cool-down stretch sequence |
| `src/58-figure.js` | The articulated figure: joint solver, tempo, equipment shapes, the player (play, pause, slider, front view) |
| `src/59-figures.js` | One animation per exercise, circuit station and stretch |
| `src/59-guide-text.js` | The how-to card text for every move (`GUIDE`) |
| `src/66-guide.js` | The guide: the card, the muscle map, the guide sheet (`#gd`), the library, "My settings" |
| `src/61-ui-today.js` | Train: the Today card, the date sheet, the Add sheet, "Something else", the lift sheet |
| `src/62-ui-checkin.js` | Daily check-in, Healthplex cards and gym info, split and lift-goal settings, "Not at my gym" |
| `src/65-workout.js` | Workout mode: the full-screen guided session (`#wm`, outside `#main`) |
| `src/74-ui-scan.js` | Scan a barcode, read a Nutrition Facts label, describe a restaurant meal |
| `src/82-backup.js` | Backup: one JSON of every document, plus workouts and food as CSV |
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

## Additions that do not touch scoring (version 13)

None of these changes how points are scored. Weekly targets, scoring versions and stored results are read, never altered.

- **Saved meals and "Copy from yesterday"** (`src/70-ui-fuel.js`). A meal section offers the same meal from the day before, and "Save as a meal" keeps its items under a name at `profiles/<pid>/meals/<id>`. Add food lists "My meals" above Recent; one tap adds every item. Copies get new ids and keep the nutrition they were logged with; the whole meal is one write and one `celebrate()`.
- **Stalled lifts** (`stallFor`). Three normal sessions at one weight, none earning an increase, show "Stuck at … for 3 sessions" on the exercise: Reset (the next suggestion is about 90%, rounded to the exercise's step, `settings.resets`), Swap for 4 weeks (a default swap plus `settings.swapBack`, with an offer to switch back when the four weeks are up), or Dismiss (`settings.stallSeen`, hidden until three later sessions stall). Not for bodyweight moves or lifts marked "Can't go higher".
- **Deload weeks** (`deloadState`, `deloadOn`). After every 5 completed lift weeks the Train screen offers one: 2 sets per lift at about 90%. Sessions are saved with `deload: true`; `lastLog`, `suggest` and the stall check read past them, so the week after picks up from the last normal session. A deload set counts 4.5 minutes instead of 3, so a recovery week with the same lift days has the same minutes and the same points.
- **History, By exercise**: a trend line of weight over time with deload sessions drawn hollow, and the best set.
- **Reminders** (Me). Setup steps for three iOS Shortcuts automations, filled in with the times each person picks (`profile.reminders`). The times are only used for the instructions; the phone does the reminding.
- **Health import sheet.** The text box takes focus in the same tap that opens the sheet, so the iPhone's own Paste is one tap away. (Version 13 had a "Paste from clipboard" button; claude.ai does not let a page read the clipboard, so version 15 removed it.)
- **Last week's recap** (Compete, and the final-result announcement): active days, minutes, best weight increase, days in calorie range, days the water goal was met, badges earned. Provisional until the week is final.
- **IOUs** (Season). Every closed week with stakes and a winner, with a Paid toggle stored at `iou/<monday>`.
- **Goal nudge** (`goalNudge`). After three finished weeks in a row with a full Move score at the current goal, Train offers one more day (never past 7, or 6 on the lifting program). "Raise it" changes the setting, which locks next Monday like any goal change; "Not now" hides the card for 3 weeks (`profile.goalNudge`).
- **Pain notes** (`painNotes`). History counts "Something hurt" notes from the last 30 days by activity and by the body areas each activity loads. Two or more on one activity flag it in the menu, sort it last and keep Surprise me away from it.

## Version 15: fixes, scanning, estimates, undo, backup

Nothing here changes scoring. The weekly race, locked weekly targets, scoring versions, `results/` and `iou/` are read, never altered.

### Capabilities

The artifact declares `db`, `user`, `sample` (with images) and `downloads`. Declaring replaces the whole set, so `db` and `user` must always be restated; a republish that omits `capabilities` carries the stored set forward. `loadCaps()` asks for `sample` and `downloads` in the background (`caps` in `src/00-core.js`); either may resolve `null`, and nothing waits on them.

| Situation | Scan a barcode | Describe it | Backup |
|---|---|---|---|
| Available | A miss asks for a label photo and fills the form | Offered in Add food | "Download a backup" |
| `null` (not offered to this viewer) | A miss opens the blank form with the barcode | Hidden | "Copy backup", with its size |
| Declined (`not_granted`, `declined`) | Blank form with the barcode; no more questions this visit | Back to Add food, button hidden | "Not saved", button stays |
| Rate limited | Says so, keeps the controls | Says so, keeps the text | Says to wait, button stays |

`askJson()` never retries. A reply that is JSON wrapped in other text is unwrapped rather than asked for again.

### Fixes

- **Import from Health**: no clipboard button; the box has focus when the sheet opens; the empty box says "Tap here, then Paste".
- **Reset plus deload** (`suggest`): with a reset waiting during a deload week the suggestion is the lighter of the reset weight and 90% of the normal suggestion, not both applied. The reset stays waiting for the first normal session after the deload, because deload sessions are not read as the last session.
- **Stuck lifts** take one line under the exercise name, "Stuck at 50 lb · 3 sessions · Fix". Fix opens the Reset / Swap for 4 weeks / Dismiss choices in place (`state.stallOpen`).

### Scan a barcode (`src/74-ui-scan.js`)

- "Scan barcode" in Add food is a file input (`accept="image/*"`, `capture="environment"`) that covers its button, so the tap lands on the input itself.
- The photo is read in the page with ZXing, `@zxing/library@0.21.3` from cdn.jsdelivr.net, loaded the first time it is needed. It reads UPC-A, EAN-13 and EAN-8. That version's own UPC-E reader returns nothing, so UPC-E is read by `upceRow()` from the same binarized rows: guards, six digits, the parity pattern, clear space each side, a valid check digit, and agreement on two rows.
- Several looks at each photo: 1600, 1000 and 640 px, upright and turned 90°, and for a big photo the middle half at full detail.
- One stored form (`normBarcode`): 13 digits. A 12-digit UPC-A gets a leading 0, a UPC-E is expanded to UPC-A first, an EAN-8 stays 8 digits. The form shows a UPC-A as the 12 digits printed on the package.
- Custom foods (`foods/<id>`) carry an optional `barcode`. A match opens that food's sheet. A miss says "New product. Take a photo of the Nutrition Facts label.", shrinks the photo to about 1600 px, and asks Claude for JSON only: values per serving as printed, `null` for anything unreadable, never a guess. The Create a food form opens filled, with "Check these against the label." and "not read" marks on the null fields. A miss also offers "Link to a food we already made". Edit food shows the barcode and lets it be changed or cleared.
- An unreadable photo, or a reader that cannot load, falls back to typing the digits.
- Photos are held in memory for one read and never stored. Only confirmed numbers are saved.

### Describe a restaurant meal

"Describe it" (only when `sample` is available) takes a description and an optional plate photo, and returns an editable list: name, portion, calories, protein, carbs, fat. Logging writes the whole list to the chosen meal in one save with `src: "Estimate"`; those items show an "est." tag wherever they are listed.

### Undo after removing (`offerUndo`, `ACT.undo` in `src/50-fx.js`)

Removing a food, an activity, a rest day, a lift day, a saved meal or a custom food shows "Removed · Undo" for 6 seconds. Undo writes back the exact document that was there, in one write. If the document is no longer what the removal left, nothing is overwritten and it says "Can't undo, it changed on the other phone." A later change of our own to the same document withdraws the offer.

### Backup (`src/82-backup.js`, Me)

"Download a backup" saves three files named with today's date: `morning-laps-backup-<date>.json` (every shared document for both people, keyed by path: sessions, food, health, profiles, weekly goal snapshots, saved meals, shared foods, results, IOUs, competition settings), `morning-laps-workouts-<date>.csv` (one row per set, plus one per treadmill entry, activity and rest day) and `morning-laps-food-<date>.csv` (one row per item). Text cells that a spreadsheet would run as a formula get a leading apostrophe. Where files cannot be saved, "Copy backup" writes the same JSON to the clipboard inside the tap and says how big it is; if the clipboard refuses, the text is shown to copy by hand. The private per-account notes under `data/users/` are not part of the backup.

## Version 16: check-in, Full Body A/B, the Healthplex, workout mode

Scoring rules are unchanged. Goal changes still lock next Monday through the weekly snapshot.

### Split and goals (`src/10-program.js`)

- `settings.split`: `'full'` (Full Body A/B) or absent / `'ppl'` (Push / Pull / Legs). A profile that never chose keeps Push / Pull / Legs. Switching never rewrites a record: old days keep their `day`. `nextDayKey` follows `rotation()`; a day from the other split leads to the first day of the current one, so after switching the next lift is A.
- `DAYS.fba` and `DAYS.fbb` use the existing exercise keys, so weight history, swaps, stall checks and deloads carry over. Each slot has its own set count and rep range (`slots`); `specFor(key, date)` applies them, and the weight rule, the stall check and the set count read it. A 2-set slot moves up when both sets hit the top. Slots marked `optional` ("if there's time") are planned but not needed for `complete`.
- Phases do not apply to full-body days: the label is hidden, `phase` is still stored, earned phase badges stay.
- `deloadWeeks()` counts weeks that met the lift goal locked for that week (`weekGoals(pid, ws).liftGoal`). `completedWeeks()`, which drives phases, still uses 3.
- `settings.liftGoal`: 2 or 3, read by `liveGoals` and locked per week with the other targets.
- Full-body days open with a warm-up of 5 to 10 minutes, stored where treadmill minutes are (`treadmill.minutes`).
- "Not at my gym" (`notAtMyGym`) makes an exercise's free stand-in the default swap. `settleSwaps` means no slot is ever dropped.

### Daily check-in (`src/62-ui-checkin.js`)

Shown on Train for today: always on the lifting program, and for a pick-your-own profile once its gym is the Healthplex. Picking a choice only sets `state.ci`; nothing is written until a session is saved, and the saved day carries the answer as `checkin` (History shows "Felt: ..."). `checkinSuggest(pid, date)` applies the rules in order:

| Order | Lifting program | Suggests |
|---|---|---|
| 1 | The last saved day was sore (`checkin: 'sore'`, or an activity marked "Something hurt"), and the one before it was not | Recovery |
| 2 | Lifted yesterday | Cardio |
| 3 | Lifts still needed this week no longer fit with a day between them: `daysLeft <= 2 * need - 1` | Express lift |
| 4 | 3 or more days since the last lift | Full lift |
| 5 | Otherwise | Full lift on a weekday, cardio on a weekend |

Pick-your-own: sore last time, then active yesterday (low energy), otherwise feeling good. A choice whose activity loads a "Go easy on" area or has 2 or more recent pain notes is never suggested: a safe stand-in inside the choice is used, or the next gentlest choice, with the reason. An express session plans the first 3 lifts (`EXPRESS_LIFTS`). Classes and court games sit behind a smaller link and are never suggested.

### The Healthplex (`src/20-activities.js`)

Activities with `cat: 'healthplex'` show only when `atHealthplex(pid)` (the gym name contains "Healthplex"). `cls` marks group classes: tagged, never suggested, skipped by Surprise me, needed by no goal or badge. `heat` marks the sauna, steam room and whirlpool: `mv: false` recovery entries, default 10 minutes, capped at 20, with one safety line and a "+16.9 oz water" offer after logging. `TRACK_LAPS = 8` laps make a mile. The gym facts on the Program tab are from the Healthplex website, November 2026; no Healthplex artwork is used anywhere.

### Workout mode (`src/65-workout.js`)

`#wm` is a fixed, full-view element outside `#main`. While `wm` is set, `render()` returns at once, so the page behind is not redrawn; closing redraws it. It adds no data shape:

- **Lifts** write into the same draft as the lifting log (`draft.ex`, `draft.tm`), plus `draft.wm` to mark a session in progress, and finish through the same `save()`.
- **Cardio, guided and recovery sessions** are stages (`laps`, `lengths`, `timer`, `circuit`, `stretch`, `heat`). Progress is kept on the phone in `ml.wm`. Finishing logs every moving stage as one activity through `logActivity()`, with laps, miles or station sets in the note, and a recovery room as its own recovery entry. The treadmill finishes as the lifting log's own treadmill day.
- Start tries the Fullscreen API and a screen wake lock and ignores a refusal.
- `prefers-reduced-motion` skips the start sequence, shows each demo as a still of its key position and turns off bursts and pick animations.

## Version 17: log it or go live, calmer animations, a tidier Train

Scoring, the season, `results/` and `iou/` are untouched. Two fields are new, both on the profile and both optional: `trainMode` (`'log'` or `'live'`) and `motion` (`'subtle'`, `'full'` or `'off'`).

### Log it or go live (`src/62-ui-checkin.js`)

- **The switch.** `#modeSwitch` sits at the top of Train for both profiles. `modeOf(pid)` reads `profile.trainMode` and defaults to `'log'`. It only decides which of the two preview buttons is the primary one.
- **The preview** has two equal buttons, `#ciLog` and `#ciStart`. Rest keeps its single `#ciRest` button.
- **Log it, lifts.** The choice goes on the draft (`kindSel`, `checkin`), the check-in collapses to one line, the page scrolls to `#logHead` and the first weight field takes focus. Saving is the ordinary Save button. "Short on time" shows the first `EXPRESS_LIFTS` lifts; the rest sit in `#moreLifts` and save with the others when filled (`plannedFor` in `src/10-program.js`).
- **Log it, everything else.** `OV.cilog` is one sheet built from the same parts as the live session (`ciStages`): an activity picker, minutes, laps for the track or lengths for the pool, and for recovery an optional sauna, steam or whirlpool. It logs one activity through `logActivity()` with laps and miles in the note, plus a recovery entry (`mv: false`) for the room. The treadmill saves as the lifting log's own treadmill day; on a day that already holds lifts the minutes go into that lift day's treadmill field instead, so the lifts are kept (`treadmillDraft`, also used by a live treadmill session).
- **One line once answered.** With a record for today, or a choice on the draft, the check-in is `#ciDone` plus `#ciChange`. Past days show no check-in and no switch.
- **Live finish screens.** `wm.fin` holds the minutes, laps and lengths shown on a timed session's finish screen. Typing there changes what `wmStageOutcome()` logs and redraws the summary. Going back to the session drops it, so the next Finish starts from the clock again.

### Animations (`motionOf` in `src/00-core.js`, `src/50-fx.js`)

`motionOf(pid)` is `'off'` when the phone asks for reduced motion, otherwise the profile's `motion`, default `'subtle'`. It is mirrored to `<html data-motion>` for the stylesheet.

- **Full** is version 16's behavior: bursts, start lights, the flag, flips and bounces. The celebration style applies only here.
- **Subtle** never calls `burst()`. `milestone()` runs one 600 ms sweep of the accent color across the top with a check mark, at most once per 1.5 s, and only for a weight increase, a badge, a lead change, this person's own week win or a team week. Live mode opens with a 200 ms fade and slide, a logged set fills its pip in 150 ms, and the finish screen has a thin checkered stripe and numbers that count up once.
- **Off** stops every animation and transition.
- `state.fxn` counts bursts and milestone effects for the tests.

### The top of Train (`src/60-ui-train.js`)

The check-in comes first. The deload offer, a swap-back offer and the goal nudge are one-line rows in a single `#coach` card (`coachHTML`), each a `<details>` that opens to the same text and buttons as before. Then `#logHead`, "Log your workout".

## Version 18: Train is one Today card

A layout change. Data shapes, saving rules and scoring are exactly as they were: every sheet ends in the same `save()`, `logActivity()` or `logRest()` as before, and `tests/v18.test.js` compares what the new sheets save against what version 17's screens saved for the same inputs.

### The Today card (`todayHTML` in `src/61-ui-today.js`)

Train is the same for both profiles and for every date: the subnav, one card, then the Coach rows.

- **Head.** The date chip (`#dateChip`) opens `OV.day`: the 7-day strip and the date picker. The Log it / Go live switch sits on its right. The title is "Today", or the date for a past day.
- **Check-in.** While nothing is logged for today, the check-in (`checkinHTML`) sits inside the card. Once the day has a row it is gone.
- **Rows.** `todayRows` draws one row per logged thing: the lift, treadmill or rest entry (`data-row="prog"`), each activity, and a row for sets typed but not saved (`data-row="draft"`). A tap opens that item's editor: the lift sheet, or the activity sheet with its saved values.
- **Add.** One full-width button, "Add to today" or "Add to <date>".
- **Gone from Train:** the lift form, the date card with its week strip, the "Log your workout" header, the activity grid, the "This week" card, the page-level sauna chip. The morning plan is on the Program tab. The Apple Health import button is in the Add sheet (and still on Fuel).

### The Add sheet (`OV.add`)

Four choices. With Go live selected, Lift, Cardio and Recovery start live mode instead.

- **Lift** names the next day and opens the lift sheet. For a pick-your-own profile it is "Machine circuit", logged as minutes.
- **Cardio** and **Recovery** open the same short sheet the check-in's "Log it" opens (`OV.cilog`, through `openCilog`).
- **Something else** (`OV.more`) is the activity menu: search, six recent and favorite activities (`quickActs`), the categories, and "Show all" for the whole grid. Classes keep their tag.
- A rest day and the Apple Health import are at the foot of the sheet.

Saving from any sheet closes it and marks the new row (`markRow`) for one 250 ms fade and slide.

### The lift sheet (`OV.lift`)

The typed-in lift log (`liftLogHTML` in `src/60-ui-train.js`) is drawn in a full-height sheet, never on the page. It opens from Add, from a lift check-in choice with "Log it", from a lift row, and from History's Edit.

- Three parts: a head (title, "Go live" or "Resume workout", close), a body that scrolls (`.ls-body`), and a foot that does not (`.ls-foot`): the rest timer, then the Save bar with "Remove".
- It uses the same draft, the same field ids and the same `save()`. `bind(root)` attaches the form's listeners to whichever root holds it; `render()` redraws the sheet with the page while it is open, keeping its scroll position and open sections; the typing guard covers its text fields.
- Saving closes the sheet. Closing it any way (`liftClosed`) stops the rest timer and redraws the page. A draft that was typed and not saved stays on the phone and shows as a row.
- **Rest timer fix.** The bar is part of the sheet's foot, so nothing scrolls underneath it and it cannot cover a button. It stops when the lift is saved or the sheet closes.

### Tests

Suites written before version 18 set `legacyDefault` in `tests/helpers.js`: a call that names a control which now lives in a sheet opens that sheet first. The version 18 suite runs without it and goes through the real buttons.

## Version 19: a guide for every move

The app said what to do. Now it also shows how, and with which equipment. Scoring and saving are unchanged: the guide reads the program and writes one thing only, a person's own "My settings" line on their profile.

### The figure (`src/58-figure.js`, `src/59-figures.js`)

One animation per move in `FIG`: all 33 exercises in `EX`, the circuit's row machine, and the 8 stretches. The other three circuit stations use their lift's picture (`FIG_ALIAS`).

- **Drawn from joint angles.** A pose is a few numbers: where the body is anchored (foot, hip, hand, shoulder or toe), the lean of the torso, and for each limb either its two directions or the point its hand or foot must reach (`fgIK` solves the elbow or knee). `fgSolve` returns every joint; limb lengths never change. The box is 200 x 150 units, 1 unit is about 1.77 cm.
- **Tempo.** `FG_TEMPO`: about 2 s lowering, a 0.5 s pause, about 1 s lifting, 0.5 s before the next rep. Pulls, curls and raises lift first. A stretch eases in, holds, eases out. Each phase has a label ("Lower", "Drive up").
- **Views.** Side view by default. Front view only where the move is judged that way (lateral raise, cable lateral raise, face pull, pec deck, two stretches). Squats, lunges and the rear-delt fly have both, with a toggle.
- **Equipment** is drawn from a few shapes in `EQ`, to scale: bench, incline back, rack with safety bar, plate, dumbbell, kettlebell, cable with its attachment, weight stack, pads and rollers where they sit on the machine.
- **Markers.** One or two numbered dots on the body at the key position, with their text in a legend that is always listed and lights up when the dots show, so nothing changes height during a rep.
- **The player** (`figHTML`): play or pause, a slider to drag through the rep, the view toggle. One `requestAnimationFrame` loop repaints the players on screen at about 30 frames a second and stops when there are none. With Animations off, or the phone's reduce-motion setting, a player opens paused on the key position with its markers; the slider and Play still work by hand.

To check poses after a change, render the first, middle and key frame of every view on contact sheets and look at them.

### The how-to card (`GUIDE` in `src/59-guide-text.js`, `guideCardHTML` in `src/66-guide.js`)

Every move has: Equipment (what to grab and where it usually is), Set up (2 to 4 steps), Do it (3 to 5 steps), Breathe, Feel it in, Common mistakes (2, each with its fix), Easier and harder.

- **Feel it in** is a front and back body outline (`mmHTML`) with the main muscles filled and the helpers lighter, and the same in words.
- **Easier and harder** name an exercise from that exercise's own `alt` list where there is one. In an open workout the button is "Swap to it": this workout only, the same `draft.swaps` write as Swap in the exercise's menu. Elsewhere it is "See it".
- **Go easy on.** When a move's `stress` list meets an area the person marked under "Go easy on", the card opens with a note naming it.
- The four circuit stations (`st_*`) and the eight stretches (`sx_*`) have their own cards, written gently.

### Where it shows

- **Lift sheet.** The exercise name is a button, and the ··· menu starts with "How to". Both open the guide sheet (`#gd`, its own element above `#ov`), so the lift sheet under it keeps its typed sets, its place and its rest timer. Escape, the close button or a tap outside closes the guide only.
- **Live mode.** The demo is the first thing on every exercise, circuit and stretch screen. "How to" sits under the logging controls and opens the full card below them, so no logging control moves. Each screen keeps its own scroll position across redraws and rests. In the machine circuit the demo follows the machine last tapped, and each machine has its own "How to".
- **Program tab (Plan for a pick-your-own profile).** "Exercise guide" (`guideLibHTML`): every move in five groups (Full Body A, Full Body B, other lifts, stretches, Healthplex activities) with a search box that filters in place by name, equipment or body part.

### My settings

A text field on every exercise and station guide, up to 60 characters, for example "Seat 4 · back pad 2 · handles middle". Saved by the Save button or Enter with `saveProfile(pid, { gear })` as `profiles/<pid>.gear[<move>].note`, so it is per person. Once set it shows in one line under the exercise name in the lift sheet and in live mode. Clearing the field and saving removes it.

### Not built yet

A photo of the machine next to "My settings" needs the `assets` capability. It is not in this version.

## Apple Health and Apple Watch

A web page cannot read Apple Health. A Shortcut on the iPhone copies the day's Exercise Minutes, steps, active calories, water and weight as text, and the user pastes it into the app. The steps to build the Shortcut are in `docs/apple-health-shortcut.md` and inside the app under Me. Imports are idempotent: Exercise Minutes become one entry holding only the minutes not already logged by hand.

## Storage

One path-addressed document store, backed by the artifact database when signed in with write access, otherwise by this browser's localStorage.

| Path | Contents |
|---|---|
| `sessions/<date>`, `settings/program` | Tyson's lifting log and program settings (original location, kept) |
| `profiles/<pid>` | Profile. Since version 19 also `gear`: that person's "My settings" line per move |
| `profiles/<pid>/sessions/<date>` | Other profile's workout log |
| `profiles/<pid>/food/<date>` | Food items and water for a day |
| `profiles/<pid>/health/<date>` | Steps, exercise minutes, active calories and distance imported from Apple Health |
| `profiles/<pid>/settings/program` | Lifting settings for a non-Tyson profile |
| `foods/<id>` | Custom foods, shared |
| `results/<monday>` | Final weekly results: scores, winner, stakes, team week. Written once, never changed |
| `iou/<monday>` | Whether what was on the line that week has been paid. Kept apart from `results/`, which is never modified |
| `profiles/<pid>/meals/<id>` | A person's saved meals: a name and a copy of the items |
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
node tests/v13.test.js     # version 13: saved meals, stalled lifts, deload weeks, reminders, weekly recap, IOUs, goal nudge, pain notes, smoke of every tab (98 checks)
node tests/v16.test.js     # version 16: check-in rules, Full Body A/B, Healthplex activities, lift goal, gym info, Not at my gym, Jacquie's check-in, workout mode, animations, smoke of every tab and workout-mode screen
node tests/v19.test.js     # version 19: every animation's joints, tempo, views, equipment and markers; the player; the 45 how-to cards; the guide in the lift sheet, live mode and the library; My settings; records identical to before
node tests/v18.test.js     # version 18: the Today card at 390 x 844, the lift sheet and its rest timer, the Add sheet in both modes, Jacquie's Train, past days, records identical to version 17's, smoke of every tab, sheet and live screen
node tests/v17.test.js     # version 17: the top of Train at 390 x 844, the Log it / Go live switch, logging every kind of session without live mode, live finish edits, Subtle / Full / Off animations, smoke of every tab, live screen and Log it sheet
ML_ZXING=/path/to/zxing/umd/index.min.js node tests/v15.test.js   # version 15: Health paste box, reset plus deload, stuck-lift lines, barcode scanning, meal estimates, undo, backup, smoke of every tab
```
