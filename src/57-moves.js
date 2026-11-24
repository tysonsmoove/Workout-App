// 57-moves.js: the cool-down stretch sequence of a guided session.
// The pictures of every move are in 58-figure.js and 59-figures.js, and the how-to cards in 59-guide-text.js.
// `g` is the key of each stretch's picture and card.

// Gentle cool-down, 4 min 50 s in total: standing first, then seated, then lying on a mat.
const STRETCHES = [
  { name: 'Chest opener', sec: 30, g: 'sx_chest', cue: 'Clasp your hands behind your back and gently lift your chest.' },
  { name: 'Cross-body shoulder', sec: 40, g: 'sx_shoulder', cue: 'Hug one arm across your chest. Switch arms halfway.' },
  { name: 'Standing calf stretch', sec: 40, g: 'sx_calf', cue: 'Step one foot back and press the heel down. Switch halfway.' },
  { name: 'Seated forward reach', sec: 40, g: 'sx_reach', cue: 'Sit tall with legs out and reach toward your shins. No bouncing.' },
  { name: 'Butterfly', sec: 30, g: 'sx_butterfly', cue: 'Soles of your feet together, sit tall, let your knees relax down.' },
  { name: 'Figure four', sec: 40, g: 'sx_figure4', cue: 'On your back, ankle over knee, pull in gently. Switch halfway.' },
  { name: 'Knees to chest', sec: 30, g: 'sx_knees', cue: 'Lie back, hug both knees in, and breathe slowly.' },
  { name: 'Child\'s pose', sec: 40, g: 'sx_child', cue: 'Kneel, sit back on your heels, and reach your arms forward.' }
];
