// 57-moves.js: movement demos and how-to text for workout mode.
// MOVE_OF maps each exercise to one of 11 movement patterns, demoSVG(pattern) returns an animated line figure,
// HOWTO holds three form cues and one common mistake per exercise, STRETCHES is the cool-down sequence.
// Top-level names here are MOVE_OF, HOWTO, STRETCHES, demoSVG, plus helpers prefixed MV_.

// Which demo animation each exercise uses. Eleven movement patterns cover all 33 exercises.
const MOVE_OF = {
  squat: 'squat', goblet: 'squat', legpress: 'squat',
  dbrdl: 'hinge', bbrdl: 'hinge', hipthrust: 'hinge',
  lunge: 'lunge', splitsquat: 'lunge',
  chestpress: 'hpress', dbbench: 'hpress', inclinedb: 'hpress', pecdeck: 'hpress',
  shoulderpress: 'vpress', dbshoulder: 'vpress',
  latpull: 'vpull', assistpull: 'vpull',
  seatedrow: 'hpull', dbrow: 'hpull', facepull: 'hpull', reardelt: 'hpull',
  latraise: 'raise', cablelat: 'raise', calf: 'raise',
  dbcurl: 'curl', cablecurl: 'curl', hammer: 'curl', legcurl: 'curl',
  pushdown: 'extension', dbtri: 'extension', legext: 'extension',
  crunch: 'core', legraise: 'core', benchtuck: 'core'
};

// Three form cues and one common mistake per exercise, in plain words.
const HOWTO = {
  chestpress: { cues: [
    'Set the seat so the handles line up with the middle of your chest.',
    'Press forward until your arms are almost straight.',
    'Bring the handles back slowly, under control.'],
    mistake: 'Shoulders rolling forward. Keep your back and head on the pad.' },
  dbbench: { cues: [
    'Lie back with your feet flat on the floor.',
    'Lower the weights to the sides of your chest.',
    'Press up until your arms are straight over your chest.'],
    mistake: 'Elbows flared straight out. Tuck them a little toward your sides.' },
  shoulderpress: { cues: [
    'Set the seat so the handles start at shoulder height.',
    'Press up until your arms are almost straight.',
    'Lower slowly until your hands reach ear level.'],
    mistake: 'Lower back arching. Keep it on the pad and tighten your belly.' },
  dbshoulder: { cues: [
    'Sit tall with your back against the pad.',
    'Start with the weights beside your ears, palms forward.',
    'Press straight up, then lower slowly to ear height.'],
    mistake: 'Leaning back to push. Use a lighter weight and stay upright.' },
  pushdown: { cues: [
    'Stand tall and pin your elbows to your sides.',
    'Push the bar down until your arms are straight.',
    'Let it rise slowly until your forearms pass level.'],
    mistake: 'Elbows drifting forward. Keep them glued to your ribs.' },
  dbtri: { cues: [
    'Hold one weight overhead with both hands.',
    'Bend your elbows to lower it behind your head.',
    'Straighten your arms to lift it back up.'],
    mistake: 'Elbows flaring wide. Keep them pointing forward, near your head.' },
  inclinedb: { cues: [
    'Set the bench to a low incline and lie back.',
    'Lower the weights to the sides of your upper chest.',
    'Press up until your arms are straight above your shoulders.'],
    mistake: 'Bench set too upright. Keep it low so your chest does the work.' },
  pecdeck: { cues: [
    'Sit tall with your back flat against the pad.',
    'Keep a soft bend in your elbows the whole time.',
    'Bring your hands together in front, then open slowly.'],
    mistake: 'Opening too far back. Stop when your hands line up with your chest.' },
  latraise: { cues: [
    'Stand tall with the weights at your sides.',
    'Lift your arms out to the sides, up to shoulder height.',
    'Lower slowly. Do not let the weights drop.'],
    mistake: 'Swinging the weights up. Go lighter and lift without a swing.' },
  cablelat: { cues: [
    'Stand side-on to the machine with the handle in your far hand.',
    'Lift your arm out to the side, up to shoulder height.',
    'Lower slowly and keep the cable tight.'],
    mistake: 'Shoulder shrugging up. Keep it down, away from your ear.' },
  latpull: { cues: [
    'Sit with your thighs snug under the pads.',
    'Pull the bar down to your upper chest.',
    'Let the bar rise slowly until your arms are straight.'],
    mistake: 'Leaning far back and yanking. Stay upright and pull smoothly.' },
  assistpull: { cues: [
    'Kneel on the pad and grip the bar just wider than your shoulders.',
    'Pull your chest up toward the bar.',
    'Lower slowly until your arms are straight.'],
    mistake: 'Stopping halfway down. Lower until your arms are fully straight.' },
  seatedrow: { cues: [
    'Sit tall with your knees slightly bent.',
    'Pull the handle to your belly button.',
    'Squeeze your shoulder blades, then reach forward slowly.'],
    mistake: 'Rocking back and forth. Keep your upper body still.' },
  dbrow: { cues: [
    'Put one hand and one knee on a bench, back flat.',
    'Pull the weight up toward your hip.',
    'Lower it slowly until your arm is straight.'],
    mistake: 'Twisting your body to lift. Keep both shoulders level.' },
  dbcurl: { cues: [
    'Stand tall with your palms facing forward.',
    'Curl the weights up toward your shoulders.',
    'Lower slowly until your arms are straight.'],
    mistake: 'Swinging your body. Keep your elbows by your sides and go lighter.' },
  cablecurl: { cues: [
    'Stand facing the machine with your elbows at your sides.',
    'Curl the bar up toward your shoulders.',
    'Lower slowly and keep the cable tight.'],
    mistake: 'Elbows moving forward. Keep them still beside your ribs.' },
  hammer: { cues: [
    'Hold the weights with your palms facing each other.',
    'Curl up without turning your wrists.',
    'Lower slowly until your arms are straight.'],
    mistake: 'Leaning back to lift. Stand tall and use a lighter weight.' },
  facepull: { cues: [
    'Set the rope at about face height.',
    'Pull the rope toward your face, hands going past your ears.',
    'Keep your elbows high, then return slowly.'],
    mistake: 'Leaning back to pull. Stay upright and use less weight.' },
  reardelt: { cues: [
    'Bend forward at the hips and keep your back flat.',
    'Lift your arms out to the sides with a soft bend in the elbows.',
    'Squeeze your shoulder blades, then lower slowly.'],
    mistake: 'Standing up as you lift. Keep your chest facing the floor.' },
  legpress: { cues: [
    'Place your feet shoulder-width apart on the platform.',
    'Lower until your knees are bent to about a right angle.',
    'Push through your heels until your legs are almost straight.'],
    mistake: 'Snapping your knees straight. Stop just short of fully straight.' },
  goblet: { cues: [
    'Hold one weight against your chest with both hands.',
    'Sit down between your knees and keep your chest up.',
    'Push through your whole foot to stand.'],
    mistake: 'Heels lifting. Sit back more and keep your heels down.' },
  legext: { cues: [
    'Set the pad just above your ankles.',
    'Straighten your legs until they are level.',
    'Lower slowly. Do not let the weight drop.'],
    mistake: 'Kicking the weight up. Lift smoothly and pause at the top.' },
  splitsquat: { cues: [
    'Stand in a long step, one foot forward and one back.',
    'Drop your back knee straight down toward the floor.',
    'Push through your front heel to stand back up.'],
    mistake: 'Front knee caving in. Keep it pointing over your toes.' },
  legcurl: { cues: [
    'Set the pad just above your heels.',
    'Curl your heels toward your backside.',
    'Let the pad return slowly, all the way.'],
    mistake: 'Hips lifting off the pad. Press them down and go lighter.' },
  dbrdl: { cues: [
    'Stand tall with the weights in front of your thighs.',
    'Push your hips back and slide the weights down your legs.',
    'Stop at mid-shin, then push your hips forward to stand.'],
    mistake: 'Back rounding. Keep your chest up and your back flat.' },
  calf: { cues: [
    'Stand with the balls of your feet on the step.',
    'Rise onto your toes as high as you can.',
    'Lower your heels slowly below the step.'],
    mistake: 'Bouncing fast. Pause at the top and lower slowly.' },
  squat: { cues: [
    'Rest the bar on your upper back, not on your neck.',
    'Sit back and down like reaching for a chair.',
    'Push the floor away and stand tall.'],
    mistake: 'Knees caving in. Push them out over your toes.' },
  lunge: { cues: [
    'Take a long step forward and keep your chest up.',
    'Lower until both knees are bent to about a right angle.',
    'Push through your front heel into the next step.'],
    mistake: 'Steps too short. Step longer so your front heel stays down.' },
  bbrdl: { cues: [
    'Hold the bar against your thighs with soft knees.',
    'Push your hips back and keep the bar close to your legs.',
    'Stop just below your knees, then push your hips forward.'],
    mistake: 'Bar drifting away from you. Keep it brushing your legs.' },
  hipthrust: { cues: [
    'Rest your upper back on a bench with the weight on your hips.',
    'Push through your heels and lift your hips until level.',
    'Squeeze at the top, then lower slowly.'],
    mistake: 'Lower back arching. Tuck your chin and keep your ribs down.' },
  crunch: { cues: [
    'Lie on your back with your knees bent and feet flat.',
    'Curl your shoulders off the floor toward your knees.',
    'Lower slowly back down.'],
    mistake: 'Pulling on your neck. Rest your fingertips lightly by your ears.' },
  legraise: { cues: [
    'Lie flat with your hands under your hips.',
    'Lift your legs until they point at the ceiling.',
    'Lower slowly and stop just above the floor.'],
    mistake: 'Lower back lifting. Press it into the floor and bend your knees.' },
  benchtuck: { cues: [
    'Sit on the edge of a bench and lean back a little.',
    'Pull your knees in toward your chest.',
    'Stretch your legs back out without touching the floor.'],
    mistake: 'Rushing the reps. Move slowly and keep your belly tight.' }
};

// Gentle cool-down, 4 min 50 s in total: standing first, then seated, then lying on a mat.
const STRETCHES = [
  { name: 'Chest opener', sec: 30, cue: 'Clasp your hands behind your back and gently lift your chest.' },
  { name: 'Cross-body shoulder', sec: 40, cue: 'Hug one arm across your chest. Switch arms halfway.' },
  { name: 'Standing calf stretch', sec: 40, cue: 'Step one foot back and press the heel down. Switch halfway.' },
  { name: 'Seated forward reach', sec: 40, cue: 'Sit tall with legs out and reach toward your shins. No bouncing.' },
  { name: 'Butterfly', sec: 30, cue: 'Soles of your feet together, sit tall, let your knees relax down.' },
  { name: 'Figure four', sec: 40, cue: 'On your back, ankle over knee, pull in gently. Switch halfway.' },
  { name: 'Knees to chest', sec: 30, cue: 'Lie back, hug both knees in, and breathe slowly.' },
  { name: 'Child\'s pose', sec: 40, cue: 'Kneel, sit back on your heels, and reach your arms forward.' }
];

// How the figures move: each joint is a <g class="mvj"> drawn in its mid-rep pose, with its pivot in
// transform-origin (viewBox units) and its two end poses in custom properties. --mva and --mvb are the rotation
// at each end of the rep; --mvxa, --mvya, --mvxb and --mvyb are an optional slide. All six are reset on every
// joint so that a nested joint never inherits its parent's values. One shared keyframe rule plays end A, mid,
// end B, mid. The two cubic-beziers are the two halves of ease-in-out, so a rep eases in and out as a whole and
// passes through the drawn pose exactly. With animation off, the drawn mid-rep pose shows.
const MV_CSS = [
  '.mv{display:block;width:140px;height:140px;max-width:100%;overflow:hidden;fill:none;stroke:var(--fg);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}',
  '.mv .mvh{fill:var(--fg);stroke:none}',
  '.mv .mvw{fill:var(--accent);stroke:none}',
  '.mv .mve{stroke:var(--accent)}',
  '.mv .mvc{stroke:var(--accent);stroke-width:2}',
  '.mv .mvf{stroke:var(--line);stroke-width:3}',
  '.mv .mvj{--mva:0deg;--mvb:0deg;--mvxa:0px;--mvya:0px;--mvxb:0px;--mvyb:0px;transform-box:view-box;animation:mvk 2.4s ease-in-out infinite}',
  '@keyframes mvk{',
  '0%,100%{transform:translate(var(--mvxa),var(--mvya)) rotate(var(--mva));animation-timing-function:cubic-bezier(.42,0,.71,.5)}',
  '25%,75%{transform:translate(0px,0px) rotate(0deg);animation-timing-function:cubic-bezier(.29,.5,.58,1)}',
  '50%{transform:translate(var(--mvxb),var(--mvyb)) rotate(var(--mvb));animation-timing-function:cubic-bezier(.42,0,.71,.5)}}',
  '@media (prefers-reduced-motion: reduce){.mv,.mv *{animation:none !important}}'
].join('\n');
(function () { const s = document.createElement('style'); s.id = 'mv-css'; s.textContent = MV_CSS; document.head.appendChild(s); })();

const MV_LABEL = {
  squat: 'Squat: hips drop and rise with a bar on the shoulders',
  hinge: 'Hip hinge: torso tips forward with a flat back as the weight slides down the legs',
  lunge: 'Lunge: the back knee drops toward the floor and rises',
  hpress: 'Horizontal press: lying on a bench, arms press the weight up',
  vpress: 'Vertical press: arms press the weights overhead',
  vpull: 'Vertical pull: arms pull a bar down from overhead',
  hpull: 'Horizontal pull: seated, arms pull a handle to the body',
  raise: 'Raise: arms lift out to the sides',
  curl: 'Curl: the forearm curls up at the elbow',
  extension: 'Extension: the forearm straightens down at the elbow',
  core: 'Core: lying on the floor, the legs lift'
};

// Line-figure artwork, one entry per pattern, in viewBox units (120 x 120). Classes: mvh head, mvw weight,
// mve equipment, mvc cable, mvf floor or bench, mvj animated joint.
const MV_ART = {
  squat: '<path class="mvf" d="M8 111H112"/><path d="M54 107.5 67 107.5"/><g class="mvj" style="transform-origin:57px 106px;--mva:-13deg;--mvb:13deg"><path d="M57 106 63.4 85"/><g class="mvj" style="transform-origin:63.4px 85px;--mva:52deg;--mvb:-52deg">' +
    '<path d="M63.4 85 48.4 68.9"/><g class="mvj" style="transform-origin:48.4px 68.9px;--mva:-55deg;--mvb:55deg"><path d="M48.4 68.9 58 42.6"/><path d="M58 42.6 48.1 49.3 52 41.4"/><circle class="mvw" cx="52" cy="41.4" r="6.5"/>' +
    '<circle class="mvh" cx="61.4" cy="31.6" r="6.5"/></g></g></g>',
  hinge: '<path class="mvf" d="M8 111H112"/><path d="M51 107.5 64 107.5"/><g class="mvj" style="transform-origin:54px 106px;--mva:4deg;--mvb:-4deg"><path d="M54 106 52.5 84.1"/><g class="mvj" style="transform-origin:52.5px 84.1px;--mva:7deg;--mvb:-7deg">' +
    '<path d="M52.5 84.1 48.3 62.5"/><g class="mvj" style="transform-origin:48.3px 62.5px;--mva:-46deg;--mvb:46deg"><path d="M48.3 62.5 65.9 40.7"/><g class="mvj" style="transform-origin:65.9px 40.7px;--mva:23deg;--mvb:-23deg">' +
    '<path d="M65.9 40.7 60.1 68.1"/><circle class="mvw" cx="60.1" cy="68.1" r="6"/></g><circle class="mvh" cx="73.1" cy="31.8" r="6.5"/></g></g></g>',
  lunge: '<path class="mvf" d="M8 111H112"/><g class="mvj" style="--mvya:-6.5px;--mvyb:6.5px"><g class="mvj" style="transform-origin:57px 75.5px;--mva:5.6deg;--mvb:-0.2deg"><path d="M57 75.5 57.7 97.5"/>' +
    '<g class="mvj" style="transform-origin:57.7px 97.5px;--mva:-23.6deg;--mvb:17.2deg"><path d="M57.7 97.5 36 101"/></g></g><g class="mvj" style="transform-origin:57px 75.5px;--mva:22.9deg;--mvb:-17.5deg"><path d="M57 75.5 77.3 84"/>' +
    '<g class="mvj" style="transform-origin:77.3px 84px;--mva:-35.8deg;--mvb:21.7deg"><path d="M77.3 84 78 106"/></g></g><path d="M57 75.5 58.5 47.5"/><path d="M58.5 47.5 58.5 76.5"/><path class="mve" d="M53 77.5 64 77.5"/>' +
    '<circle class="mvw" cx="53" cy="77.5" r="3.4"/><circle class="mvw" cx="64" cy="77.5" r="3.4"/><circle class="mvh" cx="59.1" cy="36.1" r="6.5"/></g><path d="M36 101 41.5 107.5"/><path d="M78 106 88 107.5"/>',
  hpress: '<path class="mvf" d="M8 111H112"/><path class="mvf" d="M20 85H82M28 85V110M74 85V110"/><circle class="mvh" cx="27" cy="76.5" r="6.5"/><path d="M36 79 70 79 91 81 93 106.5 102 107.5"/>' +
    '<g class="mvj" style="transform-origin:42px 78px;--mva:-30deg;--mvb:30deg"><path d="M42 78 52.4 67.2"/><g class="mvj" style="transform-origin:52.4px 67.2px;--mva:60deg;--mvb:-60deg"><path d="M52.4 67.2 42 56.4"/>' +
    '<circle class="mvw" cx="42" cy="56.4" r="7"/></g></g>',
  vpress: '<path class="mvf" d="M8 111H112"/><circle class="mvh" cx="60" cy="36" r="6.5"/><path d="M46 49 74 49"/><path d="M60 49 60 77"/><path d="M45.5 107.5 51 107 60 77 69 107 74.5 107.5"/>' +
    '<g class="mvj" style="transform-origin:46px 49px;--mva:48deg;--mvb:-48deg"><path d="M46 49 32.8 42"/><g class="mvj" style="transform-origin:32.8px 42px;--mva:-46deg;--mvb:46deg"><path d="M32.8 42 33.3 27"/><path class="mve" d="M27.8 27 38.8 27"/>' +
    '<circle class="mvw" cx="27.8" cy="27" r="3.4"/><circle class="mvw" cx="38.8" cy="27" r="3.4"/></g></g><g class="mvj" style="transform-origin:74px 49px;--mva:-48deg;--mvb:48deg"><path d="M74 49 87.2 42"/>' +
    '<g class="mvj" style="transform-origin:87.2px 42px;--mva:46deg;--mvb:-46deg"><path d="M87.2 42 86.7 27"/><path class="mve" d="M81.2 27 92.2 27"/><circle class="mvw" cx="81.2" cy="27" r="3.4"/><circle class="mvw" cx="92.2" cy="27" r="3.4"/></g></g>',
  vpull: '<path class="mvf" d="M8 111H112"/><path class="mvf" d="M38 94H82"/><g class="mvj" style="--mvya:-11.5px;--mvyb:11.5px"><path class="mvc" d="M60 44.5 60 -40"/><path class="mve" d="M30 44.5 90 44.5"/></g><circle class="mvh" cx="60" cy="47" r="6.5"/>' +
    '<path d="M47 60 73 60"/><path d="M60 60 60 87"/><path d="M43.5 108 49 107 50 92 60 87 70 92 71 107 76.5 108"/><g class="mvj" style="transform-origin:47px 60px;--mva:50.3deg;--mvb:-51deg"><path d="M47 60 32 59"/>' +
    '<g class="mvj" style="transform-origin:32px 59px;--mva:-74.1deg;--mvb:32.7deg"><path d="M32 59 36 44.5"/></g></g><g class="mvj" style="transform-origin:73px 60px;--mva:-50.3deg;--mvb:51deg"><path d="M73 60 88 59"/>' +
    '<g class="mvj" style="transform-origin:88px 59px;--mva:74.1deg;--mvb:-32.7deg"><path d="M88 59 84 44.5"/></g></g>',
  hpull: '<path class="mvf" d="M8 111H112"/><path class="mvf" d="M28 92H60M44 92V110"/><path d="M44 86 66 84 69 106.5 79 107.5"/><g class="mvj" style="transform-origin:44px 86px;--mva:2deg;--mvb:-2deg"><path d="M44 86 45.5 58"/>' +
    '<g class="mvj" style="transform-origin:45.5px 58px;--mva:-55.6deg;--mvb:60.2deg"><path d="M45.5 58 48.4 72.8"/><g class="mvj" style="transform-origin:48.4px 72.8px;--mva:78.5deg;--mvb:-32.3deg"><path d="M48.4 72.8 61.8 66"/>' +
    '<g class="mvj" style="transform-origin:61.8px 66px;--mva:-22.2deg;--mvb:-27.9deg"><path class="mvc" d="M61.8 66 171.1 78.4"/></g><circle class="mvw" cx="61.8" cy="66" r="3.4"/></g></g><circle class="mvh" cx="46.1" cy="46.6" r="6.5"/></g>',
  raise: '<path class="mvf" d="M8 111H112"/><circle class="mvh" cx="60" cy="36" r="6.5"/><path d="M46 49 74 49"/><path d="M60 49 60 77"/><path d="M45.5 107.5 51 107 60 77 69 107 74.5 107.5"/>' +
    '<g class="mvj" style="transform-origin:46px 49px;--mva:-40deg;--mvb:40deg"><path d="M46 49 24.4 68.4"/><circle class="mvw" cx="24.4" cy="68.4" r="4.6"/></g><g class="mvj" style="transform-origin:74px 49px;--mva:40deg;--mvb:-40deg">' +
    '<path d="M74 49 95.6 68.4"/><circle class="mvw" cx="95.6" cy="68.4" r="4.6"/></g>',
  curl: '<path class="mvf" d="M8 111H112"/><path d="M57 107.5 49 106 53 67 58 106 66 107.5"/><path d="M53 67 53 39"/><circle class="mvh" cx="53.4" cy="27.5" r="6.5"/><path d="M53 39 56.6 53.6"/>' +
    '<g class="mvj" style="transform-origin:56.6px 53.6px;--mva:72.5deg;--mvb:-72.5deg"><path d="M56.6 53.6 71.6 54.2"/><circle class="mvw" cx="71.6" cy="54.2" r="5"/></g>',
  extension: '<path class="mvf" d="M8 111H112"/><path d="M54 107.5 46 106 50 67 55 106 63 107.5"/><path d="M50 67 53.9 39.3"/><circle class="mvh" cx="55.9" cy="27.9" r="6.5"/><path d="M53.9 39.3 56.5 54"/>' +
    '<g class="mvj" style="transform-origin:56.5px 54px;--mva:-58deg;--mvb:58deg"><path d="M56.5 54 70.6 59.2"/><g class="mvj" style="transform-origin:70.6px 59.2px;--mva:60.9deg;--mvb:-52.4deg"><path class="mvc" d="M70.6 59.2 83.7 -65.1"/></g>' +
    '<circle class="mvw" cx="70.6" cy="59.2" r="3.6"/></g>',
  core: '<path class="mvf" d="M8 111H112"/><circle class="mvh" cx="19.5" cy="102.5" r="6.5"/><path d="M29 101.5 58 101.5"/><path d="M32 102.5 40 106.5 53 106.5"/><g class="mvj" style="transform-origin:58px 101.5px;--mva:35deg;--mvb:-35deg">' +
    '<path d="M58 101.5 89.1 70.4"/><path d="M89.1 70.4 84.2 65.4"/></g>'
};

// Returns the inline SVG for a movement pattern. Unknown patterns fall back to the squat.
function demoSVG(pattern) {
  const p = Object.prototype.hasOwnProperty.call(MV_ART, pattern) ? pattern : 'squat';
  return '<svg class="mv mv-' + p + '" viewBox="0 0 120 120" role="img" aria-label="' + MV_LABEL[p] + '">' + MV_ART[p] + '</svg>';
}
