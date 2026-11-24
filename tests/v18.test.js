// The checks for version 18: Train is one Today card, everything is added from one Add sheet, and the lift log is a sheet.
// Headless browser, browser-only mode, seeded storage: two profiles with six-plus weeks of history, both gyms set to
// the Healthplex, Tyson on Full Body A/B. This suite goes through the real buttons (no legacy adapter).
// Run: node tests/v18.test.js   (ML_ONLY=T,F runs just those sections)
const { chromium, check, results, T, newPage, val, txt, has, fill, go, finish } = require('./helpers');
const kv = (page, path) => page.evaluate(p => (JSON.parse(localStorage.getItem('ml.kv') || '{}'))[p] || null, path);
const ses = (page, d) => page.evaluate(x => (JSON.parse(localStorage.getItem('ml.sessions') || '{}'))[x] || null, d);
const ML = (page, fn, arg) => page.evaluate(fn, arg);
const settled = page => page.waitForFunction(() => window.MorningLaps.state.ready && !!(JSON.parse(localStorage.getItem('ml.kv') || '{}'))['profiles/jacquie/weekgoals/' + (function () { const s = window.MorningLaps.state.today, d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8))); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); })()]);
const switchTo = async (page, pid) => { await page.click('#whoBtn'); await page.click('[data-a="who-pick"][data-pid="' + pid + '"]'); await page.waitForFunction(p => window.MorningLaps.state.pid === p && document.getElementById('ov').hidden, pid); };
const plus = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const watchWrites = page => page.evaluate(() => { window.__w = []; if (window.__wOn) return; window.__wOn = true; const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k) { if (k === 'ml.kv' || k === 'ml.sessions' || k === 'ml.settings') window.__w.push(k); return set.apply(this, arguments); }; });
const writes = page => page.evaluate(() => window.__w.slice());
const HP = 'Indianapolis Healthplex';
// what version 17's screens saved for the same inputs (captured from the version 17 build, ids and timestamps aside)
const GOLD = {
  "lift.checkin": {"v":2,"date":"2026-12-09","phase":3,"checkin":"strong","treadmill":{"minutes":5,"title":""},"notes":"felt good","kind":"strength","day":"fba","ex":{"squat":{"w":155,"reps":[10,10,10]},"dbbench":{"w":30,"reps":[10,10,10]},"latpull":{"w":110,"reps":[10,10,10]},"dbshoulder":{"w":20,"reps":[10,10]},"legcurl":{"w":60,"reps":[10,10]},"legraise":{"reps":[10,10]}},"planned":["squat","dbbench","latpull","dbshoulder","legcurl","legraise"],"plannedBase":["squat","dbbench","latpull","dbshoulder","legcurl","legraise"],"swaps":{},"qualifyOverride":null,"qualifies":true,"complete":true},
  "lift.plain": {"v":2,"date":"2026-12-09","phase":3,"treadmill":{"minutes":5,"title":""},"notes":"felt good","kind":"strength","day":"fba","ex":{"squat":{"w":155,"reps":[10,10,10]},"dbbench":{"w":30,"reps":[10,10,10]},"latpull":{"w":110,"reps":[10,10,10]},"dbshoulder":{"w":20,"reps":[10,10]},"legcurl":{"w":60,"reps":[10,10]},"legraise":{"reps":[10,10]}},"planned":["squat","dbbench","latpull","dbshoulder","legcurl","legraise"],"plannedBase":["squat","dbbench","latpull","dbshoulder","legcurl","legraise"],"swaps":{},"qualifyOverride":null,"qualifies":true,"complete":true},
  "cardio.checkin": {"v":2,"date":"2026-12-09","kind":"activity","acts":[{"a":"hptrack","name":"Track walk","min":32,"feel":null,"hurt":false,"note":"16 laps (2.0 mi)","mv":true}],"checkin":"tired"},
  "cardio.plain": {"v":2,"date":"2026-12-09","kind":"activity","acts":[{"a":"hptrack","name":"Track walk","min":32,"feel":null,"hurt":false,"note":"16 laps (2.0 mi)","mv":true}]},
  "swim.checkin": {"v":2,"date":"2026-12-09","kind":"activity","acts":[{"a":"hpswim","name":"Lap swim, easy","min":20,"feel":null,"hurt":false,"note":"8 lengths (200 yd)","mv":true}],"checkin":"tired"},
  "treadmill.checkin": {"v":2,"date":"2026-12-09","phase":3,"checkin":"tired","treadmill":{"minutes":22,"title":""},"notes":"","kind":"cardio"},
  "treadmill.plain": {"v":2,"date":"2026-12-09","phase":3,"treadmill":{"minutes":22,"title":""},"notes":"","kind":"cardio"},
  "recovery.checkin": {"v":2,"date":"2026-12-09","kind":"activity","acts":[{"a":"stretchfull","name":"Gentle full-body stretch","min":10,"feel":null,"hurt":false,"note":"","mv":true},{"a":"hpsauna","name":"Dry sauna","min":12,"feel":null,"hurt":false,"note":"","mv":false}],"checkin":"sore"},
  "recovery.plain": {"v":2,"date":"2026-12-09","kind":"activity","acts":[{"a":"stretchfull","name":"Gentle full-body stretch","min":10,"feel":null,"hurt":false,"note":"","mv":true},{"a":"hpsauna","name":"Dry sauna","min":12,"feel":null,"hurt":false,"note":"","mv":false}]},
  "rest.plain": {"v":2,"date":"2026-12-09","phase":3,"kind":"rest","notes":""},
  "rest.checkin": {"v":2,"date":"2026-12-09","phase":3,"checkin":"rest","kind":"rest","notes":""},
  "j.circuit": {"v":2,"date":"2026-12-09","kind":"activity","acts":[{"a":"hpcircuit","name":"Light machine circuit","min":15,"feel":null,"hurt":false,"note":"","mv":true}]},
  "j.walk": {"v":2,"date":"2026-12-09","kind":"activity","acts":[{"a":"walkeasy","name":"Easy walk","min":20,"feel":"good","hurt":false,"note":"around the block","mv":true}]},
  "j.good.checkin": {"v":2,"date":"2026-12-09","kind":"activity","acts":[{"a":"hptrack","name":"Track walk + Light machine circuit","min":25,"feel":null,"hurt":false,"note":"Track walk 10 min, 6 laps (0.75 mi) · Light machine circuit 15 min","mv":true}],"checkin":"good"},
  "j.sore.checkin": {"v":2,"date":"2026-12-09","kind":"activity","acts":[{"a":"stretchfull","name":"Gentle full-body stretch","min":8,"feel":null,"hurt":false,"note":"","mv":true},{"a":"hpwhirl","name":"Whirlpool","min":10,"feel":null,"hurt":false,"note":"","mv":false}],"checkin":"sore"},
  "j.rest.plain": {"v":2,"date":"2026-12-09","kind":"rest","notes":""},
  "j.rest.checkin": {"v":2,"date":"2026-12-09","kind":"rest","notes":"","checkin":"rest"},
};
const strip = r => { if (!r) return r; const c = JSON.parse(JSON.stringify(r)); ['savedAt', 'updatedAt', 'progAt'].forEach(k => delete c[k]); (c.acts || []).forEach(a => { delete a.id; delete a.at; }); return c; };

/* ---------- the seed: Mon Oct 26 through Fri Dec 4, "today" Wed Dec 9 ---------- */
const WEEKS = ['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'];
const reps = (n, c) => Array.from({ length: c || 3 }, () => n);
const SETS = (day, i) => day === 'push' ? { chestpress: { w: 70 + 5 * i, reps: reps(12) }, inclinedb: { w: 25 + 5 * Math.floor(i / 2), reps: reps(10) }, shoulderpress: { w: 50, reps: reps(10) } }
  : day === 'pull' ? { latpull: { w: 80 + 5 * i, reps: reps(12) }, seatedrow: { w: 80 + 5 * i, reps: reps(10) }, dbcurl: { w: 20, reps: reps(11) } }
  : { squat: { w: 95 + 10 * i, reps: reps(10) }, dbrdl: { w: 30 + 5 * i, reps: reps(12) }, legcurl: { w: 60, reps: reps(12) } };
const lift = (date, day, phase, ex, extra) => Object.assign({ v: 2, date, kind: 'strength', day, phase, planned: Object.keys(ex), plannedBase: Object.keys(ex), swaps: {}, ex, qualifies: true, complete: true, treadmill: { minutes: 20, title: '' }, savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' }, extra);
const tread = (date, phase) => ({ v: 2, date, kind: 'cardio', phase, treadmill: { minutes: 25, title: 'Fitness+ run' }, savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' });
const act = (date, a, name, min) => ({ id: 'a-' + a + '-' + date, a, name, min, feel: 'good', hurt: false, note: '', mv: true, at: date + 'T12:00:00Z' });
const day = (date, acts) => ({ v: 2, date, kind: 'activity', acts, savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' });
// opt.tProfile / opt.jProfile: extra profile fields. opt.jGym: Jacquie's gym ('' for none). opt.drafts: Tyson's drafts on this phone.
function seedDocs(opt) {
  opt = opt || {};
  const sessions = {}, kv = {};
  WEEKS.forEach((ws, i) => { const ph = i < 2 ? 1 : i === 2 ? 2 : 3, d = n => plus(ws, n);
    sessions[d(0)] = lift(d(0), 'push', ph, SETS('push', i)); sessions[d(1)] = tread(d(1), ph); sessions[d(2)] = lift(d(2), 'pull', ph, SETS('pull', i)); sessions[d(3)] = tread(d(3), ph);
    sessions[d(4)] = i === 0 ? tread(d(4), ph) : lift(d(4), 'legs', ph, SETS('legs', i));
    kv['profiles/jacquie/sessions/' + d(0)] = day(d(0), [act(d(0), 'walkeasy', 'Easy walk', 20)]);
    kv['profiles/jacquie/sessions/' + d(2)] = day(d(2), [act(d(2), 'chairyoga', 'Chair yoga', 20)]);
    kv['profiles/jacquie/sessions/' + d(4)] = day(d(4), [act(d(4), 'walkeasy', 'Easy walk', 20)]);
  });
  kv['profiles/jacquie'] = Object.assign({ name: 'Jacquie', place: opt.jGym == null ? HP : opt.jGym, placeSince: '2026-11-01', body: { sex: 'f', age: 30, heightIn: 64, weightLb: 150, activity: 'light', pace: 'maintain' } }, opt.jProfile);
  kv['profiles/tyson'] = Object.assign({ name: 'Tyson', place: HP, placeSince: '2026-11-01' }, opt.tProfile);
  kv['comp/settings'] = { start: '2026-10-26', stakes: '' };
  return { sessions, settings: Object.assign({ startDate: '2026-10-26', goal: 5, maxed: {}, swaps: {}, split: 'full' }, opt.settings), kv, drafts: opt.drafts || null };
}
const local = docs => 'if(!localStorage.getItem("seeded")){localStorage.setItem("seeded","1");localStorage.setItem("ml.sessions",' + JSON.stringify(JSON.stringify(docs.sessions)) + ');localStorage.setItem("ml.settings",' +
  JSON.stringify(JSON.stringify(docs.settings)) + ');localStorage.setItem("ml.kv",' + JSON.stringify(JSON.stringify(docs.kv)) + ');' + (docs.drafts ? 'localStorage.setItem("ml.drafts",' + JSON.stringify(JSON.stringify(docs.drafts)) + ');' : '') + '}';
const at = d => T(d + 'T17:00:00Z');
const FRI = '2026-12-04', TUE = '2026-12-08', WED = '2026-12-09';
const FULLA = [['squat', 3], ['dbbench', 3], ['latpull', 3], ['dbshoulder', 2], ['legcurl', 2], ['legraise', 2]];

(async () => {
  const browser = await chromium.launch();
  let ctx, page; const consoleErrors = [];
  const open = async (opts) => {
    ({ ctx, page } = await newPage(browser, Object.assign({ time: at(WED), width: 390, height: 844 }, opts))); page.on('console', m => { if (m.type() === 'error' && !/favicon/i.test(m.text())) consoleErrors.push(m.text()); }); page.on('pageerror', e => consoleErrors.push('uncaught: ' + e.message));
    await settled(page); await page.clock.fastForward(2500); // past anything announced on opening
    await page.evaluate(() => { const f = window.MorningLaps.state.fxn; f.burst = 0; f.milestone = 0; window.__off = []; window.__maxY = 0; addEventListener('scroll', () => { window.__maxY = Math.max(window.__maxY, scrollY); }, { passive: true }); });
    return page;
  };
  const only = process.env.ML_ONLY ? process.env.ML_ONLY.split(',') : null;
  const section = async (tag, fn) => {
    if (only && !only.includes(tag)) return;
    try { await fn(); } catch (e) {
      let where = ''; try { where = ' [wm: ' + JSON.stringify(await page.evaluate(() => { const w = window.MorningLaps.wmState(); return w ? [w.view, w.plan.kind] : null; })) + '; sheet: ' + (await page.evaluate(() => { const o = window.MorningLaps.state.ov; return o ? o.type : ''; })) + '; after: ' + (results.length ? results[results.length - 1].name : 'start') + ']'; } catch (e2) { /* page gone */ }
      check(tag + ' ran to the end', false, String(e && e.message || e).split('\n')[0] + where);
    }
    try { if (ctx) await ctx.close(); } catch (e) { /* already closed */ }
  };
  // tap: the target must already be fully on screen (inside the viewport, and inside the sheet's own scroll area when it
  // has one), so a flow made of taps needs no scrolling. What was off screen is collected in window.__off.
  const tap = async sel => {
    await page.waitForSelector(sel);
    const off = await page.evaluate(s => { const el = document.querySelector(s), r = el.getBoundingClientRect(), b = el.closest('.ls-body'), c = b ? b.getBoundingClientRect() : { top: 0, bottom: innerHeight };
      const out = r.top < Math.max(0, c.top) - 1 || r.bottom > Math.min(innerHeight, c.bottom) + 1 || r.left < -1 || r.right > innerWidth + 1; if (out) window.__off.push(s + ' ' + Math.round(r.top) + '..' + Math.round(r.bottom)); el.click(); return out; }, sel);
    return !off;
  };
  const offs = () => page.evaluate(() => ({ off: window.__off.slice(), maxY: window.__maxY, y: scrollY }));
  const ovType = () => page.evaluate(() => { const o = window.MorningLaps.state.ov; return o ? o.type : ''; });
  const noOv = () => page.waitForFunction(() => !window.MorningLaps.state.ov);
  const wmv = () => page.evaluate(() => { const w = window.MorningLaps.wmState(); return w ? w.view : null; });
  const waitView = v => page.waitForFunction(x => { const w = window.MorningLaps.wmState(); return (w ? w.view : null) === x; }, v);
  const fxn = () => page.evaluate(() => Object.assign({}, window.MorningLaps.state.fxn));
  const pick = async c => { await page.click('[data-a="ci-pick"][data-v="' + c + '"]'); await page.waitForSelector('#ciPreview'); };
  const rows = () => page.$$eval('#todayRows .trow', els => els.map(e => e.querySelector('.tr-t b').textContent + ' | ' + e.querySelector('.tr-t .tiny').textContent));
  const inView = sel => page.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.width > 0; }, sel);
  const pageH = () => page.evaluate(() => document.documentElement.scrollHeight);
  const blur = () => page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
  // type a full Full Body A into the lift sheet (inside the sheet the body scrolls; the page does not)
  const typeLift = async (extra) => {
    await fill(page, '#tmMin', 5);
    for (const [k, n] of FULLA) { if (k !== 'legraise') await page.click('[data-usew="' + k + '"]'); for (let i = 0; i < n; i++) await fill(page, '#r-' + k + '-' + i, 10); }
    if (extra) await extra();
    await fill(page, '#notes', 'felt good'); await blur();
  };
  const saveLift = async kind => { await page.click('#saveBtn'); await page.waitForFunction(([d, k]) => { const r = (JSON.parse(localStorage.getItem('ml.sessions') || '{}'))[d]; return r && r.kind === k && !window.MorningLaps.state.ov; }, [WED, kind || 'strength']); };
  const savedAct = (pid, n) => page.waitForFunction(([p, d, k]) => { const r = p === 'tyson' ? (JSON.parse(localStorage.getItem('ml.sessions') || '{}'))[d] : (JSON.parse(localStorage.getItem('ml.kv') || '{}'))['profiles/jacquie/sessions/' + d]; return r && (r.acts || []).length >= k && !window.MorningLaps.state.ov; }, [pid, WED, n]);
  const recOf = (pid, d) => pid === 'tyson' ? ses(page, d || WED) : kv(page, 'profiles/jacquie/sessions/' + (d || WED));

  // ---------- 0: the seed ----------
  await section('S', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    const s = await ML(page, () => { const M = window.MorningLaps, st = M.state; return { ts: Object.keys(st.data.tyson.sessions).length, js: Object.keys(st.data.jacquie.sessions).length, first: Object.keys(st.data.tyson.sessions).sort()[0], hp: [M.atHealthplex('tyson'), M.atHealthplex('jacquie')], split: M.splitOf('tyson'), next: M.nextDayKey('2026-12-09'), motion: [M.motionOf('tyson'), M.motionOf('jacquie')] }; });
    check('S two profiles with six-plus weeks of history, both at the Healthplex, Tyson on Full Body A/B', s.ts === 30 && s.js === 18 && s.first === '2026-10-26' && same(s.hp, [true, true]) && s.split === 'full' && s.next === 'fba' && same(s.motion, ['subtle', 'subtle']), JSON.stringify(s));
  });

  // ---------- 1: the Today card ----------
  await section('T', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    const lay = () => page.evaluate(() => { const r = id => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom), Math.round(b.left), Math.round(b.right)]; }, m = document.getElementById('main'), T = document.getElementById('today');
      return { vw: innerWidth, vh: innerHeight, y: scrollY, today: r('today'), chip: r('dateChip'), sw: r('modeSwitch'), ci: r('checkin'), add: r('addBtn'), coach: r('coach'), kids: Array.from(m.children).filter(e => !e.classList.contains('banner')).map(e => e.id || e.className), inCard: ['dateChip', 'modeSwitch', 'checkin', 'addBtn'].every(id => T.contains(document.getElementById(id))), title: document.getElementById('todayTitle').textContent, cards: document.querySelectorAll('#checkin .cic').length,
        gone: ['logForm', 'kindSeg', 'saveBtn', 'savebar', 'logHead', 'heatChip', 'morningPlan', 'extras', 'datePick'].filter(id => document.getElementById(id)), grid: m.querySelectorAll('.acts, .datebar, .weekdots').length, weekCard: Array.from(m.querySelectorAll('h2, h3')).some(h => /^(This week|Pick your move|Log your workout)$/.test(h.textContent.trim())), text: m.textContent, coachRows: Array.from(document.querySelectorAll('#coach .coachrow')).map(d => [d.id, d.open, Math.round(d.getBoundingClientRect().height)]), h: document.documentElement.scrollHeight }; });
    const t = await lay();
    check('T on 390 × 844 a fresh Train shows the Today card with the check-in and the switch without scrolling (Tyson)', t.vw === 390 && t.vh === 844 && t.y === 0 && t.inCard && t.today[0] >= 0 && t.sw[0] >= t.today[0] && t.sw[1] <= 844 && t.ci[1] <= 844 && t.cards === 5 && t.title === 'Today', JSON.stringify(t));
        check('T the header is the date chip with the Log it / Go live switch on its right, on one line', Math.abs((t.chip[0] + t.chip[1]) / 2 - (t.sw[0] + t.sw[1]) / 2) <= 4 && t.chip[3] <= t.sw[2] && t.sw[3] <= t.today[3] && same(await page.$$eval('#modeSwitch button', els => els.map(e => e.textContent + ':' + e.getAttribute('aria-pressed'))), ['Log it:true', 'Go live:false']), JSON.stringify([t.chip, t.sw]));
    check('T "Add to today" is a full-width button under the check-in, also on the first screen', t.add[1] <= 844 && t.add[0] >= t.ci[1] && t.add[3] - t.add[2] >= (t.today[3] - t.today[2]) - 40 && (await txt(page, '#addBtn')) === 'Add to today', JSON.stringify(t.add));
    check('T below the card there is only the Coach row: one closed line for the deload offer, one for the goal nudge', same(t.kids, ['subnav', 'today', 'coach']) && t.coachRows.length === 2 && t.coachRows[0][0] === 'deloadBanner' && t.coachRows[1][0] === 'nudgeCard' && t.coachRows.every(r => r[1] === false && r[2] <= 44), JSON.stringify([t.kids, t.coachRows]));
    check('T the lift form, the week strip, the sauna chip and the morning plan are not on Train', t.gone.length === 0 && t.grid === 0 && !t.weekCard && !t.text.includes('Sauna, steam or whirlpool after?') && !t.text.includes('Morning plan'), JSON.stringify(t.gone));
    await page.click('#nudgeCard summary');
    check('T a tap opens a Coach line with its buttons', await page.evaluate(() => document.getElementById('nudgeCard').open && document.querySelector('#nudgeCard [data-a="nudge-yes"]').getBoundingClientRect().height > 0));
    await go(page, 'program');
    const plan = await page.evaluate(() => { const d = document.getElementById('morningPlan'); return d ? d.textContent : ''; });
    check('T the morning plan moved to the Program tab', plan.includes('Morning plan') && plan.includes('At the Healthplex. Warm-up 5–10 min.') && plan.includes('Full Body A'), plan.slice(0, 120));
    await go(page, 'train'); await switchTo(page, 'jacquie'); await page.evaluate(() => window.scrollTo(0, 0));
    const j = await lay();
    check('T the same for Jacquie: Today card, check-in and switch on the first screen', j.y === 0 && j.inCard && j.today[0] >= 0 && j.sw[1] <= 844 && j.ci[1] <= 844 && j.add[1] <= 844 && j.cards === 4 && j.title === 'Today', JSON.stringify(j));
    check('T her always-open activity grid and the "This week" card are gone from Train', same(j.kids, ['subnav', 'today', 'coach']) && j.grid === 0 && !j.weekCard && j.h <= 1300, JSON.stringify([j.kids, j.grid, j.h]));
    await go(page, 'program');
    check('T (her Plan tab is unchanged: she had no morning plan to move)', (await txt(page, '#main')).includes('Move 3 day') && !(await has(page, '#morningPlan')));
    await ctx.close();
    // a pick-your-own profile whose gym is not the Healthplex: no check-in, the same card
    await open({ me: 'jacquie', init: local(seedDocs({ jGym: '' })) });
    const n = await lay();
    check('T with another gym (or none) she has the same card and switch, no check-in, and "Add to today"', n.today && n.sw && !n.ci && n.add[1] <= 844 && (await txt(page, '#todayEmpty')) === 'Nothing logged yet today.' && same(n.kids, ['subnav', 'today', 'coach']), JSON.stringify(n.kids));
    await go(page, 'me');
    check('T her one-tap Healthplex gym button on Me is still there', (await txt(page, '#gymHp')).includes('Healthplex'));
  });

  // ---------- 3: the lift log is a sheet ----------
  await section('F', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    await watchWrites(page);
    await pick('strong'); const t1 = await tap('#ciLog'); await page.waitForSelector('#liftSheet');
    const a = await page.evaluate(() => { const f = document.activeElement, r = f.getBoundingClientRect(), b = document.querySelector('.ls-body').getBoundingClientRect(), S = document.getElementById('liftSheet'), sr = S.getBoundingClientRect(), foot = document.querySelector('.ls-foot'), head = document.querySelector('.ls-head');
      return { focus: f.id, inView: r.top >= b.top && r.bottom <= b.bottom, title: document.getElementById('liftTitle').textContent, date: document.getElementById('liftDate').textContent, kind: document.querySelector('#kindSeg .on').textContent, y: scrollY, full: Math.round(sr.bottom) === innerHeight && sr.height >= innerHeight - 40,
        inBody: ['kindSeg', 'tmMin', 'notes', 'logForm', 'whyLine', 'statusLine'].every(id => document.querySelector('.ls-body').contains(document.getElementById(id))) && !!document.querySelector('.ls-body details.sessopts') && document.querySelectorAll('.ls-body .ex[data-ex]').length === 6,
        inFoot: foot.contains(document.getElementById('savebar')) && foot.contains(document.getElementById('saveBtn')) && foot.contains(document.getElementById('rest')), live: head.querySelector('#wmStart').textContent, footPos: getComputedStyle(document.getElementById('savebar')).position, onPage: !!document.querySelector('#main #savebar, #main #logForm') }; });
    check('F "Log it" on a lift choice opens the lift log as a full-height sheet, on that day', t1 && a.title === 'Full Body A' && a.kind === 'Full Body A' && a.date.startsWith('Today') && a.full && a.y === 0, JSON.stringify(a));
    check('F the sheet holds the kind buttons, warm-up, exercises, notes and session options', a.inBody, JSON.stringify(a));
    check('F the Save bar lives in the sheet only, in a foot that does not scroll, and "Go live" sits in the head', a.inFoot && !a.onPage && a.footPos === 'static' && a.live === 'Go live', JSON.stringify([a.inFoot, a.onPage, a.footPos, a.live]));
    check('F the first weight field has the cursor and is in view', a.focus === 'w-squat' && a.inView);
    check('F nothing is saved by opening it: the choice is only on the draft', (await ses(page, WED)) === null && (await writes(page)).length === 0 && (await page.evaluate(() => JSON.parse(localStorage.getItem('ml.drafts'))['2026-12-09'].checkin)) === 'strong');
    // the rest timer: in the foot, never on top of a button
    await page.click('[data-usew="squat"]'); await fill(page, '#r-squat-0', 10); await blur(); await page.waitForSelector('#rest:not([hidden])');
    const cover = () => page.evaluate(() => { const S = document.getElementById('liftSheet'), body = S.querySelector('.ls-body'), rt = document.getElementById('rest').getBoundingClientRect(), br = body.getBoundingClientRect(), hit = [];
      S.querySelectorAll('button, input, summary, a').forEach(el => { if (document.getElementById('rest').contains(el)) return; let r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
        const top = body.contains(el) ? Math.max(r.top, br.top) : r.top, bottom = body.contains(el) ? Math.min(r.bottom, br.bottom) : r.bottom; if (bottom <= top) return; // scrolled out of the body: not on screen at all
        if (top < rt.bottom - 0.5 && bottom > rt.top + 0.5 && r.left < rt.right && r.right > rt.left) hit.push(el.id || el.textContent.trim().slice(0, 20)); });
      const sv = document.getElementById('saveBtn').getBoundingClientRect(); return { hit, timerInFoot: document.querySelector('.ls-foot').contains(document.getElementById('rest')), aboveSave: rt.bottom <= sv.top + 0.5, belowBody: rt.top >= br.bottom - 0.5, label: document.getElementById('restLabel').textContent, time: document.getElementById('restTime').textContent }; });
    const c0 = await cover();
    await page.evaluate(() => { document.querySelector('.ls-body').scrollTop = 300; }); const c1 = await cover();
    await page.evaluate(() => { const b = document.querySelector('.ls-body'); b.scrollTop = b.scrollHeight; }); const c2 = await cover();
    check('F a set typed for today starts the rest timer in the foot of the sheet, above the Save bar', c0.timerInFoot && c0.aboveSave && c0.belowBody && c0.label === 'Rest · Barbell back squat' && c0.time === '1:30', JSON.stringify(c0));
    check('F the rest timer never covers a button, wherever the sheet is scrolled', c0.hit.length === 0 && c1.hit.length === 0 && c2.hit.length === 0, JSON.stringify([c0.hit, c1.hit, c2.hit]));
    await page.evaluate(() => { document.querySelector('.ls-body').scrollTop = 0; });
    // a form error shows inside the sheet, and the sheet stays open
    await fill(page, '#r-dbbench-0', 10); await blur(); await page.click('#saveBtn'); await page.waitForSelector('#savenote.bad');
    check('F a form error shows inside the sheet, which stays open', (await ovType()) === 'lift' && (await page.evaluate(() => document.querySelector('.ls-foot').contains(document.getElementById('savenote')))) && (await txt(page, '#savenote')).includes('Dumbbell bench press') && (await ses(page, WED)) === null, await txt(page, '#savenote'));
    await fill(page, '#r-dbbench-0', '');
    // the whole lift
    await fill(page, '#tmMin', 5); for (const [k, n] of FULLA) { if (k !== 'legraise') await page.click('[data-usew="' + k + '"]').catch(() => {}); for (let i = 0; i < n; i++) await fill(page, '#r-' + k + '-' + i, 10); }
    await blur(); const timerOn = await page.evaluate(() => window.MorningLaps.restT.end > 0 && !document.getElementById('rest').hidden);
    await page.click('#saveBtn'); await page.waitForFunction(d => { const r = (JSON.parse(localStorage.getItem('ml.sessions') || '{}'))[d]; return r && r.kind === 'strength' && !window.MorningLaps.state.ov; }, WED);
    const after = await page.evaluate(() => ({ ov: !!window.MorningLaps.state.ov, sheet: !!document.getElementById('liftSheet'), y: scrollY, form: !!document.querySelector('#logForm, #saveBtn, #kindSeg'), rest: !!document.getElementById('rest'), restEnd: window.MorningLaps.restT.end, restTick: window.MorningLaps.restT.tick, rows: Array.from(document.querySelectorAll('#todayRows .trow')).map(e => e.textContent), ci: !!document.getElementById('checkin'), opens: window.MorningLaps.state.wmOpens || 0, hot: document.querySelector('[data-row="prog"]').classList.contains('new'), anim: [getComputedStyle(document.querySelector('[data-row="prog"]')).animationName, parseFloat(getComputedStyle(document.querySelector('[data-row="prog"]')).animationDuration)] }));
    const rec = await ses(page, WED);
    check('F after saving a Full Body A the screen is back on Today and the lift is one row', !after.ov && !after.sheet && !after.form && !after.ci && after.y === 0 && after.rows.length === 1 && (await rows())[0] === 'Full Body A | 6 lifts · 15 sets · lift day' && rec.day === 'fba' && rec.complete === true && rec.qualifies === true && rec.checkin === 'strong' && after.opens === 0, JSON.stringify([after, await rows()]));
    check('F "Add to today" is visible without scrolling', (await inView('#addBtn')) && (await txt(page, '#addBtn')) === 'Add to today' && (await pageH()) <= 844 + 60, String(await pageH()));
    check('F the rest timer is gone after the save', timerOn && !after.rest && after.restEnd === 0 && !after.restTick, JSON.stringify([timerOn, after.rest, after.restEnd]));
    check('F the new row gets one quick highlight: a 250 ms fade and slide', after.hot && after.anim[0] === 'rowIn' && after.anim[1] === 0.25, JSON.stringify(after.anim));
    // the walk: Add, Cardio, fill in, Log. No scrolling.
    await page.clock.fastForward(1500); await page.evaluate(() => { window.__off = []; window.__maxY = 0; });
    const steps = [await tap('#addBtn')]; await page.waitForSelector('#addGrid'); steps.push(await tap('#addCardio')); await page.waitForSelector('#cilogSave');
    const sheetFits = await page.evaluate(() => { const v = document.querySelector('#ov .ov'); return v.scrollHeight <= v.clientHeight + 1 && v.getBoundingClientRect().top >= 0; });
    await fill(page, '#cilogLaps0', 16); await fill(page, '#cilogMin0', 32); steps.push(await tap('#cilogSave')); await savedAct('tyson', 1);
    const o1 = await offs(), r2 = await rows(), both = await ses(page, WED);
    check('F adding a track walk takes Add, Cardio, fill in, Log, with no scrolling', steps.every(Boolean) && sheetFits && o1.off.length === 0 && o1.maxY === 0 && o1.y === 0, JSON.stringify([steps, sheetFits, o1]));
    check('F the walk appears as a second row', same(r2, ['Full Body A | 6 lifts · 15 sets · lift day', 'Track walk | 32 min · 2.0 mi']) && both.kind === 'strength' && both.acts.length === 1 && both.acts[0].a === 'hptrack' && both.acts[0].note === '16 laps (2.0 mi)' && both.checkin === 'strong' && (await page.evaluate(() => document.querySelectorAll('#todayRows .trow.new').length)) === 1, JSON.stringify(r2));
    // the sauna: Add, Recovery
    await page.clock.fastForward(1500);
    await tap('#addBtn'); await tap('#addRecovery'); await page.waitForSelector('#cilogHeat'); await fill(page, '#cilogMin0', ''); await fill(page, '#cilogHeatMin', 12); await tap('#cilogSave'); await savedAct('tyson', 2);
    const r3 = await rows(), h3 = await pageH();
    check('F a sauna session is a third row: "12 min · recovery"', same(r3, ['Full Body A | 6 lifts · 15 sets · lift day', 'Track walk | 32 min · 2.0 mi', 'Dry sauna | 12 min · recovery']), JSON.stringify(r3));
    check('F a day with a lift, a track walk and a sauna session has a Train page no taller than 1,300 px: ' + h3, h3 <= 1300 && (await inView('#addBtn')), String(h3));
    // tapping the lift row opens the sheet with every saved set
    await page.clock.fastForward(1500); await tap('[data-row="prog"]'); await page.waitForSelector('#liftSheet');
    const shown = await page.evaluate(() => { const o = {}; document.querySelectorAll('#liftSheet .ex[data-ex]').forEach(e => { const k = e.dataset.ex, w = document.getElementById('w-' + k); o[k] = [w ? w.value : null, Array.from(e.querySelectorAll('[data-field="rep"]')).map(i => i.value)]; }); return { o, tm: document.getElementById('tmMin').value, btn: document.getElementById('saveBtn').textContent, del: (document.getElementById('delBtn') || {}).textContent, status: document.getElementById('statusLine').textContent, kind: document.querySelector('#kindSeg .on').textContent, why: document.getElementById('whyLine').textContent }; });
    const want = {}; Object.keys(rec.ex).forEach(k => { want[k] = [rec.ex[k].w == null ? null : String(rec.ex[k].w), rec.ex[k].reps.map(String)]; });
    check('F tapping the lift row opens the sheet with every saved set', same(shown.o, want) && shown.tm === '5' && shown.kind === 'Full Body A' && shown.btn === 'Update Today' && shown.del === 'Remove' && shown.status.startsWith('Saved') && shown.why.includes('Counted Full Body A day'), JSON.stringify(shown));
    await fill(page, '#r-squat-2', 8); await blur(); await page.click('#saveBtn'); await page.waitForFunction(d => { const r = (JSON.parse(localStorage.getItem('ml.sessions') || '{}'))[d]; return r && r.ex.squat.reps[2] === 8 && !window.MorningLaps.state.ov; }, WED);
    const e1 = await ses(page, WED);
    check('F changing one set and saving updates the record, and the other sets and the day\'s activities are untouched', same(e1.ex.squat.reps, [10, 10, 8]) && same(e1.ex.dbbench, rec.ex.dbbench) && e1.acts.length === 2 && e1.qualifies === true && (await rows())[0] === 'Full Body A | 6 lifts · 15 sets · lift day' && (await page.evaluate(() => document.querySelector('[data-row="prog"]').classList.contains('new'))) && (await page.evaluate(() => window.MorningLaps.restT.end)) === 0, JSON.stringify(e1.ex.squat));
    await page.clock.fastForward(1500); await tap('[data-row="prog"]'); await page.waitForSelector('#liftSheet'); await fill(page, '#r-legraise-1', ''); await blur(); await page.click('#saveBtn'); await page.waitForFunction(d => { const r = (JSON.parse(localStorage.getItem('ml.sessions') || '{}'))[d]; return r && r.ex.legraise.reps.filter(x => x != null).length === 1 && !window.MorningLaps.state.ov; }, WED);
    check('F and the row follows the record: one set fewer shows as 14 sets', (await rows())[0] === 'Full Body A | 6 lifts · 14 sets · lift day', JSON.stringify(await rows()));
    // an activity row opens its editor with its saved values
    await page.clock.fastForward(1500); await tap('[data-row]:nth-child(2)'); await page.waitForSelector('#actLog');
    const ed = await page.evaluate(() => ({ min: document.getElementById('actMin').value, laps: document.getElementById('actLaps').value, btn: document.getElementById('actLog').textContent.trim(), head: document.querySelector('#ov .ov-head h2').textContent }));
    check('F tapping the walk opens its editor with its saved minutes and laps', ed.min === '32' && ed.laps === '16' && ed.btn === 'Update 32 min' && ed.head.includes('Track walk'), JSON.stringify(ed));
    await fill(page, '#actMin', 35); await tap('#actLog'); await noOv();
    const e2 = await ses(page, WED);
    check('F changing its minutes updates the entry and its row, and writes the same note back', e2.acts.length === 2 && e2.acts[0].min === 35 && e2.acts[0].note === '16 laps (2.0 mi)' && (await rows())[1] === 'Track walk | 35 min · 2.0 mi', JSON.stringify(e2.acts[0]));
    // Remove moved into the sheet, with the same confirm step
    await page.clock.fastForward(1500); await tap('[data-row="prog"]'); await page.waitForSelector('#delBtn'); await page.click('#delBtn');
    const conf = await txt(page, '#delBtn'); const still = await ses(page, WED);
    await page.click('#delBtn'); await page.waitForFunction(d => { const r = (JSON.parse(localStorage.getItem('ml.sessions') || '{}'))[d]; return r && r.kind === 'activity' && !window.MorningLaps.state.ov; }, WED);
    check('F "Remove" is in the sheet with the same confirm step, and removes only the lift', conf === 'Tap again: remove Wed Dec 9' && still.kind === 'strength' && same(await rows(), ['Track walk | 35 min · 2.0 mi', 'Dry sauna | 12 min · recovery']) && (await page.evaluate(() => !document.getElementById('liftSheet'))) && (await txt(page, '#toast')).includes('Undo'), JSON.stringify([conf, await rows(), await txt(page, '#toast')]));
    check('F no particle bursts in any of this (Subtle)', (await fxn()).burst === 0 && consoleErrors.length === 0, JSON.stringify([await fxn(), consoleErrors.slice(0, 2)]));
    await ctx.close();

    // closing the sheet keeps the draft, stops the timer, and shows a draft row; Escape closes a menu first
    await open({ me: 'tyson', init: local(seedDocs()) });
    await tap('#addBtn'); await page.waitForSelector('#addGrid');
    check('F Add, then Lift shows which day is next', (await txt(page, '#addLift')).includes('Lift') && (await txt(page, '#addLift')).includes('Full Body A next'), await txt(page, '#addLift'));
    await tap('#addLift'); await page.waitForSelector('#liftSheet');
    check('F Add, then Lift opens the same sheet, and writes nothing by opening', (await txt(page, '#liftTitle')) === 'Full Body A' && (await page.evaluate(() => !localStorage.getItem('ml.drafts') || !JSON.parse(localStorage.getItem('ml.drafts'))['2026-12-09'])));
    await page.click('[data-usew="squat"]'); await fill(page, '#r-squat-0', 9); await blur(); await page.waitForSelector('#rest:not([hidden])');
    await page.click('[data-menu="squat"]'); await page.waitForSelector('.menu[data-menufor="squat"]'); await page.keyboard.press('Escape');
    const esc1 = await page.evaluate(() => [!!document.querySelector('.menu'), !!document.getElementById('liftSheet')]);
    await page.keyboard.press('Escape'); await noOv();
    const cl = await page.evaluate(() => ({ rest: window.MorningLaps.restT.end, restEl: !!document.getElementById('rest'), row: (document.querySelector('[data-row="draft"]') || {}).textContent || '', ci: !!document.getElementById('checkin') }));
    check('F Escape closes an open exercise menu first, then the sheet', same(esc1, [false, true]));
    check('F closing the sheet stops the rest timer and keeps the draft, shown as one row', cl.rest === 0 && !cl.restEl && cl.row.includes('Full Body A') && cl.row.includes('Draft · not saved yet') && !cl.ci && (await ses(page, WED)) === null, JSON.stringify(cl));
    await tap('[data-row="draft"]'); await page.waitForSelector('#liftSheet');
    check('F the draft row opens the sheet with what was typed', await val(page, '#r-squat-0') === '9' && await val(page, '#w-squat') === '155' && (await txt(page, '#statusLine')).includes('Draft'));
    // Go live from the head; Resume while a live session is in progress
    await tap('#wmStart'); await page.waitForSelector('#wm:not([hidden])'); await waitView('main');
    check('F "Go live" in the head starts live mode on the same draft and closes the sheet', (await txt(page, '#wmName')) === 'Barbell back squat' && same(await page.$$eval('#wmPips .wm-pip', els => els.map(p => p.className.includes(' on') ? p.textContent : '-')), ['9', '-', '-']) && (await page.evaluate(() => !document.getElementById('liftSheet') && window.MorningLaps.restT.end === 0)));
    await page.click('#wmLog'); if (await wmv() === 'rest') { await page.click('#wmRestSkip'); await waitView('main'); }
    await page.click('[data-a="wm-quit"]'); await page.click('#wmQuitKeep'); await page.waitForSelector('#wm', { state: 'hidden' });
    check('F a live session in progress shows on the Today card with "Resume workout"', (await txt(page, '#wmGoing')).includes('Workout in progress') && (await txt(page, '#wmResume')) === 'Resume workout');
    await tap('[data-row="draft"]'); await page.waitForSelector('#liftSheet');
    check('F and the sheet head offers "Resume workout", with the live sets in the form', (await txt(page, '#wmStart')) === 'Resume workout' && await val(page, '#r-squat-1') === '9');
    await ctx.close();
    // a recovered draft shows inside the sheet, as the banner did
    const dr = { '2026-12-09': { kindSel: null, tm: { minutes: '', title: '' }, notes: '', ex: { squat: { w: '150', reps: ['8', '', ''] } }, swaps: {}, extra: {}, countAs: null, closed: {}, created: Date.parse('2026-12-09T15:00:00Z'), updatedAt: Date.parse('2026-12-09T15:00:00Z'), recovered: false, fromRecord: false } };
    await open({ me: 'tyson', init: local(seedDocs({ drafts: dr })) });
    check('F a draft left on this phone is one row on the Today card', ((await page.evaluate(() => (document.querySelector('[data-row="draft"]') || {}).textContent)) || '').includes('Recovered draft · not saved yet'));
    await tap('[data-row="draft"]'); await page.waitForSelector('#liftSheet');
    check('F the recovered-draft banner shows inside the sheet, with Discard', (await txt(page, '#liftSheet .banner')).includes('Unsaved draft from') && (await has(page, '#discardDraft')) && await val(page, '#w-squat') === '150');
    await page.click('#discardDraft'); await page.waitForFunction(() => document.getElementById('w-squat').value === '');
    check('F Discard empties the form in place', (await ovType()) === 'lift' && await val(page, '#r-squat-0') === '');
  });

  // ---------- 2: one Add sheet for everything ----------
  await section('A', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    await watchWrites(page);
    await tap('#addBtn'); await page.waitForSelector('#addGrid');
    const add = await page.evaluate(() => { const g = id => { const e = document.getElementById(id), r = e.getBoundingClientRect(); return [e.querySelector('.tr-t b').textContent, e.querySelector('.tr-t .tiny').textContent, Math.round(r.width), Math.round(r.height)]; }; return { head: document.querySelector('#ov .ov-head h2').textContent, sub: document.querySelector('#ov .ov-head .tiny').textContent, c: ['addLift', 'addCardio', 'addRecovery', 'addMore'].map(g), n: document.querySelectorAll('#addGrid .addc').length, rest: (document.getElementById('addRest') || {}).textContent, health: !!document.querySelector('#ov [data-a="health"]'), fits: document.querySelector('#ov .ov').scrollHeight <= document.querySelector('#ov .ov').clientHeight + 1 }; });
    check('A "Add to today" opens one sheet with four big choices', add.head === 'Add to today' && add.n === 4 && same(add.c.map(x => x[0]), ['Lift', 'Cardio', 'Recovery', 'Something else']) && add.c.every(x => x[2] >= 160 && x[3] >= 84) && add.fits, JSON.stringify(add));
    check('A Lift names the next day, Cardio and Recovery say what is in them, and the sheet says which mode is on', add.c[0][1] === 'Full Body A next' && add.c[1][1].includes('Track') && add.c[1][1].includes('lap swim') && add.c[2][1].includes('sauna') && add.c[3][1].includes('classes') && add.sub.startsWith('Log it is on'), JSON.stringify(add));
    check('A a rest day and the Apple Health import are in the sheet too', add.rest === 'Log a rest day' && add.health);
    // Cardio: the same picker as the Log it cardio sheet
    await tap('#addCardio'); await page.waitForSelector('#cilogSave');
    const cs = await page.evaluate(() => ({ opts: Array.from(document.querySelectorAll('#cilogOpts0 button')).map(b => b.textContent + (b.classList.contains('on') ? '*' : '')), min: document.getElementById('cilogMin0').value, laps: !!document.getElementById('cilogLaps0'), head: document.querySelector('#ov .ov-head h2').textContent }));
    check('A Cardio is the Log it cardio sheet: track, track run/walk, treadmill, bike, elliptical, lap swim, minutes and laps', same(cs.opts, ['Track walk*', 'Track run/walk', 'Treadmill (Fitness+)', 'Bike', 'Elliptical', 'Lap swim']) && cs.min === '25' && cs.laps && cs.head === 'Cardio', JSON.stringify(cs));
    await page.click('#cilogOpts0 [data-v="hpswim"]');
    check('A (the pool asks for lengths)', (await txt(page, '[data-part="0"] label:nth-child(2)')).startsWith('Lengths (25 yards each)'));
    await page.click('[data-a="cilog-back"]'); await page.waitForSelector('#addGrid');
    check('A Back returns to the four choices', (await ovType()) === 'add');
    // Recovery: the same as the Log it recovery sheet
    await tap('#addRecovery'); await page.waitForSelector('#cilogHeat');
    const rs = await page.evaluate(() => ({ part: document.querySelector('[data-part="0"] .eyebrow').textContent, min: document.getElementById('cilogMin0').value, rooms: Array.from(document.querySelectorAll('#cilogHeat .seg button')).map(b => b.textContent), note: document.getElementById('cilogHeat').textContent }));
    check('A Recovery is the Log it recovery sheet: stretch, plus sauna, steam or whirlpool', rs.part === 'Stretch' && rs.min === '10' && same(rs.rooms, ['Dry sauna', 'Steam room', 'Whirlpool']) && rs.note.includes('Keep it to 10–15 minutes'), JSON.stringify(rs));
    await page.click('[data-a="cilog-back"]'); await page.waitForSelector('#addGrid');
    // Something else: search, recent and favorites, categories, Show all
    await tap('#addMore'); await page.waitForSelector('#moreList');
    const mo = await page.evaluate(() => { const L = document.getElementById('moreList'), kids = Array.from(L.children).map(e => e.id || e.className); return { q: document.getElementById('moreQ').getBoundingClientRect().top < L.getBoundingClientRect().top, kids, quick: document.querySelectorAll('#moreQuick > *').length, cats: Array.from(document.querySelectorAll('#moreCats button')).map(b => b.textContent), all: (document.getElementById('moreAll') || {}).textContent, grid: document.querySelectorAll('#moreList .acts .act').length, classesShown: document.querySelectorAll('#moreQuick [data-tag]').length, surprise: !!document.querySelector('#ov [data-a="surprise"]') }; });
    check('A Something else has search at the top, then Recent and Favorites (6 items), then categories and "Show all"', mo.q && same(mo.kids, ['eyebrow', 'moreQuick', 'eyebrow', 'moreCats', 'row']) && mo.quick === 6 && same(mo.cats, ['Healthplex', 'Walks', 'Stretch', 'Easy cardio', 'Light strength', 'Mind & body', 'Everyday']) && mo.all === 'Show all' && mo.grid === 6 && mo.classesShown === 0 && mo.surprise, JSON.stringify(mo));
    await fill(page, '#moreQ', 'yoga'); await page.waitForSelector('#moreHits');
    const hits = await page.$$eval('#moreHits .an', els => els.map(e => e.textContent));
    check('A search finds activities by name, and keeps the cursor in the field', hits.includes('Chair yoga') && hits.includes('Yoga class') && hits.every(h => /yoga/i.test(h)) && (await page.evaluate(() => document.activeElement.id)) === 'moreQ', JSON.stringify(hits));
    await fill(page, '#moreQ', ''); await page.waitForSelector('#moreAll'); await tap('#moreAll'); await page.waitForSelector('#moreList .acts .act.hp');
    const full = await page.evaluate(() => ({ n: document.querySelectorAll('#moreList .acts > *').length, tags: Array.from(document.querySelectorAll('#moreList .act.hp [data-tag]')).map(e => e.textContent), filters: document.querySelectorAll('#moreList .chips button').length }));
    check('A "Show all" expands the full menu, with classes still tagged "Optional · may cost extra"', full.n === 54 && full.tags.length === 8 && full.tags.filter(x => x === 'Optional · may cost extra, check your membership.').length === 7 && full.tags.includes('Specialty class · extra fee.') && full.filters >= 9, JSON.stringify([full.n, full.tags.length, full.filters]));
    check('A showing all these sheets wrote nothing', (await writes(page)).length === 0 && (await ses(page, WED)) === null);
    await page.click('.act[data-k="walkeasy"]'); await page.waitForSelector('#actLog'); await fill(page, '#actMin', 20); await tap('#actLog'); await savedAct('tyson', 1);
    check('A logging from it closes the sheet and returns to Today with the new row highlighted', same(await rows(), ['Easy walk | 20 min']) && (await page.evaluate(() => document.querySelector('#todayRows .trow').classList.contains('new') && !window.MorningLaps.state.ov && scrollY === 0)) && (await page.evaluate(() => !document.getElementById('checkin'))));
    await page.clock.fastForward(1500); await tap('#addBtn'); await page.waitForSelector('#addGrid');
    check('A once something is logged the sheet no longer offers a rest day', !(await has(page, '#addRest')));
    await ctx.close();

    // Go live is selected: Lift, Cardio and Recovery start live mode instead of a sheet
    await open({ me: 'tyson', init: local(seedDocs({ tProfile: { trainMode: 'live' } })) });
    check('A the switch shows Go live', same(await page.$$eval('#modeSwitch button', els => els.map(e => e.textContent + ':' + e.getAttribute('aria-pressed'))), ['Log it:false', 'Go live:true']));
    await tap('#addBtn'); await page.waitForSelector('#addGrid');
    check('A the Add sheet says Go live is on', (await txt(page, '#ov .ov-head .tiny')).startsWith('Go live is on'));
    await tap('#addLift'); await page.waitForSelector('#wm:not([hidden])'); await waitView('main');
    const l1 = await page.evaluate(() => ({ kind: window.MorningLaps.wmState().plan.kind, day: window.MorningLaps.wmState().plan.day, ov: !!window.MorningLaps.state.ov, sheet: !!document.getElementById('liftSheet') }));
    check('A with Go live on, Lift starts a live lift instead of the sheet', l1.kind === 'lift' && l1.day === 'fba' && !l1.ov && !l1.sheet, JSON.stringify(l1));
    await page.click('[data-a="wm-quit"]'); await page.click('#wmQuitKeep'); await page.waitForSelector('#wm', { state: 'hidden' });
    await tap('#addBtn'); await page.waitForSelector('#addGrid'); await tap('#addCardio'); await page.waitForSelector('#addCardioList');
    check('A Cardio asks which one, in the same sheet', same(await page.$$eval('#addCardioList .fn', els => els.map(e => e.textContent)), ['Track walk', 'Track run/walk', 'Treadmill (Fitness+)', 'Bike', 'Elliptical', 'Lap swim']) && (await ovType()) === 'add');
    await page.click('[data-a="add-cardio-live"][data-k="hptrack"]'); await page.waitForSelector('#wm:not([hidden])'); await waitView('main');
    const l2 = await page.evaluate(() => { const w = window.MorningLaps.wmState(); return { kind: w.plan.kind, stages: w.plan.stages.map(s => s.type + ':' + s.act), felt: w.plan.felt, lap: !!document.getElementById('wmLap') }; });
    check('A then starts the live session: a track walk counts laps', l2.kind === 'stages' && same(l2.stages, ['laps:hptrack']) && l2.felt === null && l2.lap, JSON.stringify(l2));
    for (let i = 0; i < 8; i++) await page.click('#wmLap'); await page.clock.fastForward(12 * 60000); await page.click('#wmFinish'); await waitView('finish'); await page.click('#wmSave'); await page.waitForSelector('#wmDoneBtn');
    check('A the live finish screen still offers the sauna, steam or whirlpool', (await txt(page, '#wmHeat')).includes('Sauna, steam or whirlpool after?'));
    await page.click('#wmDoneBtn'); await page.waitForSelector('#wm', { state: 'hidden' });
    const lr = await ses(page, WED);
    check('A a finished live walk comes back to Today as a row, saved with no check-in', lr.kind === 'activity' && lr.acts[0].a === 'hptrack' && lr.acts[0].min === 12 && lr.acts[0].note === '8 laps (1.0 mi)' && !lr.checkin && same(await rows(), ['Track walk | 12 min · 1.0 mi']), JSON.stringify([lr.acts, await rows()]));
    await tap('#addBtn'); await page.waitForSelector('#addGrid'); await tap('#addRecovery'); await page.waitForSelector('#wm:not([hidden])'); await waitView('main');
    const l3 = await page.evaluate(() => window.MorningLaps.wmState().plan.stages.map(s => s.type));
    check('A Recovery starts the live recovery session: easy walk, stretch, then a room', same(l3, ['laps', 'stretch', 'heat']), JSON.stringify(l3));
    await page.click('[data-a="wm-quit"]'); await page.click('#wmQuitKeep'); await page.waitForSelector('#wm', { state: 'hidden' });
    await tap('#addBtn'); await page.waitForSelector('#addGrid'); await tap('#addMore'); await page.waitForSelector('#moreList');
    check('A Something else stays a sheet in either mode', (await ovType()) === 'more');
  });

  // ---------- 4: Jacquie's Train ----------
  await section('J', async () => {
    await open({ me: 'jacquie', init: local(seedDocs()) });
    await tap('#addBtn'); await page.waitForSelector('#addGrid');
    const add = await page.evaluate(() => ['addLift', 'addCardio', 'addRecovery', 'addMore'].map(id => document.getElementById(id).querySelector('.tr-t b').textContent + ' / ' + document.getElementById(id).querySelector('.tr-t .tiny').textContent));
    check('J her Add sheet is the same, with "Machine circuit" in place of Lift', add[0] === 'Machine circuit / Logged as minutes' && add[1].startsWith('Cardio') && add[2].startsWith('Recovery') && add[3].startsWith('Something else'), JSON.stringify(add));
    await tap('#addLift'); await page.waitForSelector('#actLog');
    const mc = await page.evaluate(() => ({ head: document.querySelector('#ov .ov-head h2').textContent, min: document.getElementById('actMin').value, type: window.MorningLaps.state.ov.type, k: window.MorningLaps.state.ov.k }));
    check('J Machine circuit is logged as minutes, as before', mc.type === 'act' && mc.k === 'hpcircuit' && mc.min === '15' && mc.head.includes('Light machine circuit'), JSON.stringify(mc));
    await tap('#actLog'); await savedAct('jacquie', 1);
    await page.clock.fastForward(1500); await tap('#addBtn'); await tap('#addCardio'); await page.waitForSelector('#cilogSave');
    const jc = await page.$$eval('#cilogOpts0 button', els => els.map(b => b.textContent + (b.classList.contains('on') ? '*' : '')));
    check('J her Cardio picker has the same kinds, in their gentle versions', same(jc, ['Track walk*', 'Track run/walk', 'Treadmill walk', 'Bike', 'Elliptical', 'Lap swim']), JSON.stringify(jc));
    await fill(page, '#cilogLaps0', 8); await fill(page, '#cilogMin0', 20); await tap('#cilogSave'); await savedAct('jacquie', 2);
    const jr = await rows(), jh = await pageH(), rec = await kv(page, 'profiles/jacquie/sessions/' + WED);
    check('J two activities are two rows, and her Train is no taller than 1,300 px: ' + jh, same(jr, ['Light machine circuit | 15 min', 'Track walk | 20 min · 1.0 mi']) && jh <= 1300 && (await inView('#addBtn')) && rec.acts.length === 2 && !rec.checkin, JSON.stringify([jr, jh]));
    check('J the day line says what it counts as', (await txt(page, '#dayLine')) === '35 min logged · counts as an active day');
    check('J nothing else is on her Train: no grid, no week card', (await page.evaluate(() => document.querySelectorAll('#main .acts, #main .weekdots, #main .datebar').length === 0 && Array.from(document.getElementById('main').children).filter(e => !e.classList.contains('banner')).map(e => e.id || e.className).join(',') === 'subnav,today,coach')));
    await ctx.close();
    await open({ me: 'jacquie', init: local(seedDocs({ jGym: '' })) }); // not at the Healthplex
    await tap('#addBtn'); await tap('#addLift'); await page.waitForSelector('#actLog');
    check('J with another gym, Machine circuit is the general light machine circuit', (await page.evaluate(() => window.MorningLaps.state.ov.k)) === 'machines' && await val(page, '#actMin') === '20');
    await page.click('[data-a="ov-close"]'); await tap('#addBtn'); await tap('#addRest'); await page.waitForFunction(d => !!(JSON.parse(localStorage.getItem('ml.kv') || '{}'))['profiles/jacquie/sessions/' + d] && !window.MorningLaps.state.ov, WED);
    check('J a rest day from the Add sheet is one row', same(await rows(), ['Rest day | Doesn\'t count as activity']) && (await txt(page, '#dayLine')) === 'Rest day logged');
    await tap('[data-row="prog"]'); await page.waitForSelector('#restRemove'); await tap('#restRemove'); await page.waitForFunction(d => !(JSON.parse(localStorage.getItem('ml.kv') || '{}'))['profiles/jacquie/sessions/' + d] && !window.MorningLaps.state.ov, WED);
    check('J tapping the rest row offers to remove it, with Undo', (await page.evaluate(() => !document.getElementById('todayRows'))) && (await txt(page, '#toast')).includes('Undo'));
  });

  // ---------- past days ----------
  await section('D', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    await watchWrites(page);
    await tap('#dateChip'); await page.waitForSelector('#ov .datebar');
    const ds = await page.evaluate(() => ({ type: window.MorningLaps.state.ov.type, days: Array.from(document.querySelectorAll('#ov .datebar [data-date]')).map(b => b.dataset.date), sel: document.querySelector('#ov .datebar .sel').dataset.date, pick: document.getElementById('datePick').value, max: document.getElementById('datePick').max, small: document.querySelector('#ov .ov').getBoundingClientRect().height < 320, onPage: document.querySelectorAll('#main .datebar, #main #datePick').length }));
    check('D the date chip opens a small sheet with the 7-day strip and the date picker', ds.type === 'day' && ds.days.length === 7 && ds.days[0] === '2026-12-03' && ds.days[6] === WED && ds.sel === WED && ds.pick === WED && ds.max === WED && ds.small && ds.onPage === 0, JSON.stringify(ds));
    await page.click('#ov .datebar [data-date="' + FRI + '"]'); await noOv();
    const fr = await page.evaluate(() => ({ title: document.getElementById('todayTitle').textContent, add: document.getElementById('addBtn').textContent, ci: !!document.getElementById('checkin'), sw: !!document.getElementById('modeSwitch'), focus: document.activeElement.id }));
    check('D picking a past day switches the card: its title is the date, and there is no check-in', fr.title === 'Fri Dec 4' && fr.add === 'Add to Fri Dec 4' && !fr.ci && fr.sw && fr.focus === 'dateChip', JSON.stringify(fr));
    check('D the card shows that day\'s rows', same(await rows(), ['Legs | 3 lifts · 9 sets · lift day']), JSON.stringify(await rows()));
    check('D switching days wrote nothing', (await writes(page)).length === 0);
    const before = await ses(page, FRI), today0 = await ses(page, WED);
    await tap('#addBtn'); await page.waitForSelector('#addGrid');
    check('D the Add sheet is for that day', (await txt(page, '#ov .ov-head h2')) === 'Add to Fri Dec 4' && (await txt(page, '#addLift')).includes('Open the saved Legs'), await txt(page, '#addLift'));
    await tap('#addCardio'); await page.waitForSelector('#cilogSave'); await fill(page, '#cilogLaps0', 8); await fill(page, '#cilogMin0', 15); await tap('#cilogSave');
    await page.waitForFunction(d => { const r = (JSON.parse(localStorage.getItem('ml.sessions') || '{}'))[d]; return r && (r.acts || []).length === 1 && !window.MorningLaps.state.ov; }, FRI);
    const fri = await ses(page, FRI);
    check('D "Add to Fri Dec 4" logs to that day and leaves the lift there as it was', fri.kind === 'strength' && same(fri.ex, before.ex) && fri.acts.length === 1 && fri.acts[0].a === 'hptrack' && fri.acts[0].min === 15 && same(await ses(page, WED), today0) && same(await rows(), ['Legs | 3 lifts · 9 sets · lift day', 'Track walk | 15 min · 1.0 mi']), JSON.stringify([fri.acts, await rows()]));
    await tap('[data-row="prog"]'); await page.waitForSelector('#liftSheet');
    check('D a past lift opens in the sheet with its sets, dated', (await txt(page, '#liftDate')).includes('Fri Dec 4') && (await txt(page, '#liftTitle')) === 'Legs' && await val(page, '#w-squat') === '145' && await val(page, '#r-squat-2') === '10' && (await txt(page, '#saveBtn')).startsWith('Update'));
    await fill(page, '#r-squat-0', 9); await blur();
    check('D a set typed for a past day starts no rest timer', (await page.evaluate(() => window.MorningLaps.restT.end === 0 && document.getElementById('rest').hidden)));
    await page.click('#liftClose'); await noOv();
    // any earlier date through the picker, and back to today
    await tap('#dateChip'); await page.waitForSelector('#datePick'); await fill(page, '#datePick', '2026-11-18'); await noOv(); // filling a date field fires its change event
    check('D the date picker reaches any earlier day', (await txt(page, '#todayTitle')) === 'Wed Nov 18' && same(await rows(), ['Pull | 3 lifts · 9 sets · lift day']), JSON.stringify(await rows()));
    await tap('#dateChip'); await page.waitForSelector('#dayToday'); await tap('#dayToday'); await noOv();
    check('D "Back to today" returns to today, with the check-in', (await txt(page, '#todayTitle')) === 'Today' && (await has(page, '#checkin')));
    await ctx.close();
    // History's Edit opens the day's entry in the sheet
    await open({ me: 'tyson', init: local(seedDocs()) });
    await go(page, 'history'); await page.click('details[data-hdate="' + FRI + '"] summary'); await page.click('[data-edit="' + FRI + '"]'); await page.waitForSelector('#liftSheet');
    check('D History\'s Edit opens that day\'s lift in the sheet, on Train', (await txt(page, '#liftDate')).includes('Fri Dec 4') && (await txt(page, '#todayTitle')) === 'Fri Dec 4' && (await page.evaluate(() => window.MorningLaps.state.tab)) === 'train');
  });

  // ---------- records are the same as version 17's ----------
  await section('R', async () => {
    const run = async (name, me, fn, opts) => {
      await open({ me, init: local(seedDocs()) });
      try { await fn(); await page.waitForTimeout(300); const got = strip(await recOf(me)); check('R ' + name + ': the record saved through the new sheets is identical to version 17\'s', same(got, GOLD[name]), JSON.stringify(got) + ' vs ' + JSON.stringify(GOLD[name])); }
      catch (e) { check('R ' + name + ' ran', false, String(e.message).split('\n')[0]); }
      await ctx.close();
    };
    const closed = () => noOv();
    await run('lift.checkin', 'tyson', async () => { await pick('strong'); await page.click('#ciLog'); await page.waitForSelector('#liftSheet'); await typeLift(); await saveLift(); });
    await run('lift.plain', 'tyson', async () => { await page.click('#addBtn'); await page.click('#addLift'); await page.waitForSelector('#liftSheet'); await typeLift(); await saveLift(); });
    await run('cardio.checkin', 'tyson', async () => { await pick('tired'); await page.click('#ciLog'); await fill(page, '#cilogLaps0', 16); await fill(page, '#cilogMin0', 32); await page.click('#cilogSave'); await closed(); });
    await run('cardio.plain', 'tyson', async () => { await page.click('#addBtn'); await page.click('#addCardio'); await fill(page, '#cilogLaps0', 16); await fill(page, '#cilogMin0', 32); await page.click('#cilogSave'); await closed(); });
    await run('swim.checkin', 'tyson', async () => { await pick('tired'); await page.click('#ciLog'); await page.click('#cilogOpts0 [data-v="hpswim"]'); await fill(page, '#cilogLaps0', 8); await fill(page, '#cilogMin0', 20); await page.click('#cilogSave'); await closed(); });
    await run('treadmill.checkin', 'tyson', async () => { await pick('tired'); await page.click('#ciLog'); await page.click('#cilogOpts0 [data-v="treadmill"]'); await fill(page, '#cilogMin0', 22); await page.click('#cilogSave'); await page.waitForFunction(d => { const r = (JSON.parse(localStorage.getItem('ml.sessions') || '{}'))[d]; return r && r.kind === 'cardio'; }, WED); });
    await run('treadmill.plain', 'tyson', async () => { await page.click('#addBtn'); await page.click('#addCardio'); await page.click('#cilogOpts0 [data-v="treadmill"]'); await fill(page, '#cilogMin0', 22); await page.click('#cilogSave'); await page.waitForFunction(d => { const r = (JSON.parse(localStorage.getItem('ml.sessions') || '{}'))[d]; return r && r.kind === 'cardio'; }, WED); });
    await run('recovery.checkin', 'tyson', async () => { await pick('sore'); await page.click('#ciLog'); await fill(page, '#cilogHeatMin', 12); await page.click('#cilogSave'); await closed(); });
    await run('recovery.plain', 'tyson', async () => { await page.click('#addBtn'); await page.click('#addRecovery'); await fill(page, '#cilogHeatMin', 12); await page.click('#cilogSave'); await closed(); });
    await run('rest.plain', 'tyson', async () => { await page.click('#addBtn'); await page.click('#addRest'); await page.waitForFunction(d => { const r = (JSON.parse(localStorage.getItem('ml.sessions') || '{}'))[d]; return r && r.kind === 'rest'; }, WED); });
    await run('rest.checkin', 'tyson', async () => { await pick('rest'); await page.click('#ciRest'); await page.waitForFunction(d => { const r = (JSON.parse(localStorage.getItem('ml.sessions') || '{}'))[d]; return r && r.kind === 'rest'; }, WED); });
    await run('j.circuit', 'jacquie', async () => { await page.click('#addBtn'); await page.click('#addLift'); await page.click('#actLog'); await closed(); });
    await run('j.walk', 'jacquie', async () => { await page.click('#addBtn'); await page.click('#addMore'); await page.click('#moreAll'); await page.click('.act[data-k="walkeasy"]'); await fill(page, '#actMin', 20); await page.click('[data-a="act-feel"][data-v="good"]'); await fill(page, '[data-ovf="note"]', 'around the block'); await page.click('#actLog'); await closed(); });
    await run('j.good.checkin', 'jacquie', async () => { await pick('good'); await page.click('#ciLog'); await fill(page, '#cilogLaps0', 6); await page.click('#cilogSave'); await closed(); });
    await run('j.sore.checkin', 'jacquie', async () => { await pick('sore'); await page.click('#ciLog'); await fill(page, '#cilogMin0', 8); await page.click('#cilogHeat [data-k="hpwhirl"]'); await fill(page, '#cilogHeatMin', 10); await page.click('#cilogSave'); await closed(); });
    await run('j.rest.plain', 'jacquie', async () => { await page.click('#addBtn'); await page.click('#addRest'); await page.waitForFunction(d => !!(JSON.parse(localStorage.getItem('ml.kv') || '{}'))['profiles/jacquie/sessions/' + d], WED); });
    await run('j.rest.checkin', 'jacquie', async () => { await pick('rest'); await page.click('#ciRest'); await page.waitForFunction(d => !!(JSON.parse(localStorage.getItem('ml.kv') || '{}'))['profiles/jacquie/sessions/' + d], WED); });
    check('R all ' + Object.keys(GOLD).length + ' version 17 inputs were compared', Object.keys(GOLD).length === 17 && results.filter(r => /^R .*identical to version 17/.test(r.name)).length === 17);
  });

  // ---------- animations stay Subtle; Off stays off ----------
  await section('M', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    await page.evaluate(() => { window.__names = []; document.addEventListener('animationstart', e => window.__names.push(e.animationName + ':' + parseFloat(getComputedStyle(e.target).animationDuration)), true); });
    await page.click('#addBtn'); await page.click('#addCardio'); await fill(page, '#cilogMin0', 20); await page.click('#cilogSave'); await savedAct('tyson', 1);
    await page.click('#dateChip'); await page.click('#ov [data-a="ov-close"]'); await page.click('#addBtn'); await page.click('#addLift'); await page.waitForSelector('#liftSheet'); await page.click('#liftClose'); await noOv();
    const names = await page.evaluate(() => Array.from(new Set(window.__names)));
    check('M Subtle: only 150 to 250 ms fades and slides ran, and no particles', names.every(n => { const [nm, d] = n.split(':'); return ['rowIn', 'mlFade', 'mlRise', 'ciFade', 'sweepGo', 'sweepTick', 'pipFill'].includes(nm) && (nm.startsWith('sweep') || (Number(d) >= 0.15 && Number(d) <= 0.25)); }) && names.some(n => n.startsWith('rowIn')) && (await fxn()).burst === 0, JSON.stringify(names));
    await ctx.close();
    await open({ me: 'tyson', init: local(seedDocs({ tProfile: { motion: 'off' } })) });
    await page.evaluate(() => { window.__names = []; document.addEventListener('animationstart', e => window.__names.push(e.animationName), true); });
    await page.click('#addBtn'); await page.click('#addCardio'); await fill(page, '#cilogMin0', 20); await page.click('#cilogSave'); await savedAct('tyson', 1);
    check('M Off: the new row appears with no animation at all', (await page.evaluate(() => window.__names.length === 0 && getComputedStyle(document.querySelector('#todayRows .trow')).animationName === 'none')) && same(await rows(), ['Track walk | 20 min']));
    check('M window.MorningLaps is still exported', await ML(page, () => { const M = window.MorningLaps; return ['state', 'weekScore', 'compWeeks', 'suggest', 'weekGoals', 'backupDocs', 'caps', 'checkinSuggest', 'wmState', 'motionOf', 'modeOf', 'plannedFor', 'restT', 'liftOpen'].every(k => k in M); }));
  });

  // ---------- smoke: every tab, sheet and live-mode screen, both profiles, 390 px ----------
  await section('G', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    await switchTo(page, 'jacquie'); await page.waitForTimeout(300); await switchTo(page, 'tyson'); await page.waitForTimeout(700);
    await watchWrites(page);
    const bad = [], wide = [], screens = [];
    const junk = t => /undefined|NaN|\[object/.test(t);
    const fit = async name => { const o = await page.evaluate(() => { const w = document.getElementById('wm'), b = w.querySelector('.wm-body'); return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, w.scrollWidth - w.clientWidth, b ? b.scrollWidth - b.clientWidth : 0); }); screens.push(name); if (o > 0) wide.push(name + ':' + o); if (junk(await txt(page, '#wm'))) bad.push('wm:' + name); };
    const sheet = async name => { const o = await page.evaluate(() => { const v = document.querySelector('#ov .ov'), b = document.querySelector('#ov .ls-body'); return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, v ? v.scrollWidth - v.clientWidth : 0, b ? b.scrollWidth - b.clientWidth : 0); }); screens.push(name); if (o > 0) wide.push(name + ':' + o); if (junk(await txt(page, '#ov'))) bad.push('sheet:' + name); };
    const shut = async () => { await page.evaluate(() => { const b = document.querySelector('#ov [data-a="ov-close"]'); if (b) b.click(); }); await noOv(); };
    const leave = async () => { await page.click('[data-a="wm-quit"]'); await fit('quit'); await page.click('#wmQuitKeep'); await page.waitForSelector('#wm', { state: 'hidden' }); };
    const startLive = async () => { await page.click('#ciStart'); await page.waitForSelector('#wm:not([hidden])'); await waitView('main'); };
    for (const who of ['tyson', 'jacquie']) { if (who === 'jacquie') await switchTo(page, 'jacquie');
      for (const tab of ['train', 'program', 'history', 'fuel', 'compete', 'me']) { await go(page, tab); const n = await page.evaluate(() => document.querySelectorAll('#main .card, #main .sheet').length); if (!n || junk(await txt(page, '#main'))) bad.push(who + ':' + tab); if ((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) > 0) wide.push(who + ':' + tab); screens.push(who + ' ' + tab); }
      await go(page, 'train'); await page.click('#coach summary'); await page.click('#coach summary');
      await page.click('#dateChip'); await page.waitForSelector('#ov .datebar'); await sheet(who + ' date sheet'); await shut();
      await page.click('#addBtn'); await page.waitForSelector('#addGrid'); await sheet(who + ' add sheet');
      await page.click('#ov [data-a="health"]'); await page.waitForSelector('#hkText'); await sheet(who + ' health sheet'); await shut();
      await page.click('#addBtn'); await page.click('#addCardio'); await page.waitForSelector('#cilogSave'); await sheet(who + ' cardio sheet'); await page.click('#cilogOpts0 button:last-child'); await sheet(who + ' cardio sheet, pool'); await shut();
      await page.click('#addBtn'); await page.click('#addRecovery'); await page.waitForSelector('#cilogSave'); await sheet(who + ' recovery sheet'); await shut();
      await page.click('#addBtn'); await page.click('#addMore'); await page.waitForSelector('#moreList'); await sheet(who + ' something else'); await fill(page, '#moreQ', 'walk'); await sheet(who + ' search'); await fill(page, '#moreQ', ''); await page.click('#moreAll'); await sheet(who + ' show all');
      await page.click('#moreList .act.hp[data-k="hpswim"]'); await sheet(who + ' healthplex card'); await page.click('#moreList .act[data-k="walkeasy"]'); await page.waitForSelector('#actLog'); await sheet(who + ' activity sheet'); await shut();
      await page.click('#ciExtra'); await page.waitForSelector('#hpExtra'); await sheet(who + ' class or game'); await shut();
      if (who === 'tyson') {
        await page.click('#addBtn'); await page.click('#addLift'); await page.waitForSelector('#liftSheet'); await sheet('lift sheet');
        await page.click('#kindSeg [data-kind="cardio"]'); await sheet('lift sheet, treadmill'); await page.click('#kindSeg [data-kind="rest"]'); await sheet('lift sheet, rest'); await page.click('#kindSeg [data-kind="fba"]');
        await page.click('[data-menu="squat"]'); await sheet('lift sheet, exercise menu'); await page.keyboard.press('Escape'); await page.evaluate(() => { const d = document.querySelector('.ls-body details.sessopts'); d.open = true; }); await sheet('lift sheet, session options');
        await page.evaluate(() => { const st = window.MorningLaps.state; delete st.drafts[st.selDate]; }); await shut();
        await pick('strong'); await startLive(); await fit('warm-up'); await page.click('[data-a="wm-next"]'); await fit('lift'); await page.click('[data-a="wm-swap"]'); await fit('swap'); await page.click('[data-a="wm-swap"]');
        await page.click('#wmFinish'); await waitView('finish'); await fit('lift finish'); await page.click('[data-a="wm-unfinish"]'); await leave();
        await page.evaluate(() => { const st = window.MorningLaps.state; delete st.drafts[st.selDate]; localStorage.removeItem('ml.drafts'); }); await go(page, 'program'); await go(page, 'train');
        for (const [c, o, n] of [['tired', 'hptrack', 'laps'], ['tired', 'hpswim', 'lengths'], ['tired', 'treadmill', 'timer'], ['sore', 'hptrack', 'recovery']]) {
          await pick(c); await page.click('[data-a="ci-opt"][data-v="' + o + '"]'); await page.click('#ciLog'); await page.waitForSelector('#cilogSave'); await sheet('log sheet ' + n); await shut();
          await startLive(); await fit(n);
          if (n === 'recovery') { await page.click('#wmNext'); await fit('stretch'); await page.click('#wmNext'); await fit('heat'); }
          await page.click('#wmFinish'); await waitView('finish'); await fit(n + ' finish'); await page.click('[data-a="wm-unfinish"]'); await leave();
          await page.evaluate(() => localStorage.removeItem('ml.wm')); await go(page, 'program'); await go(page, 'train');
        }
      } else {
        await page.click('#addBtn'); await page.click('#addLift'); await page.waitForSelector('#actLog'); await sheet('her machine circuit'); await shut();
        await pick('good'); await page.click('#ciLog'); await page.waitForSelector('#cilogSave'); await sheet('her log sheet'); await shut();
        await startLive(); await fit('her laps'); await page.click('#wmNext'); await fit('circuit'); await page.click('#wmFinish'); await waitView('finish'); await fit('her finish'); await page.click('[data-a="wm-unfinish"]'); await leave();
        await page.evaluate(() => localStorage.removeItem('ml.wm')); await go(page, 'program'); await go(page, 'train');
        await pick('sore'); await startLive(); await fit('her stretch'); await page.click('#wmNext'); await fit('her heat'); await leave();
      }
    }
    await page.waitForTimeout(400);
    check('G smoke: every tab draws for both profiles, with nothing broken in the text', bad.length === 0, bad.join(' '));
    check('G every sheet and live-mode screen was shown: ' + screens.length, screens.length >= 70 && ['tyson date sheet', 'tyson add sheet', 'tyson health sheet', 'tyson cardio sheet', 'tyson recovery sheet', 'tyson something else', 'tyson show all', 'tyson activity sheet', 'tyson class or game', 'lift sheet', 'lift sheet, treadmill', 'lift sheet, rest', 'lift sheet, exercise menu', 'warm-up', 'lift', 'swap', 'lift finish', 'quit', 'laps', 'lengths', 'timer', 'recovery', 'stretch', 'heat', 'jacquie date sheet', 'jacquie add sheet', 'jacquie something else', 'her machine circuit', 'her log sheet', 'her laps', 'circuit', 'her finish', 'her stretch', 'her heat'].every(s => screens.includes(s)), screens.join(', '));
    check('G at 390 px wide nothing scrolls sideways', wide.length === 0, wide.join(' '));
    check('G showing screens and sheets writes nothing to the log', (await writes(page)).length === 0, JSON.stringify(await writes(page)));
  });
  check('no console errors in any section', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  await browser.close();
  process.exit(finish('version 18 checks') ? 1 : 0);
})();
