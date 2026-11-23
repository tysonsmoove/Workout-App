// The checks for version 17: every session can be logged or done live, calmer animations, and a tidier top of Train.
// Headless browser, browser-only mode, seeded storage: two profiles with six-plus weeks of history, both gyms set to
// the Healthplex, Tyson on Full Body A/B with a deload offer and a goal nudge both active.
// Run: node tests/v17.test.js   (ML_ONLY=L,A runs just those sections)
const { chromium, check, results, T, newPage, val, txt, has, fill, go, score, finish } = require('./helpers');
const kv = (page, path) => page.evaluate(p => (JSON.parse(localStorage.getItem('ml.kv') || '{}'))[p] || null, path);
const ses = (page, d) => page.evaluate(x => (JSON.parse(localStorage.getItem('ml.sessions') || '{}'))[x] || null, d);
const ML = (page, fn, arg) => page.evaluate(fn, arg);
const toastWith = (page, part) => page.waitForFunction(x => { const t = document.getElementById('toast'); return !t.hidden && t.textContent.includes(x) ? t.textContent : false; }, part, { timeout: 5000 }).then(h => h.jsonValue()).catch(() => txt(page, '#toast'));
const settled = page => page.waitForFunction(() => window.MorningLaps.state.ready && !!(JSON.parse(localStorage.getItem('ml.kv') || '{}'))['profiles/jacquie/weekgoals/' + (function () { const s = window.MorningLaps.state.today, d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8))); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); })()]);
const switchTo = async (page, pid) => { await page.click('#whoBtn'); await page.click('[data-a="who-pick"][data-pid="' + pid + '"]'); await page.waitForFunction(p => window.MorningLaps.state.pid === p && document.getElementById('ov').hidden, pid); };
const plus = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const watchWrites = page => page.evaluate(() => { window.__w = []; if (window.__wOn) return; window.__wOn = true; const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k) { if (k === 'ml.kv' || k === 'ml.sessions' || k === 'ml.settings') window.__w.push(k); return set.apply(this, arguments); }; });
const writes = page => page.evaluate(() => window.__w.slice());
const HP = 'Indianapolis Healthplex';

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
// opt.tProfile / opt.jProfile: extra profile fields (motion, trainMode). opt.settings: extra lifting settings.
function seedDocs(opt) {
  opt = opt || {};
  const sessions = {}, kv = {};
  WEEKS.forEach((ws, i) => { const ph = i < 2 ? 1 : i === 2 ? 2 : 3, d = n => plus(ws, n);
    sessions[d(0)] = lift(d(0), 'push', ph, SETS('push', i)); sessions[d(1)] = tread(d(1), ph); sessions[d(2)] = lift(d(2), 'pull', ph, SETS('pull', i)); sessions[d(3)] = tread(d(3), ph);
    sessions[d(4)] = i === 0 ? tread(d(4), ph) : lift(d(4), 'legs', ph, SETS('legs', i)); // the first week had two lifts: five lift weeks are complete, so a deload is on offer
    kv['profiles/jacquie/sessions/' + d(0)] = day(d(0), [act(d(0), 'walkeasy', 'Easy walk', 20)]);
    kv['profiles/jacquie/sessions/' + d(2)] = day(d(2), [act(d(2), 'chairyoga', 'Chair yoga', 20)]);
    kv['profiles/jacquie/sessions/' + d(4)] = day(d(4), [act(d(4), 'walkeasy', 'Easy walk', 20)]);
  });
  kv['profiles/jacquie'] = Object.assign({ name: 'Jacquie', place: HP, placeSince: '2026-11-01', body: { sex: 'f', age: 30, heightIn: 64, weightLb: 150, activity: 'light', pace: 'maintain' } }, opt.jProfile);
  kv['profiles/tyson'] = Object.assign({ name: 'Tyson', place: HP, placeSince: '2026-11-01' }, opt.tProfile);
  kv['comp/settings'] = { start: '2026-10-26', stakes: '' };
  return { sessions, settings: Object.assign({ startDate: '2026-10-26', goal: 5, maxed: {}, swaps: {}, split: 'full' }, opt.settings), kv };
}
const local = (docs, pre) => (pre || '') + 'if(!localStorage.getItem("seeded")){localStorage.setItem("seeded","1");localStorage.setItem("ml.sessions",' + JSON.stringify(JSON.stringify(docs.sessions)) + ');localStorage.setItem("ml.settings",' +
  JSON.stringify(JSON.stringify(docs.settings)) + ');localStorage.setItem("ml.kv",' + JSON.stringify(JSON.stringify(docs.kv)) + ');}';
const at = d => T(d + 'T17:00:00Z');
const TUE = '2026-12-08', WED = '2026-12-09';
const FULLA = [['squat', 3], ['dbbench', 3], ['latpull', 3], ['dbshoulder', 2], ['legcurl', 2], ['legraise', 2]];

(async () => {
  const browser = await chromium.launch();
  let ctx, page; const consoleErrors = [];
  const open = async (opts) => {
    ({ ctx, page } = await newPage(browser, Object.assign({ time: at(WED), width: 390, height: 844 }, opts))); page.on('console', m => { if (m.type() === 'error' && !/favicon/i.test(m.text())) consoleErrors.push(m.text()); });
    await settled(page); await page.clock.fastForward(2500); // past anything announced on opening
    await page.evaluate(() => { const f = window.MorningLaps.state.fxn; f.burst = 0; f.milestone = 0; });
    return page;
  };
  const only = process.env.ML_ONLY ? process.env.ML_ONLY.split(',') : null;
  const section = async (tag, fn) => {
    if (only && !only.includes(tag)) return;
    try { await fn(); } catch (e) {
      let where = ''; try { where = ' [wm: ' + JSON.stringify(await page.evaluate(() => { const w = window.MorningLaps.wmState(); return w ? [w.view, w.plan.kind, w.i, w.si] : null; })) + '; sheet: ' + (await page.evaluate(() => { const o = window.MorningLaps.state.ov; return o ? o.type : ''; })) + '; after: ' + (results.length ? results[results.length - 1].name : 'start') + ']'; } catch (e2) { /* page gone */ }
      check(tag + ' ran to the end', false, String(e && e.message || e).split('\n')[0] + where);
    }
    try { if (ctx) await ctx.close(); } catch (e) { /* already closed */ }
  };
  const wmv = () => page.evaluate(() => { const w = window.MorningLaps.wmState(); return w ? w.view : null; });
  const waitView = v => page.waitForFunction(x => { const w = window.MorningLaps.wmState(); return (w ? w.view : null) === x; }, v);
  const fxn = () => page.evaluate(() => Object.assign({}, window.MorningLaps.state.fxn));
  const opens = () => page.evaluate(() => window.MorningLaps.state.wmOpens || 0);
  const pick = async c => { await page.click('[data-a="ci-pick"][data-v="' + c + '"]'); await page.waitForSelector('#ciPreview'); };
  const live = async () => { await page.click('#ciStart'); await page.waitForSelector('#wm:not([hidden])'); if (await wmv() === 'start') await page.click('#wmStartSeq'); await waitView('main'); };
  const skipRest = async () => { if (await wmv() === 'rest') { await page.click('#wmRestSkip'); await waitView('main'); } };
  const closeRest = () => page.evaluate(() => { const b = document.querySelector('#rest:not([hidden]) [data-a="timer-x"]'); if (b) b.click(); });
  const box = sel => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), w: Math.round(r.width) }; }, sel);

  // ---------- 0: the seed ----------
  await section('S', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    const s = await ML(page, () => { const M = window.MorningLaps, st = M.state; return { ts: Object.keys(st.data.tyson.sessions).length, js: Object.keys(st.data.jacquie.sessions).length, first: Object.keys(st.data.tyson.sessions).sort()[0], hp: [M.atHealthplex('tyson'), M.atHealthplex('jacquie')], split: M.splitOf('tyson'), next: M.nextDayKey('2026-12-09'), dl: M.deloadState(), nudge: !!M.goalNudge('tyson'), jn: !!M.goalNudge('jacquie'), motion: [M.motionOf('tyson'), M.motionOf('jacquie')], mode: [M.modeOf('tyson'), M.modeOf('jacquie')] }; });
    check('S two profiles with six-plus weeks of history, both at the Healthplex', s.ts === 30 && s.js === 18 && s.first === '2026-10-26' && same(s.hp, [true, true]), JSON.stringify(s));
    check('S Tyson on Full Body A/B with a deload offer and a goal nudge both active (Jacquie: a nudge)', s.split === 'full' && s.next === 'fba' && s.dl === 'offer' && s.nudge && s.jn, JSON.stringify(s));
    check('S the defaults: Subtle animations and "Log it" for both', same(s.motion, ['subtle', 'subtle']) && same(s.mode, ['log', 'log']));
  });

  // ---------- 3: the top of Train ----------
  await section('L', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    const lay = async () => page.evaluate(() => { const r = id => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; };
      return { vh: innerHeight, vw: innerWidth, y: scrollY, sw: r('modeSwitch'), ci: r('checkin'), coach: r('coach'), log: r('logHead'), rows: Array.from(document.querySelectorAll('#coach .coachrow')).map(d => [d.id, d.open, Math.round(d.getBoundingClientRect().height), d.querySelector('summary').textContent]), cards: document.querySelectorAll('#checkin .cic').length, banners: document.querySelectorAll('#main > .banner').length }; });
    const t = await lay();
    check('L on a 390 × 844 screen the switch and the whole check-in show without scrolling (Tyson)', t.vw === 390 && t.vh === 844 && t.y === 0 && t.sw[0] >= 0 && t.ci[1] <= 844 && t.sw[1] <= t.ci[0] && t.cards === 5, JSON.stringify(t));
    check('L the check-in comes first, then one Coach card, then "Log your workout"', t.ci[1] <= t.coach[0] && t.coach[1] <= t.log[0] && (await txt(page, '#logHead')) === 'Log your workout' && (await txt(page, '#coach .eyebrow')) === 'Coach');
    check('L the deload offer and the goal nudge are one closed line each', t.rows.length === 2 && t.rows[0][0] === 'deloadBanner' && t.rows[1][0] === 'nudgeCard' && t.rows.every(r => r[1] === false && r[2] <= 44) && t.rows[0][3].startsWith('Deload week on offer') && t.rows[1][3].startsWith('Three full weeks in a row'), JSON.stringify(t.rows));
    check('L nothing sits above the check-in but the switch', !(await has(page, '#main > #deloadBanner')) && (await page.evaluate(() => { const m = document.getElementById('main'), kids = Array.from(m.children).filter(e => !e.classList.contains('banner') && !e.classList.contains('subnav')); return kids[0].id + ',' + kids[1].id + ',' + kids[2].id + ',' + kids[3].id; })) === 'modeSwitch,checkin,coach,logHead');
    await page.click('#nudgeCard summary');
    check('L a tap opens a Coach line, with its buttons', await page.evaluate(() => document.getElementById('nudgeCard').open && !!document.querySelector('#nudgeCard [data-a="nudge-yes"]') && document.querySelector('#nudgeCard [data-a="nudge-yes"]').getBoundingClientRect().height > 0) && (await txt(page, '#nudgeCard')).includes('Raise your goal to 6 days starting Monday?'));
    await page.click('#deloadBanner summary'); await page.click('[data-a="deload-take"]'); await page.waitForFunction(() => document.getElementById('deloadBanner').textContent.includes('Deload week is on'));
    check('L the deload can be taken from its line', (await txt(page, '#deloadBanner summary')).startsWith('Deload week is on'));
    await switchTo(page, 'jacquie'); await page.evaluate(() => window.scrollTo(0, 0));
    const j = await lay();
    check('L the same for Jacquie: switch and whole check-in on the first screen, the nudge below as a Coach line', j.y === 0 && j.sw[0] >= 0 && j.ci[1] <= 844 && j.cards === 4 && j.ci[1] <= j.coach[0] && j.rows.length === 1 && j.rows[0][0] === 'nudgeCard' && j.rows[0][1] === false && j.rows[0][2] <= 44 && !!j.log && j.coach[1] <= j.log[0] && (await txt(page, '#logHead')) === 'Log your workout', JSON.stringify(j));
  });

  // ---------- 1: Log it or go live ----------
  await section('M', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    const sw = () => page.$$eval('#modeSwitch button', els => els.map(e => e.textContent + ':' + e.getAttribute('aria-pressed')));
    check('M the switch at the top of Train: "Log it" and "Go live"', same(await sw(), ['Log it:true', 'Go live:false']));
    await pick('strong');
    const two = async () => page.evaluate(() => { const a = document.getElementById('ciLog'), b = document.getElementById('ciStart'), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return { t: [a.textContent, b.textContent], cls: [a.className, b.className], w: [Math.round(ra.width), Math.round(rb.width)], h: [Math.round(ra.height), Math.round(rb.height)], focus: document.activeElement.id }; });
    const p1 = await two();
    check('M the preview has two equal buttons, "Log it" and "Start live"', same(p1.t, ['Log it', 'Start live']) && Math.abs(p1.w[0] - p1.w[1]) <= 1 && p1.h[0] === p1.h[1] && p1.h[0] >= 44, JSON.stringify(p1));
    check('M with "Log it" picked, "Log it" is the primary button', same(p1.cls, ['primary', 'second']) && p1.focus === 'ciLog');
    await page.click('[data-a="mode-set"][data-v="live"]'); await page.waitForFunction(() => (JSON.parse(localStorage.getItem('ml.kv'))['profiles/tyson'] || {}).trainMode === 'live');
    const p2 = await two();
    check('M with "Go live" picked, "Start live" is the primary button, and the pick is saved on the profile', same(p2.cls, ['second', 'primary']) && same(await sw(), ['Log it:false', 'Go live:true']));
    await page.reload(); await page.waitForSelector('#modeSwitch'); await settled(page);
    check('M the switch remembers the pick after a reload', same(await sw(), ['Log it:false', 'Go live:true']));
    await switchTo(page, 'jacquie');
    check('M each person has their own pick: Jacquie is still on "Log it"', same(await sw(), ['Log it:true', 'Go live:false']) && !(await kv(page, 'profiles/jacquie')).trainMode);
    await page.click('[data-a="mode-set"][data-v="live"]'); await page.waitForFunction(() => (JSON.parse(localStorage.getItem('ml.kv'))['profiles/jacquie'] || {}).trainMode === 'live');
    await page.click('[data-a="mode-set"][data-v="log"]'); await page.waitForFunction(() => (JSON.parse(localStorage.getItem('ml.kv'))['profiles/jacquie'] || {}).trainMode === 'log');
    await page.reload(); await page.waitForSelector('#modeSwitch'); await settled(page);
    check('M and hers is remembered too', same(await sw(), ['Log it:true', 'Go live:false']) && (await kv(page, 'profiles/tyson')).trainMode === 'live');
  });

  await section('F', async () => { // a full lift, logged without going live
    await open({ me: 'tyson', init: local(seedDocs()) });
    check('F the log has a clear header, and its live button is just "Go live"', (await txt(page, '#logHead')) === 'Log your workout' && (await txt(page, '#wmStart')) === 'Go live' && !(await txt(page, '#main')).includes('full screen, one lift at a time') && !(await txt(page, '#main')).includes('Start guided workout'));
    await pick('strong'); await page.click('#ciLog'); await page.waitForSelector('#ciPreview', { state: 'detached' });
    const a = await page.evaluate(() => { const f = document.activeElement, r = f.getBoundingClientRect(), h = document.getElementById('logHead').getBoundingClientRect(); return { focus: f.id, inView: r.top >= 0 && r.bottom <= innerHeight, head: Math.round(h.top), line: document.getElementById('ciDone').textContent, change: document.getElementById('ciChange').textContent, cards: document.querySelectorAll('#checkin .cic').length, jumps: window.MorningLaps.state.logJumps, kind: document.querySelector('#kindSeg .on').textContent, ciH: Math.round(document.getElementById('checkin').getBoundingClientRect().height) }; });
    check('F "Log it" collapses the check-in to one line: "Feeling strong · Full Body A", with Change', a.line === 'Feeling strong · Full Body A' && a.change === 'Change' && a.cards === 0 && a.ciH <= 60, JSON.stringify(a));
    check('F it scrolls to the log with that day selected and puts the cursor in the first weight field', a.focus === 'w-squat' && a.inView && a.head >= 0 && a.head < 200 && a.kind === 'Full Body A' && a.jumps === 1, JSON.stringify(a));
    check('F nothing is saved yet: the choice is only on the draft', (await ses(page, WED)) === null && (await page.evaluate(() => JSON.parse(localStorage.getItem('ml.drafts'))['2026-12-09'].checkin)) === 'strong');
    await fill(page, '#tmMin', 5);
    for (const [k, n] of FULLA) { if (k !== 'legraise') await page.click('[data-usew="' + k + '"]').catch(() => {}); for (let i = 0; i < n; i++) await fill(page, '#r-' + k + '-' + i, 10); }
    await closeRest(); await page.click('h1'); await page.click('#saveBtn');
    await page.waitForFunction(d => { const r = JSON.parse(localStorage.getItem('ml.sessions'))[d]; return r && r.kind === 'strength'; }, WED);
    const rec = await ses(page, WED);
    check('F a full Full Body A is logged without live mode ever opening, after that one jump', rec.day === 'fba' && rec.complete === true && rec.qualifies === true && Object.keys(rec.ex).length === 6 && rec.checkin === 'strong' && (await opens()) === 0 && await page.evaluate(() => document.getElementById('wm').hidden) && (await page.evaluate(() => window.MorningLaps.state.logJumps)) === 1, JSON.stringify([rec.complete, Object.keys(rec.ex).length, await opens()]));
    check('F once the day is logged the check-in stays one line with "Change"', (await txt(page, '#ciDone')) === 'Feeling strong · Full Body A' && (await txt(page, '#ciChange')) === 'Change' && (await page.$$('#checkin .cic')).length === 0);
    await page.click('#ciChange');
    check('F "Change" brings the choices back', (await page.$$('#checkin .cic')).length === 5 && await has(page, '#ciExtra'));
    // a past day shows no check-in and no switch, so the log comes first
    await page.click('.datebar [data-date="' + TUE + '"]'); await page.waitForFunction(() => !document.getElementById('checkin'));
    check('F a past day shows no check-in, so the log comes first', !(await has(page, '#modeSwitch')) && !(await has(page, '#checkin')) && (await box('#logHead')).top < 420, JSON.stringify(await box('#logHead')));
    await ctx.close();
    // short on time: three lifts, the rest under "More lifts"
    await open({ me: 'tyson', init: local(seedDocs()) });
    await pick('short'); await page.click('#ciLog'); await page.waitForSelector('#moreLifts');
    const sh = await page.evaluate(() => ({ line: document.getElementById('ciDone').textContent, main: Array.from(document.querySelectorAll('#logForm > .ex[data-ex]')).map(e => e.dataset.ex), more: Array.from(document.querySelectorAll('#moreLifts .ex[data-ex]')).map(e => e.dataset.ex), sum: document.querySelector('#moreLifts summary').textContent, open: document.getElementById('moreLifts').open, focus: document.activeElement.id }));
    check('F "short on time" shows the first 3 lifts and puts the rest under "More lifts"', sh.line === 'Short on time · Full Body A' && same(sh.main, ['squat', 'dbbench', 'latpull']) && same(sh.more, ['dbshoulder', 'legcurl', 'legraise']) && sh.sum === 'More lifts (3)' && sh.open === false && sh.focus === 'w-squat', JSON.stringify(sh));
    for (const k of ['squat', 'dbbench', 'latpull']) { await page.click('[data-usew="' + k + '"]'); await fill(page, '#r-' + k + '-0', 10); }
    await page.click('#moreLifts summary'); await page.click('[data-usew="legcurl"]'); await fill(page, '#r-legcurl-0', 12); await fill(page, '#r-legcurl-1', 12);
    await closeRest(); await page.click('h1'); await page.click('#saveBtn');
    await page.waitForFunction(d => { const r = JSON.parse(localStorage.getItem('ml.sessions'))[d]; return r && r.kind === 'strength'; }, WED);
    const r2 = await ses(page, WED);
    check('F a set typed under "More lifts" is saved with the rest, exactly as Save does', same(r2.planned, ['squat', 'dbbench', 'latpull', 'legcurl']) && same(r2.ex.legcurl.reps, [12, 12]) && r2.checkin === 'short' && r2.qualifies === true && (await opens()) === 0, JSON.stringify([r2.planned, r2.ex.legcurl]));
    await ctx.close();
    // anything logged today, with no check-in answered, also collapses it
    await open({ me: 'tyson', init: local(seedDocs()) });
    await page.click('#kindSeg [data-kind="cardio"]'); await fill(page, '#tmMin', 20); await page.click('h1'); await page.click('#saveBtn');
    await page.waitForFunction(d => { const r = JSON.parse(localStorage.getItem('ml.sessions'))[d]; return r && r.kind === 'cardio'; }, WED);
    check('F a day logged straight from the log, with no check-in answered, also collapses the check-in to one line', (await txt(page, '#ciDone')) === 'Today is logged · Treadmill' && (await txt(page, '#ciChange')) === 'Change' && (await page.$$('#checkin .cic')).length === 0 && !(await ses(page, WED)).checkin, await txt(page, '#checkin'));
    await ctx.close();
    // the same draft both ways
    await open({ me: 'tyson', init: local(seedDocs()) });
    await pick('strong'); await page.click('#ciLog'); await page.waitForSelector('#w-squat');
    await page.click('[data-usew="squat"]'); await fill(page, '#r-squat-0', 9); await closeRest(); await page.click('h1');
    await page.click('#wmStart'); await page.waitForSelector('#wm:not([hidden])'); await waitView('main');
    check('F sets typed in the log show up in live mode', (await txt(page, '#wmName')) === 'Barbell back squat' && same(await page.$$eval('#wmPips .wm-pip', els => els.map(p => p.className.includes(' on') ? p.textContent : '-')), ['9', '-', '-']) && !(await has(page, '#wmStartSeq')));
    await page.click('#wmLog'); await skipRest(); await page.click('[data-a="wm-quit"]'); await page.click('#wmQuitKeep'); await page.waitForSelector('#wm', { state: 'hidden' });
    check('F and sets logged live show up in the log', await val(page, '#r-squat-0') === '9' && await val(page, '#r-squat-1') === '9' && await val(page, '#w-squat') === '155');
  });

  await section('Q', async () => { // the Log it sheets
    await open({ me: 'tyson', init: local(seedDocs()) });
    await watchWrites(page);
    await pick('tired'); await page.click('#ciLog'); await page.waitForSelector('#cilogSave');
    const sheet = await page.evaluate(() => ({ opts: Array.from(document.querySelectorAll('#cilogOpts0 button')).map(b => b.textContent + (b.classList.contains('on') ? '*' : '')), min: document.getElementById('cilogMin0').value, laps: !!document.getElementById('cilogLaps0'), dist: document.getElementById('cilogDist0').textContent, btn: document.getElementById('cilogSave').textContent, type: window.MorningLaps.state.ov.type }));
    check('Q cardio "Log it" is a quick sheet: activity, minutes, and laps for the track', same(sheet.opts, ['Track walk*', 'Track run/walk', 'Treadmill (Fitness+)', 'Bike', 'Elliptical', 'Lap swim']) && sheet.min === '25' && sheet.laps && sheet.dist === 'Each lap is 1/8 mile.' && sheet.btn === 'Log 25 min' && sheet.type === 'cilog', JSON.stringify(sheet));
    await fill(page, '#cilogLaps0', 16); await fill(page, '#cilogMin0', 32);
    check('Q laps show miles (8 laps = 1 mile), and the button follows the minutes', (await txt(page, '#cilogDist0')) === '16 laps = 2.0 mi' && (await txt(page, '#cilogSave')) === 'Log 32 min' && (await writes(page)).length === 0);
    await page.click('#cilogSave'); await page.waitForSelector('#ov', { state: 'hidden' });
    const c = await ses(page, WED);
    check('Q 16 laps and 32 minutes save a 32-minute track walk with "16 laps (2.0 mi)" in the note', c.kind === 'activity' && c.acts.length === 1 && c.acts[0].a === 'hptrack' && c.acts[0].name === 'Track walk' && c.acts[0].min === 32 && c.acts[0].note === '16 laps (2.0 mi)' && c.checkin === 'tired' && (await opens()) === 0, JSON.stringify(c));
    check('Q then the check-in is one line', (await txt(page, '#ciDone')) === 'Tired, just want to move · Track walk');
    await ctx.close();
    await open({ me: 'tyson', init: local(seedDocs()) });
    await pick('tired'); await page.click('#ciLog'); await page.waitForSelector('#cilogSave'); await page.click('#cilogOpts0 [data-v="hpswim"]');
    check('Q the pool asks for lengths, 25 yards each', (await txt(page, '[data-part="0"] label:nth-child(2)')).startsWith('Lengths (25 yards each)'));
    await fill(page, '#cilogLaps0', 8); await fill(page, '#cilogMin0', 20);
    check('Q (lengths show yards)', (await txt(page, '#cilogDist0')) === '8 lengths = 200 yards');
    await page.click('#cilogSave'); await page.waitForSelector('#ov', { state: 'hidden' });
    const sw = await ses(page, WED);
    check('Q a lap swim saves with lengths and yards in the note', sw.acts[0].a === 'hpswim' && sw.acts[0].min === 20 && sw.acts[0].note === '8 lengths (200 yd)');
    await ctx.close();
    await open({ me: 'tyson', init: local(seedDocs()) });
    await pick('tired'); await page.click('#ciLog'); await page.waitForSelector('#cilogSave'); await page.click('#cilogOpts0 [data-v="treadmill"]');
    check('Q the treadmill has minutes only', !(await has(page, '#cilogLaps0')));
    await fill(page, '#cilogMin0', 22); await page.click('#cilogSave'); await page.waitForFunction(d => { const r = JSON.parse(localStorage.getItem('ml.sessions'))[d]; return r && r.kind === 'cardio'; }, WED);
    const tm = await ses(page, WED);
    check('Q and saves as the lifting log\'s own treadmill day', tm.treadmill.minutes === 22 && tm.checkin === 'tired' && !tm.acts);
    await ctx.close();
    // recovery: stretch, plus an optional room
    await open({ me: 'tyson', init: local(seedDocs()) });
    await pick('sore'); await page.click('#ciLog'); await page.waitForSelector('#cilogSave');
    const rs = await page.evaluate(() => ({ part: document.querySelector('[data-part="0"] .eyebrow').textContent, min: document.getElementById('cilogMin0').value, rooms: Array.from(document.querySelectorAll('#cilogHeat .seg button')).map(b => b.textContent + (b.classList.contains('on') ? '*' : '')), heat: document.getElementById('cilogHeatMin').value, head: document.querySelector('#cilogHeat .eyebrow').textContent }));
    check('Q recovery "Log it" is one sheet: stretch minutes, plus optional sauna, steam or whirlpool minutes', rs.part === 'Stretch' && rs.min === '10' && same(rs.rooms, ['Dry sauna*', 'Steam room', 'Whirlpool']) && rs.heat === '' && rs.head.includes('optional'), JSON.stringify(rs));
    await fill(page, '#cilogHeatMin', 25); await page.click('#cilogSave');
    check('Q more than 20 minutes of heat is refused', (await toastWith(page, '20 minutes or less')).includes('20 minutes') && (await ses(page, WED)) === null);
    await fill(page, '#cilogHeatMin', 12); await page.click('#cilogSave'); await page.waitForSelector('#ov', { state: 'hidden' });
    const r = await ses(page, WED), di = await ML(page, () => { const d = window.MorningLaps.dayInfo('tyson', '2026-12-09'); return [d.minutes, d.active]; });
    check('Q 10 minutes of stretching and 12 of sauna save both', r.acts.length === 2 && r.acts[0].a === 'stretchfull' && r.acts[0].min === 10 && r.acts[0].mv === true && r.acts[1].a === 'hpsauna' && r.acts[1].min === 12 && r.acts[1].mv === false && r.checkin === 'sore', JSON.stringify(r.acts));
    check('Q and only the stretch counts toward active minutes', same(di, [10, true]), JSON.stringify(di));
    await ctx.close();
    // Jacquie: the same sheets, with her activities
    await open({ me: 'jacquie', init: local(seedDocs()) });
    await pick('good'); await page.click('#ciLog'); await page.waitForSelector('#cilogSave');
    const jg = await page.evaluate(() => ({ opts: Array.from(document.querySelectorAll('#cilogOpts0 button')).map(b => b.textContent + (b.classList.contains('on') ? '*' : '')), m0: document.getElementById('cilogMin0').value, p1: document.querySelector('[data-part="1"] .eyebrow').textContent, m1: document.getElementById('cilogMin1').value, btn: document.getElementById('cilogSave').textContent, heat: !!document.getElementById('cilogHeat') }));
    check('Q Jacquie\'s "Feeling good" sheet: track walk or bike, then the machine circuit', same(jg.opts, ['Track walk*', 'Recumbent bike, easy']) && jg.m0 === '10' && jg.p1 === 'Light machine circuit' && jg.m1 === '15' && jg.btn === 'Log 25 min' && !jg.heat, JSON.stringify(jg));
    await fill(page, '#cilogLaps0', 6); await page.click('#cilogSave'); await page.waitForSelector('#ov', { state: 'hidden' });
    const jr = await kv(page, 'profiles/jacquie/sessions/' + WED);
    check('Q it logs one activity with the minutes of both parts', jr.acts.length === 1 && jr.acts[0].min === 25 && jr.acts[0].a === 'hptrack' && jr.acts[0].name === 'Track walk + Light machine circuit' && jr.acts[0].note === 'Track walk 10 min, 6 laps (0.75 mi) · Light machine circuit 15 min' && jr.checkin === 'good' && (await opens()) === 0, JSON.stringify(jr.acts));
    await ctx.close();
    await open({ me: 'jacquie', init: local(seedDocs()) });
    await pick('low'); await page.click('#ciLog'); await page.waitForSelector('#cilogSave');
    check('Q her "Low energy" sheet: therapy pool walk or easy bike, 15 minutes', same(await page.$$eval('#cilogOpts0 button', els => els.map(b => b.textContent)), ['Therapy pool walk', 'Recumbent bike, easy']) && await val(page, '#cilogMin0') === '15');
    await page.click('[data-a="ov-close"]'); await pick('sore'); await page.click('#ciLog'); await page.waitForSelector('#cilogHeat');
    await fill(page, '#cilogMin0', 8); await page.click('#cilogHeat [data-k="hpwhirl"]'); await fill(page, '#cilogHeatMin', 10); await page.click('#cilogSave'); await page.waitForSelector('#ov', { state: 'hidden' });
    const js = await kv(page, 'profiles/jacquie/sessions/' + WED);
    check('Q her recovery sheet saves the stretch and the whirlpool', js.acts.length === 2 && js.acts[0].a === 'stretchfull' && js.acts[0].min === 8 && js.acts[1].a === 'hpwhirl' && js.acts[1].mv === false && js.checkin === 'sore', JSON.stringify(js.acts));
    await page.click('#ciChange'); await pick('rest');
    check('Q rest is unchanged: one "Log rest day" button', (await txt(page, '#ciRest')) === 'Log rest day' && !(await has(page, '#ciLog')) && !(await has(page, '#ciStart')));
  });

  await section('E', async () => { // a live finish screen can be corrected
    await open({ me: 'tyson', init: local(seedDocs()) });
    await pick('tired'); await live();
    for (let i = 0; i < 3; i++) await page.click('#wmLap');
    await page.clock.fastForward(5 * 60000); await page.click('#wmFinish'); await waitView('finish');
    const f = await page.evaluate(() => ({ min: document.querySelector('#wmFin [data-wmf="min"]').value, laps: document.querySelector('#wmFin [data-wmf="laps"]').value, btn: document.getElementById('wmSave').textContent, name: document.querySelector('#wmFin b').textContent }));
    check('E the finish screen of a timed session shows minutes and laps as fields', f.min === '5' && f.laps === '3' && f.btn === 'Log 5 min' && f.name === 'Track walk', JSON.stringify(f));
    await fill(page, '#wmFin [data-wmf="min"]', 30); await fill(page, '#wmFin [data-wmf="laps"]', 16);
    check('E editing them changes what the button will log', (await txt(page, '#wmSave')) === 'Log 30 min' && (await txt(page, '#wmSumNote')) === '16 laps (2.0 mi)');
    await page.click('#wmSave'); await page.waitForSelector('#wmDoneBtn');
    const r = await ses(page, WED);
    check('E editing minutes on a live finish screen changes what gets logged', r.acts[0].min === 30 && r.acts[0].note === '16 laps (2.0 mi)' && r.acts[0].a === 'hptrack' && r.checkin === 'tired', JSON.stringify(r.acts));
    await ctx.close();
    // the pool: lengths can be corrected too
    await open({ me: 'tyson', init: local(seedDocs()) });
    await pick('tired'); await page.click('[data-a="ci-opt"][data-v="hpswim"]'); await live();
    for (let i = 0; i < 2; i++) await page.click('#wmLap');
    await page.clock.fastForward(4 * 60000); await page.click('#wmFinish'); await waitView('finish');
    const pf = await page.evaluate(() => ({ min: document.querySelector('#wmFin [data-wmf="min"]').value, laps: document.querySelector('#wmFin [data-wmf="laps"]').value, label: document.querySelector('#wmFin [data-wmf="laps"]').closest('label').textContent }));
    await fill(page, '#wmFin [data-wmf="min"]', 20); await fill(page, '#wmFin [data-wmf="laps"]', 8);
    await page.click('#wmSave'); await page.waitForSelector('#wmDoneBtn');
    const pr = await ses(page, WED);
    check('E lengths on a swim finish screen can be edited before logging', pf.min === '4' && pf.laps === '2' && pf.label.startsWith('Lengths') && pr.acts[0].a === 'hpswim' && pr.acts[0].min === 20 && pr.acts[0].note === '8 lengths (200 yd)', JSON.stringify([pf, pr.acts]));
    await ctx.close();
    // a forgotten timer: nothing measured, minutes typed
    await open({ me: 'tyson', init: local(seedDocs()) });
    await pick('sore'); await live(); await page.click('#wmFinish'); await waitView('finish');
    check('E with nothing measured the Log button waits', await page.$eval('#wmSave', b => b.disabled) && (await page.$$('#wmFin .wm-finrow')).length === 3);
    await fill(page, '#wmFin [data-i="0"][data-wmf="min"]', 10); await fill(page, '#wmFin [data-i="1"][data-wmf="min"]', 5); await fill(page, '#wmFin [data-i="2"][data-wmf="min"]', 12);
    await page.click('#wmSave'); await page.waitForSelector('#wmDoneBtn');
    const s = await ses(page, WED);
    check('E recovery minutes typed on the finish screen are logged: movement as one activity, the room as recovery', s.acts.length === 2 && s.acts[0].min === 15 && s.acts[0].mv === true && s.acts[1].a === 'hpsauna' && s.acts[1].min === 12 && s.acts[1].mv === false, JSON.stringify(s.acts));
  });

  // ---------- 2: calmer animations ----------
  await section('A', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    check('A Subtle is the default, and the page is keyed to it', (await page.evaluate(() => document.documentElement.dataset.motion)) === 'subtle');
    for (const c of ['tired', 'sore', 'strong']) await pick(c);
    const pv = await page.evaluate(() => { const p = document.getElementById('ciPreview'), c = document.querySelector('#checkin .cic.sel'); return [getComputedStyle(p).animationName, parseFloat(getComputedStyle(p).animationDuration), getComputedStyle(c).animationName, getComputedStyle(c).transform]; });
    check('A Subtle: a picked card fades and slides in 150 to 250 ms, with no lift or bounce', pv[0] === 'mlRise' && pv[1] >= 0.15 && pv[1] <= 0.25 && pv[2] === 'none' && pv[3] === 'none', JSON.stringify(pv));
    await page.evaluate(() => { window.__names = []; document.addEventListener('animationstart', e => window.__names.push(e.animationName), true); });
    await page.click('#ciStart'); await page.waitForSelector('#wm:not([hidden])');
    const o = await page.evaluate(() => { const w = document.getElementById('wm'), cs = getComputedStyle(w); return [window.MorningLaps.wmState().view, !!document.getElementById('wmStartSeq'), cs.animationName, parseFloat(cs.animationDuration)]; });
    check('A Subtle: no start-lights intro; live mode opens with a 200 ms fade and slide up', o[0] === 'main' && o[1] === false && o[2] === 'mlRise' && o[3] === 0.2, JSON.stringify(o));
    await page.click('#wmWarmLog');
    let sets = 0, pip = null;
    for (const [k, n] of FULLA) {
      for (let i = 0; i < n; i++) { await page.click('#wmLog'); sets++;
        if (await wmv() === 'rest') { if (!pip) pip = await page.evaluate(() => { const p = document.querySelector('#wmRestPips .wm-pip.new'), cs = p ? getComputedStyle(p) : null; return cs ? [cs.animationName, parseFloat(cs.animationDuration), document.querySelectorAll('#wmRestPips .wm-pip.on').length, !!document.getElementById('wmRing')] : null; }); await page.click('#wmRestSkip'); await waitView('main'); } }
    }
    check('A Subtle: logging 15 sets and tapping three check-in cards fires zero particle bursts', sets === 15 && same(await fxn(), { burst: 0, milestone: 0 }), JSON.stringify([sets, await fxn()]));
    check('A Subtle: a logged set fills its pip with a 150 ms color change, and the rest timer starts', !!pip && pip[0] === 'pipFill' && pip[1] === 0.15 && pip[2] === 1 && pip[3] === true, JSON.stringify(pip));
    await page.click('#wmFinish'); await waitView('finish');
    const fin0 = await page.evaluate(() => ({ stripe: !!document.getElementById('wmStripe'), flag: !!document.querySelector('#wm .wm-flag'), sh: Math.round(document.getElementById('wmStripe').getBoundingClientRect().height), top: Math.round(document.getElementById('wmStripe').getBoundingClientRect().top), first: Array.from(document.querySelectorAll('#wmSummary [data-count]')).map(e => e.textContent) }));
    await page.waitForFunction(() => Array.from(document.querySelectorAll('#wmSummary [data-count]')).every(e => e.textContent === Number(e.dataset.count).toLocaleString('en-US')));
    const fin1 = await page.$$eval('#wmSummary [data-count]', els => els.map(e => e.textContent));
    check('A Subtle: the finish screen has a thin checkered stripe along the top instead of the flag', fin0.stripe && !fin0.flag && fin0.sh <= 10 && fin0.top === 0, JSON.stringify(fin0));
    check('A Subtle: the numbers count up once', fin0.first.some((t, i) => t !== fin1[i]) && same(fin1, ['15', (await page.evaluate(() => Number(document.querySelectorAll('#wmSummary [data-count]')[1].dataset.count).toLocaleString('en-US'))), '50']) && fin1[1] !== '0', JSON.stringify([fin0.first, fin1]));
    await page.click('[data-a="wm-unfinish"]'); await page.click('#wmFinish'); await waitView('finish');
    check('A (still no bursts on the finish screen)', (await fxn()).burst === 0);
    await page.click('#wmSave'); await page.waitForSelector('#wmDoneBtn');
    const m = await fxn(), sweep = await page.evaluate(() => { const s = document.getElementById('sweep'), cs = getComputedStyle(s.querySelector('i'), '::before'); return [s.hidden, s.classList.contains('run'), cs.animationName, parseFloat(cs.animationDuration), s.querySelector('b').textContent]; });
    check('A a weight increase fires exactly one milestone effect, and no particles', m.milestone === 1 && m.burst === 0, JSON.stringify(m));
    check('A the milestone is one sweep of the accent color across the top, about 600 ms, with a check mark', sweep[0] === false && sweep[1] === true && sweep[2] === 'sweepGo' && sweep[3] === 0.6 && sweep[4] === '✓', JSON.stringify(sweep));
    const names = await page.evaluate(() => Array.from(new Set(window.__names)));
    check('A Subtle never ran a flip, zoom, bounce, pop or start-light animation', !names.some(n => ['pop', 'bump', 'hpFlip', 'wmZoom', 'ciGrow', 'ciLift', 'wmLight', 'wmGreen', 'wmWave', 'flash'].includes(n)), JSON.stringify(names));
    await ctx.close();
    // a badge alone
    await open({ me: 'tyson', init: local(seedDocs()) });
    await pick('rest'); await page.click('#ciRest'); await page.waitForFunction(d => { const r = JSON.parse(localStorage.getItem('ml.sessions'))[d]; return r && r.kind === 'rest'; }, WED);
    await page.waitForFunction(() => window.MorningLaps.state.fxn.milestone > 0, null, { timeout: 4000 }).catch(() => {});
    const b = await fxn(), seen = await page.evaluate(() => window.__seen.slice());
    check('A a badge fires exactly one milestone effect, and no particles', b.milestone === 1 && b.burst === 0 && (await kv(page, 'profiles/tyson')).badges.rest === WED, JSON.stringify([b, seen]));
    const pop = await page.evaluate(() => { const st = document.createElement('div'); st.className = 'pop'; document.body.appendChild(st); const cs = getComputedStyle(st), out = [cs.animationName, parseFloat(cs.animationDuration)]; st.remove(); return out; });
    check('A Subtle: the badge medal fades in instead of the bouncy, rotating pop', pop[0] === 'mlFade' && pop[1] === 0.2, JSON.stringify(pop));
    await go(page, 'fuel'); await page.click('[data-a="water"][data-oz="8"]'); await page.waitForTimeout(300);
    check('A water, food and plain saves fire nothing', same(await fxn(), b));
    // the Me setting
    await go(page, 'me');
    const row = await page.$$eval('#motionRow [data-a="motion-set"]', els => els.map(e => e.textContent + ':' + e.getAttribute('aria-pressed')));
    check('A Me has an "Animations" setting: Subtle (default), Full, Off', same(row, ['Subtle:true', 'Full:false', 'Off:false']) && (await txt(page, '#motionRow .eyebrow')) === 'Animations');
    check('A the celebration style is marked as applying to Full only', (await txt(page, '#fxRow .eyebrow')).includes('with Full animations'));
    await page.click('#fxRow [data-a="fx-preview"]');
    check('A (its preview does not burst outside Full)', (await toastWith(page, 'Full animations')).includes('Full') && (await fxn()).burst === 0);
    await page.click('[data-a="motion-set"][data-v="full"]'); await page.waitForFunction(() => document.documentElement.dataset.motion === 'full');
    check('A the pick is saved per person', (await kv(page, 'profiles/tyson')).motion === 'full' && !(await kv(page, 'profiles/jacquie')).motion && !(await txt(page, '#fxRow .eyebrow')).includes('with Full'));
    await switchTo(page, 'jacquie');
    check('A Jacquie stays on Subtle', (await page.evaluate(() => document.documentElement.dataset.motion)) === 'subtle');
    await ctx.close();
    // Full: today's behavior
    await open({ me: 'tyson', init: local(seedDocs({ tProfile: { motion: 'full' } })) });
    await pick('strong');
    const fpv = await page.evaluate(() => [getComputedStyle(document.getElementById('ciPreview')).animationName, getComputedStyle(document.querySelector('#checkin .cic.sel')).animationName]);
    await page.click('#ciStart'); await page.waitForSelector('#wmStartSeq');
    const fz = await page.evaluate(() => [getComputedStyle(document.getElementById('wm')).animationName, document.querySelectorAll('.wm-lights i').length]);
    await page.click('#wmStartSeq'); await page.click('#wmWarmLog'); await page.click('#wmLog'); await page.click('#wmRestSkip');
    const fb = await fxn();
    await page.click('#wmFinish'); await waitView('finish');
    const ff = await page.evaluate(() => [!!document.querySelector('#wm .wm-flag.chk'), !!document.getElementById('wmStripe'), window.MorningLaps.state.fxn.burst, window.MorningLaps.state.fxn.milestone]);
    check('A Full behaves as before: bursts on a pick and on a logged set, start lights, zoom, flag and burst at the finish', same(fpv, ['ciGrow', 'ciLift']) && same(fz, ['wmZoom', 3]) && fb.burst === 2 && same(ff, [true, false, 3, 0]), JSON.stringify([fpv, fz, fb, ff]));
    await ctx.close();
    // Off, and the phone's reduce-motion setting
    for (const [name, opts] of [['Off', { init: local(seedDocs({ tProfile: { motion: 'off' } })) }], ['reduced motion', { reducedMotion: 'reduce', init: local(seedDocs({ tProfile: { motion: 'full' } })) }]]) {
      await open(Object.assign({ me: 'tyson' }, opts));
      await page.evaluate(() => { window.__names = []; document.addEventListener('animationstart', e => window.__names.push(e.animationName), true); });
      await pick('strong'); await page.click('#ciStart'); await page.waitForSelector('#wm:not([hidden])');
      const v = await wmv(); await page.click('#wmWarmLog');
      for (let i = 0; i < 3; i++) { await page.click('#wmLog'); await skipRest(); }
      await page.click('#wmFinish'); await waitView('finish');
      const st = await page.evaluate(() => Array.from(document.querySelectorAll('#wmSummary [data-count]')).map(e => e.textContent));
      await page.click('#wmSave'); await page.waitForSelector('#wmDoneBtn'); await page.waitForTimeout(300);
      const r = await page.evaluate(() => ({ fx: Object.assign({}, window.MorningLaps.state.fxn), motion: document.documentElement.dataset.motion, names: window.__names.slice(), sweepHidden: document.getElementById('sweep').hidden, running: document.getAnimations().filter(a => a.playState === 'running').length }));
      check('A ' + name + ': no bursts, no milestone effect, no intro, nothing animated', v === 'main' && r.motion === 'off' && same(r.fx, { burst: 0, milestone: 0 }) && r.sweepHidden && r.names.length === 0 && r.running === 0 && st[0] === '3', JSON.stringify([v, r, st]));
      await ctx.close();
    }
  });

  // ---------- smoke: every tab and every live-mode screen, both profiles, 390 px ----------
  await section('G', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    await switchTo(page, 'jacquie'); await page.waitForTimeout(300); await switchTo(page, 'tyson'); await page.waitForTimeout(700);
    await watchWrites(page);
    const bad = [], wide = [], screens = [];
    const fit = async name => { const o = await page.evaluate(() => { const w = document.getElementById('wm'), b = w.querySelector('.wm-body'); return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, w.scrollWidth - w.clientWidth, b ? b.scrollWidth - b.clientWidth : 0); }); screens.push(name); if (o > 0) wide.push(name + ':' + o); if (/undefined|NaN|\[object/.test(await txt(page, '#wm'))) bad.push('wm:' + name); };
    const sheetFit = async name => { const o = await page.evaluate(() => { const v = document.querySelector('#ov .ov'); return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, v ? v.scrollWidth - v.clientWidth : 0); }); screens.push(name); if (o > 0) wide.push(name + ':' + o); if (/undefined|NaN|\[object/.test(await txt(page, '#ov'))) bad.push('sheet:' + name); };
    const leave = async () => { await page.click('[data-a="wm-quit"]'); await fit('quit'); await page.click('#wmQuitKeep'); await page.waitForSelector('#wm', { state: 'hidden' }); };
    for (const who of ['tyson', 'jacquie']) { if (who === 'jacquie') await switchTo(page, 'jacquie');
      for (const tab of ['train', 'program', 'history', 'fuel', 'compete', 'me']) { await go(page, tab); const n = await page.evaluate(() => document.querySelectorAll('#main .card, #main .sheet').length); if (!n || /undefined|NaN|\[object/.test(await txt(page, '#main'))) bad.push(who + ':' + tab); if ((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) > 0) wide.push(who + ':' + tab); }
      await go(page, 'train'); await page.click('#coach summary'); await page.click('#coach summary');
      if (who === 'tyson') {
        await pick('strong'); await live(); await fit('warm-up'); await page.click('[data-a="wm-next"]'); await fit('lift'); await page.click('[data-a="wm-swap"]'); await fit('swap'); await page.click('[data-a="wm-swap"]');
        await page.click('#wmFinish'); await waitView('finish'); await fit('lift finish'); await page.click('[data-a="wm-unfinish"]'); await leave();
        for (const [c, o, n] of [['tired', 'hptrack', 'laps'], ['tired', 'hpswim', 'lengths'], ['tired', 'treadmill', 'timer'], ['sore', 'hptrack', 'recovery']]) {
          await pick(c); await page.click('[data-a="ci-opt"][data-v="' + o + '"]'); await page.click('#ciLog'); await page.waitForSelector('#cilogSave'); await sheetFit('log sheet ' + n); await page.click('[data-a="ov-close"]');
          await live(); await fit(n);
          if (n === 'recovery') { await page.click('#wmNext'); await fit('stretch'); await page.click('#wmNext'); await fit('heat'); }
          await page.click('#wmFinish'); await waitView('finish'); await fit(n + ' finish'); await page.click('[data-a="wm-unfinish"]'); await leave();
        }
      } else {
        await pick('good'); await page.click('#ciLog'); await page.waitForSelector('#cilogSave'); await sheetFit('her log sheet'); await page.click('[data-a="ov-close"]');
        await live(); await fit('her laps'); await page.click('#wmNext'); await fit('circuit'); await page.click('#wmFinish'); await waitView('finish'); await fit('her finish'); await page.click('[data-a="wm-unfinish"]'); await leave();
        await pick('sore'); await live(); await fit('her stretch'); await page.click('#wmNext'); await fit('her heat'); await leave();
      }
    }
    await page.waitForTimeout(400);
    check('G smoke: every tab draws for both profiles, with nothing broken in the text', bad.length === 0, bad.join(' '));
    check('G every live-mode screen and Log it sheet was shown: ' + screens.length, screens.length >= 28 && ['warm-up', 'lift', 'swap', 'lift finish', 'quit', 'laps', 'lengths', 'timer', 'recovery', 'stretch', 'heat', 'circuit', 'her laps', 'log sheet laps', 'log sheet recovery', 'her log sheet', 'laps finish'].every(s => screens.includes(s)), screens.join(', '));
    check('G at 390 px wide nothing scrolls sideways', wide.length === 0, wide.join(' '));
    check('G showing screens and sheets writes nothing to the log', (await writes(page)).length === 0, JSON.stringify(await writes(page)));
    check('G window.MorningLaps is still exported', await ML(page, () => { const M = window.MorningLaps; return ['state', 'weekScore', 'compWeeks', 'suggest', 'weekGoals', 'backupDocs', 'caps', 'checkinSuggest', 'wmState', 'motionOf', 'modeOf'].every(k => k in M); }));
  });
  check('no console errors in any section', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  await browser.close();
  process.exit(finish('version 17 checks') ? 1 : 0);
})();
