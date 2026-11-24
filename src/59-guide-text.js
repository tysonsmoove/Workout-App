// 59-guide-text.js: full how-to card text. Pure data, and the only top-level name is GUIDE.
// Keys: the 33 EX exercises, Jacquie's four circuit stations (st_*) and the eight cool-down stretches (sx_*, in
// STRETCHES order). Every entry has equip, where, setup (2 to 4), steps (3 to 5), breathe, main, also,
// mistakes (two [mistake, fix] pairs), easier and harder ({ k: EX key or null, text }) and stress (body areas).
const GUIDE = {
  // ----- Push -----
  chestpress: {
    equip: 'Chest press machine',
    where: 'Machine area: a seat with a back pad and two handles at chest height that push forward.',
    setup: [
      'Set the seat so the handles line up with the middle of your chest.',
      'Put the pin in the weight stack at the weight you want.',
      'Sit with your head and back on the pad and both feet flat on the floor.',
      'Grip the handles with straight wrists and your elbows a little below shoulder height.'
    ],
    steps: [
      'Pull your shoulder blades back and down against the pad.',
      'Press the handles forward until your arms are almost straight.',
      'Pause for a moment. Do not snap your elbows straight.',
      'Bring the handles back slowly until your hands are just in front of your chest.'
    ],
    breathe: 'Breathe out as you press, in as the handles come back.',
    main: ['chest'],
    also: ['shoulders', 'triceps'],
    mistakes: [
      ['Shoulders rolling forward', 'Keep your shoulder blades and head against the pad.'],
      ['Letting the weight stack slam', 'Return slowly and stop just before the plates touch.']
    ],
    easier: { k: null, text: 'Use a lighter weight and slow each rep down.' },
    harder: { k: 'dbbench', text: 'Dumbbell bench press: each arm has to steady its own weight.' },
    stress: ['shoulder', 'wrist']
  },
  dbbench: {
    equip: 'Two dumbbells, start at 30 lb each, and a flat bench',
    where: 'Free-weight area: the flat benches near the dumbbell rack.',
    setup: [
      'Sit on the end of the bench with a dumbbell standing on each thigh.',
      'Lie back and bring the weights to the sides of your chest, using your knees to help.',
      'Plant both feet flat on the floor.',
      'Pull your shoulder blades back and down. Keep your head, back and backside on the bench.'
    ],
    steps: [
      'Press both weights up until your arms are straight over your chest.',
      'Lower slowly with your elbows about halfway between your sides and straight out.',
      'Stop when the weights are beside your chest and your upper arms are level with the bench.',
      'After the last rep, bring the weights to your chest and sit up. Do not drop them out wide.'
    ],
    breathe: 'Breathe in as you lower, out as you press.',
    main: ['chest'],
    also: ['shoulders', 'triceps'],
    mistakes: [
      ['Elbows flared straight out to the sides', 'Tuck them in about halfway toward your ribs.'],
      ['Backside lifting off the bench', 'Keep your hips down and your feet planted.']
    ],
    easier: { k: 'chestpress', text: 'Chest press machine: it guides the path for you.' },
    harder: { k: null, text: 'Lower for three seconds on every rep.' },
    stress: ['shoulder', 'wrist']
  },
  shoulderpress: {
    equip: 'Shoulder press machine',
    where: 'Machine area: an upright seat with two handles beside your shoulders that push overhead.',
    setup: [
      'Set the seat so the handles start level with your shoulders.',
      'Put the pin in the weight stack at the weight you want.',
      'Sit with your back flat on the pad and both feet flat on the floor.',
      'Grip the handles with straight wrists and your elbows under your hands.'
    ],
    steps: [
      'Tighten your belly so your lower back stays on the pad.',
      'Press up until your arms are almost straight.',
      'Lower slowly until your hands are about level with your ears.',
      'Keep your head back on the pad and look straight ahead the whole time.'
    ],
    breathe: 'Breathe out as you press up, in as you lower.',
    main: ['shoulders'],
    also: ['triceps', 'traps'],
    mistakes: [
      ['Lower back arching off the pad', 'Tighten your belly and use a lighter weight.'],
      ['Handles starting too low, below your shoulders', 'Lower the seat so they start at shoulder height.']
    ],
    easier: { k: null, text: 'Use a lighter weight and press only as high as feels smooth.' },
    harder: { k: 'dbshoulder', text: 'Seated dumbbell shoulder press: each arm balances its own weight.' },
    stress: ['shoulder', 'back']
  },
  dbshoulder: {
    equip: 'Two dumbbells, start at 20 lb each, and a bench with an upright back',
    where: 'Free-weight area: an adjustable bench near the dumbbell rack.',
    setup: [
      'Set the bench back almost straight up, one notch short of fully upright.',
      'Sit with a dumbbell standing on each thigh, then lift them to your shoulders one at a time.',
      'Sit tall with your back on the pad and both feet flat on the floor.',
      'Hold the weights beside your ears, palms forward, elbows under your wrists.'
    ],
    steps: [
      'Tighten your belly so your lower back stays on the pad.',
      'Press straight up until your arms are almost straight over your shoulders.',
      'Lower slowly until the weights are about level with your ears.',
      'After the last rep, lower the weights to your thighs before you stand.'
    ],
    breathe: 'Breathe out as you press up, in as you lower.',
    main: ['shoulders'],
    also: ['triceps', 'traps'],
    mistakes: [
      ['Leaning back and arching to push', 'Use a lighter weight and keep your ribs down.'],
      ['Elbows pointing straight out to the sides', 'Bring them a little forward of your shoulders.']
    ],
    easier: { k: 'shoulderpress', text: 'Shoulder press machine: it guides the path for you.' },
    harder: { k: null, text: 'Pause for one second at ear height on every rep.' },
    stress: ['shoulder', 'back']
  },
  pushdown: {
    equip: 'Cable station with a short straight bar or a rope',
    where: 'Cable station: a tall tower with a weight stack and a pulley that slides up and down.',
    setup: [
      'Slide the pulley to the top of the tower and clip on the short bar.',
      'Put the pin in the weight stack. Grip the bar palms down, hands shoulder-width apart.',
      'Stand a small step back, feet hip-width apart, with a slight lean forward from the hips.',
      'Pull the bar down until your elbows sit at your sides. That is your start position.'
    ],
    steps: [
      'Pin your elbows to your sides.',
      'Push the bar down until your arms are straight.',
      'Squeeze the back of your arms for a moment.',
      'Let the bar rise slowly until your forearms are just above level.'
    ],
    breathe: 'Breathe out as you push down, in as the bar rises.',
    main: ['triceps'],
    also: [],
    mistakes: [
      ['Elbows drifting forward', 'Keep them glued to your ribs.'],
      ['Hunching over to push with your body weight', 'Stand tall and use a lighter weight.']
    ],
    easier: { k: null, text: 'Use a lighter weight and slow each rep down.' },
    harder: { k: 'dbtri', text: 'Dumbbell overhead triceps extension: works the muscle in a longer stretch.' },
    stress: []
  },
  dbtri: {
    equip: 'One dumbbell, start at 25 lb, held in both hands',
    where: 'Free-weight area: a bench with an upright back near the dumbbell rack.',
    setup: [
      'Sit on a bench with an upright back, or stand tall with feet hip-width apart.',
      'Cup both hands under the top end of the dumbbell so it hangs straight down.',
      'Lift it to one shoulder first, then press it over your head until your arms are straight.',
      'Point your elbows forward and keep them close to your head.'
    ],
    steps: [
      'Bend your elbows and lower the weight slowly behind your head.',
      'Stop when you feel a stretch in the back of your arms.',
      'Straighten your arms to lift it back over your head.',
      'Keep your upper arms still. Only your forearms move.'
    ],
    breathe: 'Breathe in as you lower, out as you lift.',
    main: ['triceps'],
    also: [],
    mistakes: [
      ['Elbows flaring wide', 'Keep them pointing forward, close to your head.'],
      ['Lower back arching', 'Tighten your belly and keep your ribs down.']
    ],
    easier: { k: 'pushdown', text: 'Cable triceps pushdown: your arms stay by your sides.' },
    harder: { k: null, text: 'Lower for three seconds on every rep.' },
    stress: ['shoulder', 'back']
  },
  inclinedb: {
    equip: 'Two dumbbells, start at 25 lb each, and an adjustable bench',
    where: 'Free-weight area: a bench with a back that tilts, near the dumbbell rack.',
    setup: [
      'Set the bench back to between 30 and 45 degrees. That is a low to middle tilt.',
      'If the seat tilts, raise it one notch so you do not slide down.',
      'Sit with a dumbbell on each thigh, lie back, and bring them beside your upper chest.',
      'Plant your feet flat and pull your shoulder blades back and down.'
    ],
    steps: [
      'Press the weights up until your arms are straight above your shoulders.',
      'Lower slowly to the sides of your upper chest.',
      'Keep your elbows about halfway between your sides and straight out.',
      'Keep your wrists straight and stacked over your elbows.'
    ],
    breathe: 'Breathe in as you lower, out as you press.',
    main: ['chest', 'shoulders'],
    also: ['triceps'],
    mistakes: [
      ['Bench set too upright', 'Keep it at 30 to 45 degrees so your chest does the work.'],
      ['Back arching off the bench', 'Keep your backside and upper back on the pad.']
    ],
    easier: { k: 'chestpress', text: 'Chest press machine: it guides the path for you.' },
    harder: { k: null, text: 'Pause for one second at the bottom of each rep.' },
    stress: ['shoulder', 'wrist']
  },
  pecdeck: {
    equip: 'Pec deck, also called the chest fly machine',
    where: 'Machine area: a seat with two long arms that swing together in front of your chest.',
    setup: [
      'Set the seat so your hands and elbows are just below shoulder height.',
      'If the arms adjust, set them to start in line with your chest, not behind it.',
      'Put the pin in the weight stack. Sit with your head and back on the pad, feet flat.',
      'Hold the handles with a soft bend in your elbows.'
    ],
    steps: [
      'Keep your shoulder blades back against the pad.',
      'Bring your hands together in front of your chest in a wide arc, like hugging a tree.',
      'Squeeze your chest for one second.',
      'Open slowly until your hands are in line with your chest.'
    ],
    breathe: 'Breathe out as your hands come together, in as you open.',
    main: ['chest'],
    also: ['shoulders'],
    mistakes: [
      ['Opening too far back', 'Stop when your hands line up with your chest.'],
      ['Bending your elbows more to push the handles', 'Keep the same soft bend all the way.']
    ],
    easier: { k: null, text: 'Use a lighter weight and a smaller opening.' },
    harder: { k: 'inclinedb', text: 'Incline dumbbell press: you balance the weights yourself.' },
    stress: ['shoulder']
  },
  latraise: {
    equip: 'Two light dumbbells, start at 10 lb each',
    where: 'Free-weight area: in front of the dumbbell rack, with room to lift your arms out wide.',
    setup: [
      'Stand tall with feet hip-width apart and knees soft.',
      'Hold the weights at your sides, palms facing your thighs.',
      'Keep a soft bend in your elbows and tip your chest forward just a little.'
    ],
    steps: [
      'Lift your arms out to the sides, leading with your elbows.',
      'Stop at shoulder height, with your arms level with the floor.',
      'Pause for a moment with your shoulders down, away from your ears.',
      'Lower slowly to your sides. Do not let the weights drop.'
    ],
    breathe: 'Breathe out as you lift, in as you lower.',
    main: ['shoulders'],
    also: ['traps'],
    mistakes: [
      ['Swinging the weights up', 'Go lighter and lift without any body sway.'],
      ['Lifting above shoulder height with a shrug', 'Stop when your arms are level with the floor.']
    ],
    easier: { k: null, text: 'Use lighter weights, or lift one arm at a time.' },
    harder: { k: 'cablelat', text: 'Cable lateral raise: the cable keeps pulling all the way down.' },
    stress: ['shoulder', 'neck']
  },
  cablelat: {
    equip: 'Cable station with a single handle',
    where: 'Cable station: a tall tower with a weight stack and a pulley that slides up and down.',
    setup: [
      'Slide the pulley to the bottom of the tower and clip on a single handle.',
      'Set the pin to a very light weight. This move needs little.',
      'Stand side-on to the tower and take the handle in the hand farther from it.',
      'Hold the tower with your near hand. The cable crosses in front of your legs.'
    ],
    steps: [
      'Lift your arm out to the side with a soft elbow.',
      'Stop at shoulder height, with your arm level with the floor.',
      'Lower slowly and keep the cable tight.',
      'Finish your reps, then turn around and do the other arm.'
    ],
    breathe: 'Breathe out as you lift, in as you lower.',
    main: ['shoulders'],
    also: ['traps'],
    mistakes: [
      ['Shoulder shrugging up', 'Keep it down, away from your ear.'],
      ['Twisting your body to pull', 'Keep your chest facing forward and use a lighter weight.']
    ],
    easier: { k: 'latraise', text: 'Dumbbell lateral raise: simpler to set up and lighter at the bottom.' },
    harder: { k: null, text: 'Pause for two seconds at shoulder height.' },
    stress: ['shoulder', 'neck']
  },

  // ----- Pull -----
  latpull: {
    equip: 'Lat pulldown machine with the long bar',
    where: 'Machine area: a seat with thigh pads under a long bar that hangs from a cable overhead.',
    setup: [
      'Set the thigh pads so they hold your legs down snugly with your feet flat.',
      'Put the pin in the weight stack. Stand and grip the bar a little wider than your shoulders.',
      'Keep your palms facing forward. Sit down with the bar and slide your thighs under the pads.',
      'Lift your chest and lean back just slightly.'
    ],
    steps: [
      'Start the pull by drawing your shoulder blades down.',
      'Drive your elbows down and back.',
      'Bring the bar to your upper chest, just below your collarbone.',
      'Pause, then let the bar rise slowly until your arms are straight.'
    ],
    breathe: 'Breathe out as you pull down, in as the bar rises.',
    main: ['lats'],
    also: ['biceps', 'midback', 'reardelts'],
    mistakes: [
      ['Leaning far back and yanking', 'Keep only a slight lean and pull smoothly.'],
      ['Pulling the bar behind your neck', 'Always bring it down in front, to your upper chest.']
    ],
    easier: { k: null, text: 'Use a lighter weight, or a shoulder-width grip with palms facing you.' },
    harder: { k: 'assistpull', text: 'Assisted pull-up machine: you lift part of your own body weight.' },
    stress: ['shoulder']
  },
  assistpull: {
    equip: 'Assisted pull-up machine with a knee pad',
    where: 'Machine area: a tall frame with pull-up handles on top and a padded platform for your knees.',
    setup: [
      'Put the pin in the weight stack. More weight on the stack means more help, so start heavy.',
      'Step up on the foot pegs and grip the handles just wider than your shoulders, palms forward.',
      'Place one knee on the pad, then the other, and let the pad take your weight.',
      'Hang with your arms straight and your belly tight.'
    ],
    steps: [
      'Start by drawing your shoulder blades down.',
      'Drive your elbows down and back and pull your chest up toward the handles.',
      'Stop when your chin is above your hands.',
      'Lower slowly until your arms are straight.',
      'After the last rep, put one foot on a peg before you take your knees off the pad.'
    ],
    breathe: 'Breathe out as you pull up, in as you lower.',
    main: ['lats'],
    also: ['biceps', 'midback', 'abs'],
    mistakes: [
      ['Stopping halfway down', 'Lower until your arms are fully straight.'],
      ['Choosing too little help and jerking up', 'Add weight to the stack until every rep is smooth.']
    ],
    easier: { k: 'latpull', text: 'Lat pulldown machine: the same pull, seated, at any weight you like.' },
    harder: { k: null, text: 'Take one plate off the stack. Less weight means less help.' },
    stress: ['shoulder']
  },
  seatedrow: {
    equip: 'Seated cable row station with the close two-hand grip handle',
    where: 'Cable area: a long low bench with foot plates, facing a low pulley.',
    setup: [
      'Clip on the close grip handle, the V shaped one, and put the pin in the weight stack.',
      'Sit on the bench with your feet on the plates and your knees slightly bent.',
      'Reach forward, take the handle, then sit back until your arms are straight and the weight lifts.',
      'Sit tall with your chest up and your back flat.'
    ],
    steps: [
      'Keep your torso still and upright. Only your arms and shoulder blades move.',
      'Drive your elbows straight back, close to your sides.',
      'Pull the handle to your belly, at about belly button height.',
      'Squeeze your shoulder blades together for a moment.',
      'Reach forward slowly until your arms are straight, without rounding your back.'
    ],
    breathe: 'Breathe out as you pull, in as you reach forward.',
    main: ['midback', 'lats'],
    also: ['biceps', 'reardelts'],
    mistakes: [
      ['Rocking back and forth', 'Keep your torso still and let your arms do the work.'],
      ['Back rounding as you reach forward', 'Keep your chest up and let only your arms go forward.']
    ],
    easier: { k: null, text: 'Use a lighter weight and pull only as far as your torso stays still.' },
    harder: { k: null, text: 'Hold the squeeze for two seconds on every rep.' },
    stress: ['back', 'shoulder']
  },
  dbrow: {
    equip: 'One dumbbell, start at 30 lb, and a flat bench',
    where: 'Free-weight area: the flat benches near the dumbbell rack.',
    setup: [
      'Put the dumbbell on the floor beside a flat bench.',
      'Place one knee and the hand on the same side on the bench.',
      'Plant your other foot on the floor, out to the side, with the knee soft.',
      'Flatten your back until it is close to level with the floor. Look at the floor just ahead.'
    ],
    steps: [
      'Pick up the weight with your free hand and let that arm hang straight.',
      'Drive your elbow up and back, pulling the weight toward your hip.',
      'Stop when the weight reaches your side.',
      'Lower slowly until your arm is straight.',
      'Finish your reps, then switch sides.'
    ],
    breathe: 'Breathe out as you pull, in as you lower.',
    main: ['lats', 'midback'],
    also: ['biceps', 'reardelts'],
    mistakes: [
      ['Twisting your body to lift', 'Keep both shoulders level and your chest facing the floor.'],
      ['Back rounding', 'Lift your chest a little and keep your back flat.']
    ],
    easier: { k: 'seatedrow', text: 'Seated cable row: you sit upright and the cable guides the pull.' },
    harder: { k: null, text: 'Pause for two seconds at the top of each rep.' },
    stress: ['back', 'shoulder']
  },
  dbcurl: {
    equip: 'Two dumbbells, start at 20 lb each',
    where: 'Free-weight area: anywhere near the dumbbell rack. A mirror helps you check your form.',
    setup: [
      'Stand tall with feet hip-width apart and knees soft.',
      'Hold the weights at your sides with your palms facing forward.',
      'Tuck your elbows in beside your ribs.'
    ],
    steps: [
      'Keeping your elbows by your ribs, curl the weights up toward your shoulders.',
      'Squeeze for a moment at the top.',
      'Lower slowly until your arms are straight.'
    ],
    breathe: 'Breathe out as you curl up, in as you lower.',
    main: ['biceps'],
    also: ['forearms'],
    mistakes: [
      ['Swinging your body', 'Stand tall and go lighter, or stand with your back against a wall.'],
      ['Elbows drifting forward', 'Keep them pinned beside your ribs.']
    ],
    easier: { k: 'hammer', text: 'Hammer curl: palms face in, which is kinder to the wrists.' },
    harder: { k: null, text: 'Lower for three seconds on every rep.' },
    stress: ['wrist']
  },
  cablecurl: {
    equip: 'Cable station with a short straight bar',
    where: 'Cable station: a tall tower with a weight stack and a pulley that slides up and down.',
    setup: [
      'Slide the pulley to the bottom of the tower and clip on the short straight bar.',
      'Put the pin in the weight stack. Grip the bar palms up, hands shoulder-width apart.',
      'Stand tall a small step back from the tower with your elbows at your sides.'
    ],
    steps: [
      'Keeping your elbows by your ribs, curl the bar up toward your shoulders.',
      'Squeeze for a moment at the top.',
      'Lower slowly until your arms are straight. Keep the cable tight.'
    ],
    breathe: 'Breathe out as you curl up, in as you lower.',
    main: ['biceps'],
    also: ['forearms'],
    mistakes: [
      ['Elbows moving forward', 'Keep them still beside your ribs.'],
      ['Leaning back to lift', 'Stand tall and use a lighter weight.']
    ],
    easier: { k: null, text: 'Use a lighter weight and slow each rep down.' },
    harder: { k: null, text: 'Pause for two seconds at the top of each rep.' },
    stress: ['wrist']
  },
  hammer: {
    equip: 'Two dumbbells, start at 20 lb each',
    where: 'Free-weight area: anywhere near the dumbbell rack. A mirror helps you check your form.',
    setup: [
      'Stand tall with feet hip-width apart and knees soft.',
      'Hold the weights at your sides with your palms facing your thighs.',
      'Tuck your elbows in beside your ribs.'
    ],
    steps: [
      'Curl the weights up without turning your wrists. Your thumbs lead the way.',
      'Stop when your thumbs are close to your shoulders.',
      'Lower slowly until your arms are straight.'
    ],
    breathe: 'Breathe out as you curl up, in as you lower.',
    main: ['biceps', 'forearms'],
    also: [],
    mistakes: [
      ['Leaning back to lift', 'Stand tall and use a lighter weight.'],
      ['Wrists turning palm up', 'Keep your palms facing each other the whole way.']
    ],
    easier: { k: null, text: 'Curl one arm at a time so you can watch each side.' },
    harder: { k: 'dbcurl', text: 'Dumbbell biceps curl: palms up puts more of the work on the biceps.' },
    stress: []
  },
  facepull: {
    equip: 'Cable station with the rope handle',
    where: 'Cable station: a tall tower with a weight stack and a pulley that slides up and down.',
    setup: [
      'Slide the pulley to about eye level and clip on the rope.',
      'Set the pin to a light weight. This move is about control, not load.',
      'Hold one end of the rope in each hand with your thumbs pointing back toward you.',
      'Step back until your arms are straight and the weight lifts. Stand tall, one foot back.'
    ],
    steps: [
      'Pull the rope toward your eyes, spreading your hands apart as it comes.',
      'Keep your elbows high and wide, level with your shoulders.',
      'Finish with your hands beside your ears and your shoulder blades squeezed together.',
      'Return slowly until your arms are straight.'
    ],
    breathe: 'Breathe out as you pull, in as you return.',
    main: ['reardelts', 'midback'],
    also: ['traps'],
    mistakes: [
      ['Leaning back to pull', 'Stay upright and use less weight.'],
      ['Elbows dropping below your shoulders', 'Lift them high and wide so the rope comes to eye level.']
    ],
    easier: { k: null, text: 'Use the lightest weight and make every pull smooth.' },
    harder: { k: null, text: 'Hold the rope at eye level for two seconds on every rep.' },
    stress: ['shoulder']
  },
  reardelt: {
    equip: 'Two light dumbbells, start at 10 lb each',
    where: 'Free-weight area: in front of the dumbbell rack, with room to lift your arms out wide.',
    setup: [
      'Stand with feet hip-width apart and knees softly bent.',
      'Hinge at the hips: push your backside back and tip your chest toward the floor, back flat.',
      'Let the weights hang under your chest, palms facing each other, elbows soft.'
    ],
    steps: [
      'Lift your arms out to the sides, leading with your elbows.',
      'Stop when your arms are level with your back.',
      'Squeeze your shoulder blades together for a moment.',
      'Lower slowly until the weights meet under your chest.'
    ],
    breathe: 'Breathe out as you lift, in as you lower.',
    main: ['reardelts'],
    also: ['midback', 'traps'],
    mistakes: [
      ['Standing up as you lift', 'Keep your chest facing the floor for the whole set.'],
      ['Swinging the weights up', 'Go lighter and lift slowly.']
    ],
    easier: { k: 'facepull', text: 'Cable face pull: you stand upright, so your lower back gets a rest.' },
    harder: { k: null, text: 'Pause for two seconds at the top of each rep.' },
    stress: ['back', 'shoulder']
  },

  // ----- Legs -----
  legpress: {
    equip: 'Leg press machine',
    where: 'Machine area: a reclined seat facing a large foot platform. Some use a pin, some use plates.',
    setup: [
      'Set the weight with the pin, or slide equal plates onto both sides.',
      'Sit with your back and hips flat against the pad.',
      'Place your feet shoulder-width apart in the middle of the platform, toes turned out a little.',
      'If the seat slides, set it so your knees start bent to about a right angle.'
    ],
    steps: [
      'Press the platform up a little. If there are safety handles, turn them out to free it.',
      'Lower slowly until your knees are bent to about a right angle.',
      'Keep your hips and lower back on the pad and your knees in line with your toes.',
      'Push through your whole foot, heels down, until your legs are almost straight.',
      'After the last rep, turn the safety handles back in before you relax your legs.'
    ],
    breathe: 'Breathe in as you lower, out as you push.',
    main: ['quads', 'glutes'],
    also: ['hamstrings'],
    mistakes: [
      ['Snapping your knees straight', 'Stop just short of fully straight.'],
      ['Hips curling up off the seat at the bottom', 'Do not go as deep. Keep your lower back on the pad.']
    ],
    easier: { k: null, text: 'Use a lighter weight and bend your knees a little less.' },
    harder: { k: 'goblet', text: 'Goblet squat: you stand and balance the weight yourself.' },
    stress: ['knee', 'back', 'hip']
  },
  goblet: {
    equip: 'One kettlebell or dumbbell, start at 35 lb',
    where: 'Free-weight area: any open floor near the dumbbell or kettlebell rack.',
    setup: [
      'With a dumbbell, stand it on end and cup the top. With a kettlebell, hold the sides of the handle.',
      'Hold the weight against your chest with your elbows tucked under it.',
      'Stand with feet a little wider than your shoulders, toes turned out slightly.'
    ],
    steps: [
      'Take a breath and tighten your belly.',
      'Sit down between your knees, keeping your chest up and your heels down.',
      'Lower until your thighs are about level with the floor, or as low as your back stays flat.',
      'Push through your whole foot to stand tall.'
    ],
    breathe: 'Breathe in on the way down, out as you stand.',
    main: ['quads', 'glutes'],
    also: ['abs', 'hamstrings'],
    mistakes: [
      ['Heels lifting', 'Sit back a little more and keep your whole foot down.'],
      ['Chest dropping forward', 'Keep the weight tight to your chest with your elbows under it.']
    ],
    easier: { k: 'legpress', text: 'Leg press machine: the seat supports your back.' },
    harder: { k: null, text: 'Pause for two seconds at the bottom of each rep.' },
    stress: ['knee', 'back', 'hip']
  },
  legext: {
    equip: 'Leg extension machine',
    where: 'Machine area: an upright seat with a padded roller that sits in front of your shins.',
    setup: [
      'Set the back pad so your knees line up with the pivot, the round hinge on the side.',
      'Set the roller pad so it rests on your lower shins, just above your ankles.',
      'Put the pin in the weight stack, sit back, and hold the side handles.'
    ],
    steps: [
      'Straighten your legs smoothly until they are level.',
      'Squeeze the front of your thighs for one second.',
      'Lower slowly. Stop just before the plates touch.'
    ],
    breathe: 'Breathe out as you straighten, in as you lower.',
    main: ['quads'],
    also: [],
    mistakes: [
      ['Kicking the weight up', 'Lift smoothly and pause at the top.'],
      ['Hips lifting off the seat', 'Hold the handles and keep your backside down.']
    ],
    easier: { k: null, text: 'Use a lighter weight, or stop a little short of fully straight.' },
    harder: { k: 'splitsquat', text: 'Dumbbell split squat: standing, one leg forward, with balance to hold.' },
    stress: ['knee']
  },
  splitsquat: {
    equip: 'Two dumbbells, start at 20 lb each',
    where: 'Free-weight area: open floor near the dumbbell rack.',
    setup: [
      'Hold a dumbbell in each hand at your sides.',
      'Take a long step forward. Keep your feet hip-width apart, like standing on train tracks.',
      'Lift your back heel so you are on the ball of that foot.',
      'Stand tall with your chest up and most of your weight on the front foot.'
    ],
    steps: [
      'Drop your back knee straight down toward the floor.',
      'Stop just before it touches. Keep your front heel down and that knee in line with your toes.',
      'Push through your front foot to stand back up. Your feet stay where they are.',
      'Finish your reps, then switch legs.'
    ],
    breathe: 'Breathe in as you lower, out as you stand.',
    main: ['quads', 'glutes'],
    also: ['hamstrings'],
    mistakes: [
      ['Front knee caving in', 'Keep it pointing the same way as your toes.'],
      ['Feet in one line, like on a tightrope', 'Keep them hip-width apart for balance.']
    ],
    easier: { k: 'legext', text: 'Leg extension machine: seated, with no balance needed.' },
    harder: { k: null, text: 'Rest your back foot up on a bench.' },
    stress: ['knee', 'hip', 'ankle']
  },
  legcurl: {
    equip: 'Leg curl machine, seated or lying',
    where: 'Machine area. Seated type has a thigh pad. Lying type is a flat pad you lie face down on.',
    setup: [
      'Line your knees up with the pivot, the round hinge on the side of the machine.',
      'Set the roller pad so it rests on the back of your lower legs, just above your heels.',
      'On the seated type, lower the thigh pad until it holds your legs down snugly.',
      'Put the pin in the weight stack and hold the handles.'
    ],
    steps: [
      'Keep your hips pressed against the pad.',
      'Curl your heels toward your backside as far as the machine allows.',
      'Squeeze the back of your thighs for one second.',
      'Let the pad return slowly until your legs are almost straight.'
    ],
    breathe: 'Breathe out as you curl, in as the pad returns.',
    main: ['hamstrings'],
    also: ['calves'],
    mistakes: [
      ['Hips lifting off the pad', 'Press them down and go lighter.'],
      ['Letting the weight drop back', 'Take two to three seconds on the way back.']
    ],
    easier: { k: null, text: 'Use a lighter weight and curl only as far as is smooth.' },
    harder: { k: 'dbrdl', text: 'Dumbbell Romanian deadlift: standing, with your hips and back working too.' },
    stress: ['knee']
  },
  dbrdl: {
    equip: 'Two dumbbells, start at 30 lb each',
    where: 'Free-weight area: open floor near the dumbbell rack. Stand side-on to a mirror if you can.',
    setup: [
      'Stand tall with feet hip-width apart.',
      'Hold the weights in front of your thighs, palms facing your legs.',
      'Bend your knees softly and keep that same bend for the whole rep.',
      'Pull your shoulders back and tighten your belly.'
    ],
    steps: [
      'Hinge at the hips: push your backside straight back, as if closing a car door with it.',
      'Let your chest tip forward with a flat back as the weights slide down your thighs.',
      'Keep the weights close to your legs. Stop at about mid-shin, or sooner if your back rounds.',
      'Push your hips forward to stand tall and squeeze your backside at the top.'
    ],
    breathe: 'Breathe in as you lower, out as you stand.',
    main: ['hamstrings', 'glutes'],
    also: ['lowerback', 'forearms'],
    mistakes: [
      ['Back rounding', 'Lift your chest and stop where your back is still flat.'],
      ['Bending the knees more and squatting down', 'Keep the soft bend fixed and send your hips back.']
    ],
    easier: { k: 'legcurl', text: 'Leg curl machine: works the back of the thighs with your body supported.' },
    harder: { k: 'bbrdl', text: 'Barbell Romanian deadlift: the same move with room for more weight.' },
    stress: ['back', 'hip']
  },
  calf: {
    equip: 'Standing calf raise machine, or a low step and one dumbbell',
    where: 'Machine area: a frame with shoulder pads above a low step. Or use any low step beside a rail.',
    setup: [
      'On the machine, set the shoulder pads so you bend your knees a little to get under them.',
      'On a step, hold a dumbbell in one hand and a rail in the other for balance.',
      'Stand with the balls of your feet on the edge of the step and your heels hanging off.',
      'Stand tall with your legs straight but your knees not locked.'
    ],
    steps: [
      'Rise onto your toes as high as you can.',
      'Pause for one second at the top.',
      'Lower your heels slowly until they are just below the step.',
      'Feel a light stretch in your calves, then rise again.'
    ],
    breathe: 'Breathe out as you rise, in as you lower.',
    main: ['calves'],
    also: [],
    mistakes: [
      ['Bouncing fast', 'Pause at the top and take two seconds to lower.'],
      ['Bending your knees to help', 'Keep your legs straight and move only at the ankles.']
    ],
    easier: { k: null, text: 'Do them on the flat floor with no weight, holding a rail.' },
    harder: { k: null, text: 'Do one leg at a time on the step.' },
    stress: ['ankle']
  },
  squat: {
    equip: 'Squat rack, 45 lb Olympic bar, plates, collars',
    where: 'Free-weight area: the tall steel racks with hooks and long safety bars.',
    setup: [
      'Set the hooks so the bar sits at mid-chest height, a little below your shoulders.',
      'Set the safety pins just below the lowest point the bar reaches. Check with the empty bar first.',
      'Load the same plates on both sides and clip a collar on each end to hold them.',
      'Step under the bar and rest it on the muscles of your upper back, not on your neck.'
    ],
    steps: [
      'Grip just wider than your shoulders, stand up with the bar, and take two small steps back.',
      'Set your feet shoulder-width apart, toes turned out a little. Breathe in and tighten your belly.',
      'Sit down between your heels. Keep heels down, knees over toes, back and shins leaning the same.',
      'Go down until your hips are level with your knees or a little below, then push the floor away.',
      'After the last rep, walk forward until the bar touches the rack, then lower it onto the hooks.'
    ],
    breathe: 'Breathe in on the way down, out as you stand.',
    main: ['quads', 'glutes'],
    also: ['hamstrings', 'abs', 'lowerback'],
    mistakes: [
      ['Knees caving in', 'Push them out so they track over your toes.'],
      ['Heels lifting', 'Sit back a little and keep the whole foot down.']
    ],
    easier: { k: 'goblet', text: 'Goblet squat: the weight in front keeps you upright.' },
    harder: { k: null, text: 'Pause for two seconds at the bottom of each rep.' },
    stress: ['knee', 'back', 'hip']
  },
  lunge: {
    equip: 'Two dumbbells, start at 15 lb each',
    where: 'Any clear strip of floor with room for about ten steps. Turn around at the end.',
    setup: [
      'Check that the path ahead of you is clear.',
      'Hold a dumbbell in each hand at your sides.',
      'Stand tall with feet hip-width apart and your shoulders back.'
    ],
    steps: [
      'Take a long step forward and plant your whole front foot.',
      'Lower until both knees are bent to about a right angle. Your back knee stays off the floor.',
      'Keep your chest up and your front knee in line with your toes.',
      'Push through your front foot, stand up, and step into the next lunge with the other leg.'
    ],
    breathe: 'Breathe in as you lower, out as you step up.',
    main: ['quads', 'glutes'],
    also: ['hamstrings', 'calves'],
    mistakes: [
      ['Steps too short', 'Step longer so your front heel stays down.'],
      ['Wobbling side to side', 'Keep your feet hip-width apart, not in one line.']
    ],
    easier: { k: 'splitsquat', text: 'Dumbbell split squat: the same move with your feet staying in place.' },
    harder: { k: null, text: 'Pause for one second at the bottom of every step.' },
    stress: ['knee', 'hip', 'ankle']
  },
  bbrdl: {
    equip: '45 lb Olympic bar, plates, collars, and a rack to lift it from',
    where: 'Free-weight area: a squat rack with the hooks set low, or a lifting platform.',
    setup: [
      'Set the rack hooks at mid-thigh height so you can lift the bar off without bending far.',
      'Load the same plates on both sides and clip a collar on each end to hold them.',
      'Grip the bar just outside your thighs, palms facing you. Lift it and take one step back.',
      'Stand tall with feet hip-width apart and your knees softly bent.'
    ],
    steps: [
      'Hinge at the hips: push your backside straight back and let your chest tip forward.',
      'Keep your back flat and the bar sliding down your thighs.',
      'Keep the same soft knee bend. Stop at about mid-shin, or sooner if your back starts to round.',
      'Push your hips forward to stand tall. Do not lean back at the top.'
    ],
    breathe: 'Breathe in as you lower, out as you stand.',
    main: ['hamstrings', 'glutes'],
    also: ['lowerback', 'forearms', 'traps'],
    mistakes: [
      ['Bar drifting away from you', 'Keep it brushing your legs all the way down and up.'],
      ['Back rounding', 'Lift your chest and stop where your back is still flat.']
    ],
    easier: { k: 'dbrdl', text: 'Dumbbell Romanian deadlift: lighter, and simpler to set up.' },
    harder: { k: null, text: 'Lower for three seconds and pause at mid-shin.' },
    stress: ['back', 'hip']
  },
  hipthrust: {
    equip: 'One dumbbell, start at 30 lb, and a flat bench',
    where: 'Free-weight area: a flat bench that will not slide, best against a wall or rack.',
    setup: [
      'Sit on the floor with your upper back against the long side of the bench.',
      'Lay the dumbbell across the crease of your hips and hold it with both hands.',
      'Plant your feet flat, hip-width apart, with your knees bent.',
      'The bench edge should sit just under your shoulder blades.'
    ],
    steps: [
      'Tuck your chin and tighten your belly.',
      'Push through your heels and lift your hips until your body is level from shoulders to knees.',
      'Your shins should be upright at the top. Squeeze your backside for one second.',
      'Lower your hips slowly toward the floor.'
    ],
    breathe: 'Breathe out as you lift, in as you lower.',
    main: ['glutes'],
    also: ['hamstrings'],
    mistakes: [
      ['Lower back arching at the top', 'Tuck your chin, keep your ribs down, and stop when level.'],
      ['Feet too far out or too close in', 'Place them so your shins are upright at the top.']
    ],
    easier: { k: null, text: 'Use no weight, or lie on the floor and lift your hips from there.' },
    harder: { k: null, text: 'Use a heavier dumbbell, or hold the top for three seconds.' },
    stress: ['back', 'hip']
  },

  // ----- Core, bodyweight -----
  crunch: {
    equip: 'Exercise mat',
    where: 'Stretching area: any open floor with mats.',
    setup: [
      'Lie on your back with your knees bent and feet flat, hip-width apart.',
      'Rest your fingertips lightly by your ears, or cross your arms over your chest.',
      'Press your lower back gently toward the mat.'
    ],
    steps: [
      'Tighten your belly and curl your head and shoulders off the mat.',
      'Lift only until your shoulder blades leave the floor. Your lower back stays down.',
      'Pause for a moment.',
      'Lower slowly until your shoulders touch the mat.'
    ],
    breathe: 'Breathe out as you curl up, in as you lower.',
    main: ['abs'],
    also: ['obliques'],
    mistakes: [
      ['Pulling on your neck', 'Keep your fingertips light and a fist of space under your chin.'],
      ['Jerking all the way up to sitting', 'Keep it small and slow. Only your shoulders lift.']
    ],
    easier: { k: null, text: 'Slide your hands along your thighs toward your knees as you curl.' },
    harder: { k: null, text: 'Hold the top for two seconds on every rep.' },
    stress: ['neck', 'back']
  },
  legraise: {
    equip: 'Exercise mat',
    where: 'Stretching area: any open floor with mats.',
    setup: [
      'Lie flat on your back with your legs straight and together.',
      'Slide your hands, palms down, under your backside.',
      'Press your lower back into the mat and keep it there.'
    ],
    steps: [
      'Tighten your belly and lift both legs until they point at the ceiling.',
      'Keep your legs as straight as you can.',
      'Lower slowly. Stop just above the floor, or sooner if your lower back starts to lift.',
      'Lift again without resting your feet on the floor.'
    ],
    breathe: 'Breathe out as you lift your legs, in as you lower them.',
    main: ['abs', 'hips'],
    also: [],
    mistakes: [
      ['Lower back lifting off the mat', 'Stop your legs higher, or bend your knees.'],
      ['Dropping your legs fast', 'Take three seconds to lower them.']
    ],
    easier: { k: null, text: 'Bend your knees, or lower one leg at a time.' },
    harder: { k: null, text: 'Lift your hips a little off the mat at the top of each rep.' },
    stress: ['back', 'hip']
  },
  benchtuck: {
    equip: 'Flat bench',
    where: 'Free-weight area: any flat bench with clear floor in front of it.',
    setup: [
      'Sit on the end of the bench with your legs hanging off.',
      'Hold the sides of the bench just behind your hips.',
      'Lean back a little with a flat back and lift your feet off the floor.'
    ],
    steps: [
      'Pull your knees in toward your chest and bring your chest forward to meet them.',
      'Pause for a moment with your belly tight.',
      'Stretch your legs back out and lean back a little, without touching the floor.'
    ],
    breathe: 'Breathe out as your knees come in, in as your legs go out.',
    main: ['abs', 'hips'],
    also: [],
    mistakes: [
      ['Rushing the reps', 'Move slowly and keep your belly tight.'],
      ['Slumping with a rounded lower back', 'Sit taller, lean back less, and grip the bench.']
    ],
    easier: { k: null, text: 'Tap your toes on the floor between reps, or move one leg at a time.' },
    harder: { k: null, text: 'Straighten your legs fully on the way out and pause there.' },
    stress: ['back', 'hip']
  },

  // ----- Jacquie's circuit stations: light, easy, unhurried -----
  st_legpress: {
    equip: 'Leg press machine, set to a light weight',
    where: 'Machine area: a reclined seat that faces a large foot platform.',
    setup: [
      'Choose a light weight. The first few pushes should feel easy.',
      'Sit back so your hips and back rest fully on the pad.',
      'Place your feet flat on the platform, about hip-width apart.',
      'If the seat slides, set it so your knees start comfortably bent, not squeezed up tight.'
    ],
    steps: [
      'Push the platform away gently until your legs are nearly straight. Keep a small bend in your knees.',
      'Pause, then let it come back slowly, only as far as is comfortable.',
      'Keep your knees in line with your toes and your back resting on the pad.',
      'Do one or two easy sets of 10 to 12. Stop if you feel any sharp pain.'
    ],
    breathe: 'Breathe out as you push, in as you come back. Keep breathing the whole time.',
    main: ['quads', 'glutes'],
    also: ['hamstrings'],
    mistakes: [
      ['Locking your knees straight', 'Stop just short, with a small bend left in them.'],
      ['Bending too deep too soon', 'Come back only as far as feels comfortable today.']
    ],
    easier: { k: null, text: 'Take the weight down a step and use a smaller bend.' },
    harder: { k: null, text: 'When 12 feels easy on two visits, add the smallest weight step.' },
    stress: ['knee', 'hip', 'back']
  },
  st_row: {
    equip: 'Seated row machine, set to a light weight',
    where: 'Machine area: a seat facing a chest pad, with two handles to pull toward you.',
    setup: [
      'Choose a light weight. The first few pulls should feel easy.',
      'Set the seat so your arms reach straight ahead to the handles, level with the floor.',
      'Sit tall with your chest resting lightly on the pad and your feet flat.',
      'Take the handles with your arms nearly straight and your shoulders relaxed.'
    ],
    steps: [
      'Gently pull the handles toward you, bringing your elbows straight back past your sides.',
      'Keep your body still and softly squeeze your shoulder blades together.',
      'Let the handles go forward slowly until your arms are nearly straight.',
      'Do one or two easy sets of 10 to 12. Stop if you feel any sharp pain.'
    ],
    breathe: 'Breathe out as you pull, in as the handles go forward.',
    main: ['midback', 'lats'],
    also: ['biceps', 'reardelts'],
    mistakes: [
      ['Leaning back to pull', 'Stay tall on the pad and let your arms do the work.'],
      ['Shoulders creeping up toward your ears', 'Let them drop and pull a little lighter.']
    ],
    easier: { k: null, text: 'Take the weight down a step, or pull a shorter distance.' },
    harder: { k: null, text: 'When 12 feels easy on two visits, add the smallest weight step.' },
    stress: ['shoulder', 'back']
  },
  st_chest: {
    equip: 'Chest press machine, set to a light weight',
    where: 'Machine area: a seat with a back pad and two handles at chest height.',
    setup: [
      'Choose a light weight. The first few presses should feel easy.',
      'Set the seat so the handles are level with the middle of your chest.',
      'Sit back with your head and back resting on the pad and your feet flat.',
      'Hold the handles with straight wrists. If there is a foot lever, use it to bring them forward.'
    ],
    steps: [
      'Press the handles forward gently until your arms are nearly straight.',
      'Keep your shoulders relaxed and resting on the pad.',
      'Bring the handles back slowly, only as far as is comfortable for your shoulders.',
      'Do one or two easy sets of 10 to 12. Stop if you feel any sharp pain.'
    ],
    breathe: 'Breathe out as you press, in as the handles come back.',
    main: ['chest'],
    also: ['shoulders', 'triceps'],
    mistakes: [
      ['Letting the handles come too far back', 'Stop when your hands are just in front of your chest.'],
      ['Shoulders lifting off the pad', 'Rest them back and press a little lighter.']
    ],
    easier: { k: null, text: 'Take the weight down a step, or press a shorter distance.' },
    harder: { k: null, text: 'When 12 feels easy on two visits, add the smallest weight step.' },
    stress: ['shoulder', 'wrist']
  },
  st_latpull: {
    equip: 'Lat pulldown machine with the long bar, set to a light weight',
    where: 'Machine area: a seat with thigh pads under a long bar that hangs from a cable.',
    setup: [
      'Choose a light weight. The first few pulls should feel easy.',
      'Set the thigh pads so they rest gently on your legs with your feet flat.',
      'Stand to take the bar, hands a little wider than your shoulders, then sit down with it.',
      'Sit tall with just a slight lean back.'
    ],
    steps: [
      'Gently pull the bar down toward the top of your chest. Let your elbows travel down and back.',
      'Keep the bar in front of your face. It never goes behind your neck.',
      'Pause, then let the bar rise slowly until your arms are nearly straight.',
      'Do one or two easy sets of 10 to 12. Stop if you feel any sharp pain.'
    ],
    breathe: 'Breathe out as you pull down, in as the bar rises.',
    main: ['lats'],
    also: ['biceps', 'midback'],
    mistakes: [
      ['Leaning far back', 'Sit tall with only a slight lean.'],
      ['Letting the bar pull your arms up fast', 'Hold on and let it rise slowly.']
    ],
    easier: { k: null, text: 'Take the weight down a step, or pull only to chin height.' },
    harder: { k: null, text: 'When 12 feels easy on two visits, add the smallest weight step.' },
    stress: ['shoulder', 'neck']
  },

  // ----- Cool-down stretches, in STRETCHES order: gentle, never forced -----
  sx_chest: {
    equip: 'Nothing needed',
    where: 'Any quiet spot with room to stand, such as the stretching area.',
    setup: [
      'Stand tall with feet hip-width apart and knees soft.',
      'Let your shoulders relax down, away from your ears.'
    ],
    steps: [
      'Clasp your hands behind your back. If that is not comfortable, rest them on your lower back.',
      'Gently draw your shoulder blades together and lift your chest.',
      'Hold for about 30 seconds, only as far as is comfortable.'
    ],
    breathe: 'Breathe slowly and evenly. Let each breath out soften your shoulders.',
    main: ['chest', 'shoulders'],
    also: [],
    mistakes: [
      ['Arching your lower back', 'Keep your ribs down and your belly gently firm.'],
      ['Pushing your head forward', 'Keep your chin level and your neck long.']
    ],
    easier: { k: null, text: 'Rest your hands on your hips and gently draw your elbows back.' },
    harder: { k: null, text: 'Stay for a few more slow breaths. There is no need to go further.' },
    stress: ['shoulder', 'back']
  },
  sx_shoulder: {
    equip: 'Nothing needed',
    where: 'Any quiet spot with room to stand, such as the stretching area.',
    setup: [
      'Stand tall, or sit if you prefer, with your shoulders relaxed.',
      'Keep your chest facing forward.'
    ],
    steps: [
      'Bring one arm across your chest, a little below shoulder height.',
      'Use your other hand to hug it gently toward you. Hold above the elbow, not on it.',
      'Stop at a mild stretch in the back of your shoulder. Only go as far as is comfortable.',
      'Hold for about 20 seconds, then switch arms.'
    ],
    breathe: 'Breathe slowly and evenly. Let your shoulders soften as you breathe out.',
    main: ['reardelts', 'shoulders'],
    also: [],
    mistakes: [
      ['Shoulder lifting up toward your ear', 'Let it drop before you hug the arm in.'],
      ['Twisting your body', 'Keep your chest facing forward.']
    ],
    easier: { k: null, text: 'Let the arm sit lower across your body and use a lighter hug.' },
    harder: { k: null, text: 'Stay for a few more slow breaths on each side.' },
    stress: ['shoulder']
  },
  sx_calf: {
    equip: 'A wall or sturdy rail to rest your hands on',
    where: 'Any wall or sturdy rail, such as the edge of the stretching area.',
    setup: [
      'Stand facing the wall and rest both hands on it at chest height.',
      'Step one foot back a comfortable distance. Point both feet straight ahead.'
    ],
    steps: [
      'Bend your front knee and keep your back leg straight.',
      'Gently press your back heel toward the floor until you feel a mild stretch in that calf.',
      'Hold for about 20 seconds, then switch legs.'
    ],
    breathe: 'Breathe slowly and evenly. Do not hold your breath.',
    main: ['calves'],
    also: [],
    mistakes: [
      ['Back heel lifting', 'Shorten your step until the heel can rest down.'],
      ['Back foot turned out', 'Point those toes straight at the wall.']
    ],
    easier: { k: null, text: 'Take a shorter step back.' },
    harder: { k: null, text: 'Stay for a few more slow breaths on each side.' },
    stress: ['ankle']
  },
  sx_reach: {
    equip: 'Exercise mat',
    where: 'Stretching area: any open floor with mats.',
    setup: [
      'Sit on the mat with your legs out in front and your knees a little bent.',
      'Sit tall. A folded mat or towel under your hips can make this easier.'
    ],
    steps: [
      'Tip forward from your hips with a long back and slide your hands toward your shins.',
      'Stop at the first mild stretch behind your thighs. Only go as far as is comfortable.',
      'Hold still for about 40 seconds. No bouncing.'
    ],
    breathe: 'Breathe slowly and evenly. Let each breath out relax your legs.',
    main: ['hamstrings'],
    also: ['lowerback', 'calves'],
    mistakes: [
      ['Bouncing to reach further', 'Stay still and let the stretch ease on its own.'],
      ['Rounding hard to touch your toes', 'Reach for your shins and keep your back long.']
    ],
    easier: { k: null, text: 'Bend your knees more, or sit on a folded mat.' },
    harder: { k: null, text: 'Stay for a few more slow breaths. There is no need to reach further.' },
    stress: ['back', 'hip']
  },
  sx_butterfly: {
    equip: 'Exercise mat',
    where: 'Stretching area: any open floor with mats.',
    setup: [
      'Sit on the mat and bring the soles of your feet together.',
      'Let your heels rest a comfortable distance from your body. Farther away is gentler.'
    ],
    steps: [
      'Hold your ankles or shins and sit tall.',
      'Let your knees relax out to the sides under their own weight. Do not press them down.',
      'Hold for about 30 seconds, only as far as is comfortable.'
    ],
    breathe: 'Breathe slowly and evenly. Let your hips soften as you breathe out.',
    main: ['innerthigh'],
    also: ['hips'],
    mistakes: [
      ['Pressing your knees down with your hands', 'Let them rest wherever they settle.'],
      ['Slumping forward', 'Sit on a folded mat so it is easier to sit tall.']
    ],
    easier: { k: null, text: 'Move your feet farther from your body, or sit with your back to a wall.' },
    harder: { k: null, text: 'Stay for a few more slow breaths.' },
    stress: ['hip', 'knee']
  },
  sx_figure4: {
    equip: 'Exercise mat',
    where: 'Stretching area: any open floor with mats.',
    setup: [
      'Lie on your back on the mat with both knees bent and your feet flat.',
      'Cross one ankle over the other thigh, just above the knee.'
    ],
    steps: [
      'Let the crossed knee relax out to the side. If that is already a stretch, stay right there.',
      'If you want a little more, lift the bottom foot and hold behind that thigh.',
      'Draw your legs gently toward you until you feel a mild stretch deep in the hip.',
      'Hold for about 20 seconds, then switch sides.'
    ],
    breathe: 'Breathe slowly and evenly. Keep your head and shoulders resting on the mat.',
    main: ['glutes', 'hips'],
    also: [],
    mistakes: [
      ['Head and shoulders lifting off the mat', 'Rest them down and loosen your hold.'],
      ['Pulling on the knee', 'Hold behind the thigh and keep the pull light.']
    ],
    easier: { k: null, text: 'Keep the bottom foot on the floor and just let the crossed knee open.' },
    harder: { k: null, text: 'Stay for a few more slow breaths on each side.' },
    stress: ['hip', 'knee']
  },
  sx_knees: {
    equip: 'Exercise mat',
    where: 'Stretching area: any open floor with mats.',
    setup: [
      'Lie on your back on the mat with your knees bent and feet flat.',
      'Rest your head down and let your shoulders relax.'
    ],
    steps: [
      'Bring one knee toward your chest, then the other.',
      'Hold behind your thighs or over your shins, whichever is kinder on your knees.',
      'Gently hug your knees in until you feel a mild stretch in your lower back.',
      'Hold for about 30 seconds, only as far as is comfortable.'
    ],
    breathe: 'Breathe slowly into your belly and let your back settle on the mat.',
    main: ['lowerback', 'glutes'],
    also: ['hips'],
    mistakes: [
      ['Lifting your head to meet your knees', 'Keep your head resting on the mat.'],
      ['Yanking your knees in', 'Draw them in slowly and stop at a mild stretch.']
    ],
    easier: { k: null, text: 'Hug one knee at a time and keep the other foot on the floor.' },
    harder: { k: null, text: 'Stay for a few more slow breaths.' },
    stress: ['back', 'knee', 'hip']
  },
  sx_child: {
    equip: 'Exercise mat',
    where: 'Stretching area: any open floor with mats.',
    setup: [
      'Kneel on the mat with your big toes together and your knees hip-width apart or wider.',
      'Fold the mat double under your knees if they want more padding.'
    ],
    steps: [
      'Sit your hips back toward your heels, only as far as is comfortable.',
      'Walk your hands forward and let your chest sink toward the mat.',
      'Rest your forehead on the mat or on your stacked hands.',
      'Hold for about 40 seconds, then walk your hands back to come up slowly.'
    ],
    breathe: 'Breathe slowly into your back and let your arms rest heavy.',
    main: ['lowerback', 'lats'],
    also: ['shoulders', 'hips'],
    mistakes: [
      ['Forcing your hips down to your heels', 'Stop where your knees feel fine. A gap is okay.'],
      ['Tensing your shoulders', 'Let your arms rest heavy on the mat.']
    ],
    easier: { k: null, text: 'Put a folded towel between your heels and hips, or keep your hips higher.' },
    harder: { k: null, text: 'Stay for a few more slow breaths.' },
    stress: ['knee', 'ankle', 'hip']
  }
};
