/* ---------- 66-guide.js: the guide for every move ---------- */
// One guide per exercise, circuit station and stretch: the moving picture (58-figure.js, 59-figures.js), the how-to
// card (59-guide-text.js), and "My settings", a short note per person per move that is kept on that person's profile.
// The guide opens in its own sheet (#gd) above whatever is on screen, so the lift sheet under it keeps its typed sets,
// its place and its rest timer. Live mode shows the same card inside its own screen. Nothing here changes a score.
const GD_STATIONS = ['st_legpress', 'st_row', 'st_chest', 'st_latpull']; // in CIRCUIT order
const gdKind = key => EX[key] ? 'lift' : GD_STATIONS.includes(key) ? 'station' : 'stretch';
function gdName(key) {
  if (EX[key]) return EX[key].name;
  const i = GD_STATIONS.indexOf(key); if (i >= 0) return CIRCUIT[i] + ' (light circuit)';
  const s = STRETCHES.find(x => x.g === key); return s ? s.name : key;
}
const gdSub = key => EX[key] ? EX[key].equip : gdKind(key) === 'station' ? 'Healthplex machine circuit' : 'Cool-down stretch';
const gdAnd = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];

/* --- "Feel it in": a small front and back body with the working muscles filled in --- */
const MM_NAME = { chest: 'chest', shoulders: 'shoulders', reardelts: 'back of the shoulders', biceps: 'biceps', triceps: 'triceps', forearms: 'forearms', abs: 'abs', obliques: 'side abs', lats: 'lats', traps: 'upper back and neck', midback: 'middle of the back',
  lowerback: 'lower back', glutes: 'glutes', quads: 'front of the thighs', hamstrings: 'back of the thighs', calves: 'calves', innerthigh: 'inner thighs', hips: 'front of the hips' };
function mmBody(cx, back, cls) {
  const n = v => Math.round(v * 10) / 10, both = fn => fn(1) + fn(-1);
  const line = (c, x1, y1, x2, y2, w) => both(s => '<path class="' + c + ' mml" stroke-width="' + w + '" d="M' + n(cx + s * x1) + ' ' + y1 + 'L' + n(cx + s * x2) + ' ' + y2 + '"/>');
  const oval = (c, x, y, rx, ry) => both(s => '<ellipse class="' + c + ' mmf" cx="' + n(cx + s * x) + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '"/>');
  const box = (c, w, y, h) => '<rect class="' + c + ' mmf" x="' + n(cx - w / 2) + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3"/>';
  const poly = (c, pts) => '<path class="' + c + ' mmf" d="M' + pts.map(p => n(cx + p[0]) + ' ' + p[1]).join('L') + 'Z"/>';
  // the body itself, in a quiet tone
  let h = '<circle class="mmb mmf" cx="' + cx + '" cy="9" r="6.5"/><path class="mmb mml" stroke-width="5" d="M' + cx + ' 15V19"/>' +
    '<path class="mmb mmf mmo" d="M' + n(cx - 15) + ' 20H' + n(cx + 15) + 'L' + n(cx + 11) + ' 57L' + n(cx + 12.5) + ' 68H' + n(cx - 12.5) + 'L' + n(cx - 11) + ' 57Z"/>' +
    line('mmb', 17.5, 23, 20.5, 44, 7) + line('mmb', 20.5, 44, 22.5, 63, 5.6) + oval('mmb', 23, 67.5, 3, 3) + line('mmb', 7.6, 69, 8, 96, 10.6) + line('mmb', 8, 96, 8, 121, 7.2) + oval('mmb', 8.6, 125.6, 3.8, 2.3);
  if (!back) h += oval(cls('shoulders'), 16.5, 24.5, 4.8, 5.2) + oval(cls('chest'), 6.2, 29.5, 5.8, 4.8) + line(cls('biceps'), 18.3, 31.5, 19.8, 41.5, 5.4) + line(cls('forearms'), 20.9, 47.5, 22.2, 60.5, 4.6) +
    box(cls('abs'), 8.8, 36.5, 21.5) + line(cls('obliques'), 8.6, 39, 7.8, 56.5, 4) + oval(cls('hips'), 7.2, 65, 4.2, 3) + line(cls('quads'), 8.6, 74, 8.3, 93, 8.2) + line(cls('innerthigh'), 2.9, 72, 3.8, 85, 3);
  else h += poly(cls('traps'), [[0, 15.5], [11, 22.5], [0, 28], [-11, 22.5]]) + oval(cls('reardelts'), 16.5, 24.5, 4.8, 5.2) + box(cls('midback'), 12, 29.5, 11) +
    both(s => poly(cls('lats'), [[s * 13.6, 30], [s * 7.4, 31], [s * 6, 53], [s * 10.8, 55.5]])) + box(cls('lowerback'), 9.6, 42.5, 15) + line(cls('triceps'), 18.3, 31.5, 19.8, 41.5, 5.4) + line(cls('forearms'), 20.9, 47.5, 22.2, 60.5, 4.6) +
    oval(cls('glutes'), 6.3, 66, 6, 5.4) + line(cls('hamstrings'), 8.3, 77, 8.2, 93, 8.2) + line(cls('calves'), 8, 101, 8, 113, 6.4);
  return h + '<text class="mmt" x="' + cx + '" y="137" text-anchor="middle">' + (back ? 'Back' : 'Front') + '</text>';
}
function mmHTML(main, also) {
  main = (main || []).filter(k => MM_NAME[k]); also = (also || []).filter(k => MM_NAME[k] && !main.includes(k));
  const cls = k => 'mm' + (main.includes(k) ? ' on' : also.includes(k) ? ' also' : ''), words = a => a.map(k => MM_NAME[k]).join(', ');
  return '<div class="mmwrap"><svg class="mmap" viewBox="0 0 132 140" role="img" aria-label="Front and back of the body. Working most: ' + esc(words(main)) + (also.length ? '. Helping: ' + esc(words(also)) : '') + '.">' + mmBody(33, false, cls) + mmBody(99, true, cls) + '</svg>' +
    '<div class="mmkey"><p><i class="mmdot on"></i><span><b>Mostly</b> ' + esc(words(main)) + '</span></p>' + (also.length ? '<p><i class="mmdot also"></i><span><b>Also</b> ' + esc(words(also)) + '</span></p>' : '') + '</div></div>';
}

/* --- "My settings": one short line per person per move, kept on the profile --- */
const gdDraft = {}; // typed and not saved yet, so a redraw never drops it
const gearOf = (pid, key) => (P(pid).gear || {})[key] || {};
const mySetLine = (pid, key) => { const n = gearOf(pid, key).note; return n ? '<div class="myset" data-myset="' + key + '"><span class="muted">My settings:</span> ' + esc(n) + '</div>' : ''; };
// an example of what is worth writing down, for the equipment this move uses
function gdHint(key) {
  const e = EX[key] ? EX[key].equip.toLowerCase() : '';
  if (gdKind(key) === 'station' || (/machine/.test(e) && !/cable/.test(e))) return 'Seat 4 · back pad 2 · handles middle';
  if (/cable/.test(e)) return 'Pulley at 12 · pin at 40';
  if (/rack|barbell/.test(e)) return 'Rack 2 · hooks at 14 · safeties at 6';
  if (/bench/.test(e)) return 'Bench notch 3 · by the mirror';
  if (/mat/.test(e)) return 'Mat by the window';
  return 'Dumbbell rack, left end';
}
function mySetHTML(key, pid) {
  const dk = pid + ':' + key, v = dk in gdDraft ? gdDraft[dk] : gearOf(pid, key).note || '';
  return '<section class="gsec gmine" data-mine="' + key + '"><h4>My settings</h4><div class="gset"><input type="text" class="gsetin" id="gdSet" data-gk="' + key + '" data-pid="' + pid + '" maxlength="60" value="' + esc(v) + '" placeholder="' + esc(gdHint(key)) + '" aria-label="My settings for ' + esc(gdName(key)) + '" enterkeyhint="done" autocomplete="off">' +
    '<button type="button" class="small" id="gdSetSave" data-a="guide-set-save" data-k="' + key + '">Save</button></div><p class="tiny muted">Only for you. It shows under the name when you log this.</p>' + myPhotoHTML(key, pid) + '</section>';
}
document.addEventListener('input', e => { const el = e.target; if (el.classList && el.classList.contains('gsetin')) gdDraft[el.dataset.pid + ':' + el.dataset.gk] = el.value; });
document.addEventListener('keydown', e => { const el = e.target; if (e.key === 'Enter' && el.classList && el.classList.contains('gsetin')) { e.preventDefault(); const b = el.parentNode.querySelector('[data-a="guide-set-save"]'); if (b) b.click(); } });
// One move's settings on the profile: `patch` sets fields, and a null or empty value removes one. A move with nothing
// left is removed from the map, so the profile only ever holds what a person set.
async function saveGear(pid, key, patch) {
  const all = Object.assign({}, (state.data[pid].profile || {}).gear), cur = Object.assign({}, all[key]);
  Object.keys(patch).forEach(k => { if (patch[k] == null || patch[k] === '') delete cur[k]; else cur[k] = patch[k]; });
  if (Object.keys(cur).length) all[key] = cur; else delete all[key];
  return saveProfile(pid, { gear: all });
}
const gdRefresh = page => { if (wm) wmDraw(); else { if (page) render(); renderGuide(); } };
ACT['guide-set-save'] = async el => {
  const key = el.dataset.k, inp = el.parentNode.querySelector('.gsetin'), pid = (inp && inp.dataset.pid) || me(), v = String(inp ? inp.value : '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if ((gearOf(pid, key).note || '') === v) { delete gdDraft[pid + ':' + key]; toast(v ? 'Already saved.' : 'Type your settings first, like "Seat 4".'); return; }
  if (!(await saveGear(pid, key, { note: v }))) return;
  delete gdDraft[pid + ':' + key];
  toast(v ? 'Settings saved.' : 'Settings cleared.');
  gdRefresh(true);
};

/* --- a photo of the machine, next to My settings --- */
// Storing a photo needs the `assets` ability, which only some viewers are given: without it the buttons are not drawn.
// The photo is shrunk to about 1200 px and re-encoded as a JPEG before it leaves the phone, which also drops the
// camera's location data. The profile keeps only the id. A photo is deleted from storage in two cases, both a tap by
// its owner: Delete, and Replace once the new one is saved, so a replaced photo is not left where others could open it.
const GD_PHOTO_MAX = 1200;
const gdBusy = {}; // pid:key while a photo is being stored or removed
const gdPhotoOk = id => typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id);
function myPhotoHTML(key, pid) {
  const id = gearOf(pid, key).photo, has = gdPhotoOk(id), can = !!caps.assets, busy = !!gdBusy[pid + ':' + key];
  if (!has && !can) return '';
  const pick = label => '<label class="filebtn small gphotobtn"' + (busy ? ' aria-disabled="true"' : '') + '>' + (busy ? 'Working…' : label) + '<input type="file" class="gphotoin" accept="image/*" capture="environment" data-gk="' + key + '" data-pid="' + pid + '" aria-label="' + label + '"' + (busy ? ' disabled' : '') + '></label>';
  return '<div class="gphotowrap" data-photo="' + key + '">' +
    (has ? '<img class="gphoto" src="/_blob/' + id + '" alt="My photo of the ' + esc(gdName(key)) + '" decoding="async">' : '') +
    (can ? '<div class="gphotoacts">' + pick(has ? 'Replace photo' : 'Add a photo of the machine I use') + (has ? '<button type="button" class="small" id="gdPhotoDel" data-a="guide-photo-del" data-k="' + key + '" data-pid="' + pid + '"' + (busy ? ' disabled' : '') + '>Delete photo</button>' : '') + '</div>' +
      '<p class="tiny muted gphotonote">Anyone who can open this app can see these photos. Keep people out of the shot.</p>' : '') + '</div>';
}
function gdPhotoWhy(e) {
  const c = e && e.code;
  if (c === 'not_granted' || c === 'capability_disabled' || c === 'capability_removed') { caps.assets = null; return 'Photos cannot be stored from this view.'; }
  return c === 'too_large' ? 'That photo is too large to store.' : c === 'unsupported_type' ? 'That kind of file cannot be stored. Try a normal photo.' : c === 'quota_or_state' ? 'Photo storage is full or not available right now.' :
    c === 'rate_limited' ? 'Too many uploads just now. Try again in a minute.' : c === 'upstream_auth' ? 'Could not confirm who you are. Reload the page and try again.' : c === 'image' ? 'That photo could not be read. Try another one.' : 'The photo was not saved. Try again.';
}
async function gdPhotoPick(key, pid, file) {
  const a = caps.assets, dk = pid + ':' + key; if (!a || gdBusy[dk] || !GUIDE[key]) return;
  gdBusy[dk] = true; gdRefresh(); let msg = '';
  try {
    let img; try { img = await loadImage(file); } catch (e) { throw { code: 'image' }; }
    const blob = await toJpeg(drawTo(img, GD_PHOTO_MAX, false, 1), 0.82); if (!blob) throw { code: 'image' };
    let up; try { up = await a.upload(blob, { type: 'image/jpeg' }); }
    catch (e) { if (!e || e.code !== 'store_unavailable') throw e; await new Promise(r => setTimeout(r, 900)); up = await a.upload(blob, { type: 'image/jpeg' }); } // the one code worth a second try
    if (!up || !gdPhotoOk(up.id)) throw { code: 'upstream_error' };
    const old = gearOf(pid, key).photo;
    if (await saveGear(pid, key, { photo: up.id })) { msg = gdPhotoOk(old) ? 'Photo replaced.' : 'Photo added.'; if (gdPhotoOk(old) && old !== up.id) { try { await a.delete(old); } catch (e) { /* the old file stays; nothing points at it */ } } }
    else { try { await a.delete(up.id); } catch (e) { /* not stored on the profile, so not shown */ } } // the save said why
  } catch (e) { msg = gdPhotoWhy(e); }
  delete gdBusy[dk]; gdRefresh(); if (msg) toast(msg, 3200);
}
document.addEventListener('change', e => { const el = e.target; if (!el || el.type !== 'file' || !el.classList || !el.classList.contains('gphotoin')) return;
  const f = el.files && el.files[0]; el.value = ''; if (f) gdPhotoPick(el.dataset.gk, el.dataset.pid || me(), f); });
// Delete: first the profile stops pointing at the photo, then the file itself is removed. Only this tap does it.
ACT['guide-photo-del'] = async el => {
  const key = el.dataset.k, pid = el.dataset.pid || me(), dk = pid + ':' + key, a = caps.assets, id = gearOf(pid, key).photo; if (!a || !gdPhotoOk(id) || gdBusy[dk]) return;
  gdBusy[dk] = true; gdRefresh(); let msg = '';
  if (await saveGear(pid, key, { photo: null })) { msg = 'Photo deleted.';
    try { await a.delete(id); } catch (e) { msg = e && e.code === 'not_uploader' ? 'Removed from your settings. Only the person who added that photo can delete the file.' : 'Removed from your settings. The file could not be deleted right now.'; } }
  delete gdBusy[dk]; gdRefresh(); if (msg) toast(msg, 3200);
};
// a photo that does not load (deleted elsewhere, or not served to this viewer) leaves a short line, not a broken picture
document.addEventListener('error', e => { const t = e.target; if (t && t.classList && t.classList.contains('gphoto') && !t.hidden) { t.hidden = true; t.insertAdjacentHTML('afterend', '<p class="tiny muted gphotomiss">The photo could not be shown here.</p>'); } }, true);

/* --- "Watch a demo": a plain link to a YouTube search for this exact move, opened outside the app --- */
// Nothing is embedded and nothing is fetched: the page cannot play outside video, so this is only a link.
function watchQuery(key) {
  const kind = gdKind(key), base = (kind === 'lift' ? EX[key].name : kind === 'station' ? CIRCUIT[GD_STATIONS.indexOf(key)] + ' machine' : gdName(key)).toLowerCase().replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ').trim();
  return base + (kind === 'stretch' ? (/stretch/.test(base) ? '' : ' stretch') + ' how to' : ' proper form');
}
const watchUrl = key => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(watchQuery(key)).replace(/%20/g, '+');
const watchHTML = key => '<p class="gwatch"><a href="' + esc(watchUrl(key)) + '" target="_blank" rel="noopener noreferrer" data-watch="' + key + '">Watch a demo<span aria-hidden="true"> ↗</span></a><span class="tiny muted">Opens a YouTube search for "' + esc(watchQuery(key)) + '" outside the app.</span></p>';

/* --- the how-to card --- */
// ctx: { pid, from: 'lift' | 'live' | 'lib', swap: [the exercises this slot of the open workout can swap to] }
function guideCardHTML(key, ctx) {
  const G = GUIDE[key]; if (!G) return '';
  ctx = ctx || {}; const pid = ctx.pid || me(), kind = gdKind(key), swap = ctx.swap || [];
  const hit = (G.stress || []).filter(a => AREAS[a] && (P(pid).move.protect || []).includes(a));
  const sec = (id, title, body) => '<section class="gsec" data-sec="' + id + '"><h4>' + title + '</h4>' + body + '</section>', ol = a => '<ol>' + a.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol>';
  const alt = (label, a) => { if (!a) return '';
    const ok = a.k && EX[a.k], btn = ok && swap.includes(a.k) ? '<button type="button" class="small" data-a="guide-swap" data-to="' + a.k + '">Swap to it</button>' : ok && ctx.from !== 'live' ? '<button type="button" class="small" data-a="guide-open" data-k="' + a.k + '" data-from="' + (ctx.from === 'lift' ? 'lift' : 'lib') + '">See it</button>' : '';
    return '<div class="galt" data-alt="' + label.toLowerCase() + '"><div><span class="eyebrow">' + label + '</span><p>' + esc(a.text) + '</p></div>' + btn + '</div>'; };
  let h = '<div class="gcard" data-guide="' + key + '">' + watchHTML(key);
  if (hit.length) h += '<p class="banner geasy" data-easy="' + hit.join(',') + '"><span><b>Go easy on your ' + esc(gdAnd(hit.map(a => AREAS[a].toLowerCase()))) + '.</b> This move loads ' + (hit.length > 1 || /s$/.test(AREAS[hit[0]]) ? 'them' : 'it') + '. ' +
    (kind === 'stretch' ? 'Stay well short of any pain, and ease out slowly.' : 'Keep the weight light, move slowly, and stop if anything feels sharp.') + '</span></p>';
  h += sec('equip', 'Equipment', '<p><b>' + esc(G.equip) + '</b>' + (EX[key] && EX[key].per ? ' <span class="muted">The weight you log is one dumbbell, not the pair.</span>' : '') + '</p><p class="muted">' + esc(G.where) + '</p>');
  if (kind !== 'stretch') h += mySetHTML(key, pid);
  h += sec('setup', 'Set up', ol(G.setup)) + sec('steps', 'Do it', ol(G.steps)) + sec('breathe', 'Breathe', '<p>' + esc(G.breathe) + '</p>') +
    sec('feel', 'Feel it in', mmHTML(G.main, G.also)) +
    sec('mistakes', 'Common mistakes', G.mistakes.map(m => '<div class="gmis"><b>' + esc(m[0]) + '</b><span>' + esc(m[1]) + '</span></div>').join('')) +
    sec('alt', 'Easier and harder', alt('Easier', G.easier) + alt('Harder', G.harder));
  return h + '</div>';
}

/* --- the guide sheet --- */
const gdEl = $('#gd');
// What a swap from this guide would change: the slot of the workout open in the lift sheet, if the guide came from one.
function guideCtx(g) {
  if (g.from === 'lift' && g.base && liftOpen()) {
    const date = state.selDate, m = model(date), kind = kindFor(date, m);
    if (DAYS[kind]) { const planned = plannedFor(date, kind, m), all = planned.concat(m.checkin === 'short' ? plannedFor(date, kind, m, true) : []), p = all.find(x => x.base === g.base && x.key === g.key);
      if (p) return { from: 'lift', slot: p, swap: swapOptions(planned, p) }; }
  }
  return { from: g.from === 'lift' ? 'lift' : 'lib', swap: [] };
}
function renderGuide(fresh) {
  const g = state.guide;
  if (!g || !GUIDE[g.key]) { state.guide = null; gdEl.hidden = true; gdEl.innerHTML = ''; if (!state.ov) document.body.style.overflow = ''; return; }
  const sc = gdEl.querySelector('.gd-body'), top = !fresh && sc ? sc.scrollTop : 0, name = gdName(g.key), ctx = guideCtx(g);
  gdEl.hidden = false;
  gdEl.innerHTML = '<div class="ov tall gd' + (fresh ? ' gdin' : '') + '" role="dialog" aria-modal="true" aria-label="How to: ' + esc(name) + '" id="guideSheet" data-guide="' + g.key + '"><div class="ls-head"><div class="ls-t"><h2 id="guideTitle">' + esc(name) + '</h2><div class="tiny muted" id="guideSub">' + esc(gdSub(g.key)) + '</div></div>' +
    '<button type="button" class="xbtn" id="guideClose" data-a="guide-close" aria-label="Close the guide">×</button></div>' +
    '<div class="gd-body" data-scroll>' + figHTML(g.key, 'gd', name) + guideCardHTML(g.key, ctx) + '</div></div>';
  document.body.style.overflow = 'hidden'; figKick();
  const s2 = gdEl.querySelector('.gd-body'); if (s2 && top) s2.scrollTop = top;
  if (fresh) { const x = $('#guideClose'); if (x) x.focus({ preventScroll: true }); }
}
function guideOpen(key, ctx) { if (!GUIDE[key]) return; state.guide = Object.assign({ key }, ctx); renderGuide(true); }
function guideClose() {
  const g = state.guide; if (!g) return; state.guide = null; renderGuide();
  const back = g.sel ? document.querySelector(g.sel) : null; if (back) back.focus({ preventScroll: true });
}
ACT['guide-open'] = el => { const k = el.dataset.k, cur = state.guide;
  if (cur && gdEl.contains(el)) { guideOpen(k, { from: cur.from, base: null, sel: cur.sel }); return; } // "See it" inside the guide: on to that move, and Close still goes back to where the guide was opened
  guideOpen(k, { from: el.dataset.from || 'lib', base: el.dataset.base || null, sel: el.dataset.from === 'lift' ? '[data-a="guide-open"][data-base="' + (el.dataset.base || k) + '"]' : '[data-a="guide-open"][data-k="' + k + '"]' }); };
ACT['guide-close'] = () => guideClose();
gdEl.addEventListener('click', e => { if (e.target === gdEl) guideClose(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.guide) { guideClose(); e.preventDefault(); e.stopImmediatePropagation(); } });
// One tap on "Swap to it": this workout only, exactly as Swap in the exercise's own menu does it.
ACT['guide-swap'] = el => {
  const to = el.dataset.to; if (!EX[to]) return;
  if (wm) { const slots = wmSlots(), p = slots[wm.i]; if (!p || !swapOptions(slots, p).includes(to)) return;
    const d = draft(wm.date); d.swaps[p.base] = to; d.recovered = false; persistDrafts(); wmLoadEx(); wm.howKey = to; wmDraw(); toast('Swapped to ' + EX[to].name + ' for this workout.'); return; }
  const g = state.guide, c = g ? guideCtx(g) : null; if (!c || !c.slot || !c.swap.includes(to)) return;
  const d = draft(state.selDate); d.swaps[c.slot.base] = to; d.recovered = false; state.menu = null; persistDrafts();
  g.key = to; render(); renderGuide(true); toast('Swapped to ' + EX[to].name + ' for this workout.');
};

/* --- the library: every move, grouped, with a search box --- */
function guideGroups() {
  const a = Object.keys(DAYS.fba.slots), b = Object.keys(DAYS.fbb.slots), used = {}; a.concat(b).forEach(k => { used[k] = 1; });
  return [['fba', 'Full Body A', a], ['fbb', 'Full Body B', b], ['lifts', 'Other lifts', Object.keys(EX).filter(k => !used[k])], ['stretch', 'Stretches', STRETCHES.map(s => s.g)], ['hp', 'Healthplex activities', GD_STATIONS]]
    .map(g => [g[0], g[1], g[2].filter(k => GUIDE[k])]);
}
const guideWords = (key, group) => (gdName(key) + ' ' + gdSub(key) + ' ' + group + ' ' + (GUIDE[key].main || []).concat(GUIDE[key].also || []).map(k => MM_NAME[k] || '').join(' ')).toLowerCase();
const guideMatch = (words, q) => q.split(/\s+/).every(t => !t || words.indexOf(t) >= 0);
function guideLibHTML() {
  const q = String((state.forms.guide || {}).q || '').trim().toLowerCase(), groups = guideGroups(), total = groups.reduce((t, g) => t + g[2].length, 0); let shown = 0;
  let h = '<section class="card stack" id="guideLib"><div><h3>Exercise guide</h3><p class="tiny muted">How to do every move, and which equipment to use. Tap one to see it.</p></div>' +
    '<input type="search" id="glQ" data-form="guide" data-k="q" value="' + esc((state.forms.guide || {}).q || '') + '" placeholder="Search ' + total + ' moves" aria-label="Search the exercise guide" autocomplete="off" enterkeyhint="search">';
  groups.forEach(g => {
    const rows = g[2].map(k => { const w = guideWords(k, g[1]), ok = guideMatch(w, q); if (ok) shown++;
      return '<button type="button" class="glrow" data-a="guide-open" data-k="' + k + '" data-from="lib" data-n="' + esc(w) + '"' + (ok ? '' : ' hidden') + '><span class="gln">' + esc(gdName(k)) + '</span><span class="tiny muted">' + esc(gdSub(k)) + '</span></button>'; }).join('');
    const any = g[2].some(k => guideMatch(guideWords(k, g[1]), q));
    h += '<details class="plain glgroup" data-dk="gl-' + g[0] + '" data-group="' + g[0] + '"' + (q && any ? ' open' : '') + (any ? '' : ' hidden') + '><summary>' + g[1] + ' <span class="chip">' + g[2].length + '</span></summary><div class="gllist">' + rows + '</div></details>';
  });
  return h + '<p class="tiny muted" id="glNone"' + (shown ? ' hidden' : '') + '>No move matches that. Try a body part, like "shoulders", or a machine.</p></section>';
}
// typing in the search box filters in place: the page is not drawn again under the keyboard
function guideFilter() {
  const inp = $('#glQ'), lib = $('#guideLib'); if (!inp || !lib) return;
  const q = inp.value.trim().toLowerCase(); let shown = 0;
  lib.querySelectorAll('.glgroup').forEach(d => { let any = 0;
    d.querySelectorAll('.glrow').forEach(r => { const ok = guideMatch(r.dataset.n, q); r.hidden = !ok; if (ok) any++; });
    d.hidden = !any; d.open = !!q && any > 0; shown += any; });
  const none = $('#glNone'); if (none) none.hidden = shown > 0;
}
document.addEventListener('input', e => { if (e.target.id === 'glQ') guideFilter(); });
