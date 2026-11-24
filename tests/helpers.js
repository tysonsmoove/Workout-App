// Shared Playwright helpers for the Morning Laps test suites.
// Serve a doctype-wrapped copy of index.html plus foods.json on http://127.0.0.1:8765 before running.
const { chromium } = require('playwright');
const URL = process.env.ML_URL || 'http://127.0.0.1:8765/index.html';
const results = [];
function check(name, cond, detail) { results.push({ name, ok: !!cond, detail: detail || '' }); if (!cond) console.log('FAIL', name, detail == null ? '' : detail); }
const T = iso => new Date(iso);

// me: profile preselected on this "phone" (null = show the chooser). Celebration pop-ups are closed automatically
// and their titles collected in window.__seen, unless window.__keepOv is set.
// Version 18 moved the typed-in lift log into a sheet, the 7-day strip into the date sheet and the activity menu into
// "Something else". Suites written before that reach for those controls as if they were on the page. With `legacy`
// on (those suites set module.exports.legacyDefault), a call that names one of them opens the sheet it lives in
// first, and a call that names something on the page behind an open lift sheet closes the sheet first. The version
// 18 suite runs with it off and goes through the real buttons.
const LIFT_SEL = /#(w-|r-|tmMin|tmTitle|notes\b|saveBtn|delBtn|kindSeg|statusLine|whyLine|savenote|saveStatus|savebar|countAs|discardDraft|logForm|wmStart|moreLifts|liftSheet|details-|rest\b|restTime|restLabel)|\[data-(menu|usew|same|repeat|collapse|expand|field|prog|sum|last|hold|kind|act=|menufor|optional|ex[=\]])|\.ex\b|\.menu\b|\.menubtn|\.exrx|\.sessopts|\.exlast|\.exhold|\.exprog|\.logrow|\.savebar|\.collapsed-sum|data-a="(stall|timer)|\.sess \.status|#liftDate|\.stall|data-stall/;
const DAY_SEL = /\.datebar|#datePick/;
const ADD_SEL = /data-a="health"|#add(Rest|Lift|Cardio|Recovery|More|Grid)\b/;
const MENU_SEL = /\.act\b|\.acts\b|data-a="(act|surprise|filter|filter-quick|filter-fav|hp-flip|hp-start)"|data-hpback|data-pain|data-tag/;
async function ensure(page, sel, opts) {
  if (!page.__legacy || typeof sel !== 'string' || (opts && (opts.state === 'detached' || opts.state === 'hidden'))) return;
  const lift = LIFT_SEL.test(sel), day = DAY_SEL.test(sel), menu = MENU_SEL.test(sel), add = ADD_SEL.test(sel);
  // a tab change is drawn a moment after the tap that asked for it
  await page.__raw.waitForFunction(() => { const M = window.MorningLaps, h = (location.hash || '#train').slice(1); return !M || M.state.tab === (['train', 'program', 'history', 'fuel', 'compete', 'me'].includes(h) ? h : 'train'); }, null, { timeout: 2000 }).catch(() => {});
  const st = await page.evaluate(q => { const M = window.MorningLaps; if (!M || !M.state.pid || !M.state.ready && !document.getElementById('today')) return null; const el = (() => { try { return document.querySelector(q); } catch (e) { return null; } })(), ov = document.getElementById('ov');
    return { tab: M.state.tab, ov: M.state.ov ? M.state.ov.type : '', wm: !!M.wmState(), plan: M.P(M.state.pid).plan, behind: !!(el && !ov.contains(el) && !document.getElementById('toast').contains(el) && !document.getElementById('wm').contains(el)) }; }, sel).catch(() => null);
  if (!st || st.wm) return;
  // the sheets this adapter opens (and the Add sheet on the way to one): any of them can be closed to reach another
  const mine = ['lift', 'day', 'more', 'add'].includes(st.ov), want = lift && st.plan === 'program' ? 'lift' : day ? 'day' : menu ? 'more' : add ? 'add' : '';
  const close = async () => { await page.__raw.evaluate(() => { const b = document.querySelector('#ov [data-a="ov-close"]'); if (b) b.click(); }); await page.__raw.waitForFunction(() => !window.MorningLaps.state.ov); };
  if (st.tab !== 'train') return;
  if (!want) { if (mine && st.behind) await close(); return; }
  if (st.ov === want || (st.ov && !mine)) return;
  if (st.ov) await close();
  if (want === 'lift') { await page.__raw.evaluate(() => window.MorningLaps.openLift()); await page.__raw.waitForSelector('#liftSheet'); }
  else if (want === 'day') { await page.__raw.click('#dateChip'); await page.__raw.waitForSelector('#ov .datebar'); }
  else if (want === 'add') { await page.__raw.click('#addBtn'); await page.__raw.waitForSelector('#addGrid'); }
  else { await page.__raw.click('#addBtn'); await page.__raw.click('#addMore'); await page.__raw.click('#moreAll'); await page.__raw.waitForSelector('#moreList .acts'); }
}
function adapt(page) { // wrap the calls that take a selector first
  const raw = {}; page.__raw = raw;
  ['click', 'fill', 'focus', 'press', 'type', 'tap', 'hover', 'check', 'uncheck', 'selectOption', 'dispatchEvent', 'textContent', 'inputValue', 'getAttribute', 'isVisible', '$', '$$', '$eval', '$$eval', 'waitForSelector', 'evaluate', 'waitForFunction', 'reload', 'waitForTimeout'].forEach(k => { raw[k] = page[k].bind(page); });
  ['click', 'fill', 'focus', 'press', 'type', 'tap', 'hover', 'check', 'uncheck', 'selectOption', 'dispatchEvent', 'textContent', 'inputValue', 'getAttribute', 'isVisible', '$', '$$', '$eval', '$$eval'].forEach(k => { page[k] = async (sel, ...a) => { await ensure(page, sel); return raw[k](sel, ...a); }; });
  page.waitForSelector = async (sel, o) => { await ensure(page, sel, o); return raw.waitForSelector(sel, o); };
}
// Open the lift sheet (if it is not open) the way a person does: the day's row, or Add, then Lift.
async function liftSheet(page) {
  const p = page.__raw || page;
  if (await p.$('#liftSheet')) return;
  if (await p.$('#today [data-a="lift-open"]')) await p.click('#today [data-a="lift-open"]'); else { await p.click('#addBtn'); await p.click('#addLift'); }
  await p.waitForSelector('#liftSheet');
}
// A lift, treadmill or rest entry has been saved for the selected day (and its sheet has closed). how: 'synced' or 'local'.
const savedWait = (page, how) => (page.__raw || page).waitForFunction(h => { const M = window.MorningLaps, st = M.state.status[M.state.selDate]; return !M.state.ov && !!st && (h ? st.s === h : st.s === 'synced' || st.s === 'local'); }, how || null);
// Switch Train to another day through the date chip.
async function pickDay(page, iso) {
  const p = page.__raw || page;
  if (await p.$('#liftSheet')) { await p.click('#liftClose'); await p.waitForSelector('#liftSheet', { state: 'detached' }); }
  await p.click('#dateChip'); await p.waitForSelector('#ov .datebar');
  if (await p.$('#ov [data-date="' + iso + '"]')) await p.click('#ov [data-date="' + iso + '"]'); else await p.fill('#datePick', iso); // filling a date field fires its change event
  await p.waitForFunction(d => window.MorningLaps.state.selDate === d && !window.MorningLaps.state.ov, iso);
}
async function newPage(browser, { time, width = 390, height = 844, init, me = 'tyson', scheme = 'light', reducedMotion = 'no-preference', legacy = module.exports.legacyDefault } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 900, hasTouch: width < 900, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion });
  const page = await ctx.newPage();
  if (process.env.ML_TIMEOUT) page.setDefaultTimeout(Number(process.env.ML_TIMEOUT));
  await page.clock.install({ time: time || T('2026-11-03T12:00:00Z') }); // Tue Nov 3, 07:00 Indianapolis
  await page.addInitScript(who => {
    if (who && !localStorage.getItem('ml.me')) localStorage.setItem('ml.me', JSON.stringify(who));
    window.__seen = [];
    window.addEventListener('DOMContentLoaded', () => {
      const ov = document.getElementById('ov'); if (!ov) return;
      const sweep = () => {
        if (window.__keepOv || !ov.classList.contains('center')) return;
        const b = ov.querySelector('[data-a="ov-close"]'), h = ov.querySelector('h2');
        if (b) { window.__seen.push(h ? h.textContent : ''); b.click(); }
      };
      new MutationObserver(sweep).observe(ov, { childList: true, attributes: true });
      sweep(); // one may already be showing by the time the page finishes loading
    });
  }, me);
  if (init) await page.addInitScript(init);
  page.on('pageerror', e => check('no page error', false, e.message));
  page.__legacy = !!legacy; if (legacy) adapt(page);
  await page.goto(URL);
  // with no profile on this phone the page stays hidden until one is picked, so wait for the chooser instead
  await page.waitForSelector(me ? '#main .card' : '#ov:not([hidden]) [data-a="who-pick"], html:not(.nopid) #main .card');
  return { ctx, page };
}
const val = (page, sel) => page.$eval(sel, el => el.value);
const txt = (page, sel) => page.$eval(sel, el => el.textContent.trim());
const has = (page, sel) => page.$(sel).then(Boolean);
const fill = (page, sel, v) => page.fill(sel, String(v));
async function toastText(page) { await page.waitForSelector('#toast:not([hidden])', { timeout: 4000 }); return txt(page, '#toast'); }
// resolves once the app has routed to the tab and drawn it (the hash alone changes before the redraw)
const go = (page, tab) => page.evaluate(t => { location.hash = t; }, tab).then(() => page.waitForFunction(t => location.hash === '#' + t && window.MorningLaps && window.MorningLaps.state.tab === t && !!document.querySelector('#tabs a.on'), tab));
const cssVar = (page, name) => page.evaluate(n => document.documentElement.style.getPropertyValue(n).trim(), name);
const score = (page, pid) => page.evaluate(p => window.MorningLaps.weekScore(p), pid);
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// An in-memory stand-in for the artifact database, keyed by full document path.
// window.__snapDelay (set before this runs) makes the first snapshots arrive late; window.__failListen() breaks the listeners.
// window.__uid (set before this runs) signs the visitor in as that account, which gives them a private data/users/<uid>/ corner.
function fakeDb() {
  const store = {}, cols = [], docs = {}, errs = [], first = window.__snapDelay || 10; window.__failSet = false; window.__store = store;
  window.__failListen = () => errs.forEach(fn => fn({ code: 'unavailable', message: 'test' }));
  const meta = { fromCache: false, hasPendingWrites: false };
  const snapOf = p => ({ id: p.split('/').pop(), exists: p in store, data: () => store[p], metadata: meta });
  const inCol = c => Object.keys(store).filter(k => k.indexOf(c + '/') === 0 && k.slice(c.length + 1).indexOf('/') < 0);
  const colSnap = c => ({ docs: inCol(c).sort().map(snapOf), metadata: meta });
  const notify = () => { cols.forEach(x => x.fn(colSnap(x.c))); Object.keys(docs).forEach(p => docs[p].forEach(fn => fn(snapOf(p)))); };
  window.__remoteSet = (p, d) => { store[p] = d; notify(); }; // a write arriving from the other phone
  window.claude = { use: async n => n === 'db' ? {
    doc: p => ({
      set: async d => { await new Promise(r => setTimeout(r, 20)); if (window.__failSet) throw { code: 'unavailable', message: 'test' }; store[p] = JSON.parse(JSON.stringify(d)); notify(); },
      delete: async () => { delete store[p]; notify(); },
      onSnapshot: (fn, err) => { (docs[p] = docs[p] || []).push(fn); if (err) errs.push(err); setTimeout(() => fn(snapOf(p)), first); return () => {}; }
    }),
    collection: c => ({ onSnapshot: (fn, err) => { cols.push({ c, fn }); if (err) errs.push(err); setTimeout(() => fn(colSnap(c)), first); return () => {}; } })
  } : n === 'user' && window.__uid ? { can: async () => true, id: async () => window.__uid } : null };
}
// Stand-ins for the two optional capabilities, "sample" (ask Claude) and "downloads" (save a file). Run it after
// fakeDb() for an account-mode page; on its own the page stays in browser-only mode, because claude.use("db") is null.
// window.__sampleMode / window.__dlMode (set before this runs, or changed later): 'ok', 'null' (read when the app
// asks for the capability, at load), 'declined', 'rate'. sample also takes 'fail' and 'fenced' (the answer wrapped in other text); downloads also takes 'gone'.
// window.__asked collects every call to Claude (prompt, and the size of each photo sent); window.__saved every file saved.
function capStub() {
  window.__sampleMode = window.__sampleMode || 'ok'; window.__dlMode = window.__dlMode || 'ok';
  window.__asked = []; window.__saved = []; window.__uses = [];
  const ask = async (input, opts) => {
    const list = opts && opts.images ? [].concat(Array.from(opts.images)) : [], imgs = [];
    for (const b of list) { const bm = await createImageBitmap(b); imgs.push({ w: bm.width, h: bm.height, type: b.type, size: b.size }); }
    window.__asked.push({ input: String(input), images: imgs, mode: window.__sampleMode });
    if (window.__sampleMode === 'declined') throw { code: 'not_granted', message: 'the viewer said no' };
    if (window.__sampleMode === 'rate') throw { code: 'rate_limited', message: 'slow down' };
    if (window.__sampleMode === 'fail') throw { code: 'invalid_json', message: 'not JSON', text: 'sorry' };
    if (window.__sampleMode === 'fenced') throw { code: 'invalid_json', message: 'not JSON', text: 'Here is the estimate:\n```json\n' + JSON.stringify(/Nutrition Facts/.test(input) ? window.__labelReply : window.__mealReply) + '\n```' };
    if (list.length && window.__noImages) throw { code: 'images_unavailable', message: 'no images here' };
    return JSON.parse(JSON.stringify(/Nutrition Facts/.test(input) ? window.__labelReply : window.__mealReply));
  };
  const sample = async (input, opts) => ({ text: JSON.stringify(await ask(input, opts)), truncated: false });
  sample.json = ask;
  sample.limits = async () => window.__noImages ? {} : { images: { maxCount: 4, maxInputBytes: 4000000, mediaTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] } };
  const downloads = { save: async req => {
    window.__dlTries = (window.__dlTries || 0) + 1;
    if (window.__dlMode === 'declined') throw { code: 'declined', message: 'the viewer said no' };
    if (window.__dlMode === 'rate') throw { code: 'rate_limited', message: 'wait' };
    if (window.__dlMode === 'gone') throw { code: 'unavailable', message: 'not here' };
    window.__saved.push({ filename: req.filename, data: typeof req.data === 'string' ? req.data : await new Response(req.data).text() });
    return { status: 'saved' };
  } };
  // Stored photos. window.__assetMode: unset or 'null' (this viewer is not given the ability), 'ok', or an error code
  // that every upload rejects with. What was uploaded and deleted is kept in window.__assets and window.__assetDel.
  window.__assets = window.__assets || {}; window.__assetDel = window.__assetDel || []; window.__assetUp = window.__assetUp || [];
  const assets = {
    upload: async (blob, opts) => {
      const m = window.__assetMode; if (m && m !== 'ok') throw { code: m, message: 'test' };
      const bm = await createImageBitmap(blob), id = Array.from({ length: 32 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
      window.__assets[id] = { type: (opts && opts.type) || blob.type, size: blob.size, w: bm.width, h: bm.height }; window.__assetUp.push(id);
      return { id, url: '/_blob/' + id, sizeBytes: blob.size, contentType: (opts && opts.type) || blob.type };
    },
    list: async () => ({ assets: Object.keys(window.__assets).map(id => ({ id, url: '/_blob/' + id, contentType: window.__assets[id].type, sizeBytes: window.__assets[id].size, createdAt: '2026-12-09T00:00:00Z' })), usage: { files: Object.keys(window.__assets).length, bytes: 0, maxFiles: 100, maxBytes: 1e9 } }),
    delete: async ref => { const id = String(ref).replace(/^.*\//, ''), had = id in window.__assets; if (window.__assetDelFail) throw { code: window.__assetDelFail, message: 'test' }; delete window.__assets[id]; window.__assetDel.push(id); return { deleted: had }; }
  };
  const prev = window.claude && window.claude.use;
  window.claude = { use: async n => {
    window.__uses.push(n);
    if (n === 'sample') return window.__sampleMode === 'null' ? null : sample;
    if (n === 'downloads') return window.__dlMode === 'null' ? null : downloads;
    if (n === 'assets') return !window.__assetMode || window.__assetMode === 'null' ? null : assets;
    return prev ? prev(n) : null;
  } };
}
function finish(label) {
  const fails = results.filter(r => !r.ok);
  console.log('\n' + label + ': ' + results.length + ' checks, ' + fails.length + ' failed');
  fails.forEach(f => console.log(' - ' + f.name + ' ' + f.detail));
  return fails.length;
}
module.exports = { chromium, URL, results, check, T, newPage, val, txt, has, fill, toastText, go, cssVar, score, overflow, fakeDb, capStub, finish, liftSheet, pickDay, savedWait, legacyDefault: false };
