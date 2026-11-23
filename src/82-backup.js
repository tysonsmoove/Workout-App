/* ---------- Backup: everything the app holds, as files you keep ---------- */
// Every shared document the app has loaded, for both people, keyed by its path in the log.
// (What one account remembers about its own phone, such as who it is and which results it has seen, is not part of the log.)
function backupDocs() {
  const docs = {}, one = path => { if (state.have[path]) docs[path] = state.have[path]; };
  PIDS.forEach(pid => {
    const D = state.data[pid];
    one(PATH.profile(pid)); one(PATH.settings(pid));
    [['sessions', PATH.session], ['food', PATH.food], ['health', PATH.health], ['weekgoals', PATH.weekgoal], ['meals', PATH.meal]].forEach(c => Object.keys(D[c[0]]).sort().forEach(id => { docs[c[1](pid, id)] = D[c[0]][id]; }));
  });
  [['foods', state.customFoods], ['results', state.results], ['iou', state.iou]].forEach(c => Object.keys(c[1]).sort().forEach(id => { docs[c[0] + '/' + id] = c[1][id]; }));
  one('comp/settings');
  return docs;
}
const backupJson = () => JSON.stringify({ app: 'Morning Laps', format: 1, exportedAt: new Date().toISOString(), exportedBy: me(), about: 'Every document in the shared log for both people, keyed by its path.', docs: backupDocs() });
// One spreadsheet cell. Text that a spreadsheet would run as a formula gets a leading apostrophe.
function csvCell(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'number') return isFinite(v) ? String(v) : '';
  let s = String(v); if (/^[=+\-@\t\r]/.test(s)) s = '\'' + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const csvText = rows => '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
const personName = pid => P(pid).name || (pid === 'tyson' ? 'Tyson' : 'Jacquie');
// One row per set. A treadmill entry, each activity and a rest day get one row each, so a combined day is its sets plus its activities.
function workoutsCsv() {
  const rows = [['date', 'person', 'kind', 'day', 'exercise', 'set', 'weight', 'reps', 'minutes', 'activities', 'note']];
  PIDS.forEach(pid => {
    const who = personName(pid), S = state.data[pid].sessions;
    Object.keys(S).filter(validIso).sort().forEach(date => {
      const rec = S[date], n = normalize(rec), day = n.day ? DAYS[n.day].name : '', note = rec.deload ? 'deload week' : '';
      n.keys.forEach(k => n.ex[k].reps.forEach((r, i) => { if (r != null) rows.push([date, who, 'strength', day, EX[k].name, i + 1, EX[k].bw ? 'bodyweight' : n.ex[k].w, r, '', '', note]); }));
      if (n.tm && (n.tm.minutes > 0 || n.kind === 'cardio')) rows.push([date, who, 'treadmill', day, '', '', '', '', n.tm.minutes, 'Treadmill', '']);
      n.acts.forEach(a => rows.push([date, who, 'activity', '', '', '', '', '', a.min, actName(a), isHk(a) ? 'Apple Watch' : a.mv === false ? 'recovery' : '']));
      if (n.kind === 'rest') rows.push([date, who, 'rest', '', '', '', '', '', '', '', '']);
    });
  });
  return csvText(rows);
}
// One row per food item.
function foodCsv() {
  const rows = [['date', 'person', 'meal', 'item', 'quantity', 'unit', 'calories', 'protein', 'carbs', 'fat', 'source']];
  PIDS.forEach(pid => {
    const who = personName(pid), F = state.data[pid].food;
    Object.keys(F).filter(validIso).sort().forEach(date => (F[date].items || []).forEach(it => {
      if (!it) return; const n = it.n || [];
      rows.push([date, who, MEAL_NAME[it.meal] || '', it.name || '', it.qty, it.unit || '', n[NI.kcal], n[NI.protein], n[NI.carbs], n[NI.fat], it.src || '']);
    }));
  });
  return csvText(rows);
}
const backupName = (kind, ext) => 'morning-laps-' + kind + '-' + todayIso() + '.' + ext;
const sizeText = s => { const b = new Blob([s]).size; return b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1) + ' MB'; };
// Offer one file. 'saved', or why not: 'declined' (the person said no), 'busy' (rate limited: try again in a moment),
// 'failed' (this file was refused), 'gone' (saving files does not work in this view: the copy fallback takes over).
async function saveFile(filename, data) {
  if (!caps.downloads) return 'gone';
  try { await caps.downloads.save({ filename, data }); return 'saved'; }
  catch (e) {
    const c = e && e.code;
    if (c === 'declined') return 'declined';
    if (c === 'rate_limited') return 'busy';
    if (['rejected_extension', 'extension_not_enabled', 'too_large', 'bad_request', 'transform_error'].includes(c)) return 'failed';
    caps.downloads = null; return 'gone';
  }
}
const BACKUP_FILES = { backup: ['the backup', () => [backupName('backup', 'json'), backupJson()]], workouts: ['the workouts spreadsheet', () => [backupName('workouts', 'csv'), workoutsCsv()]], food: ['the food spreadsheet', () => [backupName('food', 'csv'), foodCsv()]] };
async function saveBackup(kinds) { // each file is offered in turn; the first one that is not saved stops the run
  const done = [];
  for (const k of kinds) {
    const f = BACKUP_FILES[k][1](), r = await saveFile(f[0], f[1]);
    if (r === 'saved') { done.push(BACKUP_FILES[k][0]); continue; }
    const so = done.length ? ' Saved so far: ' + done.join(', ') + '.' : '';
    state.backupNote = r === 'declined' ? 'Not saved: ' + BACKUP_FILES[k][0] + '.' + so : r === 'busy' ? 'Saving is busy right now. Wait a moment, then try again.' + so
      : r === 'gone' ? 'Saving files is not available here. Use Copy backup instead.' + so : 'Could not save ' + BACKUP_FILES[k][0] + '.' + so;
    render(); toast(state.backupNote, 3800); return;
  }
  state.backupNote = 'Saved ' + done.join(', ') + ' on ' + nice(todayIso()) + '.'; render(); toast(done.length > 1 ? 'Saved ' + done.length + ' files.' : 'Saved.', 2600);
}
ACT['backup-all'] = () => saveBackup(['backup', 'workouts', 'food']);
ACT['backup-workouts'] = () => saveBackup(['workouts']);
ACT['backup-food'] = () => saveBackup(['food']);
// Where files cannot be saved, the same JSON goes to the clipboard, written inside the tap.
ACT['backup-copy'] = async () => {
  const json = backupJson();
  try { await navigator.clipboard.writeText(json); state.backupNote = 'Copied the backup (' + sizeText(json) + '). Paste it into Notes or a file to keep it.'; render(); toast('Copied the backup, ' + sizeText(json) + '.', 3200); }
  catch (e) { openOv({ type: 'backuptext', json }); }
};
OV.backuptext = {
  html: o => '<div class="ov tall" role="dialog" aria-modal="true" aria-label="Copy backup">' + ovHead('Copy backup', sizeText(o.json)) +
    '<p class="tiny muted">This view would not copy for you. Tap in the box, choose Select All, then Copy, and paste it into Notes or a file.</p>' +
    '<textarea id="backupText" rows="10" readonly aria-label="Backup">' + esc(o.json) + '</textarea>' +
    '<div class="row"><button type="button" class="small" data-a="ov-close">Done</button></div></div>',
  after: () => { const b = $('#backupText'); if (b) { b.focus({ preventScroll: true }); b.select(); } }
};
function backupCardHTML() {
  let h = '<section class="card stack" id="backupCard"><h3>Backup</h3><p class="tiny muted">Everything the app holds for both of you: workouts, food, Health imports, targets, saved meals, shared foods, weekly results, IOUs and the competition settings.</p>';
  if (caps.downloads) h += '<div class="row"><button type="button" class="small" data-a="backup-all">Download a backup</button></div>' +
    '<p class="tiny muted">Three files, each with today\'s date in its name: the full backup (JSON), plus workouts and food as spreadsheets (CSV). You confirm each one.</p>' +
    '<div class="row"><button type="button" class="quiet" data-a="backup-workouts">Workouts spreadsheet only</button><button type="button" class="quiet" data-a="backup-food">Food spreadsheet only</button></div>';
  else if (caps.known) h += '<div class="row"><button type="button" class="small" data-a="backup-copy">Copy backup</button></div>' +
    '<p class="tiny muted" id="backupSize">Saving files is not available in this view. Copy backup puts the same backup on the clipboard: ' + cached('bksize', () => sizeText(backupJson())) + ' of JSON to paste into Notes or a file.</p>';
  else h += '<p class="tiny muted">Checking whether this view can save files…</p>';
  if (state.backupNote) h += '<p class="tiny" id="backupNote" role="status">' + esc(state.backupNote) + '</p>';
  return h + '</section>';
}
