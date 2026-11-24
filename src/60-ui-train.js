/* ---------- Train: shared pieces ---------- */
function subnav() {
  const plan = P(me()).plan, a = (tab, label) => '<a href="#' + tab + '" class="' + (state.tab === tab ? 'on' : '') + '">' + label + '</a>';
  return '<div class="subnav" role="navigation" aria-label="Train sections">' + a('train', 'Log') + a('program', plan === 'program' ? 'Program' : 'Plan') + a('history', 'History') + '</div>';
}
function dotClass(date, mode) {
  const pid = me();
  if (mode === 'fuel') { const u = fuelUnit(pid, date), t = dayTotals(pid, date); return u >= 1 ? 'cardio' : (t.count || t.water) ? 'part' : ''; }
  const rec = state.sessions[date], d = state.drafts[date]; let c = '';
  if (rec) { const n = normalize(rec), di = dayInfo(pid, date); c = n.qualifies ? 'lift' : n.kind === 'strength' ? 'part' : di.active ? 'cardio' : n.kind === 'activity' ? 'part' : ''; }
  if (d && draftHasContent(d)) c += ' draft';
  return c;
}
function renderDatebar(mode) {
  const t = todayIso(); let out = '<div class="datebar" aria-label="Last 7 days"' + (mode ? ' data-mode="' + mode + '"' : '') + '>';
  for (let i = 6; i >= 0; i--) {
    const d = addDays(t, -i);
    out += '<button type="button" data-date="' + d + '" class="' + (d === state.selDate ? 'sel' : '') + '" aria-label="' + nice(d) + '" aria-pressed="' + (d === state.selDate) + '"><span>' + DOW[dow(d)] + '</span><b>' + Number(d.slice(8)) + '</b><span class="dot ' + dotClass(d, mode) + '"></span></button>';
  }
  return out + '</div>';
}
function dateHead(label, mode) {
  const date = state.selDate;
  return '<div class="head"><div><div class="eyebrow">' + label + '</div><h2>' + rel(date) + (rel(date) !== nice(date) ? ' <span class="muted" style="font-size:.9375rem;letter-spacing:0;text-transform:none;font-family:var(--body);font-weight:500">' + nice(date) + '</span>' : '') + '</h2></div>' +
    '<input type="date" id="datePick" aria-label="Pick another day" value="' + date + '" max="' + todayIso() + '"></div>' + renderDatebar(mode);
}
const hkLineHTML = date => { const t = healthLine(me(), date); return t ? '<p class="tiny muted" id="hkLine" style="margin-top:-4px">' + esc(t) + '</p>' : ''; };
function statusText(date) {
  if (!state.ready) return state.storage === 'nodb' ? 'Log unreachable · inputs kept on this phone' : 'Loading your log…';
  const all = state.sessions[date], rec = lifted(all) ? all : null; const d = state.drafts[date]; const st = state.status[date];
  if (st && st.s === 'saving') return 'Saving…';
  if (st && st.s === 'failed') return 'Save failed · inputs kept';
  const hasDraft = d && draftHasContent(d);
  if (rec && st && st.s === 'synced') return 'Saved · synced' + (hasDraft ? ' · unsaved changes' : '');
  if (rec && st && st.s === 'local') return 'Saved in this browser' + (hasDraft ? ' · unsaved changes' : '');
  if (rec) return 'Saved' + (hasDraft ? ' · unsaved changes' : '');
  if (hasDraft) return (d.recovered ? 'Recovered draft' : 'Draft') + ' · on this phone';
  return all && normalize(all).acts.length ? 'Activities logged · no lift or treadmill yet' : 'New entry';
}

/* ---------- Train: lifting program ---------- */
function renderTrain() { return todayHTML(); }
// The typed-in lift log: kind buttons, warm-up, exercises, notes, session options. It is drawn in the lift sheet
// (OV.lift), never on the page. Returns the body and what the sheet needs for its head and its Save bar.
function liftLogHTML(date) {
  const rec = state.sessions[date]; const n = rec ? normalize(rec) : null;
  const m = model(date); const d = state.drafts[date];
  const kind = kindFor(date, m); const isLift = !!DAYS[kind];
  const phase = phaseOf(date);
  const last = lastLift(date); const nextK = nextDayKey(date);
  let why = last ? 'After ' + DAYS[last.n.day].name + ' on ' + nice(last.date) + ', ' + DAYS[nextK].name + ' is next.' : (splitOf() === 'full' ? 'Next lift: ' + DAYS[nextK].name + '.' : 'First lift of the program: Push.');
  if (n && n.qualifies && n.day) why = 'Counted ' + DAYS[n.day].name + ' day. Next: ' + DAYS[nextAfter(n.day)].name + '.';
  else if (n && n.kind === 'strength') why = 'Partial lift, not counted. ' + DAYS[nextK].name + ' is still next.';
  else if (isLift && kind !== nextK) why += ' You picked ' + DAYS[kind].name + '.';

  const rot = rotation(), segDays = !DAYS[kind] || rot.includes(kind) ? rot : rot.concat([kind]), full = !!(DAYS[kind] ? DAYS[kind].full : splitOf() === 'full'); // an old day from the other split keeps its own button
  let h = '<div class="sess"><div class="seg" id="kindSeg" aria-label="Workout type">' + segDays.map(k => '<button type="button" data-kind="' + k + '" class="' + (kind === k ? 'on' : '') + '" aria-pressed="' + (kind === k) + '">' + DAYS[k].name + '</button>').join('') +
    '<button type="button" data-kind="cardio" class="' + (kind === 'cardio' ? 'on' : '') + '" aria-pressed="' + (kind === 'cardio') + '">Treadmill</button><button type="button" data-kind="rest" class="' + (kind === 'rest' ? 'on' : '') + '" aria-pressed="' + (kind === 'rest') + '">Rest</button></div>' +
    '<div class="status"><span id="statusLine">' + esc(statusText(date)) + '</span>' + (full ? '' : '<span>·</span><span>Phase ' + phase + '</span>') + '</div>' +
    '<p class="tiny muted" id="whyLine" style="margin-top:-4px">' + esc(why) + '</p>';
  if (d && d.recovered && draftHasContent(d)) h += '<div class="banner"><span>Unsaved draft from ' + tzTime.format(new Date(d.updatedAt)) + ' restored. Not saved until you tap Save.</span><div class="row"><button type="button" class="small" id="discardDraft">Discard draft</button></div></div>';
  if (n && n.ambiguous) h += '<div class="banner">Saved as a ' + (DAYS[rec.day] ? DAYS[rec.day].name : 'lift') + ' day by the earlier version but has no lifting sets. It counts as ' + (n.kind === 'cardio' ? 'treadmill only' : 'no activity') + '. Add sets or re-save to confirm.</div>';
  h += '</div>';
  const saved = lifted(rec) ? rec : null; // the save bar speaks for the lift, treadmill or rest part of the day only
  const title = isLift ? DAYS[kind].name : kind === 'rest' ? 'Rest day' : 'Treadmill';

  if (kind === 'rest') {
    h += '<section class="sheet"><div class="blk"><div class="bhead"><h3>Rest day</h3></div><p class="tiny muted">Doesn\'t count as activity and doesn\'t move the rotation.</p>' +
      '<label class="f">Notes<input type="text" id="notes" data-field="notes" value="' + esc(m.notes) + '" placeholder="Optional"></label></div></section>';
    return { html: h, title, isLift, m, saved };
  }

  h += '<form id="logForm" autocomplete="off" class="sheet"><div class="blk"><div class="bhead"><h3>' + (full && isLift ? 'Warm-up (track, treadmill or bike)' : 'Treadmill · Apple Fitness+') + '</h3><span class="tiny muted">target ' + (full && isLift ? '5–10' : TREAD_MIN[phase]) + ' min</span></div>' +
    '<div class="logrow" style="grid-template-columns:minmax(80px,1fr) 2fr"><label class="f">Minutes<input type="number" id="tmMin" data-field="tmMin" min="0" step="1" inputmode="numeric" pattern="[0-9]*" value="' + esc(m.tm.minutes) + '" placeholder="–"></label>' +
    '<label class="f">Workout (optional)<input type="text" id="tmTitle" data-field="tmTitle" value="' + esc(m.tm.title) + '" placeholder="Fitness+ workout name"></label></div></div>';

  if (isLift) {
    const day = DAYS[kind]; const planned = plannedFor(date, kind, m);
    h += '<div class="blk" style="gap:2px"><div class="bhead"><h3>' + day.name + ' day</h3><span class="tiny muted">' + day.sub + '</span></div></div>';
    planned.forEach(p => { h += renderExercise(p, m, date); });
    // an express session shows its three lifts; the rest of the day waits under "More lifts", and a set typed there is saved like any other
    const more = m.checkin === 'short' ? plannedFor(date, kind, m, true).filter(p => !planned.some(q => q.base === p.base)) : [];
    if (more.length) h += '<details class="blk plain morelifts" id="moreLifts" data-dk="morelifts"><summary>More lifts (' + more.length + ')</summary>' + more.map(p => renderExercise(p, m, date)).join('') + '</details>';
  }
  h += '<div class="blk"><label class="f">Notes<input type="text" id="notes" data-field="notes" value="' + esc(m.notes) + '" placeholder="Optional"></label></div>';
  if (isLift) {
    const r = parseDraft(date, m);
    const checked = m.countAs == null ? (r.kind === 'strength' ? r.auto : false) : !!m.countAs;
    h += '<details class="plain sessopts" data-dk="sessopts"' + (m.countAs != null ? ' open' : '') + '><summary>Session options</summary>' +
      '<label class="row" style="gap:8px;flex-wrap:nowrap;align-items:flex-start;margin-top:8px;font-size:.875rem"><input type="checkbox" id="countAs" style="width:22px;height:22px;flex:none;margin:0"' + (checked ? ' checked' : '') + '><span>Count as ' + DAYS[kind].name + ' lift day' + (m.countAs == null ? ' <span class="muted">(automatic: on once ' + QUALIFY_MIN + ' lifts have a logged set)</span>' : ' <span class="muted">(set by you)</span>') + '</span></label>' +
      '<p class="tiny muted" style="margin-top:6px">A counted lift day advances the rotation and earns lift credit. Full rules on the Program tab.</p></details>';
  }
  h += '</form>';
  return { html: h, title, isLift, m, saved };
}
/* ---------- Progression after Phase 3: deload weeks, stalled lifts, the goal nudge ---------- */
// What sits above the lifting log: the deload offer (or the reminder that one is on), a swap whose four weeks are up,
// and the goal nudge. Each is a choice saved to settings or the profile by its button, never by drawing it.
// Coach: the deload offer, a swap that is due for review and the goal nudge, one line each in one card under the
// check-in. A tap opens a line. Each is a choice saved by its own button, never by drawing it.
const coachRow = (attrs, line, body) => '<details class="plain coachrow" ' + attrs + '><summary><span class="eyebrow">Coach</span> ' + line + '</summary><div class="coachbody">' + body + '</div></details>';
function coachHTML() {
  const pid = me(), rows = [], t = todayIso();
  if (P(pid).plan === 'program') {
    const st = deloadState(), sb = state.settings.swapBack || {}, sw = state.settings.swaps || {};
    if (st === 'on') rows.push(coachRow('id="deloadBanner" data-dk="coach-deload"', 'Deload week is on · 2 sets at about 90%', '<span><b>Deload week is on.</b> 2 sets per lift at about 90% weight. Recovery week, same points.</span><div class="row"><button type="button" class="small" data-a="deload-off">End the deload early</button></div>'));
    else if (st === 'offer') rows.push(coachRow('id="deloadBanner" data-dk="coach-deload"', 'Deload week on offer · a lighter week', '<span><b>Deload week:</b> 2 sets per lift at about 90% weight. Recovery week, same points.</span><span class="tiny muted">You have finished ' + deloadWeeks(t) + ' full lift weeks. A lighter week now lets the next five go heavier. Lift days still count as lift days.</span><div class="row"><button type="button" class="small" data-a="deload-take">Take it</button><button type="button" class="small" data-a="deload-skip">Skip</button></div>'));
    Object.keys(sb).forEach(base => { const x = sb[base]; if (!x || !EX[base] || !EX[x.to] || !EX[x.from] || !validIso(x.until) || t < x.until || (sw[base] || base) !== x.to) return;
      rows.push(coachRow('data-swapback="' + base + '" data-dk="coach-swap-' + base + '"', 'Four weeks on ' + esc(EX[x.to].name) + ' · switch back?', '<span><b>Four weeks on ' + esc(EX[x.to].name) + '.</b> Switch back to ' + esc(EX[x.from].name) + '?</span><div class="row"><button type="button" class="small" data-a="swapback-yes" data-base="' + base + '">Switch back</button><button type="button" class="small" data-a="swapback-no" data-base="' + base + '">Keep ' + esc(EX[x.to].name) + '</button></div>')); });
  }
  const n = goalNudge(pid);
  if (n) rows.push(coachRow('id="nudgeCard" data-dk="coach-nudge-' + pid + '"', n.kind === 'lift' ? 'Three weeks with 3 lifts · raise your lift goal?' : 'Three full weeks in a row · raise your goal?',
    '<p>' + (n.kind === 'lift' ? '<b>Three weeks with 3 lifts.</b> Raise your lift goal to 3 lift days starting Monday?' : '<b>Three full weeks in a row.</b> Raise your goal to ' + n.to + ' days starting Monday?') + '</p><div class="row"><button type="button" class="small" data-a="nudge-yes">Raise it</button><button type="button" class="quiet" data-a="nudge-no">Not now</button></div>' +
    '<p class="tiny muted">This week stays at ' + n.from + '. A raised goal locks in next Monday, like any goal change.</p>'));
  return rows.length ? '<section class="card coach" id="coach" aria-label="Coach">' + rows.join('') + '</section>' : '';
}
// where a stalled slot can go for four weeks: another alternate that is free in every phase, else back to its planned exercise
const stallSwapTarget = p => { const taken = defaultSwapTaken(p.base); return alts(p.base).concat(p.key !== p.base ? [p.base] : []).find(k => k !== p.key && (k === p.base || !taken[k])) || null; };
// A stalled lift is one line under the exercise name, so several at once do not push the workout down the screen.
// "Fix" opens the choices and their explanation in place.
function stallHTML(p, date) {
  const key = p.key, st = stallFor(key, date); if (!st) return '';
  const unit = ' lb' + (EX[key].per ? ' each' : ''), to = stallSwapTarget(p), open = !!state.stallOpen[key];
  const line = '<div class="stallline" data-stall-line="' + key + '"><span>Stuck at ' + st.w + unit + ' · 3 sessions · </span><button type="button" class="quiet" data-a="stall-open" data-key="' + key + '" aria-expanded="' + open + '">' + (open ? 'Close' : 'Fix') + '</button></div>';
  if (!open) return line;
  return line + '<div class="stall" data-stall="' + key + '"><div class="row between" style="flex-wrap:nowrap"><b>Stuck at ' + st.w + unit + ' for 3 sessions</b><button type="button" class="quiet" data-a="stall-x" data-key="' + key + '">Dismiss</button></div>' +
    '<div class="row"><button type="button" class="small" data-a="stall-reset" data-key="' + key + '">Reset: drop 10% and build back</button>' + (to ? '<button type="button" class="small" data-a="stall-swap" data-key="' + key + '" data-base="' + p.base + '">Swap for 4 weeks</button>' : '') + '</div>' +
    '<span class="tiny muted">Reset makes the next suggestion ' + st.to + unit + '.' + (to ? ' Swap uses ' + esc(EX[to].name) + ' for 4 weeks, then asks about switching back.' : ' Its alternates are already in that day\'s workout, so there is nothing to swap to.') + '</span></div>';
}
ACT['stall-open'] = el => { const k = el.dataset.key; state.stallOpen[k] = !state.stallOpen[k]; render('[data-a="stall-open"][data-key="' + k + '"]'); };
ACT['deload-take'] = () => { const t = todayIso(), cw = deloadWeeks(t); return saveSettings({ deload: { ws: weekStart(t), cw }, deloadAsked: cw }); };
ACT['deload-skip'] = () => saveSettings({ deloadAsked: deloadWeeks(todayIso()) });
ACT['deload-off'] = () => saveSettings({ deload: null });
ACT['stall-x'] = el => { const key = el.dataset.key, st = stallFor(key, state.selDate); if (!st) return; return saveSettings({ stallSeen: Object.assign({}, state.settings.stallSeen, { [key]: st.last }) }); };
ACT['stall-reset'] = async el => {
  const key = el.dataset.key, st = stallFor(key, state.selDate); if (!st) return;
  await saveSettings({ resets: Object.assign({}, state.settings.resets, { [key]: { w: st.to, from: st.w, at: state.selDate } }) });
  toast('Reset: ' + EX[key].name + ' is suggested at ' + st.to + ' lb next. Build back from there.', 3600);
};
ACT['stall-swap'] = async el => {
  const key = el.dataset.key, base = el.dataset.base, date = state.selDate, m = model(date), st = stallFor(key, date);
  const p = plannedFor(date, kindFor(date, m), m).find(x => x.base === base && x.key === key), to = p && stallSwapTarget(p); if (!st || !to) return;
  const sw = Object.assign({}, state.settings.swaps); if (to === base) delete sw[base]; else sw[base] = to;
  const back = Object.assign({}, state.settings.swapBack); back[base] = { from: key, to, since: todayIso(), until: addDays(todayIso(), 28) };
  const d = state.drafts[date]; if (d && d.swaps[base] != null) { delete d.swaps[base]; persistDrafts(); } // this workout follows the new default too
  await saveSettings({ swaps: sw, swapBack: back, stallSeen: Object.assign({}, state.settings.stallSeen, { [key]: st.last }) });
  toast(EX[to].name + ' replaces ' + EX[key].name + ' for 4 weeks. You will be asked about switching back on ' + nice(back[base].until) + '.', 4200);
};
ACT['swapback-yes'] = el => {
  const base = el.dataset.base, x = (state.settings.swapBack || {})[base]; if (!x) return;
  const sw = Object.assign({}, state.settings.swaps), back = Object.assign({}, state.settings.swapBack);
  if (x.from === base) delete sw[base]; else sw[base] = x.from; delete back[base];
  return saveSettings({ swaps: sw, swapBack: back });
};
ACT['swapback-no'] = el => { const back = Object.assign({}, state.settings.swapBack); delete back[el.dataset.base]; return saveSettings({ swapBack: back }); };
ACT['nudge-yes'] = async () => {
  const pid = me(), n = goalNudge(pid); if (!n) return;
  if (n.kind === 'lift') { await saveSettings({ liftGoal: 3 }); settle(); render(); toast('Lift goal raised to 3 lift days. ' + startsNote() + '; this week stays at 2.', 4200); return; }
  if (n.plan === 'program') await saveSettings({ goal: n.to }); else if (!(await saveProfile(pid, { move: { goalDays: n.to } }))) return;
  settle(); render(); toast('Goal raised to ' + n.to + ' days. ' + startsNote() + '; this week stays at ' + n.from + '.', 4200);
};
ACT['nudge-no'] = async () => { if (await saveProfile(me(), { goalNudge: { until: addDays(todayIso(), 21) } })) { render(); toast('Okay. It will ask again in 3 weeks.'); } };
function exSummary(key, e, nSets) {
  const ex = EX[key];
  const loggedN = e.reps.filter(r => r !== '' && r != null).length;
  const line = loggedN ? (ex.bw ? '' : (e.w !== '' ? e.w + ' lb' + (ex.per ? ' each' : '') + ' × ' : '? × ')) + e.reps.slice(0, nSets).map(r => r === '' || r == null ? '–' : r).join(' / ') : '';
  return { loggedN, line, done: loggedN >= nSets && (ex.bw || e.w !== '') };
}
function renderExercise(p, m, date) {
  const key = p.key; const ex = specFor(key, date); const sg = suggest(key, date); // on a full-body day: the slot's own sets and rep range
  const e = m.ex[key] || { w: '', reps: [] }; const maxed = !!(state.settings.maxed || {})[key];
  const nSets = setCount(key, m, date); const sm = exSummary(key, e, nSets);
  const closed = !!m.closed[key]; const menu = state.menu && state.menu.key === key ? state.menu : null;
  let h = '<section class="blk ex" data-ex="' + key + '" aria-label="' + esc(ex.name) + '">';
  h += '<div class="bhead"><h3>' + esc(ex.name) + (key !== p.base ? ' <span class="chip">swapped</span>' : '') + (ex.optional ? ' <span class="chip" data-optional="' + key + '">if there\'s time</span>' : '') + '</h3>' +
    '<button type="button" class="menubtn" data-menu="' + key + '" aria-label="Options for ' + esc(ex.name) + '" aria-haspopup="menu" aria-expanded="' + (menu ? 'true' : 'false') + '">···</button>' + renderMenu(key, p, m, date, menu) + '</div>';
  h += stallHTML(p, date);
  if (closed) {
    h += '<div class="collapsed-sum"><span data-sum="' + key + '">' + (sm.line ? '<b>' + esc(sm.line) + '</b> · ' + sm.loggedN + '/' + nSets + ' logged' : 'Nothing logged') + '</span><button type="button" class="quiet" data-expand="' + key + '">Expand</button></div></section>';
    return h;
  }
  const rx = (sg.deload ? 2 : ex.sets) + ' sets · ' + ex.lo + '–' + ex.hi + ' reps' + (ex.bw ? ' · bodyweight' : ex.per ? ' · lb per hand' : '') + (sg.deload ? ' · deload' : sg.reset ? ' · reset' : '');
  const useHidden = ex.bw || String(e.w) === String(sg.w);
  h += '<div class="exrx"><span>' + esc(rx) + '</span>' + (ex.bw ? '' : '<button type="button" class="small" data-usew="' + key + '" data-val="' + sg.w + '"' + (useHidden ? ' hidden' : '') + '>Use ' + sg.w + ' lb</button>') + '</div>';
  const qf = quickFills(key, e, nSets, sg);
  if (sg.last) h += '<div class="exlast" data-last="' + key + '"><span>Last · ' + nice(sg.last.date) + ': <b>' + esc((sg.last.w != null ? fmtW(key, sg.last.w) + ' × ' : '') + fmtReps(sg.last.reps)) + '</b></span><button type="button" class="small" data-same="' + key + '"' + (qf.same ? '' : ' hidden') + '>Same as last time</button></div>';
  if (maxed) h += '<div class="exhold" data-hold="' + key + '">Holding weight · progress by reps, then a 4th set</div>';
  h += '<div class="logrow">';
  if (!ex.bw) h += '<label class="f w">Weight (lb)<input type="number" inputmode="decimal" min="0" step="2.5" id="w-' + key + '" data-field="w" data-ex="' + key + '" value="' + esc(e.w) + '" placeholder="–"></label>';
  for (let i = 0; i < nSets; i++) h += '<label class="f">Set ' + (i + 1) + '<input type="number" inputmode="numeric" pattern="[0-9]*" min="0" step="1" id="r-' + key + '-' + i + '" data-field="rep" data-ex="' + key + '" data-i="' + i + '" value="' + esc(e.reps[i] == null ? '' : e.reps[i]) + '" placeholder="–"></label>';
  h += '</div>';
  h += '<div class="exprog" data-prog="' + key + '"' + (sm.loggedN ? '' : ' hidden') + '>' + exProgHTML(key, sm, nSets, qf) + '</div>';
  if (state.details[key]) {
    h += '<div class="exdetails" id="details-' + key + '"><div><b>Equipment:</b> ' + esc(ex.equip) + (ex.per ? '. Weight is one dumbbell, not the pair.' : '') + '</div>';
    if (ex.note) h += '<div>' + esc(ex.note) + '</div>';
    h += '<div><b>Suggestion:</b> ' + esc(sg.text) + '. ' + esc(sg.why) + '</div>';
    if (maxed) h += '<div><b>Holding weight:</b> suggestions keep ' + (sg.last ? sg.last.w + ' lb' : 'the weight') + ' and ask for one more rep per set, then a 4th set. Turn it off from the menu.</div>';
    h += '<div>Each exercise and each substitute keeps its own history; a swap never carries a weight across. Weight rule on the Program tab.</div></div>';
  }
  h += '</section>';
  return h;
}
// the line under the set fields: how many are logged, the "repeat" shortcut while later sets are empty, then Collapse
const exProgHTML = (key, sm, nSets, qf) => '<span><b>' + sm.loggedN + '/' + nSets + '</b> sets logged</span>' + (qf.repeat ? '<button type="button" class="small" data-repeat="' + key + '">Repeat for all sets</button>' : '') + (sm.done ? '<button type="button" class="quiet" data-collapse="' + key + '">Collapse</button>' : '');
// Which one-tap fills are worth showing: "Same as last time" when last session has something an empty field could
// take, "Repeat for all sets" once set 1 has reps and a later set is still empty.
function quickFills(key, e, nSets, sg) {
  const ex = EX[key], last = sg.last, reps = e.reps || [], blank = i => reps[i] == null || reps[i] === '';
  let same = false;
  if (last) { for (let i = 0; i < nSets; i++) if (blank(i) && last.reps[i] != null) same = true; if (!ex.bw && e.w === '' && sg.w != null) same = true; }
  let repeat = false;
  if (!blank(0)) for (let i = 1; i < nSets; i++) if (blank(i)) repeat = true;
  return { same, repeat };
}
function renderMenu(key, p, m, date, menu) {
  if (!menu) return '';
  const ex = EX[key]; const maxed = !!(state.settings.maxed || {})[key]; const nSets = setCount(key, m, date);
  const opts = swapOptions(plannedFor(date, kindFor(date, m), m), p);
  let h = '<div class="menu" role="menu" aria-label="Options for ' + esc(ex.name) + '" data-menufor="' + key + '">';
  if (menu.view === 'swap') {
    h += '<div class="mh">Swap exercise</div>';
    opts.forEach(k => { h += '<button type="button" role="menuitem" data-act="swapto" data-key="' + key + '" data-base="' + p.base + '" data-to="' + k + '">' + esc(EX[k].name) + (k === p.base ? '<span class="sub">back to the planned exercise</span>' : '<span class="sub">' + esc(EX[k].equip) + (EX[k].per ? ' · lb per hand' : '') + '</span>') + '</button>'; });
    h += '<button type="button" role="menuitem" data-act="back" data-key="' + key + '">Cancel</button>';
  } else {
    h += '<button type="button" role="menuitem" data-act="swap" data-key="' + key + '"' + (opts.length ? '' : ' disabled') + '>Swap exercise<span class="sub">' + (opts.length ? 'this workout only' : alts(p.base).length ? 'unavailable: its alternates are already in today\'s workout' : 'no alternate for this one') + '</span></button>';
    if (!ex.bw) h += '<button type="button" role="menuitem" data-act="hold" data-key="' + key + '">' + (maxed ? 'Allow weight increases' : 'Can\'t go higher') + '<span class="sub">' + (maxed ? 'resume weight suggestions' : 'hold weight, progress by reps') + '</span></button>';
    const stand = key === p.base ? defaultSwapOption(p.base) : null; // "Not at my gym": the free stand-in becomes the default for every future workout
    h += '<button type="button" role="menuitem" data-act="notgym" data-key="' + key + '" data-base="' + p.base + '"' + (stand ? '' : ' disabled') + '>Not at my gym<span class="sub">' + (stand ? 'use ' + esc(EX[stand].name) + ' in every future workout' : key !== p.base ? 'already swapped' : 'no stand-in for this one') + '</span></button>';
    h += '<button type="button" role="menuitem" data-act="addset" data-key="' + key + '"' + (nSets >= MAX_SETS ? ' disabled' : '') + '>Add a set<span class="sub">' + (nSets >= MAX_SETS ? 'at the maximum of ' + MAX_SETS : nSets + ' of ' + MAX_SETS + ' shown') + '</span></button>';
    h += '<button type="button" role="menuitem" data-act="details" data-key="' + key + '">' + (state.details[key] ? 'Hide exercise details' : 'Exercise details') + '<span class="sub">equipment, why this weight</span></button>';
    h += '<button type="button" role="menuitem" data-act="' + (m.closed[key] ? 'expand' : 'collapse') + '" data-key="' + key + '">' + (m.closed[key] ? 'Expand' : 'Collapse') + '</button>';
  }
  return h + '</div>';
}
function saveNote(date, m) {
  const r = parseDraft(date, m);
  const err = state.formError[date];
  if (err) return { cls: 'bad', text: err };
  const st = state.status[date];
  if (st && st.s === 'failed') return { cls: 'bad', text: 'Save failed (' + st.msg + '). Your inputs are kept; tap Retry.' };
  if (r.kind === 'none' || r.kind === 'rest') return null;
  const nextK = nextDayKey(date);
  if (r.kind === 'cardio') return r.fromLift ? { cls: '', text: 'Treadmill only · no lifting sets · ' + DAYS[nextK].name + ' stays next' } : null;
  const lk = r.doc.day; const n = Object.keys(r.doc.ex).length, tot = r.doc.planned.length;
  const by = m.countAs != null ? ' · set by you' : '';
  if (r.doc.qualifies) return r.doc.complete && m.countAs == null ? null : { cls: '', text: DAYS[lk].name + ' · ' + n + ' of ' + tot + ' exercises · counts as lift day' + by };
  return { cls: 'warn', text: 'Partial ' + DAYS[lk].name + ' · ' + r.mainLogged + ' lift' + (r.mainLogged === 1 ? '' : 's') + ' logged · not a lift day' + by + ' · ' + DAYS[nextK].name + ' stays next' };
}
function renderSaveBar(date, m, rec) {
  const st = state.status[date]; const r = parseDraft(date, m); const note = saveNote(date, m);
  const disabled = !state.ready || (r.kind === 'none' && r.empty && !(st && st.s === 'failed')) || (st && st.s === 'saving');
  let h = '<div class="savebar" id="savebar">';
  if (note) h += '<p class="note ' + note.cls + '" id="savenote">' + esc(note.text) + '</p>';
  h += '<div class="bar"><span class="st" id="saveStatus">' + esc(statusText(date)) + '</span>' +
    '<button type="button" class="primary" id="saveBtn"' + (disabled ? ' disabled' : '') + '>' + (st && st.s === 'saving' ? 'Saving…' : st && st.s === 'failed' ? 'Retry · ' + rel(date) : rec ? 'Update ' + rel(date) : 'Save ' + rel(date)) + '</button>';
  if (rec) h += '<button type="button" class="small ' + (state.confirmRemove === date ? 'danger' : '') + '" id="delBtn" aria-label="Remove this entry">' + (state.confirmRemove === date ? 'Tap again: remove ' + nice(date) : 'Remove') + '</button>';
  h += '</div></div>';
  return h;
}
function renderMorning(phase, kind) {
  if (atHealthplex(me())) return hpMorningHTML(kind); // the Healthplex has its own hours and its own plan
  return '<details class="card plain" data-dk="morning"><summary>Morning plan · at IMS by 9</summary><div class="sched" style="margin-top:8px">' +
    '<span class="t num">10:30</span><span>Lights out. Bag packed, Fitness+ workout picked.</span>' +
    '<span class="t num">6:00</span><span>Up. Water, small bite, drive to ' + esc(P(me()).place || 'the gym') + '.</span>' +
    '<span class="t num">6:30</span><span>Treadmill ' + TREAD_MIN[phase] + ' min, then ' + (DAYS[kind] ? DAYS[kind].name + ' day' : 'lift') + ' (about 30 min).</span>' +
    '<span class="t num">7:35</span><span>Shower. Out the door by 8:25.</span></div>' +
    '<p class="tiny muted" style="margin-top:8px">Missed a morning? Nothing shifts. The next lift is still the next one in the rotation.</p></details>';
}

/* ---------- Train: pick-your-own ---------- */
function actGridHTML(pid) { // the whole activity menu: filters and the grid, in the "Something else" sheet
  const f = state.filter, list = actList(pid, f);
  const chip = (on, a, extra, label) => '<button type="button" data-a="' + a + '" ' + extra + ' class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '">' + label + '</button>';
  return '<div class="chips" aria-label="Filter activities">' + chip(f.cat === 'all', 'filter', 'data-cat="all"', 'All') + ACT_CATS.filter(c => c[0] !== 'healthplex' || atHealthplex(pid)).map(c => chip(f.cat === c[0], 'filter', 'data-cat="' + c[0] + '"', c[1])).join('') + '</div>' +
    '<div class="chips">' + chip(f.quick, 'filter-quick', '', '10 min or less') + chip(f.fav, 'filter-fav', '', 'Favorites') + '</div>' +
    '<div class="acts">' + list.map(k => actBtnHTML(pid, k)).join('') + '</div>' + (list.length ? '' : '<p class="muted tiny">Nothing matches those filters.</p>');
}
function renderMove() { return todayHTML(); }
// when the points race is out of reach this week, the team week is the thing still worth chasing
const teamPointer = c => c.team.locked === 2 ? 'The team week is locked in: you both filled your Move score.' : !c.team.can ? 'The team week is out of reach this week as well.' : 'The team week is still on: ' + (c.team.mine ? 'your Move score is full' : c.team.need + ' fills your Move score') + (c.team.theirs ? '.' : c.team.mine ? ', and it needs theirs too.' : '.');
ACT['go-history'] = () => { location.hash = 'history'; };
const redrawPicker = () => { if (state.ov && state.ov.type === 'more') renderOv(); else render(); };
const lapLine = laps => { const n = Math.round(Number(laps)); return n > 0 ? n + ' lap' + (n === 1 ? '' : 's') + ' = ' + milesText(n) : 'Each lap is 1/8 mile.'; };
OV.act = {
  html: o => {
    const a = ACTS[o.k], pid = me(), caution = actCaution(pid, o.k), fav = P(pid).favorites.includes(o.k), min = Number(o.min) || 0;
    let h = '<div class="ov" role="dialog" aria-modal="true" aria-label="Log ' + esc(a.name) + '">' + ovHead(a.icon + ' ' + esc(a.name), rel(o.date) + ' · ' + (a.mv === false ? 'recovery, does not count toward active minutes' : IMPACT[a.impact])) +
      '<p class="muted">' + esc(a.desc) + '</p>' + (classTag(a) ? '<p class="banner" id="clsTag">' + classTag(a) + '</p>' : '') + (a.heat ? '<p class="banner" id="heatNote">' + HEAT_NOTE + '</p>' : '');
    if (a.wm === 'laps') h += '<label class="f">Laps (8 = 1 mile)<input type="number" id="actLaps" data-ovf="laps" inputmode="numeric" pattern="[0-9]*" min="0" max="400" value="' + esc(o.laps || '') + '" placeholder="–"></label><p class="tiny muted num" id="lapMiles">' + lapLine(o.laps) + '</p>';
    if (painFlag(pid, o.k)) h += '<div class="banner">You noted pain on this ' + painCount(pid, o.k) + ' times in the last ' + PAIN_DAYS + ' days. Rest it, shorten it or pick something else, and talk to your doctor or physical therapist if it keeps happening.</div>';
    if (caution.length) h += '<div class="banner">Loads an area you are protecting: ' + caution.map(x => AREAS[x].toLowerCase()).join(', ') + '. Keep it short and easy, or pick something else.</div>';
    if (o.k === 'other') h += '<label class="f">What did you do?<input type="text" data-ovf="name" value="' + esc(o.name || '') + '" placeholder="Name the activity" maxlength="40"></label>';
    h += '<div><div class="eyebrow">Minutes</div><div class="stepper" style="margin-top:4px"><button type="button" data-a="act-min" data-d="-5" aria-label="5 fewer minutes">−</button><input type="number" id="actMin" data-ovf="min" inputmode="numeric" pattern="[0-9]*" min="1" max="' + (a.max || 300) + '" value="' + esc(o.min) + '" aria-label="Minutes"><button type="button" data-a="act-min" data-d="5" aria-label="5 more minutes">+</button></div></div>' +
      '<div><div class="eyebrow">How did it feel?</div><div class="seg" style="margin-top:4px">' + Object.keys(FEELS).map(k => '<button type="button" data-a="act-feel" data-v="' + k + '" class="' + (o.feel === k ? 'on' : '') + '" aria-pressed="' + (o.feel === k) + '">' + FEELS[k] + '</button>').join('') + '</div></div>' +
      '<div class="row"><button type="button" class="small ' + (o.hurt ? 'on' : '') + '" data-a="act-hurt" aria-pressed="' + !!o.hurt + '">Something hurt</button><button type="button" class="small ' + (fav ? 'on' : '') + '" data-a="act-fav" aria-pressed="' + fav + '">' + (fav ? '★ Favorite' : '☆ Favorite') + '</button></div>';
    if (o.hurt) h += '<div class="banner">Stop if the pain is sharp or new. Rest today. If it lingers, tell your doctor or physical therapist before doing this one again.</div>';
    h += '<label class="f">Note<input type="text" data-ovf="note" value="' + esc(o.note || '') + '" placeholder="Optional" maxlength="120"></label>' +
      '<div class="row"><button type="button" class="primary" id="actLog" data-a="act-log"' + (min > 0 ? '' : ' disabled') + '>' + (o.id ? 'Update' : 'Log') + ' ' + (min > 0 ? min + ' min' : '') + '</button>' + (o.id ? '<button type="button" class="small danger" data-a="act-del">Remove</button>' : '') + '</div></div>';
    return h;
  }
};
ACT.act = el => { const a = ACTS[el.dataset.k]; if (a) openOv({ type: 'act', k: el.dataset.k, date: state.selDate, min: String(a.min), feel: null, hurt: false, note: '', name: '' }); };
ACT['act-edit'] = el => {
  const rec = state.sessions[state.selDate], a = rec && (rec.acts || []).find(x => x.id === el.dataset.id); if (!a) return;
  const lp = ACTS[a.a] && ACTS[a.a].wm === 'laps' ? /^(\d+) laps? \([\d.]+ mi\)(?: · )?/.exec(a.note || '') : null; // laps logged with it go back in the laps field
  openOv({ type: 'act', id: a.id, k: ACTS[a.a] ? a.a : 'other', date: state.selDate, min: String(a.min), feel: a.feel || null, hurt: !!a.hurt, note: lp ? a.note.slice(lp[0].length) : a.note || '', laps: lp ? lp[1] : '', name: a.a === 'other' ? a.name : '', at: a.at });
};
ACT['act-min'] = el => { const o = state.ov; o.min = String(clamp((Number(o.min) || 0) + Number(el.dataset.d), 1, (ACTS[o.k] && ACTS[o.k].max) || 300)); renderOv(); };
ACT['act-feel'] = el => { const o = state.ov; o.feel = o.feel === el.dataset.v ? null : el.dataset.v; renderOv(); };
ACT['act-hurt'] = () => { state.ov.hurt = !state.ov.hurt; renderOv(); };
ACT['act-fav'] = async () => {
  const pid = me(), k = state.ov.k, favs = P(pid).favorites, next = favs.includes(k) ? favs.filter(x => x !== k) : favs.concat([k]);
  await saveProfile(pid, { favorites: next }); renderOv(); render();
};
ACT['act-log'] = async () => {
  const o = state.ov, a = ACTS[o.k], min = Math.round(Number(o.min));
  const cap = a.max || 300, laps = a.wm === 'laps' ? Math.round(Number(o.laps)) : 0;
  if (!(min > 0) || min > cap) { toast('Enter minutes between 1 and ' + cap + '.'); return; }
  const name = o.k === 'other' ? (String(o.name || '').trim() || 'Activity') : a.name;
  const entry = { id: o.id || uid(), a: o.k, name, min, feel: o.feel || null, hurt: !!o.hurt, note: [laps > 0 && !/\blaps?\b/.test(String(o.note || '')) ? laps + ' lap' + (laps === 1 ? '' : 's') + ' (' + milesText(laps) + ')' : '', String(o.note || '').trim()].filter(Boolean).join(' · '), mv: a.mv !== false, at: o.at || new Date().toISOString() };
  const before = scoreSnapshot();
  const ok = await logActivity(o.date, entry, o.felt); if (!ok) return;
  markRow(o.date, entry.id); closeOv(); render();
  if (a.heat) { celebrate('', { before }); state.waterDate = o.date; toastAction(min + ' min of ' + name.toLowerCase() + ' logged', '+' + BOTTLE_OZ + ' oz water', 'water-bottle', 8000); return; }
  const di = dayInfo(me(), o.date);
  celebrate(min + ' min of ' + name.toLowerCase() + ' logged. ' + (a.mv === false ? 'Recovery counts for you, not for points.' : di.active ? 'That is an active day.' : (weekGoals(me(), weekStart(o.date)).minMin - di.minutes) + ' more min makes it count.'), { force: di.active, before });
};
ACT['act-del'] = async () => { const o = state.ov, path = PATH.session(me(), o.date), before = getDoc(path); const ok = await removeActivity(o.date, o.id); if (!ok) return; closeOv(); settle(); render(); offerUndo('Removed', path, before); };
ACT.surprise = () => { const k = surpriseActivity(me()); const a = ACTS[k]; openOv({ type: 'act', k, date: state.selDate, min: String(a.min), feel: null, hurt: false, note: '', name: '' }); burst({ count: 24, y: 0.35 }); };
ACT.filter = el => { state.filter.cat = el.dataset.cat; if (state.ov && state.ov.type === 'more') state.ov.all = true; redrawPicker(); };
ACT['filter-quick'] = () => { state.filter.quick = !state.filter.quick; redrawPicker(); };
ACT['filter-fav'] = () => { state.filter.fav = !state.filter.fav; redrawPicker(); };
ACT.rest = async () => { const before = scoreSnapshot(); const ok = await logRest(state.selDate); if (!ok) return; markRow(state.selDate, 'prog'); render(); celebrate('Rest day logged. Recovery is part of the plan.', { before }); };
ACT['rest-undo'] = async () => { const path = PATH.session(me(), state.selDate), before = getDoc(path); if (!(await write(path, null))) return; if (state.ov) closeOv(); settle(); render(); offerUndo('Removed', path, before); };

/* ---------- Program tab ---------- */
function renderProgram() {
  const t = todayIso(); const phase = phaseFor(t); const cw = completedWeeks(t); const ws = weekStats(t);
  const fullSplit = splitOf() === 'full', rot = rotation(), lg = liveGoals(me()).liftGoal;
  let h = gymBannerHTML() + '<section class="card stack" id="splitCard"><div class="row between"><h3>Split</h3><span class="tiny muted">changes the next lift, never your history</span></div>' +
    '<div class="seg" aria-label="Split"><button type="button" data-a="split-set" data-v="full" class="' + (fullSplit ? 'on' : '') + '" aria-pressed="' + fullSplit + '">Full body A/B</button><button type="button" data-a="split-set" data-v="ppl" class="' + (fullSplit ? '' : 'on') + '" aria-pressed="' + !fullSplit + '">Push / Pull / Legs</button></div>' +
    '<p class="tiny muted">' + (fullSplit ? 'Two sessions train everything, so a week with only two lifts still covers the whole body. A and B alternate after each counted lift day.' : 'Three sessions train everything. Each day repeats once the other two are done.') + '</p></section>' + renderMorning(phase, liftKindFor(t)) + gymCardHTML() +
    '<section class="card"><div class="eyebrow">How the rotation works</div><h2>' + (fullSplit ? 'Full Body A → B, repeat' : 'Push → Pull → Legs, repeat') + '</h2>' +
    '<p style="margin-top:8px">Days aren\'t tied to weekdays. The next lift is the one after your last <b>counted</b> lift day. Skip a morning and nothing goes out of sync. ' + (fullSplit ? 'Every session opens with a 5 to 10 minute warm-up on the track, treadmill or bike.' : 'Every session opens with a Fitness+ treadmill workout.') + ' Aim for ' + ws.goal + ' activity days a week: ' + ws.liftGoal + ' lifts, the rest treadmill-only or any ' + minMin(me()) + '-minute activity.</p></section>';
  const upcoming = nextDayKey(addDays(t, 1)); const lastL = lastLift(addDays(t, 1));
  h += '<section class="card"><div class="row between"><div><div class="eyebrow">Progress</div><h3 style="font-family:var(--display);font-size:1.25rem">Week ' + (cw + 1) + (fullSplit ? '' : ' · Phase ' + phase + (phase === 3 ? ' (full)' : '')) + '</h3></div><span class="chip ' + (ws.lifts >= ws.liftGoal ? 'good' : '') + '">' + ws.lifts + '/' + ws.liftGoal + ' lift days this week</span></div>' +
    '<p style="margin-top:8px" id="nextLift"><b>Next lift day: ' + DAYS[upcoming].name + '</b>' + (lastL ? ' <span class="muted tiny">after ' + DAYS[lastL.n.day].name + ' on ' + nice(lastL.date) + '</span>' : ' <span class="muted tiny">first lift of the program</span>') + '</p>' +
    '<ul class="rules" style="margin-top:8px">' +
    '<li><b>Activity day:</b> a saved entry with treadmill minutes or any logged set, or ' + minMin(me()) + ' minutes of any other activity (a walk, a hike) on a day with no lift. Rest entries don\'t count.</li>' +
    '<li><b>Lift day:</b> a saved entry where at least ' + QUALIFY_MIN + ' lifts (core moves don\'t count) have a logged set. Only lift days advance the rotation and earn lift credit. Session options under the notes field can override this either way.</li>' +
    '<li><b>Finished vs partial:</b> finished means every planned exercise has a logged set. Partial sessions still save and can still count.</li>' +
    (fullSplit ? '<li><b>Finished on a full-body day:</b> every lift except the two marked "if there\'s time". An express session plans the first ' + EXPRESS_LIFTS + ' lifts and still counts as a lift day.</li><li><b>Week complete:</b> your weekly lift goal met, Mon–Sun. Phases do not apply to the full-body split.</li>'
      : '<li><b>Week complete:</b> ' + LIFT_GOAL + ' lift days Mon–Sun. Each completed week unlocks the next phase: Phase 2 adds exercises, Phase 3 swaps in squats, lunges and flys. Phase 3 is the full program.</li>') +
    '<li>Credit is computed from saved entries, so re-saving or editing never double-counts, and removing an entry removes its credit.</li></ul></section>';
  rot.forEach(k => {
    const d = DAYS[k];
    h += '<section class="card"><div class="row between"><h3>' + d.name + ' day</h3><span class="muted tiny">' + d.sub + '</span></div><div class="plan"><ul>';
    h += d.full ? '<li><span>Warm-up (track, treadmill or bike)</span><span class="muted num">5–10 min</span></li>' : '<li><span>Treadmill (Apple Fitness+)</span><span class="muted num">' + TREAD_MIN[phase] + ' min</span></li>';
    planSlots(k, phase, state.settings.swaps).forEach(sl => {
      const bk = sl.base, key = sl.key, so = slotOf(k, bk), ex = so ? Object.assign({}, EX[key], { sets: so.sets }, key === bk ? { lo: so.lo, hi: so.hi } : null) : EX[key];
      h += '<li><span>' + esc(ex.name) + (key !== bk ? ' <span class="chip">default swap</span>' : '') + (so && so.optional ? ' <span class="chip">if there\'s time</span>' : '') + '<br><span class="tiny muted">' + esc(ex.equip) + (ex.per ? ' · weight per hand' : '') + '</span></span><span class="muted num">' + ex.sets + ' × ' + ex.lo + '–' + ex.hi + '</span></li>';
    });
    h += '</ul></div>';
    if (phase < 3 && !d.full) { const next = d.phases[phase + 1].filter(x => !d.phases[phase].includes(x)); if (next.length) h += '<p class="tiny muted" style="margin-top:8px">Unlocks in Phase ' + (phase + 1) + ': ' + next.map(x => EX[x].name).join(', ') + '.</p>'; }
    h += '</section>';
  });
  h += '<section class="card"><h3>Default swaps</h3><p class="tiny muted" style="margin-top:4px">Swap here to change every future workout. Swap from an exercise\'s ··· menu on the Log screen to change one workout only. Saved workouts keep whatever you did.</p><div class="plan" style="margin-top:8px"><ul>';
  Object.keys(EX).filter(k => alts(k).length && !EX[k].bw && rot.some(r => Object.values(DAYS[r].phases).some(p => p.includes(k)))).forEach(k => {
    const cur = (state.settings.swaps || {})[k] && EX[state.settings.swaps[k]] ? state.settings.swaps[k] : k, opt = defaultSwapOption(k), clash = cur !== k && defaultSwapTaken(k)[cur];
    h += '<li data-swaprow="' + k + '"><span>' + esc(EX[k].name) + (cur !== k ? ' → <b>' + esc(EX[cur].name) + '</b>' : '') +
      (clash ? '<br><span class="tiny" style="color:var(--warn)">' + esc(EX[cur].name) + ' is already in that day\'s workout in some phases. There, ' + esc(EX[k].name) + ' stays.</span>' : cur === k && !opt ? '<br><span class="tiny muted">No swap: its alternates are already in that day\'s workout.</span>' : '') + '</span>' +
      (cur !== k ? '<button type="button" class="small" data-gswap="' + k + '" data-to="' + k + '">Undo</button>' : opt ? '<button type="button" class="small" data-gswap="' + k + '" data-to="' + opt + '">Use ' + esc(EX[opt].name) + '</button>' : '<button type="button" class="small" disabled>Unavailable</button>') + '</li>';
  });
  h += '</ul></div></section>';
  h += '<section class="card"><h3>Weight rules</h3><ul class="rules">' +
    '<li>Only logged sets count. A blank set is not a failed set; a 0 is.</li>' +
    '<li>All ' + EX.chestpress.sets + ' sets logged and every one at the top of the range: next time goes up one step (5 lb machines and dumbbells, 2.5 lb lateral raises and curls, 10 lb leg press, squat and calves).</li>' +
    '<li>Any logged set under the bottom of the range: down one step.</li>' +
    '<li>Fewer than ' + EX.chestpress.sets + ' sets logged, or in range but not all at the top: same weight.</li>' +
    '<li>Dumbbell moves marked <b>per hand</b> track one dumbbell\'s weight. Machines track the stack. Each exercise and each substitute keeps its own history; a swap never carries a weight across.</li>' +
    '<li><b>Can\'t go higher</b> (in an exercise\'s ··· menu) holds that exercise\'s weight: suggestions ask for one more rep per set, then a 4th set once every set is 3 past the top. It changes suggestions only, never saved entries.</li>' +
    '<li>Assisted pull-up is the one inverted machine: the weight is assistance, so "up" means less of it.</li></ul>' +
    '<div class="row" style="margin-top:10px"><label class="f" style="flex:1">Weekly activity goal<input type="number" id="goalIn" inputmode="numeric" min="3" max="7" value="' + (state.settings.goal || GOAL) + '"></label></div>' +
    lockNote(me(), 'goal', v => v + ' activity days') +
    '<div class="stack" id="liftGoalRow" style="margin-top:10px"><div class="eyebrow">Weekly lift goal</div><div class="seg">' + [2, 3].map(v => '<button type="button" data-a="lift-goal" data-v="' + v + '" class="' + (lg === v ? 'on' : '') + '" aria-pressed="' + (lg === v) + '">' + v + ' lift days</button>').join('') + '</div>' +
    '<p class="tiny muted">Lift days that fill the lift share of your Move score.</p>' + lockNote(me(), 'liftGoal', v => v + ' lift days') + '</div></section>';
  const rs = restSeconds();
  h += '<section class="card stack" id="restCard"><h3>Rest timer</h3><p class="tiny muted">Logging a set for today starts a countdown: this long for main lifts, 60 seconds for core and bodyweight moves. It shows above the Save button with +15 s and a dismiss button, and never makes a sound.</p>' +
    '<div class="seg">' + [60, 90, 120].map(v => '<button type="button" data-a="rest-len" data-v="' + v + '" class="' + (rs === v ? 'on' : '') + '" aria-pressed="' + (rs === v) + '">' + v + ' s</button>').join('') + '</div></section>';
  return h;
}
// A changed setting does not touch the week already being raced. Next to it: when it starts, and what this week keeps.
function lockNote(pid, key, words) {
  const live = liveGoals(pid), wk = thisWeek(pid);
  if (live.plan !== wk.plan || live[key] === wk[key]) return '';
  return '<p class="tiny locknote" data-lock="' + key + '"><span class="chip accent">' + startsNote() + '</span> This week stays at ' + words(wk[key]) + ', so the race already running does not change.</p>';
}
const WEEK_SLOTS = { 1: [2], 2: [1, 4], 3: [0, 2, 5], 4: [0, 2, 4, 5], 5: [0, 1, 3, 4, 5], 6: [0, 1, 2, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6] };
function renderPlanChoice() {
  const pid = me(), p = P(pid), live = liveGoals(pid), g = live.goal, mm = live.minMin; // the settings as chosen: they lock in each Monday
  const pool = ['walkeasy', 'stretchfull', 'walkpair', 'recbike', 'chairyoga', 'walkdinner', 'machines'].filter(k => !actCaution(pid, k).length);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let h = '<section class="card stack"><div><div class="eyebrow">Your plan</div><h2>Move ' + g + ' day' + (g === 1 ? '' : 's') + ' a week</h2></div>' +
    '<p>You choose what to do each time. A day counts once you log <b>' + mm + ' minutes</b> of movement, from one activity or several added together. Rest days are part of the plan and cost nothing.</p>' +
    '<div><div class="eyebrow">Active days each week</div><div class="seg" style="margin-top:4px">' + [2, 3, 4, 5, 6, 7].map(v => '<button type="button" data-a="move-goal" data-v="' + v + '" class="' + (g === v ? 'on' : '') + '" aria-pressed="' + (g === v) + '">' + v + '</button>').join('') + '</div>' + lockNote(pid, 'goal', v => v + ' active day' + (v === 1 ? '' : 's')) + '</div>' +
    '<div><div class="eyebrow">Minutes that make a day count</div><div class="seg" style="margin-top:4px">' + [5, 10, 15, 20, 30].map(v => '<button type="button" data-a="move-min" data-v="' + v + '" class="' + (mm === v ? 'on' : '') + '" aria-pressed="' + (mm === v) + '">' + v + '</button>').join('') + '</div>' + lockNote(pid, 'minMin', v => v + ' minutes') + '</div>' +
    '<p class="tiny muted">Set these where you can win most weeks. The competition scores each of you against your own goal, so an honest goal you hit beats an ambitious one you miss. Raise it after two or three good weeks.</p></section>';
  h += '<section class="card stack"><h3>Go easy on</h3><p class="tiny muted">Mark any area with an old injury. Activities that load it are flagged and sorted lower, and Surprise me skips them.</p><div class="chips wrapc">' +
    Object.keys(AREAS).map(k => { const on = (p.move.protect || []).includes(k); return '<button type="button" data-a="protect" data-k="' + k + '" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '">' + AREAS[k] + '</button>'; }).join('') + '</div></section>';
  h += '<section class="card"><h3>One way to fill a ' + g + '-day week</h3><div class="plan" style="margin-top:6px"><ul>' +
    (WEEK_SLOTS[g] || WEEK_SLOTS[3]).map((d, i) => { const a = ACTS[pool[i % pool.length] || 'walkeasy']; return '<li><span><b>' + days[d] + '</b> · ' + a.icon + ' ' + esc(a.name) + '</span><span class="muted num">' + Math.max(a.min, mm) + ' min</span></li>'; }).join('') +
    '</ul></div><p class="tiny muted" style="margin-top:8px">Only a suggestion. Any day, any activity on your list.</p></section>';
  h += '<section class="card"><h3>The full menu</h3>' + ACT_CATS.map(c => '<p style="margin-top:8px"><b>' + c[1] + ':</b> <span class="muted">' + Object.keys(ACTS).filter(k => ACTS[k].cat === c[0] && k !== 'other').map(k => ACTS[k].name).join(', ') + '.</span></p>').join('') + '</section>';
  h += '<section class="card"><h3>Before you start</h3><p class="tiny muted" style="margin-top:4px">This menu is general, low-impact movement, not medical advice. With past injuries, clear new activities with your doctor or physical therapist. Stop if pain is sharp, new, or getting worse, and use the Something hurt button so the pattern shows up in History.</p></section>';
  return h;
}
ACT['move-goal'] = async el => { await saveProfile(me(), { move: { goalDays: Number(el.dataset.v) } }); settle(); render(); };
ACT['move-min'] = async el => { await saveProfile(me(), { move: { minMinutes: Number(el.dataset.v) } }); settle(); render(); };
ACT['rest-len'] = async el => { await saveSettings({ rest: Number(el.dataset.v) }); };
ACT.protect = async el => { const cur = P(me()).move.protect || [], k = el.dataset.k; await saveProfile(me(), { move: { protect: cur.includes(k) ? cur.filter(x => x !== k) : cur.concat([k]) } }); render(); };

/* ---------- History ---------- */
// By exercise: weight over time (most reps for a bodyweight move), with deload sessions drawn hollow, and the best set.
function liftTrendHTML(sel) {
  const ex = EX[sel], rows = records().filter(r => r.n.ex[sel]);
  const pts = rows.map(r => { const e = r.n.ex[sel], reps = e.reps.filter(x => x != null); return { d: r.date, v: ex.bw ? (reps.length ? Math.max.apply(null, reps) : null) : e.w, deload: !!r.rec.deload }; }).filter(p => isNum(p.v));
  let best = null; // the heaviest weight, then the most reps at it (less assistance counts as heavier; bodyweight: the most reps)
  rows.forEach(r => { const e = r.n.ex[sel]; e.reps.forEach(x => { if (x == null || (!ex.bw && e.w == null)) return; const w = ex.bw ? 0 : (ex.inc < 0 ? -e.w : e.w); if (!best || w > best.rank || (w === best.rank && x > best.reps)) best = { rank: w, w: e.w, reps: x, date: r.date }; }); });
  let h = '';
  if (pts.length >= 2) {
    const W = 300, H = 64, pad = 7, vs = pts.map(p => p.v), mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs), span = (mx - mn) || 1;
    const x = i => pad + (W - 2 * pad) * i / (pts.length - 1), y = v => pad + (H - 2 * pad) * (1 - (v - mn) / span);
    h += '<svg class="spark trend" id="exTrend" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(ex.name) + ': ' + (ex.bw ? 'best reps' : 'weight') + ' over ' + pts.length + ' sessions, from ' + pts[0].v + ' to ' + pts[pts.length - 1].v + '"><path d="' + pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ') + '"/>' +
      pts.map((p, i) => '<circle class="' + (p.deload ? 'dl' : '') + '" cx="' + x(i).toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '" r="' + (p.deload ? 3.5 : 2.5) + '"/>').join('') + '</svg>';
  }
  if (best) h += '<p class="tiny" id="exBest" style="margin-top:6px"><b>Best set:</b> ' + esc((ex.bw ? '' : fmtW(sel, best.w) + ' × ') + best.reps + (ex.bw ? ' reps' : '')) + ' <span class="muted">· ' + nice(best.date) + (pts.some(p => p.deload) ? ' · hollow dots are deload sessions' : '') + '</span></p>';
  return h;
}
// "Something hurt" notes, so a pattern is visible: which activities, which areas they load, and what was written.
function painCardHTML(pid) {
  const pn = painNotes(pid); if (!pn.list.length && P(pid).plan !== 'choice') return '';
  let h = '<section class="card stack" id="painCard"><div class="row between"><h3>Pain notes</h3><span class="chip' + (pn.list.length ? ' warn' : '') + '">' + pn.list.length + ' in the last ' + PAIN_DAYS + ' days</span></div>';
  if (!pn.list.length) h += '<p class="tiny muted">Nothing noted. Tap "Something hurt" when you log an activity and the pattern shows up here.</p>';
  else {
    const acts = Object.keys(pn.byAct).map(k => pn.byAct[k]).sort((a, b) => b.n - a.n), areas = Object.keys(pn.byArea).sort((a, b) => pn.byArea[b] - pn.byArea[a]);
    h += '<div id="painByAct"><div class="eyebrow">By activity</div><p>' + acts.map(a => esc(a.name) + ' <b>' + a.n + '×</b>').join(' · ') + '</p></div>' +
      (areas.length ? '<div id="painByArea"><div class="eyebrow">By body area those activities load</div><p>' + areas.map(a => AREAS[a] + ' <b>' + pn.byArea[a] + '×</b>').join(' · ') + '</p></div>' : '') +
      '<div class="tbl" id="painList"><table>' + pn.list.map(x => '<tr><td>' + esc(x.name) + (x.note ? '<br><span class="tiny muted">“' + esc(x.note) + '”</span>' : '') + '</td><td>' + nice(x.date) + '</td></tr>').join('') + '</table></div>' +
      '<p class="tiny muted">An activity with two or more notes in ' + PAIN_DAYS + ' days is flagged in the menu, sorted lower, and skipped by Surprise me.</p>';
  }
  return h + '<p class="tiny muted">This is a log, not medical advice. With past injuries, or if pain is sharp, new, or keeps coming back, talk to your doctor or physical therapist before doing that activity again.</p></section>';
}
function renderHistory() {
  const pid = me(), list = records().filter(r => r.n.kind !== 'empty' || r.n.ambiguous).reverse();
  let h = '<section class="card"><div class="row between"><h2>History</h2><span class="chip">' + list.length + ' saved</span></div>';
  if (!list.length) h += '<p class="muted" style="margin-top:10px">Nothing saved yet. Your first session shows up here.</p>';
  h += '<div class="hist" style="margin-top:8px">';
  list.forEach(r => {
    const n = r.n, di = dayInfo(pid, r.date);
    let what, chip;
    if (n.kind === 'rest') { what = 'Rest'; chip = '<span class="chip">no credit</span>'; }
    else if (n.kind === 'cardio') { what = 'Treadmill'; chip = '<span class="chip good">activity</span>'; }
    else if (n.kind === 'strength') { what = (n.day ? DAYS[n.day].name : 'Lift') + ' · ' + (n.complete === true ? 'finished' : n.complete === false ? 'partial' : 'lift'); chip = n.qualifies ? '<span class="chip accent">lift day</span>' : '<span class="chip warn">partial · no lift credit</span>'; }
    else if (n.kind === 'activity') { const names = n.acts.map(actName); what = names.slice(0, 2).join(' + ') + (names.length > 2 ? ' +' + (names.length - 2) : ''); chip = di.active ? '<span class="chip good">active day</span>' : '<span class="chip warn">under ' + weekGoals(pid, weekStart(r.date)).minMin + ' min</span>'; }
    else { what = 'No activity recorded'; chip = '<span class="chip bad">check</span>'; }
    if (n.program && n.acts.length) { const names = n.acts.map(actName); what += ' + ' + names[0] + (names.length > 1 ? ' +' + (names.length - 1) : ''); }
    const line = [];
    if (n.kind === 'activity') line.push(n.allMin + ' min');
    const fb = !!(n.day && DAYS[n.day].full); // full-body days: a warm-up, and no phase
    if (n.tm) line.push(n.tm.minutes > 0 ? n.tm.minutes + (fb ? ' min warm-up' : ' min treadmill') : fb ? 'warm-up, minutes not entered' : 'treadmill, minutes not entered');
    if (n.keys.length) line.push(n.keys.length + ' exercise' + (n.keys.length === 1 ? '' : 's'));
    if (n.program && n.acts.length) line.push(n.actMin + ' min of activities');
    if (n.phase && !fb) line.push('Phase ' + n.phase);
    if (CHECKIN_WORDS[r.rec.checkin]) line.push('Felt: ' + CHECKIN_WORDS[r.rec.checkin]);
    if (r.rec.deload && n.kind === 'strength') line.push('deload');
    h += '<details class="hi" data-hdate="' + r.date + '"><summary><div class="hdate num">' + nice(r.date).replace(/^(\w+) /, '$1<br>') + '</div><div><b>' + esc(what) + '</b><div class="tiny muted">' + esc(line.join(' · ') || '—') + '</div></div>' + chip + '</summary><div class="hbody">';
    if (n.ambiguous) h += '<p class="tiny" style="color:var(--warn)">Saved as a lift day by the earlier version, but it has no lifting sets. Treated as ' + (n.kind === 'cardio' ? 'treadmill only' : 'no activity') + ' until you edit it.</p>';
    if (n.legacy && n.keys.length) h += '<p class="tiny muted">Saved by the earlier version: blank sets were stored as 0 and are shown as not logged.</p>';
    if (n.tm && n.tm.title) h += '<p>' + esc(n.tm.title) + '</p>';
    if (n.acts.length) {
      h += (n.program ? '<div class="eyebrow">Activities</div>' : '') + '<div class="tbl"><table>' + n.acts.map(a => '<tr><td>' + actIcon(a) + ' ' + esc(actName(a)) + (a.hurt ? '<br><span class="tiny" style="color:var(--warn)">pain noted</span>' : '') + (a.note ? '<br><span class="tiny muted">' + esc(a.note) + '</span>' : '') + '</td><td>' + a.min + ' min' + (a.feel && FEELS[a.feel] ? ' · ' + FEELS[a.feel] : '') + '</td></tr>').join('') + '</table></div>';
    }
    if (n.keys.length) {
      if (n.acts.length) h += '<div class="eyebrow">' + (n.day ? DAYS[n.day].name + ' lift' : 'Lift') + '</div>';
      const order = n.planned ? n.planned.filter(k => n.ex[k]).concat(n.keys.filter(k => !n.planned.includes(k))) : n.keys;
      h += '<div class="tbl"><table>' + order.map(k => {
        const e = n.ex[k]; const base = n.plannedBase && n.planned ? n.plannedBase[n.planned.indexOf(k)] : null;
        return '<tr><td>' + esc(EX[k].name) + (base && base !== k ? '<br><span class="tiny muted">instead of ' + esc(EX[base].name) + '</span>' : '') + '</td><td>' + esc((e.w != null ? fmtW(k, e.w) + ' × ' : '') + fmtReps(e.reps)) + '</td></tr>';
      }).join('') + '</table></div>';
      if (n.planned) { const skipped = n.planned.filter(k => !n.ex[k]); if (skipped.length) h += '<p class="tiny muted">Not logged: ' + skipped.map(k => EX[k].name).join(', ') + '.</p>'; }
      if (n.qualifyOverride != null) h += '<p class="tiny muted">Lift credit set by hand: ' + (n.qualifyOverride ? 'counted' : 'not counted') + '.</p>';
    }
    if (n.notes) h += '<p>“' + esc(n.notes) + '”</p>';
    h += '<div class="row"><button type="button" class="small" data-edit="' + r.date + '">Edit ' + nice(r.date) + '</button><button type="button" class="small ' + (state.confirmRemove === r.date ? 'danger' : '') + '" data-remove="' + r.date + '">' + (state.confirmRemove === r.date ? 'Tap again to remove ' + (n.program && n.acts.length ? 'the ' + (n.kind === 'strength' ? 'lift' : 'treadmill entry') + ' (activities stay)' : nice(r.date)) : n.program && n.acts.length ? 'Remove ' + (n.kind === 'strength' ? 'lift' : 'treadmill') : 'Remove') + '</button></div>';
    h += '</div></details>';
  });
  h += '</div></section>';

  h += painCardHTML(pid);
  const used = Object.keys(EX).filter(k => records().some(r => r.n.ex[k]));
  if (used.length || P(pid).plan === 'program') {
    h += '<section class="card"><h3>By exercise</h3>';
    if (!used.length) h += '<p class="muted tiny" style="margin-top:6px">Appears once a lift is saved.</p>';
    else {
      const sel = used.includes(state.exHist) ? state.exHist : used[0];
      h += '<select id="exHist" style="margin-top:8px" aria-label="Exercise">' + used.map(k => '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(EX[k].name) + '</option>').join('') + '</select>';
      const rows = records().filter(r => r.n.ex[sel]).reverse();
      h += liftTrendHTML(sel);
      h += '<div class="tbl" style="margin-top:8px"><table>' + rows.map(r => '<tr><td>' + nice(r.date) + (r.rec.deload ? ' <span class="chip">deload</span>' : '') + '</td><td>' + esc((r.n.ex[sel].w != null ? fmtW(sel, r.n.ex[sel].w) + ' × ' : '') + fmtReps(r.n.ex[sel].reps)) + '</td></tr>').join('') + '</table></div>';
      h += '<p class="tiny muted" style="margin-top:6px">Target ' + EX[sel].sets + ' × ' + EX[sel].lo + '–' + EX[sel].hi + (EX[sel].per ? '. Weight is per hand.' : '.') + '</p>';
    }
    h += '</section>';
  }
  const tally = {}; records().forEach(r => r.n.acts.forEach(a => { const k = actName(a); tally[k] = tally[k] || { n: 0, min: 0, icon: actIcon(a) }; tally[k].n++; tally[k].min += a.min; }));
  const names = Object.keys(tally).sort((a, b) => tally[b].min - tally[a].min);
  if (names.length) h += '<section class="card"><h3>By activity</h3><div class="tbl" style="margin-top:8px"><table>' + names.slice(0, 12).map(k => '<tr><td>' + tally[k].icon + ' ' + esc(k) + '</td><td>' + tally[k].n + '× · ' + tally[k].min + ' min</td></tr>').join('') + '</table></div></section>';
  return h;
}
