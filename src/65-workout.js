/* ---------- Workout mode: a full-screen, guided session ---------- */
// Its own element (#wm) outside #main. While it is open, render() leaves the page behind alone, and everything here
// draws straight into #wm. It adds no data shape: lifts go into the same draft the lifting log uses and are saved by
// the same save(); cardio, guided and recovery sessions are logged with the same logActivity() as the activity menu.
const wmEl = $('#wm');
let wm = null;            // the open session, or null
const WM_KEY = 'ml.wm';   // a timed session in progress on this phone (laps, timers), so leaving keeps it
const CIRCUIT = ['Leg press', 'Seated row', 'Chest press', 'Lat pulldown'];
const stageFor = (k, min) => ({ type: (ACTS[k] && ACTS[k].wm) || 'timer', act: k, name: ACTS[k] ? ACTS[k].name : 'Cardio', min: min || (ACTS[k] ? ACTS[k].min : 15) });
const stagePlan = (title, felt, stages) => ({ kind: 'stages', title, felt, stages });
const wmDraftOn = date => { const d = state.drafts[date]; return !!(d && d.wm && draftHasContent(d)); };
function wmResumable(pid, date) {
  if (pid === me() && wmDraftOn(date)) return { kind: 'lift', title: state.drafts[date].wm.title || 'Lift' };
  const s = lsGet(WM_KEY, null);
  return s && s.pid === pid && s.date === date && s.plan && Array.isArray(s.plan.stages) && Array.isArray(s.st) ? { kind: 'stages', title: s.plan.title || 'Workout' } : null;
}
const wmTime = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const wmElapsed = () => wm.ms + (Date.now() - wm.started);

/* --- opening and closing --- */
function wmOpen(plan, fromEl, resume) {
  if (wm) return;
  const held = state.ov ? state.ovQ.slice() : []; // a badge or a week's result waiting behind the sheet: shown when the session closes
  if (state.guide) { state.guide = null; renderGuide(); }
  if (state.ov) { state.ov = null; state.ovQ = []; renderOv(); }
  delete figSt.wm; delete wmEl.dataset.scr;
  wm = { pid: me(), date: state.selDate, plan, held, view: 'start', before: scoreSnapshot(), started: Date.now(), ms: 0, stale: false, i: -1, edit: null, quit: 0 };
  if (plan.kind === 'lift') wmLiftInit(resume); else wmStagesInit(resume);
  if (motionOf() !== 'full' || resume) wm.view = 'main'; // the start lights belong to Full animations, and never play when coming back
  if (fromEl && fromEl.getBoundingClientRect) { const r = fromEl.getBoundingClientRect(); wmEl.style.transformOrigin = Math.round(r.left + r.width / 2) + 'px ' + Math.round(r.top + r.height / 2) + 'px'; }
  wmEl.hidden = false; wmEl.classList.remove('zoom'); void wmEl.offsetWidth; wmEl.classList.add('zoom'); // the tapped card zooms into the session
  document.body.style.overflow = 'hidden'; state.ci = null; state.wmOpens = (state.wmOpens || 0) + 1;
  // Full screen and a screen that stays awake, where the browser allows them from this tap. A refusal is ignored.
  try { const el = document.documentElement, f = el.requestFullscreen || el.webkitRequestFullscreen; if (f) { const pr = f.call(el); wm.fs = true; if (pr && pr.catch) pr.catch(() => { if (wm) wm.fs = false; }); } } catch (e) { /* not allowed here */ }
  try { if (navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request('screen').then(l => { if (wm) wm.lock = l; else l.release(); }).catch(() => {}); } catch (e) { /* not allowed here */ }
  wmDraw();
  wm.tick = setInterval(wmTick, 250);
  if (wm.view === 'start') wm.go = setTimeout(wmGo, 2500);
}
function wmGo() { if (!wm || wm.view !== 'start') return; clearTimeout(wm.go); wm.view = 'main'; wm.started = Date.now(); wmDraw(); }
ACT['wm-go'] = () => wmGo(); // a tap skips the start sequence
function wmClose() {
  if (!wm) return;
  clearInterval(wm.tick); clearTimeout(wm.go);
  try { if (wm.lock) wm.lock.release(); } catch (e) { /* already gone */ }
  try { if (wm.fs && (document.fullscreenElement || document.webkitFullscreenElement)) { const x = document.exitFullscreen || document.webkitExitFullscreen; if (x) { const pr = x.call(document); if (pr && pr.catch) pr.catch(() => {}); } } } catch (e) { /* not in full screen */ }
  const held = wm.held || [];
  wm = null; wmEl.hidden = true; wmEl.innerHTML = ''; wmEl.classList.remove('zoom'); document.body.style.overflow = '';
  render();
  held.forEach(o => queueOv(o));
}
// Leaving keeps everything: the lift draft is already saved as typed; a timed session is paused and remembered.
function wmKeep() {
  if (!wm) return;
  if (wm.plan.kind === 'lift') { const d = state.drafts[wm.date]; if (d && d.wm) { d.wm.ms = wmElapsed(); persistDrafts(); } }
  else { wm.st.forEach((s, i) => { if (s.on) { s.ms = wmStageMs(i); s.on = false; } }); wmStore(); }
}
ACT['wm-resume'] = el => {
  const r = wmResumable(me(), state.selDate); if (!r) { render(); return; }
  if (r.kind === 'lift') { const d = state.drafts[state.selDate]; wmOpen({ kind: 'lift', title: d.wm.title || 'Lift', felt: d.checkin || null, day: kindFor(state.selDate, d), express: d.checkin === 'short' }, el, true); }
  else { const s = lsGet(WM_KEY, null); wmOpen(s.plan, el, true); }
};
ACT['wm-lift'] = el => { // from the lifting log: this day's lift, guided
  const date = state.selDate, m = model(date), kind = kindFor(date, m); if (!DAYS[kind]) return;
  if (wmDraftOn(date)) { ACT['wm-resume'](el); return; }
  wmOpen({ kind: 'lift', title: DAYS[kind].name, felt: m.checkin || null, day: kind, express: m.checkin === 'short' }, el);
};

/* --- the top strip: one lap per exercise or stage, the avatar moving along --- */
function wmTopHTML(laps, cur, frac) {
  const n = Math.max(1, laps), pct = clamp(frac, 0, 1) * 100;
  let h = '<div class="wm-top"><button type="button" class="wm-x" data-a="wm-quit" aria-label="End early">✕</button><div class="wm-strip" id="wmStrip" role="img" aria-label="Lap ' + Math.min(n, cur + 1) + ' of ' + n + '" style="--p:' + pct.toFixed(1) + '%"><i class="wm-fill" id="wmFill"></i>';
  for (let i = 1; i < n; i++) h += '<span class="wm-lapmark" style="left:' + (i / n * 100).toFixed(2) + '%"></span>';
  return h + '<span class="wm-car" id="wmCar">' + avatarHTML(wm.pid, 'sm') + '</span><span class="wm-end" aria-hidden="true"></span></div><span class="wm-clock num" id="wmClock">' + wmTime(wmElapsed()) + '</span></div>';
}
const wmFlag = (cls, checkered) => '<svg class="wm-flag ' + cls + '" viewBox="0 0 120 100" aria-hidden="true"><defs><pattern id="wmChk" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#fff"/><rect width="10" height="10" fill="#15181C"/><rect x="10" y="10" width="10" height="10" fill="#15181C"/></pattern></defs>' +
  '<line x1="14" y1="6" x2="14" y2="96" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><g class="wm-wave"><path d="M16 10 C40 0 60 22 84 12 S112 8 112 14 V60 C100 52 84 66 60 56 S34 50 16 58 Z" fill="' + (checkered ? 'url(#wmChk)' : '#1E9E5A') + '" stroke="currentColor" stroke-width="2"/></g></svg>';
function wmDraw() {
  if (!wm) return;
  wmEl.dataset.view = wm.view; wmEl.dataset.kind = wm.plan.kind;
  // every exercise or stage screen keeps its own place; the start, quit and finish screens have none
  wm.tops = wm.tops || {}; const body0 = wmEl.querySelector('.wm-body'); if (body0 && wmEl.dataset.scr) wm.tops[wmEl.dataset.scr] = body0.scrollTop;
  if (wm.view === 'start' || wm.view === 'quit' || wm.view === 'finish') delete wmEl.dataset.scr;
  if (wm.view === 'start') { wmEl.innerHTML = '<button type="button" class="wm-start" id="wmStartSeq" data-a="wm-go" aria-label="Skip the start"><span class="wm-lights" aria-hidden="true"><i></i><i></i><i></i></span>' + wmFlag('green', false) + '<b class="wm-gotext">GO</b><span class="tiny">' + esc(wm.plan.title) + ' · tap to skip</span></button>'; return; }
  if (wm.view === 'quit') { wmEl.innerHTML = wmQuitHTML(); return; }
  if (wm.view === 'finish') { wmEl.innerHTML = (motionOf() === 'full' ? '' : '<div class="wm-stripe" id="wmStripe" aria-hidden="true"></div>') + (wm.plan.kind === 'lift' ? wmLiftFinishHTML() : wmStagesFinishHTML()); wmCountUp(); return; }
  // every screen keeps its own place: back from a rest, an exercise with "How to" open is where it was left
  const scr = wm.view + ':' + wm.plan.kind + ':' + (wm.plan.kind === 'lift' ? wm.i + ':' + ((wmSlots()[wm.i] || {}).key || '') : wm.si);
  wmEl.innerHTML = wm.plan.kind === 'lift' ? (wm.view === 'rest' ? wmRestHTML() : wmLiftHTML()) : wmStageHTML();
  wmEl.dataset.scr = scr; const b2 = wmEl.querySelector('.wm-body'), top = wmEl.querySelector('#wmHow') || wm.view !== 'main' ? wm.tops[scr] || 0 : 0; if (b2 && top) b2.scrollTop = top;
  figKick();
}
// "How to" under the logging controls: the full card opens below them, so nothing above it moves
const wmHowHTML = (key, open) => '<button type="button" class="wm-btn sm wm-howbtn" id="wmHowBtn" data-a="wm-howto" data-k="' + key + '" aria-expanded="' + !!open + '" aria-controls="wmHow">' + (open ? 'Hide how to' : 'How to') + '</button>' +
  (open ? '<div class="wm-howcard" id="wmHow">' + guideCardHTML(key, { pid: wm.pid, from: 'live', swap: wm.plan.kind === 'lift' ? swapOptions(wmSlots(), wmSlots()[wm.i]) : [] }) + '</div>' : '');
// When the card opens off the bottom of the screen, the screen moves up just far enough that the logging controls
// (or the stretch, or the list of machines) sit at the top with the card right under them: still one tap from a set.
function wmHowReveal(anchor) {
  const c = $('#wmHow'), b = wmEl.querySelector('.wm-body'), a = anchor && wmEl.querySelector(anchor); if (!c || !b) return;
  const br = b.getBoundingClientRect(), r = c.getBoundingClientRect(); if (r.top < br.top + br.height * 0.5) return;
  b.scrollTop += Math.max(0, (a ? a.getBoundingClientRect().top : r.top - 56) - br.top - 6);
}
ACT['wm-howto'] = el => { const k = el.dataset.k; wm.howKey = wm.howKey === k ? null : k; wmDraw(); if (wm.howKey) wmHowReveal(wm.plan.kind === 'lift' ? (wmEl.querySelector('.wm-steps') ? '.wm-steps' : '#wmPips') : '#wmStretchName'); };
// Finish numbers count up once, in Subtle only (Full has its flag and burst; Off shows them still).
function wmCountUp() {
  if (!wm || wm.counted || motionOf() !== 'subtle') return;
  wm.counted = true;
  const els = Array.from(wmEl.querySelectorAll('[data-count]')), t0 = Date.now(), ms = 600;
  const step = () => { const k = Math.min(1, (Date.now() - t0) / ms), e = 1 - Math.pow(1 - k, 3); els.forEach(el => { if (el.isConnected) el.textContent = commas(Math.round(Number(el.dataset.count) * e)); }); if (k >= 1) clearInterval(id); };
  els.forEach(el => { el.textContent = '0'; }); const id = setInterval(step, 30);
}
const wmNum = (v, unit) => '<span data-count="' + v + '">' + commas(v) + '</span>' + (unit || '');
function wmTick() {
  if (!wm || wm.view === 'start') return;
  const c = $('#wmClock'); if (c) c.textContent = wmTime(wmElapsed());
  if (wm.plan.kind === 'lift') { if (wm.view === 'rest') wmRestTick(); } else if (wm.view === 'main') wmStageTick();
}

/* --- ending early --- */
function wmQuitHTML() {
  const lift = wm.plan.kind === 'lift', any = lift ? wmLiftAny() : wmStageAny();
  return '<div class="wm-body wm-center"><h2>End early?</h2><p class="muted">' + (any ? 'What you logged so far can be saved, kept for later, or thrown away.' : 'Nothing is logged yet.') + '</p>' + (wm.err ? '<p class="banner bad" id="wmErr">' + esc(wm.err) + '</p>' : '') +
    '<div class="stack" style="width:100%">' + (any ? '<button type="button" class="primary" id="wmQuitSave" data-a="' + (lift ? 'wm-save' : 'wm-stagelog') + '">Save what\'s logged</button>' : '') +
    '<button type="button" class="wm-btn" id="wmQuitKeep" data-a="wm-leave">' + (any ? 'Keep it and leave' : 'Leave') + '</button>' +
    (any ? '<button type="button" class="wm-btn danger" id="wmQuitDrop" data-a="wm-drop">' + (wm.quit === 2 ? 'Tap again to discard everything' : 'Discard…') + '</button>' : '') +
    '<button type="button" class="wm-btn" id="wmQuitBack" data-a="wm-unquit">Back to the workout</button></div></div>';
}
ACT['wm-quit'] = () => { if (!wm) return; if (wm.view === 'start') { wmGo(); } wm.back = wm.view === 'quit' ? wm.back : wm.view; wm.view = 'quit'; wm.quit = 1; wm.err = ''; wmDraw(); };
ACT['wm-unquit'] = () => { wm.view = wm.back && wm.back !== 'quit' ? wm.back : 'main'; wm.quit = 0; wmDraw(); };
ACT['wm-leave'] = () => { wmKeep(); if (wm.plan.kind === 'lift' && !wmLiftAny()) wmDropDraft(); if (wm.plan.kind !== 'lift' && !wmStageAny()) lsSet(WM_KEY, null); wmClose(); };
function wmDropDraft() { const d = state.drafts[wm.date]; if (!d) return; delete state.drafts[wm.date]; delete state.formError[wm.date]; persistDrafts(); }
ACT['wm-drop'] = () => { // discard needs a second tap
  if (wm.quit !== 2) { wm.quit = 2; wmDraw(); return; }
  if (wm.plan.kind === 'lift') wmDropDraft(); else lsSet(WM_KEY, null);
  wmClose(); toast('Discarded. Nothing was saved.');
};

/* --- lifts: one exercise at a time --- */
function wmLiftInit(resume) {
  const d = draft(wm.date), p = wm.plan;
  if (!resume) { if (DAYS[p.day] && kindFor(wm.date, d) !== p.day) d.kindSel = p.day; if (p.felt) d.checkin = p.felt; d.wm = { at: Date.now(), ms: 0, title: p.title }; d.recovered = false; persistDrafts(); }
  else wm.ms = (d.wm && d.wm.ms) || 0;
  const slots = wmSlots(), firstOpen = slots.findIndex(s => wmSets(s).next >= 0), touched = d.tm.minutes !== '' || wmLiftAny();
  wm.i = touched ? (firstOpen < 0 ? slots.length - 1 : firstOpen) : -1; // a fresh session opens on the warm-up
  wm.warm = d.tm.minutes !== '' ? Number(d.tm.minutes) || 0 : DAYS[wmKind()].full ? 5 : TREAD_MIN[phaseOf(wm.date)];
  wmLoadEx();
}
const wmM = () => state.drafts[wm.date] || model(wm.date);
const wmKind = () => kindFor(wm.date, wmM());
const wmSlots = () => { const k = wmKind(); return DAYS[k] ? plannedFor(wm.date, k, wmM()) : []; };
function wmSets(p) { // the sets of one slot: how many, which are logged, which is next
  const m = wmM(), n = setCount(p.key, m, wm.date), e = m.ex[p.key] || { w: '', reps: [] }, reps = [];
  for (let i = 0; i < n; i++) reps.push(e.reps[i] == null || e.reps[i] === '' ? null : Number(e.reps[i]));
  return { n, w: e.w, reps, next: reps.indexOf(null), done: reps.filter(r => r != null).length };
}
const wmLiftAny = () => { const m = wmM(); return m.tm.minutes !== '' && Number(m.tm.minutes) > 0 || Object.keys(m.ex).some(k => m.ex[k].reps.some(r => r !== '' && r != null)); };
function wmLiftFrac() { const s = wmSlots(); let done = 0, all = 0; s.forEach(p => { const x = wmSets(p); done += x.done; all += x.n; }); return all ? done / all : 0; }
function wmLoadEx() { // the steppers start from the suggestion and from last time
  const all = wmSlots(); if (wm.i >= all.length) wm.i = all.length - 1; // a lift past the first three leaves a short session when its only set is removed
  const p = all[wm.i]; wm.edit = null; wm.swap = false; if (!p) return;
  const ex = EX[p.key], sg = suggest(p.key, wm.date), s = wmSets(p), i = s.next < 0 ? s.n - 1 : s.next, sp = specFor(p.key, wm.date);
  wm.w = ex.bw ? null : s.w !== '' && isFinite(Number(s.w)) ? Number(s.w) : (sg.w != null ? sg.w : ex.start);
  const prev = i > 0 && s.reps[i - 1] != null ? s.reps[i - 1] : null, last = sg.last && sg.last.reps[i] != null ? sg.last.reps[i] : null;
  wm.r = prev != null ? prev : ex.bw && sg.reps ? sg.reps : last != null ? clamp(last, sp.lo, sp.hi + 5) : sp.lo;
}
function wmLiftHTML() {
  const slots = wmSlots(), kind = wmKind(), day = DAYS[kind], n = slots.length;
  if (wm.i >= n) wm.i = n - 1;
  let h = wmTopHTML(n + 1, wm.i + 1, (1 + wmLiftFrac() * n) / (n + 1) * (wm.i < 0 && !wmLiftAny() ? 0 : 1));
  if (wm.i < 0) { // the warm-up lap
    const full = day.full;
    return h + '<div class="wm-body"><div class="eyebrow">Warm-up · ' + esc(day.name) + '</div><h2 id="wmName">' + (full ? 'Warm-up' : 'Treadmill · Fitness+') + '</h2>' +
      '<p class="wm-target">' + (full ? 'Track, treadmill or bike. <b>5–10 easy minutes</b>, enough to feel warm.' : 'Pick a Fitness+ workout. <b>Target ' + TREAD_MIN[phaseOf(wm.date)] + ' min</b>.') + '</p>' +
      '<div class="wm-steps one"><div class="wm-step"><span class="eyebrow">Minutes</span><div><button type="button" data-a="wm-warm" data-d="-1" aria-label="1 minute less">−</button><b class="num" id="wmWarm">' + wm.warm + '</b><button type="button" data-a="wm-warm" data-d="1" aria-label="1 minute more">+</button></div></div></div>' +
      '<button type="button" class="primary wm-log" id="wmWarmLog" data-a="wm-warmlog">Log warm-up</button></div>' +
      '<div class="wm-nav"><button type="button" class="wm-btn" data-a="wm-next">Skip warm-up</button></div>';
  }
  const p = slots[wm.i], key = p.key, ex = EX[key], sp = specFor(key, wm.date), sg = suggest(key, wm.date), s = wmSets(p);
  const editing = wm.edit != null, idx = editing ? wm.edit : s.next, done = s.next < 0 && !editing, stand = key === p.base ? defaultSwapOption(p.base) : null, opts = swapOptions(slots, p);
  h += '<div class="wm-body"><div class="wm-demo" id="wmDemo">' + figHTML(key, 'wm', ex.name, true) + '</div>' +
    '<div class="eyebrow">Lift ' + (wm.i + 1) + ' of ' + n + ' · ' + esc(day.name) + '</div><h2 id="wmName">' + esc(ex.name) + (sp.optional ? ' <span class="chip">if there\'s time</span>' : '') + (key !== p.base ? ' <span class="chip">swapped</span>' : '') + '</h2>' + mySetLine(wm.pid, key) +
    '<p class="wm-target" id="wmTarget"><b>' + (sg.deload ? 2 : sp.sets) + ' × ' + sp.lo + '–' + sp.hi + '</b>' + (ex.bw ? ' · bodyweight' : ' · ' + sg.w + ' lb' + (ex.per ? ' each hand' : '')) + (sg.deload ? ' · deload' : sg.reset ? ' · reset' : '') + '</p>' +
    '<p class="tiny muted" id="wmLast">' + (sg.last ? 'Last · ' + nice(sg.last.date) + ': ' + esc((sg.last.w != null ? fmtW(key, sg.last.w) + ' × ' : '') + fmtReps(sg.last.reps)) : 'First time. ' + esc(sg.why)) + '</p>' +
    '<p class="tiny muted" id="wmEquip">' + esc(ex.equip) + (ex.per ? ' · weight is one dumbbell' : '') + '</p>' +
    '<div class="row wm-tools"><button type="button" class="wm-btn sm" data-a="wm-swap"' + (opts.length ? '' : ' disabled') + ' aria-expanded="' + !!wm.swap + '">Swap</button><button type="button" class="wm-btn sm" id="wmNotGym" data-a="wm-notgym"' + (stand ? '' : ' disabled') + '>Not at my gym</button></div>';
  if (wm.swap) h += '<div class="wm-swaps" id="wmSwaps">' + opts.map(k => '<button type="button" class="wm-btn" data-a="wm-swapto" data-base="' + p.base + '" data-to="' + k + '">' + esc(EX[k].name) + (k === p.base ? ' <span class="tiny muted">(planned)</span>' : '') + '</button>').join('') + '</div>';
  h += '<div class="wm-pips" id="wmPips" aria-label="Sets">' + s.reps.map((r, i) => '<button type="button" class="wm-pip' + (r != null ? ' on' : '') + (wm.justSet === p.key + ':' + i ? ' new' : '') + (wm.edit === i ? ' edit' : '') + (i === s.next && !editing ? ' next' : '') + '" data-a="wm-pip" data-i="' + i + '"' + (r == null ? ' disabled' : '') + ' aria-label="Set ' + (i + 1) + (r != null ? ': ' + r + ' reps, tap to change' : ', not logged') + '">' + (r != null ? r : i + 1) + '</button>').join('') + '</div>';
  if (wm.err) h += '<p class="banner bad" id="wmErr">' + esc(wm.err) + '</p>';
  if (done) h += '<p class="wm-done" id="wmDone">All ' + s.n + ' sets logged. Tap a set to change it.</p>';
  else h += '<div class="wm-steps' + (ex.bw ? ' one' : '') + '">' + (ex.bw ? '' : '<div class="wm-step"><span class="eyebrow">Weight lb' + (ex.per ? ' each' : '') + '</span><div><button type="button" data-a="wm-w" data-d="-1" aria-label="Less weight">−</button><b class="num" id="wmW">' + wm.w + '</b><button type="button" data-a="wm-w" data-d="1" aria-label="More weight">+</button></div></div>') +
    '<div class="wm-step"><span class="eyebrow">Reps</span><div><button type="button" data-a="wm-r" data-d="-1" aria-label="One rep fewer">−</button><b class="num" id="wmR">' + wm.r + '</b><button type="button" data-a="wm-r" data-d="1" aria-label="One rep more">+</button></div></div></div>' +
    '<button type="button" class="primary wm-log" id="wmLog" data-a="wm-log">' + (editing ? 'Update set ' + (idx + 1) : 'Log set ' + (idx + 1)) + '</button>' +
    (editing ? '<div class="row"><button type="button" class="wm-btn sm danger" id="wmDel" data-a="wm-del">Delete set ' + (idx + 1) + '</button><button type="button" class="wm-btn sm" data-a="wm-editx">Cancel</button></div>' : '');
  h += wmHowHTML(key, wm.howKey === key);
  h += '</div><div class="wm-nav"><button type="button" class="wm-btn" data-a="wm-prev">‹ ' + (wm.i === 0 ? 'Warm-up' : 'Back') + '</button>' +
    (wm.i < n - 1 ? '<button type="button" class="wm-btn' + (done ? ' on' : '') + '" id="wmNext" data-a="wm-next">Next lift ›</button>' : '') + '<button type="button" class="wm-btn' + (wm.i === n - 1 || wmLiftAny() ? ' on' : '') + '" id="wmFinish" data-a="wm-finish">Finish</button></div>';
  return h;
}
const wmPatch = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
ACT['wm-warm'] = el => { wm.warm = clamp(wm.warm + Number(el.dataset.d), 0, 60); wmPatch('wmWarm', wm.warm); };
ACT['wm-warmlog'] = () => { const d = draft(wm.date); d.tm.minutes = String(wm.warm); d.recovered = false; persistDrafts(); wm.i = 0; wmLoadEx(); wmDraw(); };
ACT['wm-w'] = el => { const p = wmSlots()[wm.i], step = Math.abs(EX[p.key].inc) || 5; wm.w = Math.max(0, Math.round((wm.w + Number(el.dataset.d) * step) * 100) / 100); wmPatch('wmW', wm.w); };
ACT['wm-r'] = el => { wm.r = clamp(wm.r + Number(el.dataset.d), 0, 100); wmPatch('wmR', wm.r); };
ACT['wm-pip'] = el => { const p = wmSlots()[wm.i], s = wmSets(p), i = Number(el.dataset.i); if (s.reps[i] == null) return; wm.edit = i; wm.r = s.reps[i]; if (!EX[p.key].bw && s.w !== '') wm.w = Number(s.w); wm.err = ''; wmDraw(); };
ACT['wm-editx'] = () => { wmLoadEx(); wmDraw(); };
function wmWrite(i, value) { // one set into the draft, exactly as typing it into the lifting log would
  const p = wmSlots()[wm.i], key = p.key, d = draft(wm.date); d.ex[key] = d.ex[key] || { w: '', reps: [] };
  if (!EX[key].bw && value !== '') d.ex[key].w = String(wm.w);
  while (d.ex[key].reps.length <= i) d.ex[key].reps.push('');
  d.ex[key].reps[i] = value; d.recovered = false; delete state.formError[wm.date]; persistDrafts();
}
ACT['wm-log'] = el => {
  const slots = wmSlots(), p = slots[wm.i], s = wmSets(p), editing = wm.edit != null, i = editing ? wm.edit : s.next; if (i < 0) return;
  wmWrite(i, String(wm.r)); wm.err = ''; state.wmLogs = (state.wmLogs || 0) + 1; wm.justSet = p.key + ':' + i; wm.restOf = { key: p.key, reps: wmSets(p).reps, i };
  const r = el.getBoundingClientRect(); burst({ count: 16, x: (r.left + r.width / 2) / window.innerWidth, y: r.top / window.innerHeight }); // a small burst, in this person's style
  if (editing) { wmLoadEx(); wmDraw(); return; }
  const after = wmSets(p), last = after.next < 0, nextSlot = last ? slots.slice(wm.i + 1).find(x => wmSets(x).next >= 0) : null;
  if (last && !nextSlot) { wmLoadEx(); wmDraw(); return; } // the last set of the last lift: no rest, straight to Finish
  const sec = restFor(p.key);
  wm.rest = { end: Date.now() + sec * 1000, total: sec, to: last ? slots.indexOf(nextSlot) : wm.i, over: false };
  wm.view = 'rest'; wmDraw();
};
ACT['wm-del'] = () => { if (wm.edit == null) return; wmWrite(wm.edit, ''); wmLoadEx(); wmDraw(); };
ACT['wm-swap'] = () => { wm.swap = !wm.swap; wmDraw(); };
ACT['wm-swapto'] = el => { const d = draft(wm.date); d.swaps[el.dataset.base] = el.dataset.to; d.recovered = false; persistDrafts(); wmLoadEx(); wmDraw(); };
ACT['wm-notgym'] = async () => { const p = wmSlots()[wm.i]; if (!p) return; if (await notAtMyGym(p.base)) { wmLoadEx(); wmDraw(); } };
ACT['wm-prev'] = () => { if (wm.i >= 0) { wm.i--; wm.err = ''; wmLoadEx(); wmDraw(); } };
ACT['wm-next'] = () => { const n = wmSlots().length; if (wm.i < n - 1) { wm.i++; wm.err = ''; wmLoadEx(); wmDraw(); } };
// rest: a big ring, +15 s, Skip, and what comes next
function wmRestHTML() {
  const slots = wmSlots(), p = slots[wm.rest.to], s = wmSets(p), sg = suggest(p.key, wm.date), sp = specFor(p.key, wm.date), same = wm.rest.to === wm.i, C = 339.3;
  return wmTopHTML(slots.length + 1, wm.i + 1, (1 + wmLiftFrac() * slots.length) / (slots.length + 1)) + '<div class="wm-body wm-center"><div class="eyebrow">Rest</div>' +
    '<div class="wm-ring" id="wmRing"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="rbg" cx="60" cy="60" r="54"/><circle class="rfg" id="wmRingFg" cx="60" cy="60" r="54" stroke-dasharray="' + C + '" stroke-dashoffset="0"/></svg><b class="num" id="wmRestTime">' + wmTime(wm.rest.end - Date.now() + 999) + '</b></div>' +
    (wm.restOf && motionOf() !== 'full' ? '<div class="wm-pips" id="wmRestPips" aria-hidden="true">' + wm.restOf.reps.map((r, i) => '<span class="wm-pip' + (r != null ? ' on' : '') + (i === wm.restOf.i ? ' new' : '') + '">' + (r != null ? r : i + 1) + '</span>').join('') + '</div>' : '') +
    '<div class="row" style="justify-content:center"><button type="button" class="wm-btn" id="wmRestAdd" data-a="wm-restadd">+15 s</button><button type="button" class="wm-btn on" id="wmRestSkip" data-a="wm-restskip">Skip</button></div>' +
    '<div class="wm-nextup" id="wmNextUp"><div class="eyebrow">' + (same ? 'Next' : 'Next lift') + '</div><b>' + esc(EX[p.key].name) + '</b><span class="muted">' + (same ? 'Set ' + (s.next + 1) + ' of ' + s.n : sp.sets + ' × ' + sp.lo + '–' + sp.hi) + (EX[p.key].bw ? '' : ' · ' + (same && s.w !== '' ? s.w : sg.w) + ' lb') + '</span></div></div>';
}
function wmRestTick() {
  const left = wm.rest.end - Date.now(), fg = $('#wmRingFg');
  wmPatch('wmRestTime', wmTime(left + 999)); if (fg) fg.setAttribute('stroke-dashoffset', (339.3 * clamp(1 - left / (wm.rest.total * 1000), 0, 1)).toFixed(1));
  if (left <= 0 && !wm.rest.over) { wm.rest.over = true; try { if (navigator.vibrate) navigator.vibrate([180, 90, 180]); } catch (e) { /* not supported */ } wmRestEnd(); }
}
function wmRestEnd() { if (!wm || wm.view !== 'rest') return; wm.i = wm.rest.to; wm.view = 'main'; wm.rest = null; wm.justSet = null; wm.restOf = null; wmLoadEx(); wmDraw(); }
ACT['wm-restadd'] = () => { if (wm.rest) { wm.rest.end = Math.max(wm.rest.end, Date.now()) + 15000; wm.rest.total += 15; wmRestTick(); } };
ACT['wm-restskip'] = () => wmRestEnd();
// the finish: a checkered flag, what was done, then the same save as the Save button
function wmLiftSummary() {
  const r = parseDraft(wm.date, wmM()), doc = r.doc, ex = doc.ex || {}, keys = Object.keys(ex); let sets = 0, lb = 0; const ups = [];
  keys.forEach(k => { const reps = ex[k].reps.filter(x => x != null), last = lastLog(k, wm.date); sets += reps.length;
    if (!EX[k].bw) { lb += sum(reps) * ex[k].w * (EX[k].per ? 2 : 1); if (last && last.w != null && (EX[k].inc < 0 ? ex[k].w < last.w : ex[k].w > last.w)) ups.push(EX[k].name + ' ' + last.w + ' → ' + ex[k].w + ' lb'); } });
  return { r, sets, lb: Math.round(lb), ups, lifts: keys.length, minutes: r.errors.length ? 0 : normalize(doc).progMin, warm: doc.treadmill ? doc.treadmill.minutes : 0, counts: r.kind === 'strength' && !!doc.qualifies, kind: r.kind, day: doc.day };
}
function wmPointsHTML() {
  const pid = wm.pid, o = otherPid(pid), b = wm.before, a = wm.after, lead = b[pid] <= b[o] && a[pid] > a[o], gain = a[pid] - b[pid];
  return '<div class="wm-sum" id="wmPoints"><div><span class="muted">This week\'s points</span><b class="num">' + b[pid] + ' → ' + a[pid] + (gain > 0 ? ' <span class="chip good">+' + gain + '</span>' : '') + '</b></div>' +
    (lead ? '<div id="wmLead"><span>🏁 You took the lead</span><b class="num">' + a[pid] + '–' + a[o] + '</b></div>' : '<div><span class="muted">' + esc(P(o).name) + '</span><b class="num">' + a[o] + '</b></div>') + '</div>';
}
const wmHeatAsk = () => atHealthplex(wm.pid) && wm.date === todayIso() && !heatDone(wm.pid, wm.date) ? '<button type="button" class="chipbtn" id="wmHeat" data-a="wm-heat">🔥 Sauna, steam or whirlpool after?</button>' : '';
function wmLiftFinishHTML() {
  const s = wm.sum || wmLiftSummary(), slots = wmSlots().length || 1;
  let h = wmTopHTML(slots + 1, slots, 1) + '<div class="wm-body wm-center">' + (motionOf() === 'full' ? wmFlag('chk', true) : '') + '<h2 id="wmFinishTitle">' + (wm.saved ? 'Saved' : 'Finish line') + '</h2>' +
    '<div class="wm-sum" id="wmSummary"><div><span class="muted">Sets</span><b class="num">' + wmNum(s.sets) + '</b></div><div><span class="muted">Total lifted</span><b class="num">' + wmNum(s.lb, ' lb') + '</b></div>' +
    '<div><span class="muted">Minutes</span><b class="num">' + wmNum(s.minutes) + '</b></div><div><span class="muted">' + (s.kind === 'strength' ? (s.counts ? 'Counts as a lift day' : 'Not a lift day yet') : s.kind === 'cardio' ? 'Warm-up only' : 'Nothing logged') + '</span><b>' + (s.kind === 'strength' ? esc(DAYS[s.day].name) : '') + '</b></div></div>' +
    (s.ups.length ? '<p class="wm-ups" id="wmUps"><b>Up from last time:</b> ' + s.ups.map(esc).join(' · ') + '</p>' : '');
  if (wm.err) h += '<p class="banner bad" id="wmErr">' + esc(wm.err) + '</p>';
  if (wm.saved) h += wmPointsHTML() + wmHeatAsk() + '<button type="button" class="primary wm-log" id="wmDoneBtn" data-a="wm-done">Done</button>';
  else h += '<button type="button" class="primary wm-log" id="wmSave" data-a="wm-save">Save workout</button><button type="button" class="wm-btn" data-a="wm-unfinish">Back to the lifts</button>';
  return h + '</div>';
}
ACT['wm-finish'] = () => { wm.view = 'finish'; wm.err = ''; wm.sum = null; wm.counted = false; wmDraw(); burst({ kind: 'flags', count: 40, y: 0.4 }); }; // the burst is Full only
ACT['wm-unfinish'] = () => { wm.view = 'main'; wm.err = ''; wm.fin = null; wmDraw(); }; // going back drops what was typed on the finish screen: the next Finish starts from the clock again
ACT['wm-save'] = async () => { // the same save as the Save button: same rules, same celebration, same lift-day credit
  const s = wmLiftSummary(); if (s.r.errors.length) { wm.err = s.r.errors[0]; wmDraw(); return; }
  if (state.selDate !== wm.date) state.selDate = wm.date;
  const d = state.drafts[wm.date]; if (d) delete d.wm; // the record is the lifting log's own; "in progress" ends here
  const ok = await save();
  if (!wm) return;
  if (!ok) { wm.err = 'Not saved. Your sets are kept on this phone: try again.'; const d2 = state.drafts[wm.date]; if (d2) { d2.wm = { at: Date.now(), ms: wmElapsed(), title: wm.plan.title }; persistDrafts(); } wm.view = 'finish'; wmDraw(); return; }
  wm.sum = s; wm.saved = true; wm.after = scoreSnapshot(); wm.view = 'finish'; wm.err = ''; wmDraw();
};
ACT['wm-done'] = () => wmClose();
ACT['wm-heat'] = () => { wmClose(); ACT['heat-open'](); };

/* --- timed sessions: cardio, guided, recovery --- */
function wmStagesInit(resume) {
  const s = resume ? lsGet(WM_KEY, null) : null;
  if (s && Array.isArray(s.st)) { wm.plan = s.plan; wm.st = s.st; wm.si = clamp(s.si || 0, 0, s.plan.stages.length - 1); wm.ms = s.ms || 0; }
  else { wm.st = wm.plan.stages.map(x => ({ ms: 0, on: false, at: 0, laps: 0, sets: {}, iv: false, min: x.min, room: HEAT_KEYS.includes(x.act) ? x.act : 'hpsauna', done: false })); wm.si = 0; }
}
const wmStore = () => { if (wm && wm.plan.kind !== 'lift') lsSet(WM_KEY, { pid: wm.pid, date: wm.date, plan: wm.plan, st: wm.st, si: wm.si, ms: wmElapsed() }); };
const wmStageMs = i => { const s = wm.st[i]; return s.ms + (s.on ? Date.now() - s.at : 0); };
const wmStageAny = () => wm.st.some((s, i) => wmStageMs(i) >= 1000 || s.laps > 0 || Object.keys(s.sets).length);
const stretchPlan = stage => { const out = []; for (let r = 0; r < (stage.rounds || 1); r++) STRETCHES.forEach(x => out.push(x)); return out; };
function stretchAt(stage, ms) { // which stretch the clock is in, and how long is left of it
  const list = stretchPlan(stage); let t = 0;
  for (let i = 0; i < list.length; i++) { const len = list[i].sec * 1000; if (ms < t + len) return { i, n: list.length, x: list[i], left: t + len - ms, start: t, len }; t += len; }
  return { i: list.length, n: list.length, x: null, left: 0, start: t, len: 0 };
}
function wmStageHTML() {
  const st = wm.plan.stages, i = wm.si, g = st[i], s = wm.st[i], ms = wmStageMs(i), a = ACTS[g.act], n = st.length;
  let h = wmTopHTML(n, i, (i + clamp(ms / (g.min * 60000), 0, 1)) / n) + '<div class="wm-body wm-center"><div class="eyebrow">' + (n > 1 ? 'Part ' + (i + 1) + ' of ' + n + ' · ' : '') + esc(wm.plan.title) + '</div><h2 id="wmName">' + esc(g.name) + '</h2>';
  const big = '<div class="wm-bigtime num" id="wmStageTime">' + wmTime(ms) + '</div>', toggle = '<button type="button" class="wm-btn' + (s.on ? '' : ' on') + '" id="wmToggle" data-a="wm-toggle">' + (s.on ? 'Pause' : ms > 0 ? 'Resume' : 'Start timer') + '</button>';
  if (g.type === 'laps') {
    const run = g.act === 'hprun';
    h += '<p class="wm-target">8 laps = 1 mile' + (run ? ' · run 1 lap, walk 1 lap' : '') + '</p>' + big +
      '<div class="wm-stat" id="wmLapStats"><div><b class="num" id="wmLaps">' + s.laps + '</b><span>laps</span></div><div><b class="num" id="wmMiles">' + (s.laps / TRACK_LAPS).toFixed(s.laps % 4 === 0 ? 1 : 2) + '</b><span>miles</span></div><div><b class="num" id="wmPace">' + wmPace(s.laps, ms) + '</b><span>min / mile</span></div></div>' +
      '<button type="button" class="primary wm-tap" id="wmLap" data-a="wm-lap">' + (run ? (s.laps % 2 === 0 ? 'Run' : 'Walk') + ' lap done' : 'Lap done') + '</button>' +
      '<div class="row" style="justify-content:center">' + toggle + '<button type="button" class="wm-btn" id="wmLapUndo" data-a="wm-lapundo"' + (s.laps ? '' : ' disabled') + '>−1 lap</button></div>';
  } else if (g.type === 'lengths') {
    h += '<p class="wm-target">One length is ' + POOL_YARDS + ' yards. Rest at the wall whenever you like.</p>' + big +
      '<div class="wm-stat"><div><b class="num" id="wmLaps">' + s.laps + '</b><span>lengths</span></div><div><b class="num" id="wmMiles">' + s.laps * POOL_YARDS + '</b><span>yards</span></div></div>' +
      '<button type="button" class="primary wm-tap" id="wmLap" data-a="wm-lap">Length done</button><div class="row" style="justify-content:center">' + toggle + '<button type="button" class="wm-btn" id="wmLapUndo" data-a="wm-lapundo"' + (s.laps ? '' : ' disabled') + '>−1 length</button></div>';
  } else if (g.type === 'circuit') {
    const gk = clamp(Number(s.gk) || 0, 0, CIRCUIT.length - 1), gkey = GD_STATIONS[gk];
    h = h.replace('<div class="wm-body wm-center">', '<div class="wm-body wm-center wm-hasdemo"><div class="wm-demo" id="wmDemo" data-station="' + gk + '">' + figHTML(gkey, 'wm', CIRCUIT[gk], true) + '</div>');
    h += '<p class="wm-target">One or two easy sets of 10 to 12 on each machine. Tap a machine after each set.</p>' + big + '<div class="wm-stations" id="wmStations">' +
      CIRCUIT.map((name, k) => '<div class="wm-strow' + (k === gk ? ' cur' : '') + '"><button type="button" class="wm-btn" data-a="wm-station" data-k="' + k + '"><span>' + name + mySetLine(wm.pid, GD_STATIONS[k]) + '</span><b class="num">' + (s.sets[k] || 0) + ' set' + ((s.sets[k] || 0) === 1 ? '' : 's') + '</b></button>' +
        '<button type="button" class="wm-btn sm" data-a="wm-sthow" data-k="' + k + '" aria-expanded="' + (wm.howKey === GD_STATIONS[k]) + '" aria-label="How to use the ' + name.toLowerCase() + ' machine">How to</button></div>').join('') + '</div><div class="row" style="justify-content:center">' + toggle + '</div>' +
      (GD_STATIONS.includes(wm.howKey) ? '<div class="wm-howcard" id="wmHow">' + guideCardHTML(wm.howKey, { pid: wm.pid, from: 'live' }) + '</div>' : '');
  } else if (g.type === 'stretch') {
    const at = stretchAt(g, ms);
    if (at.x) h = h.replace('<div class="wm-body wm-center">', '<div class="wm-body wm-center wm-hasdemo"><div class="wm-demo" id="wmDemo">' + figHTML(at.x.g, 'wm', at.x.name, true) + '</div>');
    h += at.x ? '<p class="wm-target" id="wmStretchN">Stretch ' + (at.i + 1) + ' of ' + at.n + '</p><div class="wm-bigtime num" id="wmStageTime">' + wmTime(at.left + 999) + '</div><h3 id="wmStretchName">' + esc(at.x.name) + '</h3><p class="wm-cue" id="wmStretchCue">' + esc(at.x.cue) + '</p>' +
      '<div class="row" style="justify-content:center">' + toggle + '<button type="button" class="wm-btn" id="wmStretchNext" data-a="wm-stretchnext">Next stretch ›</button></div>' + wmHowHTML(at.x.g, wm.howKey === at.x.g)
      : '<p class="wm-done" id="wmStretchDone">Stretching done. Nice and loose.</p>';
  } else if (g.type === 'heat') {
    const left = s.min * 60000 - ms, over = left <= 0 && ms > 0;
    h += '<div class="seg" id="wmRooms" aria-label="Which room">' + HEAT_KEYS.map(k => '<button type="button" data-a="wm-room" data-k="' + k + '" class="' + (s.room === k ? 'on' : '') + '" aria-pressed="' + (s.room === k) + '">' + ACTS[k].name + '</button>').join('') + '</div>' +
      '<div class="wm-bigtime num" id="wmStageTime">' + wmTime(Math.max(0, left) + (over ? 0 : 999)) + '</div>' +
      (over ? '<p class="wm-done" id="wmHeatOver">Time. Step out, cool down and drink water.</p><button type="button" class="primary wm-tap" id="wmWater" data-a="wm-water"' + (s.water ? ' disabled' : '') + '>' + (s.water ? 'Water logged' : '+' + BOTTLE_OZ + ' oz water') + '</button>'
        : '<div class="row" style="justify-content:center"><button type="button" class="wm-btn" data-a="wm-heatmin" data-d="-5"' + (s.min <= 5 ? ' disabled' : '') + '>−5 min</button>' + toggle + '<button type="button" class="wm-btn" data-a="wm-heatmin" data-d="5"' + (s.min >= 20 ? ' disabled' : '') + '>+5 min</button></div>') +
      '<p class="tiny muted" id="wmHeatNote">' + HEAT_NOTE + '</p>';
  } else {
    h += '<p class="wm-target">' + (a ? esc(a.desc) : 'Pick a Fitness+ workout and keep the pace easy.') + '</p>' + big + '<p class="wm-cue" id="wmSeg">' + wmSegText(s, ms, g) + '</p>' +
      '<div class="row" style="justify-content:center">' + toggle + '<button type="button" class="wm-btn' + (s.iv ? ' on' : '') + '" id="wmIv" data-a="wm-iv" aria-pressed="' + !!s.iv + '">Intervals: 1 min hard, 2 easy</button></div>';
  }
  if (a && a.cls) h += '<p class="tiny muted" id="wmClsTag">' + classTag(a) + '</p>';
  h += '</div><div class="wm-nav">' + (i > 0 ? '<button type="button" class="wm-btn" data-a="wm-sprev">‹ Back</button>' : '') +
    (i < n - 1 ? '<button type="button" class="wm-btn on" id="wmNext" data-a="wm-snext">Next: ' + esc(st[i + 1].name) + ' ›</button>' : '') + '<button type="button" class="wm-btn' + (i === n - 1 ? ' on' : '') + '" id="wmFinish" data-a="wm-sfinish">Finish</button></div>';
  return h;
}
const wmPace = (laps, ms) => laps > 0 && ms >= 1000 ? wmTime(ms / (laps / TRACK_LAPS)) : '–';
const wmSegText = (s, ms, g) => s.iv ? (ms % 180000 < 60000 ? 'Hard · ' + wmTime(60000 - ms % 180000 + 999) + ' left' : 'Easy · ' + wmTime(180000 - ms % 180000 + 999) + ' left') : 'Target ' + g.min + ' min · any pace you can talk through';
function wmStageTick() {
  const i = wm.si, g = wm.plan.stages[i], s = wm.st[i], ms = wmStageMs(i); if (!s.on) return;
  const strip = $('#wmStrip'); if (strip) strip.style.setProperty('--p', ((i + clamp(ms / (g.min * 60000), 0, 1)) / wm.plan.stages.length * 100).toFixed(1) + '%');
  if (g.type === 'stretch') { const at = stretchAt(g, ms); if (!at.x || String(at.i + 1) !== ((($('#wmStretchN') || {}).textContent || '').split(' ')[1] || '')) { if (!at.x) { s.ms = ms; s.on = false; wmStore(); } wmDraw(); return; } wmPatch('wmStageTime', wmTime(at.left + 999)); return; }
  if (g.type === 'heat') { const left = s.min * 60000 - ms; if (left <= 0) { s.ms = s.min * 60000; s.on = false; try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* not supported */ } wmStore(); wmDraw(); return; } wmPatch('wmStageTime', wmTime(left + 999)); return; }
  wmPatch('wmStageTime', wmTime(ms));
  if (g.type === 'laps') wmPatch('wmPace', wmPace(s.laps, ms)); else if (g.type === 'timer') wmPatch('wmSeg', wmSegText(s, ms, g));
}
function wmRun(on) { const s = wm.st[wm.si]; if (on === s.on) return; if (on) { s.on = true; s.at = Date.now(); } else { s.ms = wmStageMs(wm.si); s.on = false; } }
ACT['wm-toggle'] = () => { const s = wm.st[wm.si]; wmRun(!s.on); wmStore(); wmDraw(); };
ACT['wm-lap'] = () => { const s = wm.st[wm.si]; s.laps++; wmRun(true); wmStore(); state.wmLogs = (state.wmLogs || 0) + 1; wmDraw(); }; // the first lap starts the clock
ACT['wm-lapundo'] = () => { const s = wm.st[wm.si]; if (s.laps > 0) { s.laps--; wmStore(); wmDraw(); } };
ACT['wm-station'] = el => { const s = wm.st[wm.si], k = el.dataset.k; s.sets[k] = (s.sets[k] || 0) + 1; s.gk = Number(k); if (GD_STATIONS.includes(wm.howKey)) wm.howKey = GD_STATIONS[s.gk]; wmRun(true); wmStore(); wmDraw(); };
ACT['wm-sthow'] = el => { const s = wm.st[wm.si], k = Number(el.dataset.k), key = GD_STATIONS[k]; wm.howKey = wm.howKey === key ? null : key; s.gk = k; wmStore(); wmDraw(); // the picture switches to that machine and its card opens under the list
  if (wm.howKey) wmHowReveal('#wmStations'); };
ACT['wm-iv'] = () => { const s = wm.st[wm.si]; s.iv = !s.iv; wmStore(); wmDraw(); };
ACT['wm-stretchnext'] = () => { const g = wm.plan.stages[wm.si], s = wm.st[wm.si], at = stretchAt(g, wmStageMs(wm.si)); if (!at.x) return; s.ms = at.start + at.len; if (s.on) s.at = Date.now(); wmStore(); wmDraw(); };
ACT['wm-room'] = el => { wm.st[wm.si].room = el.dataset.k; wmStore(); wmDraw(); };
ACT['wm-heatmin'] = el => { const s = wm.st[wm.si]; s.min = clamp(s.min + Number(el.dataset.d), 5, 20); wmStore(); wmDraw(); };
ACT['wm-water'] = async () => { const s = wm.st[wm.si]; if (s.water) return; state.waterDate = wm.date; s.water = true; wmStore(); await ACT['water-bottle'](); };
ACT['wm-sprev'] = () => { if (wm.si > 0) { wmRun(false); wm.si--; wmStore(); wmDraw(); } };
ACT['wm-snext'] = () => { if (wm.si < wm.plan.stages.length - 1) { wmRun(false); wm.si++; wmStore(); wmDraw(); } };
// What the session logs: every moving part as ONE activity (minutes, with laps, miles or station sets in its note),
// and a recovery room, if it was used, as its own recovery entry that does not count toward active minutes.
const wmMeasured = i => { const s = wm.st[i], ms = wmStageMs(i); return Math.max(ms >= 20000 || s.laps > 0 || Object.keys(s.sets).length ? 1 : 0, Math.round(ms / 60000)); };
const wmInt = (v, max) => { const n = Math.round(Number(v)); return isFinite(n) && n > 0 ? Math.min(max, n) : 0; };
function wmStageOutcome() {
  const parts = [], notes = []; let min = 0, heat = null, first = null;
  wm.plan.stages.forEach((g, i) => { const f = wm.fin && wm.fin[i], s = f ? Object.assign({}, wm.st[i], { laps: wmInt(f.laps, 400) }) : wm.st[i], m = f ? wmInt(f.min, 300) : wmMeasured(i); // typed on the finish screen, or what the clock measured
    if (g.type === 'heat') { if (m > 0) heat = { k: s.room, min: Math.min(20, m) }; return; }
    if (!m) return; first = first || g; min += m; parts.push(g.name);
    notes.push(g.name + ' ' + m + ' min' + (g.type === 'laps' && s.laps ? ', ' + s.laps + ' lap' + (s.laps === 1 ? '' : 's') + ' (' + milesText(s.laps) + ')' : g.type === 'lengths' && s.laps ? ', ' + s.laps + ' length' + (s.laps === 1 ? '' : 's') + ' (' + s.laps * POOL_YARDS + ' yd)' : '') +
      (g.type === 'circuit' && Object.keys(s.sets).length ? ': ' + CIRCUIT.map((nm, k) => s.sets[k] ? nm.toLowerCase() + ' ' + s.sets[k] : '').filter(Boolean).join(', ') : '') + (s.iv ? ', intervals' : '')); });
  return { min, heat, first, name: parts.join(' + '), note: notes.length === 1 && parts.length === 1 ? notes[0].replace(parts[0] + ' ', '').replace(/^\d+ min,? ?/, '') : notes.join(' · ') };
}
const wmStageSumHTML = o => '<div><span class="muted" id="wmSumName">' + esc(o.name || 'Movement') + '</span><b class="num" id="wmSumMin">' + wmNum(o.min, ' min') + '</b></div>' + (o.note ? '<div class="wide"><span class="muted" id="wmSumNote">' + esc(o.note) + '</span></div>' : '') +
  (o.heat ? '<div><span class="muted">' + ACTS[o.heat.k].name + ' · recovery</span><b class="num" id="wmSumHeat">' + o.heat.min + ' min</b></div>' : '');
function wmStagesFinishHTML() {
  const o = wm.out || wmStageOutcome(), n = wm.plan.stages.length;
  let h = wmTopHTML(n, n - 1, 1) + '<div class="wm-body wm-center">' + (motionOf() === 'full' ? wmFlag('chk', true) : '') + '<h2 id="wmFinishTitle">' + (wm.saved ? 'Logged' : 'Finish line') + '</h2>';
  // before logging, every part can be corrected: the timer may have been paused, or never started
  if (!wm.saved && wm.fin) h += '<div class="wm-fin" id="wmFin">' + wm.plan.stages.map((g, i) => { const f = wm.fin[i], unit = g.type === 'laps' ? 'Laps' : g.type === 'lengths' ? 'Lengths' : '';
    return '<div class="wm-finrow" data-fin="' + i + '"><b>' + esc(g.type === 'heat' ? ACTS[wm.st[i].room].name : g.name) + '</b><label class="f">Minutes<input type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="' + (g.type === 'heat' ? 20 : 300) + '" data-wmf="min" data-i="' + i + '" value="' + esc(f.min) + '"></label>' +
      (unit ? '<label class="f">' + unit + '<input type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="400" data-wmf="laps" data-i="' + i + '" value="' + esc(f.laps) + '"></label>' : '<span></span>') + '</div>'; }).join('') +
    '<p class="tiny muted">Fix anything the timer missed before you log it.</p></div>';
  h += '<div class="wm-sum" id="wmSummary">' + wmStageSumHTML(o) + '</div>';
  if (wm.err) h += '<p class="banner bad" id="wmErr">' + esc(wm.err) + '</p>';
  if (wm.saved) h += wmPointsHTML() + (o.heat ? '' : wmHeatAsk()) + '<button type="button" class="primary wm-log" id="wmDoneBtn" data-a="wm-done">Done</button>';
  else h += '<button type="button" class="primary wm-log" id="wmSave" data-a="wm-stagelog"' + (o.min || o.heat ? '' : ' disabled') + '>Log ' + (o.min ? o.min + ' min' : o.heat ? ACTS[o.heat.k].name.toLowerCase() : 'it') + '</button><button type="button" class="wm-btn" data-a="wm-unfinish">Back</button>';
  return h + '</div>';
}
ACT['wm-sfinish'] = () => {
  wmRun(false); wmStore(); wm.out = null; wm.counted = false;
  wm.fin = wm.plan.stages.map((g, i) => ({ min: String(g.type === 'heat' ? Math.min(20, wmMeasured(i)) : wmMeasured(i)), laps: g.type === 'laps' || g.type === 'lengths' ? String(wm.st[i].laps) : '' }));
  wm.view = 'finish'; wm.err = ''; wmDraw(); burst({ kind: 'flags', count: 40, y: 0.4 }); // the burst is Full only
};
// typing on the finish screen changes what will be logged; the button and the summary follow without a redraw
wmEl.addEventListener('input', e => {
  const el = e.target; if (!wm || !wm.fin || !el.dataset || !el.dataset.wmf || !wm.fin[el.dataset.i]) return;
  wm.fin[el.dataset.i][el.dataset.wmf] = el.value; wm.counted = true;
  const o = wmStageOutcome(), b = $('#wmSave'), sm = $('#wmSummary');
  if (b) { b.textContent = 'Log ' + (o.min ? o.min + ' min' : o.heat ? ACTS[o.heat.k].name.toLowerCase() : 'it'); b.disabled = !(o.min || o.heat); }
  if (sm) sm.innerHTML = wmStageSumHTML(o); // the whole summary: a note or a recovery row can appear or go as the fields change
});
ACT['wm-stagelog'] = async () => { // the same logging as the activity menu, or the lifting log's treadmill entry
  wm.st.forEach((s, i) => { if (s.on) { s.ms = wmStageMs(i); s.on = false; } });
  const o = wmStageOutcome(), felt = wm.plan.felt || null, now = new Date().toISOString(); if (!o.min && !o.heat) { wm.err = 'Nothing to log yet.'; wm.view = 'finish'; wmDraw(); return; }
  let ok = true;
  if (o.min && o.first.act === 'treadmill') { // the lifting log's own treadmill day
    if (state.selDate !== wm.date) state.selDate = wm.date;
    treadmillDraft(wm.date, o.min, felt); ok = await save();
  } else if (o.min) {
    const a = ACTS[o.first.act] || ACTS.other, before = scoreSnapshot();
    ok = await logActivity(wm.date, { id: uid(), a: ACTS[o.first.act] ? o.first.act : 'other', name: o.name, min: o.min, feel: null, hurt: false, note: o.note.slice(0, 200), mv: a.mv !== false, at: now }, felt);
    if (ok) celebrate(o.min + ' min logged.', { before, force: dayInfo(wm.pid, wm.date).active });
  }
  if (ok && o.heat) ok = await logActivity(wm.date, { id: uid(), a: o.heat.k, name: ACTS[o.heat.k].name, min: o.heat.min, feel: null, hurt: false, note: '', mv: false, at: now }, felt);
  if (!wm) return;
  if (!ok) { wm.err = 'Not logged. Try again.'; wm.view = 'finish'; wmDraw(); return; }
  lsSet(WM_KEY, null); wm.out = o; wm.saved = true; wm.after = scoreSnapshot(); wm.view = 'finish'; wm.err = ''; wmDraw();
};
