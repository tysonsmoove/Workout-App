// Shared Playwright helpers for the Morning Laps test suites.
// Serve a doctype-wrapped copy of index.html plus foods.json on http://127.0.0.1:8765 before running.
const { chromium } = require('playwright');
const URL = process.env.ML_URL || 'http://127.0.0.1:8765/index.html';
const results = [];
function check(name, cond, detail) { results.push({ name, ok: !!cond, detail: detail || '' }); if (!cond) console.log('FAIL', name, detail == null ? '' : detail); }
const T = iso => new Date(iso);

// me: profile preselected on this "phone" (null = show the chooser). Celebration pop-ups are closed automatically
// and their titles collected in window.__seen, unless window.__keepOv is set.
async function newPage(browser, { time, width = 390, height = 844, init, me = 'tyson', scheme = 'light', reducedMotion = 'no-preference' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 900, hasTouch: width < 900, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion });
  const page = await ctx.newPage();
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
  await page.goto(URL); await page.waitForSelector('#main .card');
  return { ctx, page };
}
const val = (page, sel) => page.$eval(sel, el => el.value);
const txt = (page, sel) => page.$eval(sel, el => el.textContent.trim());
const has = (page, sel) => page.$(sel).then(Boolean);
const fill = (page, sel, v) => page.fill(sel, String(v));
async function toastText(page) { await page.waitForSelector('#toast:not([hidden])', { timeout: 4000 }); return txt(page, '#toast'); }
const go = (page, tab) => page.evaluate(t => { location.hash = t; }, tab).then(() => page.waitForFunction(t => document.querySelector('#tabs a.on') && (location.hash === '#' + t), tab));
const cssVar = (page, name) => page.evaluate(n => document.documentElement.style.getPropertyValue(n).trim(), name);
const score = (page, pid) => page.evaluate(p => window.MorningLaps.weekScore(p), pid);
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// An in-memory stand-in for the artifact database, keyed by full document path.
function fakeDb() {
  const store = {}, cols = [], docs = {}; window.__failSet = false; window.__store = store;
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
      onSnapshot: fn => { (docs[p] = docs[p] || []).push(fn); setTimeout(() => fn(snapOf(p)), 10); return () => {}; }
    }),
    collection: c => ({ onSnapshot: fn => { cols.push({ c, fn }); setTimeout(() => fn(colSnap(c)), 10); return () => {}; } })
  } : null };
}
function finish(label) {
  const fails = results.filter(r => !r.ok);
  console.log('\n' + label + ': ' + results.length + ' checks, ' + fails.length + ' failed');
  fails.forEach(f => console.log(' - ' + f.name + ' ' + f.detail));
  return fails.length;
}
module.exports = { chromium, URL, results, check, T, newPage, val, txt, has, fill, toastText, go, cssVar, score, overflow, fakeDb, finish };
