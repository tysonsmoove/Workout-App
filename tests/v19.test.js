// The checks for version 19: a guide for every move. One animation per exercise, station and stretch, drawn from joint
// angles with the equipment to scale; a full how-to card; the guide in the lift sheet, in live mode and in a library on
// the Program (or Plan) tab; and "My settings", a short line per person per move.
// Headless browser, browser-only mode, seeded storage: the same two profiles and six weeks of history as version 18.
// Run: node tests/v19.test.js   (ML_ONLY=F,P runs just those sections)
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

  // every guide key: the 33 lifts, the 4 circuit stations, the 8 stretches
  const KEYS = () => page.evaluate(() => { const M = window.MorningLaps; return Object.keys(M.EX).concat(M.GD_STATIONS, M.STRETCHES.map(s => s.g)); });
  const guideOf = () => page.evaluate(() => { const g = window.MorningLaps.state.guide; return g ? g.key : null; });
  const openLib = async (group, key) => { await go(page, 'program'); await page.waitForSelector('#guideLib'); if (!(await page.$eval('[data-group="' + group + '"]', d => d.open))) await page.click('[data-group="' + group + '"] summary'); await page.click('.glrow[data-k="' + key + '"]'); await page.waitForSelector('#guideSheet[data-guide="' + key + '"]'); };
  const scrub = (sel, v) => page.evaluate(([s, x]) => { const el = document.querySelector(s + ' .figscrub'); el.value = String(x); el.dispatchEvent(new Event('input', { bubbles: true })); }, [sel, v]);
  const svgOf = sel => page.$eval(sel + ' svg.figs', el => el.innerHTML);

  // ---------- F: one accurate animation for every move ----------
  await section('F', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    const keys = await KEYS();
    check('F there are 45 moves: 33 lifts, 4 circuit stations, 8 stretches', keys.length === 45, String(keys.length));
    const r = await page.evaluate(ks => { const M = window.MorningLaps, FL = 136, out = { none: [], bad: [], limb: [], floor: [], marks: [], views: 0, tempo: [], total: {} };
      const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      ks.forEach(k => { const def = M.fgDef(k); if (!def || !(def.keys || def.front)) { out.none.push(k); return; }
        [['side', def.keys ? def : null], ['front', def.front || null]].forEach(([name, v]) => { if (!v) return; out.views++;
          const n = (v.marks || []).length; if (n < 1 || n > 2) out.marks.push(k + ':' + name + ':' + n);
          const kp = M.fgKeyPos(v), atKey = M.fgAt(v, kp); if (atKey.rest < 0) out.marks.push(k + ':' + name + ':key pose is not a rest');
          const shown = (M.fgSVG(k, name, kp, true, k).match(/class="fgm"/g) || []).length; if (shown < 1) out.marks.push(k + ':' + name + ':no marker at the key pose');
          out.total[k + ':' + name] = atKey.total;
          for (let i = 0; i < 40; i++) { const pos = i / 40, svg = M.fgSVG(k, name, pos, true, k); if (/NaN|undefined|Infinity/.test(svg)) out.bad.push(k + ':' + name + '@' + pos);
            if (name === 'side') { const J = M.fgSolve(M.fgAt(v, pos).pose);
              const th = dist(J.H, J.K), sh = dist(J.K, J.A), th2 = dist(J.H, J.K2), sh2 = dist(J.K2, J.A2), to = dist(J.H, J.S), ua = dist(J.S, J.E), fa = dist(J.E, J.W);
              if (Math.abs(th - 25) > 0.2 || Math.abs(sh - 24) > 0.2 || Math.abs(th2 - 25) > 0.2 || Math.abs(sh2 - 24) > 0.2 || Math.abs(to - 28) > 0.01 || ua > 17.05 || fa > 15.05) out.limb.push(k + '@' + pos + ' ' + [th, sh, th2, sh2, to, ua, fa].map(x => x.toFixed(1)).join('/'));
              const low = Math.max(J.F.heel[1], J.F.toe[1], J.F2.heel[1], J.F2.toe[1], J.K[1] + 3.5, J.K2[1] + 3.5, J.H[1] + 6.25, J.S[1] + 6.25, J.Hd[1] + 6.5, J.W[1] + 3, J.W2[1] + 3, J.E[1] + 3);
              if (low > FL + 1.2) out.floor.push(k + '@' + pos + ' ' + low.toFixed(1)); } } }); });
      return out; }, keys);
    check('F every move has its own animation: ' + r.views + ' views of 45 moves', r.none.length === 0 && r.views >= 50, JSON.stringify(r.none));
    check('F no frame of any animation has a broken number in it (40 frames of every view)', r.bad.length === 0, r.bad.slice(0, 5).join(' '));
    check('F the body keeps its proportions in every frame: thigh, shin and torso never stretch, arms only foreshorten', r.limb.length === 0, r.limb.slice(0, 4).join(' | '));
    check('F nothing sinks through the floor in any frame: feet, knees, hips, hands, head', r.floor.length === 0, r.floor.slice(0, 6).join(' | '));
    check('F every view has one or two markers, and they show at its key position', r.marks.length === 0, r.marks.slice(0, 6).join(' | '));
    const lifts = keys.slice(0, 37), stretches = keys.slice(37);
    const loop = k => Object.keys(r.total).filter(x => x.split(':')[0] === k).map(x => r.total[x]);
    check('F a rep takes 4 seconds: about 2 lowering, a half-second pause, about 1 lifting, a half-second reset', lifts.every(k => loop(k).every(t => Math.abs(t - 4) < 0.001)), JSON.stringify(lifts.filter(k => !loop(k).every(t => Math.abs(t - 4) < 0.001))));
    check('F a stretch eases in, holds, and eases out', stretches.every(k => loop(k).every(t => Math.abs(t - 6.5) < 0.001)));
    // the tempo of one rep, read from the squat: lowering 2 s, pause 0.5 s, lifting 1 s
    const tp = await page.evaluate(() => { const M = window.MorningLaps, v = M.fgDef('squat'), at = p => M.fgAt(v, p), lab = p => at(p).label, rest = p => at(p).rest;
      const hipY = p => M.fgSolve(at(p).pose).H[1];
      return { l0: lab(0.1), l1: lab(0.45), pause: [lab(0.52), rest(0.52), rest(0.6)], up: [lab(0.7), lab(0.86)], back: rest(0.95), down: hipY(0.25) > hipY(0.05) && hipY(0.49) > hipY(0.25), rise: hipY(0.75) < hipY(0.64),
        curl: (() => { const c = M.fgDef('dbcurl'); return [M.fgAt(c, 0.1).label, M.fgAt(c, 0.3).label, M.fgAt(c, 0.6).label, M.fgAt(c, 0.3).rest, M.fgKeyPos(c)]; })() }; });
    check('F the squat lowers for 2 s, pauses for half a second at the bottom, and drives up in 1 s, with a phase label for each', tp.l0 === 'Lower' && tp.l1 === 'Lower' && same(tp.pause, ['Pause', 1, 1]) && same(tp.up, ['Drive up', 'Drive up']) && tp.back === 0 && tp.down && tp.rise, JSON.stringify(tp));
    check('F a curl lifts in 1 s, squeezes, and lowers in 2 s', same(tp.curl.slice(0, 4), ['Curl', 'Squeeze', 'Lower slowly', 1]) && Math.abs(tp.curl[4] - 0.3125) < 0.001, JSON.stringify(tp.curl));
    // joint paths, measured on the joints themselves
    const jp = await page.evaluate(() => { const M = window.MorningLaps, at = (k, p) => { const v = M.fgDef(k); return { pose: M.fgAt(v, p).pose, J: M.fgSolve(M.fgAt(v, p).pose) }; }, o = {};
      const ang = (a, b, c) => { const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]]; return Math.acos((v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]))) * 180 / Math.PI; };
      const fwd = (a, b) => Math.atan2(b[0] - a[0], a[1] - b[1]) * 180 / Math.PI; // how far a segment leans forward from upright
      const seg = (p, a, b) => { const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2))); return Math.hypot(p[0] - a[0] - t * (b[0] - a[0]), p[1] - a[1] - t * (b[1] - a[1])); };
      let heel = 0, kneePast = -99; for (let i = 0; i <= 40; i++) { const J = at('squat', i / 40).J; heel = Math.max(heel, Math.abs(J.F.heel[1] - 136)); kneePast = Math.max(kneePast, J.K[0] - J.F.toe[0]); }
      const sb = at('squat', 0.56).J; o.squat = { heel, kneePast, kneeOverFoot: sb.K[0] > sb.A[0] + 3, hipBelowKnee: sb.H[1] - sb.K[1], torso: fwd(sb.H, sb.S), shin: fwd(sb.A, sb.K) };
      ['dbrdl', 'bbrdl'].forEach(k => { const t = at(k, 0).J, b = at(k, 0.56).J; let far = 0; for (let i = 0; i <= 40; i++) { const J = at(k, i / 40).J; far = Math.max(far, Math.min(seg(J.W, J.H, J.K), seg(J.W, J.K, J.A))); }
        o[k] = { knee: ang(b.H, b.K, b.A), hipBack: t.H[0] - b.H[0], torso: fwd(b.H, b.S), neck: Math.abs(fwd(b.S, b.N) - fwd(b.H, b.S)), far, handBelowKnee: b.W[1] > b.K[1] }; });
      const l0 = at('latpull', 0).J, l2 = at('latpull', 0.375).J; o.latpull = { reach: l0.S[1] - l0.W[1], barDy: l2.W[1] - l2.S[1], barDx: l2.W[0] - l2.S[0], elbowDown: l2.E[1] - l2.S[1], elbowBack: l2.W[0] - l2.E[0], lean: M.fgAt(M.fgDef('latpull'), 0.375).pose.lean };
      ['seatedrow', 'st_row'].forEach(k => { const a = at(k, 0), b = at(k, 0.3125); o[k] = { sway: Math.abs(a.pose.lean - b.pose.lean), elbowBack: b.J.S[0] - b.J.E[0], handBack: a.J.W[0] - b.J.W[0] }; });
      o.incline = 90 - Math.abs(M.FIG.inclinedb.keys[0].lean); o.flat = M.FIG.dbbench.keys[0].lean;
      return o; });
    check('F squat: heels stay down, knees travel over the toes and not past them, hips reach knee height or lower, torso and shins lean alike', jp.squat.heel < 0.1 && jp.squat.kneeOverFoot && jp.squat.kneePast < 3 && jp.squat.hipBelowKnee >= 0 && Math.abs(jp.squat.torso - jp.squat.shin) <= 10, JSON.stringify(jp.squat));
    for (const k of ['dbrdl', 'bbrdl']) check('F ' + (k === 'dbrdl' ? 'dumbbell' : 'barbell') + ' RDL: knees softly bent, hips pushed back, a flat back, the weight sliding close along the legs', jp[k].knee > 140 && jp[k].knee < 172 && jp[k].hipBack > 8 && jp[k].torso > 50 && jp[k].neck < 1 && jp[k].far < 9 && jp[k].handBelowKnee, JSON.stringify(jp[k]));
    check('F lat pulldown: from a full reach, the bar comes to the upper chest with the elbows down and back', jp.latpull.reach > 28 && jp.latpull.barDy > -4 && jp.latpull.barDy < 6 && jp.latpull.barDx > 0 && jp.latpull.barDx < 9 && jp.latpull.elbowDown > 6 && jp.latpull.elbowBack > 2 && Math.abs(jp.latpull.lean) <= 15, JSON.stringify(jp.latpull));
    for (const k of ['seatedrow', 'st_row']) check('F ' + (k === 'st_row' ? 'row machine' : 'seated cable row') + ': the torso stays still and the elbows drive back past the body', jp[k].sway <= 8 && jp[k].elbowBack > 3 && jp[k].handBack > 15, JSON.stringify(jp[k]));
    check('F the incline bench is drawn at 30 to 45 degrees and the flat bench flat', jp.incline >= 30 && jp.incline <= 45 && jp.flat === -90, JSON.stringify([jp.incline, jp.flat]));
    // which view each move is shown from, and the equipment drawn with it
    const vw = await page.evaluate(() => { const M = window.MorningLaps, F = M.FIG, cnt = (k, view, re) => (M.fgSVG(k, view, 0, false, k).match(re) || []).length;
      return { frontOnly: Object.keys(F).filter(k => !F[k].keys).sort(), both: Object.keys(F).filter(k => F[k].keys && F[k].front).sort(), alias: M.FIG_ALIAS, ownRow: !!F.st_row,
        rack: cnt('squat', 'side', /class="fge"/g), plate: /r="12.4"/.test(M.fgSVG('squat', 'side', 0)), barFront: cnt('squat', 'front', /class="fgw fgfill"/g), kb: cnt('goblet', 'side', /class="fgw fgfill"/g),
        cable: ['pushdown', 'cablecurl', 'latpull', 'seatedrow'].map(k => cnt(k, 'side', /class="fgc"/g)), cableFront: cnt('cablelat', 'front', /class="fgc"/g), rope: cnt('facepull', 'front', /class="fgw"/g),
        stack: ['legpress', 'legext', 'legcurl', 'chestpress', 'shoulderpress', 'latpull', 'assistpull', 'seatedrow', 'pushdown', 'cablecurl', 'st_row'].filter(k => !/fgsoft/.test(M.fgSVG(k, 'side', 0))),
        pad: ['legpress', 'legext', 'legcurl', 'chestpress', 'shoulderpress', 'dbshoulder', 'inclinedb', 'st_row'].filter(k => !/fgpad/.test(M.fgSVG(k, 'side', 0))), bench: ['dbbench', 'dbrow', 'hipthrust', 'benchtuck'].filter(k => cnt(k, 'side', /class="fge fgfill"/g) < 1),
        mat: ['crunch', 'legraise', 'sx_reach', 'sx_figure4', 'sx_knees', 'sx_child'].filter(k => cnt(k, 'side', /class="fge fgfill"/g) < 1), db: ['dbbench', 'inclinedb', 'dbshoulder', 'dbrdl', 'dbcurl', 'hammer', 'dbrow', 'splitsquat', 'lunge', 'dbtri', 'reardelt', 'hipthrust'].filter(k => cnt(k, 'side', /fgw/g) < 1) }; });
    check('F judged from the front: lateral raise, cable lateral raise, face pull and pec deck', ['cablelat', 'facepull', 'latraise', 'pecdeck'].every(k => vw.frontOnly.includes(k)), JSON.stringify(vw.frontOnly));
    check('F squats and lunges have a front view as well, for knee tracking', ['goblet', 'lunge', 'splitsquat', 'squat'].every(k => vw.both.includes(k)), JSON.stringify(vw.both));
    check('F equipment: a rack with the bar and a 45 lb plate on the squat, a kettlebell on the goblet squat, the bar and plates from the front', vw.rack >= 5 && vw.plate && vw.barFront === 2 && vw.kb >= 1, JSON.stringify([vw.rack, vw.plate, vw.barFront, vw.kb]));
    check('F cable moves draw the cable from the pulley to the hands, and the face pull its rope', vw.cable.every(n => n >= 1) && vw.cableFront >= 1 && vw.rope >= 2, JSON.stringify([vw.cable, vw.cableFront, vw.rope]));
    check('F every machine has its weight stack and its pads, benches and mats are drawn, and dumbbell moves show the dumbbell', vw.stack.length === 0 && vw.pad.length === 0 && vw.bench.length === 0 && vw.mat.length === 0 && vw.db.length === 0, JSON.stringify([vw.stack, vw.pad, vw.bench, vw.mat, vw.db]));
    check('F the circuit\'s row machine has its own picture with a chest pad; the other three stations use their lift\'s picture', vw.ownRow && same(vw.alias, { st_legpress: 'legpress', st_chest: 'chestpress', st_latpull: 'latpull' }), JSON.stringify(vw.alias));
  });

  // ---------- P: the player: play, pause, drag, front view, stills ----------
  await section('P', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    await watchWrites(page);
    await openLib('fba', 'squat');
    const a0 = await svgOf('#guideSheet'); await page.clock.runFor(600); const a1 = await svgOf('#guideSheet');
    const p0 = await page.evaluate(() => ({ paused: window.MorningLaps.figSt.gd.paused, btn: document.querySelector('#guideSheet .figplay').getAttribute('aria-label'), phase: document.querySelector('#guideSheet .figphase').textContent, view: document.querySelector('#guideSheet .fig').dataset.view, toggle: document.querySelector('#guideSheet .figview').textContent, legend: document.querySelectorAll('#guideSheet .figlegend span').length, scrub: !!document.querySelector('#guideSheet .figscrub') }));
    check('P the guide opens playing, on a loop, with a phase label, a pause button and a slider', a0 !== a1 && !p0.paused && p0.btn === 'Pause' && ['Lower', 'Pause', 'Drive up'].includes(p0.phase) && p0.scrub && p0.view === 'side', JSON.stringify(p0));
    const labels = new Set(); for (let i = 0; i < 24; i++) { await page.clock.runFor(200); labels.add(await txt(page, '#guideSheet .figphase')); }
    check('P the phase label follows the rep: Lower, Pause, Drive up', ['Lower', 'Pause', 'Drive up'].every(l => labels.has(l)), JSON.stringify(Array.from(labels)));
    await page.click('#guideSheet .figplay'); const b0 = await svgOf('#guideSheet'); await page.clock.runFor(800);
    check('P Pause stops it on the frame it is on, and the button turns into Play', (await svgOf('#guideSheet')) === b0 && (await page.$eval('#guideSheet .figplay', b => b.getAttribute('aria-label'))) === 'Play');
    await page.click('#guideSheet .figplay'); await page.clock.runFor(500);
    check('P Play carries on from there', (await svgOf('#guideSheet')) !== b0 && !(await page.evaluate(() => window.MorningLaps.figSt.gd.paused)));
    await scrub('#guideSheet', 560);
    const sc = await page.evaluate(() => ({ paused: window.MorningLaps.figSt.gd.paused, marks: document.querySelectorAll('#guideSheet svg.figs .fgm').length, lit: Array.from(document.querySelectorAll('#guideSheet .figlegend span.on')).map(s => s.textContent.trim()), phase: document.querySelector('#guideSheet .figphase').textContent }));
    check('P dragging the slider pauses and shows that frame: at the bottom of the squat, both markers are on the body and lit in the legend', sc.paused && sc.marks === 2 && sc.phase === 'Pause' && same(sc.lit, ['1 hips at or below knee height', '2 heels stay down, knees over toes']), JSON.stringify(sc));
    const s1 = await svgOf('#guideSheet'); await scrub('#guideSheet', 100);
    const sc2 = await page.evaluate(() => ({ marks: document.querySelectorAll('#guideSheet svg.figs .fgm').length, lit: document.querySelectorAll('#guideSheet .figlegend span.on').length, all: document.querySelectorAll('#guideSheet .figlegend span').length }));
    check('P away from the key position the markers come off the body and the legend stays, unlit, so nothing jumps', (await svgOf('#guideSheet')) !== s1 && sc2.marks === 0 && sc2.lit === 0 && sc2.all === 2, JSON.stringify(sc2));
    await page.click('#guideSheet .figview');
    const fv = await page.evaluate(() => ({ view: document.querySelector('#guideSheet .fig').dataset.view, btn: document.querySelector('#guideSheet .figview').textContent, legend: Array.from(document.querySelectorAll('#guideSheet .figlegend span')).map(s => s.textContent.trim()), marks: document.querySelectorAll('#guideSheet svg.figs .fgm').length, paused: window.MorningLaps.figSt.gd.paused }));
    check('P "Front view" on the squat switches to the front, at its key position, to check knee tracking', fv.view === 'front' && fv.btn === 'Side view' && fv.marks === 2 && fv.legend[0] === '1 knees track out over your toes', JSON.stringify(fv));
    await page.click('#guideSheet .figview'); check('P and "Side view" switches back', (await page.$eval('#guideSheet .fig', f => f.dataset.view)) === 'side');
    await page.click('#guideClose');
    await openLib('fbb', 'latraise');
    check('P a move judged from the front opens in its front view, with no toggle', (await page.$eval('#guideSheet .fig', f => f.dataset.view)) === 'front' && !(await has(page, '#guideSheet .figview')));
    await page.click('#guideClose'); await page.clock.runFor(300);
    check('P closing the guide stops the timer that draws it', (await page.evaluate(() => document.querySelectorAll('.fig').length)) === 0);
    check('P watching, pausing and dragging saves nothing', (await writes(page)).length === 0, JSON.stringify(await writes(page)));
    await ctx.close();
    for (const [name, opts] of [['Animations: Off', { init: local(seedDocs({ tProfile: { motion: 'off' } })) }], ['the phone\'s reduce-motion setting', { reducedMotion: 'reduce', init: local(seedDocs()) }]]) {
      await open(Object.assign({ me: 'tyson' }, opts));
      await openLib('fba', 'squat');
      const s0 = await svgOf('#guideSheet'); await page.clock.runFor(900);
      const st = await page.evaluate(() => ({ paused: window.MorningLaps.figSt.gd.paused, marks: document.querySelectorAll('#guideSheet svg.figs .fgm').length, lit: document.querySelectorAll('#guideSheet .figlegend span.on').length, phase: document.querySelector('#guideSheet .figphase').textContent, anim: document.getAnimations().filter(a => a.playState === 'running').length }));
      check('P with ' + name + ', the guide shows the key position as a still, with its markers', (await svgOf('#guideSheet')) === s0 && st.paused && st.marks === 2 && st.lit === 2 && st.phase === 'Pause' && st.anim === 0, JSON.stringify(st));
      await scrub('#guideSheet', 0); check('P with ' + name + ', the slider still steps through the rep by hand', (await svgOf('#guideSheet')) !== s0);
      await ctx.close();
    }
    // Subtle (the default): the sheet arrives with a short rise, nothing else moves by CSS
    await open({ me: 'tyson', init: local(seedDocs()) });
    await page.evaluate(() => { window.__anims = []; document.addEventListener('animationstart', e => window.__anims.push(e.animationName + ':' + getComputedStyle(e.target).animationDuration), true); });
    await openLib('fba', 'squat'); await page.clock.runFor(400);
    const an = await page.evaluate(() => window.__anims.slice());
    check('P Subtle: the guide sheet arrives with one 0.2 s rise and nothing else is animated by the page', same(an, ['mlRise:0.2s']), JSON.stringify(an));
  });

  // ---------- C: a full how-to card for every move ----------
  await section('C', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    const keys = await KEYS();
    const cards = await page.evaluate(ks => { const M = window.MorningLaps, bad = [], host = document.createElement('div'), muscles = Object.keys(M.MM_NAME), lens = [];
      ks.forEach(k => { host.innerHTML = M.guideCardHTML(k, { pid: 'tyson', from: 'lib' }); const q = s => host.querySelectorAll(s), g = M.GUIDE[k], kind = M.gdKind(k), why = [];
        const secs = Array.from(q('.gsec')).map(s => s.querySelector('h4').textContent);
        const want = kind === 'stretch' ? ['Equipment', 'Set up', 'Do it', 'Breathe', 'Feel it in', 'Common mistakes', 'Easier and harder'] : ['Equipment', 'My settings', 'Set up', 'Do it', 'Breathe', 'Feel it in', 'Common mistakes', 'Easier and harder'];
        if (JSON.stringify(secs) !== JSON.stringify(want)) why.push('sections ' + secs.join(','));
        const nSetup = q('[data-sec="setup"] li').length, nSteps = q('[data-sec="steps"] li').length; if (nSetup < 2 || nSetup > 4) why.push('setup ' + nSetup); if (nSteps < 3 || nSteps > 5) why.push('steps ' + nSteps);
        if (q('[data-sec="breathe"] p').length !== 1 || /[.!?].+[.!?].+[.!?]/.test(g.breathe)) why.push('breathe is more than a line or two');
        if (q('[data-sec="equip"] p').length !== 2 || !g.equip || !g.where) why.push('equipment');
        if (q('.gmis').length !== 2 || !g.mistakes.every(m => m[0] && m[1])) why.push('mistakes');
        if (q('.galt').length !== 2 || q('[data-alt="easier"]').length !== 1 || q('[data-alt="harder"]').length !== 1) why.push('easier and harder');
        if (!g.main.length || !g.main.concat(g.also).every(m => muscles.includes(m))) why.push('muscles ' + g.main.concat(g.also).join(','));
        if (q('.mmap .mm.on').length < 1 || q('.mmap text').length !== 2) why.push('muscle map');
        const lit = new Set(Array.from(q('.mmap .mm.on')).map(e => 1)).size; if (!lit) why.push('nothing highlighted');
        if (/undefined|NaN|\[object/.test(host.textContent)) why.push('broken text');
        [g.easier, g.harder].forEach(a => { if (a.k && (!M.EX[a.k] || !M.EX[k] || !(M.EX[k].alt || []).includes(a.k))) why.push('swap target ' + a.k); });
        lens.push(host.textContent.length); if (why.length) bad.push(k + ': ' + why.join('; ')); });
      return { bad, min: Math.min.apply(null, lens), names: ks.map(k => M.gdName(k)) }; }, keys);
    check('C all 45 moves have a full card: Equipment, Set up (2 to 4), Do it (3 to 5), Breathe, Feel it in, Common mistakes (2, each with its fix), Easier and harder', cards.bad.length === 0 && cards.min > 600, cards.bad.slice(0, 5).join(' | '));
    check('C every move has a name of its own, the circuit stations too', new Set(cards.names).size === 45 && cards.names.every(n => n && !/^s[tx]_/.test(n)) && cards.names[33] === 'Leg press (light circuit)', JSON.stringify(cards.names.slice(33)));
    // the muscle map highlights the right side of the body
    const mm = await page.evaluate(() => { const M = window.MorningLaps, host = document.createElement('div'), on = (k) => { host.innerHTML = M.mmHTML(M.GUIDE[k].main, M.GUIDE[k].also); const svg = host.querySelector('svg'); return { main: host.querySelectorAll('.mm.on').length, also: host.querySelectorAll('.mm.also').length, key: host.querySelector('.mmkey').textContent, label: svg.getAttribute('aria-label'), frontOn: Array.from(host.querySelectorAll('.mm.on')).filter(e => { const x = Number(e.getAttribute('cx') || e.getAttribute('x') || (e.getAttribute('d') || '').slice(1).split(' ')[0]); return x < 66; }).length }; };
      return { squat: on('squat'), curl: on('dbcurl'), pull: on('latpull'), calf: on('calf') }; });
    check('C "Feel it in" fills the working muscles on a front and back body and names them in words too', mm.squat.main === 4 && mm.squat.frontOn === 2 && /Mostly front of the thighs, glutes/.test(mm.squat.key) && /Also/.test(mm.squat.key) && /Working most: front of the thighs, glutes/.test(mm.squat.label), JSON.stringify(mm.squat));
    check('C biceps light up on the front, lats and calves on the back', mm.curl.main === 2 && mm.curl.frontOn === 2 && mm.pull.main === 2 && mm.pull.frontOn === 0 && mm.calf.main === 2 && mm.calf.frontOn === 0, JSON.stringify([mm.curl, mm.pull, mm.calf]));
    // on screen, in the sheet
    await openLib('fba', 'squat'); await page.waitForTimeout(280); // past the 0.2 s rise
    const sh = await page.evaluate(() => { const S = document.getElementById('guideSheet'), r = S.getBoundingClientRect(), body = S.querySelector('.gd-body'); return { role: S.getAttribute('role'), modal: S.getAttribute('aria-modal'), label: S.getAttribute('aria-label'), title: document.getElementById('guideTitle').textContent, sub: document.getElementById('guideSub').textContent, focus: document.activeElement.id, full: Math.round(r.bottom) === innerHeight, scrolls: body.scrollHeight > body.clientHeight, wide: document.documentElement.scrollWidth - innerWidth, inner: body.scrollWidth - body.clientWidth, first: body.firstElementChild.className, order: Array.from(body.querySelectorAll('.gsec h4')).map(h => h.textContent) }; });
    check('C the guide is a sheet of its own: the picture first, then the card, with Close in reach', sh.role === 'dialog' && sh.modal === 'true' && sh.label === 'How to: Barbell back squat' && sh.title === 'Barbell back squat' && sh.sub === 'Squat rack' && sh.focus === 'guideClose' && sh.full && sh.scrolls && sh.first === 'fig' && sh.order[0] === 'Equipment', JSON.stringify(sh));
    check('C nothing in the guide scrolls sideways at 390 px', sh.wide <= 0 && sh.inner <= 0, JSON.stringify([sh.wide, sh.inner]));
    const txts = await page.evaluate(() => ({ equip: document.querySelector('[data-sec="equip"]').textContent, alt: document.querySelector('[data-sec="alt"]').textContent, swapBtn: !!document.querySelector('#guideSheet [data-a="guide-swap"]'), see: Array.from(document.querySelectorAll('#guideSheet .galt [data-a="guide-open"]')).map(b => b.dataset.k) }));
    check('C Equipment says exactly what to grab and where it usually is', /Squat rack, 45 lb Olympic bar, plates, collars/.test(txts.equip) && /Free-weight area/.test(txts.equip), txts.equip);
    check('C from the library there is no workout to swap in: the easier move is offered as "See it"', !txts.swapBtn && same(txts.see, ['goblet']), JSON.stringify(txts));
    await page.click('#guideSheet .galt [data-a="guide-open"]'); await page.waitForSelector('#guideSheet[data-guide="goblet"]');
    check('C "See it" goes on to that move\'s guide', (await txt(page, '#guideTitle')) === 'Goblet squat' && (await page.$eval('#guideSheet .fig', f => f.dataset.fig)) === 'goblet');
    await page.keyboard.press('Escape'); await page.waitForSelector('#guideSheet', { state: 'detached' });
    check('C Escape closes the guide', (await guideOf()) === null && (await page.$eval('#gd', e => e.hidden)) && (await page.evaluate(() => document.body.style.overflow)) === '');
    await openLib('fba', 'squat'); await page.mouse.click(195, 10); await page.waitForSelector('#guideSheet', { state: 'detached' });
    check('C a tap outside the sheet closes it too', (await guideOf()) === null);
    await ctx.close();
    // "Go easy on": only when the move loads an area that person protects
    await open({ me: 'jacquie', init: local(seedDocs({ jProfile: { move: { goalDays: 3, minMinutes: 10, protect: ['knee', 'shoulder'] } } })) });
    const ge = await page.evaluate(() => { const M = window.MorningLaps, host = document.createElement('div'), of = (k, pid) => { host.innerHTML = M.guideCardHTML(k, { pid, from: 'lib' }); const e = host.querySelector('.geasy'); return e ? e.textContent : ''; };
      return { press: of('st_legpress', 'jacquie'), chest: of('st_chest', 'jacquie'), row: of('st_row', 'jacquie'), calfStretch: of('sx_calf', 'jacquie'), opener: of('sx_chest', 'jacquie'), reach: of('sx_reach', 'jacquie'), tyson: of('st_legpress', 'tyson'), stress: ['st_legpress', 'st_chest', 'sx_reach', 'sx_calf'].map(k => M.GUIDE[k].stress.join(',')),
        gentle: M.GD_STATIONS.concat(M.STRETCHES.map(s => s.g)).filter(k => !/easy|gentl|comfortable|mild|soft|light/i.test(JSON.stringify(M.GUIDE[k]))) }; });
    check('C Jacquie protects her knees and shoulders: the leg press station says "Go easy on your knees", the chest press "your shoulders"', /^Go easy on your knees\./.test(ge.press) && /light, move slowly/.test(ge.press) && /^Go easy on your shoulders\./.test(ge.chest), JSON.stringify([ge.press, ge.chest]));
    check('C a stretch that loads a protected area says so in its own gentle words, and one that does not says nothing', /^Go easy on your shoulders\./.test(ge.opener) && /short of any pain/.test(ge.opener) && ge.reach === '' && !/knee|shoulder/.test(ge.stress[2]), JSON.stringify([ge.opener, ge.reach, ge.stress]));
    check('C the note is that person\'s own: Tyson protects nothing and sees none', ge.tyson === '');
    check('C the station and stretch cards are written gently', ge.gentle.length === 0, JSON.stringify(ge.gentle));
    await openLib('hp', 'st_legpress');
    const onScreen = await page.evaluate(() => { const e = document.querySelector('#guideSheet .geasy'), f = document.querySelector('#guideSheet .fig'); return e ? { text: e.textContent, afterFig: !!(f.compareDocumentPosition(e) & 4), firstInCard: e.parentNode.firstElementChild === e } : null; });
    check('C on screen the note sits right under the picture, before the equipment', onScreen && onScreen.afterFig && onScreen.firstInCard && /knees/.test(onScreen.text), JSON.stringify(onScreen));
  });

  // ---------- L: the guide in the lift sheet ----------
  await section('L', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    await watchWrites(page);
    const sc0 = await page.evaluate(() => JSON.stringify([window.MorningLaps.weekScore('tyson'), window.MorningLaps.weekScore('jacquie')]));
    await pick('strong'); await page.click('#ciLog'); await page.waitForSelector('#liftSheet');
    await page.click('[data-usew="squat"]'); await fill(page, '#r-squat-0', 10); await blur(); await page.waitForSelector('#rest:not([hidden])');
    const before = await page.evaluate(() => ({ rest: document.getElementById('restTime') ? document.getElementById('restTime').textContent : document.getElementById('rest').textContent, w: document.getElementById('w-squat').value, r: document.getElementById('r-squat-0').value, top: document.querySelector('.ls-body').scrollTop }));
    const names = await page.$$eval('#liftSheet .ex .bhead h3 .exname', els => els.map(e => [e.dataset.k, e.textContent, e.tagName, e.getAttribute('aria-label')]));
    check('L every exercise name in the lift sheet is a button that opens its guide', names.length === 6 && names[0][0] === 'squat' && names[0][1] === 'Barbell back squat' && names[0][2] === 'BUTTON' && names[0][3] === 'How to do Barbell back squat', JSON.stringify(names[0]));
    await page.click('.exname[data-k="squat"]'); await page.waitForSelector('#guideSheet[data-guide="squat"]');
    const over = await page.evaluate(() => { const g = document.getElementById('gd'), o = document.getElementById('ov'); return { ov: window.MorningLaps.state.ov.type, lift: !!document.getElementById('liftSheet'), z: [Number(getComputedStyle(g).zIndex), Number(getComputedStyle(o).zIndex), Number(getComputedStyle(document.getElementById('wm')).zIndex)], top: document.elementFromPoint(195, 400).closest('#gd, #ov').id, rest: !document.getElementById('rest').hidden, w: document.getElementById('w-squat').value, r: document.getElementById('r-squat-0').value }; });
    check('L tapping the name opens the guide in a sheet above the lift sheet, which stays open underneath', over.ov === 'lift' && over.lift && over.z[0] > over.z[1] && over.z[0] < over.z[2] && over.top === 'gd', JSON.stringify(over));
    check('L the typed set and the rest timer are untouched under it', over.rest && over.w === before.w && over.r === '10', JSON.stringify(over));
    await page.clock.runFor(3000);
    const sw = await page.evaluate(() => ({ btn: Array.from(document.querySelectorAll('#guideSheet [data-a="guide-swap"]')).map(b => b.dataset.to + ':' + b.textContent), easier: document.querySelector('#guideSheet [data-alt="easier"] p').textContent }));
    check('L in a workout, the easier move has a one-tap "Swap to it"', same(sw.btn, ['goblet:Swap to it']) && /^Goblet squat/.test(sw.easier), JSON.stringify(sw));
    await page.keyboard.press('Escape'); await page.waitForSelector('#guideSheet', { state: 'detached' });
    const after = await page.evaluate(() => ({ ov: window.MorningLaps.state.ov && window.MorningLaps.state.ov.type, lift: !!document.getElementById('liftSheet'), rest: !document.getElementById('rest').hidden, restText: document.getElementById('rest').textContent, r: document.getElementById('r-squat-0').value, top: document.querySelector('.ls-body').scrollTop, focus: document.activeElement.className, lock: document.body.style.overflow }));
    check('L Escape closes the guide only: the lift sheet is still there, at the same place, with the rest timer still counting', after.ov === 'lift' && after.lift && after.rest && after.r === '10' && after.top === before.top && after.focus === 'exname' && after.lock === 'hidden' && after.restText !== before.rest, JSON.stringify([after, before.rest]));
    // ··· then How to
    await page.click('[data-menu="dbbench"]'); await page.waitForSelector('.menu[data-menufor="dbbench"]');
    const items = await page.$$eval('.menu [role="menuitem"]', els => els.map(e => e.firstChild.textContent));
    check('L the ··· menu starts with "How to"', items[0] === 'How to' && items.includes('Swap exercise') && items.includes('Exercise details'), JSON.stringify(items));
    await page.click('.menu [data-act="howto"]'); await page.waitForSelector('#guideSheet[data-guide="dbbench"]');
    check('L ··· then How to opens that exercise\'s guide, and the menu is put away', (await txt(page, '#guideTitle')) === 'Dumbbell bench press' && !(await has(page, '.menu')) && (await page.evaluate(() => window.MorningLaps.state.ov.type)) === 'lift');
    check('L a dumbbell move says the weight is one dumbbell', /one dumbbell, not the pair/.test(await txt(page, '#guideSheet [data-sec="equip"]')));
    await page.click('#guideClose'); await page.waitForSelector('#guideSheet', { state: 'detached' });
    check('L up to here nothing was saved: guides opened and closed write nothing', (await writes(page)).length === 0 && (await ses(page, WED)) === null, JSON.stringify(await writes(page)));
    // the one-tap swap: this workout only
    await page.click('.exname[data-k="legcurl"]'); await page.waitForSelector('#guideSheet[data-guide="legcurl"]');
    const lc = await page.$$eval('#guideSheet .galt', els => els.map(e => e.dataset.alt + ':' + (e.querySelector('button') ? e.querySelector('button').dataset.a + ':' + (e.querySelector('button').dataset.to || e.querySelector('button').dataset.k) : 'none')));
    check('L leg curl: easier has no other exercise, harder swaps to the dumbbell RDL', same(lc, ['easier:none', 'harder:guide-swap:dbrdl']), JSON.stringify(lc));
    await page.click('#guideSheet [data-a="guide-swap"][data-to="dbrdl"]'); await page.waitForSelector('#guideSheet[data-guide="dbrdl"]');
    const sw2 = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('ml.drafts'))['2026-12-09'], ex = Array.from(document.querySelectorAll('#liftSheet .ex')).map(e => e.dataset.ex); return { draft: d.swaps, sheet: ex, chip: !!document.querySelector('#liftSheet .ex[data-ex="dbrdl"] .chip'), title: document.getElementById('guideTitle').textContent, toast: document.getElementById('toast').textContent, settings: JSON.parse(localStorage.getItem('ml.settings')).swaps, back: Array.from(document.querySelectorAll('#guideSheet [data-a="guide-swap"]')).map(b => b.dataset.to) }; });
    check('L "Swap to it" swaps that slot for this workout only: the sheet now shows the Romanian deadlift, marked swapped, and the guide moves on to it', same(sw2.draft, { legcurl: 'dbrdl' }) && sw2.sheet[4] === 'dbrdl' && !sw2.sheet.includes('legcurl') && sw2.chip && sw2.title === 'Dumbbell Romanian deadlift' && /Swapped to Dumbbell Romanian deadlift for this workout/.test(sw2.toast), JSON.stringify(sw2));
    check('L the default swaps in settings are not touched, and still nothing is saved', same(sw2.settings, {}) && (await writes(page)).length === 0, JSON.stringify(sw2.settings));
    check('L from the swapped move, its own easier option leads back to the planned leg curl', sw2.back.includes('legcurl'), JSON.stringify(sw2.back));
    await page.click('#guideSheet [data-a="guide-swap"][data-to="legcurl"]'); await page.waitForSelector('#guideSheet[data-guide="legcurl"]');
    check('L and swapping back restores the plan', same(await page.evaluate(() => JSON.parse(localStorage.getItem('ml.drafts'))['2026-12-09'].swaps), { legcurl: 'legcurl' }) && (await page.$$eval('#liftSheet .ex', els => els.map(e => e.dataset.ex)))[4] === 'legcurl');
    await page.click('#guideClose'); await page.waitForSelector('#guideSheet', { state: 'detached' });
    // saving is what it was: the same record as version 17 and 18 for the same typing
    await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('ml.drafts')); delete d['2026-12-09']; localStorage.setItem('ml.drafts', JSON.stringify(d)); });
    await ctx.close();
    await open({ me: 'tyson', init: local(seedDocs()) });
    await page.click('#addBtn'); await page.click('#addLift'); await page.waitForSelector('#liftSheet');
    await typeLift(async () => { await page.click('.exname[data-k="latpull"]'); await page.waitForSelector('#guideSheet'); await scrub('#guideSheet', 300); await page.click('#guideClose'); await page.waitForSelector('#guideSheet', { state: 'detached' });
      await page.click('[data-menu="legcurl"]'); await page.click('.menu [data-act="howto"]'); await page.waitForSelector('#guideSheet'); await page.click('#guideClose'); await page.waitForSelector('#guideSheet', { state: 'detached' }); });
    await saveLift();
    const rec = strip(await ses(page, WED));
    check('L a lift typed with guides opened along the way saves the very same record as before', same(rec, GOLD['lift.plain']), JSON.stringify(rec));
    check('L and the scores are what the same lift always gave', (await page.evaluate(() => window.MorningLaps.weekScore('tyson').total)) > JSON.parse(sc0)[0].total);
  });

  // ---------- W: the guide in live mode ----------
  await section('W', async () => {
    await open({ me: 'tyson', init: local(seedDocs({ tProfile: { trainMode: 'live', gear: { squat: { note: 'Rack 2 · hooks at 14' } } } })) });
    await watchWrites(page);
    await pick('strong'); await page.click('#ciStart'); await page.waitForSelector('#wm:not([hidden])'); if (await wmv() === 'start') await page.click('#wmStartSeq'); await waitView('main');
    await page.click('#wmWarmLog'); await page.waitForSelector('#wmLog');
    const lay = () => page.evaluate(() => { const body = document.querySelector('#wm .wm-body'), y = id => { const e = document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().top + body.scrollTop - body.getBoundingClientRect().top) : null; }, bot = id => { const e = document.getElementById(id); return Math.round(e.getBoundingClientRect().bottom + body.scrollTop - body.getBoundingClientRect().top); };
      return { first: body.firstElementChild.id, fig: document.querySelector('#wmDemo .fig').dataset.fig, compact: document.querySelector('#wmDemo .fig').classList.contains('compact'), demoBottom: bot('wmDemo'), name: y('wmName'), pips: y('wmPips'), w: y('wmW'), log: y('wmLog'), logBottom: bot('wmLog'), how: y('wmHowBtn'), card: y('wmHow'), scroll: body.scrollTop, fits: document.getElementById('wmLog').getBoundingClientRect().bottom <= document.querySelector('.wm-nav').getBoundingClientRect().top, vis: document.getElementById('wmLog').getBoundingClientRect().top >= body.getBoundingClientRect().top, myset: (document.querySelector('#wm .myset') || {}).textContent || '', expanded: document.getElementById('wmHowBtn').getAttribute('aria-expanded') }; });
    const l0 = await lay();
    check('W live: the demo of this exact lift sits at the top of the screen, above the name and the logging controls', l0.first === 'wmDemo' && l0.fig === 'squat' && l0.compact && l0.demoBottom <= l0.name && l0.name < l0.pips && l0.pips < l0.log, JSON.stringify(l0));
    check('W live: everything needed to log a set fits on the first screen, with "How to" closed under the Log button', l0.fits && l0.scroll === 0 && l0.card === null && l0.how >= l0.logBottom && l0.expanded === 'false', JSON.stringify(l0));
    check('W live: my settings show in one line under the exercise name', l0.myset === 'My settings: Rack 2 · hooks at 14' && (await page.evaluate(() => { const m = document.querySelector('#wm .myset'), n = document.getElementById('wmName'); return m.previousElementSibling === n && m.getBoundingClientRect().height < 26; })), l0.myset);
    const f0 = await svgOf('#wmDemo'); await page.clock.runFor(600); check('W live: the demo plays', (await svgOf('#wmDemo')) !== f0);
    await page.click('#wmHowBtn'); await page.waitForSelector('#wmHow');
    const l1 = await lay();
    check('W "How to" opens the full card below the logging controls: not one of them moves down', l1.card > l1.logBottom && l1.pips === l0.pips && l1.w === l0.w && l1.log === l0.log && l1.name === l0.name && l1.demoBottom === l0.demoBottom && l1.expanded === 'true', JSON.stringify([l0, l1]));
    check('W the Log button is still on screen with the card open', l1.vis, JSON.stringify(l1));
    const cardSecs = await page.$$eval('#wmHow .gsec h4', els => els.map(e => e.textContent));
    check('W the card in live mode is the full one, with My settings and a one-tap swap', same(cardSecs, ['Equipment', 'My settings', 'Set up', 'Do it', 'Breathe', 'Feel it in', 'Common mistakes', 'Easier and harder']) && same(await page.$$eval('#wmHow [data-a="guide-swap"]', els => els.map(e => e.dataset.to)), ['goblet']) && (await page.$eval('#wmHow .gsetin', e => e.value)) === 'Rack 2 · hooks at 14', JSON.stringify(cardSecs));
    await page.click('#wmLog'); await waitView('rest'); await page.click('#wmRestSkip'); await waitView('main');
    const l2 = await lay();
    check('W a set logged with the card open is logged, and the card is still open in the same place', (await page.evaluate(() => JSON.parse(localStorage.getItem('ml.drafts'))['2026-12-09'].ex.squat.reps[0])) === '10' && l2.card === l1.card && l2.log === l1.log && l2.scroll === l1.scroll, JSON.stringify([l1.scroll, l2.scroll, l2.card]));
    await page.click('#wmHow [data-a="guide-swap"]');
    const sw = await page.evaluate(() => ({ name: document.getElementById('wmName').textContent, fig: document.querySelector('#wmDemo .fig').dataset.fig, card: document.querySelector('#wmHow .gcard').dataset.guide, draft: JSON.parse(localStorage.getItem('ml.drafts'))['2026-12-09'].swaps, toast: document.getElementById('toast').textContent }));
    check('W "Swap to it" in live mode swaps this workout\'s lift: the name, the demo and the card all change', /^Goblet squat/.test(sw.name) && sw.fig === 'goblet' && sw.card === 'goblet' && same(sw.draft, { squat: 'goblet' }) && /Swapped to Goblet squat/.test(sw.toast), JSON.stringify(sw));
    await page.click('#wmHowBtn'); check('W "Hide how to" closes the card', !(await has(page, '#wmHow')) && (await txt(page, '#wmHowBtn')) === 'How to');
    await page.click('#wmNext'); const nx = await lay();
    check('W the next lift has its own demo, and its card starts closed', nx.fig === 'dbbench' && nx.card === null && nx.first === 'wmDemo', JSON.stringify(nx));
    check('W live demos and cards save nothing by themselves: only the set went into the draft', (await writes(page)).length === 0 && (await ses(page, WED)) === null, JSON.stringify(await writes(page)));
    await ctx.close();
    // Jacquie: the machine circuit and its stations
    await open({ me: 'jacquie', init: local(seedDocs({ jProfile: { gear: { st_row: { note: 'Seat 3 · chest pad 2' } }, move: { goalDays: 3, minMinutes: 10, protect: ['shoulder'] } } })) });
    await pick('good'); await page.click('#ciStart'); await page.waitForSelector('#wm:not([hidden])'); if (await wmv() === 'start') await page.click('#wmStartSeq'); await waitView('main');
    check('W a lap screen has no exercise demo', !(await has(page, '#wmDemo')));
    for (let i = 0; i < 6; i++) await page.click('#wmLap');
    await page.clock.fastForward(10 * 60000); await page.click('#wmNext'); await page.waitForSelector('#wmStations');
    const c0 = await page.evaluate(() => ({ first: document.querySelector('#wm .wm-body').firstElementChild.id, fig: document.querySelector('#wmDemo .fig').dataset.fig, rows: Array.from(document.querySelectorAll('#wmStations .wm-strow')).map(r => r.querySelector('[data-a="wm-station"] span').firstChild.textContent + '|' + (r.querySelector('.myset') ? r.querySelector('.myset').textContent : '') + '|' + r.querySelector('[data-a="wm-sthow"]').textContent), top: document.querySelector('#wm .wm-body').scrollTop }));
    check('W the circuit shows a machine\'s demo at the top, and each machine has its own "How to"', c0.first === 'wmDemo' && c0.fig === 'st_legpress' && c0.rows.length === 4 && c0.rows[0] === 'Leg press||How to' && c0.top === 0, JSON.stringify(c0));
    check('W her settings for the row machine show under its name', c0.rows[1] === 'Seated row|My settings: Seat 3 · chest pad 2|How to', c0.rows[1]);
    await page.click('#wmStations .wm-strow:nth-child(2) [data-a="wm-station"]');
    check('W tapping a machine counts a set as before, and the demo follows to that machine', (await page.$eval('#wmDemo .fig', f => f.dataset.fig)) === 'st_row' && (await txt(page, '#wmStations .wm-strow:nth-child(2) b.num')) === '1 set');
    const y0 = await page.evaluate(() => document.getElementById('wmStations').getBoundingClientRect().top + document.querySelector('#wm .wm-body').scrollTop);
    await page.click('#wmStations [data-a="wm-sthow"][data-k="2"]'); await page.waitForSelector('#wmHow');
    const c1 = await page.evaluate(() => { const body = document.querySelector('#wm .wm-body'); return { card: document.querySelector('#wmHow .gcard').dataset.guide, fig: document.querySelector('#wmDemo .fig').dataset.fig, easy: (document.querySelector('#wmHow .geasy') || {}).textContent || '', below: document.getElementById('wmHow').getBoundingClientRect().top >= document.getElementById('wmStations').getBoundingClientRect().bottom, y: document.getElementById('wmStations').getBoundingClientRect().top + body.scrollTop, pressed: document.querySelector('[data-a="wm-sthow"][data-k="2"]').getAttribute('aria-expanded'), sets: document.querySelector('#wmStations .wm-strow:nth-child(3) b.num').textContent, stVis: document.getElementById('wmStations').getBoundingClientRect().top >= body.getBoundingClientRect().top - 1 }; });
    check('W "How to" on the chest press opens its card under the list of machines, which does not move, and counts no set', c1.card === 'st_chest' && c1.fig === 'st_chest' && c1.below && Math.abs(c1.y - y0) < 1 && c1.pressed === 'true' && c1.sets === '0 sets' && c1.stVis, JSON.stringify(c1));
    check('W her "Go easy on your shoulders" note is on the chest press card', /^Go easy on your shoulders\./.test(c1.easy), c1.easy);
    for (const k of [0, 0, 2, 3]) await page.click('#wmStations .wm-strow:nth-child(' + (k + 1) + ') [data-a="wm-station"]');
    check('W with a card open, tapping another machine moves the card and the demo to it', (await page.$eval('#wmHow .gcard', c => c.dataset.guide)) === 'st_latpull' && (await page.$eval('#wmDemo .fig', f => f.dataset.fig)) === 'st_latpull');
    await page.clock.fastForward(15 * 60000); await page.click('#wmFinish'); await waitView('finish'); await page.click('#wmSave'); await page.waitForSelector('#wmDoneBtn');
    const jr = strip(await kv(page, 'profiles/jacquie/sessions/' + WED));
    check('W the guided session saves the very same record as before: one activity with her check-in', same(jr, Object.assign({}, GOLD['j.good.checkin'], { acts: [Object.assign({}, GOLD['j.good.checkin'].acts[0], { note: GOLD['j.good.checkin'].acts[0].note + ': leg press 2, seated row 1, chest press 1, lat pulldown 1' })] })), JSON.stringify(jr));
    await ctx.close();
    // a guided stretch
    await open({ me: 'tyson', init: local(seedDocs({ tProfile: { trainMode: 'live' } })) });
    await pick('sore'); if (await has(page, '[data-a="ci-opt"][data-v="hppool"]')) await page.click('[data-a="ci-opt"][data-v="hppool"]');
    await page.click('#ciStart'); await page.waitForSelector('#wm:not([hidden])'); if (await wmv() === 'start') await page.click('#wmStartSeq'); await waitView('main');
    await page.click('#wmNext'); await page.waitForSelector('#wmStretchName');
    const seen = [];
    for (let i = 0; i < 8; i++) { seen.push(await page.evaluate(() => [document.getElementById('wmStretchName').textContent, document.querySelector('#wmDemo .fig').dataset.fig, document.querySelector('#wm .wm-body').firstElementChild.id, !!document.getElementById('wmHowBtn')])); if (i === 2) { await page.click('#wmHowBtn'); await page.waitForSelector('#wmHow'); }
      if (i === 2) seen[2].push(await page.$eval('#wmHow .gcard', c => c.dataset.guide), await page.$$eval('#wmHow .gsec h4', els => els.map(e => e.textContent).includes('My settings'))); await page.click('#wmStretchNext'); }
    const want = await page.evaluate(() => window.MorningLaps.STRETCHES.map(s => [s.name, s.g]));
    check('W each of the 8 stretches has its own demo at the top and its own "How to"', seen.length === 8 && seen.every((s, i) => s[0] === want[i][0] && s[1] === want[i][1] && s[2] === 'wmDemo' && s[3]), JSON.stringify(seen));
    check('W a stretch card has no My settings, and closes when the next stretch starts', seen[2][4] === 'sx_calf' && seen[2][5] === false && !(await has(page, '#wmHow')), JSON.stringify(seen[2]));
  });

  // ---------- G: the Exercise guide library ----------
  await section('G', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    await watchWrites(page);
    await go(page, 'program'); await page.waitForSelector('#guideLib');
    const lib = await page.evaluate(() => ({ title: document.querySelector('#guideLib h3').textContent, groups: Array.from(document.querySelectorAll('#guideLib .glgroup')).map(d => d.querySelector('summary').textContent.trim() + ':' + d.querySelectorAll('.glrow').length + ':' + d.open), ph: document.getElementById('glQ').placeholder, y: document.getElementById('guideLib').getBoundingClientRect().top, first: Array.from(document.querySelectorAll('[data-group="fba"] .glrow')).map(r => r.dataset.k), second: Array.from(document.querySelectorAll('[data-group="fbb"] .glrow')).map(r => r.dataset.k), keys: Array.from(document.querySelectorAll('#guideLib .glrow')).map(r => r.dataset.k) }));
    check('G the Program tab has an "Exercise guide" library, near the top', lib.title === 'Exercise guide' && lib.y < 700 && lib.ph === 'Search 45 moves', JSON.stringify([lib.title, lib.y, lib.ph]));
    check('G grouped by Full Body A, Full Body B, other lifts, stretches and Healthplex activities', same(lib.groups, ['Full Body A 6:6:false', 'Full Body B 8:8:false', 'Other lifts 19:19:false', 'Stretches 8:8:false', 'Healthplex activities 4:4:false']), JSON.stringify(lib.groups));
    check('G every exercise and station is in it once, in workout order within a day', lib.keys.length === 45 && new Set(lib.keys).size === 45 && same(lib.first, ['squat', 'dbbench', 'latpull', 'dbshoulder', 'legcurl', 'legraise']) && same(lib.second, ['dbrdl', 'inclinedb', 'seatedrow', 'lunge', 'latraise', 'facepull', 'dbcurl', 'pushdown']), JSON.stringify(lib.first));
    const vis = () => page.evaluate(() => ({ rows: Array.from(document.querySelectorAll('#guideLib .glrow')).filter(r => !r.hidden && r.closest('details').open && !r.closest('details').hidden).map(r => r.dataset.k), groups: Array.from(document.querySelectorAll('#guideLib .glgroup')).filter(d => !d.hidden).map(d => d.dataset.group), none: !document.getElementById('glNone').hidden, focus: document.activeElement.id, muts: window.__muts }));
    await page.evaluate(() => { window.__muts = 0; new MutationObserver(m => { m.forEach(x => { if (x.type === 'childList') window.__muts++; }); }).observe(document.getElementById('main'), { childList: true, subtree: true }); });
    await page.click('#glQ'); await page.keyboard.type('row');
    const s1 = await vis();
    check('G typing "row" finds the rows and opens their groups, without redrawing the page under the keyboard', same(s1.rows, ['seatedrow', 'dbrow', 'st_row']) && same(s1.groups, ['fbb', 'lifts', 'hp']) && !s1.none && s1.focus === 'glQ' && s1.muts === 0, JSON.stringify(s1));
    await fill(page, '#glQ', 'calves'); const s2 = await vis();
    check('G a body part works as a search too: "calves"', s2.rows.includes('calf') && s2.rows.includes('sx_calf') && s2.rows.length < 8 && (await page.evaluate(ks => ks.every(k => /calf/.test(k) || window.MorningLaps.GUIDE[k].main.concat(window.MorningLaps.GUIDE[k].also).includes('calves')), s2.rows)), JSON.stringify(s2.rows));
    await fill(page, '#glQ', 'cable rope'); const s3 = await vis();
    check('G and so does equipment: "cable rope"', same(s3.rows, ['facepull']), JSON.stringify(s3.rows));
    await fill(page, '#glQ', 'zzz'); const s4 = await vis();
    check('G a search with no match says so', s4.rows.length === 0 && s4.none && s4.groups.length === 0);
    await fill(page, '#glQ', ''); const s5 = await vis();
    check('G clearing the search brings back all five groups, closed', s5.groups.length === 5 && s5.rows.length === 0 && !s5.none);
    await fill(page, '#glQ', 'butterfly'); await page.click('.glrow[data-k="sx_butterfly"]'); await page.waitForSelector('#guideSheet[data-guide="sx_butterfly"]');
    check('G tapping a result opens its guide', (await txt(page, '#guideTitle')) === 'Butterfly' && (await txt(page, '#guideSub')) === 'Cool-down stretch' && (await page.$eval('#guideSheet .fig', f => f.dataset.view)) === 'front');
    await page.click('#guideClose'); await page.waitForSelector('#guideSheet', { state: 'detached' });
    check('G closing it returns to the library with the search kept', (await val(page, '#glQ')) === 'butterfly' && (await vis()).rows.length === 1 && (await page.evaluate(() => document.activeElement.dataset.k)) === 'sx_butterfly');
    // every guide opens from the library, at 390 px, with nothing sideways
    await fill(page, '#glQ', '');
    const all = await page.evaluate(async () => { const M = window.MorningLaps, bad = [], seen = []; for (const g of M.guideGroups()) for (const k of g[2]) { M.guideOpen(k, { from: 'lib' }); const S = document.getElementById('guideSheet'), body = S.querySelector('.gd-body');
      if (!S || S.dataset.guide !== k || !S.querySelector('svg.figs') || !S.querySelector('.gcard') || document.documentElement.scrollWidth > innerWidth || body.scrollWidth > body.clientWidth + 1 || /undefined|NaN/.test(S.textContent)) bad.push(k); seen.push(k); M.guideClose(); } return { bad, n: seen.length, open: !!document.getElementById('guideSheet') }; });
    check('G all 45 guides open in the sheet at 390 px with a picture and a card, and nothing scrolls sideways', all.n === 45 && all.bad.length === 0 && !all.open, JSON.stringify(all.bad));
    check('G browsing the library and its guides saves nothing', (await writes(page)).length === 0, JSON.stringify(await writes(page)));
    await ctx.close();
    await open({ me: 'jacquie', init: local(seedDocs()) });
    await go(page, 'program'); await page.waitForSelector('#guideLib');
    const jl = await page.evaluate(() => ({ groups: Array.from(document.querySelectorAll('#guideLib .glgroup')).map(d => d.dataset.group), rows: document.querySelectorAll('#guideLib .glrow').length, plan: !!document.querySelector('#main .card h2') && /Move \d day/.test(document.querySelector('#main .card h2').textContent), wide: document.documentElement.scrollWidth - innerWidth }));
    check('G Jacquie\'s Plan tab has the same library', jl.plan && same(jl.groups, ['fba', 'fbb', 'lifts', 'stretch', 'hp']) && jl.rows === 45 && jl.wide <= 0, JSON.stringify(jl));
  });

  // ---------- M: My settings per machine ----------
  await section('M', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    await watchWrites(page);
    const prof0 = await kv(page, 'profiles/tyson');
    await pick('strong'); await page.click('#ciLog'); await page.waitForSelector('#liftSheet');
    check('M with nothing set, no settings line shows in the lift sheet', (await page.$$('#liftSheet .myset')).length === 0);
    await page.click('.exname[data-k="latpull"]'); await page.waitForSelector('#guideSheet[data-guide="latpull"]');
    const f0 = await page.evaluate(() => { const i = document.getElementById('gdSet'); return { value: i.value, max: i.maxLength, ph: i.placeholder, label: i.getAttribute('aria-label'), sec: i.closest('.gsec').querySelector('h4').textContent, prev: i.closest('.gsec').previousElementSibling.dataset.sec }; });
    check('M every exercise guide has "My settings": one short text field, right under Equipment', f0.sec === 'My settings' && f0.value === '' && f0.max === 60 && f0.ph === 'Seat 4 · back pad 2 · handles middle' && f0.label === 'My settings for Lat pulldown machine' && f0.prev === 'equip', JSON.stringify(f0));
    await fill(page, '#gdSet', '  Seat 4 ·  thigh pad 3  '); await page.click('#gdSetSave');
    await page.waitForFunction(() => { const p = (JSON.parse(localStorage.getItem('ml.kv') || '{}'))['profiles/tyson']; return p && p.gear && p.gear.latpull; });
    const prof1 = await kv(page, 'profiles/tyson');
    check('M Save keeps it on that person\'s profile, tidied, and touches nothing else on it', same(prof1.gear, { latpull: { note: 'Seat 4 · thigh pad 3' } }) && same(Object.keys(prof1).filter(k => k !== 'gear' && k !== 'updatedAt').sort(), Object.keys(prof0).filter(k => k !== 'updatedAt').sort()) && prof1.name === prof0.name && prof1.place === prof0.place, JSON.stringify(prof1));
    check('M one save is one write, to the profile only', same(await writes(page), ['ml.kv']) && (await ses(page, WED)) === null && (await kv(page, 'profiles/jacquie')).gear === undefined, JSON.stringify(await writes(page)));
    check('M the guide stays open, the field shows the saved line, and a message says so', (await guideOf()) === 'latpull' && (await val(page, '#gdSet')) === 'Seat 4 · thigh pad 3' && /Settings saved/.test(await txt(page, '#toast')));
    await page.click('#guideClose'); await page.waitForSelector('#guideSheet', { state: 'detached' });
    const line = await page.evaluate(() => { const ex = document.querySelector('#liftSheet .ex[data-ex="latpull"]'), m = ex.querySelector('.myset'), h = ex.querySelector('.bhead'); return m ? { text: m.textContent, afterName: h.nextElementSibling === m, h: m.getBoundingClientRect().height, others: document.querySelectorAll('#liftSheet .myset').length, ws: getComputedStyle(m).whiteSpace } : null; });
    check('M it shows in one line under the exercise name in the lift sheet', line && line.text === 'My settings: Seat 4 · thigh pad 3' && line.afterName && line.h < 24 && line.ws === 'nowrap' && line.others === 1, JSON.stringify(line));
    // Enter saves; a long line is cut at 60; typed text survives a redraw
    await page.click('.exname[data-k="squat"]'); await page.waitForSelector('#guideSheet[data-guide="squat"]');
    check('M the example in the empty field fits the equipment: a rack for the squat', (await page.$eval('#gdSet', i => i.placeholder)) === 'Rack 2 · hooks at 14 · safeties at 6');
    await page.click('#gdSet'); await page.keyboard.type('Rack 2'); await page.click('#guideSheet .figview');
    check('M a line typed and not saved yet survives the sheet being drawn again', (await val(page, '#gdSet')) === 'Rack 2' && (await kv(page, 'profiles/tyson')).gear.squat === undefined);
    await page.click('#gdSet'); await page.keyboard.press('End'); await page.keyboard.type(' · hooks at 14 · safeties at 6 · bar pad on · plates from the left tree'); await page.keyboard.press('Enter');
    await page.waitForFunction(() => { const p = (JSON.parse(localStorage.getItem('ml.kv') || '{}'))['profiles/tyson']; return p.gear && p.gear.squat; });
    const g2 = (await kv(page, 'profiles/tyson')).gear;
    check('M Enter saves too, a line stops at 60 characters, and the first setting is still there', g2.squat.note.length === 60 && g2.squat.note.startsWith('Rack 2 · hooks at 14') && g2.latpull.note === 'Seat 4 · thigh pad 3', JSON.stringify(g2));
    await page.click('#gdSetSave'); check('M saving the same line again writes nothing', /Already saved/.test(await txt(page, '#toast')) && (await writes(page)).length === 2);
    await fill(page, '#gdSet', ''); await page.click('#gdSetSave'); await page.waitForFunction(() => !(JSON.parse(localStorage.getItem('ml.kv') || '{}'))['profiles/tyson'].gear.squat);
    check('M clearing the field and saving removes that setting only', same((await kv(page, 'profiles/tyson')).gear, { latpull: { note: 'Seat 4 · thigh pad 3' } }) && /Settings cleared/.test(await txt(page, '#toast')));
    await page.click('#guideClose'); await page.waitForSelector('#guideSheet', { state: 'detached' });
    check('M and its line is gone from the lift sheet', (await page.$$eval('#liftSheet .myset', els => els.map(e => e.dataset.myset))).join() === 'latpull');
    // per person
    await page.click('#liftClose'); await page.waitForSelector('#liftSheet', { state: 'detached' });
    await switchTo(page, 'jacquie');
    await openLib('fba', 'latpull');
    check('M settings are per person: Jacquie\'s lat pulldown field is empty', (await val(page, '#gdSet')) === '');
    await fill(page, '#gdSet', 'Seat 2'); await page.click('#gdSetSave'); await page.waitForFunction(() => { const p = (JSON.parse(localStorage.getItem('ml.kv') || '{}'))['profiles/jacquie']; return p.gear && p.gear.latpull; });
    await page.click('#guideClose'); await openLib('hp', 'st_row'); await fill(page, '#gdSet', 'Seat 3 · chest pad 2'); await page.click('#gdSetSave'); await page.waitForFunction(() => { const p = (JSON.parse(localStorage.getItem('ml.kv') || '{}'))['profiles/jacquie']; return p.gear && p.gear.st_row; });
    check('M hers are saved on her profile, a station too, and his are unchanged', same((await kv(page, 'profiles/jacquie')).gear, { latpull: { note: 'Seat 2' }, st_row: { note: 'Seat 3 · chest pad 2' } }) && same((await kv(page, 'profiles/tyson')).gear, { latpull: { note: 'Seat 4 · thigh pad 3' } }));
    await page.click('#guideClose'); await openLib('stretch', 'sx_child');
    check('M a stretch has no My settings', !(await has(page, '#guideSheet #gdSet')) && !(await has(page, '#guideSheet .gmine')));
    await page.click('#guideClose');
    // a save that fails says so and keeps what was typed
    await ctx.close();
    await open({ me: 'tyson', init: local(seedDocs()) + ';window.__noReady=1;' });
    await openLib('fba', 'squat'); await fill(page, '#gdSet', 'Rack 3');
    await page.evaluate(() => { window.MorningLaps.state.ready = false; }); await page.click('#gdSetSave'); await page.waitForTimeout(150);
    const fl = await page.evaluate(() => ({ toast: document.getElementById('toast').textContent, value: document.getElementById('gdSet').value, gear: ((JSON.parse(localStorage.getItem('ml.kv') || '{}'))['profiles/tyson'] || {}).gear }));
    check('M when the log cannot be reached the setting is not saved, a message says so, and the typed line is kept', /Still loading|cannot be reached/.test(fl.toast) && fl.value === 'Rack 3' && fl.gear === undefined, JSON.stringify(fl));
  });

  // ---------- D: nothing else changed ----------
  await section('D', async () => {
    await open({ me: 'tyson', init: local(seedDocs()) });
    const ex = await page.evaluate(() => { const M = window.MorningLaps; return { has: ['state', 'P', 'weekScore', 'EX', 'DAYS', 'ACTS', 'STRETCHES', 'FIG', 'GUIDE', 'fgSVG', 'figSt', 'guideOpen', 'wmState', 'dayInfo'].filter(k => M[k] == null), gone: ['MOVE_OF', 'HOWTO', 'demoSVG'].filter(k => M[k] != null), old: document.querySelectorAll('.mv, .mvj, #wmCues, #wmMistake').length, css: Array.from(document.styleSheets).some(s => { try { return Array.from(s.cssRules).some(r => /\.mvj|mvk/.test(r.cssText)); } catch (e) { return false; } }) }; });
    check('D window.MorningLaps is still exported, with the new guide on it', ex.has.length === 0, JSON.stringify(ex.has));
    check('D the old one-figure-per-pattern demos and their three cues are gone', ex.gone.length === 0 && ex.old === 0 && !ex.css, JSON.stringify(ex));
    const before = await page.evaluate(() => ({ sessions: localStorage.getItem('ml.sessions'), kv: localStorage.getItem('ml.kv'), settings: localStorage.getItem('ml.settings'), scores: JSON.stringify([window.MorningLaps.weekScore('tyson'), window.MorningLaps.weekScore('jacquie')]) }));
    await watchWrites(page);
    await pick('strong'); await page.click('#ciLog'); await page.waitForSelector('#liftSheet');
    for (const k of ['squat', 'dbbench', 'latpull', 'dbshoulder', 'legcurl', 'legraise']) { await page.click('.exname[data-k="' + k + '"]'); await page.waitForSelector('#guideSheet[data-guide="' + k + '"]'); await page.clock.runFor(300); await page.click('#guideClose'); await page.waitForSelector('#guideSheet', { state: 'detached' }); }
    await page.click('#liftClose'); await page.waitForSelector('#liftSheet', { state: 'detached' });
    await go(page, 'program'); await page.waitForSelector('#guideLib'); await fill(page, '#glQ', 'press'); await fill(page, '#glQ', '');
    const after = await page.evaluate(() => ({ sessions: localStorage.getItem('ml.sessions'), kv: localStorage.getItem('ml.kv'), settings: localStorage.getItem('ml.settings'), scores: JSON.stringify([window.MorningLaps.weekScore('tyson'), window.MorningLaps.weekScore('jacquie')]) }));
    check('D opening every guide of a workout and searching the library changes no saved data and no score', same(before, after) && (await writes(page)).length === 0, JSON.stringify(await writes(page)));
    // the picture never draws outside its own sheet
    await page.evaluate(() => { window.__mm = 0; window.__gm = 0; new MutationObserver(m => { window.__mm += m.length; }).observe(document.getElementById('main'), { childList: true, subtree: true, attributes: true, characterData: true });
      new MutationObserver(m => { window.__gm += m.length; }).observe(document.getElementById('gd'), { childList: true, subtree: true }); });
    await page.click('[data-group="fba"] summary'); await page.evaluate(() => { window.__mm = 0; }); await page.click('.glrow[data-k="squat"]'); await page.waitForSelector('#guideSheet'); await page.clock.runFor(1500);
    const mu = await page.evaluate(() => [window.__mm, window.__gm]);
    check('D while a guide plays, only its own sheet is redrawn: the page behind is not touched', mu[0] === 0 && mu[1] > 10, JSON.stringify(mu));
  });

  // ---------- S: smoke: both profiles, every tab, light and dark ----------
  await section('S', async () => {
    const bad = [], wide = [];
    for (const [me, scheme] of [['tyson', 'light'], ['jacquie', 'dark']]) {
      await open({ me, scheme, init: local(seedDocs()) });
      for (const tab of ['train', 'program', 'history', 'fuel', 'compete', 'me']) { await go(page, tab); await page.waitForTimeout(60);
        const t = await page.evaluate(() => ({ text: document.getElementById('main').textContent, w: document.documentElement.scrollWidth - innerWidth })); if (/undefined|NaN|\[object/.test(t.text)) bad.push(me + ':' + tab); if (t.w > 0) wide.push(me + ':' + tab + ':' + t.w); }
      await openLib('lifts', 'pecdeck'); const c = await page.evaluate(() => { const svg = document.querySelector('#guideSheet svg.figs'), cs = getComputedStyle(svg), body = getComputedStyle(svg.querySelector('.fgb')); return { bg: cs.backgroundColor, stroke: body.stroke, w: svg.getBoundingClientRect().width }; });
      if (c.bg === c.stroke || c.w < 300) bad.push(me + ':figure colors ' + JSON.stringify(c));
      await page.click('#guideClose'); await ctx.close();
    }
    check('S every tab draws for both profiles in light and dark, with nothing broken in the text', bad.length === 0, bad.join(' '));
    check('S at 390 px wide nothing scrolls sideways', wide.length === 0, wide.join(' '));
  });
  check('no console errors in any section', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  await browser.close();
  process.exit(finish('version 19 checks') ? 1 : 0);
})();
