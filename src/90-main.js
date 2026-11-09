/* ---------- Page chrome and the render loop ---------- */
const main = $('#main');
let typing = false, pendingRender = false;
const isTextField = el => !!(el && el.matches && el.matches('input[type=number], input[type=text], input[type=search], textarea') && main.contains(el));
function stripHTML() {
  const pid = me(), t = todayIso(), ws = weekStart(t), p = P(pid), sc = weekScore(pid, ws), o = otherPid(pid), os = weekScore(o, ws);
  const pips = (n, of, cls) => '<span class="pips">' + Array.from({ length: of }, (_, i) => '<span class="pip ' + cls + (i < n ? ' on' : '') + '"></span>').join('') + '</span>';
  let h;
  if (p.plan === 'program') { const w = weekStats(t); h = '<span>Activity <b id="actCount">' + w.activity + '/' + w.goal + '</b>' + pips(w.activity, w.goal, '') + '</span><span>Lifts <b id="liftCount">' + w.lifts + '/' + LIFT_GOAL + '</b>' + pips(w.lifts, LIFT_GOAL, 'lift') + '</span>'; }
  else { const g = moveGoal(pid); h = '<span>Active days <b id="actCount">' + sc.active + '/' + g + '</b>' + pips(sc.active, g, '') + '</span><span>Minutes <b id="minCount">' + sc.minutes + '</b></span>'; }
  return h + '<a href="#compete" aria-label="Weekly score">Score <b id="myScore">' + sc.total + '</b> · ' + esc(P(o).name) + ' <b id="theirScore">' + os.total + '</b></a>';
}
function renderChrome() {
  const pid = me(), p = P(pid), t = todayIso();
  $('#todayLine').textContent = nice(t) + (p.place ? ' · ' + p.place : '');
  $('#whoBtn').innerHTML = avatarHTML(pid) + '<span>' + esc(p.name) + '</span>';
  $('#strip').innerHTML = stripHTML();
  const top = ['train', 'program', 'history'].includes(state.tab) ? 'train' : state.tab;
  document.querySelectorAll('#tabs a').forEach(a => { const on = a.dataset.tab === top; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
}
function banners() {
  let html = '';
  if (state.storage === 'local') html += '<div class="banner">Saving in this browser only. Nothing here syncs to your account until you open the page signed in to claude.ai.</div>';
  if (state.cantWrite) html += '<div class="banner bad">This account can view the shared log but not save to it. Ask the owner to invite you as an Editor from the Share menu.</div>';
  if (state.storage === 'nodb') html += '<div class="banner bad">Your account log can\'t be reached right now, so nothing can be saved. Lifting inputs stay on this phone as drafts. Reload the page to try again.</div>';
  if (state.stale) html += '<div class="banner">Still loading your log. What you see may be out of date.</div>';
  if (state.localOnly && state.localOnly.length) html += '<div class="banner"><span>' + state.localOnly.length + ' entr' + (state.localOnly.length === 1 ? 'y' : 'ies') + ' saved in this browser ' + (state.localOnly.length === 1 ? 'is' : 'are') + ' not in your account.</span><div class="row"><button type="button" class="small" id="importBtn">Import to account</button><button type="button" class="small" id="importDismiss">Not now</button></div></div>';
  if (state.importNote) html += '<div class="banner good"><span>' + esc(state.importNote) + '</span><div class="row"><button type="button" class="small" id="importOk">OK</button></div></div>';
  return html;
}
// Open <details> are remembered across a redraw of the same tab, so a save from the other phone does not fold them shut.
const detKey = d => d.dataset.dk || (d.dataset.hdate ? 'h:' + d.dataset.hdate : '');
let drawnTab = null;
function newDay() { if (state.ready) { announce(); closeWeeks(); } } // a new day can bring last week's result and close an older week
function render(focusSel) {
  if (typing) { pendingRender = true; return; }
  pendingRender = false;
  if (rollDay()) setTimeout(newDay, 0);
  renderChrome();
  const tab = state.tab, plan = P(me()).plan;
  let html = banners();
  if (tab === 'train' || tab === 'program' || tab === 'history') html += subnav();
  html += tab === 'train' ? (plan === 'program' ? renderTrain() : renderMove())
    : tab === 'program' ? (plan === 'program' ? renderProgram() : renderPlanChoice())
    : tab === 'history' ? renderHistory() : tab === 'fuel' ? renderFuel() : tab === 'compete' ? renderCompete() : renderMe();
  const y = window.scrollY, open = {};
  if (drawnTab === tab) main.querySelectorAll('details[open]').forEach(d => { const k = detKey(d); if (k) open[k] = true; });
  main.innerHTML = html; drawnTab = tab;
  main.querySelectorAll('details').forEach(d => { if (open[detKey(d)]) d.open = true; });
  bind();
  if (focusSel) { const el = $(focusSel); if (el) el.focus({ preventScroll: true }); }
  if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y);
  if (state.scrollTo) { const el = document.getElementById(state.scrollTo); state.scrollTo = null; if (el) el.scrollIntoView({ block: 'start' }); }
}

/* ---------- Live (no re-render) updates while typing in the lifting log ---------- */
function refreshLive(date) {
  const m = model(date);
  const sl = $('#statusLine'); if (sl) sl.textContent = statusText(date);
  const sb = $('#savebar'); if (sb) { const tmp = document.createElement('div'); tmp.innerHTML = renderSaveBar(date, m, state.sessions[date]); sb.replaceWith(tmp.firstElementChild); bindSaveBar(); }
  document.querySelectorAll('.ex[data-ex]').forEach(el => {
    const key = el.dataset.ex; const ex = EX[key]; const e = m.ex[key] || { w: '', reps: [] };
    const nSets = el.querySelectorAll('[data-field="rep"]').length || setCount(key, m, date);
    const sm = exSummary(key, e, nSets);
    const prog = el.querySelector('[data-prog]');
    if (prog) { prog.hidden = !sm.loggedN; prog.innerHTML = '<span><b>' + sm.loggedN + '/' + nSets + '</b> sets logged</span>' + (sm.done ? '<button type="button" class="quiet" data-collapse="' + key + '">Collapse</button>' : ''); const cb = prog.querySelector('[data-collapse]'); if (cb) cb.addEventListener('click', onCollapse); }
    const use = el.querySelector('[data-usew]'); if (use) use.hidden = ex.bw || String(e.w) === String(use.dataset.val);
    const cs = el.querySelector('[data-sum]'); if (cs) cs.innerHTML = sm.line ? '<b>' + esc(sm.line) + '</b> · ' + sm.loggedN + '/' + nSets + ' logged' : 'Nothing logged';
  });
  document.querySelectorAll('.datebar [data-date]').forEach(b => { const dot = b.querySelector('.dot'); if (dot) dot.className = 'dot ' + dotClass(b.dataset.date, b.parentNode.dataset.mode); });
  const ca = $('#countAs'); if (ca && m.countAs == null) { const r = parseDraft(date, m); ca.checked = r.kind === 'strength' ? r.auto : false; }
}

/* ---------- Events ---------- */
main.addEventListener('input', e => {
  const el = e.target; const f = el.dataset.field; if (!f) return;
  const date = state.selDate; const d = draft(date);
  if (f === 'tmMin') d.tm.minutes = el.value;
  else if (f === 'tmTitle') d.tm.title = el.value;
  else if (f === 'notes') d.notes = el.value;
  else if (f === 'w' || f === 'rep') {
    const key = el.dataset.ex; d.ex[key] = d.ex[key] || { w: '', reps: [] };
    if (f === 'w') d.ex[key].w = el.value;
    else { const i = Number(el.dataset.i); while (d.ex[key].reps.length <= i) d.ex[key].reps.push(''); d.ex[key].reps[i] = el.value; }
  }
  d.recovered = false; delete state.formError[date]; persistDrafts(); refreshLive(date);
});
// half-filled forms (targets, name, stakes) live in state.forms so a re-render never drops what was typed
function onFormInput(e) { const el = e.target; if (!el.dataset || !el.dataset.form) return; (state.forms[el.dataset.form] = state.forms[el.dataset.form] || {})[el.dataset.k] = el.value; }
document.addEventListener('input', onFormInput);
document.addEventListener('change', onFormInput);
// while a text field in the page has focus, re-renders wait (so the keyboard and caret stay put)
main.addEventListener('focusin', e => { if (isTextField(e.target)) typing = true; });
main.addEventListener('focusout', e => {
  if (!isTextField(e.target) || isTextField(e.relatedTarget)) return;
  typing = false;
  // a waiting re-render runs after the tap that took focus away has finished, so it cannot swallow that tap
  if (pendingRender) setTimeout(() => { if (pendingRender && !typing) render(); }, 300);
});
// one click handler for every data-a action, in the page and in overlays
// Actions that save one thing per tap. A second tap while the first is still saving is dropped, so a slow
// connection cannot log the same food or activity twice. Water is left out on purpose: tapping it twice means two glasses.
const ONE_AT_A_TIME = ['act-log', 'act-del', 'rest', 'food-save', 'food-again', 'food-del', 'quick-save', 'custom-save', 'hk-import', 'body-save', 'weigh-save', 'name-save', 'stakes-save'];
const busy = {};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const a = el.dataset.a, fn = ACT[a]; if (!fn) return;
  if (el.tagName === 'A') e.preventDefault();
  if (main.contains(el)) typing = false;
  if (!ONE_AT_A_TIME.includes(a)) { fn(el, e); return; }
  if (busy[a]) return;
  busy[a] = true;
  const free = () => { busy[a] = false; };
  let r; try { r = fn(el, e); } catch (err) { free(); throw err; }
  Promise.resolve(r).then(free, err => { free(); throw err; });
});
// overlay fields write straight into the overlay's state
const ovRoot = $('#ov');
function onOvInput(e) {
  const el = e.target, o = state.ov; if (!o || !el.dataset || !el.dataset.ovf) return;
  const key = el.dataset.ovf, typed = e.type === 'input';
  o[key] = el.value;
  // Lists are only redrawn while typing. A field also fires "change" when it loses focus, which happens in the
  // middle of a tap on a result; redrawing then would replace the thing being tapped and swallow the tap.
  if (o.type === 'food' && key === 'q') { if (typed) { clearTimeout(foodT); foodT = setTimeout(fillFoodResults, 90); } }
  else if (o.type === 'health') { if (typed) refreshHealthPreview(); }
  else if (o.type === 'fooditem') refreshFoodItem(); // patches the label and button text in place
  else if (o.type === 'act' && key === 'min') { const b = $('#actLog'), min = Math.round(Number(el.value)); if (b) { b.disabled = !(min > 0); b.textContent = (o.id ? 'Update ' : 'Log ') + (min > 0 ? min + ' min' : ''); } }
}
ovRoot.addEventListener('input', onOvInput);
ovRoot.addEventListener('change', onOvInput);
ovRoot.addEventListener('click', e => { if (e.target === ovRoot && state.ov) { const def = OV[state.ov.type]; if (!(def.locked && def.locked(state.ov))) closeOv(); } });
document.addEventListener('change', e => { if (e.target.id === 'skinColor') { saveProfile(me(), { skin: { custom: e.target.value } }).then(() => { applySkin(); render(); }); } });
document.addEventListener('input', e => { // live preview while dragging in the color picker
  if (e.target.id !== 'skinColor') return;
  const v = skinVars({ custom: e.target.value }), st = document.documentElement.style;
  st.setProperty('--ah', v.ah); st.setProperty('--as', v.as + '%'); st.setProperty('--al', v.al + '%'); st.setProperty('--ald', v.ald + '%'); st.setProperty('--nh', v.nh); st.setProperty('--ns', v.ns + '%');
  if (v.ink) st.setProperty('--aink', v.ink); else st.removeProperty('--aink');
});
// exercise menus: close on outside tap or Escape; arrow keys move between items
document.addEventListener('click', e => { if (state.menu && !e.target.closest('.menu') && !e.target.closest('.menubtn')) { const k = state.menu.key; state.menu = null; render('[data-menu="' + k + '"]'); } });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.ov) { const def = OV[state.ov.type]; if (!(def.locked && def.locked(state.ov))) { closeOv(); e.preventDefault(); } return; }
  if (!state.menu) return;
  const items = Array.from(document.querySelectorAll('.menu [role="menuitem"]:not(:disabled)'));
  if (e.key === 'Escape') { const k = state.menu.key; state.menu = null; render('[data-menu="' + k + '"]'); e.preventDefault(); }
  else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { const i = items.indexOf(document.activeElement); const n = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length; if (items[n]) items[n].focus(); e.preventDefault(); }
});
function onCollapse(ev) { const key = ev.currentTarget.dataset.collapse; const d = draft(state.selDate); d.closed[key] = true; persistDrafts(); render('[data-menu="' + key + '"]'); }
function menuAction(act, b) {
  const key = b.dataset.key; const date = state.selDate;
  if (act === 'swap') { state.menu = { key, view: 'swap' }; render('.menu [role="menuitem"]'); return; }
  if (act === 'back') { state.menu = { key, view: 'main' }; render('.menu [role="menuitem"]'); return; }
  if (act === 'swapto') { const d = draft(date); d.swaps[b.dataset.base] = b.dataset.to; d.recovered = false; state.menu = null; persistDrafts(); render('[data-menu="' + b.dataset.to + '"]'); return; }
  if (act === 'hold') { const mx = Object.assign({}, state.settings.maxed || {}); if (mx[key]) delete mx[key]; else mx[key] = true; state.menu = null; saveSettings({ maxed: mx }); const btn = document.querySelector('[data-menu="' + key + '"]'); if (btn) btn.focus({ preventScroll: true }); return; }
  if (act === 'addset') { const d = draft(date); const cur = document.querySelectorAll('[data-field="rep"][data-ex="' + key + '"]').length; d.extra[key] = Math.min(MAX_SETS, cur + 1); state.menu = null; persistDrafts(); render(); const inp = document.getElementById('r-' + key + '-' + (d.extra[key] - 1)); if (inp) inp.focus({ preventScroll: true }); return; }
  if (act === 'details') { state.details[key] = !state.details[key]; state.menu = null; render('[data-menu="' + key + '"]'); return; }
  if (act === 'collapse') { const d = draft(date); d.closed[key] = true; state.menu = null; persistDrafts(); render('[data-menu="' + key + '"]'); return; }
  if (act === 'expand') { const d = draft(date); delete d.closed[key]; state.menu = null; persistDrafts(); render('[data-menu="' + key + '"]'); return; }
}
function bind() {
  const dp = $('#datePick'); if (dp) dp.addEventListener('change', e => { const v = e.target.value; if (validIso(v) && v <= todayIso()) { state.selDate = v; state.confirmRemove = null; state.menu = null; persistDrafts(); render(); } else if (v) toast('Pick today or an earlier day.'); });
  document.querySelectorAll('[data-date]').forEach(b => b.addEventListener('click', () => { state.selDate = b.dataset.date; state.confirmRemove = null; state.menu = null; persistDrafts(); render(); }));
  document.querySelectorAll('#kindSeg [data-kind]').forEach(b => b.addEventListener('click', () => { const d = draft(state.selDate); d.kindSel = b.dataset.kind; d.recovered = false; state.menu = null; persistDrafts(); render(); }));
  document.querySelectorAll('[data-menu]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const key = b.dataset.menu; if (state.menu && state.menu.key === key) { state.menu = null; render('[data-menu="' + key + '"]'); } else { state.menu = { key, view: 'main' }; render('.menu [role="menuitem"]'); } }));
  document.querySelectorAll('.menu [data-act]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); menuAction(b.dataset.act, b); }));
  document.querySelectorAll('[data-gswap]').forEach(b => b.addEventListener('click', () => { const sw = Object.assign({}, state.settings.swaps || {}); if (b.dataset.to === b.dataset.gswap) delete sw[b.dataset.gswap]; else sw[b.dataset.gswap] = b.dataset.to; saveSettings({ swaps: sw }); }));
  document.querySelectorAll('[data-usew]').forEach(b => b.addEventListener('click', () => { const key = b.dataset.usew; const d = draft(state.selDate); d.ex[key] = d.ex[key] || { w: '', reps: [] }; d.ex[key].w = b.dataset.val; const inp = document.getElementById('w-' + key); if (inp) inp.value = b.dataset.val; d.recovered = false; persistDrafts(); refreshLive(state.selDate); const first = document.getElementById('r-' + key + '-0'); if (first && first.value === '') first.focus({ preventScroll: true }); }));
  document.querySelectorAll('[data-collapse]').forEach(b => b.addEventListener('click', onCollapse));
  document.querySelectorAll('[data-expand]').forEach(b => b.addEventListener('click', () => { const key = b.dataset.expand; const d = draft(state.selDate); delete d.closed[key]; persistDrafts(); render('[data-menu="' + key + '"]'); }));
  document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => { state.selDate = b.dataset.edit; state.confirmRemove = null; persistDrafts(); location.hash = 'train'; if (state.tab === 'train') render(); }));
  document.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => { const d = b.dataset.remove; if (state.confirmRemove === d) removeRecord(d); else { state.confirmRemove = d; render(); const det = document.querySelector('details[data-hdate="' + d + '"]'); if (det) det.open = true; } }));
  bindSaveBar();
  const goal = $('#goalIn'); if (goal) goal.addEventListener('change', e => { const v = Math.max(3, Math.min(7, Number(e.target.value) || GOAL)); typing = false; saveSettings({ goal: v }).then(settle); });
  const form = $('#logForm'); if (form) form.addEventListener('submit', e => { e.preventDefault(); save(); });
  const ca = $('#countAs'); if (ca) ca.addEventListener('change', () => { const d = draft(state.selDate); d.countAs = ca.checked; persistDrafts(); refreshLive(state.selDate); });
  const dd = $('#discardDraft'); if (dd) dd.addEventListener('click', () => { delete state.drafts[state.selDate]; delete state.formError[state.selDate]; persistDrafts(); render(); toast('Draft discarded'); });
  const eh = $('#exHist'); if (eh) eh.addEventListener('change', e => { state.exHist = e.target.value; render(); });
  const ib = $('#importBtn'); if (ib) ib.addEventListener('click', importLocal);
  const idm = $('#importDismiss'); if (idm) idm.addEventListener('click', () => { state.localOnly = null; render(); });
  const iok = $('#importOk'); if (iok) iok.addEventListener('click', () => { state.importNote = null; render(); });
}
function bindSaveBar() {
  const sb = $('#saveBtn'); if (sb) sb.addEventListener('click', save);
  const del = $('#delBtn'); if (del) del.addEventListener('click', () => { if (state.confirmRemove === state.selDate) removeRecord(state.selDate); else { state.confirmRemove = state.selDate; refreshLive(state.selDate); } });
}
function save() {
  const date = state.selDate;
  if (date > todayIso()) { toast('Future dates can\'t be saved as activity.'); return; }
  const m = model(date); const r = parseDraft(date, m);
  if (r.errors.length) {
    state.formError[date] = r.errors[0]; refreshLive(date); toast(r.errors[0], 3200);
    const k = Object.keys(EX).find(k => r.errors[0].startsWith(EX[k].name)); const inp = k ? document.getElementById('w-' + k) : null; if (inp) inp.focus(); return;
  }
  delete state.formError[date]; state.menu = null; typing = false;
  const note = saveNote(date, m), before = scoreSnapshot();
  saveRecord(date, r.doc).then(ok => {
    if (ok === false) return; // nothing was attempted: the log is not loaded yet
    const st = state.status[date];
    if (st && st.s === 'failed') { toast('Save failed. Your inputs are kept; tap Retry.', 3200); return; }
    const msg = r.kind === 'cardio' && r.fromLift ? r.doc.treadmill.minutes + ' treadmill minutes saved. No lifting sets recorded; ' + DAYS[nextDayKey(date)].name + ' remains next.'
      : r.kind === 'strength' ? (note ? note.text : DAYS[r.doc.day].name + ' day saved · counts as lift day · next: ' + DAYS[ROTATION[(ROTATION.indexOf(r.doc.day) + 1) % 3]].name)
      : r.kind === 'rest' ? 'Rest day saved.' : 'Treadmill saved.';
    celebrate(msg + (st && st.s === 'synced' ? ' Synced.' : st && st.s === 'local' ? ' Saved in this browser.' : ''), { ms: 3800, before });
  });
  if (state.ready && !state.settings.startDate) saveSettings({ startDate: date < todayIso() ? date : todayIso() });
}

/* ---------- Routing and boot ---------- */
const TABS = ['train', 'program', 'history', 'fuel', 'compete', 'me'];
function route() {
  const h = (location.hash || '#train').slice(1), tab = TABS.includes(h) ? h : 'train', changed = tab !== state.tab;
  state.tab = tab; state.confirmRemove = null; state.menu = null; typing = false;
  const jump = state.scrollTo;
  render();
  if (changed && !jump) window.scrollTo(0, 0);
}
window.MorningLaps = { state, P, weekScore, coach, goalsFor, badgesFor, searchFoods, loadFoods, dayTotals, compWeeks, parseHealthPaste, foodCount: () => foodDb.list ? foodDb.list.length : 0 };
(function boot() {
  const saved = lsGet('ml.me', null);
  state.pid = PIDS.includes(saved) ? saved : null;
  applySkin();
  window.addEventListener('hashchange', route);
  // a phone left open overnight: when it comes back to the front on a new day, move "today" forward
  const wake = () => { if (document.visibilityState === 'hidden' || !rollDay()) return; render(); newDay(); };
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('pageshow', wake);
  window.addEventListener('focus', wake);
  route();
  if (!state.pid) openOv({ type: 'who', first: true });
  connect();
})();
