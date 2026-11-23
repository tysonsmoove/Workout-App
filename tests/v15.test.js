// The checks for version 15: three fixes (Health paste box, reset plus deload, compact stuck-lift lines) and four
// additions (scan a barcode, describe a restaurant meal, undo after removing, download a backup).
// Headless browser, browser-only mode, seeded storage: two profiles and six-plus weeks of history, Tyson in Phase 3
// with two stalled lifts and a deload on offer, saved custom foods (two with a barcode), and barcode photos drawn
// here: UPC-A, EAN-13, EAN-8, UPC-E, and one too blurred to read.
// Browser-only mode has no window.claude, so claude.use("sample") and claude.use("downloads") are stubbed
// (helpers.capStub) in four states each: available, null, declined, rate limited.
// Run: ML_ZXING=/path/to/zxing/umd/index.min.js node tests/v15.test.js   (without ML_ZXING the reader comes from the CDN)
const fs = require('fs');
const { chromium, check, results, T, newPage, val, txt, has, fill, go, score, fakeDb, capStub, finish } = require('./helpers');
const ZX_URL = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
const kvAll = page => page.evaluate(() => JSON.parse(localStorage.getItem('ml.kv') || '{}'));
const kv = (page, path) => page.evaluate(p => (JSON.parse(localStorage.getItem('ml.kv') || '{}'))[p] || null, path);
const ses = (page, d) => page.evaluate(x => (JSON.parse(localStorage.getItem('ml.sessions') || '{}'))[x] || null, d);
const settings = page => page.evaluate(() => JSON.parse(localStorage.getItem('ml.settings') || '{}'));
const ML = (page, fn, arg) => page.evaluate(fn, arg);
const toastWith = (page, part) => page.waitForFunction(x => { const t = document.getElementById('toast'); return !t.hidden && t.textContent.includes(x) ? t.textContent : false; }, part, { timeout: 5000 }).then(h => h.jsonValue()).catch(() => txt(page, '#toast'));
const settled = page => page.waitForFunction(() => window.MorningLaps.state.ready && !!(JSON.parse(localStorage.getItem('ml.kv') || '{}'))['profiles/jacquie/weekgoals/' + (function () { const s = window.MorningLaps.state.today, d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8))); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); })()]);
const switchTo = async (page, pid) => { await page.click('#whoBtn'); await page.click('[data-a="who-pick"][data-pid="' + pid + '"]'); await page.waitForFunction(p => window.MorningLaps.state.pid === p && document.getElementById('ov').hidden, pid); };
const pickDate = (page, d) => page.click('.datebar [data-date="' + d + '"]');
const carry = async page => { const all = await page.evaluate(() => Object.assign({}, localStorage)); return 'if(!localStorage.getItem("carried")){localStorage.clear();var s=' + JSON.stringify(all) + ';Object.keys(s).forEach(function(k){localStorage.setItem(k,s[k]);});localStorage.setItem("carried","1");}'; };
const plus = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const watchWrites = page => page.evaluate(() => { window.__w = []; if (window.__wOn) return; window.__wOn = true; const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k) { if (k === 'ml.kv' || k === 'ml.sessions' || k === 'ml.settings') window.__w.push(k); return set.apply(this, arguments); }; });
const writes = page => page.evaluate(() => window.__w.slice());

/* ---------- the seed: history from Mon Oct 26 through Fri Dec 4, "today" Wed Dec 9 ---------- */
const WEEKS = ['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'];
const reps = (n, c) => Array.from({ length: c || 3 }, () => n);
// week i: every lift goes up a step except two, which sit still: the shoulder press at 50 lb and the pushdown at 40 lb
const SETS = (day, i) => day === 'push' ? { chestpress: { w: 70 + 5 * i, reps: reps(12) }, shoulderpress: { w: 50, reps: reps(10) }, pushdown: { w: 40, reps: reps(12) } }
  : day === 'pull' ? { latpull: { w: 80 + 5 * i, reps: reps(12) }, seatedrow: { w: 80 + 5 * i, reps: reps(12) }, dbcurl: { w: 20 + 2.5 * i, reps: reps(12) } }
  : { legpress: { w: 140 + 10 * i, reps: reps(12) }, legext: { w: 70 + 5 * i, reps: reps(15) }, legcurl: { w: 60 + 5 * i, reps: reps(15) } };
const lift = (date, day, phase, ex, extra) => Object.assign({ v: 2, date, kind: 'strength', day, phase, planned: Object.keys(ex), plannedBase: Object.keys(ex), swaps: {}, ex, qualifies: true, complete: true, treadmill: { minutes: 20, title: '' }, savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' }, extra);
const tread = (date, phase) => ({ v: 2, date, kind: 'cardio', phase, treadmill: { minutes: 25, title: 'Fitness+ run' }, savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' });
const act = (date, a, name, min, more) => Object.assign({ id: 'a-' + a + '-' + date, a, name, min, feel: 'good', hurt: false, note: '', mv: true, at: date + 'T12:00:00Z' }, more);
const day = (date, acts) => ({ v: 2, date, kind: 'activity', acts, savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' });
const item = (id, name, meal, kcal, p, more) => Object.assign({ id, name, meal, qty: 1, unit: 'serving', grams: null, src: 'Quick add', n: [kcal, p, null, null, null, null, null, null, null, null, null, null, null, null] }, more);
// kcal, protein, fat, carbs, fiber, sugar, sat fat, trans fat, cholesterol, sodium, potassium, calcium, iron, vitamin D
const CHILI = { name: 'Trackside chili', serving: '1 bowl', n: [320, 22, 9, 30, 8, 6, 3, null, null, 780, null, null, null, null], by: 'tyson', createdAt: '2026-11-01T12:00:00.000Z', barcode: '0012345678905' };
const BAR = { name: 'Paddock protein bar', serving: '1 bar', n: [200, 20, 7, 22, 3, 5, 2.5, null, null, 180, null, null, null, null], by: 'jacquie', createdAt: '2026-11-05T12:00:00.000Z', barcode: '4006381333931' };
const OATS = { name: 'Overnight oats', serving: '1 jar', n: [350, 14, 9, 52, 7, 12, 2, null, null, 90, null, null, null, null], by: 'jacquie', createdAt: '2026-11-08T12:00:00.000Z' };
const FINALS = {};
[['2026-10-26', 48, 52, 'jacquie', ''], ['2026-11-02', 61, 58, 'tyson', ''], ['2026-11-09', 55, 63, 'jacquie', ''], ['2026-11-16', 64, 60, 'tyson', 'washes the car'], ['2026-11-23', 57, 66, 'jacquie', 'cooks Sunday dinner']]
  .forEach(([ws, t, j, w, st]) => { FINALS['results/' + ws] = Object.assign({ ws, tyson: t, jacquie: j, winner: w, played: true, final: true, teamWeek: true, closedAt: plus(ws, 9) + 'T12:00:00.000Z' }, st ? { stakes: st } : {}); });
// opt.settings: extra lifting settings. opt.thisWeek: Tyson's records for the current week. opt.kv: extra shared documents.
function seedDocs(opt) {
  opt = opt || {};
  const sessions = {}, kv = Object.assign({}, FINALS);
  WEEKS.forEach((ws, i) => { const ph = i < 2 ? 1 : i === 2 ? 2 : 3, d = n => plus(ws, n);
    sessions[d(0)] = lift(d(0), 'push', ph, SETS('push', i)); sessions[d(1)] = tread(d(1), ph); sessions[d(2)] = lift(d(2), 'pull', ph, SETS('pull', i)); sessions[d(3)] = tread(d(3), ph);
    sessions[d(4)] = i === 0 ? tread(d(4), ph) : lift(d(4), 'legs', ph, SETS('legs', i)); // the first week had two lifts, so five lift weeks are complete: a deload is on offer
    kv['profiles/jacquie/sessions/' + d(0)] = day(d(0), [act(d(0), 'walkeasy', 'Easy walk', 20)]);
    kv['profiles/jacquie/sessions/' + d(2)] = day(d(2), [act(d(2), 'chairyoga', 'Chair yoga', 20)]);
    kv['profiles/jacquie/sessions/' + d(4)] = day(d(4), [act(d(4), 'walkbrisk', 'Brisk walk', 20)]);
  });
  (opt.thisWeek || []).forEach(r => { sessions[r.date] = r; });
  kv['profiles/jacquie/sessions/2026-12-07'] = day('2026-12-07', [act('2026-12-07', 'walkeasy', 'Easy walk', 20), act('2026-12-07', 'chairyoga', 'Chair yoga', 15)]);
  // a day with a Watch top-up: 20 minutes logged by hand, the Watch saw 35
  kv['profiles/jacquie/health/2026-12-08'] = { v: 1, date: '2026-12-08', exercise: 35, steps: 6100, importedAt: '2026-12-08T22:00:00.000Z' };
  kv['profiles/jacquie/sessions/2026-12-08'] = day('2026-12-08', [act('2026-12-08', 'walkeasy', 'Easy walk', 20), { id: 'hk-exercise', a: 'other', name: 'Apple Watch exercise', min: 15, feel: null, hurt: false, note: 'From Apple Health', mv: true, src: 'health', at: '2026-12-08T22:00:00.000Z' }]);
  kv['profiles/jacquie/food/2026-11-30'] = { v: 1, date: '2026-11-30', items: [item('f1', 'Seeded day', 'd', 1800, 100)], water: 76 };
  kv['profiles/jacquie/food/2026-12-08'] = { v: 1, date: '2026-12-08', items: [item('y1', 'Oatmeal with milk', 'b', 300, 10), item('y2', 'Banana', 'b', 105, 1), item('y3', 'Chicken and rice', 'd', 650, 45)], water: 32, updatedAt: '2026-12-08T23:00:00.000Z' };
  kv['profiles/jacquie/food/2026-12-09'] = { v: 1, date: '2026-12-09', items: [item('t1', 'Greek yogurt', 'b', 150, 15), item('t2', '=SUM(A1)', 'l', 400, 20), item('t3', 'Soup, "the big one"', 'l', 250, 12)], water: 24, updatedAt: '2026-12-09T15:00:00.000Z' };
  kv['profiles/tyson/food/2026-12-08'] = { v: 1, date: '2026-12-08', items: [item('z1', 'Eggs and toast', 'b', 420, 24)], water: 40, updatedAt: '2026-12-08T13:00:00.000Z' };
  kv['profiles/jacquie/meals/m1'] = { v: 1, name: 'Usual breakfast', items: [{ name: 'Oatmeal with milk', qty: 1, unit: 'serving', grams: null, src: 'Quick add', n: [300, 10, null, null, null, null, null, null, null, null, null, null, null, null] }, { name: 'Banana', qty: 1, unit: 'serving', grams: null, src: 'Quick add', n: [105, 1, null, null, null, null, null, null, null, null, null, null, null, null] }], createdAt: '2026-12-01T12:00:00.000Z' };
  kv['profiles/jacquie'] = { name: 'Jacquie', body: { sex: 'f', age: 30, heightIn: 64, weightLb: 150, activity: 'light', pace: 'maintain' }, weighIns: { '2026-10-26': 150 }, badges: { green: '2026-10-26', water1: '2026-11-30', fuel1: '2026-11-30' } };
  kv['profiles/tyson'] = { name: 'Tyson', gym: 'Anytime Fitness Avon' };
  kv['comp/settings'] = { start: '2026-10-26', stakes: '', stakesBy: { '2026-11-30': 'buys coffee' } };
  kv['iou/2026-11-16'] = { paid: true, at: '2026-11-25T12:00:00.000Z', by: 'jacquie' };
  kv['foods/cf1'] = CHILI; kv['foods/cf2'] = BAR; kv['foods/cf3'] = OATS;
  Object.assign(kv, opt.kv);
  return { sessions, settings: Object.assign({ startDate: '2026-10-26', goal: 5, maxed: {}, swaps: {} }, opt.settings), kv };
}
// pre: script run first (capability modes). The stubs for "sample" and "downloads" are always installed.
const STUB = ';(' + capStub.toString() + ')();';
const LABEL = { name: null, serving: '2/3 cup (55 g)', calories: 230, protein_g: 3, carbs_g: 37, fat_g: 8, fiber_g: 4, sugars_g: null, sat_fat_g: 1, sodium_mg: 160 };
const MEAL = [{ name: 'Chipotle chicken', portion: 'about 4 oz', calories: 180, protein_g: 32, carbs_g: 0, fat_g: 7 }, { name: 'White rice', portion: '1 scoop', calories: 210, protein_g: 4, carbs_g: 40, fat_g: 4 }, { name: 'Black beans', portion: '1 scoop', calories: 130, protein_g: 8, carbs_g: 22, fat_g: 1.5 }, { name: 'Guacamole', portion: '1 side', calories: 230, protein_g: 2, carbs_g: 8, fat_g: 22 }];
const REPLIES = ';window.__labelReply=' + JSON.stringify(LABEL) + ';window.__mealReply=' + JSON.stringify(MEAL) + ';';
function local(docs, pre) {
  return (pre || '') + REPLIES + STUB + 'if(!localStorage.getItem("seeded")){localStorage.setItem("seeded","1");localStorage.setItem("ml.sessions",' + JSON.stringify(JSON.stringify(docs.sessions)) + ');localStorage.setItem("ml.settings",' +
    JSON.stringify(JSON.stringify(docs.settings)) + ');localStorage.setItem("ml.kv",' + JSON.stringify(JSON.stringify(docs.kv)) + ');}';
}
function shared(docs, pre) { // the same seed in the shared store, signed in
  const store = Object.assign({}, docs.kv, { 'settings/program': docs.settings }); Object.keys(docs.sessions).forEach(d => { store['sessions/' + d] = docs.sessions[d]; });
  return (pre || '') + REPLIES + ';window.__uid="u-test";(' + fakeDb.toString() + ')();Object.assign(window.__store,' + JSON.stringify(store) + ');' + STUB;
}
const WED = T('2026-12-09T17:00:00Z'), NEXT = T('2026-12-14T17:00:00Z');

/* ---------- barcode photos, drawn in a blank page ---------- */
const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const P13 = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
const PE = ['EEEOOO', 'EEOEOO', 'EEOOEO', 'EEOOOE', 'EOEEOO', 'EOOEEO', 'EOOOEE', 'EOEOEO', 'EOEOOE', 'EOOEOE']; // UPC-E, number system 0
const ean13 = d => { const par = P13[+d[0]]; let s = '101'; for (let i = 1; i <= 6; i++) s += (par[i - 1] === 'L' ? L : G)[+d[i]]; s += '01010'; for (let i = 7; i <= 12; i++) s += R[+d[i]]; return s + '101'; };
const upca = d => ean13('0' + d); // a UPC-A symbol is an EAN-13 with a leading 0
const ean8 = d => '101' + [0, 1, 2, 3].map(i => L[+d[i]]).join('') + '01010' + [4, 5, 6, 7].map(i => R[+d[i]]).join('') + '101';
const upce = d => { const par = PE[+d[7]]; let s = '101'; for (let i = 0; i < 6; i++) s += ((par[i] === 'O') === (d[0] === '0') ? L : G)[+d[1 + i]]; return s + '010101'; }; // number system 1 swaps odd and even
function drawPhoto(o) { // runs in the page: a package label on a table, photographed
  const W = o.W || 1200, H = o.H || 900, m = o.module || 4, quiet = 12, barH = o.barH || 220;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#b9b2a6'; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, H / 2); g.rotate((o.angle || 0) * Math.PI / 180 + (o.turn ? Math.PI / 2 : 0));
  if (o.bits) {
    const bw = (o.bits.length + 2 * quiet) * m, bh = barH + 90;
    g.fillStyle = '#fbfaf6'; g.fillRect(-bw / 2 - 40, -bh / 2 - 40, bw + 80, bh + 80);
    g.fillStyle = '#16130f'; let x = -bw / 2 + quiet * m;
    for (const b of o.bits) { if (b === '1') g.fillRect(x, -bh / 2, m, barH); x += m; }
    g.font = Math.round(m * 9) + 'px monospace'; g.textAlign = 'center'; g.fillText(o.text || '', 0, -bh / 2 + barH + m * 11);
  } else { // a nutrition label, or a plate: the stub does not read it
    g.fillStyle = '#fbfaf6'; g.fillRect(-W * 0.35, -H * 0.4, W * 0.7, H * 0.8); g.fillStyle = '#16130f'; g.font = 'bold ' + Math.round(H / 14) + 'px sans-serif'; g.textAlign = 'center';
    (o.lines || ['Nutrition Facts', 'Serving size 2/3 cup (55 g)', 'Calories 230']).forEach((t, i) => g.fillText(t, 0, -H * 0.25 + i * H / 9));
  }
  g.restore();
  if (!o.blur) return c.toDataURL(o.jpeg ? 'image/jpeg' : 'image/png', 0.9);
  const c2 = document.createElement('canvas'); c2.width = W; c2.height = H; const g2 = c2.getContext('2d'); g2.filter = 'blur(' + o.blur + 'px)'; g2.drawImage(c, 0, 0);
  return c2.toDataURL('image/png');
}

(async () => {
  const browser = await chromium.launch();
  let ctx, page; const consoleErrors = [];
  // photos
  const gen = await (await browser.newContext()).newPage();
  const photo = async (name, o) => { const url = await gen.evaluate(drawPhoto, o), jpeg = url.startsWith('data:image/jpeg'); return { name: name + (jpeg ? '.jpg' : '.png'), mimeType: jpeg ? 'image/jpeg' : 'image/png', buffer: Buffer.from(url.split(',')[1], 'base64') }; };
  const PH = {
    upca: await photo('upca', { bits: upca('012345678905'), text: '0 12345 67890 5', angle: 3 }),                                   // the chili, as a US package prints it
    ean13same: await photo('ean13same', { bits: ean13('0012345678905'), text: '0 012345 678905', W: 2400, H: 1800, module: 6, turn: true, jpeg: true }), // the same product, EAN style: bigger photo, turned sideways
    ean13: await photo('ean13', { bits: ean13('4006381333931'), text: '4 006381 333931', angle: -2 }),                              // the protein bar
    ean8: await photo('ean8', { bits: ean8('96385074'), text: '9638 5074', module: 5 }),
    upce: await photo('upce', { bits: upce('01234565'), text: '0 123456 5', module: 5 }),
    upceTurned: await photo('upceTurned', { bits: upce('04252614'), text: '0 425261 4', module: 4, turn: true, angle: 180, W: 2000, H: 1500, jpeg: true }), // sideways and upside down, in a bigger photo
    upce1: await photo('upce1', { bits: upce('11234562'), text: '1 123456 2', module: 6 }),                                             // number system 1
    fresh: await photo('fresh', { bits: upca('036000291452'), text: '0 36000 29145 2' }),
    far: await photo('far', { bits: ean13('4006381333931'), text: '4 006381 333931', W: 4000, H: 3000, module: 2, barH: 130, jpeg: true }), // a phone photo taken from too far: the barcode is small                                            // a product nobody has saved
    other: await photo('other', { bits: ean13('5901234123457'), text: '5 901234 123457' }),                                          // another unsaved one
    blurry: await photo('blurry', { bits: upca('012345678905'), text: '0 12345 67890 5', blur: 14 }),
    label: await photo('label', { W: 3000, H: 2250, jpeg: true }),
    plate: await photo('plate', { W: 2600, H: 1950, jpeg: true, lines: ['burrito bowl'] })
  };
  await gen.context().close();
  const open = async (opts) => {
    ({ ctx, page } = await newPage(browser, opts)); page.on('console', m => { if (m.type() === 'error' && !/favicon/i.test(m.text()) && !(opts.noReader && /Failed to load resource/.test(m.text()))) consoleErrors.push(m.text()); });
    if (process.env.ML_ZXING && !opts.noReader) await ctx.route(ZX_URL, r => r.fulfill({ path: process.env.ML_ZXING, contentType: 'application/javascript' }));
    if (opts.noReader) await ctx.route(ZX_URL, r => r.abort());
    if (!opts.shared) await settled(page);
    return page;
  };
  const only = process.env.ML_ONLY ? process.env.ML_ONLY.split(',') : null; // ML_ONLY=B,D runs just those sections
  const section = async (tag, fn) => {
    if (only && !only.includes(tag)) return;
    try { await fn(); } catch (e) {
      let where = ''; try { where = ' [sheet: ' + (await ovType()) + '; toast: ' + (await page.evaluate(() => { const t = document.getElementById('toast'); return t.hidden ? '' : t.textContent; })) + '; after: ' + (results.length ? results[results.length - 1].name : 'start') + ']'; } catch (e2) { /* page gone */ }
      check(tag + ' ran to the end', false, String(e && e.message || e).split('\n')[0] + where);
    }
    try { if (ctx) await ctx.close(); } catch (e) { /* already closed */ }
  };
  const addFood = async meal => { await go(page, 'fuel'); await page.click('[data-a="food-add"][data-meal="' + (meal || 'l') + '"]'); await page.waitForSelector('#foodQ'); };
  const scan = async (ph, sel) => { await page.setInputFiles(sel || '#scanFile', ph); };
  const ovType = () => page.evaluate(() => { const o = window.MorningLaps.state.ov; return o ? o.type + (o.step ? ':' + o.step : '') : ''; });
  const waitOv = t => page.waitForFunction(x => { const o = window.MorningLaps.state.ov; return !!o && (o.type + (o.step ? ':' + o.step : '')) === x; }, t);
  const form = () => page.evaluate(() => { const o = {}; document.querySelectorAll('#ov [data-ovf]').forEach(el => { o[el.dataset.ovf] = el.value; }); return o; });
  const asked = () => page.evaluate(() => window.__asked.slice());

  // ---------- 0: the seed is what was asked for ----------
  await section('S', async () => {
    await open({ me: 'tyson', time: WED, init: local(seedDocs()) });
    const s = await ML(page, () => { const M = window.MorningLaps, st = M.state; return { phase: M.phaseFor('2026-12-09'), cw: M.completedWeeks('2026-12-09'), dl: M.deloadState(), sp: M.stallFor('shoulderpress', '2026-12-09'), pd: M.stallFor('pushdown', '2026-12-09'), cp: M.stallFor('chestpress', '2026-12-09'),
      ts: Object.keys(st.data.tyson.sessions).sort(), js: Object.keys(st.data.jacquie.sessions).sort(), foods: Object.keys(st.customFoods).map(id => [st.customFoods[id].name, st.customFoods[id].barcode || '']) }; });
    const span = a => Math.round((Date.parse(a[a.length - 1]) - Date.parse(a[0])) / 86400000 / 7 * 10) / 10;
    check('S two profiles with six-plus weeks of history each', span(s.ts) >= 5.5 && span(s.js) >= 6 && s.ts.length >= 28 && s.js.length >= 18, s.ts.length + ' ' + s.js.length);
    check('S Tyson is in Phase 3 with two stalled lifts and a deload on offer', s.phase === 3 && s.cw === 5 && s.dl === 'offer' && s.sp && s.sp.w === 50 && s.pd && s.pd.w === 40 && s.cp === null, JSON.stringify(s));
    check('S saved custom foods, with and without a barcode', same(s.foods.sort(), [['Overnight oats', ''], ['Paddock protein bar', '4006381333931'], ['Trackside chili', '0012345678905']]), JSON.stringify(s.foods));
    check('S the stubs answer for sample and downloads, and the app is in browser-only mode', await ML(page, () => { const M = window.MorningLaps; return !!M.caps.sample && !!M.caps.images && !!M.caps.downloads && M.state.storage === 'local' && window.__uses.includes('sample') && window.__uses.includes('downloads'); }));
  });

  // ---------- Fix 1: Import from Health ----------
  await section('1', async () => {
    await open({ me: 'jacquie', time: WED, init: local(seedDocs()) });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    await go(page, 'me');
    const focusInTap = await page.evaluate(() => { document.querySelector('#healthCard [data-a="health"]').click(); return document.activeElement && document.activeElement.id; });
    check('1 the box has focus inside the same tap that opens the sheet (Me)', focusInTap === 'hkText', focusInTap);
    check('1 no clipboard button', !(await has(page, '#hkPaste')) && !(await has(page, '[data-a="hk-paste"]')) && !(await page.$$eval('#ov button', bs => bs.some(b => /clipboard|paste/i.test(b.textContent)))) && await ML(page, () => !/readText|hk-paste/.test(document.documentElement.innerHTML)));
    check('1 the empty box says "Tap here, then Paste"', await page.$eval('#hkText', b => b.placeholder === 'Tap here, then Paste' && b.value === ''));
    await page.evaluate(() => navigator.clipboard.writeText('date: 2026-12-09\nexercise: 31\nsteps: 6200'));
    await page.keyboard.press('Control+V');
    await page.waitForFunction(() => document.getElementById('hkPreview').textContent.includes('31'), null, { timeout: 5000 }).catch(() => {});
    check('1 pasting still shows the preview, and the Import button', (await val(page, '#hkText')).includes('exercise: 31') && (await txt(page, '#hkPreview')).includes('Watch exercise: 31 min') && await page.$eval('#hkGo', b => !b.disabled), await txt(page, '#hkPreview'));
    await page.click('#hkGo'); await page.waitForSelector('#ov', { state: 'hidden' });
    check('1 and the import still saves', ((await kv(page, 'profiles/jacquie/health/2026-12-09')) || {}).exercise === 31);
    await go(page, 'train');
    const focus2 = await page.evaluate(() => { document.querySelector('.sess [data-a="health"]').click(); return document.activeElement && document.activeElement.id; });
    check('1 the same from the Train button', focus2 === 'hkText' && !(await has(page, '#hkPaste')));
  });

  // ---------- Fix 2: a reset and a deload week do not stack ----------
  await section('2', async () => {
    await open({ me: 'tyson', time: WED, init: local(seedDocs()) });
    await page.waitForSelector('[data-stall-line="shoulderpress"]');
    await page.click('[data-a="stall-open"][data-key="shoulderpress"]'); await page.click('[data-a="stall-reset"][data-key="shoulderpress"]'); await page.waitForFunction(() => !document.querySelector('[data-stall-line="shoulderpress"]'));
    const sug = k => ML(page, key => { const s = window.MorningLaps.suggest(key, window.MorningLaps.state.today); return { w: s.w, sets: s.sets, reset: !!s.reset, deload: !!s.deload, why: s.why }; }, k);
    const s0 = await sug('shoulderpress');
    check('2 the reset is waiting: 45 lb for 3 sets', s0.w === 45 && s0.reset && !s0.deload && s0.sets === 3, JSON.stringify(s0));
    await page.click('[data-a="deload-take"]'); await page.waitForFunction(() => document.getElementById('deloadBanner').textContent.includes('Deload week is on'));
    const s1 = await sug('shoulderpress'), p1 = await sug('pushdown');
    check('2 shoulder press at 50 lb with a reset waiting suggests 45 during the deload, not 40', s1.w === 45 && s1.deload && s1.sets === 2 && await page.$eval('[data-usew="shoulderpress"]', b => b.dataset.val === '45') && s1.why.includes('still waiting'), JSON.stringify(s1));
    check('2 a lift with no reset still gets 90% in the deload week', p1.w === 35 && p1.deload && p1.sets === 2 && !p1.reset, JSON.stringify(p1));
    // log the deload session, then look at the week after
    await fill(page, '#tmMin', 20); for (const k of ['shoulderpress', 'pushdown']) { await page.click('[data-usew="' + k + '"]'); await fill(page, '#r-' + k + '-0', 10); await fill(page, '#r-' + k + '-1', 10); }
    await page.evaluate(() => { const b = document.querySelector('#rest:not([hidden]) [data-a="timer-x"]'); if (b) b.click(); }); await page.click('h1'); await page.click('#saveBtn'); await page.waitForFunction(() => { const r = JSON.parse(localStorage.getItem('ml.sessions'))['2026-12-09']; return r && r.kind === 'strength'; });
    const rec = await ses(page, '2026-12-09');
    check('2 the deload session saved at 45 lb for 2 sets', rec.deload === true && rec.ex.shoulderpress.w === 45 && rec.ex.shoulderpress.reps.length === 2, JSON.stringify(rec.ex));
    const next = await carry(page); await ctx.close();
    await open({ me: 'tyson', time: NEXT, init: next });
    const s2 = await sug('shoulderpress'), p2 = await sug('pushdown');
    check('2 and 45 the week after: the reset waited for the first normal session', s2.w === 45 && s2.reset && !s2.deload && s2.sets === 3 && (await settings(page)).resets.shoulderpress.w === 45, JSON.stringify(s2));
    check('2 the other lift picks up from its last normal session', p2.w === 40 && !p2.deload && p2.sets === 3, JSON.stringify(p2));
    await ctx.close();
    // the lighter of the two, when they differ
    await open({ me: 'tyson', time: WED, init: local(seedDocs({ settings: { resets: { shoulderpress: { w: 40, from: 50, at: '2026-12-01' } }, deload: { ws: '2026-12-07' } } })) });
    const a = await sug('shoulderpress');
    await ctx.close();
    await open({ me: 'tyson', time: WED, init: local(seedDocs({ settings: { resets: { shoulderpress: { w: 47.5, from: 50, at: '2026-12-01' } }, deload: { ws: '2026-12-07' } } })) });
    const b = await sug('shoulderpress');
    check('2 a reset lighter than 90% wins, and a reset heavier than 90% loses', a.w === 40 && a.deload && b.w === 45 && b.deload, JSON.stringify([a, b]));
  });

  // ---------- Fix 3: compact stuck-lift lines ----------
  await section('3', async () => {
    await open({ me: 'tyson', time: WED, init: local(seedDocs()) });
    await page.waitForSelector('[data-stall-line="shoulderpress"]');
    const lines = await page.$$eval('.stallline', els => els.map(e => ({ key: e.dataset.stallLine, text: e.textContent.replace(/\s+/g, ' ').trim(), h: Math.round(e.getBoundingClientRect().height), underName: !!e.previousElementSibling && e.previousElementSibling.classList.contains('exhead') || !!e.parentElement.querySelector('.exhead, h3') })));
    check('3 two stalled lifts, each one line: "Stuck at 50 lb · 3 sessions · Fix"', lines.length === 2 && lines[0].key === 'shoulderpress' && lines[0].text === 'Stuck at 50 lb · 3 sessions · Fix' && lines[1].key === 'pushdown' && lines[1].text === 'Stuck at 40 lb · 3 sessions · Fix', JSON.stringify(lines));
    check('3 each takes one line until opened (no card, under 44 px)', lines.every(l => l.h <= 44) && !(await has(page, '.stall')), JSON.stringify(lines.map(l => l.h)));
    const pos = await page.evaluate(() => { const ex = document.querySelector('.ex[data-ex="shoulderpress"]'), line = ex.querySelector('.stallline'), name = ex.querySelector('h3, .exname, .exhead'), row = ex.querySelector('.logrow'); return { inEx: !!line, afterName: name ? name.getBoundingClientRect().top < line.getBoundingClientRect().top : null, beforeSets: row ? line.getBoundingClientRect().top < row.getBoundingClientRect().top : null }; });
    check('3 the line sits under the exercise name, above the sets', pos.inEx && pos.afterName !== false && pos.beforeSets === true, JSON.stringify(pos));
    await page.click('[data-a="stall-open"][data-key="shoulderpress"]'); await page.waitForSelector('.stall[data-stall="shoulderpress"]');
    const card = await txt(page, '.stall[data-stall="shoulderpress"]');
    check('3 Fix opens the choices and the explanation in place', card.includes('Reset: drop 10% and build back') && card.includes('Swap for 4 weeks') && card.includes('Dismiss') && card.length > 120 && await has(page, '[data-a="stall-reset"][data-key="shoulderpress"]') && await has(page, '[data-a="stall-swap"][data-key="shoulderpress"]') && await has(page, '[data-a="stall-x"][data-key="shoulderpress"]'), card);
    check('3 the other stalled lift stays one line', (await page.$$('.stall')).length === 1 && (await page.$$('.stallline')).length === 2 && !(await has(page, '.stall[data-stall="pushdown"]')));
    await page.click('[data-a="stall-open"][data-key="shoulderpress"]'); await page.waitForFunction(() => !document.querySelector('.stall'));
    check('3 tapping again closes it', (await page.$$('.stallline')).length === 2);
    // every choice still works: Reset on one, Dismiss on the other
    await page.click('[data-a="stall-open"][data-key="shoulderpress"]'); await page.click('[data-a="stall-reset"][data-key="shoulderpress"]'); await page.waitForFunction(() => !document.querySelector('[data-stall-line="shoulderpress"]'));
    await page.click('[data-a="stall-open"][data-key="pushdown"]'); await page.click('[data-a="stall-x"][data-key="pushdown"]'); await page.waitForFunction(() => !document.querySelector('.stallline'));
    const st = await settings(page);
    check('3 Reset and Dismiss still work', st.resets.shoulderpress.w === 45 && st.resets.shoulderpress.from === 50 && st.stallSeen.pushdown === '2026-11-30' && !st.stallSeen.shoulderpress, JSON.stringify([st.resets, st.stallSeen]));
    await ctx.close();
    await open({ me: 'tyson', time: WED, init: local(seedDocs()) });
    await page.click('[data-a="stall-open"][data-key="pushdown"]'); await page.click('[data-a="stall-swap"][data-key="pushdown"]'); await page.waitForSelector('.ex[data-ex="dbtri"]');
    const sw = await settings(page);
    check('3 Swap for 4 weeks still works', sw.swaps.pushdown === 'dbtri' && sw.swapBack.pushdown.to === 'dbtri' && sw.swapBack.pushdown.until === '2027-01-06' && (await page.$$('.stallline')).length === 1, JSON.stringify([sw.swaps, sw.swapBack]));
  });

  // ---------- New 4: scan a barcode ----------
  await section('B', async () => {
    await open({ me: 'jacquie', time: WED, init: local(seedDocs()) });
    const norm = await ML(page, () => { const n = window.MorningLaps.normBarcode; return [n('012345678905', 'UPC_A'), n('0012345678905', 'EAN_13'), n('01234565', 'UPC_E'), n('96385074', 'EAN_8'), n('4006381333931'), n('0 12345 67890 5'), n('012345678906'), n('12345'), n('abc'), n('01234565'), n('96385074')]; });
    check('B one stored form: UPC-A gets a leading 0, UPC-E is expanded, EAN-13 and EAN-8 are kept, bad digits are refused',
      same(norm, ['0012345678905', '0012345678905', '0012345000065', '96385074', '4006381333931', '0012345678905', null, null, null, '0012345000065', '96385074']), JSON.stringify(norm));
    await addFood('l'); await watchWrites(page);
    const btn = await page.evaluate(() => { const row = document.getElementById('foodTools'), kids = Array.from(row.children), inp = document.getElementById('scanFile'); return { order: kids.map(k => k.textContent.trim()), accept: inp.accept, capture: inp.getAttribute('capture'), type: inp.type, covers: inp.getBoundingClientRect().width >= inp.parentElement.getBoundingClientRect().width - 2 }; });
    check('B "Scan barcode" sits next to Quick add, as a camera file input', btn.order[0] === 'Quick add calories' && btn.order[1] === 'Scan barcode' && btn.accept === 'image/*' && btn.capture === 'environment' && btn.type === 'file' && btn.covers, JSON.stringify(btn));
    // a UPC-A photo of a saved product
    await scan(PH.upca); await waitOv('fooditem');
    const a = await page.evaluate(() => ({ head: document.querySelector('#ov h2').textContent, add: document.getElementById('foodAdd').textContent, qty: document.getElementById('fQty').value, zx: !!window.ZXing }));
    check('B a UPC-A photo opens the saved food, ready to log', a.head === 'Trackside chili' && a.add === 'Add to Lunch · 320 cal' && a.qty === '1' && a.zx, JSON.stringify(a));
    await page.click('#foodAdd'); await page.waitForSelector('#ov', { state: 'hidden' });
    const logged = (await kv(page, 'profiles/jacquie/food/2026-12-09')).items.slice(-1)[0];
    check('B and logging it works as for any food', logged.name === 'Trackside chili' && logged.meal === 'l' && logged.n[0] === 320 && logged.src === 'Yours', JSON.stringify(logged));
    // an EAN-13 photo of the same product: bigger, sideways
    await addFood('d'); await scan(PH.ean13same); await waitOv('fooditem');
    check('B an EAN-13 photo of the same product matches the same saved food', await txt(page, '#ov h2') === 'Trackside chili');
    await page.click('[data-a="food-back"]'); await page.waitForSelector('#foodQ');
    await scan(PH.ean13); await waitOv('fooditem');
    check('B an EAN-13 product is found too', await txt(page, '#ov h2') === 'Paddock protein bar');
    await page.click('[data-a="food-back"]'); await page.waitForSelector('#foodQ');
    await scan(PH.far); await waitOv('fooditem');
    check('B a small barcode in a big phone photo is still read', await txt(page, '#ov h2') === 'Paddock protein bar');
    await page.click('[data-a="food-back"]'); await page.waitForSelector('#foodQ');
    // a blurry photo: type the digits
    await watchWrites(page);
    await scan(PH.blurry); await waitOv('scan:type');
    check('B a blurry photo says so and offers a box for the digits', (await txt(page, '#scanMsg')).includes('Couldn\'t read the barcode') && await has(page, '#scanDigits') && await page.evaluate(() => document.activeElement.id === 'scanDigits') && await has(page, '#ov [data-file="scan"]'));
    await fill(page, '#scanDigits', '012345678906'); await page.click('[data-a="scan-digits"]');
    check('B digits that fail the check digit are refused', (await ovType()) === 'scan:type' && (await txt(page, '#scanMsg')).includes('not a valid barcode'));
    await fill(page, '#scanDigits', '0 12345 67890 5'); await page.click('[data-a="scan-digits"]'); await waitOv('fooditem');
    check('B typed digits find the saved food', await txt(page, '#ov h2') === 'Trackside chili');
    await page.click('[data-a="food-back"]'); await page.waitForSelector('#foodQ');
    // a miss, with Claude available: label photo -> the form, filled
    await scan(PH.fresh); await waitOv('scan:miss');
    const miss = await txt(page, '#ov');
    check('B a miss says "New product. Take a photo of the Nutrition Facts label."', (await txt(page, '#scanMiss')) === 'New product. Take a photo of the Nutrition Facts label.' && miss.includes('Barcode 036000291452') && miss.includes('Link to a food we already made') && await has(page, '#labelFile'), miss);
    check('B the label input is a camera file input', await page.$eval('#labelFile', i => i.accept === 'image/*' && i.getAttribute('capture') === 'environment'));
    await scan(PH.label, '#labelFile'); await waitOv('custom');
    const q = (await asked())[0], f = await form();
    check('B the label photo is shrunk to about 1600 px on the long side before it is sent', (await asked()).length === 1 && q.images.length === 1 && Math.max(q.images[0].w, q.images[0].h) === 1600 && Math.min(q.images[0].w, q.images[0].h) === 1200 && q.images[0].type === 'image/jpeg' && q.images[0].size < 4000000, JSON.stringify(q.images));
    check('B the prompt asks for JSON only, per serving, with null for anything unreadable and never a guess', /JSON only/.test(q.input) && /per serving/i.test(q.input) && /"name": string or null/.test(q.input) && /product name only if it is printed/.test(q.input) && /use null\. Never guess/.test(q.input) && ['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugars_g', 'sat_fat_g', 'sodium_mg', 'serving'].every(k => q.input.includes('"' + k + '"')), q.input);
    check('B the Create a food form opens filled with those values and the barcode', await txt(page, '#ov h2') === 'Create a food' && same(f, { name: '', serving: '2/3 cup (55 g)', kcal: '230', p: '3', c: '37', f: '8', fiber: '4', sugar: '', sat: '1', na: '160', barcode: '036000291452' }), JSON.stringify(f));
    const marks = await page.evaluate(() => ({ note: document.getElementById('labelCheck').textContent, unread: Array.from(document.querySelectorAll('#ov [data-unread]')).map(e => e.dataset.unread).sort(), boxes: Array.from(document.querySelectorAll('#ov input.unread')).map(e => e.dataset.ovf).sort() }));
    check('B with "Check these against the label." and the fields that came back null marked', marks.note.startsWith('Check these against the label.') && same(marks.unread, ['name', 'sugar']) && same(marks.boxes, ['name', 'sugar']), JSON.stringify(marks));
    check('B nothing is saved until the person confirms', (await writes(page)).length === 0 && !Object.keys(await kvAll(page)).some(k => k.startsWith('foods/') && !['foods/cf1', 'foods/cf2', 'foods/cf3'].includes(k)));
    await page.click('[data-a="custom-save"]'); check('B a name is still required', (await toastWith(page, 'Give the food a name')).includes('name'));
    await fill(page, '#ov [data-ovf="name"]', 'Granola crunch'); await page.click('[data-a="custom-save"]'); await waitOv('fooditem');
    const all = await kvAll(page), nid = Object.keys(all).find(k => k.startsWith('foods/') && all[k].name === 'Granola crunch'), nd = all[nid];
    check('B it saves as a normal shared custom food with the barcode', !!nd && nd.barcode === '0036000291452' && nd.serving === '2/3 cup (55 g)' && same(nd.n, [230, 3, 8, 37, 4, null, 1, null, null, 160, null, null, null, null]) && nd.by === 'jacquie' && Object.keys(nd).sort().join() === 'barcode,by,createdAt,n,name,serving', JSON.stringify(nd));
    await page.click('[data-a="food-back"]'); await page.waitForSelector('#foodQ');
    await scan(PH.fresh); await waitOv('fooditem');
    check('B a second scan of that product opens it directly, with no question to Claude', await txt(page, '#ov h2') === 'Granola crunch' && (await asked()).length === 1);
    await page.click('[data-a="food-back"]'); await page.waitForSelector('#foodQ');
    // the short codes
    await scan(PH.ean8); await waitOv('scan:miss'); const e8 = await txt(page, '#ov .ov-head');
    await page.click('[data-a="food-back"]'); await page.waitForSelector('#foodQ');
    await scan(PH.upce); await waitOv('scan:miss'); const ue = await txt(page, '#ov .ov-head');
    check('B EAN-8 and UPC-E photos are read: 96385074, and 01234565 expanded to 012345000065', e8.includes('Barcode 96385074') && ue.includes('Barcode 012345000065'), e8 + ' | ' + ue);
    await page.click('[data-a="food-back"]'); await page.waitForSelector('#foodQ');
    await scan(PH.upceTurned); await waitOv('scan:miss'); const ut = await txt(page, '#ov .ov-head');
    await page.click('[data-a="food-back"]'); await page.waitForSelector('#foodQ');
    await scan(PH.upce1); await waitOv('scan:miss'); const u1 = await txt(page, '#ov .ov-head');
    check('B a UPC-E is read sideways and upside down, and with number system 1', ut.includes('Barcode 042100005264') && u1.includes('Barcode 112345000062'), ut + ' | ' + u1);
    // link to a food we already made
    await page.click('[data-a="food-back"]'); await page.waitForSelector('#foodQ');
    await scan(PH.other); await waitOv('scan:miss'); await page.click('[data-a="scan-link"]'); await waitOv('scan:link');
    const list = await page.$$eval('#linkList .fooditem', els => els.map(e => e.querySelector('.fn').textContent));
    check('B "Link to a food we already made" lists our foods', same(list, ['Granola crunch', 'Overnight oats', 'Paddock protein bar', 'Trackside chili']) && (await txt(page, '#linkList')).includes('replaces barcode'), JSON.stringify(list));
    await page.click('#linkList .fooditem[data-id="cf3"]'); await waitOv('fooditem');
    const oats = await kv(page, 'foods/cf3');
    check('B picking one adds the barcode to it, and nothing else changes', oats.barcode === '5901234123457' && oats.name === 'Overnight oats' && same(oats.n, OATS.n) && oats.createdAt === OATS.createdAt && oats.updatedBy === 'jacquie', JSON.stringify(oats));
    await page.click('[data-a="food-back"]'); await page.waitForSelector('#foodQ');
    await scan(PH.other); await waitOv('fooditem');
    check('B and the next scan opens the linked food', await txt(page, '#ov h2') === 'Overnight oats');
    // Edit food: see, change and clear the barcode
    await page.click('[data-a="custom-edit"]'); await waitOv('custom');
    check('B Edit food shows the barcode', await val(page, '#customBarcode') === '5901234123457' && await txt(page, '#ov h2') === 'Edit food');
    check('B (a UPC-A shows as the 12 digits on the package, and is stored as 13)', nd.barcode === '0036000291452');
    await fill(page, '#customBarcode', '0012345678905'); await page.click('[data-a="custom-save"]');
    check('B a barcode that is already on another food is refused', (await toastWith(page, 'already on')).includes('Trackside chili') && (await ovType()) === 'custom');
    await fill(page, '#customBarcode', '1234'); await page.click('[data-a="custom-save"]');
    check('B an invalid barcode is refused', (await toastWith(page, 'not valid')).includes('not valid') && (await kv(page, 'foods/cf3')).barcode === '5901234123457');
    await fill(page, '#customBarcode', '96385074'); await page.click('[data-a="custom-save"]'); await waitOv('fooditem');
    check('B the barcode can be changed', (await kv(page, 'foods/cf3')).barcode === '96385074');
    await page.click('[data-a="custom-edit"]'); await waitOv('custom'); await fill(page, '#customBarcode', ''); await page.click('[data-a="custom-save"]'); await waitOv('fooditem');
    check('B and cleared', !('barcode' in (await kv(page, 'foods/cf3'))) && (await kv(page, 'foods/cf3')).name === 'Overnight oats');
    // no image anywhere
    const dump = await page.evaluate(() => JSON.stringify(Object.assign({}, localStorage)));
    check('B no photo is written anywhere: storage holds no image data', !/data:image|base64|blob:|\.png|\.jpg|image\/jpeg/i.test(dump) && dump.length < 200000, String(dump.length));
    check('B and Claude was sent a photo only for the label', (await asked()).length === 1 && (await asked())[0].images.length === 1);
  });
  await section('B2', async () => { // rate limited, declined, unavailable
    await open({ me: 'jacquie', time: WED, init: local(seedDocs()) });
    await addFood('l'); await scan(PH.fresh); await waitOv('scan:miss');
    await page.evaluate(() => { window.__sampleMode = 'rate'; });
    await scan(PH.label, '#labelFile'); await page.waitForSelector('#scanMsg');
    check('B rate limited: it says so and keeps the controls', (await ovType()) === 'scan:miss' && (await txt(page, '#scanMsg')).includes('busy right now') && await has(page, '#labelFile') && await has(page, '[data-a="scan-blank"]') && await ML(page, () => !!window.MorningLaps.caps.sample) && (await asked()).length === 1);
    await page.evaluate(() => { window.__sampleMode = 'fail'; });
    await scan(PH.label, '#labelFile'); await page.waitForFunction(() => document.getElementById('scanMsg') && document.getElementById('scanMsg').textContent.includes('could not be read'));
    check('B a failed read says so, keeps the controls, and is not retried', (await ovType()) === 'scan:miss' && (await asked()).length === 2);
    await page.evaluate(() => { window.__sampleMode = 'ok'; window.__labelReply = { name: 'nope', serving: null, calories: null, protein_g: null, carbs_g: null, fat_g: null, fiber_g: null, sugars_g: null, sat_fat_g: null, sodium_mg: null }; });
    await scan(PH.label, '#labelFile'); await page.waitForFunction(() => document.getElementById('scanMsg') && document.getElementById('scanMsg').textContent.includes('Couldn\'t read a Nutrition Facts label'));
    check('B a photo with no readable label is not turned into numbers', (await ovType()) === 'scan:miss');
    await page.click('[data-a="scan-blank"]'); await waitOv('custom');
    check('B "Type the label in" opens the blank form with the barcode', same(await form(), { name: '', serving: '', kcal: '', p: '', c: '', f: '', fiber: '', sugar: '', sat: '', na: '', barcode: '036000291452' }) && !(await has(page, '#labelCheck')));
    await ctx.close();
    // declined at the first question
    await open({ me: 'jacquie', time: WED, init: local(seedDocs()) });
    await addFood('l'); check('B (before) "Describe it" is offered', await has(page, '[data-a="describe-open"]'));
    await scan(PH.fresh); await waitOv('scan:miss'); await page.evaluate(() => { window.__sampleMode = 'declined'; });
    await scan(PH.label, '#labelFile'); await waitOv('custom');
    check('B declined: the same form opens blank with only the barcode filled', same(await form(), { name: '', serving: '', kcal: '', p: '', c: '', f: '', fiber: '', sugar: '', sat: '', na: '', barcode: '036000291452' }) && (await txt(page, '#scanNote')).includes('New product') && !(await has(page, '#labelCheck')) && await has(page, '#ov [data-a="scan-link"]'), JSON.stringify(await form()));
    await fill(page, '#ov [data-ovf="name"]', 'Typed in'); await fill(page, '#ov [data-ovf="kcal"]', '120'); await page.click('[data-a="custom-save"]'); await waitOv('fooditem');
    const all = await kvAll(page), nd = all[Object.keys(all).find(k => k.startsWith('foods/') && all[k].name === 'Typed in')];
    check('B and it still saves with the barcode', nd.barcode === '0036000291452' && nd.n[0] === 120 && nd.serving === '1 serving');
    await page.click('[data-a="food-back"]'); await page.waitForSelector('#foodQ');
    check('B after a "no", nothing asks Claude again this visit', !(await has(page, '[data-a="describe-open"]')) && await ML(page, () => window.MorningLaps.caps.sample === null));
    await scan(PH.other); await waitOv('custom');
    check('B and the next miss goes straight to the blank form', (await form()).barcode === '5901234123457' && (await asked()).length === 1);
    await ctx.close();
    // sample unavailable from the start (Jacquie's account may not have it)
    await open({ me: 'jacquie', time: WED, init: local(seedDocs(), 'window.__sampleMode="null";') });
    await addFood('l');
    check('B sample unavailable: the scan button is still there', await has(page, '#scanFile') && await ML(page, () => window.MorningLaps.caps.sample === null));
    await scan(PH.upca); await waitOv('fooditem');
    check('B sample unavailable: a saved product still opens', await txt(page, '#ov h2') === 'Trackside chili');
    await page.click('[data-a="food-back"]'); await page.waitForSelector('#foodQ');
    await scan(PH.fresh); await waitOv('custom');
    check('B sample unavailable: a miss opens the blank form with the barcode', same(await form(), { name: '', serving: '', kcal: '', p: '', c: '', f: '', fiber: '', sugar: '', sat: '', na: '', barcode: '036000291452' }) && (await txt(page, '#scanNote')).includes('New product') && await has(page, '#ov [data-a="scan-link"]'));
    await page.click('#ov [data-a="scan-link"]'); await waitOv('scan:link'); await page.click('#linkList .fooditem[data-id="cf3"]'); await waitOv('fooditem');
    check('B sample unavailable: linking to a food we made still works', (await kv(page, 'foods/cf3')).barcode === '0036000291452');
    await ctx.close();
    // photos not allowed here, text is
    await open({ me: 'jacquie', time: WED, init: local(seedDocs(), 'window.__noImages=true;') });
    await addFood('l'); await scan(PH.fresh); await waitOv('custom');
    check('B where photos cannot be sent, a miss opens the blank form and "Describe it" stays', (await form()).barcode === '036000291452' && (await asked()).length === 0);
    await ctx.close();
    // the reader itself cannot load
    await open({ me: 'jacquie', time: WED, init: local(seedDocs()), noReader: true });
    await addFood('l'); await scan(PH.upca); await waitOv('scan:type');
    check('B if the barcode reader cannot load, typing the digits still works', (await txt(page, '#scanMsg')).includes('reader could not load'));
    await fill(page, '#scanDigits', '4006381333931'); await page.click('[data-a="scan-digits"]'); await waitOv('fooditem');
    check('B (typed EAN-13 finds the bar)', await txt(page, '#ov h2') === 'Paddock protein bar');
  });

  // ---------- New 5: describe a restaurant meal ----------
  await section('D', async () => {
    await open({ me: 'jacquie', time: WED, init: local(seedDocs()) });
    await addFood('d'); await watchWrites(page);
    check('D "Describe it" is in Add food when Claude is available', await has(page, '#foodTools [data-a="describe-open"]'));
    await page.click('[data-a="describe-open"]'); await waitOv('describe:ask');
    const ask = await page.evaluate(() => ({ ph: document.getElementById('descText').placeholder, focus: document.activeElement.id, note: document.getElementById('descNote').textContent, photo: !!document.getElementById('plateFile') }));
    check('D a text box with the example, an optional plate photo, and the warning line', ask.ph === 'Chipotle chicken burrito bowl, white rice, black beans, cheese, guac' && ask.focus === 'descText' && ask.photo && ask.note === 'Estimates can be off by 20% or more. A restaurant\'s own nutrition page is better when it has one.', JSON.stringify(ask));
    await page.click('[data-a="describe-go"]'); check('D nothing is sent for an empty box', (await toastWith(page, 'Say what you had')).includes('Say what you had') && (await asked()).length === 0);
    await fill(page, '#descText', 'Chipotle chicken burrito bowl, white rice, black beans, guac');
    await scan(PH.plate, '#plateFile'); await page.waitForSelector('#descPhoto .chip');
    await page.click('[data-a="describe-go"]'); await waitOv('describe:list');
    const q = (await asked())[0];
    check('D the description and the plate photo go to Claude, asking for a JSON list', q.input.includes('Chipotle chicken burrito bowl, white rice, black beans, guac') && /JSON only/.test(q.input) && ['"name"', '"portion"', '"calories"', '"protein_g"', '"carbs_g"', '"fat_g"'].every(k => q.input.includes(k)) && q.images.length === 1 && Math.max(q.images[0].w, q.images[0].h) === 1600, JSON.stringify(q.images));
    const rows = () => page.$$eval('#descList .estrow', els => els.map(e => Array.from(e.querySelectorAll('input')).map(i => i.value)));
    check('D the answer comes back as an editable list', same(await rows(), [['Chipotle chicken', 'about 4 oz', '180', '32', '0', '7'], ['White rice', '1 scoop', '210', '4', '40', '4'], ['Black beans', '1 scoop', '130', '8', '22', '1.5'], ['Guacamole', '1 side', '230', '2', '8', '22']]) && (await txt(page, '#descTotal')) === '4 items · 750 cal, estimated' && (await txt(page, '#descLog')) === 'Add to Dinner · 750 cal' && (await txt(page, '#descNote')).startsWith('Estimates can be off by 20% or more. A restaurant\'s own nutrition page is better when it has one.'), JSON.stringify(await rows()));
    check('D nothing is logged yet', (await writes(page)).length === 0);
    await fill(page, '#descList [data-di="1"][data-dk="kcal"]', '300'); await fill(page, '#descList [data-di="0"][data-dk="p"]', '40');
    check('D editing a number updates the total in place', (await txt(page, '#descTotal')) === '4 items · 840 cal, estimated' && (await txt(page, '#descLog')) === 'Add to Dinner · 840 cal' && await page.evaluate(() => document.activeElement.dataset.dk === 'p'));
    await page.click('#descList [data-a="describe-rm"][data-i="2"]'); await page.waitForFunction(() => document.querySelectorAll('#descList .estrow').length === 3);
    check('D an item can be removed, and the edits stay', same((await rows()).map(r => r[0] + ':' + r[2]), ['Chipotle chicken:180', 'White rice:300', 'Guacamole:230']) && (await txt(page, '#descTotal')) === '3 items · 710 cal, estimated');
    const before = (await kv(page, 'profiles/jacquie/food/2026-12-09')).items.length;
    await page.click('#descLog'); await page.waitForSelector('#ov', { state: 'hidden' });
    const items = (await kv(page, 'profiles/jacquie/food/2026-12-09')).items.slice(before);
    check('D the list is logged to the chosen meal in one save, with the edited numbers and source "Estimate"', (await writes(page)).length === 1 && items.length === 3 && items.every(it => it.src === 'Estimate' && it.meal === 'd' && it.qty === 1) && same(items.map(it => [it.name, it.unit, it.n[0], it.n[1], it.n[2], it.n[3]]), [['Chipotle chicken', 'about 4 oz', 180, 40, 7, 0], ['White rice', '1 scoop', 300, 4, 4, 40], ['Guacamole', '1 side', 230, 2, 22, 8]]), JSON.stringify(items));
    const tags = await page.$$eval('[data-mealsec="d"] .fooditem', els => els.map(e => e.querySelector('.fn').textContent.trim()));
    const others = await page.$$eval('[data-mealsec="b"] .fooditem .chip.est, [data-mealsec="l"] .fooditem .chip.est', els => els.length);
    check('D logged items show a small "est." tag in the day, and only they do', same(tags, ['Chipotle chicken est.', 'White rice est.', 'Guacamole est.']) && others === 0, JSON.stringify(tags));
    await page.click('[data-mealsec="d"] .fooditem >> nth=0'); await waitOv('fooditem');
    check('D the item sheet says it is an estimate', (await txt(page, '#ov .ov-head')).includes('an estimate'));
    await page.keyboard.press('Escape');
    await page.click('[data-a="food-add"][data-meal="s"]'); await page.waitForSelector('#foodQ');
    const recent = await page.$$eval('#foodRes [data-a="food-again"] .fn', els => els.map(e => e.textContent.trim()));
    check('D the tag shows in the recent list too', recent.filter(t => t.endsWith('est.')).length === 3 && recent.includes('Guacamole est.') && recent.includes('Greek yogurt'), JSON.stringify(recent));
    await page.keyboard.press('Escape');
    await page.click('[data-a="meal-saveas"][data-meal="d"]'); await page.waitForSelector('#mealName');
    check('D and in a saved meal\'s list', (await page.$$eval('#ov .tbl .chip.est', els => els.length)) === 3);
    await page.keyboard.press('Escape');
    const csv = await ML(page, () => window.MorningLaps.foodCsv());
    check('D the food spreadsheet marks them "Estimate"', csv.split('\r\n').filter(l => l.endsWith(',Estimate')).length === 3);
    // rate limited, a failed answer, an answer with nothing in it
    await page.click('[data-a="food-add"][data-meal="l"]'); await page.waitForSelector('#foodQ'); await page.click('[data-a="describe-open"]'); await waitOv('describe:ask');
    await fill(page, '#descText', 'two tacos and chips'); await page.evaluate(() => { window.__sampleMode = 'rate'; });
    await page.click('[data-a="describe-go"]'); await page.waitForSelector('#descMsg');
    check('D rate limited: it says so, keeps what was typed and keeps the button', (await txt(page, '#descMsg')).includes('busy right now') && await val(page, '#descText') === 'two tacos and chips' && await has(page, '[data-a="describe-go"]') && await ML(page, () => !!window.MorningLaps.caps.sample));
    await page.evaluate(() => { window.__sampleMode = 'fail'; }); await page.click('[data-a="describe-go"]'); await page.waitForFunction(() => document.getElementById('descMsg') && document.getElementById('descMsg').textContent.includes('did not work'));
    await page.evaluate(() => { window.__sampleMode = 'fenced'; }); await page.click('[data-a="describe-go"]'); await waitOv('describe:list');
    check('D an answer wrapped in other text is still read, without asking again', (await rows()).length === 4 && (await asked()).filter(q => q.mode === 'fenced').length === 1);
    await page.click('[data-a="describe-again"]'); await waitOv('describe:ask');
    await page.evaluate(() => { window.__sampleMode = 'ok'; window.__mealReply = []; }); await page.click('[data-a="describe-go"]'); await page.waitForFunction(() => document.getElementById('descMsg') && document.getElementById('descMsg').textContent.includes('Couldn\'t estimate'));
    check('D a failed or empty answer says so and logs nothing', (await ovType()) === 'describe:ask' && (await writes(page)).length === 1);
    await page.evaluate(() => { window.__mealReply = { items: [{ name: 'Taco', portion: '2', calories: '340', protein_g: 18, carbs_g: 30, fat_g: 16 }, { name: '', calories: 100 }, { name: 'Bad', calories: -5 }, 'junk', { name: 'Chips', portion: 'small bag', calories: 140 }] }; });
    await page.click('[data-a="describe-go"]'); await waitOv('describe:list');
    check('D odd answers are cleaned: rows without a name or sane calories are dropped', same(await rows(), [['Taco', '2', '340', '18', '30', '16'], ['Chips', 'small bag', '140', '', '', '']]), JSON.stringify(await rows()));
    await fill(page, '#descList [data-di="0"][data-dk="kcal"]', ''); await page.click('#descLog');
    check('D a blank calorie box is refused with a plain message', (await toastWith(page, 'Enter the calories for Taco')).includes('Taco') && (await writes(page)).length === 1);
    await ctx.close();
    // declined
    await open({ me: 'jacquie', time: WED, init: local(seedDocs()) });
    await addFood('d'); await watchWrites(page); await page.click('[data-a="describe-open"]'); await waitOv('describe:ask');
    await fill(page, '#descText', 'pad thai'); await page.evaluate(() => { window.__sampleMode = 'declined'; }); await page.click('[data-a="describe-go"]'); await waitOv('food');
    check('D declined: back to Add food with "Describe it" hidden, and nothing logged', !(await has(page, '[data-a="describe-open"]')) && (await toastWith(page, 'not available')).includes('Quick add') && (await writes(page)).length === 0 && await has(page, '[data-a="food-quick"]'));
    await ctx.close();
    // unavailable
    await open({ me: 'jacquie', time: WED, init: local(seedDocs(), 'window.__sampleMode="null";') });
    await addFood('d');
    check('D the button is hidden when sample is null', !(await has(page, '[data-a="describe-open"]')) && await has(page, '[data-a="food-quick"]') && await has(page, '#scanFile') && await has(page, '[data-a="food-custom"]'));
    await ctx.close();
    // text works where photos do not
    await open({ me: 'jacquie', time: WED, init: local(seedDocs(), 'window.__noImages=true;') });
    await addFood('d'); await page.click('[data-a="describe-open"]'); await waitOv('describe:ask');
    check('D where photos cannot be sent, the photo button is hidden and text still works', !(await has(page, '#plateFile')));
    await fill(page, '#descText', 'burrito bowl'); await page.click('[data-a="describe-go"]'); await waitOv('describe:list');
    check('D (text only: no image sent)', (await asked())[0].images.length === 0 && (await rows()).length === 4);
  });

  // ---------- New 6: undo after removing ----------
  const COMBINED = lift('2026-12-08', 'pull', 3, SETS('pull', 6), { acts: [act('2026-12-08', 'walkeasy', 'Walk together', 20)], notes: 'felt strong' });
  await section('U', async () => {
    await open({ me: 'jacquie', time: WED, init: local(seedDocs()) });
    const undoToast = async () => { await page.waitForSelector('#toast:not([hidden]) [data-a="undo"]'); return (await txt(page, '#toast')).replace(/\s+/g, ' '); };
    const undo = async () => { await page.click('#toast [data-a="undo"]'); await toastWith(page, 'Put back'); };
    // a food
    const fpath = 'profiles/jacquie/food/2026-12-09', f0 = await kv(page, fpath);
    await go(page, 'fuel'); await page.click('[data-mealsec="l"] .fooditem >> nth=0'); await waitOv('fooditem'); await page.click('[data-a="food-del"]'); await page.waitForSelector('#ov', { state: 'hidden' });
    const t1 = await undoToast();
    check('U removing a food shows "Removed · Undo"', t1 === 'Removed · Undo' && (await kv(page, fpath)).items.length === 2, t1);
    await page.clock.fastForward(5000);
    check('U it is still there after 5 seconds', await has(page, '#toast:not([hidden]) [data-a="undo"]'));
    await watchWrites(page); await undo();
    check('U Undo puts the food day back exactly, in one write', same(await kv(page, fpath), f0) && (await writes(page)).length === 1, JSON.stringify(await writes(page)));
    check('U and the day shows it again', (await page.$$eval('[data-mealsec="l"] .fooditem .fn', els => els.map(e => e.textContent))).join('|') === '=SUM(A1)|Soup, "the big one"');
    await page.click('[data-mealsec="b"] .fooditem >> nth=0'); await waitOv('fooditem'); await page.click('[data-a="food-del"]'); await page.waitForSelector('#ov', { state: 'hidden' }); await undoToast();
    await page.clock.fastForward(6200); await page.waitForSelector('#toast', { state: 'hidden' });
    check('U after 6 seconds the offer is gone, and the removal stands', await ML(page, () => window.MorningLaps.state.undo === null) && (await kv(page, fpath)).items.length === 2);
    // an activity (two on the day)
    const apath = 'profiles/jacquie/sessions/2026-12-07', a0 = await kv(page, apath);
    await go(page, 'train'); await pickDate(page, '2026-12-07'); await page.click('.done-list [data-a="act-edit"] >> nth=0'); await page.waitForSelector('[data-a="act-del"]'); await page.click('[data-a="act-del"]'); await page.waitForSelector('#ov', { state: 'hidden' });
    check('U removing an activity shows "Removed · Undo"', (await undoToast()) === 'Removed · Undo' && (await kv(page, apath)).acts.length === 1);
    await undo(); check('U Undo puts the activity day back exactly', same(await kv(page, apath), a0));
    // a day with a Watch top-up
    const wpath = 'profiles/jacquie/sessions/2026-12-08', w0 = await kv(page, wpath);
    await pickDate(page, '2026-12-08'); await page.click('.done-list [data-a="act-edit"] >> nth=0'); await page.waitForSelector('[data-a="act-del"]'); await page.click('[data-a="act-del"]'); await page.waitForSelector('#ov', { state: 'hidden' }); await undoToast();
    const w1 = await kv(page, wpath);
    check('U (removing the walk from a Watch day leaves the Watch\'s 35 minutes)', w1.acts.length === 1 && w1.acts[0].id === 'hk-exercise' && w1.acts[0].min === 35, JSON.stringify(w1.acts));
    await undo(); check('U Undo puts a day with a Watch top-up back exactly', same(await kv(page, wpath), w0) && (await kv(page, wpath)).acts[1].min === 15, JSON.stringify(await kv(page, wpath)));
    // a rest day
    await pickDate(page, '2026-12-09'); await page.click('[data-a="rest"]'); await page.waitForSelector('[data-a="rest-undo"]');
    const rpath = 'profiles/jacquie/sessions/2026-12-09', r0 = await kv(page, rpath);
    await page.click('[data-a="rest-undo"]'); await undoToast();
    check('U removing a rest day shows "Removed · Undo"', (await txt(page, '#toast')).replace(/\s+/g, ' ') === 'Removed · Undo' && (await kv(page, rpath)) === null && r0.kind === 'rest');
    await undo(); check('U Undo puts the rest day back exactly', same(await kv(page, rpath), r0) && await has(page, '[data-a="rest-undo"]'));
    // a saved meal
    const mpath = 'profiles/jacquie/meals/m1', m0 = await kv(page, mpath);
    await addFood('b'); await page.click('#myMeals [data-a="meal-edit"]'); await page.waitForSelector('[data-a="meal-del"]'); await page.click('[data-a="meal-del"]'); await page.click('[data-a="meal-del"]');
    check('U removing a saved meal shows "Removed · Undo"', (await undoToast()) === 'Removed · Undo' && (await kv(page, mpath)) === null && !(await has(page, '#myMeals')));
    await undo(); check('U Undo puts the saved meal back exactly, and it is listed again', same(await kv(page, mpath), m0) && (await txt(page, '#myMeals')).includes('Usual breakfast'));
    // a custom food
    const cpath = 'foods/cf1', c0 = await kv(page, cpath);
    await fill(page, '#foodQ', 'trackside'); await page.waitForSelector('#foodRes [data-a="food-pick"]'); await page.click('#foodRes [data-a="food-pick"] >> nth=0'); await waitOv('fooditem'); await page.click('[data-a="custom-del"]'); await page.click('[data-a="custom-del"]');
    check('U removing a custom food shows "Removed · Undo"', (await undoToast()) === 'Removed · Undo' && (await kv(page, cpath)) === null);
    await undo(); check('U Undo puts the custom food back exactly, barcode included', same(await kv(page, cpath), c0) && c0.barcode === '0012345678905');
    // a change of our own to the same document withdraws the offer
    await page.keyboard.press('Escape'); await go(page, 'fuel');
    await page.click('[data-mealsec="l"] .fooditem >> nth=0'); await waitOv('fooditem'); await page.click('[data-a="food-del"]'); await page.waitForSelector('#ov', { state: 'hidden' }); await undoToast();
    await page.click('[data-a="water"][data-oz="8"]'); await page.waitForFunction(() => window.MorningLaps.state.undo === null);
    check('U a later change of our own to that day withdraws the offer', !(await has(page, '#toast:not([hidden]) [data-a="undo"]')));
    await ctx.close();
    // Tyson: a lift day, and a combined lift plus walk
    await open({ me: 'tyson', time: WED, init: local(seedDocs({ thisWeek: [lift('2026-12-07', 'push', 3, SETS('push', 6)), COMBINED] })) });
    const l0 = await ses(page, '2026-12-07'), c1 = await ses(page, '2026-12-08');
    await go(page, 'history'); await page.click('details.hi[data-hdate="2026-12-07"] summary'); await page.click('[data-remove="2026-12-07"]'); await page.click('[data-remove="2026-12-07"]');
    check('U removing a lift day shows "Removed · Undo"', (await undoToast()) === 'Removed · Undo' && (await ses(page, '2026-12-07')) === null);
    const sc0 = await score(page, 'tyson'); await watchWrites(page); await undo();
    check('U Undo puts the lift day back exactly, in one write', same(await ses(page, '2026-12-07'), l0) && (await writes(page)).length === 1 && (await score(page, 'tyson')).lifts === sc0.lifts + 1 && await has(page, 'details.hi[data-hdate="2026-12-07"]'));
    await page.click('details.hi[data-hdate="2026-12-08"] summary'); await page.click('[data-remove="2026-12-08"]'); await page.click('[data-remove="2026-12-08"]');
    const t2 = await undoToast(), left = await ses(page, '2026-12-08');
    check('U removing the lift from a combined day keeps the walk and offers Undo', t2.includes('Your activities for') && t2.endsWith('· Undo') && left.kind === 'activity' && left.acts.length === 1 && !left.ex, t2);
    await undo(); check('U Undo puts the combined lift plus walk back exactly', same(await ses(page, '2026-12-08'), c1) && (await ses(page, '2026-12-08')).notes === 'felt strong');
    await go(page, 'train'); await pickDate(page, '2026-12-08'); await page.click('.done-list [data-a="act-edit"]'); await page.waitForSelector('[data-a="act-del"]'); await page.click('[data-a="act-del"]'); await page.waitForSelector('#ov', { state: 'hidden' }); await undoToast();
    check('U (the walk removed from the combined day)', !(await ses(page, '2026-12-08')).acts && !!(await ses(page, '2026-12-08')).ex);
    await undo(); check('U Undo puts the walk back on the combined day exactly', same(await ses(page, '2026-12-08'), c1));
  });
  await section('U2', async () => { // the other phone changed the day: the undo is refused
    await open({ me: 'jacquie', time: WED, init: shared(seedDocs()), shared: true });
    await page.waitForFunction(() => window.MorningLaps.state.ready && window.MorningLaps.state.storage === 'db' && !!window.__store['profiles/jacquie/weekgoals/2026-12-07']);
    const fpath = 'profiles/jacquie/food/2026-12-09', f0 = await page.evaluate(p => JSON.parse(JSON.stringify(window.__store[p])), fpath);
    await go(page, 'fuel'); await page.click('[data-mealsec="l"] .fooditem >> nth=0'); await page.waitForSelector('[data-a="food-del"]'); await page.click('[data-a="food-del"]'); await page.waitForSelector('#toast:not([hidden]) [data-a="undo"]');
    const other = await page.evaluate(p => { const d = JSON.parse(JSON.stringify(window.__store[p])); d.water = 64; d.updatedAt = '2026-12-09T17:00:30.000Z'; window.__remoteSet(p, d); return d; }, fpath);
    await page.waitForFunction(() => window.MorningLaps.dayTotals('jacquie', '2026-12-09').water === 64);
    await page.click('#toast [data-a="undo"]');
    const t = await toastWith(page, 'Can\'t undo');
    check('U undo after the other phone changed the day is refused: "Can\'t undo, it changed on the other phone."', t === 'Can\'t undo, it changed on the other phone.', t);
    check('U and nothing is overwritten', same(await page.evaluate(p => window.__store[p], fpath), other) && other.items.length === f0.items.length - 1);
    // with no change from the other phone, undo works in the shared store too, in one write
    await page.evaluate(() => { document.getElementById('toast').hidden = true; });
    await page.click('[data-mealsec="b"] .fooditem >> nth=0'); await page.waitForSelector('[data-a="food-del"]'); const f1 = await page.evaluate(p => JSON.parse(JSON.stringify(window.__store[p])), fpath);
    await page.click('[data-a="food-del"]'); await page.waitForSelector('#toast:not([hidden]) [data-a="undo"]');
    await page.waitForFunction(p => window.__store[p].items.length === 1, fpath);
    await page.click('#toast [data-a="undo"]'); await page.waitForFunction(p => window.__store[p].items.length === 2, fpath);
    check('U in the shared store an undo puts back the exact document', same(await page.evaluate(p => window.__store[p], fpath), f1));
  });

  // ---------- New 7: download a backup ----------
  const parseCsv = text => { // quoted fields, doubled quotes, CRLF rows
    const rows = []; let row = [], cur = '', q = false; const s = text.replace(/^﻿/, '');
    for (let i = 0; i < s.length; i++) { const ch = s[i];
      if (q) { if (ch === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; } else if (ch === '\r') { /* with \n */ } else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch; }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
  };
  const stored = page => page.evaluate(() => { const out = {}, s = JSON.parse(localStorage.getItem('ml.sessions') || '{}'), kv = JSON.parse(localStorage.getItem('ml.kv') || '{}'); Object.keys(s).forEach(d => { out['sessions/' + d] = s[d]; }); out['settings/program'] = JSON.parse(localStorage.getItem('ml.settings')); Object.keys(kv).forEach(p => { out[p] = kv[p]; }); return out; });
  const sortKeys = o => { const out = {}; Object.keys(o).sort().forEach(k => { out[k] = o[k]; }); return out; };
  await section('K', async () => {
    await open({ me: 'tyson', time: WED, init: local(seedDocs({ thisWeek: [lift('2026-12-07', 'push', 3, SETS('push', 6), { deload: true }), COMBINED] })) });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    await switchTo(page, 'jacquie'); await pickDate(page, '2026-12-09'); await page.click('[data-a="rest"]'); await page.waitForSelector('[data-a="rest-undo"]'); await switchTo(page, 'tyson'); // a rest day for the spreadsheet
    await go(page, 'me'); await watchWrites(page);
    check('K Me has "Download a backup"', (await txt(page, '#backupCard [data-a="backup-all"]')) === 'Download a backup' && !(await has(page, '[data-a="backup-copy"]')));
    await page.click('[data-a="backup-all"]'); await page.waitForFunction(() => window.__saved.length === 3);
    const saved = await page.evaluate(() => window.__saved.slice()), docs = await stored(page);
    check('K three files, named with today\'s date', same(saved.map(f => f.filename), ['morning-laps-backup-2026-12-09.json', 'morning-laps-workouts-2026-12-09.csv', 'morning-laps-food-2026-12-09.csv']), JSON.stringify(saved.map(f => f.filename)));
    const bk = JSON.parse(saved[0].data);
    check('K the JSON holds every document the app has loaded, exactly', same(sortKeys(bk.docs), sortKeys(docs)) && Object.keys(bk.docs).length === Object.keys(docs).length && bk.app === 'Morning Laps' && bk.format === 1 && /^2026-12-09T/.test(bk.exportedAt), Object.keys(docs).filter(k => !same(bk.docs[k], docs[k])).concat(Object.keys(bk.docs).filter(k => !(k in docs))).slice(0, 6).join(' '));
    const kinds = p => Object.keys(bk.docs).filter(k => p.test(k)).length;
    check('K for both of us: sessions, food, health, profiles, weekly goal snapshots, saved meals, shared foods, results, IOUs, competition settings',
      kinds(/^sessions\//) >= 30 && kinds(/^profiles\/jacquie\/sessions\//) >= 20 && kinds(/^profiles\/tyson\/food\//) === 1 && kinds(/^profiles\/jacquie\/food\//) === 3 && kinds(/\/health\//) === 1 && !!bk.docs['profiles/tyson'] && !!bk.docs['profiles/jacquie'] && !!bk.docs['settings/program'] &&
      kinds(/^profiles\/tyson\/weekgoals\//) >= 1 && kinds(/^profiles\/jacquie\/weekgoals\//) >= 1 && kinds(/\/meals\//) === 1 && kinds(/^foods\//) === 3 && kinds(/^results\//) >= 5 && kinds(/^iou\//) === 1 && !!bk.docs['comp/settings'], Object.keys(bk.docs).length + ' docs');
    // workouts spreadsheet: one row per set
    const w = parseCsv(saved[1].data), sessionsOf = pid => pid === 'tyson' ? Object.keys(docs).filter(k => /^sessions\//.test(k)).map(k => docs[k]) : Object.keys(docs).filter(k => k.startsWith('profiles/jacquie/sessions/')).map(k => docs[k]);
    let sets = 0, treads = 0, actsN = 0, rests = 0;
    ['tyson', 'jacquie'].forEach(pid => sessionsOf(pid).forEach(r => { Object.keys(r.ex || {}).forEach(k => { sets += r.ex[k].reps.filter(x => x != null).length; }); if (r.treadmill && r.treadmill.minutes > 0) treads++; actsN += (r.acts || []).length; if (r.kind === 'rest') rests++; }));
    const by = k => w.slice(1).filter(r => r[2] === k).length;
    check('K workouts CSV: a header and the same number of columns in every row', same(w[0], ['date', 'person', 'kind', 'day', 'exercise', 'set', 'weight', 'reps', 'minutes', 'activities', 'note']) && w.every(r => r.length === 11) && saved[1].data.charCodeAt(0) === 0xFEFF && saved[1].data.includes('\r\n'));
    check('K workouts CSV: one row per set, plus one per treadmill entry, activity and rest day', by('strength') === sets && sets > 150 && by('treadmill') === treads && by('activity') === actsN && by('rest') === rests && rests === 1 && w.length - 1 === sets + treads + actsN + rests, JSON.stringify({ rows: w.length - 1, sets, treads, actsN, rests, s: by('strength'), t: by('treadmill'), a: by('activity'), r: by('rest') }));
    const one = w.filter(r => r[0] === '2026-12-08' && r[1] === 'Tyson');
    check('K a combined day is its sets plus its walk', one.filter(r => r[2] === 'strength').length === 9 && same(one.filter(r => r[2] === 'strength' && r[4] === 'Lat pulldown machine').map(r => [r[3], r[5], r[6], r[7]]), [['Pull', '1', '110', '12'], ['Pull', '2', '110', '12'], ['Pull', '3', '110', '12']]) && same(one.filter(r => r[2] === 'activity').map(r => [r[8], r[9]]), [['20', 'Walk together']]) && same(one.filter(r => r[2] === 'treadmill').map(r => r[8]), ['20']), JSON.stringify(one.slice(0, 4)));
    check('K deload sets and Watch minutes are labelled', w.filter(r => r[0] === '2026-12-07' && r[1] === 'Tyson' && r[2] === 'strength').every(r => r[10] === 'deload week') && w.some(r => r[1] === 'Jacquie' && r[9] === 'Apple Watch exercise' && r[10] === 'Apple Watch' && r[8] === '15'));
    // food spreadsheet: one row per item
    const fd = parseCsv(saved[2].data); let itemsN = 0; Object.keys(docs).filter(k => /\/food\//.test(k)).forEach(k => { itemsN += (docs[k].items || []).length; });
    check('K food CSV: a header and one row per food item', same(fd[0], ['date', 'person', 'meal', 'item', 'quantity', 'unit', 'calories', 'protein', 'carbs', 'fat', 'source']) && fd.every(r => r.length === 11) && fd.length - 1 === itemsN && itemsN === 8, fd.length - 1 + ' vs ' + itemsN);
    check('K food CSV: values land in the right columns', same(fd.find(r => r[3] === 'Greek yogurt'), ['2026-12-09', 'Jacquie', 'Breakfast', 'Greek yogurt', '1', 'serving', '150', '15', '', '', 'Quick add']) && same(fd.find(r => r[3] === 'Eggs and toast').slice(0, 3), ['2026-12-08', 'Tyson', 'Breakfast']), JSON.stringify(fd.find(r => r[3] === 'Greek yogurt')));
    check('K food CSV: commas and quotes survive, and a name starting with = cannot run as a formula', !!fd.find(r => r[3] === 'Soup, "the big one"') && !!fd.find(r => r[3] === '\'=SUM(A1)') && saved[2].data.includes('"Soup, ""the big one"""'));
    check('K the card says what was saved, and downloading writes nothing to the log', (await txt(page, '#backupNote')).includes('Saved the backup, the workouts spreadsheet, the food spreadsheet') && (await writes(page)).length === 0);
    // one spreadsheet on its own
    await page.evaluate(() => { window.__saved = []; }); await page.click('[data-a="backup-food"]'); await page.waitForFunction(() => window.__saved.length === 1);
    check('K each spreadsheet can also be saved on its own', (await page.evaluate(() => window.__saved[0].filename)) === 'morning-laps-food-2026-12-09.csv');
    // declined, rate limited
    await page.evaluate(() => { window.__saved = []; window.__dlTries = 0; window.__dlMode = 'declined'; }); await page.click('[data-a="backup-all"]'); await page.waitForFunction(() => document.getElementById('backupNote').textContent.includes('Not saved'));
    check('K declined: "Not saved", one question only, and the button stays', (await page.evaluate(() => window.__saved.length + ':' + window.__dlTries)) === '0:1' && await has(page, '[data-a="backup-all"]') && !(await has(page, '[data-a="backup-copy"]')), await txt(page, '#backupNote'));
    await page.evaluate(() => { window.__dlTries = 0; window.__dlMode = 'rate'; }); await page.click('[data-a="backup-all"]'); await page.waitForFunction(() => document.getElementById('backupNote').textContent.includes('busy'));
    check('K rate limited: it says to wait, does not retry by itself, and the button stays', (await page.evaluate(() => window.__dlTries)) === 1 && await has(page, '[data-a="backup-all"]'), await txt(page, '#backupNote'));
    await page.evaluate(() => { window.__dlMode = 'ok'; }); await page.click('[data-a="backup-all"]'); await page.waitForFunction(() => window.__saved.length === 3);
    check('K and it works again afterwards', (await txt(page, '#backupNote')).startsWith('Saved'));
    // saving stops working mid-visit: the copy fallback takes over
    await page.evaluate(() => { window.__saved = []; window.__dlMode = 'gone'; }); await page.click('[data-a="backup-all"]'); await page.waitForSelector('[data-a="backup-copy"]');
    check('K if saving turns out not to work here, "Copy backup" takes over', !(await has(page, '[data-a="backup-all"]')) && (await txt(page, '#backupNote')).includes('Copy backup'));
    await ctx.close();
    // downloads unavailable from the start
    await open({ me: 'tyson', time: WED, init: local(seedDocs(), 'window.__dlMode="null";') });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    await go(page, 'me'); await watchWrites(page);
    const size = await txt(page, '#backupSize'), docs2 = await stored(page);
    check('K downloads unavailable: "Copy backup" is offered and says how big it is', (await txt(page, '#backupCard [data-a="backup-copy"]')) === 'Copy backup' && /\b\d+ KB of JSON\b/.test(size) && !(await has(page, '[data-a="backup-all"]')), size);
    await page.click('[data-a="backup-copy"]'); await toastWith(page, 'Copied the backup');
    const clip = await page.evaluate(() => navigator.clipboard.readText()), cb = JSON.parse(clip);
    check('K the fallback copies the same JSON: every document, exactly', same(sortKeys(cb.docs), sortKeys(docs2)) && cb.app === 'Morning Laps' && Math.abs(Math.round(Buffer.byteLength(clip) / 1024) - Number(/(\d+) KB/.exec(size)[1])) <= 1 && (await writes(page)).length === 0, Buffer.byteLength(clip) + ' bytes; ' + size);
    const same2 = await ML(page, () => JSON.stringify(window.MorningLaps.backupDocs()));
    check('K (it is the same document set the download uses)', same2 === JSON.stringify(cb.docs));
    // the clipboard refuses: the text is shown to copy by hand
    await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, get: () => ({ writeText: () => Promise.reject(new Error('blocked')) }) }); });
    await page.click('[data-a="backup-copy"]'); await waitOv('backuptext');
    check('K if the clipboard is blocked, the backup is shown to copy by hand', same(sortKeys(JSON.parse(await val(page, '#backupText')).docs), sortKeys(docs2)) && await page.evaluate(() => document.activeElement.id === 'backupText'));
  });
  await section('K2', async () => { // signed in, shared store
    await open({ me: 'tyson', time: WED, init: shared(seedDocs()), shared: true });
    await page.waitForFunction(() => window.MorningLaps.state.ready && window.MorningLaps.state.storage === 'db' && !!window.__store['profiles/jacquie/weekgoals/2026-12-07'] && !!window.__store['profiles/tyson/weekgoals/2026-12-07']);
    await page.waitForTimeout(600); await go(page, 'me'); await page.click('[data-a="backup-all"]'); await page.waitForFunction(() => window.__saved.length === 3);
    const r = await page.evaluate(() => { const st = {}; Object.keys(window.__store).filter(k => !k.startsWith('data/users/')).sort().forEach(k => { st[k] = window.__store[k]; }); const bk = JSON.parse(window.__saved[0].data).docs, out = {}; Object.keys(bk).sort().forEach(k => { out[k] = bk[k]; }); return { ok: JSON.stringify(st) === JSON.stringify(out), n: Object.keys(st).length, m: Object.keys(out).length, priv: Object.keys(window.__store).filter(k => k.startsWith('data/users/')).length, diff: Object.keys(st).filter(k => JSON.stringify(st[k]) !== JSON.stringify(bk[k])).slice(0, 5) }; });
    check('K signed in: the backup is every shared document in the store, exactly, without the account\'s private notes', r.ok && r.n === r.m && r.n > 70, JSON.stringify(r));
  });

  // ---------- smoke: every tab, both profiles, nothing written by looking ----------
  await section('G', async () => {
    await open({ me: 'tyson', time: WED, init: local(seedDocs({ thisWeek: [COMBINED] })) });
    await switchTo(page, 'jacquie'); await page.waitForTimeout(300); await switchTo(page, 'tyson'); await page.waitForTimeout(700); // first-open housekeeping (week locks, closing last week, badges) finishes first
    await watchWrites(page);
    const bad = [];
    for (const who of ['tyson', 'jacquie']) { if (who === 'jacquie') await switchTo(page, 'jacquie');
      for (const tab of ['train', 'program', 'history', 'fuel', 'compete', 'me']) { await go(page, tab); const n = await page.evaluate(() => document.querySelectorAll('#main .card, #main .sheet').length); if (!n || /undefined|NaN|\[object/.test(await txt(page, '#main'))) bad.push(who + ':' + tab); }
      await go(page, 'fuel'); await page.click('[data-a="food-add"][data-meal="b"]'); await page.waitForSelector('#foodQ');
      await page.click('[data-a="describe-open"]'); await waitOv('describe:ask'); await page.click('[data-a="food-back"]'); await page.waitForSelector('#foodQ');
      await scan(PH.fresh); await waitOv('scan:miss'); await page.click('[data-a="scan-link"]'); await waitOv('scan:link'); await page.click('[data-a="scan-prev"]'); await waitOv('scan:miss'); await page.click('[data-a="scan-blank"]'); await waitOv('custom'); await page.keyboard.press('Escape');
      await go(page, 'train'); await page.click('.sess [data-a="health"]'); await page.waitForSelector('#hkText'); await page.keyboard.press('Escape');
      await go(page, 'me'); await page.waitForSelector('#backupCard'); }
    await page.waitForTimeout(400);
    check('G smoke: every tab draws for both profiles, with nothing broken in the text', bad.length === 0, bad.join(' '));
    check('G showing screens and sheets writes nothing to the store', (await writes(page)).length === 0, JSON.stringify(await writes(page)));
    check('G window.MorningLaps is still exported, with the new pieces', await ML(page, () => { const M = window.MorningLaps; return ['state', 'weekScore', 'compWeeks', 'suggest', 'stallFor', 'deloadState', 'caps', 'normBarcode', 'backupDocs', 'workoutsCsv', 'foodCsv'].every(k => k in M); }));
    await ctx.close();
    // a narrow phone: the new sheets fit
    await open({ me: 'jacquie', time: WED, width: 320, height: 640, init: local(seedDocs()) });
    await addFood('d'); const fit1 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await page.click('[data-a="describe-open"]'); await waitOv('describe:ask'); await fill(page, '#descText', 'burrito bowl'); await page.click('[data-a="describe-go"]'); await waitOv('describe:list');
    const fit2 = await page.evaluate(() => { const ov = document.querySelector('#ov .ov'); return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, ov.scrollWidth - ov.clientWidth); });
    await page.keyboard.press('Escape'); await go(page, 'me'); const fit3 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('G at 320 px wide nothing scrolls sideways (Add food, the estimate list, Me)', fit1 <= 0 && fit2 <= 0 && fit3 <= 0, [fit1, fit2, fit3].join(' '));
  });
  check('no console errors in any section', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  await browser.close();
  process.exit(finish('version 15 checks') ? 1 : 0);
})();
