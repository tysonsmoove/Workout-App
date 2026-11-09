# Apple Health import: the "Laps Health" shortcut

A web page cannot read Apple Health or an Apple Watch. A Shortcut on the iPhone can. This one reads the day's
totals from Health, copies them as a few lines of text, and you paste them into Morning Laps.

Build it once on each iPhone. It takes about ten minutes. Apple Watch data is already in the Health app on the
paired iPhone, so the Watch needs nothing.

## What it brings in

| Health type | In Morning Laps |
|---|---|
| Exercise Minutes | Pick-your-own profile: counted as movement for the day. Only the minutes not already logged by hand are added, so nothing counts twice. Lifting-program profile: shown with the day. |
| Steps, Active Calories | Shown with the day. |
| Water | Raises the day's water to the Health total when that is higher. |
| Weight | Logged as a weigh-in. |

Apple's built-in Shortcuts actions expose daily totals but not the list of workouts. That is why movement comes
from Exercise Minutes rather than "20-minute Fitness+ walk".

## Build the shortcut

1. Open the **Shortcuts** app. Tap **+**. Tap the name at the top, choose **Rename**, and call it `Laps Health`.
2. Add the action **Find Health Samples** and set it up:
   - **Type**: Exercise Minutes
   - Tap **Add Filter** and set it to **Start Date** **is today**
   - Open the options (the arrow on the action): **Group by**: Day. Turn **Fill Missing** off if it is shown. Leave **Limit** off.
3. Add **Set Variable**. Name the variable `exercise`. Its value should already be the Health Samples from step 2.
4. Repeat steps 2 and 3 for each of these:

   | Type | Variable name | Notes |
   |---|---|---|
   | Steps | `steps` | Group by Day |
   | Active Calories | `active` | Group by Day. Called Active Energy on some iOS versions. |
   | Water | `water` | Group by Day. Unit: fl oz. |
   | Weight | `weight` | No grouping. Sort by: Start Date. Order: Latest First. Limit: on, 1 item. Unit: lb. |

5. Add **Format Date**. Date: Current Date. Date Format: Custom. Format String: `yyyy-MM-dd`
6. Add **Text** and type the six lines below. After each colon, insert the matching variable from the bar above
   the keyboard: Formatted Date on the first line, then your five named variables.

   ```
   date:
   exercise:
   steps:
   active:
   water:
   weight:
   ```

   Tap each of the five health variables after inserting it and choose **Value**, so only the number is copied.
7. Add **Copy to Clipboard**. It should read "Copy Text to clipboard".
8. Optional: add **Open URLs** with `https://claude.ai/artifact/WpxQrh73Td3TuyfYKvHaMr` so the shortcut ends by opening the app.
9. Tap **Done** and run the shortcut once. iOS asks whether Shortcuts may read each kind of Health data. Choose **Allow** each time.

For one-tap use, add the shortcut to the Home Screen from its menu.

## Use it

1. Run **Laps Health**.
2. In Morning Laps tap **Import from Health** (on Train, Fuel, or Me).
3. Tap the box and choose **Paste**.
4. Check the preview. Each line shows what will change. Switch off anything you do not want.
5. Tap **Import**.

Importing the same day again is safe: nothing is duplicated, and minutes you later log by hand replace the
imported ones.

## What the app accepts

Lines of `label: value`, in any order, any subset. Units are optional.

```
date: 2026-11-09
exercise: 42
steps: 8,421
active: 512 kcal
water: 64 fl oz
weight: 198.4 lb
```

- **date**: `2026-11-09`, `Nov 9, 2026`, or `11/9/26`. Left out, the day selected in the app is used. Future dates are refused.
- **water**: fl oz by default; mL, L and cups are converted.
- **weight**: lb by default; kg and stone are converted.
- **exercise**: minutes by default; hours are converted.
- Several numbers under one label, one per line, are added up (except weight, where the first wins).
- A blank value means Health had nothing for that type and is skipped.

## If something is missing

- Open the **Health** app, tap your picture, then **Apps**, then **Shortcuts**, and switch on the types the shortcut reads.
- A number followed by extra text such as dates means **Value** was not chosen for that variable in step 6.
- Exercise Minutes need an Apple Watch. Without one, leave that line out.

## Privacy

The shortcut copies only these six lines. The text goes from the clipboard into the app and is stored in the
same shared log as everything else in Morning Laps.
