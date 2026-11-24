/* ---------- Train: the Today card, the date sheet, the Add sheet, the lift sheet ---------- */
// Train is one card for the selected day: the date chip and the Log it / Go live switch, the check-in while nothing is
// logged, one row for each logged thing, and one "Add" button. Everything else opens in a sheet. Nothing here changes
// what is saved or how: every sheet ends in the same save(), logActivity() or logRest() as before.

/* --- one row per logged thing --- */
const actDist = a => { const m = /^\d+ (?:laps?|lengths?) \(([\d.]+ (?:mi|yd))\)/.exec(a.note || ''); return m ? m[1] : ''; };
const draftTyped = d => !!(d && (d.tm.minutes !== '' || d.tm.title || d.notes || Object.keys(d.ex).some(k => d.ex[k].w !== '' || d.ex[k].reps.some(r => r !== '' && r != null))));
const rowHot = (date, id) => { const h = state.rowHot; return !!(h && h.date === date && h.id === id && Date.now() < h.until); };
const markRow = (date, id) => { state.rowHot = { date, id, until: Date.now() + 1200 }; }; // the row that was just saved shows a short highlight
const todayRow = (date, id, attrs, icon, name, sum) => '<button type="button" class="trow' + (rowHot(date, id) ? ' new' : '') + '" data-row="' + esc(id) + '" ' + attrs + '><span class="tr-i" aria-hidden="true">' + icon + '</span><span class="tr-t"><b>' + name + '</b><span class="tiny muted">' + sum + '</span></span><span class="tr-c" aria-hidden="true">›</span></button>';
function liftRowSum(n) {
  const sets = sum(n.keys, k => n.ex[k].reps.filter(r => r != null).length);
  return n.keys.length + ' lift' + (n.keys.length === 1 ? '' : 's') + ' · ' + sets + ' set' + (sets === 1 ? '' : 's') + ' · ' + (n.qualifies ? 'lift day' : 'not a lift day yet');
}
function todayRows(pid, date) {
  const rec = state.sessions[date], n = rec ? normalize(rec) : null, program = P(pid).plan === 'program', d = program ? state.drafts[date] : null, typed = draftTyped(d), rows = [];
  if (n && (n.program || n.kind === 'rest' || n.ambiguous)) {
    const open = program ? 'data-a="lift-open"' : n.kind === 'rest' ? 'data-a="rest-open"' : 'data-a="go-history"', more = typed ? ' · unsaved changes' : '';
    if (n.kind === 'strength') rows.push(todayRow(date, 'prog', open, '🏋️', esc(n.day ? DAYS[n.day].name : 'Lift'), liftRowSum(n) + more));
    else if (n.kind === 'cardio') rows.push(todayRow(date, 'prog', open, '🏃', 'Treadmill', n.tm.minutes + ' min' + (n.tm.title ? ' · ' + esc(n.tm.title) : '') + more));
    else if (n.kind === 'rest') rows.push(todayRow(date, 'prog', open, '🛌', 'Rest day', (n.notes ? esc(n.notes) : 'Doesn\'t count as activity') + more));
    else rows.push(todayRow(date, 'prog', open, '🏋️', esc(DAYS[rec.day] ? DAYS[rec.day].name : 'Lift'), 'No sets saved · tap to check' + more));
  } else if (typed) { // sets typed but not saved yet: one row, so they are not lost from sight
    const k = kindFor(date, d);
    rows.push(todayRow(date, 'draft', 'data-a="lift-open"', '✏️', esc(DAYS[k] ? DAYS[k].name : k === 'rest' ? 'Rest day' : 'Treadmill'), (d.recovered ? 'Recovered draft' : 'Draft') + ' · not saved yet'));
  }
  (n ? n.acts : []).forEach(a => rows.push(todayRow(date, a.id, 'data-a="' + (isHk(a) ? 'hk-info' : 'act-edit') + '" data-id="' + esc(a.id) + '"', actIcon(a), esc(actName(a)) + (a.hurt ? ' <span class="chip warn">pain noted</span>' : ''),
    a.min + ' min' + (actDist(a) ? ' · ' + actDist(a) : '') + (a.mv === false ? ' · recovery' : '') + (a.feel && FEELS[a.feel] ? ' · ' + FEELS[a.feel] : ''))));
  return rows;
}
// one line under the rows: what the day counts as
function dayLineText(pid, date) {
  const rec = state.sessions[date], n = rec ? normalize(rec) : null, di = dayInfo(pid, date), mm = weekGoals(pid, weekStart(date)).minMin;
  if (P(pid).plan === 'program') {
    const last = lastLift(date), nextK = nextDayKey(date);
    if (n && n.qualifies && n.day) return 'Counted ' + DAYS[n.day].name + ' day. Next: ' + DAYS[nextAfter(n.day)].name + '.';
    if (n && n.kind === 'strength') return 'Partial lift, not counted. ' + DAYS[nextK].name + ' is still next.';
    if (n && n.kind === 'rest') return 'Rest day. ' + DAYS[nextK].name + ' is still next.';
    if (n && (n.program || n.acts.length)) return (di.active ? 'An activity day. ' : (mm - di.minutes) + ' more min makes it an activity day. ') + DAYS[nextK].name + ' is next.';
    return last ? 'After ' + DAYS[last.n.day].name + ' on ' + nice(last.date) + ', ' + DAYS[nextK].name + ' is next.' : (splitOf() === 'full' ? 'Next lift: ' + DAYS[nextK].name + '.' : 'First lift of the program: Push.');
  }
  if (n && n.kind === 'rest') return 'Rest day logged';
  if (n && n.program) return (n.kind === 'strength' ? (n.day ? DAYS[n.day].name + ' lift' : 'Lift') : 'Treadmill') + ' · ' + n.progMin + ' min' + (n.acts.length ? ' + ' + n.actMin + ' min of activities' : '') + ' · counts as an active day';
  if (n && n.acts.length) return n.allMin + ' min logged · ' + (di.active ? 'counts as an active day' : (mm - di.minutes) + ' more min of movement to count');
  return 'A day counts at ' + mm + ' minutes of movement.';
}
function todayHTML() {
  const pid = me(), date = state.selDate, isToday = date === todayIso(), rows = todayRows(pid, date), going = wmResumable(pid, date);
  let h = '<section class="card stack today" id="today"><div class="today-head"><button type="button" class="datechip" id="dateChip" data-a="day-open" aria-haspopup="dialog" aria-label="' + (isToday ? 'Today, ' : '') + nice(date) + '. Change the day">' +
    '<b id="todayTitle">' + (isToday ? 'Today' : nice(date)) + '</b>' + (isToday ? '<span class="muted">' + nice(date) + '</span>' : '') + '<span class="dc" aria-hidden="true">▾</span></button>' + modeSwitchHTML(pid) + '</div>';
  if (going) h += '<div class="trow going" id="wmGoing"><span class="tr-i" aria-hidden="true">⏱️</span><span class="tr-t"><b>Workout in progress</b><span class="tiny muted">' + esc(going.title) + '</span></span><button type="button" class="small on" id="wmResume" data-a="wm-resume">Resume workout</button></div>';
  if (rows.length) h += '<div class="trows" id="todayRows">' + rows.join('') + '</div>';
  else if (!going) h += (isToday && ciShown(pid) ? checkinHTML() : '<p class="muted" id="todayEmpty">Nothing logged ' + (isToday ? 'yet today' : 'for ' + nice(date)) + '.</p>');
  h += '<button type="button" class="' + (rows.length || going || !(isToday && ciShown(pid)) ? 'primary' : 'second') + ' addbtn" id="addBtn" data-a="add-open">Add to ' + (isToday ? 'today' : nice(date)) + '</button>' +
    '<p class="tiny muted" id="dayLine">' + esc(dayLineText(pid, date)) + '</p>' + hkLineHTML(date) + '</section>';
  return h + coachHTML();
}

/* --- the date sheet: the last 7 days and the date picker --- */
OV.day = {
  html: () => '<div class="ov" role="dialog" aria-modal="true" aria-label="Pick a day">' + ovHead('Pick a day', 'Showing ' + rel(state.selDate).toLowerCase() + (rel(state.selDate) !== nice(state.selDate) ? ', ' + nice(state.selDate) : '')) + renderDatebar() +
    '<label class="f">Another day<input type="date" id="datePick" aria-label="Pick another day" value="' + state.selDate + '" max="' + todayIso() + '"></label>' +
    (state.selDate !== todayIso() ? '<div class="row"><button type="button" class="small" id="dayToday" data-date="' + todayIso() + '">Back to today</button></div>' : '') + '</div>',
  after: () => bind(ovRoot)
};
ACT['day-open'] = () => openOv({ type: 'day' });

/* --- the Add sheet: four choices --- */
// Cardio for the picker. A lifting profile keeps its list; a pick-your-own profile gets the gentle equivalents, safest first.
function addCardioOptions(pid) {
  if (P(pid).plan === 'program') return cardioOptions(pid);
  const keys = atHealthplex(pid) ? ['hptrack', 'hprun', 'walktread', 'hpbike', 'elliptical', 'hpswim'] : ['walktread', 'recbike', 'bike', 'elliptical', 'walkbrisk'];
  const label = { hptrack: 'Track walk', hprun: 'Track run/walk', walktread: 'Treadmill walk', hpbike: 'Bike', recbike: 'Recumbent bike', bike: 'Stationary bike', elliptical: 'Elliptical', hpswim: 'Lap swim', walkbrisk: 'Brisk walk' };
  return keys.map((k, i) => ({ k, i, safe: safeAct(pid, k) ? 0 : 1 })).sort((a, b) => (a.safe - b.safe) || (a.i - b.i)).map(x => [x.k, label[x.k]]);
}
const cardioStage = k => k === 'treadmill' ? { type: 'timer', act: 'treadmill', name: 'Treadmill (Fitness+)', min: 25 } : stageFor(k, 25);
// Recovery as a live session, without a check-in behind it.
function recoveryStages(pid) {
  const hp = atHealthplex(pid), heat = hp ? [{ type: 'heat', act: 'hpsauna', name: 'Sauna, steam or whirlpool', min: 10 }] : [];
  if (P(pid).plan !== 'program') return [{ type: 'stretch', act: 'stretchfull', name: 'Gentle stretch', min: 10, rounds: 2 }].concat(heat);
  const k = hp ? 'hptrack' : 'walkeasy';
  return [stageFor(k, 10), { type: 'stretch', act: k, name: 'Stretch', min: 5, rounds: 1 }].concat(heat);
}
const machineKey = pid => atHealthplex(pid) ? 'hpcircuit' : 'machines';
// Start a timed live session from the Add sheet. One already in progress on this day is resumed, never replaced:
// starting another would overwrite its laps and its clock.
function addLive(plan, el) {
  const r = wmResumable(me(), state.selDate);
  if (r && r.kind === 'stages') { ACT['wm-resume'](el); toast('Back in the workout already in progress. Finish or leave it first.', 3600); return; }
  wmOpen(plan, el);
}
OV.add = {
  html: o => {
    const pid = me(), date = o.date, program = P(pid).plan === 'program', live = modeOf(pid) === 'live', hp = atHealthplex(pid), isToday = date === todayIso();
    const rec = state.sessions[date], n = rec ? normalize(rec) : null, logged = !!(n && (n.program || n.kind === 'rest' || n.acts.length)) || (program && draftTyped(state.drafts[date])); // a typed draft counts: a rest day would discard it
    const big = (id, a, icon, title, sub) => '<button type="button" class="addc" id="' + id + '" data-a="' + a + '"><span class="ai" aria-hidden="true">' + icon + '</span><span class="tr-t"><b>' + title + '</b><span class="tiny muted">' + sub + '</span></span></button>';
    let h = '<div class="ov addsheet" role="dialog" aria-modal="true" aria-label="Add to ' + (isToday ? 'today' : nice(date)) + '">' + ovHead('Add to ' + (isToday ? 'today' : nice(date)), live ? 'Go live is on: Lift, Cardio and Recovery start a live session' : 'Log it is on: each one opens a short sheet');
    if (o.step === 'cardio') // Go live: which cardio, then straight into the session
      return h + '<div class="eyebrow">Cardio · start live</div><div class="results" id="addCardioList">' + addCardioOptions(pid).map(x => '<button type="button" class="fooditem" data-a="add-cardio-live" data-k="' + x[0] + '"><span class="fn">' + x[1] + '</span><span class="fk">' + (partKind(x[0]) === 'laps' ? 'tap each lap' : partKind(x[0]) === 'lengths' ? 'tap each length' : 'a timer') + '</span></button>').join('') + '</div>' +
        '<div class="row"><button type="button" class="small" data-a="add-back">Back</button></div></div>';
    const liftSub = n && n.kind === 'strength' ? 'Open the saved ' + (n.day ? DAYS[n.day].name : 'lift') : DAYS[liftKindFor(date)].name + ' next';
    h += '<div class="addgrid" id="addGrid">' +
      (program ? big('addLift', 'add-lift', '🏋️', 'Lift', esc(liftSub)) : big('addLift', 'add-lift', '🏢', 'Machine circuit', 'Logged as minutes')) +
      big('addCardio', 'add-cardio', '🚶', 'Cardio', hp ? 'Track, treadmill, bike, elliptical, lap swim' : 'Treadmill, bike, elliptical, walk') +
      big('addRecovery', 'add-recovery', '🧊', 'Recovery', hp ? 'Stretch, sauna, steam or whirlpool' : 'Stretch') +
      big('addMore', 'add-more', '➕', 'Something else', hp ? 'Walks, stretches, everyday moves, classes' : 'Walks, stretches, everyday moves') + '</div>' +
      '<div class="row addfoot">' + (logged ? '' : '<button type="button" class="quiet" id="addRest" data-a="add-rest">Log a rest day</button>') + healthButton() + '</div></div>';
    return h;
  }
};
ACT['add-open'] = () => openOv({ type: 'add', date: state.selDate });
ACT['add-back'] = () => { state.ov.step = null; renderOv(); };
ACT['cilog-back'] = () => { const o = state.ov; if (o && o.from === 'add') openOv({ type: 'add', date: o.date }); else closeOv(); }; // back to the four choices it came from
function openCilog(date, felt, title, parts, heat, from) { // the short "Log it" sheet: the same one the check-in opens
  const o = { type: 'cilog', date, felt, title, parts, heat: !!heat, room: 'hpsauna', heatMin: '', from: from || null };
  parts.forEach((p, i) => { o['k' + i] = p.k; o['min' + i] = String(p.min); o['laps' + i] = ''; });
  openOv(o);
}
ACT['add-lift'] = el => {
  const pid = me(), date = state.selDate, live = modeOf(pid) === 'live';
  if (P(pid).plan !== 'program') { // the machine circuit, logged as minutes
    const k = machineKey(pid), a = ACTS[k];
    if (live) addLive(stagePlan(a.name, null, [stageFor(k)]), el);
    else openOv({ type: 'act', k, date, min: String(a.min), feel: null, hurt: false, note: '', name: '' });
    return;
  }
  if (!live) { openLift(); return; }
  if (wmDraftOn(date)) { ACT['wm-resume'](el); return; }
  const m = model(date), kind = liftKindFor(date);
  wmOpen({ kind: 'lift', title: DAYS[kind].name, felt: m.checkin || null, day: kind, express: m.checkin === 'short' }, el);
};
ACT['add-cardio'] = () => {
  const pid = me(), opts = addCardioOptions(pid);
  if (modeOf(pid) === 'live') { state.ov.step = 'cardio'; renderOv(); return; }
  openCilog(state.selDate, null, 'Cardio', [{ opts, k: opts[0][0], min: 25 }], false, 'add');
};
ACT['add-cardio-live'] = el => { const k = el.dataset.k; if (k !== 'treadmill' && !ACTS[k]) return; addLive(stagePlan('Cardio', null, [cardioStage(k)]), el); };
ACT['add-recovery'] = el => {
  const pid = me();
  if (modeOf(pid) === 'live') { addLive(stagePlan('Recovery', null, recoveryStages(pid)), el); return; }
  openCilog(state.selDate, null, 'Recovery', STRETCH_PART, atHealthplex(pid), 'add');
};
ACT['add-rest'] = async () => {
  const pid = me(), date = state.selDate, before = scoreSnapshot();
  if (P(pid).plan === 'program' && draftTyped(state.drafts[date])) { closeOv(); toast('There are unsaved sets for this day. Save or discard them first.', 3600); return; }
  if (P(pid).plan === 'program') { const d = draft(date); d.kindSel = 'rest'; persistDrafts(); closeOv(); const ok = await save(); if (!ok) render(); return; }
  const ok = await logRest(date); if (!ok) return;
  markRow(date, 'prog'); closeOv(); render(); celebrate('Rest day logged. Recovery is part of the plan.', { before });
};

/* --- Something else: search, recent and favorites, then the whole menu --- */
const actBtnHTML = (pid, k) => {
  const a = ACTS[k], caution = actCaution(pid, k), fav = P(pid).favorites.includes(k);
  if (a.cat === 'healthplex') return hpCardHTML(pid, k); // a Healthplex card flips to show its details
  return '<button type="button" class="act' + (fav ? ' fav' : '') + '" data-a="act" data-k="' + k + '"><span class="ai" aria-hidden="true">' + a.icon + '</span><span class="an">' + esc(a.name) + '</span><span class="am">' + a.min + ' min · ' + (a.mv === false ? 'recovery' : IMPACT[a.impact]) + '</span>' + (caution.length ? '<span class="aw">Go easy: ' + caution.map(x => AREAS[x].toLowerCase()).join(', ') + '</span>' : '') + (painFlag(pid, k) ? '<span class="aw" data-pain="' + k + '">Pain noted ' + painCount(pid, k) + '× recently</span>' : '') + '</button>';
};
// Six to start from: favorites, then what was logged most recently, then the gentlest of the menu.
function quickActs(pid) {
  const ok = k => ACTS[k] && k !== 'other' && !ACTS[k].cls && (ACTS[k].cat !== 'healthplex' || atHealthplex(pid)), out = [];
  const add = k => { if (ok(k) && !out.includes(k) && out.length < 6) out.push(k); };
  P(pid).favorites.forEach(add);
  recordsOf(pid).slice().reverse().forEach(r => r.n.acts.forEach(a => { if (!isHk(a)) add(a.a); }));
  actList(pid, { cat: 'all', quick: false, fav: false }).forEach(add);
  return out;
}
function moreListHTML(o) {
  const pid = me(), q = String(o.q || '').trim().toLowerCase();
  if (q) {
    const hits = actList(pid, { cat: 'all', quick: false, fav: false }).filter(k => ACTS[k].name.toLowerCase().includes(q) || (ACT_CATS.find(c => c[0] === ACTS[k].cat) || ['', ''])[1].toLowerCase().includes(q));
    return hits.length ? '<div class="acts" id="moreHits">' + hits.map(k => actBtnHTML(pid, k)).join('') + '</div>' : '<p class="muted tiny" id="moreNone">Nothing matches "' + esc(o.q.trim()) + '". Try "Other activity" under Everyday.</p>';
  }
  if (o.all) return actGridHTML(pid);
  const cats = ACT_CATS.filter(c => c[0] !== 'healthplex' || atHealthplex(pid));
  return '<div class="eyebrow">Recent and favorites</div><div class="acts" id="moreQuick">' + quickActs(pid).map(k => actBtnHTML(pid, k)).join('') + '</div>' +
    '<div class="eyebrow">Categories</div><div class="chips wrapc" id="moreCats">' + cats.map(c => '<button type="button" data-a="filter" data-cat="' + c[0] + '">' + c[1] + '</button>').join('') + '</div>' +
    '<div class="row"><button type="button" class="small" id="moreAll" data-a="more-all">Show all</button></div>';
}
OV.more = {
  html: o => '<div class="ov tall" role="dialog" aria-modal="true" aria-label="Something else">' + ovHead('Something else', (o.date === todayIso() ? 'Today' : nice(o.date)) + ' · logged by minutes') +
    '<div class="row" style="flex-wrap:nowrap"><input type="search" id="moreQ" data-ovf="q" value="' + esc(o.q || '') + '" placeholder="Search activities" aria-label="Search activities" autocomplete="off" style="flex:1;min-width:0"><button type="button" class="small" data-a="surprise" style="flex:none">Surprise me</button></div>' +
    '<div class="stack" id="moreList">' + moreListHTML(o) + '</div></div>'
};
ACT['add-more'] = () => { state.filter = { cat: 'all', quick: false, fav: false }; state.hpFlip = null; openOv({ type: 'more', date: state.selDate, q: '', all: false }); };
ACT['more-all'] = () => { state.ov.all = true; renderOv(); };
const refreshMore = () => { const o = state.ov, el = $('#moreList'); if (o && o.type === 'more' && el) el.innerHTML = moreListHTML(o); }; // typing redraws the list only, so the keyboard stays up

/* --- a pick-your-own rest day: nothing to edit, so the row offers to remove it --- */
OV.restday = {
  html: o => '<div class="ov" role="dialog" aria-modal="true" aria-label="Rest day">' + ovHead('🛌 Rest day', rel(o.date)) + '<p class="muted">Rest days are part of the plan and cost nothing. Logging something else on this day replaces it.</p>' +
    '<div class="row"><button type="button" class="small danger" id="restRemove" data-a="rest-undo">Remove</button><button type="button" class="small" data-a="ov-close">Keep it</button></div></div>'
};
ACT['rest-open'] = () => openOv({ type: 'restday', date: state.selDate });

/* --- the lift sheet: the typed-in lift log, full height --- */
// The same draft, the same fields and the same save() as the log that used to sit on the page. Three parts: a head
// with Go live, a body that scrolls, and a foot that does not: the rest timer and the Save bar. Nothing in the foot
// can sit on top of a button, because nothing in the sheet scrolls underneath it.
function liftSheetHTML() {
  const date = state.selDate, f = liftLogHTML(date);
  return '<div class="ov tall liftsheet" role="dialog" aria-modal="true" aria-label="Lift log" id="liftSheet"><div class="ls-head"><div class="ls-t"><h2 id="liftTitle">' + esc(f.title) + '</h2><div class="tiny muted" id="liftDate">' + rel(date) + (rel(date) !== nice(date) ? ' · ' + nice(date) : '') + '</div></div>' +
    (f.isLift && date <= todayIso() ? '<button type="button" class="small" id="wmStart" data-a="wm-lift">' + (wmDraftOn(date) ? 'Resume workout' : 'Go live') + '</button>' : '') +
    '<button type="button" class="xbtn" id="liftClose" data-a="ov-close" aria-label="Close">×</button></div>' +
    '<div class="ls-body" data-scroll>' + f.html + '</div>' +
    '<div class="ls-foot">' + restBarHTML() + renderSaveBar(date, f.m, f.saved) + '</div></div>';
}
OV.lift = { html: liftSheetHTML, after: () => bind(ovRoot) };
const liftOpen = () => !!(state.ov && state.ov.type === 'lift');
function openLift(focusSel) {
  state.confirmRemove = null; state.menu = null;
  openOv({ type: 'lift', date: state.selDate });
  if (focusSel) { // the field comes into view inside the sheet's own scroll area: the page behind never moves
    const el = $(focusSel), body = el && el.closest('.ls-body'); if (!el) return;
    el.focus({ preventScroll: true });
    if (body) { const r = el.getBoundingClientRect(), b = body.getBoundingClientRect(); if (r.bottom > b.bottom - 12) body.scrollTop += r.bottom - b.bottom + 12; else if (r.top < b.top) body.scrollTop -= b.top - r.top + 12; }
  }
}
ACT['lift-open'] = () => openLift();
// The sheet is gone, by Save, by ×, by going live or by a tap outside: the rest timer goes with it and the page catches up.
function liftClosed() { restStop(); typing = false; state.menu = null; state.confirmRemove = null; render(); }
