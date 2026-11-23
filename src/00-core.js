/* ---------- Dates (calendar math in UTC, "today" in Indianapolis) ---------- */
const TZ = 'America/Indiana/Indianapolis';
const tzFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const tzTime = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
const tzHour = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hour12: false });
const todayIso = () => tzFmt.format(new Date());
const toUTC = s => { const p = s.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); };
const fromUTC = ms => new Date(ms).toISOString().slice(0, 10);
const validIso = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && fromUTC(toUTC(s)) === s;
const addDays = (s, n) => fromUTC(toUTC(s) + n * 86400000);
const dow = s => new Date(toUTC(s)).getUTCDay();
const weekStart = s => addDays(s, -((dow(s) + 6) % 7)); // Monday
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const nice = s => { const d = new Date(toUTC(s)); const t = todayIso(); return DOW[d.getUTCDay()] + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + (s.slice(0, 4) !== t.slice(0, 4) ? ' ' + d.getUTCFullYear() : ''); };
const rel = s => { const t = todayIso(); return s === t ? 'Today' : s === addDays(t, -1) ? 'Yesterday' : nice(s); };
const shortDate = s => { const d = new Date(toUTC(s)); return MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); };

/* ---------- Small helpers ---------- */
const $ = sel => document.querySelector(sel);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isNum = v => typeof v === 'number' && isFinite(v);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const sum = (arr, f) => arr.reduce((s, x) => s + (f ? f(x) : x), 0);
const commas = n => Math.round(n).toLocaleString('en-US');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const lsGet = (k, dflt) => { try { const v = localStorage.getItem(k); return v == null ? dflt : JSON.parse(v); } catch (e) { return dflt; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
const osReducedMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
// Animations, chosen per person on Me. Subtle is the default: no particle bursts, one small effect for real milestones.
// Full is everything (bursts, start lights, flips). Off is the same as the phone's own reduce-motion setting, which always wins.
const MOTIONS = { subtle: 'Subtle', full: 'Full', off: 'Off' };
const motionPref = pid => { const m = (state.data[pid || me()].profile || {}).motion; return MOTIONS[m] ? m : 'subtle'; };
const motionOf = pid => osReducedMotion() ? 'off' : motionPref(pid);
const reducedMotion = () => motionOf() === 'off';
let toastT;
function toast(msg, ms) { const t = $('#toast'); t.textContent = msg; t.classList.remove('act'); t.hidden = false; state.undo = null; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 2200); }

/* ---------- Program constants ---------- */
const GOAL = 5;             // default weekly activity days on the lifting program
const LIFT_GOAL = 3;        // lift days per week that complete a week
const QUALIFY_MIN = 2;      // main (non-core) lifts with a logged set for a day to count as a lift day
const MAX_SETS = 5;
const SCHEMA = 2;

/* ---------- Profiles ---------- */
const PIDS = ['tyson', 'jacquie'];
const otherPid = pid => pid === 'tyson' ? 'jacquie' : 'tyson';
const DEFAULTS = {
  tyson: { name: 'Tyson', plan: 'program', avatar: '', place: 'Avon Anytime Fitness', skin: { preset: 'brick', custom: null, font: 'sporty', shape: 'soft', backdrop: 'plain', fx: 'confetti' }, move: { goalDays: 5, minMinutes: 10, protect: [] } },
  jacquie: { name: 'Jacquie', plan: 'choice', avatar: '', place: '', skin: { preset: 'peony', custom: null, font: 'sporty', shape: 'soft', backdrop: 'plain', fx: 'confetti' }, move: { goalDays: 3, minMinutes: 10, protect: [] } }
};
// A look is six numbers: accent hue / saturation / lightness (light, dark), neutral hue / saturation. `ink` overrides the text color on the accent.
const SKINS = {
  brick:  { name: 'Brickyard', ah: 3, as: 65, al: 47, ald: 57, nh: 212, ns: 12, nsd: 12 },
  peony:  { name: 'Peony pink', ah: 334, as: 78, al: 50, ald: 60, nh: 334, ns: 34, nsd: 14 },
  rose:   { name: 'Rosewood', ah: 348, as: 52, al: 42, ald: 58, nh: 350, ns: 22, nsd: 12 },
  lilac:  { name: 'Lilac', ah: 268, as: 55, al: 52, ald: 60, nh: 268, ns: 26, nsd: 14 },
  grape:  { name: 'Grape', ah: 292, as: 52, al: 40, ald: 58, nh: 292, ns: 18, nsd: 14 },
  ocean:  { name: 'Ocean', ah: 206, as: 82, al: 38, ald: 54, nh: 206, ns: 24, nsd: 16 },
  lagoon: { name: 'Lagoon', ah: 178, as: 72, al: 28, ald: 40, nh: 178, ns: 18, nsd: 14 },
  forest: { name: 'Evergreen', ah: 148, as: 50, al: 30, ald: 42, nh: 140, ns: 12, nsd: 10 },
  sunset: { name: 'Sunset', ah: 20, as: 88, al: 44, ald: 54, nh: 24, ns: 30, nsd: 12 },
  honey:  { name: 'Honey', ah: 42, as: 92, al: 50, ald: 56, nh: 40, ns: 30, nsd: 12, ink: '#1C1400' }
};
const FONTS = { sporty: 'Sporty', soft: 'Soft', classic: 'Classic' };
const FONT_URL = {
  soft: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@600;700&family=Nunito:wght@400;600;700&display=swap',
  classic: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap'
};
const SHAPES = { sharp: 'Sharp', soft: 'Soft', round: 'Round' };
const BACKDROPS = { plain: 'Plain', dots: 'Dots', stripes: 'Stripes', checkers: 'Checkers' };
const FXS = { confetti: 'Confetti', hearts: 'Hearts', stars: 'Stars', flags: 'Flags' };
const AVATARS = ['', '🏁', '🏎️', '🔥', '⚡', '💪', '🌸', '🌷', '💖', '🦋', '✨', '🌙', '🍓', '🐝', '🌻', '🎀', '👑', '🐱', '🐶', '🧘', '🚶', '🏃', '🥇', '🌈'];

/* ---------- State ---------- */
const blankSettings = () => ({ startDate: null, maxed: {}, swaps: {}, goal: GOAL });
const blankData = () => ({ profile: null, sessions: {}, settings: blankSettings(), food: {}, health: {}, weekgoals: {}, meals: {} });
const state = {
  pid: null,
  data: { tyson: blankData(), jacquie: blankData() },
  customFoods: {},
  comp: { start: null, stakes: '' },   // also, when set: stakesBy { monday: text }, countdown { date, label, setAt }
  results: {},        // week start -> final result, once a finished week is closed
  have: {},           // path -> the stored document, for the one-per-person documents (settings, profile, shared settings); null when there is none
  undo: null,         // the last removal, while its "Undo" is still on offer
  backupNote: '',     // what the last backup did, shown on the Backup card
  fxn: { burst: 0, milestone: 0 }, // how many particle bursts and milestone effects have actually played (this visit)
  stallOpen: {},      // exercise key -> its stuck-lift choices are open (this visit)
  iou: {},            // week start -> { paid }: whether what was on the line has been settled. Kept apart from results, which never change
  draftsBy: { tyson: {}, jacquie: {} },   // date -> unsaved lifting form draft (this device, mirrored to the account)
  acct: {},           // what this signed-in person's account remembers: profile, what has been shown; see prefGet
  acctDrafts: null,   // the account's copy of unsaved drafts, as last read
  status: {},         // date -> { s: 'saving'|'synced'|'local'|'failed', at, msg }
  formError: {},      // date -> validation message shown after a Save attempt
  details: {},        // exercise key -> details panel open (this visit)
  menu: null,         // { key, view } while an exercise menu is open
  forms: {},          // form id -> { field: value } for half-filled forms, so a re-render never drops typing
  ov: null,           // the open overlay, if any
  ovQ: [],            // queued celebration overlays
  filter: { cat: 'all', quick: false, fav: false },
  today: todayIso(),  // the calendar day the screen was last drawn for; see rollDay
  selDate: todayIso(),
  tab: 'train',
  storage: 'loading', // loading | db | local | nodb
  stale: false,
  ready: false,
  cantWrite: false,
  canWriteKnown: false,
  localOnly: null,
  importNote: null,
  confirmRemove: null
};
const me = () => state.pid || 'tyson';
// The lifting-program code reads state.sessions / state.settings / state.drafts: always the active profile's.
Object.defineProperties(state, {
  sessions: { get() { return state.data[me()].sessions; } },
  settings: { get() { return state.data[me()].settings; } },
  drafts: { get() { return state.draftsBy[me()]; } }
});

/* ---------- Derived-value cache, invalidated on any data change ---------- */
let rev = 0;
const cache = { rev: -1, day: '', m: {} };
function bump() { rev++; }
function cached(key, fn) {
  const t = todayIso();
  if (cache.rev !== rev || cache.day !== t) { cache.rev = rev; cache.day = t; cache.m = {}; }
  return key in cache.m ? cache.m[key] : (cache.m[key] = fn());
}
function P(pid) {
  return cached('P:' + pid, () => {
    const d = DEFAULTS[pid], s = state.data[pid].profile || {};
    return Object.assign({}, d, s, {
      name: (s.name || d.name), skin: Object.assign({}, d.skin, s.skin), move: Object.assign({}, d.move, s.move),
      body: Object.assign({}, s.body), doctor: Object.assign({}, s.doctor), weighIns: Object.assign({}, s.weighIns), badges: Object.assign({}, s.badges), favorites: (s.favorites || []).slice(),
      reminders: Object.assign({ morning: '06:00', water: '14:30' }, s.reminders) // times shown in the Shortcuts reminder steps; the phone does the reminding
    });
  });
}

/* ---------- Looks ---------- */
function hexToHsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return null;
  const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = Math.round(h * 60); if (h < 0) h += 360; }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}
function hslLum(h, s, l) { // relative luminance of an hsl color
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12, v = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))); return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(0) + 0.7152 * f(8) + 0.0722 * f(4);
}
// the lightest accent, at or below `l`, that still gives white text the wanted contrast
function fitLightness(h, s, l, want) { let v = l; while (v > 18 && 1.05 / (hslLum(h, s, v) + 0.05) < want) v--; return v; }
function skinVars(sk) {
  const c = sk && sk.custom ? hexToHsl(sk.custom) : null, key = c ? 'custom:' + sk.custom : 'preset:' + (sk && sk.preset);
  return cached('skin:' + key, () => {
    let v;
    if (c) {
      const yellow = c.h >= 38 && c.h <= 68, al = yellow ? clamp(c.l, 46, 54) : clamp(c.l, 30, 50);
      // dark mode starts from a bright version of the color and is then lowered only as far as white text needs, so a very dark pick still shows up on a dark screen
      v = { name: 'Custom', ah: c.h, as: clamp(c.s, 35, 92), al, ald: yellow ? Math.min(al + 6, 58) : 66, nh: c.h, ns: clamp(Math.round(c.s * 0.35), 8, 34), nsd: 12, ink: yellow ? '#1C1400' : null };
    } else v = Object.assign({}, SKINS[sk && sk.preset] || SKINS.brick);
    if (!v.ink) { v.al = fitLightness(v.ah, v.as, v.al, 4.5); v.ald = fitLightness(v.ah, v.as, v.ald, 4); } // white text on the accent stays readable in both themes
    return v;
  });
}
function loadFont(f) {
  if (!FONT_URL[f] || document.getElementById('font-' + f)) return;
  const l = document.createElement('link'); l.id = 'font-' + f; l.rel = 'stylesheet'; l.href = FONT_URL[f]; document.head.appendChild(l);
}
function applySkin() {
  const p = P(me()), v = skinVars(p.skin), root = document.documentElement, st = root.style;
  st.setProperty('--ah', v.ah); st.setProperty('--as', v.as + '%'); st.setProperty('--al', v.al + '%'); st.setProperty('--ald', v.ald + '%');
  st.setProperty('--nh', v.nh); st.setProperty('--ns', v.ns + '%'); st.setProperty('--nsd', v.nsd + '%');
  if (v.ink) st.setProperty('--aink', v.ink); else st.removeProperty('--aink');
  root.dataset.font = FONTS[p.skin.font] ? p.skin.font : 'sporty';
  root.dataset.shape = SHAPES[p.skin.shape] ? p.skin.shape : 'soft';
  root.dataset.backdrop = BACKDROPS[p.skin.backdrop] ? p.skin.backdrop : 'plain';
  root.dataset.motion = motionOf(me()); // the stylesheet keys every animation off this
  loadFont(p.skin.font);
}
function avStyle(pid) { const v = skinVars(P(pid).skin); return '--ph:' + v.ah + ';--ps:' + v.as + '%;--pl:' + v.al + '%;--pld:' + v.ald + '%' + (v.ink ? ';--pink:' + v.ink : ''); }
function avatarHTML(pid, cls) { const p = P(pid); return '<span class="av ' + (cls || '') + '" style="' + avStyle(pid) + '" aria-hidden="true">' + esc(p.avatar || p.name.slice(0, 1).toUpperCase()) + '</span>'; }

/* ---------- Storage: one path-addressed store, backed by the account database or this browser ---------- */
let db = null;
const writeQ = {};
function queueWrite(key, fn) { writeQ[key] = (writeQ[key] || Promise.resolve()).then(fn, fn); return writeQ[key]; }
const PATH = {
  sessions: pid => pid === 'tyson' ? 'sessions' : 'profiles/' + pid + '/sessions',   // Tyson's log keeps its original location
  session: (pid, d) => PATH.sessions(pid) + '/' + d,
  settings: pid => pid === 'tyson' ? 'settings/program' : 'profiles/' + pid + '/settings/program',
  foodCol: pid => 'profiles/' + pid + '/food',
  food: (pid, d) => 'profiles/' + pid + '/food/' + d,
  healthCol: pid => 'profiles/' + pid + '/health',
  health: (pid, d) => 'profiles/' + pid + '/health/' + d,
  weekgoalsCol: pid => 'profiles/' + pid + '/weekgoals',                             // one snapshot of a person's targets per week
  weekgoal: (pid, ws) => 'profiles/' + pid + '/weekgoals/' + ws,
  mealsCol: pid => 'profiles/' + pid + '/meals',                                     // a person's saved meals
  meal: (pid, id) => 'profiles/' + pid + '/meals/' + id,
  profile: pid => 'profiles/' + pid
};
function slot(path) { // where a document lives in state: { map, key } or { obj, field }
  const s = path.split('/');
  if (s[0] === 'sessions' && s.length === 2) return { map: state.data.tyson.sessions, key: s[1] };
  if (path === 'settings/program') return { obj: state.data.tyson, field: 'settings', dflt: blankSettings };
  if (s[0] === 'profiles' && state.data[s[1]]) {
    const D = state.data[s[1]];
    if (s.length === 2) return { obj: D, field: 'profile' };
    if (s[2] === 'sessions' && s.length === 4) return { map: D.sessions, key: s[3] };
    if (s[2] === 'food' && s.length === 4) return { map: D.food, key: s[3] };
    if (s[2] === 'health' && s.length === 4) return { map: D.health, key: s[3] };
    if (s[2] === 'weekgoals' && s.length === 4) return { map: D.weekgoals, key: s[3] };
    if (s[2] === 'meals' && s.length === 4) return { map: D.meals, key: s[3] };
    if (s[2] === 'settings' && s[3] === 'program') return { obj: D, field: 'settings', dflt: blankSettings };
  }
  if (s[0] === 'foods' && s.length === 2) return { map: state.customFoods, key: s[1] };
  if (s[0] === 'results' && s.length === 2) return { map: state.results, key: s[1] };
  if (s[0] === 'iou' && s.length === 2) return { map: state.iou, key: s[1] };
  if (path === 'comp/settings') return { obj: state, field: 'comp', dflt: () => ({ start: null, stakes: '' }) };
  return null;
}
function getDoc(path) { const t = slot(path); if (!t) return null; return t.map ? (t.map[t.key] || null) : t.obj[t.field]; }
function applyDoc(path, doc) {
  const t = slot(path); if (!t) return; bump();
  if (t.map) { if (doc == null) delete t.map[t.key]; else t.map[t.key] = doc; }
  else { t.obj[t.field] = t.dflt ? Object.assign(t.dflt(), doc || {}) : doc; state.have[path] = doc == null ? null : doc; }
}
function replaceCol(colPath, entries) {
  const s = colPath.split('/'); let host, field;
  if (colPath === 'sessions') { host = state.data.tyson; field = 'sessions'; }
  else if (colPath === 'foods') { host = state; field = 'customFoods'; }
  else if (colPath === 'results') { host = state; field = 'results'; }
  else if (colPath === 'iou') { host = state; field = 'iou'; }
  else if (s[0] === 'profiles' && state.data[s[1]] && (s[2] === 'sessions' || s[2] === 'food' || s[2] === 'health' || s[2] === 'weekgoals' || s[2] === 'meals')) { host = state.data[s[1]]; field = s[2]; }
  if (!host) return;
  const m = {}; entries.forEach(e => { m[e[0]] = e[1]; }); host[field] = m; bump();
}
function localPut(path, doc) {
  if (path.indexOf('sessions/') === 0) { const m = lsGet('ml.sessions', {}); if (doc == null) delete m[path.slice(9)]; else m[path.slice(9)] = doc; lsSet('ml.sessions', m); }
  else if (path === 'settings/program') lsSet('ml.settings', doc);
  else { const kv = lsGet('ml.kv', {}); if (doc == null) delete kv[path]; else kv[path] = doc; lsSet('ml.kv', kv); }
}
function localDocs() {
  const out = {}; const s = lsGet('ml.sessions', {});
  Object.keys(s).forEach(d => { if (validIso(d)) out['sessions/' + d] = s[d]; });
  const st = lsGet('ml.settings', null); if (st) out['settings/program'] = st;
  const kv = lsGet('ml.kv', {}); Object.keys(kv).forEach(p => { out[p] = kv[p]; });
  return out;
}
function localLoad() { const docs = localDocs(); Object.keys(docs).forEach(p => applyDoc(p, docs[p])); }
function noteWriteError(e) { const c = e && e.code; if (c === 'not_granted' || c === 'revoked' || (c === 'invalid_argument' && !state.canWriteKnown)) state.cantWrite = true; }
// put / del update what you see first, then store. They reject when the store refuses.
// Nothing is written until the log has loaded: a save built on a not-yet-loaded day would overwrite what is already there.
const NOT_READY = { code: 'not_ready', message: 'The log is still loading.' };
// A change made here to a document whose removal is still on offer for "Undo" withdraws the offer: the undo could no
// longer put back exactly what was there. (A change arriving from the other phone is caught when Undo is tapped.)
function dropUndo(path) { if (state.undo && state.undo.path === path) { state.undo = null; const t = $('#toast'); if (t.classList.contains('act')) { t.hidden = true; t.classList.remove('act'); } } }
async function put(path, doc) {
  if (!state.ready) throw NOT_READY;
  dropUndo(path); applyDoc(path, doc);
  if (!db) { localPut(path, doc); return 'local'; }
  try { await queueWrite(path, () => db.doc(path).set(doc)); return 'synced'; } catch (e) { noteWriteError(e); throw e; }
}
async function del(path) {
  if (!state.ready) throw NOT_READY;
  dropUndo(path); applyDoc(path, null);
  if (!db) { localPut(path, null); return; }
  try { await queueWrite(path, () => db.doc(path).delete()); } catch (e) { noteWriteError(e); throw e; }
}
// write: for small one-tap saves. Puts the previous value back and says so when the store refuses.
async function write(path, doc) {
  const prev = getDoc(path);
  try { if (doc == null) await del(path); else await put(path, doc); return true; }
  catch (e) {
    if (e && e.code === 'not_ready') { toast(state.storage === 'nodb' ? 'Your log cannot be reached right now, so nothing was saved.' : 'Still loading your log. Try again in a moment.', 3200); return false; }
    applyDoc(path, prev);
    toast(state.cantWrite ? 'This account can view the log but not save to it.' : 'Could not save. Check your connection and try again.', 3400);
    render(); return false;
  }
}
async function saveProfile(pid, patch) {
  const cur = state.data[pid].profile || {};
  const next = Object.assign({}, cur, patch, { updatedAt: new Date().toISOString() });
  ['skin', 'move', 'body', 'doctor', 'weighIns', 'badges', 'reminders'].forEach(k => { if (patch[k]) next[k] = Object.assign({}, cur[k], patch[k]); });
  const ok = await write(PATH.profile(pid), next);
  return ok;
}
/* ---------- Optional abilities: asking Claude, saving a file ---------- */
// Both come from the Claude viewer some time after load, or never. `null` means this view cannot use one, and every
// feature that wants one has a path without it: nothing waits on them, and nothing breaks when they are missing,
// declined, or rate limited.
const caps = { sample: null, images: null, downloads: null, known: false }; // images: this view's photo limits, or null; known: the viewer has answered about saving files
function useCap(name) { try { return window.claude && window.claude.use ? Promise.resolve(window.claude.use(name)).catch(() => null) : Promise.resolve(null); } catch (e) { return Promise.resolve(null); } }
function capsChanged() { render(); if (state.ov && state.ov.type === 'food') renderOv(); }
function loadCaps() {
  useCap('sample').then(async s => {
    if (!s || typeof s.json !== 'function') return;
    caps.sample = s; try { const l = await s.limits(); caps.images = (l && l.images) || null; } catch (e) { caps.images = null; }
    capsChanged();
  });
  useCap('downloads').then(d => { caps.downloads = d && typeof d.save === 'function' ? d : null; caps.known = true; capsChanged(); });
}
// Ask Claude for one JSON value, on a tap, never from a loop and never retried here.
// Resolves { ok: true, data }, or { ok: false, why } with why = 'gone' (unavailable, or the viewer said no: the
// feature hides for this visit), 'noimage' (text works, photos do not), 'busy' (rate limited: the viewer may try
// again later), or 'failed' (anything else).
const SAMPLE_GONE = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];
// the JSON inside a reply that also carried other text (a code fence, a sentence before it); undefined when there is none
function looseJson(text) {
  const a = text.search(/[\[{]/); if (a < 0) return undefined;
  const b = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}')); if (b <= a) return undefined;
  try { return JSON.parse(text.slice(a, b + 1)); } catch (e) { return undefined; }
}
async function askJson(prompt, images) {
  if (!caps.sample) return { ok: false, why: 'gone' };
  try { const opts = {}; if (images && images.length) opts.images = images; return { ok: true, data: await caps.sample.json(prompt, opts) }; }
  catch (e) {
    const code = e && e.code;
    if (SAMPLE_GONE.includes(code)) { caps.sample = null; caps.images = null; capsChanged(); return { ok: false, why: 'gone', code }; }
    if (code === 'images_unavailable') { caps.images = null; return { ok: false, why: 'noimage', code }; }
    if (code === 'invalid_json' && e && typeof e.text === 'string') { const v = looseJson(e.text); if (v !== undefined) return { ok: true, data: v }; } // the answer was there, wrapped in other text
    return { ok: false, why: code === 'rate_limited' ? 'busy' : 'failed', code: code || 'upstream_error' };
  }
}

/* ---------- What a person's account remembers ---------- */
// An iPhone can empty a page's own storage between visits, which used to mean choosing a profile on every open and
// seeing last week's result again and again. So the profile choice, what has already been shown and unsaved lifting
// drafts are also kept in the signed-in person's private corner of the account store (data/users/<id>/, which nobody
// else can read). This device's storage answers first when it still holds a value.
// The profile choice and the last result shown are kept per kind of device, so two phones signed in to one account
// can still be two different people. (Two identical phones on one account cannot be told apart; separate accounts can.)
const devKey = (() => {
  try { let h = 5381; const s = [navigator.userAgent, screen.width, screen.height, window.devicePixelRatio || 1].join('|'); for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); }
  catch (e) { return 'any'; }
})();
const ACCT_KEYS = { 'ml.me': 'me_' + devKey, 'ml.seenWeek': 'seenWeek_' + devKey, 'ml.seenFinalWeek': 'seenFinalWeek_' + devKey, 'ml.badges.tyson': 'badgesTyson', 'ml.badges.jacquie': 'badgesJacquie' };
let acctPath = null, acctDraftsPath = null, acctT = null, draftsT = null, draftsSent = '';
const acctLocal = {}; // fields set on this device during this visit; they win over what the account says
function prefGet(k, dflt) { const v = lsGet(k, null); if (v != null) return v; const a = state.acct[ACCT_KEYS[k]]; return a == null ? dflt : a; }
function prefSet(k, v) {
  lsSet(k, v);
  const f = ACCT_KEYS[k]; if (!f || JSON.stringify(state.acct[f]) === JSON.stringify(v)) return;
  state.acct[f] = v; acctLocal[f] = v;
  clearTimeout(acctT); acctT = setTimeout(acctFlush, 300);
}
function acctFlush() {
  clearTimeout(acctT); acctT = null;
  if (!acctPath || !db || !state.ready || !Object.keys(acctLocal).length) return;
  const doc = Object.assign({ v: 1 }, state.acct, { updatedAt: new Date().toISOString() });
  queueWrite(acctPath, () => db.doc(acctPath).set(doc)).catch(() => {}); // a missed write only means being asked or shown once more
}
function draftsFlush() {
  clearTimeout(draftsT); draftsT = null;
  if (!acctDraftsPath || !db || !state.ready) return;
  const body = JSON.stringify(state.draftsBy); if (body === draftsSent) return;
  draftsSent = body;
  const doc = Object.assign({ v: 1, updatedAt: new Date().toISOString() }, JSON.parse(body));
  queueWrite(acctDraftsPath, () => db.doc(acctDraftsPath).set(doc)).catch(() => { draftsSent = ''; });
}
function flushAccount() { if (acctT) acctFlush(); if (draftsT) draftsFlush(); } // the page is going to the background: write now
function persistDrafts() {
  const old = Date.now() - 14 * 86400000; // drafts untouched for two weeks are dropped; the workout's own date does not matter
  PIDS.forEach(pid => {
    const d = state.draftsBy[pid]; Object.keys(d).forEach(k => { if (k !== state.selDate && (d[k].updatedAt || 0) < old) delete d[k]; });
    lsSet(pid === 'tyson' ? 'ml.drafts' : 'ml.drafts.' + pid, d);
  });
  if (acctDraftsPath) { clearTimeout(draftsT); draftsT = setTimeout(draftsFlush, 1500); }
  lsSet('ml.ui', { selDate: state.selDate, today: todayIso() }); // selected date is restored only within the same day
}
// The calendar day can change while the page stays open. If the screen was on "today", it follows.
function rollDay() {
  const t = todayIso(); if (t === state.today) return false;
  if (state.selDate === state.today) state.selDate = t;
  state.today = t; return true;
}
function findLocalOnly() {
  const docs = localDocs(); const only = Object.keys(docs).filter(p => (/\/\d{4}-\d{2}-\d{2}$/.test(p) || /^profiles\/[a-z]+$/.test(p) || /^foods\/[A-Za-z0-9]+$/.test(p) || /^profiles\/[a-z]+\/meals\/[A-Za-z0-9]+$/.test(p)) && p.indexOf('results/') !== 0 && p.indexOf('/weekgoals/') < 0 && slot(p) && !getDoc(p)); // results and week locks are made fresh, never imported
  state.localOnly = only.length ? only : null;
}
async function importLocal() {
  const docs = localDocs(); const paths = (state.localOnly || []).slice().sort(); let n = 0;
  for (const p of paths) {
    if (getDoc(p)) continue;
    try { await put(p, docs[p]); localPut(p, null); n++; } catch (e) { toast('Import stopped. Try again later.'); break; }
  }
  findLocalOnly();
  state.importNote = n + ' entr' + (n === 1 ? 'y' : 'ies') + ' imported to your account.' + (state.localOnly ? ' ' + state.localOnly.length + ' could not be imported.' : '');
  render();
}
async function connect() {
  PIDS.forEach(pid => { const d = lsGet(pid === 'tyson' ? 'ml.drafts' : 'ml.drafts.' + pid, {}); Object.values(d).forEach(x => { x.recovered = true; }); state.draftsBy[pid] = d; });
  const ui = lsGet('ml.ui', null); if (ui && ui.today === todayIso() && validIso(ui.selDate) && ui.selDate <= todayIso()) state.selDate = ui.selDate;
  let resolved = false;
  const timer = setTimeout(() => { if (!resolved) { state.stale = true; askWho(); render(); } }, 10000);
  db = await (window.claude && window.claude.use ? window.claude.use('db') : Promise.resolve(null));
  if (db) { // someone who can only view the shared log gets browser-only saving instead of failing writes
    let uid = null;
    try { const user = await window.claude.use('user'); const can = user ? await user.can('data.write') : null; if (can === false) db = null; state.canWriteKnown = can === true; uid = user && user.id ? await user.id() : null; } catch (e) { /* keep db */ }
    if (db && typeof uid === 'string' && uid) { acctPath = 'data/users/' + uid + '/prefs'; acctDraftsPath = 'data/users/' + uid + '/drafts'; }
  }
  if (!db) { state.storage = 'local'; localLoad(); clearTimeout(timer); onReady(); render(); return; }
  const need = new Set();
  const got = key => {
    need.delete(key);
    if (!need.size && !resolved) { resolved = true; clearTimeout(timer); state.stale = false; state.storage = 'db'; findLocalOnly(); onReady(); }
  };
  const fail = () => { state.storage = 'nodb'; state.ready = false; clearTimeout(timer); askWho(); render(); }; // a dead listener means stale data: stop saving on top of it
  const subCol = colPath => {
    need.add(colPath);
    db.collection(colPath).onSnapshot(snap => {
      replaceCol(colPath, snap.docs.filter(d => d.exists).map(d => [d.id, d.data()]));
      if (!snap.metadata.fromCache) got(colPath); render();
    }, fail);
  };
  const subDoc = path => {
    need.add(path);
    db.doc(path).onSnapshot(snap => {
      applyDoc(path, snap.exists ? snap.data() : null);
      if (path === PATH.profile(me())) applySkin();
      if (!snap.metadata.fromCache) got(path); render();
    }, fail);
  };
  // this person's private memory: read before the page is called ready, so the profile is known without asking
  const subOwn = (path, take) => {
    need.add(path);
    db.doc(path).onSnapshot(snap => { take(snap.exists ? snap.data() || {} : {}); if (!snap.metadata.fromCache) got(path); }, () => got(path)); // unreadable: carry on without it
  };
  if (acctPath) {
    subOwn(acctPath, d => { state.acct = Object.assign({}, d, acctLocal); });
    subOwn(acctDraftsPath, d => { if (!resolved) state.acctDrafts = d; });
  }
  PIDS.forEach(pid => { subCol(PATH.sessions(pid)); subCol(PATH.foodCol(pid)); subCol(PATH.healthCol(pid)); subCol(PATH.weekgoalsCol(pid)); subCol(PATH.mealsCol(pid)); subDoc(PATH.settings(pid)); subDoc(PATH.profile(pid)); });
  subCol('foods'); subCol('results'); subCol('iou'); subDoc('comp/settings');
}
