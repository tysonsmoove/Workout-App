/* ---------- Lifting program (Push / Pull / Legs) ---------- */
// Equipment confirmed on the Avon Anytime Fitness listing: treadmills, barbells, dumbbells, squat racks,
// kettlebells, medicine balls, resistance bands, plyo boxes. Selectorized machines and the cable station
// are standard at Anytime Fitness clubs; every machine move has a dumbbell/barbell fallback via Swap.
// `per: 'each hand'` marks dumbbell loads: the weight is one dumbbell, not the pair.
// `alt` lists substitutes in order of preference. Some are also planned on the same day in a later phase, so a swap
// is only ever offered to one that is not already in that day's workout (see swapOptions).
const EX = {
  chestpress:  { name: 'Chest press machine', equip: 'Machine', sets: 3, lo: 8, hi: 12, inc: 5, start: 70, alt: ['dbbench'] },
  dbbench:     { name: 'Dumbbell bench press', equip: 'Dumbbells + bench', sets: 3, lo: 8, hi: 12, inc: 5, start: 30, per: 'each hand', alt: ['chestpress'] },
  shoulderpress:{ name: 'Shoulder press machine', equip: 'Machine', sets: 3, lo: 8, hi: 12, inc: 5, start: 50, alt: ['dbshoulder'] },
  dbshoulder:  { name: 'Seated dumbbell shoulder press', equip: 'Dumbbells + bench', sets: 3, lo: 8, hi: 12, inc: 5, start: 20, per: 'each hand', alt: ['shoulderpress'] },
  pushdown:    { name: 'Cable triceps pushdown', equip: 'Cable station', sets: 3, lo: 10, hi: 15, inc: 5, start: 40, alt: ['dbtri'] },
  dbtri:       { name: 'Dumbbell overhead triceps extension', equip: 'One dumbbell, both hands', sets: 3, lo: 10, hi: 15, inc: 5, start: 25, alt: ['pushdown'] },
  inclinedb:   { name: 'Incline dumbbell press', equip: 'Dumbbells + incline bench', sets: 3, lo: 8, hi: 12, inc: 5, start: 25, per: 'each hand', alt: ['pecdeck', 'chestpress', 'dbbench'] },
  pecdeck:     { name: 'Pec deck / chest fly machine', equip: 'Machine', sets: 3, lo: 10, hi: 15, inc: 5, start: 60, alt: ['inclinedb', 'chestpress', 'dbbench'] },
  latraise:    { name: 'Dumbbell lateral raise', equip: 'Dumbbells', sets: 3, lo: 12, hi: 15, inc: 2.5, start: 10, per: 'each hand', alt: ['cablelat'] },
  cablelat:    { name: 'Cable lateral raise', equip: 'Cable station', sets: 3, lo: 12, hi: 15, inc: 2.5, start: 10, alt: ['latraise'] },
  latpull:     { name: 'Lat pulldown machine', equip: 'Machine', sets: 3, lo: 8, hi: 12, inc: 5, start: 80, alt: ['assistpull'] },
  assistpull:  { name: 'Assisted pull-up machine', equip: 'Machine. Weight = assist; less assist is harder', sets: 3, lo: 8, hi: 12, inc: -5, start: 80, alt: ['latpull'] },
  seatedrow:   { name: 'Seated cable row', equip: 'Cable row station', sets: 3, lo: 8, hi: 12, inc: 5, start: 80, alt: ['dbrow'] },
  dbrow:       { name: 'One-arm dumbbell row', equip: 'Dumbbell + bench', sets: 3, lo: 8, hi: 12, inc: 5, start: 30, per: 'each hand', alt: ['seatedrow'] },
  dbcurl:      { name: 'Dumbbell biceps curl', equip: 'Dumbbells', sets: 3, lo: 10, hi: 12, inc: 2.5, start: 20, per: 'each hand', alt: ['cablecurl', 'hammer'] },
  cablecurl:   { name: 'Cable biceps curl', equip: 'Cable station', sets: 3, lo: 10, hi: 12, inc: 5, start: 40, alt: ['dbcurl', 'hammer'] },
  hammer:      { name: 'Hammer curl', equip: 'Dumbbells', sets: 3, lo: 10, hi: 12, inc: 2.5, start: 20, per: 'each hand', alt: ['dbcurl', 'cablecurl'] },
  facepull:    { name: 'Cable face pull', equip: 'Cable station + rope', sets: 3, lo: 12, hi: 15, inc: 5, start: 30, alt: ['reardelt'] },
  reardelt:    { name: 'Dumbbell rear-delt fly', equip: 'Dumbbells', sets: 3, lo: 12, hi: 15, inc: 2.5, start: 10, per: 'each hand', alt: ['facepull'] },
  legpress:    { name: 'Leg press machine', equip: 'Machine', sets: 3, lo: 10, hi: 12, inc: 10, start: 140, alt: ['goblet'] },
  goblet:      { name: 'Goblet squat', equip: 'Kettlebell or dumbbell', sets: 3, lo: 10, hi: 12, inc: 5, start: 35, alt: ['legpress'] },
  legext:      { name: 'Leg extension machine', equip: 'Machine', sets: 3, lo: 10, hi: 15, inc: 5, start: 70, alt: ['splitsquat'] },
  splitsquat:  { name: 'Dumbbell split squat', equip: 'Dumbbells', sets: 3, lo: 10, hi: 12, inc: 5, start: 20, per: 'each hand', alt: ['legext'] },
  legcurl:     { name: 'Leg curl machine', equip: 'Machine (seated or lying)', sets: 3, lo: 10, hi: 15, inc: 5, start: 60, alt: ['dbrdl', 'hipthrust'] },
  dbrdl:       { name: 'Dumbbell Romanian deadlift', equip: 'Dumbbells', sets: 3, lo: 10, hi: 12, inc: 5, start: 30, per: 'each hand', alt: ['bbrdl', 'legcurl', 'hipthrust'] },
  calf:        { name: 'Standing calf raise', equip: 'Calf machine or step + dumbbell', sets: 3, lo: 12, hi: 15, inc: 10, start: 90, alt: ['goblet'] },
  squat:       { name: 'Barbell back squat', equip: 'Squat rack', sets: 3, lo: 6, hi: 10, inc: 10, start: 95, alt: ['legpress', 'goblet'] },
  lunge:       { name: 'Walking lunges', equip: 'Dumbbells', sets: 3, lo: 10, hi: 12, inc: 5, start: 15, per: 'each hand', alt: ['splitsquat', 'legext'] },
  bbrdl:       { name: 'Barbell Romanian deadlift', equip: 'Barbell', sets: 3, lo: 8, hi: 12, inc: 10, start: 65, alt: ['dbrdl', 'legcurl', 'hipthrust'] },
  hipthrust:   { name: 'Dumbbell hip thrust', equip: 'Dumbbell + flat bench', sets: 3, lo: 10, hi: 15, inc: 5, start: 30, alt: ['legcurl', 'dbrdl', 'bbrdl'] },
  crunch:      { name: 'Crunches', equip: 'Mat', sets: 3, lo: 15, hi: 20, bw: true },
  legraise:    { name: 'Lying leg raises', equip: 'Mat', sets: 3, lo: 10, hi: 15, bw: true },
  benchtuck:   { name: 'Bench knee tucks', equip: 'Flat bench', sets: 3, lo: 10, hi: 15, bw: true, note: 'Sit on the end of the bench, legs hanging, lean back and pull knees to chest.' }
};
const CORE = ['crunch', 'legraise', 'benchtuck'];
const DAYS = {
  push: { name: 'Push', sub: 'Chest, shoulders, triceps',
    phases: { 1: ['chestpress', 'shoulderpress', 'pushdown'], 2: ['chestpress', 'inclinedb', 'shoulderpress', 'latraise', 'pushdown'], 3: ['inclinedb', 'pecdeck', 'shoulderpress', 'latraise', 'pushdown'] } },
  pull: { name: 'Pull', sub: 'Back, biceps, core',
    phases: { 1: ['latpull', 'seatedrow', 'dbcurl'].concat(CORE), 2: ['latpull', 'seatedrow', 'facepull', 'dbcurl'].concat(CORE), 3: ['latpull', 'seatedrow', 'facepull', 'hammer', 'dbcurl'].concat(CORE) } },
  legs: { name: 'Legs', sub: 'Quads, hamstrings, calves, core',
    phases: { 1: ['legpress', 'legext', 'legcurl'].concat(CORE), 2: ['legpress', 'dbrdl', 'legext', 'legcurl', 'calf'].concat(CORE), 3: ['squat', 'dbrdl', 'lunge', 'legcurl', 'calf'].concat(CORE) } }
};
const ROTATION = ['push', 'pull', 'legs'];
// Full Body A/B: everything is trained in two sessions, for weeks that are not regular. Each slot has its own set
// count and rep range (`slots`); `optional` slots are there if time allows and are not needed for a finished session.
// Phases do not apply: every phase is the same list, so the code that reads `phases` works unchanged.
const fullDay = (name, sub, slots) => { const order = Object.keys(slots); return { name, sub, full: true, slots, phases: { 1: order, 2: order, 3: order } }; };
const fbSlot = (sets, lo, hi, optional) => optional ? { sets, lo, hi, optional: true } : { sets, lo, hi };
DAYS.fba = fullDay('Full Body A', 'Squat, press, pull, core', { squat: fbSlot(3, 6, 10), dbbench: fbSlot(3, 8, 12), latpull: fbSlot(3, 8, 12), dbshoulder: fbSlot(2, 8, 12), legcurl: fbSlot(2, 10, 15), legraise: fbSlot(2, 10, 15) });
DAYS.fbb = fullDay('Full Body B', 'Hinge, press, row, shoulders', { dbrdl: fbSlot(3, 8, 12), inclinedb: fbSlot(3, 8, 12), seatedrow: fbSlot(3, 8, 12), lunge: fbSlot(2, 10, 12), latraise: fbSlot(2, 12, 15), facepull: fbSlot(2, 12, 15), dbcurl: fbSlot(2, 10, 12, true), pushdown: fbSlot(2, 10, 15, true) });
const FULL_ROTATION = ['fba', 'fbb'];
const EXPRESS_LIFTS = 3; // "short on time": the first three lifts of the day
// The split is a setting. A profile that never chose one keeps Push / Pull / Legs; old days stay whatever they were.
const splitOf = pid => state.data[pid || me()].settings.split === 'full' ? 'full' : 'ppl';
const rotation = pid => splitOf(pid) === 'full' ? FULL_ROTATION : ROTATION;
const nextAfter = (day, pid) => { const rot = rotation(pid); return rot[(rot.indexOf(day) + 1) % rot.length]; }; // a day from the other split leads to the first day of this one
const slotOf = (kind, base) => (DAYS[kind] && DAYS[kind].slots && DAYS[kind].slots[base]) || null;
const alts = k => { const a = EX[k] && EX[k].alt; return (Array.isArray(a) ? a : a ? [a] : []).filter(x => EX[x]); };
// Two slots never land on the same exercise. An old saved swap can point at one that is also planned that day; then
// the slot whose own planned exercise it is keeps it, and otherwise the earlier slot does, while the other slot goes
// back to its planned exercise. No slot is ever dropped, so a day always keeps its full count.
function settleSwaps(slots) {
  for (let guard = 0; guard <= slots.length; guard++) {
    const seen = {}; let changed = false;
    slots.forEach(p => { if (p.key === p.base) seen[p.key] = 1; });
    slots.forEach(p => { if (p.key === p.base) return; if (seen[p.key]) { p.key = p.base; changed = true; } else seen[p.key] = 1; });
    if (!changed) break;
  }
  return slots;
}
const planSlots = (kind, phase, swaps) => settleSwaps((DAYS[kind].phases[phase] || []).map(b => ({ base: b, key: swaps && swaps[b] && EX[swaps[b]] ? swaps[b] : b })));
// What one slot can be swapped to in a workout: back to its planned exercise, or an alternate, but never an exercise
// that is planned in another slot or already swapped into one.
function swapOptions(planned, p) {
  const taken = {}; planned.forEach(x => { if (x.base !== p.base) { taken[x.base] = 1; taken[x.key] = 1; } });
  const out = []; if (p.key !== p.base && !taken[p.base]) out.push(p.base);
  alts(p.base).concat(alts(p.key)).forEach(k => { if (k !== p.key && k !== p.base && !taken[k] && !out.includes(k)) out.push(k); });
  return out;
}
// A default swap applies to every future workout, so "the day's plan" is every phase the exercise appears in.
function defaultSwapTaken(k) {
  const sw = state.settings.swaps || {}, taken = {};
  Object.keys(DAYS).forEach(r => Object.keys(DAYS[r].phases).forEach(ph => { const list = DAYS[r].phases[ph]; if (!list.includes(k)) return; list.forEach(b => { if (b === k) return; taken[b] = 1; if (sw[b] && EX[sw[b]]) taken[sw[b]] = 1; }); }));
  return taken;
}
const defaultSwapOption = k => { const taken = defaultSwapTaken(k); return alts(k).find(a => !taken[a]) || null; };
const TREAD_MIN = { 1: 20, 2: 25, 3: 30 };

/* ---------- Records: normalize (content decides the kind, never the tab) ---------- */
// A day can hold a program entry (sets, treadmill) and activities together. The program content decides the kind;
// activities next to it are extras. An `acts` list on its own makes an activity day.
const HK_ACT_ID = 'hk-exercise';                 // the one entry that tops a day up to the Apple Watch's Exercise Minutes
const isHk = a => !!a && a.id === HK_ACT_ID;
function normalize(rec) {
  const base = { day: null, qualifies: false, complete: null, ex: {}, keys: [], mainLogged: 0, legacy: false, ambiguous: false, tm: null, acts: [], minutes: 0, allMin: 0, progMin: 0, actMin: 0, program: false, notes: rec.notes || '', phase: rec.phase || null, planned: null, plannedBase: null, swaps: {}, qualifyOverride: null };
  const acts = Array.isArray(rec.acts) ? rec.acts.filter(a => a && isNum(a.min) && a.min > 0) : [];
  const actMin = sum(acts, a => a.mv === false ? 0 : a.min), actAll = sum(acts, a => a.min); // recovery sessions log but are not movement minutes
  const legacy = !(rec.v >= 2);
  const ex = {};
  Object.keys(rec.ex || {}).forEach(k => {
    if (!EX[k]) return;
    const e = rec.ex[k] || {};
    // Legacy records stored blank sets as 0, so a legacy 0 reads as "not logged". v2 keeps 0 as a failed set.
    const reps = (e.reps || []).map(r => legacy ? (isNum(r) && r > 0 ? r : null) : (isNum(r) ? r : null));
    if (reps.some(r => r != null)) ex[k] = { w: isNum(e.w) ? e.w : null, reps };
  });
  const keys = Object.keys(ex);
  const mainLogged = keys.filter(k => !EX[k].bw).length;
  const tm = rec.treadmill && isNum(rec.treadmill.minutes) ? rec.treadmill : null;
  let kind;
  if (keys.length) kind = 'strength';
  else if (tm && (tm.minutes > 0 || rec.kind === 'cardio')) kind = 'cardio';
  else if (acts.length) kind = 'activity';
  else if (rec.kind === 'rest') kind = 'rest';
  else kind = 'empty';
  const program = kind === 'strength' || kind === 'cardio';
  const ambiguous = legacy && rec.kind === 'strength' && !keys.length && !acts.length;
  const qualifies = kind === 'strength' && (legacy ? mainLogged >= QUALIFY_MIN : !!rec.qualifies);
  const planned = Array.isArray(rec.planned) ? rec.planned.filter(k => EX[k]) : null;
  const complete = kind !== 'strength' ? null : planned ? planned.every(k => ex[k]) : null;
  const sets = sum(keys, k => ex[k].reps.filter(r => r != null).length);
  // Lifting time is estimated at 3 minutes a logged set. A deload session has 2 sets where a normal one has 3, so its
  // sets count 4.5 minutes each: a recovery week with the same lift days carries the same minutes, and the same points.
  const progMin = program ? (tm ? tm.minutes : 0) + Math.round(sets * (rec.deload ? 4.5 : 3)) : 0;
  return Object.assign(base, { kind, day: DAYS[rec.day] ? rec.day : null, qualifies, complete, ex, keys, mainLogged, legacy, ambiguous, tm, acts, program, progMin, actMin, minutes: progMin + actMin, allMin: progMin + actAll,
    phase: program || kind === 'rest' ? rec.phase || null : null, planned, plannedBase: rec.plannedBase || null, swaps: rec.swaps || {}, qualifyOverride: rec.qualifyOverride == null ? null : rec.qualifyOverride });
}
// the part of a day the lifting log owns: a lift, a treadmill entry, a rest day (or an old entry that needs checking)
const lifted = rec => { if (!rec) return false; const n = normalize(rec); return n.program || n.kind === 'rest' || n.ambiguous; };
function recordsOf(pid) {
  return cached('recs:' + pid, () => { const s = state.data[pid].sessions; return Object.keys(s).filter(validIso).sort().map(d => ({ date: d, n: normalize(s[d]), rec: s[d] })); });
}
const records = () => recordsOf(me());

/* ---------- Derived progress (active profile unless a pid is given) ---------- */
function startDate(pid) {
  pid = pid || me(); const st = state.data[pid].settings;
  if (st.startDate && validIso(st.startDate)) return st.startDate;
  const all = Object.keys(state.data[pid].sessions).sort(); return all[0] || todayIso();
}
function liftDays(from, to, pid) { return recordsOf(pid || me()).filter(r => r.date >= from && r.date <= to && r.n.qualifies).length; }
function completedWeeks(asOf, pid) {
  pid = pid || me();
  return cached('cw:' + pid + ':' + asOf, () => {
    let n = 0; let ws = weekStart(startDate(pid)); const thisWs = weekStart(asOf); let guard = 0;
    while (ws < thisWs && guard++ < 520) { if (liftDays(ws, addDays(ws, 6), pid) >= LIFT_GOAL) n++; ws = addDays(ws, 7); }
    return n;
  });
}
const phaseFor = (asOf, pid) => Math.min(3, 1 + completedWeeks(asOf, pid));
function lastLift(beforeDate, pid) { const l = recordsOf(pid || me()).filter(r => r.date < beforeDate && r.n.qualifies && r.n.day); return l.length ? l[l.length - 1] : null; }
function nextDayKey(beforeDate, pid) { const p = lastLift(beforeDate, pid); return p ? nextAfter(p.n.day, pid) : rotation(pid)[0]; }
// For deload offers a completed lift week is one that met the lift goal locked for that week (2 or 3), not a fixed 3.
function deloadWeeks(asOf, pid) {
  pid = pid || me();
  return cached('dw:' + pid + ':' + asOf, () => {
    let n = 0; let ws = weekStart(startDate(pid)); const thisWs = weekStart(asOf); let guard = 0;
    while (ws < thisWs && guard++ < 520) { if (liftDays(ws, addDays(ws, 6), pid) >= weekGoals(pid, ws).liftGoal) n++; ws = addDays(ws, 7); }
    return n;
  });
}
function weekStats(asOf, pid) { // the top strip: the same days and the same goals the score uses
  pid = pid || me(); const ws = weekStart(asOf), sc = weekScore(pid, ws), g = weekGoals(pid, ws);
  return { activity: sc.active, lifts: sc.lifts, minutes: sc.minutes, goal: g.goal, liftGoal: g.liftGoal, plan: g.plan };
}
// the normal sessions of one exercise before a date, oldest first. Deload sessions are left out: they are lighter on
// purpose, so the weight rule, the stall check and "last time" all read through them to the last normal session.
const liftLog = (key, beforeDate) => records().filter(r => r.date < beforeDate && r.n.ex[key] && !r.rec.deload);
function lastLog(key, beforeDate) {
  const l = liftLog(key, beforeDate);
  return l.length ? Object.assign({ date: l[l.length - 1].date }, l[l.length - 1].n.ex[key]) : null;
}
// one step easier: about 10% lighter, rounded to the exercise's own step, and never the same weight.
// (The assisted pull-up is inverted: easier means more assistance.)
function easier(key, w) {
  const ex = EX[key], step = Math.abs(ex.inc) || 5, up = ex.inc < 0;
  const v = Math.round(w * (up ? 1.1 : 0.9) / step) * step;
  return up ? Math.max(v, w + step) : Math.max(0, Math.min(v, w - step));
}
// Is the workout for this date a deload session? A saved lift keeps what it was saved as; a new one follows the week.
function deloadOn(date) {
  const rec = state.sessions[date]; if (rec && normalize(rec).kind === 'strength') return !!rec.deload;
  const d = state.settings.deload; return !!(d && d.ws === weekStart(date));
}
// A deload week is offered after every 5 completed lift weeks (counted the same way as phases).
// Returns 'on' while this week is one, 'offer' when it should be suggested, or ''.
function deloadState() {
  const t = todayIso(), d = state.settings.deload, cw = deloadWeeks(t);
  if (d && d.ws === weekStart(t)) return 'on';
  return cw > 0 && cw % 5 === 0 && state.settings.deloadAsked !== cw ? 'offer' : '';
}
// Stalled: the last three normal sessions sat at one weight and none of them earned an increase.
// Not for bodyweight moves or lifts marked "Can't go higher". Hidden while a reset is waiting, and after a dismissal
// until three later sessions stall again.
function stallFor(key, date) {
  const ex = specFor(key, date); if (!ex || ex.bw || (state.settings.maxed || {})[key]) return null;
  const ss = liftLog(key, date).slice(-3); if (ss.length < 3) return null;
  const w = ss[0].n.ex[key].w; if (w == null) return null;
  const earned = e => { const l = e.reps.filter(r => r != null); return l.length >= ex.sets && l.every(r => r >= ex.hi); };
  if (!ss.every(r => r.n.ex[key].w === w && !earned(r.n.ex[key]))) return null;
  const rs = (state.settings.resets || {})[key]; if (rs && rs.at > ss[2].date) return null;
  const seen = (state.settings.stallSeen || {})[key]; if (seen && seen >= ss[0].date) return null;
  return { w, first: ss[0].date, last: ss[2].date, to: easier(key, w) };
}
const fmtReps = reps => reps.map(r => r == null ? '–' : r).join(' / ');
const fmtW = (key, w) => w == null ? '' : w + ' lb' + (EX[key].per ? ' each' : '');
const stepDown = (ex, w) => Math.max(0, w - ex.inc);
const stepUp = (ex, w) => Math.max(0, w + ex.inc);

// Weight rule, as shown on the Program tab. Only logged sets count; blanks are not failures.
// On top of the rule: a chosen reset replaces the next suggestion once, and a deload session is 2 sets at about 90%.
// On a full-body day each slot has its own set count and rep range. The set count goes with the slot whatever is
// swapped into it; the rep range is the slot's only for its own planned exercise. Anywhere else: the exercise's own.
function specFor(key, date) {
  const ex = EX[key]; if (!ex || !date) return ex;
  const m = model(date), kind = kindFor(date, m); if (!DAYS[kind] || !DAYS[kind].slots) return ex;
  const p = plannedFor(date, kind, m, true).find(x => x.key === key), s = p && slotOf(kind, p.base); if (!s) return ex;
  return Object.assign({}, ex, { sets: s.sets }, p.key === p.base ? { lo: s.lo, hi: s.hi } : null, s.optional ? { optional: true } : null);
}
function suggest(key, date) {
  const ex = specFor(key, date), unit = ex.per ? ' lb each hand' : ' lb', base = suggestRule(key, date); let s = base;
  const rs = (state.settings.resets || {})[key];
  // a reset waits until a normal session is logged on or after the day it was chosen (deload sessions do not use it up)
  const waiting = !ex.bw && !!rs && isNum(rs.w) && validIso(rs.at) && (!base.last || base.last.date < rs.at);
  if (waiting) s = Object.assign({}, base, { w: rs.w, sets: ex.sets, reset: true, text: rs.w + unit + ' · reset', why: 'Reset from ' + rs.from + ' lb: about 10% lighter, then build back up with clean reps.' });
  if (deloadOn(date)) {
    // A reset and a deload never stack. The deload is 90% of the normal suggestion; with a reset waiting it is the
    // lighter of that and the reset weight (for the assisted pull-up, lighter means more assistance).
    let w = base.w;
    if (!ex.bw && base.w != null) { const dl = easier(key, base.w); w = waiting ? (ex.inc < 0 ? Math.max(dl, rs.w) : Math.min(dl, rs.w)) : dl; }
    s = Object.assign({}, s, { w, sets: 2, deload: true, text: (ex.bw ? '2 × ' + base.reps : w + unit) + ' · deload', why: 'Deload week: 2 sets' + (ex.bw ? '' : ' at about 90% of ' + base.w + ' lb') + '.' + (waiting ? ' Your reset to ' + rs.w + ' lb is still waiting for the first normal session.' : ' Next week picks up from your last normal session.') });
  }
  return s;
}
function suggestRule(key, date) {
  const ex = specFor(key, date); const last = lastLog(key, date); const maxed = !!(state.settings.maxed || {})[key];
  const logged = last ? last.reps.filter(r => r != null) : [];
  if (ex.bw) {
    if (!last) return { reps: ex.lo, sets: ex.sets, last: null, text: ex.sets + ' × ' + ex.lo, why: 'First time. Work toward ' + ex.hi + ' per set.' };
    const min = Math.min.apply(null, logged);
    const target = min >= ex.hi ? ex.hi + 5 : Math.min(ex.hi, min + 2);
    return { reps: target, sets: ex.sets, last, text: ex.sets + ' × ' + target, why: min >= ex.hi ? 'Every logged set reached ' + ex.hi + '. Push past it.' : 'Lowest logged set was ' + min + '. Add two.' };
  }
  if (!last) return { w: ex.start, sets: ex.sets, last: null, text: ex.start + ' lb' + (ex.per ? ' each hand' : ''), why: 'Starting guess. Adjust until ' + ex.hi + ' clean reps is hard but doable.' };
  const unit = ex.per ? ' lb each hand' : ' lb';
  const allHi = logged.length >= ex.sets && logged.every(r => r >= ex.hi);
  const anyLow = logged.some(r => r < ex.lo);
  if (maxed) {
    const top = Math.max.apply(null, logged);
    const fourth = logged.length >= ex.sets && logged.every(r => r >= ex.hi + 3);
    return { w: last.w, sets: fourth ? ex.sets + 1 : ex.sets, last, text: last.w + unit + (fourth ? ' · add a 4th set' : ' · ' + (top + 1) + ' reps'), why: 'Holding weight. ' + (fourth ? 'Every set is past ' + (ex.hi + 3) + '; add a set.' : 'Beat last time by one rep per set, 3-second lowering.') };
  }
  if (allHi) return { w: stepUp(ex, last.w), sets: ex.sets, last, text: stepUp(ex, last.w) + unit, why: 'All ' + logged.length + ' sets hit ' + ex.hi + '. Up ' + Math.abs(ex.inc) + ' lb.' + (ex.inc < 0 ? ' (Less assist.)' : '') };
  if (anyLow) return { w: stepDown(ex, last.w), sets: ex.sets, last, text: stepDown(ex, last.w) + unit, why: 'A set fell under ' + ex.lo + '. Down one step' + (ex.inc < 0 ? ' (more assist)' : '') + '.' };
  if (logged.length < ex.sets) return { w: last.w, sets: ex.sets, last, text: last.w + unit, why: 'Only ' + logged.length + ' of ' + ex.sets + ' sets logged last time, so no increase. Log all ' + ex.sets + ' at ' + ex.hi + ' to move up.' };
  return { w: last.w, sets: ex.sets, last, text: last.w + unit, why: 'In range but not every set at ' + ex.hi + '. Same weight, chase ' + ex.hi + '.' };
}

// The daily check-in: how the day's "How are you feeling?" was answered. Saved as `checkin` on the day's record.
const CHECKIN_WORDS = { strong: 'feeling strong', short: 'short on time', tired: 'tired, just want to move', sore: 'sore or run down', rest: 'not going today', good: 'feeling good', low: 'low energy', extra: 'class or game' };

/* ---------- Drafts (this device, localStorage) ---------- */
const emptyDraft = () => ({ kindSel: null, tm: { minutes: '', title: '' }, notes: '', ex: {}, swaps: {}, extra: {}, countAs: null, closed: {}, created: Date.now(), updatedAt: Date.now(), recovered: false, fromRecord: false });
function seedFromRecord(rec) {
  const d = emptyDraft(); const n = normalize(rec);
  d.fromRecord = true;
  d.kindSel = n.kind === 'strength' ? (n.day || null) : (n.kind === 'cardio' || n.kind === 'rest') ? n.kind : null;
  d.tm = { minutes: n.tm ? String(n.tm.minutes) : '', title: n.tm && n.tm.title ? n.tm.title : '' };
  d.notes = n.notes; d.swaps = Object.assign({}, n.swaps); d.countAs = n.qualifyOverride; if (rec.checkin) d.checkin = rec.checkin;
  Object.keys(n.ex).forEach(k => { d.ex[k] = { w: n.ex[k].w == null ? '' : String(n.ex[k].w), reps: n.ex[k].reps.map(r => r == null ? '' : String(r)) }; });
  return d;
}
function model(date) { // what the form shows
  if (state.drafts[date]) return state.drafts[date];
  const rec = state.sessions[date];
  return rec ? seedFromRecord(rec) : emptyDraft();
}
function draft(date) { // create the draft on first edit
  if (!state.drafts[date]) { const rec = state.sessions[date]; state.drafts[date] = rec ? seedFromRecord(rec) : emptyDraft(); if (!state.ready) state.drafts[date].blind = true; }
  state.drafts[date].updatedAt = Date.now();
  return state.drafts[date];
}
function draftHasContent(d) {
  return !!(d.tm.minutes !== '' || d.tm.title || d.notes || Object.keys(d.ex).some(k => d.ex[k].w !== '' || d.ex[k].reps.some(r => r !== '')) || d.kindSel);
}

/* ---------- Form composition for a date ---------- */
function kindFor(date, m) {
  if (m.kindSel) return m.kindSel;
  const rec = state.sessions[date];
  if (rec) { const n = normalize(rec); if (n.kind === 'strength' && n.day) return n.day; if (n.kind === 'cardio' || n.kind === 'rest') return n.kind; }
  return nextDayKey(date);
}
function phaseOf(date) { const rec = state.sessions[date], ph = rec ? Number(rec.phase) : 0; return ph >= 1 && ph <= 3 ? Math.floor(ph) : phaseFor(date); }
function plannedFor(date, kind, m, all) { // all: every slot of the day, also on an express session
  // Returns [{base, key}] in order. An existing record keeps its own planned list; swaps in the draft apply on top.
  const rec = state.sessions[date]; const n = rec ? normalize(rec) : null;
  let bases;
  if (n && n.kind === 'strength' && n.day === kind && n.plannedBase) bases = n.plannedBase.filter(k => EX[k]);
  else if (n && n.kind === 'strength' && n.day === kind && n.legacy) bases = Array.from(new Set((DAYS[kind].phases[phaseOf(date)] || []).concat(n.keys)));
  else bases = DAYS[kind].phases[phaseOf(date)];
  // a saved lift day keeps the exercises it was saved with: today's default swaps apply to new workouts only
  const own = n && n.kind === 'strength' && n.day === kind;
  const dflt = own ? (n.swaps || {}) : (state.settings.swaps || {});
  const slots = settleSwaps(bases.map(b => {
    let key = m.swaps[b] != null ? m.swaps[b] : (dflt[b] || b);
    if (!EX[key]) key = b;
    return { base: b, key };
  }));
  // An express session ("short on time") plans the first three lifts. Any later lift with a set logged joins the
  // plan, so nothing typed under "More lifts" is ever left out of the save.
  if (all || m.checkin !== 'short' || own && n.plannedBase) return slots;
  const logged = k => !!(m.ex[k] && m.ex[k].reps.some(r => r !== '' && r != null));
  return slots.filter((p, i) => i < EXPRESS_LIFTS || logged(p.key));
}
function setCount(key, m, date) {
  const sg = suggest(key, date);
  const have = m.ex[key] ? m.ex[key].reps.length : 0;
  return Math.min(MAX_SETS, Math.max(sg.deload ? 2 : specFor(key, date).sets, sg.sets || 0, have, m.extra[key] || 0)); // a deload session shows 2 sets
}
function parseDraft(date, m) {
  // Turns the draft into a record. Returns { doc, errors, kind }.
  const errors = [];
  const kind = kindFor(date, m);
  const phase = phaseOf(date);
  const existing = state.sessions[date];
  const now = new Date().toISOString();
  const doc = { v: SCHEMA, date, phase, savedAt: existing && existing.savedAt || now, updatedAt: now, progAt: now };
  const felt = m.checkin || (existing && existing.checkin); if (felt && CHECKIN_WORDS[felt]) doc.checkin = felt; // how the day's check-in was answered, kept with the day
  // activities already logged on the day stay with it. The Watch top-up does not: next to a lift or treadmill entry the Watch minutes are shown, not added.
  const kept = existing && Array.isArray(existing.acts) ? existing.acts.filter(a => a && !isHk(a)) : [];
  if (kind === 'rest') {
    if (kept.length) errors.push('This day has activities logged, so it is not a rest day. Remove them first, or leave the day as it is.');
    doc.kind = 'rest'; doc.notes = m.notes.trim(); return { doc, errors, kind: 'rest' };
  }
  if (kept.length) doc.acts = kept;
  const min = m.tm.minutes === '' ? null : Number(m.tm.minutes);
  if (min != null && (!isFinite(min) || min < 0 || min !== Math.floor(min))) errors.push('Treadmill minutes must be a whole number, 0 or more.');
  if (min != null || m.tm.title.trim()) doc.treadmill = { minutes: min == null ? 0 : min, title: m.tm.title.trim() };
  doc.notes = m.notes.trim();
  const ex = {}; let plannedPairs = [];
  if (DAYS[kind]) {
    plannedPairs = plannedFor(date, kind, m);
    plannedPairs.forEach(p => {
      const e = m.ex[p.key]; const def = EX[p.key]; if (!e) return;
      const reps = e.reps.map(r => { if (r === '' || r == null) return null; const v = Number(r); return isFinite(v) ? v : NaN; });
      const shown = setCount(p.key, m, date); while (reps.length < shown) reps.push(null); // unentered sets stay unentered
      if (reps.some(r => Number.isNaN(r) || (r != null && (r < 0 || r !== Math.floor(r))))) errors.push(def.name + ': reps must be whole numbers, 0 or more.');
      if (!reps.some(r => r != null)) return;
      if (def.bw) { ex[p.key] = { reps }; return; }
      if (e.w === '') { errors.push(def.name + ': enter the weight you used' + (def.per ? ' (per hand)' : '') + '.'); return; }
      const w = Number(e.w);
      if (!isFinite(w) || w < 0) { errors.push(def.name + ': weight must be 0 or more.'); return; }
      ex[p.key] = { w, reps };
    });
  }
  const keys = Object.keys(ex);
  if (keys.length) {
    const mainLogged = keys.filter(k => !EX[k].bw).length;
    const auto = mainLogged >= QUALIFY_MIN;
    doc.kind = 'strength'; doc.day = kind; doc.ex = ex;
    doc.planned = plannedPairs.map(p => p.key); doc.plannedBase = plannedPairs.map(p => p.base);
    doc.swaps = {}; plannedPairs.forEach(p => { if (p.key !== p.base) doc.swaps[p.base] = p.key; });
    doc.qualifyOverride = m.countAs; doc.qualifies = m.countAs == null ? auto : !!m.countAs;
    if (deloadOn(date)) doc.deload = true; // a recovery session: it counts as a lift day, and the weight rule reads past it
    doc.complete = plannedPairs.filter(p => !(slotOf(kind, p.base) || {}).optional).every(p => ex[p.key]); // "if there's time" lifts are not needed for a finished session
    return { doc, errors, kind: 'strength', mainLogged, auto };
  }
  if (doc.treadmill && doc.treadmill.minutes > 0) { doc.kind = 'cardio'; return { doc, errors, kind: 'cardio', fromLift: !!DAYS[kind], liftKind: kind }; }
  const empty = errors.length === 0; // a validation error is not "nothing to save": keep Save tappable so the message shows
  errors.push(DAYS[kind] ? 'Nothing to save yet. Log at least one set, or treadmill minutes.' : 'Enter treadmill minutes to save.');
  return { doc, errors, kind: 'none', empty };
}

/* ---------- Saving the lifting log ---------- */
function setStatus(date, s, msg) { state.status[date] = { s, at: Date.now(), msg: msg || '' }; }
async function saveRecord(date, doc) { // resolves false when nothing was attempted
  if (!state.ready) { toast(state.storage === 'nodb' ? 'Your log cannot be reached right now. Your inputs are kept on this phone.' : 'Still loading your log. Your inputs are kept; try again in a moment.', 3400); return false; }
  const pid = me(), path = PATH.session(pid, date), drafts = state.draftsBy[pid];
  setStatus(date, 'saving'); applyDoc(path, doc); render();
  try { const how = await put(path, doc); delete drafts[date]; setStatus(date, how === 'local' ? 'local' : 'synced'); }
  catch (e) { setStatus(date, 'failed', (e && e.code) || 'error'); drafts[date] = drafts[date] || seedFromRecord(doc); }
  persistDrafts(); render();
  return true;
}
function fillDraft(d, base) { // copy into d whatever d has left untouched
  if (d.tm.minutes === '') d.tm.minutes = base.tm.minutes;
  if (!d.tm.title) d.tm.title = base.tm.title;
  if (!d.notes) d.notes = base.notes;
  if (d.kindSel == null) d.kindSel = base.kindSel;
  if (d.countAs == null) d.countAs = base.countAs;
  Object.keys(base.ex || {}).forEach(k => { if (!d.ex[k]) d.ex[k] = base.ex[k]; });
  Object.keys(base.swaps || {}).forEach(k => { if (d.swaps[k] == null) d.swaps[k] = base.swaps[k]; });
}
const draftShaped = d => !!(d && typeof d === 'object' && d.tm && typeof d.tm === 'object' && d.ex && typeof d.ex === 'object' && d.swaps && typeof d.swaps === 'object');
// Once the log has loaded: take the profile this account uses if the device has forgotten it, and bring back
// unsaved drafts the account kept. A draft is skipped when the day was saved after the draft was last touched.
function adoptAccount() {
  const known = prefGet('ml.me', null);
  if (!state.pid && PIDS.includes(known)) { state.pid = known; lsSet('ml.me', known); }
  const theirs = state.acctDrafts; state.acctDrafts = null; if (!theirs) return;
  draftsSent = JSON.stringify({ tyson: theirs.tyson || {}, jacquie: theirs.jacquie || {} }); // what the account already holds
  PIDS.forEach(pid => {
    const mine = state.draftsBy[pid], kept = theirs[pid] && typeof theirs[pid] === 'object' ? theirs[pid] : {};
    Object.keys(kept).forEach(date => {
      const d = kept[date]; if (!validIso(date) || !draftShaped(d)) return;
      const rec = state.data[pid].sessions[date], saved = lifted(rec) ? Date.parse(rec.progAt || rec.updatedAt || rec.savedAt || '') || 0 : 0; // an activity logged later does not make a lifting draft stale
      if (saved >= (d.updatedAt || 0)) return;
      const cur = mine[date];
      if (cur && cur.blind) { fillDraft(cur, d); return; }        // typed before the log loaded: keep that, add the rest
      if (cur && (cur.updatedAt || 0) >= (d.updatedAt || 0)) return;
      mine[date] = Object.assign(emptyDraft(), d, { recovered: true });
    });
  });
}
// A draft started before the log finished loading could not see the day's saved record. Once it loads, fill in
// whatever the draft left untouched, so saving the draft cannot drop sets that were already saved.
function reconcileBlindDrafts() {
  PIDS.forEach(pid => {
    const ds = state.draftsBy[pid];
    Object.keys(ds).forEach(date => {
      const d = ds[date]; if (!d.blind) return;
      const rec = state.data[pid].sessions[date];
      if (lifted(rec)) { fillDraft(d, seedFromRecord(rec)); d.fromRecord = true; }
      delete d.blind;
    });
  });
  persistDrafts();
}
async function removeRecord(date) {
  if (!state.ready) { toast('Still loading your log. Try again in a moment.'); return; }
  const pid = me(), path = PATH.session(pid, date), had = getDoc(path), n = had ? normalize(had) : null, now = new Date().toISOString();
  delete state.draftsBy[pid][date]; state.confirmRemove = null; persistDrafts();
  // On a day that also has activities only the lift or treadmill part goes. With that part gone, Watch minutes can top the day up again.
  const acts = n && n.program ? watchTopUp(pid, date, n.acts.filter(a => !isHk(a)), false) : [];
  const next = acts.length ? { v: SCHEMA, date, kind: 'activity', acts, savedAt: had.savedAt || now, updatedAt: now } : null;
  applyDoc(path, next); render();
  try { if (next) await put(path, next); else await del(path); offerUndo(next ? 'Removed the ' + (n.kind === 'strength' ? 'lift' : 'treadmill entry') + '. Your activities for ' + nice(date) + ' are kept' : 'Removed', path, had); }
  catch (e) { applyDoc(path, had); toast('Could not remove ' + nice(date) + '. Try again.'); render(); }
  settle();
}
async function saveSettings(patch) {
  if (!state.ready) { toast('Still loading your log. Try again in a moment.'); return; }
  const pid = me(), path = PATH.settings(pid), next = Object.assign({}, state.data[pid].settings, patch);
  applyDoc(path, next); render();
  try { await put(path, next); } catch (e) { toast('Could not save settings'); }
}
