/* ---------- Apple Health import: text copied by a Shortcut, pasted into the app ---------- */
// A web page cannot read Apple Health. A Shortcut on the iPhone can, and copies a few lines like
//   date: 2026-11-09
//   exercise: 42
//   steps: 8421
//   active: 512
//   water: 64
//   weight: 198.4
// Any subset, in any order, with or without units. Apple's built-in actions expose daily totals
// (Exercise Minutes, Steps, ...) but not the list of workouts, so movement comes from Exercise Minutes.
const HK_ACT_ID = 'hk-exercise';
const HK_KEYS = {
  date: 'date', day: 'date',
  exercise: 'exercise', exerciseminutes: 'exercise', exercisemin: 'exercise', exercisemins: 'exercise', exercisetime: 'exercise', minutesexercised: 'exercise',
  steps: 'steps', step: 'steps', stepcount: 'steps',
  active: 'active', activecalories: 'active', activeenergy: 'active', activecal: 'active', activecals: 'active', calories: 'active',
  distance: 'distance', walkingrunningdistance: 'distance', walkingdistance: 'distance', miles: 'distance',
  water: 'water', weight: 'weight', bodymass: 'weight', bodyweight: 'weight'
};
const HK_RANGE = { exercise: [0, 1440], steps: [0, 200000], active: [0, 20000], distance: [0, 200], water: [0, 700], weight: [60, 700] };
const HK_NUM = /-?\d[\d,]*(?:\.\d+)?/;
function hkNumber(s) { // the first number on the line, tolerant of thousands separators and a decimal comma
  const m = HK_NUM.exec(s); if (!m) return null;
  let t = m[0];
  if (/^-?\d+,\d{1,2}$/.test(t)) t = t.replace(',', '.'); else t = t.replace(/,/g, '');
  const n = Number(t); return isFinite(n) ? n : null;
}
function hkConvert(key, n, unitText) { // to the app's units: minutes, kcal, miles, fl oz, lb
  const u = ' ' + unitText.toLowerCase() + ' ';
  if (key === 'water') { if (/\bml\b|millilit/.test(u)) return n / 29.5735; if (/\bl\b|\blit/.test(u)) return n * 33.814; if (/cup/.test(u)) return n * 8; return n; }
  if (key === 'weight') { if (/\bkg\b|kilog/.test(u)) return n * 2.20462; if (/\bst\b|stone/.test(u)) return n * 14; return n; }
  if (key === 'distance') { if (/\bkm\b|kilom/.test(u)) return n * 0.621371; if (/\bm\b|\bmeters?\b|\bmetres?\b/.test(u)) return n / 1609.344; return n; }
  if (key === 'active') { if (/\bkj\b|kilojoule/.test(u)) return n / 4.184; return n; }
  if (key === 'exercise') { if (/\bhrs?\b|\bh\b|hour/.test(u)) return n * 60; if (/\bsec|\bs\b/.test(u)) return n / 60; return n; }
  return n;
}
function hkDate(s) {
  const mk = (y, mo, d) => { const v = String(y).padStart(4, '0') + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0'); return validIso(v) ? v : null; };
  const mon = w => { const i = MON.map(x => x.toLowerCase()).indexOf(String(w).slice(0, 3).toLowerCase()); return i < 0 ? null : i + 1; };
  let m;
  if ((m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) return mk(m[1], m[2], m[3]);
  if ((m = /(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})\b/.exec(s))) return mk(m[3].length === 2 ? '20' + m[3] : m[3], m[1], m[2]);
  if ((m = /([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(s)) && mon(m[1])) return mk(m[3], mon(m[1]), m[2]);
  if ((m = /(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s+(\d{4})/.exec(s)) && mon(m[2])) return mk(m[3], mon(m[2]), m[1]);
  return null;
}
function parseHealthPaste(text) {
  const out = { date: null, dateRaw: '', vals: {}, unknown: [], lines: 0 };
  let cur = null;
  String(text || '').split(/\r?\n/).forEach(raw => {
    const line = raw.trim(); if (!line) return;
    out.lines++;
    const c = line.indexOf(':'); let key = null, rest = line;
    if (c > 0) { const k = HK_KEYS[line.slice(0, c).toLowerCase().replace(/[^a-z]/g, '')]; if (k) { key = k; rest = line.slice(c + 1).trim(); cur = k; } }
    if (!key) { // no known label: another sample for the label above, or something else entirely
      if (cur && cur !== 'date' && c < 0 && hkNumber(line) != null) key = cur;
      else { cur = null; if (!/^morning laps/i.test(line)) out.unknown.push(line.slice(0, 60)); return; }
    }
    if (key === 'date') { out.dateRaw = rest; out.date = hkDate(rest); if (rest && !out.date) out.unknown.push(line.slice(0, 60)); return; }
    if (!rest) return; // an empty value: Health had nothing for that type today
    const n = hkNumber(rest); if (n == null) { out.unknown.push(line.slice(0, 60)); return; }
    const v = hkConvert(key, n, rest.replace(HK_NUM, ' '));
    if (key === 'weight') { if (out.vals.weight == null) out.vals.weight = v; } // several weigh-ins: the first listed (latest) wins
    else out.vals[key] = (out.vals[key] || 0) + v;                               // several samples of a total: add them up
  });
  Object.keys(out.vals).forEach(k => {
    const v = k === 'weight' || k === 'distance' ? Math.round(out.vals[k] * 10) / 10 : Math.round(out.vals[k]), r = HK_RANGE[k];
    if (v >= r[0] && v <= r[1]) out.vals[k] = v; else { delete out.vals[k]; out.unknown.push(k + ': ' + v + ' is outside what the app accepts'); }
  });
  return out;
}
const healthDay = (pid, date) => state.data[pid].health[date] || null;
function healthStatsText(v) {
  const bits = [];
  if (isNum(v.steps)) bits.push(commas(v.steps) + ' steps');
  if (isNum(v.exercise)) bits.push(v.exercise + ' exercise min');
  if (isNum(v.active)) bits.push(commas(v.active) + ' active cal');
  if (isNum(v.distance)) bits.push(v.distance + ' mi');
  return bits.join(' · ');
}
// What a paste would change for this profile. Rows with can:true are choices; the rest explain why nothing changes.
function healthPlan(pid, parsed, fallbackDate) {
  const date = parsed.date || fallbackDate, v = parsed.vals, rows = [], p = P(pid), t = todayIso();
  if (!Object.keys(v).length) return { date, rows, err: parsed.lines ? 'Nothing here looks like Health numbers. Run the shortcut again, then paste.' : null };
  if (date > t) return { date, rows, err: 'This is dated ' + nice(date) + ', which has not happened yet.' };
  if (v.exercise != null) {
    const title = 'Watch exercise: ' + v.exercise + ' min';
    if (p.plan !== 'choice') rows.push({ k: 'move', can: false, title, sub: 'Shown with your day. Treadmill minutes and lifts are still logged by hand.' });
    else {
      const rec = state.data[pid].sessions[date], n = rec ? normalize(rec) : null;
      if (n && (n.kind === 'strength' || n.kind === 'cardio')) rows.push({ k: 'move', can: false, title, sub: 'This day holds a lifting-program entry, so no minutes are added.' });
      else {
        const acts = n ? n.acts : [], had = acts.find(a => a.id === HK_ACT_ID) || null;
        const manual = sum(acts.filter(a => a.id !== HK_ACT_ID && a.mv !== false), a => a.min), extra = Math.max(0, v.exercise - manual);
        if (extra > 0 && (!had || had.min !== extra)) rows.push({ k: 'move', can: true, extra, title, sub: manual ? 'You logged ' + manual + ' min by hand, so ' + extra + ' more are added.' : 'Adds ' + extra + ' min of movement to the day.' });
        else if (extra === 0 && had) rows.push({ k: 'move', can: true, extra: 0, title, sub: 'Now covered by the ' + manual + ' min you logged by hand. Removes the ' + had.min + ' imported earlier.' });
        else rows.push({ k: 'move', can: false, title, sub: extra > 0 ? 'Already imported.' : manual ? 'Already covered by the ' + manual + ' min you logged by hand.' : 'No exercise minutes yet today.' });
      }
    }
  }
  if (v.water != null) {
    const cur = dayTotals(pid, date).water || 0, title = 'Water: ' + v.water + ' oz';
    rows.push(v.water > cur ? { k: 'water', can: true, title, sub: cur ? 'The app has ' + Math.round(cur) + ' oz. Raises the day to ' + v.water + '.' : 'Sets the day to ' + v.water + ' oz.' }
      : { k: 'water', can: false, title, sub: v.water ? 'The app already has ' + Math.round(cur) + ' oz.' : 'No water logged in Health today.' });
  }
  if (v.weight != null) {
    const cur = p.weighIns[date], title = 'Weight: ' + v.weight + ' lb';
    rows.push(cur !== v.weight ? { k: 'weight', can: true, title, sub: 'Logs a weigh-in for ' + nice(date) + (cur ? ', replacing ' + cur + ' lb.' : '.') } : { k: 'weight', can: false, title, sub: 'Already logged.' });
  }
  const stats = healthStatsText(v);
  if (stats) rows.push({ k: 'stats', can: false, title: stats, sub: 'Saved with the day.' });
  return { date, rows, err: null, stats: !!stats };
}
async function applyHealthImport(pid, plan, parsed, use) {
  const date = plan.date, v = parsed.vals, now = new Date().toISOString(), did = [];
  for (const row of plan.rows) {
    if (!row.can || use[row.k] === false) continue;
    if (row.k === 'move') {
      const ok = row.extra > 0 ? await logActivity(date, { id: HK_ACT_ID, a: 'other', name: 'Apple Watch exercise', min: row.extra, feel: null, hurt: false, note: 'From Apple Health', mv: true, src: 'health', at: now }) : await removeActivity(date, HK_ACT_ID);
      if (ok) did.push(row.extra > 0 ? row.extra + ' min of movement' : 'movement updated');
    } else if (row.k === 'water') {
      const path = PATH.food(pid, date), cur = getDoc(path) || { v: 1, date, items: [], water: 0 };
      if (await write(path, Object.assign({}, cur, { water: v.water, updatedAt: now }))) did.push(v.water + ' oz of water');
    } else if (row.k === 'weight') {
      const patch = { weighIns: {} }; patch.weighIns[date] = v.weight;
      if (await saveProfile(pid, patch)) did.push('weight ' + v.weight + ' lb');
    }
  }
  if (plan.stats) {
    const path = PATH.health(pid, date), doc = Object.assign({ v: 1, date }, getDoc(path), { importedAt: now });
    ['steps', 'exercise', 'active', 'distance'].forEach(k => { if (v[k] != null) doc[k] = v[k]; });
    if (await write(path, doc)) did.push('activity totals');
  }
  return did;
}
