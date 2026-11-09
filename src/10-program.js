/* ---------- Lifting program (Push / Pull / Legs) ---------- */
// Equipment confirmed on the Avon Anytime Fitness listing: treadmills, barbells, dumbbells, squat racks,
// kettlebells, medicine balls, resistance bands, plyo boxes. Selectorized machines and the cable station
// are standard at Anytime Fitness clubs; every machine move has a dumbbell/barbell fallback via Swap.
// `per: 'each hand'` marks dumbbell loads: the weight is one dumbbell, not the pair.
const EX = {
  chestpress:  { name: 'Chest press machine', equip: 'Machine', sets: 3, lo: 8, hi: 12, inc: 5, start: 70, alt: 'dbbench' },
  dbbench:     { name: 'Dumbbell bench press', equip: 'Dumbbells + bench', sets: 3, lo: 8, hi: 12, inc: 5, start: 30, per: 'each hand', alt: 'chestpress' },
  shoulderpress:{ name: 'Shoulder press machine', equip: 'Machine', sets: 3, lo: 8, hi: 12, inc: 5, start: 50, alt: 'dbshoulder' },
  dbshoulder:  { name: 'Seated dumbbell shoulder press', equip: 'Dumbbells + bench', sets: 3, lo: 8, hi: 12, inc: 5, start: 20, per: 'each hand', alt: 'shoulderpress' },
  pushdown:    { name: 'Cable triceps pushdown', equip: 'Cable station', sets: 3, lo: 10, hi: 15, inc: 5, start: 40, alt: 'dbtri' },
  dbtri:       { name: 'Dumbbell overhead triceps extension', equip: 'One dumbbell, both hands', sets: 3, lo: 10, hi: 15, inc: 5, start: 25, alt: 'pushdown' },
  inclinedb:   { name: 'Incline dumbbell press', equip: 'Dumbbells + incline bench', sets: 3, lo: 8, hi: 12, inc: 5, start: 25, per: 'each hand', alt: 'pecdeck' },
  pecdeck:     { name: 'Pec deck / chest fly machine', equip: 'Machine', sets: 3, lo: 10, hi: 15, inc: 5, start: 60, alt: 'inclinedb' },
  latraise:    { name: 'Dumbbell lateral raise', equip: 'Dumbbells', sets: 3, lo: 12, hi: 15, inc: 2.5, start: 10, per: 'each hand', alt: 'cablelat' },
  cablelat:    { name: 'Cable lateral raise', equip: 'Cable station', sets: 3, lo: 12, hi: 15, inc: 2.5, start: 10, alt: 'latraise' },
  latpull:     { name: 'Lat pulldown machine', equip: 'Machine', sets: 3, lo: 8, hi: 12, inc: 5, start: 80, alt: 'assistpull' },
  assistpull:  { name: 'Assisted pull-up machine', equip: 'Machine. Weight = assist; less assist is harder', sets: 3, lo: 8, hi: 12, inc: -5, start: 80, alt: 'latpull' },
  seatedrow:   { name: 'Seated cable row', equip: 'Cable row station', sets: 3, lo: 8, hi: 12, inc: 5, start: 80, alt: 'dbrow' },
  dbrow:       { name: 'One-arm dumbbell row', equip: 'Dumbbell + bench', sets: 3, lo: 8, hi: 12, inc: 5, start: 30, per: 'each hand', alt: 'seatedrow' },
  dbcurl:      { name: 'Dumbbell biceps curl', equip: 'Dumbbells', sets: 3, lo: 10, hi: 12, inc: 2.5, start: 20, per: 'each hand', alt: 'cablecurl' },
  cablecurl:   { name: 'Cable biceps curl', equip: 'Cable station', sets: 3, lo: 10, hi: 12, inc: 5, start: 40, alt: 'dbcurl' },
  hammer:      { name: 'Hammer curl', equip: 'Dumbbells', sets: 3, lo: 10, hi: 12, inc: 2.5, start: 20, per: 'each hand', alt: 'dbcurl' },
  facepull:    { name: 'Cable face pull', equip: 'Cable station + rope', sets: 3, lo: 12, hi: 15, inc: 5, start: 30, alt: 'reardelt' },
  reardelt:    { name: 'Dumbbell rear-delt fly', equip: 'Dumbbells', sets: 3, lo: 12, hi: 15, inc: 2.5, start: 10, per: 'each hand', alt: 'facepull' },
  legpress:    { name: 'Leg press machine', equip: 'Machine', sets: 3, lo: 10, hi: 12, inc: 10, start: 140, alt: 'goblet' },
  goblet:      { name: 'Goblet squat', equip: 'Kettlebell or dumbbell', sets: 3, lo: 10, hi: 12, inc: 5, start: 35, alt: 'legpress' },
  legext:      { name: 'Leg extension machine', equip: 'Machine', sets: 3, lo: 10, hi: 15, inc: 5, start: 70, alt: 'splitsquat' },
  splitsquat:  { name: 'Dumbbell split squat', equip: 'Dumbbells', sets: 3, lo: 10, hi: 12, inc: 5, start: 20, per: 'each hand', alt: 'legext' },
  legcurl:     { name: 'Leg curl machine', equip: 'Machine (seated or lying)', sets: 3, lo: 10, hi: 15, inc: 5, start: 60, alt: 'dbrdl' },
  dbrdl:       { name: 'Dumbbell Romanian deadlift', equip: 'Dumbbells', sets: 3, lo: 10, hi: 12, inc: 5, start: 30, per: 'each hand', alt: 'legcurl' },
  calf:        { name: 'Standing calf raise', equip: 'Calf machine or step + dumbbell', sets: 3, lo: 12, hi: 15, inc: 10, start: 90, alt: 'goblet' },
  squat:       { name: 'Barbell back squat', equip: 'Squat rack', sets: 3, lo: 6, hi: 10, inc: 10, start: 95, alt: 'legpress' },
  lunge:       { name: 'Walking lunges', equip: 'Dumbbells', sets: 3, lo: 10, hi: 12, inc: 5, start: 15, per: 'each hand', alt: 'splitsquat' },
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
const TREAD_MIN = { 1: 20, 2: 25, 3: 30 };

/* ---------- Records: normalize (content decides the kind, never the tab) ---------- */
function normalize(rec) {
  const base = { day: null, qualifies: false, complete: null, ex: {}, keys: [], mainLogged: 0, legacy: false, ambiguous: false, tm: null, acts: [], minutes: 0, allMin: 0, notes: rec.notes || '', phase: rec.phase || null, planned: null, plannedBase: null, swaps: {}, qualifyOverride: null };
  if (rec.kind === 'activity' || Array.isArray(rec.acts)) { // pick-your-own day: a list of activities with minutes
    const acts = (rec.acts || []).filter(a => a && isNum(a.min) && a.min > 0);
    return Object.assign(base, { kind: acts.length ? 'activity' : 'empty', acts, phase: null, allMin: sum(acts, a => a.min), minutes: sum(acts, a => a.mv === false ? 0 : a.min) });
  }
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
  if (rec.kind === 'rest') kind = 'rest';
  else if (keys.length) kind = 'strength';
  else if (tm && (tm.minutes > 0 || rec.kind === 'cardio')) kind = 'cardio';
  else kind = 'empty';
  const ambiguous = legacy && rec.kind === 'strength' && !keys.length;
  const qualifies = kind === 'strength' && (legacy ? mainLogged >= QUALIFY_MIN : !!rec.qualifies);
  const planned = Array.isArray(rec.planned) ? rec.planned.filter(k => EX[k]) : null;
  const complete = kind !== 'strength' ? null : planned ? planned.every(k => ex[k]) : null;
  const sets = sum(keys, k => ex[k].reps.filter(r => r != null).length);
  const minutes = (tm ? tm.minutes : 0) + sets * 3; // lifting time is estimated at 3 minutes a logged set
  return Object.assign(base, { kind, day: DAYS[rec.day] ? rec.day : null, qualifies, complete, ex, keys, mainLogged, legacy, ambiguous, tm, minutes, allMin: minutes, planned, plannedBase: rec.plannedBase || null, swaps: rec.swaps || {}, qualifyOverride: rec.qualifyOverride == null ? null : rec.qualifyOverride });
}
function recordsOf(pid) {
  return cached('recs:' + pid, () => { const s = state.data[pid].sessions; return Object.keys(s).filter(validIso).sort().map(d => ({ date: d, n: normalize(s[d]), rec: s[d] })); });
}
const records = () => recordsOf(me());

/* ---------- Derived progress (active profile unless a pid is given) ---------- */
function startDate(pid) {
  pid = pid || me(); const st = state.data[pid].settings;
  if (st.startDate) return st.startDate;
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
function nextDayKey(beforeDate, pid) { const p = lastLift(beforeDate, pid); return p ? ROTATION[(ROTATION.indexOf(p.n.day) + 1) % ROTATION.length] : ROTATION[0]; }
function weekStats(asOf) {
  const ws = weekStart(asOf), we = addDays(ws, 6);
  const list = records().filter(r => r.date >= ws && r.date <= we);
  return { activity: list.filter(r => r.n.kind === 'strength' || r.n.kind === 'cardio' || r.n.kind === 'activity').length, lifts: list.filter(r => r.n.qualifies).length, goal: state.settings.goal || GOAL };
}
function lastLog(key, beforeDate) {
  const l = records().filter(r => r.date < beforeDate && r.n.ex[key]);
  return l.length ? Object.assign({ date: l[l.length - 1].date }, l[l.length - 1].n.ex[key]) : null;
}
const fmtReps = reps => reps.map(r => r == null ? '–' : r).join(' / ');
const fmtW = (key, w) => w == null ? '' : w + ' lb' + (EX[key].per ? ' each' : '');
const stepDown = (ex, w) => Math.max(0, w - ex.inc);
const stepUp = (ex, w) => Math.max(0, w + ex.inc);

// Weight rule, as shown on the Program tab. Only logged sets count; blanks are not failures.
function suggest(key, date) {
  const ex = EX[key]; const last = lastLog(key, date); const maxed = !!(state.settings.maxed || {})[key];
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

/* ---------- Drafts (this device, localStorage) ---------- */
const emptyDraft = () => ({ kindSel: null, tm: { minutes: '', title: '' }, notes: '', ex: {}, swaps: {}, extra: {}, countAs: null, closed: {}, created: Date.now(), updatedAt: Date.now(), recovered: false, fromRecord: false });
function seedFromRecord(rec) {
  const d = emptyDraft(); const n = normalize(rec);
  d.fromRecord = true;
  d.kindSel = n.kind === 'strength' ? (n.day || null) : (n.kind === 'cardio' || n.kind === 'rest') ? n.kind : null;
  d.tm = { minutes: n.tm ? String(n.tm.minutes) : '', title: n.tm && n.tm.title ? n.tm.title : '' };
  d.notes = n.notes; d.swaps = Object.assign({}, n.swaps); d.countAs = n.qualifyOverride;
  Object.keys(n.ex).forEach(k => { d.ex[k] = { w: n.ex[k].w == null ? '' : String(n.ex[k].w), reps: n.ex[k].reps.map(r => r == null ? '' : String(r)) }; });
  return d;
}
function model(date) { // what the form shows
  if (state.drafts[date]) return state.drafts[date];
  const rec = state.sessions[date];
  return rec ? seedFromRecord(rec) : emptyDraft();
}
function draft(date) { // create the draft on first edit
  if (!state.drafts[date]) { const rec = state.sessions[date]; state.drafts[date] = rec ? seedFromRecord(rec) : emptyDraft(); }
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
function phaseOf(date) { const rec = state.sessions[date]; return rec && rec.phase ? rec.phase : phaseFor(date); }
function plannedFor(date, kind, m) {
  // Returns [{base, key}] in order. An existing record keeps its own planned list; swaps in the draft apply on top.
  const rec = state.sessions[date]; const n = rec ? normalize(rec) : null;
  let bases;
  if (n && n.kind === 'strength' && n.day === kind && n.plannedBase) bases = n.plannedBase.filter(k => EX[k]);
  else if (n && n.kind === 'strength' && n.day === kind && n.legacy) bases = Array.from(new Set((DAYS[kind].phases[phaseOf(date)] || []).concat(n.keys)));
  else bases = DAYS[kind].phases[phaseOf(date)];
  const dflt = n && n.plannedBase ? n.swaps : (state.settings.swaps || {});
  return bases.map(b => {
    let key = m.swaps[b] != null ? m.swaps[b] : (dflt[b] || b);
    if (!EX[key]) key = b;
    return { base: b, key };
  });
}
function setCount(key, m, date) {
  const sg = suggest(key, date);
  const have = m.ex[key] ? m.ex[key].reps.length : 0;
  return Math.min(MAX_SETS, Math.max(EX[key].sets, sg.sets || 0, have, m.extra[key] || 0));
}
function parseDraft(date, m) {
  // Turns the draft into a record. Returns { doc, errors, kind }.
  const errors = [];
  const kind = kindFor(date, m);
  const phase = phaseOf(date);
  const existing = state.sessions[date];
  const doc = { v: SCHEMA, date, phase, savedAt: existing && existing.savedAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  if (kind === 'rest') { doc.kind = 'rest'; doc.notes = m.notes.trim(); return { doc, errors, kind: 'rest' }; }
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
    doc.complete = doc.planned.every(k => ex[k]);
    return { doc, errors, kind: 'strength', mainLogged, auto };
  }
  if (doc.treadmill && doc.treadmill.minutes > 0) { doc.kind = 'cardio'; return { doc, errors, kind: 'cardio', fromLift: !!DAYS[kind], liftKind: kind }; }
  const empty = errors.length === 0; // a validation error is not "nothing to save": keep Save tappable so the message shows
  errors.push(DAYS[kind] ? 'Nothing to save yet. Log at least one set, or treadmill minutes.' : 'Enter treadmill minutes to save.');
  return { doc, errors, kind: 'none', empty };
}

/* ---------- Saving the lifting log ---------- */
function setStatus(date, s, msg) { state.status[date] = { s, at: Date.now(), msg: msg || '' }; }
async function saveRecord(date, doc) {
  const pid = me(), path = PATH.session(pid, date), drafts = state.draftsBy[pid];
  setStatus(date, 'saving'); applyDoc(path, doc); render();
  try { const how = await put(path, doc); delete drafts[date]; setStatus(date, how === 'local' ? 'local' : 'synced'); }
  catch (e) { setStatus(date, 'failed', (e && e.code) || 'error'); drafts[date] = drafts[date] || seedFromRecord(doc); }
  persistDrafts(); render();
}
async function removeRecord(date) {
  const pid = me(), path = PATH.session(pid, date), had = getDoc(path);
  delete state.draftsBy[pid][date]; state.confirmRemove = null; persistDrafts();
  applyDoc(path, null); render();
  try { await del(path); toast('Removed ' + nice(date)); }
  catch (e) { applyDoc(path, had); toast('Could not remove ' + nice(date) + '. Try again.'); render(); }
  settle();
}
async function saveSettings(patch) {
  const pid = me(), path = PATH.settings(pid), next = Object.assign({}, state.data[pid].settings, patch);
  applyDoc(path, next); render();
  try { await put(path, next); } catch (e) { toast('Could not save settings'); }
}
