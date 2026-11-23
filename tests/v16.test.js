// The checks for version 16: the daily check-in, the Full Body A/B split, Healthplex activities, weekly lift goal,
// gym info and morning plan, "Not at my gym", Jacquie's check-in, workout mode, and the pick animations.
// Headless browser, browser-only mode, seeded storage: two profiles with six-plus weeks of history; Tyson's
// Push / Pull / Legs history has weights on squat, latpull, inclinedb, dbrdl and seatedrow; Jacquie with her gym blank
// or set to the Healthplex, one "Go easy on" area and one pain-flagged activity.
// Run: node tests/v16.test.js   (ML_ONLY=C,W runs just those sections)
const { chromium, check, results, T, newPage, val, txt, has, fill, go, score, finish } = require('./helpers');
const kvAll = page => page.evaluate(() => JSON.parse(localStorage.getItem('ml.kv') || '{}'));
const kv = (page, path) => page.evaluate(p => (JSON.parse(localStorage.getItem('ml.kv') || '{}'))[p] || null, path);
const ses = (page, d) => page.evaluate(x => (JSON.parse(localStorage.getItem('ml.sessions') || '{}'))[x] || null, d);
const settings = page => page.evaluate(() => JSON.parse(localStorage.getItem('ml.settings') || '{}'));
const ML = (page, fn, arg) => page.evaluate(fn, arg);
const toastWith = (page, part) => page.waitForFunction(x => { const t = document.getElementById('toast'); return !t.hidden && t.textContent.includes(x) ? t.textContent : false; }, part, { timeout: 5000 }).then(h => h.jsonValue()).catch(() => txt(page, '#toast'));
const settled = page => page.waitForFunction(() => window.MorningLaps.state.ready && !!(JSON.parse(localStorage.getItem('ml.kv') || '{}'))['profiles/jacquie/weekgoals/' + (function () { const s = window.MorningLaps.state.today, d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8))); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); })()]);
const switchTo = async (page, pid) => { await page.click('#whoBtn'); await page.click('[data-a="who-pick"][data-pid="' + pid + '"]'); await page.waitForFunction(p => window.MorningLaps.state.pid === p && document.getElementById('ov').hidden, pid); };
const carry = async (page, more) => { const all = await page.evaluate(() => Object.assign({}, localStorage)); return 'if(!localStorage.getItem("carried")){localStorage.clear();var s=' + JSON.stringify(all) + ';Object.keys(s).forEach(function(k){localStorage.setItem(k,s[k]);});localStorage.setItem("carried","1");' + (more || '') + '}'; };
const plus = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const all = page => page.evaluate(() => JSON.stringify(Object.assign({}, localStorage)));
const watchWrites = page => page.evaluate(() => { window.__w = []; if (window.__wOn) return; window.__wOn = true; const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k) { if (k === 'ml.kv' || k === 'ml.sessions' || k === 'ml.settings') window.__w.push(k); return set.apply(this, arguments); }; });
const writes = page => page.evaluate(() => window.__w.slice());
const HP = 'Indianapolis Healthplex';

/* ---------- the seed: Push / Pull / Legs from Mon Oct 26 through Fri Dec 4 ---------- */
const WEEKS = ['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'];
const reps = (n, c) => Array.from({ length: c || 3 }, () => n);
const SETS = (day, i) => day === 'push' ? { chestpress: { w: 70 + 5 * i, reps: reps(12) }, inclinedb: { w: 25 + 5 * Math.floor(i / 2), reps: reps(10) }, shoulderpress: { w: 50, reps: reps(10) } }
  : day === 'pull' ? { latpull: { w: 80 + 5 * i, reps: reps(12) }, seatedrow: { w: 80 + 5 * i, reps: reps(10) }, dbcurl: { w: 20, reps: reps(11) } }
  : { squat: { w: 95 + 10 * i, reps: reps(10) }, dbrdl: { w: 30 + 5 * i, reps: reps(12) }, legcurl: { w: 60, reps: reps(12) } };
const lift = (date, day, phase, ex, extra) => Object.assign({ v: 2, date, kind: 'strength', day, phase, planned: Object.keys(ex), plannedBase: Object.keys(ex), swaps: {}, ex, qualifies: true, complete: true, treadmill: { minutes: 20, title: '' }, savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' }, extra);
const tread = (date, phase, extra) => Object.assign({ v: 2, date, kind: 'cardio', phase, treadmill: { minutes: 25, title: 'Fitness+ run' }, savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' }, extra);
const act = (date, a, name, min, more) => Object.assign({ id: 'a-' + a + '-' + date, a, name, min, feel: 'good', hurt: false, note: '', mv: true, at: date + 'T12:00:00Z' }, more);
const day = (date, acts, extra) => Object.assign({ v: 2, date, kind: 'activity', acts, savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' }, extra);
const FULLA = (w2, r2) => ({ squat: { w: 145, reps: reps(8) }, dbbench: { w: 30, reps: reps(10) }, latpull: { w: 105, reps: reps(10) }, dbshoulder: { w: w2 || 20, reps: r2 || [12, 12] }, legcurl: { w: 60, reps: [12, 12] }, legraise: { reps: [12, 12] } });
const FULLB = () => ({ dbrdl: { w: 55, reps: reps(10) }, inclinedb: { w: 35, reps: reps(10) }, seatedrow: { w: 105, reps: reps(10) }, lunge: { w: 15, reps: [10, 10] }, latraise: { w: 10, reps: [12, 12] }, facepull: { w: 30, reps: [12, 12] } });
// opt.settings: lifting settings. opt.thisWeek: Tyson's records from Dec 7 on. opt.tGym / opt.jGym: gym names.
// opt.jProfile: extra profile fields. opt.kv: extra documents. opt.twoLifts: only two lifts a week, with a lift goal of 2 locked.
function seedDocs(opt) {
  opt = opt || {};
  const sessions = {}, kv = {};
  WEEKS.forEach((ws, i) => { const ph = i < 2 ? 1 : i === 2 ? 2 : 3, d = n => plus(ws, n);
    sessions[d(0)] = lift(d(0), 'push', ph, SETS('push', i)); sessions[d(1)] = tread(d(1), ph); sessions[d(2)] = lift(d(2), 'pull', ph, SETS('pull', i)); sessions[d(3)] = tread(d(3), ph);
    if (!opt.twoLifts) sessions[d(4)] = lift(d(4), 'legs', ph, SETS('legs', i));
    if (opt.twoLifts) kv['profiles/tyson/weekgoals/' + ws] = { ws, plan: 'program', goal: 4, liftGoal: 2, minMin: 10, kcal: 2000, lo: 1800, hi: 2200, waterOz: 80, protein: 120, placeholder: true, lockedAt: ws + 'T12:00:00.000Z' };
    kv['profiles/jacquie/sessions/' + d(0)] = day(d(0), [act(d(0), 'walkeasy', 'Easy walk', 20)]);
    kv['profiles/jacquie/sessions/' + d(2)] = day(d(2), [act(d(2), 'chairyoga', 'Chair yoga', 20)]);
    kv['profiles/jacquie/sessions/' + d(4)] = day(d(4), [act(d(4), 'walkeasy', 'Easy walk', 20)]);
  });
  (opt.thisWeek || []).forEach(r => { sessions[r.date] = r; });
  kv['profiles/jacquie'] = Object.assign({ name: 'Jacquie', motion: 'full', body: { sex: 'f', age: 30, heightIn: 64, weightLb: 150, activity: 'light', pace: 'maintain' } }, opt.jGym ? { place: opt.jGym, placeSince: '2026-11-01' } : null, opt.jProfile);
  kv['profiles/tyson'] = Object.assign({ name: 'Tyson', motion: 'full' }, opt.tGym ? { place: opt.tGym, placeSince: opt.tSince || '2026-11-01' } : null);
  kv['comp/settings'] = { start: '2026-10-26', stakes: '' };
  Object.assign(kv, opt.kv);
  return { sessions, settings: Object.assign({ startDate: '2026-10-26', goal: 5, maxed: {}, swaps: {} }, opt.settings), kv };
}
const local = (docs, pre) => (pre || '') + 'if(!localStorage.getItem("seeded")){localStorage.setItem("seeded","1");localStorage.setItem("ml.sessions",' + JSON.stringify(JSON.stringify(docs.sessions)) + ');localStorage.setItem("ml.settings",' +
  JSON.stringify(JSON.stringify(docs.settings)) + ');localStorage.setItem("ml.kv",' + JSON.stringify(JSON.stringify(docs.kv)) + ');}';
const at = d => T(d + 'T17:00:00Z'); // noon in Indianapolis
const MON = '2026-12-07', TUE = '2026-12-08', WED = '2026-12-09', THU = '2026-12-10', FRI = '2026-12-11', SAT = '2026-12-12';

(async () => {
  const browser = await chromium.launch();
  let ctx, page; const consoleErrors = [];
  const open = async (opts) => {
    ({ ctx, page } = await newPage(browser, opts)); page.on('console', m => { if (m.type() === 'error' && !/favicon/i.test(m.text())) consoleErrors.push(m.text()); });
    await settled(page); return page;
  };
  const ovType = () => page.evaluate(() => { const o = window.MorningLaps.state.ov; return o ? o.type : ''; });
  const only = process.env.ML_ONLY ? process.env.ML_ONLY.split(',') : null;
  const section = async (tag, fn) => {
    if (only && !only.includes(tag)) return;
    try { await fn(); } catch (e) {
      let where = ''; try { where = ' [wm: ' + JSON.stringify(await page.evaluate(() => { const w = window.MorningLaps.wmState(); return w ? [w.view, w.plan.kind, w.i, w.si] : null; })) + '; sheet: ' + (await ovType()) + '; after: ' + (results.length ? results[results.length - 1].name : 'start') + ']'; } catch (e2) { /* page gone */ }
      check(tag + ' ran to the end', false, String(e && e.message || e).split('\n')[0] + where);
    }
    try { if (ctx) await ctx.close(); } catch (e) { /* already closed */ }
  };
  const wmv = () => page.evaluate(() => { const w = window.MorningLaps.wmState(); return w ? w.view : null; });
  const waitView = v => page.waitForFunction(x => { const w = window.MorningLaps.wmState(); return (w ? w.view : null) === x; }, v);
  const sug = () => page.evaluate(() => { const b = document.querySelector('#checkin .cic.sug'); return b ? [b.dataset.v, b.querySelector('[data-ci-why]').textContent, document.querySelectorAll('#ciSuggested').length] : null; });
  const stepTo = async (id, a, want) => { for (let i = 0; i < 80; i++) { const cur = Number(await txt(page, '#' + id)); if (cur === want) return; await page.click('#wm [data-a="' + a + '"][data-d="' + (cur < want ? 1 : -1) + '"]'); } };
  const skipRest = async () => { if (await wmv() === 'rest') { await page.click('#wmRestSkip'); await waitView('main'); } };
  const logSets = async (list) => { for (const r of list) { await stepTo('wmR', 'wm-r', r); await page.click('#wmLog'); await skipRest(); } };
  const startLift = async (choice) => { await page.click('[data-a="ci-pick"][data-v="' + choice + '"]'); await page.click('#ciStart'); await page.waitForSelector('#wm:not([hidden])'); if (await wmv() === 'start') await page.click('#wmStartSeq'); await waitView('main'); };
  const hpT = { tGym: HP }, full = { split: 'full' };

  // ---------- 0: the seed ----------
  await section('S', async () => {
    await open({ me: 'tyson', time: at(WED), init: local(seedDocs()) });
    const s = await ML(page, () => { const M = window.MorningLaps, st = M.state; return { ts: Object.keys(st.data.tyson.sessions).sort(), js: Object.keys(st.data.jacquie.sessions).sort(), w: ['squat', 'latpull', 'inclinedb', 'dbrdl', 'seatedrow'].map(k => { const sg = M.suggest(k, '2026-12-09'); return sg.last ? sg.last.w : null; }), split: M.splitOf('tyson'), next: M.nextDayKey('2026-12-09') }; });
    const span = a => (Date.parse(a[a.length - 1]) - Date.parse(a[0])) / 86400000 / 7;
    check('S two profiles with six-plus weeks of history', span(s.ts) >= 5.5 && span(s.js) >= 5.5 && s.ts.length === 30 && s.js.length === 18, s.ts.length + ' ' + s.js.length);
    check('S Tyson\'s Push / Pull / Legs history has weights on squat, latpull, inclinedb, dbrdl and seatedrow', same(s.w, [145, 105, 35, 55, 105]) && s.split === 'ppl' && s.next === 'push', JSON.stringify(s.w));
  });

  // ---------- 1: the daily check-in ----------
  await section('C', async () => {
    const rule = async (name, today, thisWeek, want, why, st) => {
      await open({ me: 'tyson', time: at(today), init: local(seedDocs({ thisWeek, settings: st })) });
      const s = await sug(), fn = await ML(page, d => window.MorningLaps.checkinSuggest('tyson', d), today);
      check('C ' + name, !!s && s[0] === want && s[1] === why && s[2] === 1 && fn.choice === want, JSON.stringify([s, fn]));
      await ctx.close();
    };
    await rule('the last session was sore: recovery is suggested', WED, [tread(TUE, 3, { checkin: 'sore' })], 'sore', 'Last time was a sore day.');
    await rule('a second sore day in a row does not loop: the other rules take over', WED, [tread(MON, 3, { checkin: 'sore' }), tread(TUE, 3, { checkin: 'sore' })], 'short', '3 lifts to go, 5 days left.');
    await rule('lifted yesterday: cardio is suggested', WED, [lift(TUE, 'push', 3, SETS('push', 6))], 'tired', 'You lifted yesterday.');
    await rule('the week is running out of days for its lifts: the express lift ("2 lifts to go, 3 days left.")', FRI, [lift(MON, 'push', 3, SETS('push', 6)), tread(WED, 3)], 'short', '2 lifts to go, 3 days left.');
    await rule('3 or more days since the last lift: the full lift', MON, [], 'strong', '3 days since your last lift.');
    await rule('otherwise on a weekday: the full lift', WED, [lift(MON, 'push', 3, SETS('push', 6))], 'strong', 'A weekday: a good day for the full lift.');
    await rule('otherwise on a weekend: cardio', SAT, [lift(MON, 'push', 3, SETS('push', 6)), lift(THU, 'pull', 3, SETS('pull', 6))], 'tired', 'A weekend: keep it easy.');
    await rule('with a lift goal of 2, one lift to go on Saturday is not yet tight', SAT, [lift(THU, 'push', 3, SETS('push', 6))], 'tired', 'A weekend: keep it easy.', { liftGoal: 2 });
    // every choice can be tapped; picking and backing out writes nothing
    await open({ me: 'tyson', time: at(WED), init: local(seedDocs(Object.assign({ settings: full }, hpT))) });
    const cards = await page.$$eval('#checkin .cic', els => els.map(e => e.dataset.v + ':' + e.querySelector('b').textContent));
    check('C "How are you feeling?" has the five choices, for today', (await txt(page, '#checkin h3')) === 'How are you feeling?' && same(cards, ['strong:Feeling strong', 'short:Short on time', 'tired:Tired, just want to move', 'sore:Sore or run down', 'rest:Not going today']), JSON.stringify(cards));
    check('C the class link is smaller, below, and never the suggested card', (await txt(page, '#ciExtra')) === 'Class or game (optional)' && await page.evaluate(() => { const l = document.getElementById('ciExtra'), c = document.querySelectorAll('#checkin .cic'); return l.getBoundingClientRect().top > c[c.length - 1].getBoundingClientRect().bottom && !l.closest('.cic') && !l.querySelector('.chip'); }));
    await watchWrites(page); const before = await all(page), previews = [];
    for (const c of ['strong', 'short', 'tired', 'sore', 'rest']) {
      await page.click('[data-a="ci-pick"][data-v="' + c + '"]'); await page.waitForSelector('#ciPreview');
      previews.push(await page.evaluate(() => ({ t: document.getElementById('ciTitle').textContent, time: document.getElementById('ciTime').textContent, moves: Array.from(document.querySelectorAll('#ciMoves li')).map(l => l.textContent), start: (document.getElementById('ciStart') || document.getElementById('ciRest')).textContent, faded: document.querySelectorAll('#checkin .cic.fade').length })));
      await page.click('[data-a="ci-back"]'); await page.waitForSelector('#ciPreview', { state: 'detached' });
    }
    check('C each choice opens a preview with the session, the time, the first moves and Start', previews[0].t === 'Full Body A' && previews[0].time === 'about 45 min' && previews[0].moves.length === 3 && previews[0].moves[0].startsWith('Barbell back squat · 3 × 6–10 · 155 lb') && previews[0].start === 'Start live' && previews[0].faded === 4 &&
      previews[1].t === 'Express Full Body A' && previews[1].time === 'about 25 min' && previews[1].moves.length === 3 && previews[1].moves.every(m => m.includes(' · 3 × ')) && previews[2].t === 'Easy cardio' && previews[3].t === 'Recovery' && previews[3].moves.length === 3 && previews[4].t === 'Rest day' && previews[4].start === 'Log rest day', JSON.stringify(previews));
    check('C picking a choice and backing out writes nothing, not even a draft', (await writes(page)).length === 0 && (await all(page)) === before);
    await page.click('[data-a="ci-pick"][data-v="tired"]');
    const opts = await page.$$eval('#ciOpts button', els => els.map(e => e.textContent));
    check('C "tired" offers the track, treadmill, bike, elliptical and the lap pool', same(opts, ['Track walk', 'Track run/walk', 'Treadmill (Fitness+)', 'Bike', 'Elliptical', 'Lap swim']), JSON.stringify(opts));
    await page.click('[data-a="ci-back"]');
    // an express session through workout mode: saved with the check-in, counted as a lift day, shown in History
    const sc0 = await score(page, 'tyson');
    await startLift('short');
    check('C Start opens workout mode on the warm-up', (await txt(page, '#wmName')) === 'Warm-up' && await page.evaluate(() => !document.getElementById('wm').hidden));
    await page.click('#wmWarmLog');
    for (let i = 0; i < 3; i++) { await logSets([10, 10, 10]); if (i < 2 && await has(page, '#wmNext') && (await txt(page, '#wmName')) === ['Barbell back squat', 'Dumbbell bench press', 'Lat pulldown machine'][i]) await page.click('#wmNext'); }
    check('C the express session is three lifts', await page.evaluate(() => /Lift 3 of 3/.test(document.querySelector('#wm .eyebrow').textContent)), await txt(page, '#wm .eyebrow'));
    await page.click('#wmFinish'); await waitView('finish'); await page.click('#wmSave'); await page.waitForSelector('#wmDoneBtn');
    const rec = await ses(page, WED), sc1 = await score(page, 'tyson');
    check('C the saved day carries the check-in, plans 3 lifts and counts as a lift day', rec.checkin === 'short' && rec.kind === 'strength' && rec.day === 'fba' && same(rec.planned, ['squat', 'dbbench', 'latpull']) && rec.qualifies === true && rec.complete === true && sc1.lifts === sc0.lifts + 1 && rec.treadmill.minutes === 5, JSON.stringify([rec.planned, rec.qualifies, rec.complete, sc0.lifts, sc1.lifts]));
    await page.click('#wmDoneBtn'); await page.waitForSelector('#wm', { state: 'hidden' });
    check('C Train then shows the check-in as answered, on one line', (await txt(page, '#ciDone')) === 'Short on time · Full Body A' && (await txt(page, '#ciChange')) === 'Change');
    await go(page, 'history');
    check('C History shows "Felt: short on time"', (await txt(page, 'details.hi[data-hdate="' + WED + '"] summary')).includes('Felt: short on time') && !(await txt(page, 'details.hi[data-hdate="' + WED + '"] summary')).includes('Phase'), await txt(page, 'details.hi[data-hdate="' + WED + '"] summary'));
    await ctx.close();
    // a rest day from the check-in
    await open({ me: 'tyson', time: at(WED), init: local(seedDocs({ settings: full })) });
    await page.click('[data-a="ci-pick"][data-v="rest"]'); await page.click('#ciRest'); await page.waitForFunction(d => { const r = JSON.parse(localStorage.getItem('ml.sessions'))[d]; return r && r.kind === 'rest'; }, WED);
    check('C "Not going today" saves a rest day with its check-in', (await ses(page, WED)).checkin === 'rest' && !(await has(page, '#ciExtra')));
    const never = await ML(page, () => { const M = window.MorningLaps, out = []; for (let i = 0; i < 28; i++) { const d = new Date(Date.UTC(2026, 10, 9 + i)).toISOString().slice(0, 10); out.push(M.checkinSuggest('tyson', d).choice, M.checkinSuggest('jacquie', d).choice); } return Array.from(new Set(out)); });
    check('C a class is never the suggestion on any day', never.every(c => ['strong', 'short', 'tired', 'sore', 'good', 'low'].includes(c)), JSON.stringify(never));
  });

  // ---------- 2: the Full Body A/B split ----------
  await section('P', async () => {
    await open({ me: 'tyson', time: at(WED), init: local(seedDocs()) });
    const before = await page.evaluate(() => localStorage.getItem('ml.sessions')), badges0 = await ML(page, () => window.MorningLaps.badgesFor('tyson').filter(b => b.earned).map(b => b.id).sort());
    check('P before: Push / Pull / Legs, with a Phase label', (await txt(page, '#kindSeg')).includes('Push') && (await txt(page, '.sess .status')).includes('Phase 3'));
    await go(page, 'program');
    check('P the Program tab has the Split setting', same(await page.$$eval('#splitCard [data-a="split-set"]', els => els.map(e => e.textContent + ':' + e.getAttribute('aria-pressed'))), ['Full body A/B:false', 'Push / Pull / Legs:true']));
    await page.click('[data-a="split-set"][data-v="full"]'); await page.waitForFunction(() => JSON.parse(localStorage.getItem('ml.settings')).split === 'full');
    check('P switching splits leaves every old record identical', (await page.evaluate(() => localStorage.getItem('ml.sessions'))) === before);
    const prog = await txt(page, '#main');
    check('P the plan lists A and B with each slot\'s own sets and range, and the optional lifts', prog.includes('Full Body A day') && prog.includes('Full Body B day') && /Seated dumbbell shoulder press[^×]*2 × 8–12/.test(prog) && /Barbell back squat[^×]*3 × 6–10/.test(prog) && /Dumbbell Romanian deadlift[^×]*3 × 8–12/.test(prog) && /Walking lunges[^×]*2 × 10–12/.test(prog) && /Dumbbell biceps curl if there's time[^×]*2 × 10–12/.test(prog) && prog.includes('Warm-up (track, treadmill or bike)') && !/Phase \d/.test(prog.replace(/Phases do not apply[^.]*\./, '')), prog.slice(0, 300));
    await go(page, 'train');
    const tr = await page.evaluate(() => ({ seg: document.getElementById('kindSeg').textContent, status: document.querySelector('.sess .status').textContent, ex: Array.from(document.querySelectorAll('.ex[data-ex]')).map(e => e.dataset.ex + ':' + e.querySelectorAll('[data-field="rep"]').length), warm: document.querySelector('#logForm .bhead').textContent, why: document.getElementById('whyLine').textContent }));
    check('P after switching, the next lift is A, with 3-set and 2-set slots', tr.seg.startsWith('Full Body AFull Body B') && same(tr.ex, ['squat:3', 'dbbench:3', 'latpull:3', 'dbshoulder:2', 'legcurl:2', 'legraise:2']) && tr.why.includes('Full Body A is next'), JSON.stringify(tr));
    check('P the Phase label is hidden, and the treadmill block is a 5–10 min warm-up', !tr.status.includes('Phase') && tr.warm.includes('Warm-up (track, treadmill or bike)') && tr.warm.includes('5–10 min'), tr.status + ' | ' + tr.warm);
    check('P phase badges already earned are kept', same(await ML(page, () => window.MorningLaps.badgesFor('tyson').filter(b => b.earned).map(b => b.id).sort()), badges0) && badges0.length > 0, JSON.stringify(badges0));
    const sg = await ML(page, () => { const M = window.MorningLaps; return ['squat', 'latpull', 'legcurl', 'dbbench'].map(k => { const s = M.suggest(k, '2026-12-09'); return [k, s.w, s.last ? s.last.date : null, M.specFor(k, '2026-12-09').sets]; }); });
    check('P suggestions come from the existing history: squat, lat pulldown, leg curl', same(sg, [['squat', 155, '2026-12-04', 3], ['latpull', 110, '2026-12-02', 3], ['legcurl', 60, '2026-12-04', 2], ['dbbench', 30, null, 3]]), JSON.stringify(sg));
    await ctx.close();
    // A and B alternate after counted lift days; a partial day does not move it
    const alt = async (thisWeek, want) => { await open({ me: 'tyson', time: at(FRI), init: local(seedDocs({ settings: full, thisWeek })) }); const k = await ML(page, () => window.MorningLaps.nextDayKey('2026-12-11')); await ctx.close(); return k === want; };
    check('P A and B alternate after each counted lift day', await alt([lift(MON, 'fba', 3, FULLA())], 'fbb') && await alt([lift(MON, 'fba', 3, FULLA()), lift(WED, 'fbb', 3, FULLB())], 'fba') && await alt([lift(MON, 'fba', 3, FULLA()), lift(WED, 'fbb', 3, FULLB(), { qualifies: false })], 'fbb') && await alt([], 'fba'));
    // the weight rule uses each slot's count
    const up = async (r2) => { await open({ me: 'tyson', time: at(FRI), init: local(seedDocs({ settings: full, thisWeek: [lift(MON, 'fba', 3, FULLA(20, r2)), lift(WED, 'fbb', 3, FULLB())] })) }); const s = await ML(page, () => { const M = window.MorningLaps, x = M.suggest('dbshoulder', '2026-12-11'), b = M.suggest('inclinedb', '2026-12-11'); return [x.w, x.sets, M.nextDayKey('2026-12-11'), b.w, b.last.date]; }); await ctx.close(); return s; };
    const u1 = await up([12, 12]), u2 = await up([12, 11]), u3 = await up([12]);
    check('P a 2-set slot moves up only when both sets hit the top', u1[0] === 25 && u1[1] === 2 && u1[2] === 'fba' && u2[0] === 20 && u3[0] === 20, JSON.stringify([u1, u2, u3]));
    check('P and Incline press on B reads its last session, whichever split it was', u1[3] === 35 && u1[4] === WED);
    // B day: optional lifts are shown, and not needed for a finished session
    await open({ me: 'tyson', time: at(FRI), init: local(seedDocs({ settings: full, thisWeek: [lift(WED, 'fba', 3, FULLA())] })) });
    check('P on B the curl and pushdown are marked "if there\'s time"', same(await page.$$eval('[data-optional]', els => els.map(e => e.dataset.optional + ':' + e.textContent)), ['dbcurl:if there\'s time', 'pushdown:if there\'s time']) && (await page.$$('.ex[data-ex]')).length === 8);
    await fill(page, '#tmMin', 6);
    for (const k of ['dbrdl', 'inclinedb', 'seatedrow', 'lunge', 'latraise', 'facepull']) { await page.click('[data-usew="' + k + '"]'); await fill(page, '#r-' + k + '-0', 10); }
    await page.evaluate(() => { const b = document.querySelector('#rest:not([hidden]) [data-a="timer-x"]'); if (b) b.click(); }); await page.click('h1'); await page.click('#saveBtn');
    await page.waitForFunction(d => { const r = JSON.parse(localStorage.getItem('ml.sessions'))[d]; return r && r.kind === 'strength'; }, FRI);
    const b = await ses(page, FRI);
    check('P a B day without the optional lifts is finished, and its 2-set slots save 2 sets', b.complete === true && b.day === 'fbb' && b.planned.length === 8 && b.ex.lunge.reps.length === 2 && b.ex.dbrdl.reps.length === 3 && b.treadmill.minutes === 6 && !b.ex.dbcurl, JSON.stringify([b.complete, b.planned, b.ex.lunge]));
    await go(page, 'history');
    check('P History calls the minutes a warm-up on a full-body day', (await txt(page, 'details.hi[data-hdate="' + FRI + '"] summary')).includes('6 min warm-up') && (await txt(page, 'details.hi[data-hdate="2026-12-04"] summary')).includes('min treadmill'));
    await ctx.close();
    // deload weeks follow the locked lift goal
    await open({ me: 'tyson', time: at(WED), init: local(seedDocs({ twoLifts: true, settings: { split: 'full', liftGoal: 2, goal: 4 } })) });
    const dl = await ML(page, () => { const M = window.MorningLaps; return [M.deloadWeeks('2026-12-09'), M.completedWeeks('2026-12-09'), M.deloadState()]; });
    check('P for deloads a completed lift week is one that met its locked lift goal (2), not a fixed 3', same(dl, [6, 0, '']) || (dl[0] >= 5 && dl[1] === 0), JSON.stringify(dl));
    const dl5 = await ML(page, () => window.MorningLaps.deloadWeeks('2026-11-30'));
    check('P (five such weeks reach the deload offer)', dl5 === 5, String(dl5));
  });

  // ---------- 3: Healthplex activities ----------
  await section('H', async () => {
    await open({ me: 'jacquie', time: at(WED), init: local(seedDocs()) });
    check('H with another gym (or none) there is no Healthplex category and no check-in', !(await has(page, '[data-a="filter"][data-cat="healthplex"]')) && !(await has(page, '.act.hp')) && !(await has(page, '#checkin')) && (await page.$$('.acts .act')).length === 35, String((await page.$$('.acts .act')).length));
    await ctx.close();
    await open({ me: 'jacquie', time: at(WED), init: local(seedDocs({ jGym: HP, jProfile: { move: { goalDays: 3, minMinutes: 10, protect: ['knee'] } } })) });
    await page.click('[data-a="filter"][data-cat="healthplex"]');
    const names = await page.$$eval('.acts .act.hp .an', els => els.map(e => e.textContent));
    check('H the Healthplex category shows for a profile whose gym is the Healthplex', names.length === 19 && ['Track walk', 'Track run/walk intervals', 'Lap swim, easy', 'Therapy pool walk', 'Recumbent bike, easy', 'Light machine circuit', 'Basketball shoot-around', 'Pickleball, racquetball or tennis together', 'BodyPump class', 'Indoor cycling class', 'HIIT class', 'Zumba class', 'Yoga class', 'Pilates class', 'Aquatic fitness class', 'Pilates Reformer', 'Dry sauna', 'Steam room', 'Whirlpool'].every(n => names.includes(n)), JSON.stringify(names));
    const tags = await page.$$eval('.acts .act.hp [data-tag]', els => els.map(e => e.dataset.tag + '=' + e.textContent));
    check('H classes carry the cost tag, and Pilates Reformer its own', tags.length === 8 && tags.filter(t => t.endsWith('=Optional · may cost extra, check your membership.')).length === 7 && tags.includes('hpreformer=Specialty class · extra fee.'), JSON.stringify(tags));
    check('H stress areas work: the track run is flagged for a protected knee', (await txt(page, '.act.hp[data-k="hprun"]')).includes('Go easy: knees') && !(await txt(page, '.act.hp[data-k="hptrack"]')).includes('Go easy'));
    const pick = await ML(page, () => { const M = window.MorningLaps, seen = {}; for (let i = 0; i < 600; i++) seen[M.surpriseActivity('jacquie')] = 1; return Object.keys(seen); });
    check('H Surprise me never picks a class or a recovery room (600 draws)', pick.length > 10 && !pick.some(k => /^hp(bodypump|cycle|hiit|zumba|yoga|pilates|aqua|reformer|sauna|steam|whirl)$/.test(k)) && pick.some(k => k.startsWith('hp')), JSON.stringify(pick.filter(k => k.startsWith('hp'))));
    // a tapped card flips to its details
    await page.click('.act.hp[data-k="hptrack"]'); await page.waitForSelector('[data-hpback="hptrack"]');
    const flip = await page.evaluate(() => { const b = document.querySelector('[data-hpback="hptrack"]'); return { cls: b.className, text: b.textContent, btns: Array.from(b.querySelectorAll('button')).map(x => x.textContent), dur: getComputedStyle(b).animationDuration }; });
    check('H a tapped Healthplex card flips to show its details, with Start and Log it', flip.cls.includes('flipin') && flip.text.includes('8 laps make a mile') && same(flip.btns, ['Log it', 'Start live', 'Close']) && parseFloat(flip.dur) <= 0.4, JSON.stringify(flip));
    await page.click('[data-a="filter-quick"]'); await page.click('[data-a="filter-quick"]');
    check('H the flip runs once per tap, not again on the next redraw', await page.evaluate(() => { const b = document.querySelector('[data-hpback="hptrack"]'); return !!b && !b.className.includes('flipin'); }));
    // laps convert to miles
    await page.click('[data-hpback="hptrack"] [data-a="act"]'); await page.waitForSelector('#actLaps');
    await fill(page, '#actLaps', 16);
    check('H laps convert to miles: 16 laps = 2.0 mi (8 laps = 1 mile)', (await txt(page, '#lapMiles')) === '16 laps = 2.0 mi' && await ML(page, () => window.MorningLaps.lapMiles(8) === 1 && window.MorningLaps.lapMiles(12) === 1.5));
    await fill(page, '#actMin', 32); await page.click('#actLog'); await page.waitForSelector('#ov', { state: 'hidden' });
    const tr = (await kv(page, 'profiles/jacquie/sessions/' + WED)).acts[0];
    check('H the track walk logs its minutes, with laps and miles in the note', tr.a === 'hptrack' && tr.min === 32 && tr.note === '16 laps (2.0 mi)' && tr.mv === true, JSON.stringify(tr));
    // recovery rooms
    check('H after a workout is logged: "Sauna, steam or whirlpool after?"', (await txt(page, '#heatChip')).includes('Sauna, steam or whirlpool after?'));
    const min0 = await ML(page, () => window.MorningLaps.dayInfo('jacquie', '2026-12-09').minutes), water0 = (await kv(page, 'profiles/jacquie/food/' + WED) || { water: 0 }).water;
    await page.click('[data-a="heat-open"]'); await page.waitForSelector('[data-a="heat-pick"]');
    check('H the chip opens the three rooms, with the safety line', same(await page.$$eval('[data-a="heat-pick"] .fn', els => els.map(e => e.textContent.replace(/^\S+ /, ''))), ['Dry sauna', 'Steam room', 'Whirlpool']) && (await txt(page, '#heatNote')) === 'Keep it to 10–15 minutes, drink water after, and get out if you feel dizzy or unwell. Skip it after drinking alcohol.');
    await page.click('[data-a="heat-pick"][data-k="hpsauna"]'); await page.waitForSelector('#actMin');
    check('H a recovery room defaults to 10 minutes', await val(page, '#actMin') === '10' && (await txt(page, '#heatNote')).startsWith('Keep it to 10–15 minutes'));
    for (let i = 0; i < 4; i++) await page.click('[data-a="act-min"][data-d="5"]');
    check('H and tops out at 20', await val(page, '#actMin') === '20');
    await page.click('#actLog'); await page.waitForSelector('#toast:not([hidden]) [data-a="water-bottle"]');
    const sa = (await kv(page, 'profiles/jacquie/sessions/' + WED)).acts[1];
    check('H sauna minutes log as recovery and do not count toward active minutes', sa.a === 'hpsauna' && sa.min === 20 && sa.mv === false && (await ML(page, () => window.MorningLaps.dayInfo('jacquie', '2026-12-09').minutes)) === min0 && !(await has(page, '#heatChip')));
    check('H right there it offers "+16.9 oz water"', (await txt(page, '#toast')).includes('+16.9 oz water'));
    await page.click('#toast [data-a="water-bottle"]'); await page.waitForFunction(d => { const f = JSON.parse(localStorage.getItem('ml.kv'))['profiles/jacquie/food/' + d]; return f && f.water > 0; }, WED);
    check('H the water button adds 16.9 oz', Math.abs((await kv(page, 'profiles/jacquie/food/' + WED)).water - water0 - 16.9) < 0.01);
    // classes and courts from the optional link
    await page.click('#ciChange'); await page.click('#ciExtra'); await page.waitForSelector('#hpExtra');
    check('H "Class or game (optional)" lists the classes and courts', (await page.$$('#hpExtra [data-a="hpextra-pick"]')).length === 10 && (await txt(page, '#hpExtra')).includes('Specialty class · extra fee.') && (await txt(page, '#ov')).includes('Never suggested'));
  });

  // ---------- 4: goals that fit inconsistent weeks ----------
  await section('G4', async () => {
    const wk = [lift(MON, 'fba', 3, FULLA()), tread(TUE, 3)];
    await open({ me: 'tyson', time: at(WED), init: local(seedDocs({ settings: full, thisWeek: wk })) });
    const s0 = await score(page, 'tyson'), g0 = await ML(page, () => { const g = window.MorningLaps.weekGoals('tyson', '2026-12-07'); return [g.goal, g.liftGoal, g.locked]; });
    await go(page, 'program');
    check('G the weekly lift goal is a setting: 2 or 3', same(await page.$$eval('#liftGoalRow [data-a="lift-goal"]', els => els.map(e => e.textContent + ':' + e.getAttribute('aria-pressed'))), ['2 lift days:false', '3 lift days:true']));
    await page.click('[data-a="lift-goal"][data-v="2"]'); await toastWith(page, 'Weekly lift goal: 2');
    await fill(page, '#goalIn', 4); await page.click('h1'); await page.waitForFunction(() => JSON.parse(localStorage.getItem('ml.settings')).goal === 4);
    const s1 = await score(page, 'tyson'), g1 = await ML(page, () => { const M = window.MorningLaps, g = M.weekGoals('tyson', '2026-12-07'), l = M.liveGoals('tyson'); return [g.goal, g.liftGoal, g.locked, l.goal, l.liftGoal]; });
    check('G this week\'s score does not move, and this week keeps 5 and 3', same(s0, s1) && same(g0, [5, 3, true]) && same(g1, [5, 3, true, 4, 2]) && /this week/i.test(await txt(page, '#liftGoalRow')), JSON.stringify([g0, g1, s0.total, s1.total, Object.keys(s0).filter(k => JSON.stringify(s0[k]) !== JSON.stringify(s1[k])), await txt(page, '#liftGoalRow')]));
    // next week: 4 and 2 lock, and two lift days give full lift credit
    const nextWk = { '2026-12-14': lift('2026-12-14', 'fbb', 3, FULLB()), '2026-12-15': tread('2026-12-15', 3), '2026-12-16': lift('2026-12-16', 'fba', 3, FULLA()), '2026-12-17': tread('2026-12-17', 3) };
    const more = 'var m=JSON.parse(localStorage.getItem("ml.sessions"));Object.assign(m,' + JSON.stringify(nextWk) + ');localStorage.setItem("ml.sessions",JSON.stringify(m));';
    const next = await carry(page, more); await ctx.close();
    await open({ me: 'tyson', time: at('2026-12-18'), init: next });
    const n = await ML(page, () => { const M = window.MorningLaps, g = M.weekGoals('tyson', '2026-12-14'), s = M.weekScore('tyson', '2026-12-14'), p = M.weekScore('tyson', '2026-12-07'); return { g: [g.goal, g.liftGoal, g.locked], move: s.move, full: s.moveFull, lifts: s.lifts, active: s.active, prev: p.total }; });
    check('G next week locks 4 activity days and 2 lift days', same(n.g, [4, 2, true]) && same([(await kv(page, 'profiles/tyson/weekgoals/2026-12-14')).goal, (await kv(page, 'profiles/tyson/weekgoals/2026-12-14')).liftGoal], [4, 2]), JSON.stringify(n.g));
    check('G next week\'s Move score gives full lift credit at 2 lift days', n.lifts === 2 && n.active === 4 && n.move === 50 && n.full === true && n.prev === s0.total, JSON.stringify(n));
    await ctx.close();
    await open({ me: 'tyson', time: at('2026-12-18'), init: local(seedDocs({ settings: Object.assign({ goal: 4 }, full), thisWeek: wk.concat(Object.values(nextWk)) })) });
    const c = await ML(page, () => { const s = window.MorningLaps.weekScore('tyson', '2026-12-14'); return [s.move, s.moveFull]; });
    check('G (the same week against a lift goal of 3 is not full: the setting is what changed it)', c[0] < 50 && c[1] === false, JSON.stringify(c));
    await ctx.close();
    // the nudge can raise the lift goal later: three weeks in a row with 3 lifts against a goal of 2
    const locks = {}; ['2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07'].forEach(ws => { locks['profiles/tyson/weekgoals/' + ws] = { ws, plan: 'program', goal: 6, liftGoal: 2, minMin: 10, kcal: 2000, lo: 1800, hi: 2200, waterOz: 80, protein: 120, placeholder: true, lockedAt: ws + 'T12:00:00.000Z' }; });
    await open({ me: 'tyson', time: at(WED), init: local(seedDocs({ settings: { split: 'full', liftGoal: 2, goal: 6 }, kv: locks })) });
    const nd = await ML(page, () => window.MorningLaps.goalNudge('tyson'));
    check('G the goal nudge can raise the lift goal later', !!nd && nd.kind === 'lift' && nd.to === 3 && (await txt(page, '#nudgeCard')).includes('Raise your lift goal to 3 lift days starting Monday?'), JSON.stringify(nd));
    await page.evaluate(() => document.querySelectorAll('#coach details').forEach(d => { d.open = true; })); await page.click('[data-a="nudge-yes"]'); await page.waitForFunction(() => JSON.parse(localStorage.getItem('ml.settings')).liftGoal === 3);
    check('G raising it changes the setting only: this week stays at 2', await ML(page, () => window.MorningLaps.weekGoals('tyson', '2026-12-07').liftGoal === 2 && window.MorningLaps.liveGoals('tyson').liftGoal === 3));
  });

  // ---------- 5: gym info, morning plan, missing machines ----------
  await section('M', async () => {
    await open({ me: 'tyson', time: at(WED), init: local(seedDocs({ settings: full })) });
    await go(page, 'program');
    check('M without the Healthplex as the gym there is no gym card', !(await has(page, '#gymInfo')) && !(await has(page, '#gymBanner')));
    await go(page, 'me'); await fill(page, '[data-form="gym"][data-k="place"]', HP); await page.click('[data-a="gym-save"]'); await toastWith(page, 'Gym set');
    check('M saving a new gym keeps the day it changed', (await kv(page, 'profiles/tyson')).placeSince === WED);
    await go(page, 'program');
    const card = await txt(page, '#gymInfo');
    check('M "Your gym" shows the Healthplex facts', ['Mon–Fri 5:15 a.m.–10 p.m.', 'Sat–Sun 7 a.m.–8 p.m.', '1/8 mile · 8 laps = 1 mile', '25-yard lap pool, 6 lanes', 'Therapy pool, about 90°F', 'Dry sauna, steam room and whirlpool', 'towels provided', 'pickleball gear', '6 indoor, 3 outdoor', '1 racquetball', '(317) 920-7400', 'Massage therapist', '3660 Guion Rd'].every(x => card.includes(x)), card);
    check('M with the line about hours', card.includes('Hours as of Nov 2026. Check the Healthplex site before holidays.'));
    check('M the first-week banner shows once, on Program and Train', (await txt(page, '#gymBanner')) === 'First week at the Healthplex: if a machine isn\'t there, use ··· → Not at my gym.' && (await page.$$('#gymBanner')).length === 1);
    check('M no Healthplex artwork is used: no images at all on the page', (await page.$$('#main img, #main picture, #wm img')).length === 0 && !/healthplex[^"']*\.(png|svg|jpg)/i.test(await page.content()));
    await go(page, 'train');
    const plan = await page.evaluate(() => { const d = document.getElementById('morningPlan'); d.open = true; return d.textContent; });
    check('M the morning plan is the Healthplex one for a full-body day', ['6:00', 'Up. Water, small bite.', '6:20', 'At the Healthplex. Warm-up 5–10 min.', '6:30', 'Full Body A (about 40 min, or 25 for express).', '7:15', 'Optional sauna or steam, 10 min. Drink water.', '7:35', 'Shower. Out the door by 8:15, at IMS by 9.', 'Weekdays the Healthplex opens at 5:15'].every(x => plan.includes(x)), plan);
    await page.click('[data-a="ci-pick"][data-v="tired"]');
    const p2 = await page.evaluate(() => document.getElementById('morningPlan').textContent);
    await page.click('[data-a="ci-pick"][data-v="sore"]');
    const p3 = await page.evaluate(() => document.getElementById('morningPlan').textContent);
    check('M the plan follows the check-in: cardio and recovery days get their own short version', p2.includes('Easy cardio, 20 to 30 min') && !p2.includes('Full Body A') && p3.includes('10 easy minutes on the track or in the therapy pool, then stretch') && p3.includes('Sauna, steam or whirlpool, 10 min'), p2 + ' | ' + p3);
    await page.click('[data-a="ci-back"]');
    // "Not at my gym"
    await page.click('[data-menu="squat"]'); await page.waitForSelector('.menu[data-menufor="squat"]');
    check('M each exercise\'s ··· menu has "Not at my gym"', (await txt(page, '.menu [data-act="notgym"]')).startsWith('Not at my gym') && (await txt(page, '.menu [data-act="notgym"]')).includes('Leg press machine'));
    await page.click('.menu [data-act="notgym"]');
    const t = await toastWith(page, 'replaces');
    check('M it confirms with a toast', t.includes('Leg press machine replaces Barbell back squat in every future workout'), t);
    await page.waitForSelector('.ex[data-ex="legpress"]');
    check('M it saves a default swap and never drops an exercise', (await settings(page)).swaps.squat === 'legpress' && same(await page.$$eval('.ex[data-ex]', els => els.map(e => e.dataset.ex)), ['legpress', 'dbbench', 'latpull', 'dbshoulder', 'legcurl', 'legraise']));
    await page.reload(); await page.waitForSelector('.ex[data-ex="legpress"]'); await settled(page);
    check('M the default swap survives a reload', (await settings(page)).swaps.squat === 'legpress' && (await page.$$('.ex[data-ex]')).length === 6 && (await txt(page, '.ex[data-ex="legpress"]')).includes('3 sets'));
    await page.click('[data-menu="legraise"]'); await page.waitForSelector('.menu[data-menufor="legraise"]');
    check('M an exercise with no stand-in says so instead of dropping out', await page.$eval('.menu [data-act="notgym"]', b => b.disabled && b.textContent.includes('no stand-in')));
    await ctx.close();
    await open({ me: 'tyson', time: at(SAT), init: local(seedDocs({ settings: full, tGym: HP, tSince: '2026-12-01' })) });
    const wk = await page.evaluate(() => document.getElementById('morningPlan').textContent);
    check('M on a weekend the plan notes the gym opens at 7; after the first week the banner is gone', wk.includes('Weekend: the Healthplex opens at 7') && !(await has(page, '#gymBanner')), wk.slice(-160));
  });

  // ---------- 6: Jacquie at the Healthplex ----------
  await section('J', async () => {
    await open({ me: 'jacquie', time: at(WED), init: local(seedDocs()) });
    check('J her gym is not set in the data, so Train has no check-in yet', !(await has(page, '#checkin')) && !(await kv(page, 'profiles/jacquie')).place);
    await go(page, 'me');
    check('J Me has a one-tap "Indianapolis Healthplex" choice next to the Gym field', (await txt(page, '#gymCard #gymHp')) === HP);
    await page.click('#gymHp'); await toastWith(page, 'Gym set to Indianapolis Healthplex');
    const pr = await kv(page, 'profiles/jacquie');
    check('J one tap sets her gym', pr.place === HP && pr.placeSince === WED && !(await has(page, '#gymHp')) && (await txt(page, '#todayLine')).includes(HP));
    await go(page, 'train');
    const cards = await page.$$eval('#checkin .cic', els => els.map(e => e.dataset.v + ':' + e.querySelector('b').textContent));
    check('J her check-in now appears, with the gentler choices and the optional class link', same(cards, ['good:Feeling good', 'low:Low energy', 'sore:Sore or run down', 'rest:Not today']) && (await txt(page, '#ciExtra')) === 'Class or game (optional)', JSON.stringify(cards));
    const s1 = await sug();
    check('J not active yesterday: "Feeling good" is suggested', s1[0] === 'good', JSON.stringify(s1));
    await page.click('[data-a="ci-pick"][data-v="good"]');
    const pv = await page.evaluate(() => ({ time: document.getElementById('ciTime').textContent, moves: Array.from(document.querySelectorAll('#ciMoves li')).map(l => l.textContent) }));
    check('J "Feeling good" is about 25 minutes: track walk 10, then the light machine circuit 15', pv.time === 'about 25 min' && same(pv.moves, ['Track walk · 10 min', 'Light machine circuit · 15 min']), JSON.stringify(pv));
    // the guided session: laps, then stations, logged as one activity
    await page.click('#ciStart'); await page.waitForSelector('#wm:not([hidden])'); if (await wmv() === 'start') await page.click('#wmStartSeq'); await waitView('main');
    for (let i = 0; i < 6; i++) await page.click('#wmLap');
    await page.clock.fastForward(10 * 60000); await page.click('#wmNext');
    check('J the second part is the machine circuit, with a button per machine', same(await page.$$eval('#wmStations button span', els => els.map(e => e.textContent)), ['Leg press', 'Seated row', 'Chest press', 'Lat pulldown']));
    for (const k of [0, 0, 1, 2, 3]) await page.click('#wmStations [data-k="' + k + '"]');
    await page.clock.fastForward(15 * 60000); await page.click('#wmFinish'); await waitView('finish');
    const sum = await txt(page, '#wmSummary');
    await page.click('#wmSave'); await page.waitForSelector('#wmDoneBtn');
    const rec = await kv(page, 'profiles/jacquie/sessions/' + WED), a = rec.acts[0];
    check('J finishing logs the right minutes as one activity, with her check-in', rec.acts.length === 1 && a.min === 25 && a.a === 'hptrack' && a.name === 'Track walk + Light machine circuit' && a.mv === true && rec.checkin === 'good' && rec.kind === 'activity' && sum.includes('25 min'), JSON.stringify(rec.acts));
    check('J station sets and laps are kept in the activity\'s note', a.note === 'Track walk 10 min, 6 laps (0.75 mi) · Light machine circuit 15 min: leg press 2, seated row 1, chest press 1, lat pulldown 1', a.note);
    check('J the day counts at her minutes-to-count', await ML(page, () => window.MorningLaps.dayInfo('jacquie', '2026-12-09').active === true) && (await txt(page, '#wmPoints')).includes('→'));
    await page.click('#wmDoneBtn'); await page.waitForSelector('#wm', { state: 'hidden' });
    await ctx.close();
    // suggestions skip protected areas and pain-flagged activities
    const pain = { ['profiles/jacquie/sessions/' + plus(WED, -9)]: day(plus(WED, -9), [act(plus(WED, -9), 'hppool', 'Therapy pool walk', 15, { hurt: true, note: 'hip' })]), ['profiles/jacquie/sessions/' + plus(WED, -6)]: day(plus(WED, -6), [act(plus(WED, -6), 'hppool', 'Therapy pool walk', 15, { hurt: true, note: 'hip again' })]) };
    await open({ me: 'jacquie', time: at(WED), init: local(seedDocs({ jGym: HP, jProfile: { move: { goalDays: 3, minMinutes: 10, protect: ['shoulder'] } }, kv: pain })) });
    const s2 = await sug();
    check('J with shoulders protected, the machine circuit is not suggested: the next gentlest is, and it says why', s2[0] === 'low' && s2[1] === 'Light machine circuit loads shoulders, which you asked to go easy on. Low energy is the next gentlest.', JSON.stringify(s2));
    await page.click('[data-a="ci-pick"][data-v="low"]');
    check('J and inside it the pain-flagged pool walk gives way to the bike, with the reason', same(await page.$$eval('#ciMoves li', els => els.map(l => l.textContent)), ['Recumbent bike, easy · 15 min']) && (await txt(page, '#ciNote')) === 'Recumbent bike, easy instead: Therapy pool walk has hurt 2 times lately.', await txt(page, '#ciNote'));
    await page.click('[data-a="ci-pick"][data-v="good"]');
    check('J every choice can still be tapped: the protected one opens with a caution', (await txt(page, '#ciWarn')).includes('loads shoulders') && await has(page, '#ciStart'));
    await page.click('[data-a="ci-back"]');
    // low energy: one timed stage, one activity
    await page.click('[data-a="ci-pick"][data-v="low"]'); await page.click('#ciStart'); await page.waitForSelector('#wm:not([hidden])'); if (await wmv() === 'start') await page.click('#wmStartSeq'); await waitView('main');
    await page.click('#wmToggle'); await page.clock.fastForward(15 * 60000); await page.click('#wmFinish'); await waitView('finish'); await page.click('#wmSave'); await page.waitForSelector('#wmDoneBtn');
    const lo = await kv(page, 'profiles/jacquie/sessions/' + WED);
    check('J "Low energy" logs 15 minutes as one activity', lo.acts.length === 1 && lo.acts[0].a === 'hpbike' && lo.acts[0].min === 15 && lo.checkin === 'low', JSON.stringify(lo.acts));
    await ctx.close();
    const rule = async (extra, want) => { await open({ me: 'jacquie', time: at(WED), init: local(seedDocs({ jGym: HP, kv: extra })) }); const s = await sug(); await ctx.close(); return s && s[0] === want; };
    check('J sore last time: recovery. Active yesterday: low energy', await rule({ ['profiles/jacquie/sessions/' + TUE]: day(TUE, [act(TUE, 'walkeasy', 'Easy walk', 20)], { checkin: 'sore' }) }, 'sore') && await rule({ ['profiles/jacquie/sessions/' + TUE]: day(TUE, [act(TUE, 'walkeasy', 'Easy walk', 20)]) }, 'low') && await rule({ ['profiles/jacquie/sessions/' + TUE]: day(TUE, [act(TUE, 'walkeasy', 'Easy walk', 20, { hurt: true })]) }, 'sore'));
  });

  // ---------- 7: workout mode ----------
  await section('W', async () => {
    const seed = () => local(seedDocs(Object.assign({ settings: full }, hpT)));
    await open({ me: 'tyson', time: at(WED), init: seed() });
    // the start sequence
    await page.click('[data-a="ci-pick"][data-v="strong"]'); await page.click('#ciStart'); await page.waitForSelector('#wmStartSeq'); await page.waitForTimeout(450); // the zoom has finished
    const box = await page.evaluate(() => { const w = document.getElementById('wm'), r = w.getBoundingClientRect(), cs = getComputedStyle(w); return { pos: cs.position, w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight, z: Number(cs.zIndex), inMain: !!w.closest('#main'), lights: document.querySelectorAll('.wm-lights i').length, flag: !!document.querySelector('#wm .wm-flag.green'), go: document.querySelector('.wm-gotext').textContent }; });
    check('W workout mode is its own element outside #main, fixed and filling the view', box.pos === 'fixed' && box.w === box.vw && box.h === box.vh && box.z > 30 && !box.inMain, JSON.stringify(box));
    check('W the start: three start lights, a green flag, then GO', box.lights === 3 && box.flag && box.go === 'GO');
    await page.click('#wmStartSeq');
    check('W the start sequence is skipped by a tap', await wmv() === 'main');
    await page.click('[data-a="wm-quit"]'); await page.click('#wmQuitKeep'); await page.waitForSelector('#wm', { state: 'hidden' });
    await page.click('[data-a="ci-pick"][data-v="strong"]'); await page.click('#ciStart'); await page.waitForSelector('#wmStartSeq'); await page.clock.fastForward(2600); await waitView('main');
    check('W left alone, the start sequence ends by itself after about 2.5 seconds', await wmv() === 'main');
    // the warm-up, then a lift screen
    await page.evaluate(() => { window.__mut = 0; new MutationObserver(m => { window.__mut += m.length; }).observe(document.getElementById('main'), { childList: true, subtree: true, attributes: true, characterData: true }); });
    await page.click('#wmWarmLog');
    const lift1 = await page.evaluate(() => ({ name: document.getElementById('wmName').textContent, target: document.getElementById('wmTarget').textContent, last: document.getElementById('wmLast').textContent, demo: !!document.querySelector('#wmDemo svg.mv-squat'), cues: document.querySelectorAll('#wmCues li').length, mistake: document.getElementById('wmMistake').textContent, equip: document.getElementById('wmEquip').textContent, pips: document.querySelectorAll('#wmPips .wm-pip').length, w: document.getElementById('wmW').textContent, r: document.getElementById('wmR').textContent, log: document.getElementById('wmLog').textContent, laps: document.querySelectorAll('.wm-lapmark').length, eyebrow: document.querySelector('#wm .eyebrow').textContent, clock: document.getElementById('wmClock').textContent }));
    check('W a lift screen: name, target, last time', lift1.name === 'Barbell back squat' && lift1.target === '3 × 6–10 · 155 lb' && lift1.last.includes('Fri Dec 4: 145 lb × 10 / 10 / 10') && lift1.eyebrow === 'Lift 1 of 6 · Full Body A', JSON.stringify(lift1));
    check('W a looping demo, 3 form cues and 1 common mistake, and the equipment', lift1.demo && lift1.cues === 3 && lift1.mistake.startsWith('Watch for:') && lift1.mistake.length > 20 && lift1.equip.includes('Squat rack'), JSON.stringify(lift1));
    check('W big steppers pre-filled from the suggestion and last time, and a "Log set" button', lift1.w === '155' && lift1.r === '10' && lift1.log === 'Log set 1' && lift1.pips === 3);
    check('W a race-track strip with one lap per exercise, and the elapsed time', lift1.laps === 6 && /^\d+:\d\d$/.test(lift1.clock) && await has(page, '#wmCar .av'));
    const sizes = await page.evaluate(() => Array.from(document.querySelectorAll('#wm button')).map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), b.textContent.slice(0, 12)]; }).filter(x => x[0] < 44 || x[1] < 44));
    check('W every button is at least 44 px', sizes.length === 0, JSON.stringify(sizes));
    await page.click('#wm [data-a="wm-w"][data-d="1"]');
    check('W the weight stepper moves by the exercise\'s own step (10 lb for the squat)', (await txt(page, '#wmW')) === '165');
    await page.click('#wm [data-a="wm-w"][data-d="-1"]'); await stepTo('wmR', 'wm-r', 8);
    const car0 = await page.evaluate(() => document.getElementById('wmCar').getBoundingClientRect().left);
    await page.click('#wmLog'); await waitView('rest');
    const rest = await page.evaluate(() => ({ ring: !!document.querySelector('#wmRing #wmRingFg'), time: document.getElementById('wmRestTime').textContent, next: document.getElementById('wmNextUp').textContent, add: !!document.getElementById('wmRestAdd'), skip: !!document.getElementById('wmRestSkip') }));
    check('W logging a set starts the rest timer as a big ring, with +15 s and Skip, and a preview of what is next', rest.ring && rest.time === '1:30' && rest.add && rest.skip && rest.next.includes('Barbell back squat') && rest.next.includes('Set 2 of 3'), JSON.stringify(rest));
    await page.click('#wmRestAdd');
    check('W +15 s adds 15 seconds', (await txt(page, '#wmRestTime')) === '1:45');
    await page.clock.fastForward(30000); await page.waitForFunction(() => document.getElementById('wmRestTime') && document.getElementById('wmRestTime').textContent === '1:15');
    check('W the ring counts down', Number(await page.$eval('#wmRingFg', c => c.getAttribute('stroke-dashoffset'))) > 50);
    await page.click('#wmRestSkip'); await waitView('main');
    const after1 = await page.evaluate(() => ({ pips: Array.from(document.querySelectorAll('#wmPips .wm-pip')).map(p => p.className.includes(' on') ? p.textContent : '-'), log: document.getElementById('wmLog').textContent, car: document.getElementById('wmCar').getBoundingClientRect().left }));
    check('W each logged set fills a pip, and the avatar moves along the track', same(after1.pips, ['8', '-', '-']) && after1.log === 'Log set 2' && after1.car > car0, JSON.stringify(after1));
    await logSets([8, 7]);
    check('W after the last set it rests, then moves to the next lift', (await txt(page, '#wmName')) === 'Dumbbell bench press' && (await txt(page, '#wmTarget')) === '3 × 8–12 · 30 lb each hand');
    // tap a pip to edit or delete
    await page.click('[data-a="wm-prev"]'); await page.click('#wmPips [data-i="2"]');
    check('W tapping a pip opens that set to change or delete', (await txt(page, '#wmLog')) === 'Update set 3' && (await txt(page, '#wmR')) === '7' && await has(page, '#wmDel'));
    await stepTo('wmR', 'wm-r', 9); await page.click('#wmLog');
    check('W an edited set is updated in place', same(await page.$$eval('#wmPips .wm-pip', els => els.map(p => p.textContent)), ['8', '8', '9']) && (await txt(page, '#wmDone')).includes('All 3 sets logged'));
    await page.click('#wmPips [data-i="2"]'); await page.click('#wmDel');
    check('W a deleted set is unlogged again', same(await page.$$eval('#wmPips .wm-pip', els => els.map(p => p.className.includes(' on') ? p.textContent : '-')), ['8', '8', '-']) && (await txt(page, '#wmLog')) === 'Log set 3');
    await logSets([8]);
    check('W nothing re-renders the page behind it while tapping and logging', (await page.evaluate(() => window.__mut)) === 0, String(await page.evaluate(() => window.__mut)));
    // leave and resume
    const dr = await page.evaluate(() => JSON.parse(localStorage.getItem('ml.drafts'))['2026-12-09']);
    check('W sets go into the same draft the lifting log uses', same(dr.ex.squat, { w: '155', reps: ['8', '8', '8'] }) && dr.tm.minutes === '5' && dr.checkin === 'strong' && !('wmSets' in dr), JSON.stringify(dr.ex));
    await page.click('[data-a="wm-quit"]');
    check('"End early" offers save, keep, or discard after a confirm step', same(await page.$$eval('#wm .wm-center button', els => els.map(b => b.textContent)), ['Save what\'s logged', 'Keep it and leave', 'Discard…', 'Back to the workout']));
    await page.click('#wmQuitDrop');
    check('W discard needs a second tap', (await txt(page, '#wmQuitDrop')) === 'Tap again to discard everything' && await wmv() === 'quit' && !!(await page.evaluate(() => JSON.parse(localStorage.getItem('ml.drafts'))['2026-12-09'])));
    await page.click('#wmQuitKeep'); await page.waitForSelector('#wm', { state: 'hidden' });
    check('W leaving mid-workout: Train shows "Resume workout", and the normal log has the sets', (await txt(page, '#wmResume')) === 'Resume workout' && await val(page, '#r-squat-2') === '8' && await val(page, '#w-squat') === '155' && (await txt(page, '#wmStart')) === 'Resume workout');
    await page.reload(); await page.waitForSelector('#wmResume'); await settled(page);
    await page.click('#wmResume'); await waitView('main');
    check('W resuming after a reload keeps every set and opens on the next unfinished lift, with no start sequence', (await txt(page, '#wmName')) === 'Dumbbell bench press' && !(await has(page, '#wmStartSeq')));
    await page.click('[data-a="wm-prev"]');
    check('W (the squat still shows its three sets)', same(await page.$$eval('#wmPips .wm-pip', els => els.map(p => p.textContent)), ['8', '8', '8']));
    await page.click('#wmNext');
    // swap inside workout mode
    await page.click('[data-a="wm-swap"]'); await page.waitForSelector('#wmSwaps');
    check('W Swap lists the stand-ins', same(await page.$$eval('#wmSwaps button', els => els.map(b => b.textContent)), ['Chest press machine']));
    await page.click('#wmSwaps button');
    check('W a swap changes this lift, with its own suggestion', (await txt(page, '#wmName')).startsWith('Chest press machine') && (await txt(page, '#wmName')).includes('swapped') && (await txt(page, '#wmTarget')).includes('100 lb'), await txt(page, '#wmTarget'));
    await page.click('[data-a="wm-swap"]'); await page.click('#wmSwaps button[data-to="dbbench"]');
    await logSets([10, 10, 10]);
    // finish: the same save, the same credit
    const sc0 = await score(page, 'tyson');
    await page.click('#wmFinish'); await waitView('finish');
    const fin = await page.evaluate(() => ({ flag: !!document.querySelector('#wm .wm-flag.chk'), sum: document.getElementById('wmSummary').textContent, ups: (document.getElementById('wmUps') || {}).textContent || '', save: !!document.getElementById('wmSave') }));
    check('W the finish: a checkered flag and a summary of sets, pounds lifted, increases and minutes', fin.flag && fin.sum.includes('Sets6') && fin.sum.includes('Total lifted' + (155 * 24 + 30 * 2 * 30).toLocaleString('en-US') + ' lb') && fin.sum.includes('Minutes23') && fin.sum.includes('Counts as a lift day') && fin.ups.includes('Barbell back squat 145 → 155 lb') && fin.save, JSON.stringify(fin));
    await page.click('#wmSave'); await page.waitForSelector('#wmDoneBtn');
    const rec = await ses(page, WED), sc1 = await score(page, 'tyson'), pts = await txt(page, '#wmPoints');
    check('W a finished lift gets lift-day credit exactly as a normal save would', rec.kind === 'strength' && rec.qualifies === true && rec.day === 'fba' && sc1.lifts === sc0.lifts + 1 && sc1.total > sc0.total && !(await page.evaluate(() => (JSON.parse(localStorage.getItem('ml.drafts') || '{}'))['2026-12-09'])), JSON.stringify([rec.qualifies, sc0.lifts, sc1.lifts]));
    check('W then the week\'s points before and after, and the sauna chip', pts.includes(sc0.total + ' → ' + sc1.total) && (await txt(page, '#wmHeat')).includes('Sauna, steam or whirlpool after?'), pts);
    await page.click('#wmDoneBtn'); await page.waitForSelector('#wm', { state: 'hidden' });
    check('W closing workout mode redraws the page, with the saved day', (await txt(page, '#ciDone')) === 'Feeling strong · Full Body A' && (await txt(page, '#whyLine')).includes('Counted Full Body A day. Next: Full Body B.'), await txt(page, '#whyLine'));
    const viaWm = rec; await ctx.close();
    // the same inputs through the normal log
    await open({ me: 'tyson', time: at(WED), init: seed() });
    await fill(page, '#tmMin', 5); await fill(page, '#w-squat', 155); for (let i = 0; i < 3; i++) await fill(page, '#r-squat-' + i, 8); await fill(page, '#w-dbbench', 30); for (let i = 0; i < 3; i++) await fill(page, '#r-dbbench-' + i, 10);
    await page.evaluate(() => { const b = document.querySelector('#rest:not([hidden]) [data-a="timer-x"]'); if (b) b.click(); }); await page.click('h1'); await page.click('#saveBtn');
    await page.waitForFunction(d => { const r = JSON.parse(localStorage.getItem('ml.sessions'))[d]; return r && r.kind === 'strength'; }, WED);
    const viaLog = await ses(page, WED), strip = r => { const c = Object.assign({}, r); ['savedAt', 'updatedAt', 'progAt', 'checkin'].forEach(k => delete c[k]); return c; };
    check('W sets logged in workout mode match what the normal log saves for the same inputs', same(strip(viaWm), strip(viaLog)) && viaWm.checkin === 'strong' && !viaLog.checkin, JSON.stringify(strip(viaWm)) + ' vs ' + JSON.stringify(strip(viaLog)));
    await ctx.close();
    // "Not at my gym" from inside, and End early: save what's logged
    await open({ me: 'tyson', time: at(WED), init: seed() });
    await page.click('#wmStart'); await page.waitForSelector('#wm:not([hidden])'); if (await wmv() === 'start') await page.click('#wmStartSeq'); await waitView('main');
    await page.click('[data-a="wm-next"]'); await page.click('#wmNotGym'); await page.waitForFunction(() => document.getElementById('wmName').textContent.startsWith('Leg press machine'));
    check('W "Not at my gym" inside workout mode swaps the default and keeps the slot', (await settings(page)).swaps.squat === 'legpress' && (await txt(page, '#wm .eyebrow')) === 'Lift 1 of 6 · Full Body A');
    await logSets([10]); await page.click('[data-a="wm-quit"]'); await page.click('#wmQuitSave'); await page.waitForSelector('#wmDoneBtn');
    const part = await ses(page, WED);
    check('W "End early, save what\'s logged" follows the normal partial rules', part.kind === 'strength' && part.qualifies === false && part.complete === false && same(part.ex.legpress.reps, [10, null, null]) && !part.checkin, JSON.stringify(part.ex));
    await ctx.close();
    // the track counter
    await open({ me: 'tyson', time: at(WED), init: seed() });
    await watchWrites(page);
    await page.click('[data-a="ci-pick"][data-v="tired"]'); await page.click('#ciStart'); await page.waitForSelector('#wm:not([hidden])'); if (await wmv() === 'start') await page.click('#wmStartSeq'); await waitView('main');
    check('W the track screen: a big timer and a tap-per-lap counter', (await txt(page, '#wmName')) === 'Track walk' && (await txt(page, '#wmStageTime')) === '0:00' && (await txt(page, '#wmLap')) === 'Lap done' && (await txt(page, '#wmMiles')) === '0.0');
    for (let i = 0; i < 8; i++) await page.click('#wmLap');
    await page.clock.fastForward(16 * 60000);
    for (let i = 0; i < 8; i++) await page.click('#wmLap');
    await page.waitForFunction(() => document.getElementById('wmPace').textContent !== '–');
    check('W the lap counter shows 2.0 miles at 16 laps, with pace', (await txt(page, '#wmLaps')) === '16' && (await txt(page, '#wmMiles')) === '2.0' && (await txt(page, '#wmPace')) === '8:00' && (await txt(page, '#wmStageTime')) === '16:00', await txt(page, '#wmLapStats'));
    await page.click('[data-a="wm-quit"]'); await page.click('#wmQuitKeep'); await page.waitForSelector('#wm', { state: 'hidden' });
    check('W leaving a timed session writes nothing to the log and offers Resume', (await writes(page)).length === 0 && (await txt(page, '#wmResume')) === 'Resume workout');
    await page.reload(); await page.waitForSelector('#wmResume'); await settled(page); await page.click('#wmResume'); await waitView('main');
    check('W resuming keeps the laps and the time', (await txt(page, '#wmLaps')) === '16' && (await txt(page, '#wmStageTime')) === '16:00');
    await page.click('#wmFinish'); await waitView('finish'); await page.click('#wmSave'); await page.waitForSelector('#wmDoneBtn');
    const trk = await ses(page, WED);
    check('W finishing logs the minutes as an activity, with laps and miles in the note, and the check-in', trk.kind === 'activity' && trk.acts.length === 1 && trk.acts[0].a === 'hptrack' && trk.acts[0].min === 16 && trk.acts[0].note === '16 laps (2.0 mi)' && trk.checkin === 'tired', JSON.stringify(trk));
    await ctx.close();
  });
  await section('W2', async () => { // the other screens
    const seed = () => local(seedDocs(Object.assign({ settings: full }, hpT)));
    const start = async (choice, opt) => { await page.click('[data-a="ci-pick"][data-v="' + choice + '"]'); if (opt) await page.click('[data-a="ci-opt"][data-v="' + opt + '"]'); await page.click('#ciStart'); await page.waitForSelector('#wm:not([hidden])'); if (await wmv() === 'start') await page.click('#wmStartSeq'); await waitView('main'); };
    await open({ me: 'tyson', time: at(WED), init: seed() });
    await start('tired', 'hpswim');
    for (let i = 0; i < 4; i++) await page.click('#wmLap');
    check('W lap swim: a tap-per-length counter, 25 yards each', (await txt(page, '#wmName')) === 'Lap swim, easy' && (await txt(page, '#wmLaps')) === '4' && (await txt(page, '#wmMiles')) === '100' && (await txt(page, '#wmLap')) === 'Length done');
    await page.click('[data-a="wm-quit"]'); await page.click('#wmQuitDrop'); await page.click('#wmQuitDrop'); await page.waitForSelector('#wm', { state: 'hidden' });
    check('W discarding a session leaves nothing behind', (await page.evaluate(() => localStorage.getItem('ml.wm'))) === 'null' && !(await has(page, '#wmResume')) && (await ses(page, WED)) === null);
    await start('tired', 'treadmill');
    check('W treadmill: a timer with optional intervals', (await txt(page, '#wmName')) === 'Treadmill (Fitness+)' && (await txt(page, '#wmIv')).includes('1 min hard, 2 easy') && (await txt(page, '#wmSeg')).startsWith('Target 25 min'));
    await page.click('#wmIv'); await page.click('#wmToggle'); await page.clock.fastForward(30000);
    const seg1 = await txt(page, '#wmSeg'); await page.clock.fastForward(60000); await page.waitForFunction(() => document.getElementById('wmSeg').textContent.startsWith('Easy'));
    check('W intervals: 1 minute hard, then 2 minutes easy', seg1.startsWith('Hard · 0:30') && (await txt(page, '#wmSeg')).startsWith('Easy · 1:30'), seg1 + ' | ' + await txt(page, '#wmSeg'));
    await page.clock.fastForward(18.5 * 60000); await page.click('#wmFinish'); await waitView('finish'); await page.click('#wmSave'); await page.waitForSelector('#wmDoneBtn');
    const tm = await ses(page, WED);
    check('W the treadmill finishes as the lifting log\'s own treadmill day, with the check-in', tm.kind === 'cardio' && tm.treadmill.minutes === 20 && tm.checkin === 'tired' && !tm.acts, JSON.stringify(tm));
    await ctx.close();
    // recovery: walk, stretch, heat
    await open({ me: 'tyson', time: at(WED), init: seed() });
    await start('sore', 'hppool');
    check('W recovery starts with 10 easy minutes: therapy pool walk', (await txt(page, '#wmName')) === 'Therapy pool walk' && (await txt(page, '#wm .eyebrow')).startsWith('Part 1 of 3'));
    await page.click('#wmToggle'); await page.clock.fastForward(10 * 60000); await page.click('#wmNext');
    const st = await page.evaluate(() => ({ n: document.getElementById('wmStretchN').textContent, name: document.getElementById('wmStretchName').textContent, cue: document.getElementById('wmStretchCue').textContent, time: document.getElementById('wmStageTime').textContent, all: window.MorningLaps.STRETCHES.map(s => [s.name, s.sec]) }));
    check('W a guided stretch sequence: each stretch with its own timer and one short cue', st.n === 'Stretch 1 of ' + st.all.length && st.name === st.all[0][0] && st.cue.length > 10 && st.cue.length <= 75 && st.time === '0:' + String(st.all[0][1]).padStart(2, '0') && st.all.length >= 6, JSON.stringify(st));
    await page.click('#wmToggle'); await page.clock.fastForward(st.all[0][1] * 1000 + 500); await page.waitForFunction(n => document.getElementById('wmStretchName') && document.getElementById('wmStretchName').textContent === n, st.all[1][0]);
    check('W the next stretch starts when the timer runs out', (await txt(page, '#wmStretchN')).startsWith('Stretch 2 of'));
    await page.click('#wmStretchNext'); check('W "Next stretch" skips ahead', (await txt(page, '#wmStretchName')) === st.all[2][0]);
    await page.click('#wmNext');
    const heat = await page.evaluate(() => ({ rooms: Array.from(document.querySelectorAll('#wmRooms button')).map(b => b.textContent), time: document.getElementById('wmStageTime').textContent, note: document.getElementById('wmHeatNote').textContent }));
    check('W then a sauna, steam or whirlpool timer, 10 minutes by default, with the safety line', same(heat.rooms, ['Dry sauna', 'Steam room', 'Whirlpool']) && heat.time === '10:00' && heat.note.startsWith('Keep it to 10–15 minutes'), JSON.stringify(heat));
    await page.click('#wmRooms [data-k="hpsteam"]'); await page.click('#wmToggle'); await page.clock.fastForward(10 * 60000 + 600); await page.waitForSelector('#wmWater');
    check('W the timer ends with the water reminder', (await txt(page, '#wmHeatOver')).includes('drink water') && (await txt(page, '#wmWater')) === '+16.9 oz water');
    await page.click('#wmWater'); await page.waitForFunction(d => { const f = (JSON.parse(localStorage.getItem('ml.kv')) || {})['profiles/tyson/food/' + d]; return f && f.water > 16; }, WED);
    check('W and its button adds 16.9 oz', Math.abs((await kv(page, 'profiles/tyson/food/' + WED)).water - 16.9) < 0.01 && await page.$eval('#wmWater', b => b.disabled));
    await page.click('#wmFinish'); await waitView('finish'); await page.click('#wmSave'); await page.waitForSelector('#wmDoneBtn');
    const rc = await ses(page, WED);
    check('W recovery logs the walk and stretch as one activity and the steam room as recovery', rc.acts.length === 2 && rc.acts[0].a === 'hppool' && rc.acts[0].name === 'Therapy pool walk + Stretch' && rc.acts[0].min === 11 && rc.acts[0].mv === true && rc.acts[1].a === 'hpsteam' && rc.acts[1].min === 10 && rc.acts[1].mv === false && rc.checkin === 'sore' && !(await has(page, '#wmHeat')), JSON.stringify(rc.acts));
    await ctx.close();
    // a Healthplex activity straight from the menu, a class with its tag
    await open({ me: 'jacquie', time: at(WED), init: local(seedDocs({ jGym: HP })) });
    await page.click('[data-a="filter"][data-cat="healthplex"]'); await page.click('.act.hp[data-k="hpzumba"]'); await page.click('[data-hpback="hpzumba"] [data-a="hp-start"]'); await page.waitForSelector('#wm:not([hidden])'); if (await wmv() === 'start') await page.click('#wmStartSeq'); await waitView('main');
    check('W a Healthplex activity opens in workout mode from its card; a class keeps its tag', (await txt(page, '#wmName')) === 'Zumba class' && (await txt(page, '#wmClsTag')) === 'Optional · may cost extra, check your membership.');
    await page.click('[data-a="wm-quit"]'); await page.click('#wmQuitKeep'); await page.waitForSelector('#wm', { state: 'hidden' });
    check('W leaving with nothing done leaves nothing to resume', !(await has(page, '#wmResume')));
    await ctx.close();
    // full screen and wake lock refused: quietly ignored
    await open({ me: 'tyson', time: at(WED), init: seed() + ';window.__fs=0;Element.prototype.requestFullscreen=function(){window.__fs++;return Promise.reject(new TypeError("not allowed"));};try{Object.defineProperty(navigator,"wakeLock",{configurable:true,get:function(){return{request:function(){window.__wl=(window.__wl||0)+1;return Promise.reject(new DOMException("no","NotAllowedError"));}};}});}catch(e){}' });
    await start('strong');
    check('W Start tries full screen and a wake lock, and a refusal is quietly ignored', (await page.evaluate(() => [window.__fs, window.__wl])).join() === '1,1' && await wmv() === 'main' && (await txt(page, '#wmName')) === 'Warm-up');
  });

  // ---------- 8: animations, and reduced motion ----------
  await section('A', async () => {
    const seed = () => local(seedDocs(Object.assign({ settings: full }, hpT)));
    await open({ me: 'tyson', time: at(WED), init: seed() });
    await page.evaluate(() => { window.__anims = []; document.addEventListener('animationstart', e => window.__anims.push(e.animationName), true); });
    await page.click('[data-a="ci-pick"][data-v="short"]'); await page.waitForSelector('#ciPreview');
    const a1 = await page.evaluate(() => { const p = document.getElementById('ciPreview'), c = document.querySelector('#checkin .cic.sel'), f = document.querySelector('#checkin .cic.fade'); return { grow: p.className.includes('grow'), lift: c.className.includes('lift'), durs: [getComputedStyle(p).animationDuration, getComputedStyle(c).animationDuration, getComputedStyle(f).animationDuration], names: [getComputedStyle(p).animationName, getComputedStyle(c).animationName, getComputedStyle(f).animationName], fadeOp: getComputedStyle(f).opacity, picks: window.MorningLaps.state.ciPicks }; });
    check('A the tapped card lifts and expands into its preview while the others fade back', a1.grow && a1.lift && same(a1.names, ['ciGrow', 'ciLift', 'ciFade']) && a1.picks === 1, JSON.stringify(a1));
    check('A each of those motions is 400 ms or less', a1.durs.every(d => parseFloat(d) > 0 && parseFloat(d) <= 0.4), JSON.stringify(a1.durs));
    await page.click('#ciStart'); // straight away, mid-animation
    check('A an animation never blocks a tap: Start works at once', await page.evaluate(() => !document.getElementById('wm').hidden));
    const z = await page.evaluate(() => { const w = document.getElementById('wm'), cs = getComputedStyle(w); return [w.className.includes('zoom'), cs.animationName, cs.animationDuration, cs.transformOrigin]; });
    check('A Start: the preview card zooms into workout mode, in 400 ms or less', z[0] && z[1] === 'wmZoom' && parseFloat(z[2]) <= 0.4 && z[3] !== '50% 50%', JSON.stringify(z));
    await page.click('#wmStartSeq'); await page.click('[data-a="wm-quit"]'); await page.click('#wmQuitKeep'); await page.waitForSelector('#wm', { state: 'hidden' });
    await page.evaluate(() => { window.__anims = []; });
    await page.click('[data-a="ci-pick"][data-v="tired"]'); await page.waitForSelector('#ciPreview'); await page.waitForTimeout(450);
    const n1 = await page.evaluate(() => window.__anims.filter(n => n === 'ciGrow').length);
    await page.click('[data-a="ci-opt"][data-v="bike"]'); await page.waitForTimeout(450);
    const n2 = await page.evaluate(() => ({ grow: window.__anims.filter(n => n === 'ciGrow').length, cls: document.getElementById('ciPreview').className }));
    check('A the expand runs once per tap, not again when the preview redraws', n1 === 1 && n2.grow === 1 && !n2.cls.includes('grow'), JSON.stringify([n1, n2]));
    await ctx.close();
    // reduced motion
    await open({ me: 'tyson', time: at(WED), reducedMotion: 'reduce', init: seed() });
    await page.evaluate(() => { window.__anims = []; document.addEventListener('animationstart', e => window.__anims.push(e.animationName), true); });
    await page.click('[data-a="ci-pick"][data-v="strong"]'); await page.waitForSelector('#ciPreview');
    const r1 = await page.evaluate(() => [getComputedStyle(document.getElementById('ciPreview')).animationName, getComputedStyle(document.querySelector('#checkin .cic.sel')).animationName]);
    await page.click('#ciStart'); await page.waitForSelector('#wm:not([hidden])');
    check('A reduced motion: no pick animations, no zoom, and no start sequence', same(r1, ['none', 'none']) && await wmv() === 'main' && !(await has(page, '#wmStartSeq')) && (await page.evaluate(() => getComputedStyle(document.getElementById('wm')).animationName)) === 'none');
    await page.click('#wmWarmLog'); await page.waitForSelector('#wmDemo svg');
    const r2 = await page.evaluate(() => ({ running: document.getAnimations().filter(a => a.playState === 'running').length, demo: !!document.querySelector('#wmDemo svg.mv'), joint: getComputedStyle(document.querySelector('#wmDemo .mvj')).animationName }));
    check('A reduced motion: the demo is a still frame', r2.demo && r2.running === 0 && r2.joint === 'none', JSON.stringify(r2));
    const fxBefore = await page.evaluate(() => { const c = document.getElementById('fx'); return c.width + 'x' + c.height; });
    await page.click('#wmLog'); await waitView('rest');
    check('A reduced motion: no bursts, and nothing animated was started', (await page.evaluate(() => { const c = document.getElementById('fx'); return c.width + 'x' + c.height; })) === fxBefore && (await page.evaluate(() => window.__anims.length)) === 0, JSON.stringify(await page.evaluate(() => window.__anims)));
    await ctx.close();
    // with motion on, the demo loops
    await open({ me: 'tyson', time: at(WED), init: seed() });
    await page.click('#wmStart'); await page.waitForSelector('#wmStartSeq'); await page.click('#wmStartSeq'); await page.click('#wmWarmLog'); await page.waitForSelector('#wmDemo svg');
    const m = await page.evaluate(() => ({ running: document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.closest('#wmDemo')).length, iter: getComputedStyle(document.querySelector('#wmDemo .mvj')).animationIterationCount, pats: Array.from(new Set(Object.values(window.MorningLaps.MOVE_OF))).sort(), ex: Object.keys(window.MorningLaps.EX).filter(k => !window.MorningLaps.MOVE_OF[k] || !window.MorningLaps.HOWTO[k] || window.MorningLaps.HOWTO[k].cues.length !== 3 || !window.MorningLaps.HOWTO[k].mistake) }));
    check('A with motion on, the demo loops', m.running > 0 && m.iter === 'infinite', JSON.stringify(m));
    check('A eleven movement patterns cover every exercise, each with 3 cues and 1 mistake', same(m.pats, ['core', 'curl', 'extension', 'hinge', 'hpress', 'hpull', 'lunge', 'raise', 'squat', 'vpress', 'vpull']) && m.ex.length === 0, JSON.stringify(m.ex));
  });

  // ---------- smoke: every tab and every workout-mode screen, both profiles, 390 px ----------
  await section('G', async () => {
    await open({ me: 'tyson', time: at(WED), width: 390, init: local(seedDocs({ settings: full, tGym: HP, jGym: HP })) });
    await switchTo(page, 'jacquie'); await page.waitForTimeout(300); await switchTo(page, 'tyson'); await page.waitForTimeout(700);
    await watchWrites(page);
    const bad = [], wide = [], screens = [];
    const fit = async name => { const o = await page.evaluate(() => { const w = document.getElementById('wm'), b = w.querySelector('.wm-body'); return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, w.scrollWidth - w.clientWidth, b ? b.scrollWidth - b.clientWidth : 0); }); screens.push(name); if (o > 0) wide.push(name + ':' + o); if (/undefined|NaN|\[object/.test(await txt(page, '#wm'))) bad.push('wm:' + name); };
    const begin = async () => { await page.waitForSelector('#wm:not([hidden])'); if (await wmv() === 'start') { await fit('start'); await page.click('#wmStartSeq'); } await waitView('main'); };
    const leave = async () => { await page.click('[data-a="wm-quit"]'); await fit('quit'); await page.click('#wmQuitKeep'); await page.waitForSelector('#wm', { state: 'hidden' }); };
    for (const who of ['tyson', 'jacquie']) { if (who === 'jacquie') await switchTo(page, 'jacquie');
      for (const tab of ['train', 'program', 'history', 'fuel', 'compete', 'me']) { await go(page, tab); const n = await page.evaluate(() => document.querySelectorAll('#main .card, #main .sheet').length); if (!n || /undefined|NaN|\[object/.test(await txt(page, '#main'))) bad.push(who + ':' + tab); if ((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) > 0) wide.push(who + ':' + tab); }
      await go(page, 'train');
      if (who === 'tyson') {
        await page.click('[data-a="ci-pick"][data-v="strong"]'); await page.click('#ciStart'); await begin(); await fit('warm-up'); await page.click('[data-a="wm-next"]'); await fit('lift');
        await page.click('[data-a="wm-swap"]'); await fit('swap'); await page.click('[data-a="wm-swap"]'); await page.click('#wmFinish'); await waitView('finish'); await fit('lift finish'); await page.click('[data-a="wm-unfinish"]'); await leave();
        for (const [c, o, n] of [['tired', 'hptrack', 'laps'], ['tired', 'hpswim', 'lengths'], ['tired', 'treadmill', 'timer'], ['sore', 'hptrack', 'recovery']]) {
          await page.click('[data-a="ci-pick"][data-v="' + c + '"]'); await page.click('[data-a="ci-opt"][data-v="' + o + '"]'); await page.click('#ciStart'); await begin(); await fit(n);
          if (n === 'recovery') { await page.click('#wmNext'); await fit('stretch'); await page.click('#wmNext'); await fit('heat'); }
          await page.click('#wmFinish'); await waitView('finish'); await fit(n + ' finish'); await page.click('[data-a="wm-unfinish"]'); await leave();
        }
      } else {
        await page.click('[data-a="ci-pick"][data-v="good"]'); await page.click('#ciStart'); await begin(); await fit('her laps'); await page.click('#wmNext'); await fit('circuit'); await leave();
        await page.click('[data-a="ci-pick"][data-v="sore"]'); await page.click('#ciStart'); await begin(); await fit('her stretch'); await page.click('#wmNext'); await fit('her heat'); await leave();
        await page.click('#ciExtra'); await page.waitForSelector('#hpExtra'); await page.keyboard.press('Escape');
      }
    }
    await page.waitForTimeout(400);
    check('G smoke: every tab draws for both profiles, with nothing broken in the text', bad.length === 0, bad.join(' '));
    check('G every workout-mode screen was shown: ' + screens.length, screens.length >= 24 && ['start', 'warm-up', 'lift', 'swap', 'lift finish', 'quit', 'laps', 'lengths', 'timer', 'recovery', 'stretch', 'heat', 'circuit', 'her laps'].every(s => screens.includes(s)), screens.join(', '));
    check('G at 390 px wide nothing scrolls sideways, on any tab or workout-mode screen', wide.length === 0, wide.join(' '));
    check('G showing screens and sheets writes nothing to the log', (await writes(page)).length === 0, JSON.stringify(await writes(page)));
    check('G window.MorningLaps is still exported', await ML(page, () => { const M = window.MorningLaps; return ['state', 'weekScore', 'compWeeks', 'suggest', 'weekGoals', 'backupDocs', 'caps', 'checkinSuggest', 'wmState', 'specFor'].every(k => k in M); }));
  });
  check('no console errors in any section', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  await browser.close();
  process.exit(finish('version 16 checks') ? 1 : 0);
})();
