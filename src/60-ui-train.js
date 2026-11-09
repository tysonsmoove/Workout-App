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
  const rec = state.sessions[date]; const d = state.drafts[date]; const st = state.status[date];
  if (st && st.s === 'saving') return 'Saving…';
  if (st && st.s === 'failed') return 'Save failed · inputs kept';
  const hasDraft = d && draftHasContent(d);
  if (rec && st && st.s === 'synced') return 'Saved · synced' + (hasDraft ? ' · unsaved changes' : '');
  if (rec && st && st.s === 'local') return 'Saved in this browser' + (hasDraft ? ' · unsaved changes' : '');
  if (rec) return 'Saved' + (hasDraft ? ' · unsaved changes' : '');
  if (hasDraft) return (d.recovered ? 'Recovered draft' : 'Draft') + ' · on this phone';
  return 'New entry';
}

/* ---------- Train: lifting program ---------- */
function renderTrain() {
  const date = state.selDate; const rec = state.sessions[date]; const n = rec ? normalize(rec) : null;
  const m = model(date); const d = state.drafts[date];
  const kind = kindFor(date, m); const isLift = !!DAYS[kind];
  const phase = phaseOf(date);
  const last = lastLift(date); const nextK = nextDayKey(date);
  let why = last ? 'After ' + DAYS[last.n.day].name + ' on ' + nice(last.date) + ', ' + DAYS[nextK].name + ' is next.' : 'First lift of the program: Push.';
  if (n && n.qualifies && n.day) why = 'Counted ' + DAYS[n.day].name + ' day. Next: ' + DAYS[ROTATION[(ROTATION.indexOf(n.day) + 1) % 3]].name + '.';
  else if (n && n.kind === 'strength') why = 'Partial lift, not counted. ' + DAYS[nextK].name + ' is still next.';
  else if (isLift && kind !== nextK) why += ' You picked ' + DAYS[kind].name + '.';

  let h = '<section class="card sess">' + dateHead('Logging for') +
    '<div class="seg" id="kindSeg" aria-label="Workout type">' + ROTATION.map(k => '<button type="button" data-kind="' + k + '" class="' + (kind === k ? 'on' : '') + '" aria-pressed="' + (kind === k) + '">' + DAYS[k].name + '</button>').join('') +
    '<button type="button" data-kind="cardio" class="' + (kind === 'cardio' ? 'on' : '') + '" aria-pressed="' + (kind === 'cardio') + '">Treadmill</button><button type="button" data-kind="rest" class="' + (kind === 'rest' ? 'on' : '') + '" aria-pressed="' + (kind === 'rest') + '">Rest</button></div>' +
    '<div class="status"><span id="statusLine">' + esc(statusText(date)) + '</span><span>·</span><span>Phase ' + phase + '</span>' + healthButton() + '</div>' +
    '<p class="tiny muted" id="whyLine" style="margin-top:-4px">' + esc(why) + '</p>' + hkLineHTML(date);
  if (d && d.recovered && draftHasContent(d)) h += '<div class="banner"><span>Unsaved draft from ' + tzTime.format(new Date(d.updatedAt)) + ' restored. Not saved until you tap Save.</span><div class="row"><button type="button" class="small" id="discardDraft">Discard draft</button></div></div>';
  if (n && n.ambiguous) h += '<div class="banner">Saved as a ' + (DAYS[rec.day] ? DAYS[rec.day].name : 'lift') + ' day by the earlier version but has no lifting sets. It counts as ' + (n.kind === 'cardio' ? 'treadmill only' : 'no activity') + '. Add sets or re-save to confirm.</div>';
  if (n && n.kind === 'activity') h += '<div class="banner">This day has pick-your-own activities logged (' + n.allMin + ' min). Saving a lift here replaces them.</div>';
  h += '</section>';

  if (kind === 'rest') {
    h += '<section class="sheet"><div class="blk"><div class="bhead"><h3>Rest day</h3></div><p class="tiny muted">Doesn\'t count as activity and doesn\'t move the rotation.</p>' +
      '<label class="f">Notes<input type="text" id="notes" data-field="notes" value="' + esc(m.notes) + '" placeholder="Optional"></label></div></section>';
    h += renderSaveBar(date, m, rec);
    h += renderMorning(phase, kind);
    return h;
  }

  h += '<form id="logForm" autocomplete="off" class="sheet"><div class="blk"><div class="bhead"><h3>Treadmill · Apple Fitness+</h3><span class="tiny muted">target ' + TREAD_MIN[phase] + ' min</span></div>' +
    '<div class="logrow" style="grid-template-columns:minmax(80px,1fr) 2fr"><label class="f">Minutes<input type="number" id="tmMin" data-field="tmMin" min="0" step="1" inputmode="numeric" pattern="[0-9]*" value="' + esc(m.tm.minutes) + '" placeholder="–"></label>' +
    '<label class="f">Workout (optional)<input type="text" id="tmTitle" data-field="tmTitle" value="' + esc(m.tm.title) + '" placeholder="Fitness+ workout name"></label></div></div>';

  if (isLift) {
    const day = DAYS[kind]; const planned = plannedFor(date, kind, m);
    h += '<div class="blk" style="gap:2px"><div class="bhead"><h3>' + day.name + ' day</h3><span class="tiny muted">' + day.sub + '</span></div></div>';
    planned.forEach(p => { h += renderExercise(p, m, date); });
  }
  h += '<div class="blk"><label class="f">Notes<input type="text" id="notes" data-field="notes" value="' + esc(m.notes) + '" placeholder="Optional"></label></div>';
  if (isLift) {
    const r = parseDraft(date, m);
    const checked = m.countAs == null ? (r.kind === 'strength' ? r.auto : false) : !!m.countAs;
    h += '<details class="plain sessopts"' + (m.countAs != null ? ' open' : '') + '><summary>Session options</summary>' +
      '<label class="row" style="gap:8px;flex-wrap:nowrap;align-items:flex-start;margin-top:8px;font-size:.875rem"><input type="checkbox" id="countAs" style="width:22px;height:22px;flex:none;margin:0"' + (checked ? ' checked' : '') + '><span>Count as ' + DAYS[kind].name + ' lift day' + (m.countAs == null ? ' <span class="muted">(automatic: on once ' + QUALIFY_MIN + ' lifts have a logged set)</span>' : ' <span class="muted">(set by you)</span>') + '</span></label>' +
      '<p class="tiny muted" style="margin-top:6px">A counted lift day advances the rotation and earns lift credit. Full rules on the Program tab.</p></details>';
  }
  h += '</form>';
  h += renderSaveBar(date, m, rec);
  h += renderMorning(phase, kind);
  return h;
}
function exSummary(key, e, nSets) {
  const ex = EX[key];
  const loggedN = e.reps.filter(r => r !== '' && r != null).length;
  const line = loggedN ? (ex.bw ? '' : (e.w !== '' ? e.w + ' lb' + (ex.per ? ' each' : '') + ' × ' : '? × ')) + e.reps.slice(0, nSets).map(r => r === '' || r == null ? '–' : r).join(' / ') : '';
  return { loggedN, line, done: loggedN >= nSets && (ex.bw || e.w !== '') };
}
function renderExercise(p, m, date) {
  const key = p.key; const ex = EX[key]; const sg = suggest(key, date);
  const e = m.ex[key] || { w: '', reps: [] }; const maxed = !!(state.settings.maxed || {})[key];
  const nSets = setCount(key, m, date); const sm = exSummary(key, e, nSets);
  const closed = !!m.closed[key]; const menu = state.menu && state.menu.key === key ? state.menu : null;
  let h = '<section class="blk ex" data-ex="' + key + '" aria-label="' + esc(ex.name) + '">';
  h += '<div class="bhead"><h3>' + esc(ex.name) + (key !== p.base ? ' <span class="chip">swapped</span>' : '') + '</h3>' +
    '<button type="button" class="menubtn" data-menu="' + key + '" aria-label="Options for ' + esc(ex.name) + '" aria-haspopup="menu" aria-expanded="' + (menu ? 'true' : 'false') + '">···</button>' + renderMenu(key, p, m, date, menu) + '</div>';
  if (closed) {
    h += '<div class="collapsed-sum"><span data-sum="' + key + '">' + (sm.line ? '<b>' + esc(sm.line) + '</b> · ' + sm.loggedN + '/' + nSets + ' logged' : 'Nothing logged') + '</span><button type="button" class="quiet" data-expand="' + key + '">Expand</button></div></section>';
    return h;
  }
  const rx = ex.sets + ' sets · ' + ex.lo + '–' + ex.hi + ' reps' + (ex.bw ? ' · bodyweight' : ex.per ? ' · lb per hand' : '');
  const useHidden = ex.bw || String(e.w) === String(sg.w);
  h += '<div class="exrx"><span>' + esc(rx) + '</span>' + (ex.bw ? '' : '<button type="button" class="small" data-usew="' + key + '" data-val="' + sg.w + '"' + (useHidden ? ' hidden' : '') + '>Use ' + sg.w + ' lb</button>') + '</div>';
  if (sg.last) h += '<div class="exlast" data-last="' + key + '">Last · ' + nice(sg.last.date) + ': <b>' + esc((sg.last.w != null ? fmtW(key, sg.last.w) + ' × ' : '') + fmtReps(sg.last.reps)) + '</b></div>';
  if (maxed) h += '<div class="exhold" data-hold="' + key + '">Holding weight · progress by reps, then a 4th set</div>';
  h += '<div class="logrow">';
  if (!ex.bw) h += '<label class="f w">Weight (lb)<input type="number" inputmode="decimal" min="0" step="2.5" id="w-' + key + '" data-field="w" data-ex="' + key + '" value="' + esc(e.w) + '" placeholder="–"></label>';
  for (let i = 0; i < nSets; i++) h += '<label class="f">Set ' + (i + 1) + '<input type="number" inputmode="numeric" pattern="[0-9]*" min="0" step="1" id="r-' + key + '-' + i + '" data-field="rep" data-ex="' + key + '" data-i="' + i + '" value="' + esc(e.reps[i] == null ? '' : e.reps[i]) + '" placeholder="–"></label>';
  h += '</div>';
  h += '<div class="exprog" data-prog="' + key + '"' + (sm.loggedN ? '' : ' hidden') + '><span><b>' + sm.loggedN + '/' + nSets + '</b> sets logged</span>' + (sm.done ? '<button type="button" class="quiet" data-collapse="' + key + '">Collapse</button>' : '') + '</div>';
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
function renderMenu(key, p, m, date, menu) {
  if (!menu) return '';
  const ex = EX[key]; const maxed = !!(state.settings.maxed || {})[key]; const nSets = setCount(key, m, date);
  let h = '<div class="menu" role="menu" aria-label="Options for ' + esc(ex.name) + '" data-menufor="' + key + '">';
  if (menu.view === 'swap') {
    h += '<div class="mh">Swap exercise</div>';
    const opts = [];
    if (key === p.base && ex.alt && EX[ex.alt]) opts.push(ex.alt);
    if (key !== p.base) { opts.push(p.base); if (ex.alt && EX[ex.alt] && ex.alt !== p.base) opts.push(ex.alt); }
    opts.forEach(k => { h += '<button type="button" role="menuitem" data-act="swapto" data-key="' + key + '" data-base="' + p.base + '" data-to="' + k + '">' + esc(EX[k].name) + (k === p.base ? '<span class="sub">back to the planned exercise</span>' : '<span class="sub">' + esc(EX[k].equip) + (EX[k].per ? ' · lb per hand' : '') + '</span>') + '</button>'; });
    h += '<button type="button" role="menuitem" data-act="back" data-key="' + key + '">Cancel</button>';
  } else {
    h += '<button type="button" role="menuitem" data-act="swap" data-key="' + key + '">Swap exercise<span class="sub">this workout only</span></button>';
    if (!ex.bw) h += '<button type="button" role="menuitem" data-act="hold" data-key="' + key + '">' + (maxed ? 'Allow weight increases' : 'Can\'t go higher') + '<span class="sub">' + (maxed ? 'resume weight suggestions' : 'hold weight, progress by reps') + '</span></button>';
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
  const disabled = (r.kind === 'none' && r.empty && !(st && st.s === 'failed')) || (st && st.s === 'saving');
  let h = '<div class="savebar" id="savebar">';
  if (note) h += '<p class="note ' + note.cls + '" id="savenote">' + esc(note.text) + '</p>';
  h += '<div class="bar"><span class="st" id="saveStatus">' + esc(statusText(date)) + '</span>' +
    '<button type="button" class="primary" id="saveBtn"' + (disabled ? ' disabled' : '') + '>' + (st && st.s === 'saving' ? 'Saving…' : st && st.s === 'failed' ? 'Retry · ' + rel(date) : rec ? 'Update ' + rel(date) : 'Save ' + rel(date)) + '</button>';
  if (rec) h += '<button type="button" class="small ' + (state.confirmRemove === date ? 'danger' : '') + '" id="delBtn" aria-label="Remove this entry">' + (state.confirmRemove === date ? 'Tap again: remove ' + nice(date) : 'Remove') + '</button>';
  h += '</div></div>';
  return h;
}
function renderMorning(phase, kind) {
  return '<details class="card plain"><summary>Morning plan · at IMS by 9</summary><div class="sched" style="margin-top:8px">' +
    '<span class="t num">10:30</span><span>Lights out. Bag packed, Fitness+ workout picked.</span>' +
    '<span class="t num">6:00</span><span>Up. Water, small bite, drive to Avon.</span>' +
    '<span class="t num">6:30</span><span>Treadmill ' + TREAD_MIN[phase] + ' min, then ' + (DAYS[kind] ? DAYS[kind].name + ' day' : 'lift') + ' (about 30 min).</span>' +
    '<span class="t num">7:35</span><span>Shower. Out the door by 8:25.</span></div>' +
    '<p class="tiny muted" style="margin-top:8px">Missed a morning? Nothing shifts. The next lift is still the next one in the rotation.</p></details>';
}

/* ---------- Train: pick-your-own ---------- */
function renderMove() {
  const pid = me(), date = state.selDate, rec = state.sessions[date], n = rec ? normalize(rec) : null, di = dayInfo(pid, date), mm = minMin(pid), f = state.filter;
  const acts = n && n.kind === 'activity' ? n.acts : [];
  const program = n && (n.kind === 'strength' || n.kind === 'cardio');
  let status = 'Nothing logged for this day';
  if (n && n.kind === 'rest') status = 'Rest day logged';
  else if (program) status = 'Lifting-program entry · counts as an active day';
  else if (acts.length) status = n.allMin + ' min logged · ' + (di.active ? 'counts as an active day' : (mm - di.minutes) + ' more min of movement to count');
  let h = '<section class="card sess">' + dateHead('Logging for') + '<div class="status"><span id="statusLine">' + esc(status) + '</span>' + healthButton() + '</div>' + hkLineHTML(date);
  if (program) h += '<div class="banner">This day was logged on the lifting program. Switch workout style under Me to edit it, or use History to remove it.</div>';
  h += '</section>';
  if (acts.length || (n && n.kind === 'rest')) {
    h += '<section class="card"><div class="row between"><h3>Logged ' + (rel(date) === nice(date) ? nice(date) : rel(date).toLowerCase()) + '</h3>' + (n.kind === 'rest' ? '<span class="chip">rest</span>' : di.active ? '<span class="chip good">active day</span>' : '<span class="chip warn">' + di.minutes + ' of ' + mm + ' min</span>') + '</div><div class="done-list" style="margin-top:4px">';
    if (n.kind === 'rest') h += '<button type="button" data-a="rest-undo"><span>🛌 Rest day</span><span class="muted">tap to remove</span></button>';
    acts.forEach(a => { h += '<button type="button" data-a="act-edit" data-id="' + esc(a.id) + '"><span>' + actIcon(a) + ' ' + esc(actName(a)) + (a.hurt ? ' <span class="chip warn">pain noted</span>' : '') + (a.mv === false ? ' <span class="chip">recovery</span>' : '') + '</span><span class="muted num">' + a.min + ' min' + (a.feel && FEELS[a.feel] ? ' · ' + FEELS[a.feel] : '') + '</span></button>'; });
    h += '</div></section>';
  }
  if (!program) {
    const chip = (on, a, extra, label) => '<button type="button" data-a="' + a + '" ' + extra + ' class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '">' + label + '</button>';
    const list = actList(pid, f);
    h += '<section class="card stack"><div class="row between"><h3>Pick your move</h3><button type="button" class="small" data-a="surprise">Surprise me</button></div>' +
      '<div class="chips" aria-label="Filter activities">' + chip(f.cat === 'all', 'filter', 'data-cat="all"', 'All') + ACT_CATS.map(c => chip(f.cat === c[0], 'filter', 'data-cat="' + c[0] + '"', c[1])).join('') + '</div>' +
      '<div class="chips">' + chip(f.quick, 'filter-quick', '', '10 min or less') + chip(f.fav, 'filter-fav', '', 'Favorites') + '</div>' +
      '<div class="acts">' + list.map(k => {
        const a = ACTS[k], caution = actCaution(pid, k), fav = P(pid).favorites.includes(k);
        return '<button type="button" class="act' + (fav ? ' fav' : '') + '" data-a="act" data-k="' + k + '"><span class="ai" aria-hidden="true">' + a.icon + '</span><span class="an">' + esc(a.name) + '</span><span class="am">' + a.min + ' min · ' + (a.mv === false ? 'recovery' : IMPACT[a.impact]) + '</span>' + (caution.length ? '<span class="aw">Go easy: ' + caution.map(x => AREAS[x].toLowerCase()).join(', ') + '</span>' : '') + '</button>';
      }).join('') + '</div>' + (list.length ? '' : '<p class="muted tiny">Nothing matches those filters.</p>') +
      (!acts.length && !(n && n.kind === 'rest') ? '<div class="row"><button type="button" class="small" data-a="rest">Log a rest day instead</button></div>' : '') + '</section>';
  }
  h += renderWeekDots(pid);
  return h;
}
function renderWeekDots(pid) {
  const t = todayIso(), ws = weekStart(t), f = weekFacts(pid, ws), sc = scoreFacts(f), c = coach(pid), rival = P(otherPid(pid)).name;
  const race = sc.total > c.other ? 'You lead ' + rival + ' ' + sc.total + ' to ' + c.other + '.'
    : c.plan ? rival + ' has ' + c.other + ', you have ' + sc.total + '. To pass today: ' + c.plan.used.map(x => x.text.charAt(0).toLowerCase() + x.text.slice(1)).join(', then ') + '.'
    : sc.total === c.other ? 'Level with ' + rival + ' at ' + sc.total + '.' : rival + ' leads ' + c.other + ' to ' + sc.total + '.';
  return '<section class="card stack"><div class="row between"><h3>This week</h3><span class="tiny muted num">' + sc.active + ' of ' + f.goal + ' active days · ' + sc.minutes + ' min</span></div><div class="weekdots">' +
    f.days.map(d => '<span class="' + (d.active ? 'on' : d.rest ? 'rest' : '') + (d.date === t ? ' today' : '') + '">' + DOW[dow(d.date)] + '<i></i></span>').join('') + '</div>' +
    '<p class="tiny muted">' + (sc.active >= f.goal ? 'Weekly goal met. Extra days still add minutes toward your personal best.' : (f.goal - sc.active) + ' more active day' + (f.goal - sc.active === 1 ? '' : 's') + ' fills your Move score. A day counts at ' + minMin(pid) + ' minutes.') + '</p>' +
    '<p class="tiny" id="raceLine"><a href="#compete">' + esc(race) + '</a></p></section>';
}
OV.act = {
  html: o => {
    const a = ACTS[o.k], pid = me(), caution = actCaution(pid, o.k), fav = P(pid).favorites.includes(o.k), min = Number(o.min) || 0;
    let h = '<div class="ov" role="dialog" aria-modal="true" aria-label="Log ' + esc(a.name) + '">' + ovHead(a.icon + ' ' + esc(a.name), rel(o.date) + ' · ' + (a.mv === false ? 'recovery, does not count toward active minutes' : IMPACT[a.impact])) +
      '<p class="muted">' + esc(a.desc) + '</p>';
    if (caution.length) h += '<div class="banner">Loads an area you are protecting: ' + caution.map(x => AREAS[x].toLowerCase()).join(', ') + '. Keep it short and easy, or pick something else.</div>';
    if (o.k === 'other') h += '<label class="f">What did you do?<input type="text" data-ovf="name" value="' + esc(o.name || '') + '" placeholder="Name the activity" maxlength="40"></label>';
    h += '<div><div class="eyebrow">Minutes</div><div class="stepper" style="margin-top:4px"><button type="button" data-a="act-min" data-d="-5" aria-label="5 fewer minutes">−</button><input type="number" id="actMin" data-ovf="min" inputmode="numeric" pattern="[0-9]*" min="1" max="300" value="' + esc(o.min) + '" aria-label="Minutes"><button type="button" data-a="act-min" data-d="5" aria-label="5 more minutes">+</button></div></div>' +
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
  openOv({ type: 'act', id: a.id, k: ACTS[a.a] ? a.a : 'other', date: state.selDate, min: String(a.min), feel: a.feel || null, hurt: !!a.hurt, note: a.note || '', name: a.a === 'other' ? a.name : '', at: a.at });
};
ACT['act-min'] = el => { const o = state.ov; o.min = String(clamp((Number(o.min) || 0) + Number(el.dataset.d), 1, 300)); renderOv(); };
ACT['act-feel'] = el => { const o = state.ov; o.feel = o.feel === el.dataset.v ? null : el.dataset.v; renderOv(); };
ACT['act-hurt'] = () => { state.ov.hurt = !state.ov.hurt; renderOv(); };
ACT['act-fav'] = async () => {
  const pid = me(), k = state.ov.k, favs = P(pid).favorites, next = favs.includes(k) ? favs.filter(x => x !== k) : favs.concat([k]);
  await saveProfile(pid, { favorites: next }); renderOv(); render();
};
ACT['act-log'] = async () => {
  const o = state.ov, a = ACTS[o.k], min = Math.round(Number(o.min));
  if (!(min > 0) || min > 300) { toast('Enter minutes between 1 and 300.'); return; }
  const name = o.k === 'other' ? (String(o.name || '').trim() || 'Activity') : a.name;
  const entry = { id: o.id || uid(), a: o.k, name, min, feel: o.feel || null, hurt: !!o.hurt, note: String(o.note || '').trim(), mv: a.mv !== false, at: o.at || new Date().toISOString() };
  const ok = await logActivity(o.date, entry); if (!ok) return;
  closeOv(); render();
  const di = dayInfo(me(), o.date);
  celebrate(min + ' min of ' + name.toLowerCase() + ' logged. ' + (a.mv === false ? 'Recovery counts for you, not for points.' : di.active ? 'That is an active day.' : (minMin(me()) - di.minutes) + ' more min makes it count.'), { force: di.active });
};
ACT['act-del'] = async () => { const o = state.ov; const ok = await removeActivity(o.date, o.id); if (!ok) return; closeOv(); settle(); render(); toast('Removed'); };
ACT.surprise = () => { const k = surpriseActivity(me()); const a = ACTS[k]; openOv({ type: 'act', k, date: state.selDate, min: String(a.min), feel: null, hurt: false, note: '', name: '' }); burst({ count: 24, y: 0.35 }); };
ACT.filter = el => { state.filter.cat = el.dataset.cat; render(); };
ACT['filter-quick'] = () => { state.filter.quick = !state.filter.quick; render(); };
ACT['filter-fav'] = () => { state.filter.fav = !state.filter.fav; render(); };
ACT.rest = async () => { const ok = await logRest(state.selDate); if (!ok) return; render(); celebrate('Rest day logged. Recovery is part of the plan.'); };
ACT['rest-undo'] = async () => { await write(PATH.session(me(), state.selDate), null); settle(); render(); };

/* ---------- Program tab ---------- */
function renderProgram() {
  const t = todayIso(); const phase = phaseFor(t); const cw = completedWeeks(t); const ws = weekStats(t);
  let h = '<section class="card"><div class="eyebrow">How the rotation works</div><h2>Push → Pull → Legs, repeat</h2>' +
    '<p style="margin-top:8px">Days aren\'t tied to weekdays. The next lift is the one after your last <b>counted</b> lift day. Skip a morning and nothing goes out of sync. Every session opens with a Fitness+ treadmill workout. Aim for ' + ws.goal + ' activity mornings a week: ' + LIFT_GOAL + ' lifts, the rest treadmill-only.</p></section>';
  const upcoming = nextDayKey(addDays(t, 1)); const lastL = lastLift(addDays(t, 1));
  h += '<section class="card"><div class="row between"><div><div class="eyebrow">Progress</div><h3 style="font-family:var(--display);font-size:1.25rem">Week ' + (cw + 1) + ' · Phase ' + phase + (phase === 3 ? ' (full)' : '') + '</h3></div><span class="chip ' + (ws.lifts >= LIFT_GOAL ? 'good' : '') + '">' + ws.lifts + '/' + LIFT_GOAL + ' lift days this week</span></div>' +
    '<p style="margin-top:8px" id="nextLift"><b>Next lift day: ' + DAYS[upcoming].name + '</b>' + (lastL ? ' <span class="muted tiny">after ' + DAYS[lastL.n.day].name + ' on ' + nice(lastL.date) + '</span>' : ' <span class="muted tiny">first lift of the program</span>') + '</p>' +
    '<ul class="rules" style="margin-top:8px">' +
    '<li><b>Activity day:</b> a saved entry with treadmill minutes or any logged set. Rest entries don\'t count.</li>' +
    '<li><b>Lift day:</b> a saved entry where at least ' + QUALIFY_MIN + ' lifts (core moves don\'t count) have a logged set. Only lift days advance the rotation and earn lift credit. Session options under the notes field can override this either way.</li>' +
    '<li><b>Finished vs partial:</b> finished means every planned exercise has a logged set. Partial sessions still save and can still count.</li>' +
    '<li><b>Week complete:</b> ' + LIFT_GOAL + ' lift days Mon–Sun. Each completed week unlocks the next phase: Phase 2 adds exercises, Phase 3 swaps in squats, lunges and flys. Phase 3 is the full program.</li>' +
    '<li>Credit is computed from saved entries, so re-saving or editing never double-counts, and removing an entry removes its credit.</li></ul></section>';
  ROTATION.forEach(k => {
    const d = DAYS[k];
    h += '<section class="card"><div class="row between"><h3>' + d.name + ' day</h3><span class="muted tiny">' + d.sub + '</span></div><div class="plan"><ul>';
    h += '<li><span>Treadmill (Apple Fitness+)</span><span class="muted num">' + TREAD_MIN[phase] + ' min</span></li>';
    d.phases[phase].forEach(bk => {
      const key = (state.settings.swaps || {})[bk] && EX[state.settings.swaps[bk]] ? state.settings.swaps[bk] : bk; const ex = EX[key];
      h += '<li><span>' + esc(ex.name) + (key !== bk ? ' <span class="chip">default swap</span>' : '') + '<br><span class="tiny muted">' + esc(ex.equip) + (ex.per ? ' · weight per hand' : '') + '</span></span><span class="muted num">' + ex.sets + ' × ' + ex.lo + '–' + ex.hi + '</span></li>';
    });
    h += '</ul></div>';
    if (phase < 3) { const next = d.phases[phase + 1].filter(x => !d.phases[phase].includes(x)); if (next.length) h += '<p class="tiny muted" style="margin-top:8px">Unlocks in Phase ' + (phase + 1) + ': ' + next.map(x => EX[x].name).join(', ') + '.</p>'; }
    h += '</section>';
  });
  h += '<section class="card"><h3>Default swaps</h3><p class="tiny muted" style="margin-top:4px">Swap here to change every future workout. Swap from an exercise\'s ··· menu on the Log screen to change one workout only. Saved workouts keep whatever you did.</p><div class="plan" style="margin-top:8px"><ul>';
  Object.keys(EX).filter(k => EX[k].alt && !EX[k].bw && ROTATION.some(r => Object.values(DAYS[r].phases).some(p => p.includes(k)))).forEach(k => {
    const cur = (state.settings.swaps || {})[k] && EX[state.settings.swaps[k]] ? state.settings.swaps[k] : k;
    h += '<li><span>' + esc(EX[k].name) + (cur !== k ? ' → <b>' + esc(EX[cur].name) + '</b>' : '') + '</span><button type="button" class="small" data-gswap="' + k + '" data-to="' + (cur === k ? EX[k].alt : k) + '">' + (cur === k ? 'Use ' + esc(EX[EX[k].alt].name) : 'Undo') + '</button></li>';
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
    '<div class="row" style="margin-top:10px"><label class="f" style="flex:1">Weekly activity goal<input type="number" id="goalIn" inputmode="numeric" min="3" max="7" value="' + (state.settings.goal || GOAL) + '"></label></div></section>';
  return h;
}
const WEEK_SLOTS = { 1: [2], 2: [1, 4], 3: [0, 2, 5], 4: [0, 2, 4, 5], 5: [0, 1, 3, 4, 5], 6: [0, 1, 2, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6] };
function renderPlanChoice() {
  const pid = me(), p = P(pid), g = moveGoal(pid), mm = minMin(pid);
  const pool = ['walkeasy', 'stretchfull', 'walkpair', 'recbike', 'chairyoga', 'walkdinner', 'machines'].filter(k => !actCaution(pid, k).length);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let h = '<section class="card stack"><div><div class="eyebrow">Your plan</div><h2>Move ' + g + ' day' + (g === 1 ? '' : 's') + ' a week</h2></div>' +
    '<p>You choose what to do each time. A day counts once you log <b>' + mm + ' minutes</b> of movement, from one activity or several added together. Rest days are part of the plan and cost nothing.</p>' +
    '<div><div class="eyebrow">Active days each week</div><div class="seg" style="margin-top:4px">' + [2, 3, 4, 5, 6, 7].map(v => '<button type="button" data-a="move-goal" data-v="' + v + '" class="' + (g === v ? 'on' : '') + '" aria-pressed="' + (g === v) + '">' + v + '</button>').join('') + '</div></div>' +
    '<div><div class="eyebrow">Minutes that make a day count</div><div class="seg" style="margin-top:4px">' + [5, 10, 15, 20, 30].map(v => '<button type="button" data-a="move-min" data-v="' + v + '" class="' + (mm === v ? 'on' : '') + '" aria-pressed="' + (mm === v) + '">' + v + '</button>').join('') + '</div></div>' +
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
ACT.protect = async el => { const cur = P(me()).move.protect || [], k = el.dataset.k; await saveProfile(me(), { move: { protect: cur.includes(k) ? cur.filter(x => x !== k) : cur.concat([k]) } }); render(); };

/* ---------- History ---------- */
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
    else if (n.kind === 'activity') { const names = n.acts.map(actName); what = names.slice(0, 2).join(' + ') + (names.length > 2 ? ' +' + (names.length - 2) : ''); chip = di.active ? '<span class="chip good">active day</span>' : '<span class="chip warn">under ' + minMin(pid) + ' min</span>'; }
    else { what = 'No activity recorded'; chip = '<span class="chip bad">check</span>'; }
    const line = [];
    if (n.kind === 'activity') line.push(n.allMin + ' min');
    if (n.tm) line.push(n.tm.minutes > 0 ? n.tm.minutes + ' min treadmill' : 'treadmill, minutes not entered');
    if (n.keys.length) line.push(n.keys.length + ' exercise' + (n.keys.length === 1 ? '' : 's'));
    if (n.phase) line.push('Phase ' + n.phase);
    h += '<details class="hi" data-hdate="' + r.date + '"><summary><div class="hdate num">' + nice(r.date).replace(/^(\w+) /, '$1<br>') + '</div><div><b>' + esc(what) + '</b><div class="tiny muted">' + esc(line.join(' · ') || '—') + '</div></div>' + chip + '</summary><div class="hbody">';
    if (n.ambiguous) h += '<p class="tiny" style="color:var(--warn)">Saved as a lift day by the earlier version, but it has no lifting sets. Treated as ' + (n.kind === 'cardio' ? 'treadmill only' : 'no activity') + ' until you edit it.</p>';
    if (n.legacy && n.keys.length) h += '<p class="tiny muted">Saved by the earlier version: blank sets were stored as 0 and are shown as not logged.</p>';
    if (n.tm && n.tm.title) h += '<p>' + esc(n.tm.title) + '</p>';
    if (n.kind === 'activity') {
      h += '<div class="tbl"><table>' + n.acts.map(a => '<tr><td>' + actIcon(a) + ' ' + esc(actName(a)) + (a.hurt ? '<br><span class="tiny" style="color:var(--warn)">pain noted</span>' : '') + (a.note ? '<br><span class="tiny muted">' + esc(a.note) + '</span>' : '') + '</td><td>' + a.min + ' min' + (a.feel && FEELS[a.feel] ? ' · ' + FEELS[a.feel] : '') + '</td></tr>').join('') + '</table></div>';
    }
    if (n.keys.length) {
      const order = n.planned ? n.planned.filter(k => n.ex[k]).concat(n.keys.filter(k => !n.planned.includes(k))) : n.keys;
      h += '<div class="tbl"><table>' + order.map(k => {
        const e = n.ex[k]; const base = n.plannedBase && n.planned ? n.plannedBase[n.planned.indexOf(k)] : null;
        return '<tr><td>' + esc(EX[k].name) + (base && base !== k ? '<br><span class="tiny muted">instead of ' + esc(EX[base].name) + '</span>' : '') + '</td><td>' + esc((e.w != null ? fmtW(k, e.w) + ' × ' : '') + fmtReps(e.reps)) + '</td></tr>';
      }).join('') + '</table></div>';
      if (n.planned) { const skipped = n.planned.filter(k => !n.ex[k]); if (skipped.length) h += '<p class="tiny muted">Not logged: ' + skipped.map(k => EX[k].name).join(', ') + '.</p>'; }
      if (n.qualifyOverride != null) h += '<p class="tiny muted">Lift credit set by hand: ' + (n.qualifyOverride ? 'counted' : 'not counted') + '.</p>';
    }
    if (n.notes) h += '<p>“' + esc(n.notes) + '”</p>';
    h += '<div class="row"><button type="button" class="small" data-edit="' + r.date + '">Edit ' + nice(r.date) + '</button><button type="button" class="small ' + (state.confirmRemove === r.date ? 'danger' : '') + '" data-remove="' + r.date + '">' + (state.confirmRemove === r.date ? 'Tap again to remove ' + nice(r.date) : 'Remove') + '</button></div>';
    h += '</div></details>';
  });
  h += '</div></section>';

  const used = Object.keys(EX).filter(k => records().some(r => r.n.ex[k]));
  if (used.length || P(pid).plan === 'program') {
    h += '<section class="card"><h3>By exercise</h3>';
    if (!used.length) h += '<p class="muted tiny" style="margin-top:6px">Appears once a lift is saved.</p>';
    else {
      const sel = used.includes(state.exHist) ? state.exHist : used[0];
      h += '<select id="exHist" style="margin-top:8px" aria-label="Exercise">' + used.map(k => '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(EX[k].name) + '</option>').join('') + '</select>';
      const rows = records().filter(r => r.n.ex[sel]).reverse();
      h += '<div class="tbl" style="margin-top:8px"><table>' + rows.map(r => '<tr><td>' + nice(r.date) + '</td><td>' + esc((r.n.ex[sel].w != null ? fmtW(sel, r.n.ex[sel].w) + ' × ' : '') + fmtReps(r.n.ex[sel].reps)) + '</td></tr>').join('') + '</table></div>';
      h += '<p class="tiny muted" style="margin-top:6px">Target ' + EX[sel].sets + ' × ' + EX[sel].lo + '–' + EX[sel].hi + (EX[sel].per ? '. Weight is per hand.' : '.') + '</p>';
    }
    h += '</section>';
  }
  const tally = {}; records().forEach(r => r.n.acts.forEach(a => { const k = actName(a); tally[k] = tally[k] || { n: 0, min: 0, icon: actIcon(a) }; tally[k].n++; tally[k].min += a.min; }));
  const names = Object.keys(tally).sort((a, b) => tally[b].min - tally[a].min);
  if (names.length) h += '<section class="card"><h3>By activity</h3><div class="tbl" style="margin-top:8px"><table>' + names.slice(0, 12).map(k => '<tr><td>' + tally[k].icon + ' ' + esc(k) + '</td><td>' + tally[k].n + '× · ' + tally[k].min + ' min</td></tr>').join('') + '</table></div></section>';
  return h;
}
