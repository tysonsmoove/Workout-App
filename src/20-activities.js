/* ---------- Pick-your-own activities: a gentle menu, logged by minutes ---------- */
// impact: 1 very gentle, 2 gentle. stress: body areas the activity loads, matched against a profile's "go easy on" list.
// mv:false marks recovery sessions: they log and show in history but do not count toward active-day minutes.
const ACT_CATS = [['walk', 'Walks'], ['mobility', 'Stretch'], ['cardio', 'Easy cardio'], ['strength', 'Light strength'], ['mind', 'Mind & body'], ['life', 'Everyday']];
const IMPACT = { 1: 'very gentle', 2: 'gentle', 3: 'moderate' };
const AREAS = { knee: 'Knees', back: 'Back', shoulder: 'Shoulders', hip: 'Hips', ankle: 'Ankles & feet', wrist: 'Wrists', neck: 'Neck' };
const ACTS = {
  walkeasy:   { name: 'Easy walk', cat: 'walk', icon: '🚶', min: 15, impact: 1, stress: [], desc: 'Comfortable pace on flat ground. You should be able to chat the whole way.' },
  walkdinner: { name: 'After-dinner walk', cat: 'walk', icon: '🌆', min: 10, impact: 1, stress: [], desc: 'A short loop around the block after a meal. Ten minutes is plenty.' },
  walktread:  { name: 'Treadmill walk (Fitness+)', cat: 'walk', icon: '🎧', min: 15, impact: 1, stress: [], desc: 'Pick an Apple Fitness+ walk and keep the pace easy. Use the rails if your balance is off.' },
  walkpair:   { name: 'Walk together', cat: 'walk', icon: '💬', min: 20, impact: 1, stress: [], desc: 'Walk with your partner. Each of you logs it on your own profile.' },
  walkerrand: { name: 'Errand walk', cat: 'walk', icon: '🛒', min: 15, impact: 1, stress: [], desc: 'Park far out and take the long way through the store. Steps count wherever they happen.' },
  walkbrisk:  { name: 'Brisk walk', cat: 'walk', icon: '👟', min: 20, impact: 2, stress: ['knee', 'ankle', 'hip'], desc: 'Quick enough to warm you up, slow enough to talk in full sentences.' },
  walkpark:   { name: 'Park or trail walk', cat: 'walk', icon: '🌳', min: 30, impact: 2, stress: ['ankle', 'knee'], desc: 'Uneven ground works ankles and balance. Wear supportive shoes and turn back early if anything flares.' },
  stretchwake:{ name: 'Wake-up stretch', cat: 'mobility', icon: '☀️', min: 5, impact: 1, stress: [], desc: 'Reach overhead, roll the shoulders, gentle side bends, ankle circles. Five slow minutes.' },
  stretchfull:{ name: 'Gentle full-body stretch', cat: 'mobility', icon: '🙆', min: 10, impact: 1, stress: [], desc: 'Neck, shoulders, back, hips, calves. Hold each stretch 20 to 30 seconds and never push into pain.' },
  chairyoga:  { name: 'Chair yoga', cat: 'mobility', icon: '🪑', min: 15, impact: 1, stress: [], desc: 'Seated and supported poses. A good pick on days when getting down to the floor is hard.' },
  necksh:     { name: 'Neck and shoulder release', cat: 'mobility', icon: '💆', min: 5, impact: 1, stress: [], desc: 'Slow chin tucks, ear-to-shoulder tilts and shoulder rolls. Small, pain-free range.' },
  hipsback:   { name: 'Hips and low-back mobility', cat: 'mobility', icon: '🔄', min: 10, impact: 1, stress: [], desc: 'Cat-cow, knee-to-chest, figure-four and gentle lying twists.' },
  foamroll:   { name: 'Foam rolling', cat: 'mobility', icon: '🧴', min: 10, impact: 1, stress: [], desc: 'Slow passes over calves, quads, glutes and upper back. Stay off joints and the low spine.' },
  yoga:       { name: 'Yoga (Fitness+)', cat: 'mobility', icon: '🧘', min: 20, impact: 2, stress: ['wrist', 'knee'], desc: 'Choose a slow-flow or beginner session. Skip or modify any pose that loads a sore joint.' },
  recbike:    { name: 'Recumbent bike', cat: 'cardio', icon: '🚲', min: 15, impact: 1, stress: [], desc: 'The seat supports your back and it is easy on knees and hips. Light resistance, steady pedaling.' },
  swim:       { name: 'Swim or water walking', cat: 'cardio', icon: '🏊', min: 20, impact: 1, stress: ['shoulder'], desc: 'Water takes weight off the joints. Walking laps in the shallow end counts.' },
  bike:       { name: 'Stationary bike', cat: 'cardio', icon: '🚴', min: 15, impact: 2, stress: ['back'], desc: 'Easy spin. Raise the seat until your knee keeps a slight bend at the bottom.' },
  elliptical: { name: 'Elliptical, easy', cat: 'cardio', icon: '🌀', min: 15, impact: 2, stress: ['ankle', 'hip'], desc: 'Low resistance, smooth stride, feet stay on the pedals so there is no pounding.' },
  row:        { name: 'Rowing machine, easy', cat: 'cardio', icon: '🚣', min: 10, impact: 2, stress: ['back', 'knee'], desc: 'Legs, then lean, then arms. Keep the pace relaxed and the back long.' },
  dance:      { name: 'Dance', cat: 'cardio', icon: '💃', min: 15, impact: 2, stress: ['knee', 'ankle'], desc: 'A Fitness+ dance session or three songs in the kitchen. Keep jumps out of it.' },
  bwbasics:   { name: 'Bodyweight basics', cat: 'strength', icon: '🧍', min: 10, impact: 2, stress: ['knee', 'wrist'], desc: 'Sit-to-stand from a chair, wall push-ups, glute bridges, standing calf raises. Two rounds of 8 to 10.' },
  bands:      { name: 'Resistance band circuit', cat: 'strength', icon: '🎗️', min: 15, impact: 2, stress: ['shoulder'], desc: 'Rows, pull-aparts, presses and side steps with a light band. Smooth, controlled reps.' },
  machines:   { name: 'Machine circuit, light', cat: 'strength', icon: '🏢', min: 20, impact: 2, stress: [], desc: 'At the gym: leg press, seated row, chest press, lat pulldown. One or two easy sets each. Machines guide the path, which helps around old injuries.' },
  lightdb:    { name: 'Light dumbbells', cat: 'strength', icon: '🏋️', min: 15, impact: 2, stress: ['shoulder', 'wrist', 'back'], desc: 'Curls, overhead press, rows and goblet sit-to-stand with a weight you could lift 15 times.' },
  corebasics: { name: 'Core basics', cat: 'strength', icon: '🎯', min: 10, impact: 1, stress: ['back'], desc: 'Dead bug, bird dog, glute bridge, side plank from the knees. Slow and steady, stop if the back complains.' },
  pilates:    { name: 'Pilates (Fitness+)', cat: 'strength', icon: '🤸', min: 15, impact: 2, stress: ['neck', 'wrist'], desc: 'A beginner mat session. Support your head with a hand if your neck tires.' },
  balance:    { name: 'Balance practice', cat: 'strength', icon: '🦩', min: 5, impact: 1, stress: ['ankle'], desc: 'Stand near a counter. Single-leg stands and heel-to-toe walking, 30 seconds at a time.' },
  taichi:     { name: 'Tai chi', cat: 'mind', icon: '🍃', min: 15, impact: 1, stress: [], desc: 'Slow, flowing movement. Follow a beginner video and keep the knees soft.' },
  mindful:    { name: 'Mindful cooldown (Fitness+)', cat: 'mind', icon: '🌙', min: 5, impact: 1, stress: [], mv: false, desc: 'A guided cooldown or meditation. Logs as recovery.' },
  breathe:    { name: 'Breathing reset', cat: 'mind', icon: '🌬️', min: 5, impact: 1, stress: [], mv: false, desc: 'In for four, out for six, for five minutes. Logs as recovery.' },
  yard:       { name: 'Yard work or gardening', cat: 'life', icon: '🌱', min: 20, impact: 2, stress: ['back', 'knee'], desc: 'Raking, planting, weeding. Kneel on a pad and switch sides often.' },
  clean:      { name: 'House cleaning', cat: 'life', icon: '🧽', min: 20, impact: 2, stress: ['back'], desc: 'Vacuuming, mopping, scrubbing. It all counts as movement.' },
  stairs:     { name: 'Take the stairs', cat: 'life', icon: '🪜', min: 5, impact: 2, stress: ['knee'], desc: 'A few flights at an easy pace. Use the handrail.' },
  outing:     { name: 'Active outing', cat: 'life', icon: '🎈', min: 30, impact: 2, stress: [], desc: 'The zoo, a museum, a long shopping trip, a lap around the Speedway grounds.' },
  other:      { name: 'Something else', cat: 'life', icon: '✏️', min: 15, impact: 2, stress: [], desc: 'Name it and log the minutes.' }
};
const FEELS = { easy: 'Easy', good: 'Just right', tough: 'Tough' };

function actCaution(pid, key) { // areas on the profile's go-easy list that this activity loads
  const protect = P(pid).move.protect || [], a = ACTS[key];
  return a ? a.stress.filter(x => protect.includes(x)) : [];
}
function actList(pid, filter) {
  const p = P(pid), favs = p.favorites, order = ACT_CATS.map(c => c[0]);
  return Object.keys(ACTS).filter(k => {
    const a = ACTS[k];
    if (filter.cat !== 'all' && a.cat !== filter.cat) return false;
    if (filter.quick && a.min > 10) return false;
    if (filter.fav && !favs.includes(k)) return false;
    return true;
  }).map((k, i) => ({ k, i, fav: favs.includes(k), caution: actCaution(pid, k).length }))
    .sort((x, y) => (y.fav - x.fav) || (x.caution - y.caution) || (order.indexOf(ACTS[x.k].cat) - order.indexOf(ACTS[y.k].cat)) || (ACTS[x.k].impact - ACTS[y.k].impact) || (x.i - y.i))
    .map(x => x.k);
}
function surpriseActivity(pid) {
  const pool = Object.keys(ACTS).filter(k => k !== 'other' && ACTS[k].mv !== false && !actCaution(pid, k).length);
  const recent = new Set(); const t = todayIso();
  for (let i = 0; i < 4; i++) dayInfo(pid, addDays(t, -i)).kinds.forEach(k => recent.add(k));
  const fresh = pool.filter(k => !recent.has(k));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(Math.random() * from.length)];
}
const actName = a => a.name || (ACTS[a.a] ? ACTS[a.a].name : 'Activity');
const actIcon = a => a.src === 'health' ? '⌚' : ACTS[a.a] ? ACTS[a.a].icon : '✏️';

// The Watch's Exercise Minutes for a day live on that day's health doc. Movement logged by hand counts first; the
// top-up entry holds only what the Watch saw beyond it, so the same walk never counts twice. Every change to a
// day's activities passes through here, in the same write. On a lift or treadmill day Watch minutes are shown, not added.
function watchTopUp(pid, date, acts, program) {
  const h = state.data[pid].health[date], rest = acts.filter(a => a && !isHk(a)), had = acts.find(isHk);
  if (program) return rest;
  if (!h || !isNum(h.exercise)) return acts.filter(Boolean); // no Watch total on record: leave the day as it is
  if (h.topUp === false) return rest;                        // the top-up was turned down for this day
  const manual = sum(rest.filter(a => a.mv !== false && isNum(a.min)), a => a.min), extra = Math.max(0, Math.round(h.exercise - manual));
  if (!extra) return rest;
  return rest.concat([{ id: HK_ACT_ID, a: 'other', name: 'Apple Watch exercise', min: extra, feel: null, hurt: false, note: 'From Apple Health', mv: true, src: 'health', at: had && had.at || new Date().toISOString() }]);
}
// Adds or updates one activity. Next to a lift or treadmill entry it joins the same day; on its own it makes an
// activity day (and replaces a rest day).
async function logActivity(date, entry) {
  const pid = me(), path = PATH.session(pid, date), cur = getDoc(path), now = new Date().toISOString(), n = cur ? normalize(cur) : null, program = !!(n && n.program);
  let acts = cur && Array.isArray(cur.acts) ? cur.acts.filter(Boolean) : [];
  const i = acts.findIndex(x => x.id === entry.id); if (i >= 0) acts[i] = entry; else acts.push(entry);
  acts = watchTopUp(pid, date, acts, program);
  return write(path, program ? Object.assign({}, cur, { acts, updatedAt: now }) : { v: SCHEMA, date, kind: 'activity', acts, savedAt: cur && cur.savedAt || now, updatedAt: now });
}
async function removeActivity(date, id) {
  const pid = me(), path = PATH.session(pid, date), cur = getDoc(path); if (!cur || !Array.isArray(cur.acts)) return false;
  const n = normalize(cur), acts = watchTopUp(pid, date, cur.acts.filter(x => x && x.id !== id), n.program), next = Object.assign({}, cur, { acts, updatedAt: new Date().toISOString() });
  if (n.program && !acts.length) delete next.acts;
  return write(path, n.program || acts.length ? next : null);
}
// After an import (or turning the top-up off): bring the top-up entry in line with the day's Watch total.
// Resolves 'added', 'removed', 'same', or false when the save was refused.
async function syncWatch(date) {
  const pid = me(), path = PATH.session(pid, date), cur = getDoc(path), n = cur ? normalize(cur) : null, now = new Date().toISOString();
  const before = cur && Array.isArray(cur.acts) ? cur.acts.filter(Boolean) : [], after = watchTopUp(pid, date, before, !!(n && n.program));
  const a = before.find(isHk), b = after.find(isHk);
  if ((a ? a.min : 0) === (b ? b.min : 0)) return 'same';
  let doc;
  if (n && n.program) { doc = Object.assign({}, cur, { updatedAt: now }); if (after.length) doc.acts = after; else delete doc.acts; }
  else doc = after.length ? { v: SCHEMA, date, kind: 'activity', acts: after, savedAt: cur && cur.savedAt || now, updatedAt: now } : null;
  return (await write(path, doc)) ? (b ? 'added' : 'removed') : false;
}
async function logRest(date) {
  const now = new Date().toISOString();
  return write(PATH.session(me(), date), { v: SCHEMA, date, kind: 'rest', notes: '', savedAt: now, updatedAt: now });
}
