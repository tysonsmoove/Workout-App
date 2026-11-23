// The checks for the six additions of version 13, in a headless browser in browser-only mode with seeded storage:
// two profiles and six-plus weeks of history, Tyson in Phase 3 with one stalled lift, three full weeks in a row for
// Jacquie, pain notes, and stakes on closed weeks. "Carry" means a fresh browser context later in time, same storage.
// Run: node tests/v13.test.js  (see tests/helpers.js for the local server it expects)
const { chromium, check, T, newPage, val, txt, has, fill, go, score, finish } = require('./helpers');
const seen = page => page.evaluate(() => window.__seen.slice());
const kvAll = page => page.evaluate(() => JSON.parse(localStorage.getItem('ml.kv') || '{}'));
const kv = (page, path) => page.evaluate(p => (JSON.parse(localStorage.getItem('ml.kv') || '{}'))[p] || null, path);
const ses = (page, d) => page.evaluate(x => (JSON.parse(localStorage.getItem('ml.sessions') || '{}'))[x] || null, d);
const settings = page => page.evaluate(() => JSON.parse(localStorage.getItem('ml.settings') || '{}'));
const ML = (page, fn, arg) => page.evaluate(fn, arg);
const toastWith = (page, part) => page.waitForFunction(x => { const t = document.getElementById('toast'); return !t.hidden && t.textContent.includes(x) ? t.textContent : false; }, part, { timeout: 5000 }).then(h => h.jsonValue()).catch(() => txt(page, '#toast'));
const settled = page => page.waitForFunction(() => window.MorningLaps.state.ready && !!(JSON.parse(localStorage.getItem('ml.kv') || '{}'))['profiles/jacquie/weekgoals/' + (function () { const s = window.MorningLaps.state.today, d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8))); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); })()]);
const switchTo = async (page, pid) => { await page.click('#whoBtn'); await page.click('[data-a="who-pick"][data-pid="' + pid + '"]'); await page.waitForFunction(p => window.MorningLaps.state.pid === p && document.getElementById('ov').hidden, pid); };
const pickDate = (page, d) => page.click('.datebar [data-date="' + d + '"]');
const carry = async (page, drop) => { const all = await page.evaluate(() => Object.assign({}, localStorage)); (drop || []).forEach(k => delete all[k]); return 'if(!localStorage.getItem("carried")){localStorage.clear();var s=' + JSON.stringify(all) + ';Object.keys(s).forEach(function(k){localStorage.setItem(k,s[k]);});localStorage.setItem("carried","1");}'; };
const plus = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);

/* ---------- the seed: history from Mon Oct 26 through Fri Dec 4, "today" Wed Dec 9 ---------- */
const WEEKS = ['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'];
const reps = (n, c) => Array.from({ length: c || 3 }, () => n);
// week i: every lift goes up a step except the shoulder press, which sits at 50 lb for 10s: the one stalled lift
const SETS = (day, i) => day === 'push' ? { chestpress: { w: 70 + 5 * i, reps: reps(12) }, shoulderpress: { w: 50, reps: reps(10) }, pushdown: { w: 40 + 5 * i, reps: reps(15) } }
  : day === 'pull' ? { latpull: { w: 80 + 5 * i, reps: reps(12) }, seatedrow: { w: 80 + 5 * i, reps: reps(12) }, dbcurl: { w: 20 + 2.5 * i, reps: reps(12) } }
  : { legpress: { w: 140 + 10 * i, reps: reps(12) }, legext: { w: 70 + 5 * i, reps: reps(15) }, legcurl: { w: 60 + 5 * i, reps: reps(15) } };
const lift = (date, day, phase, ex, extra) => Object.assign({ v: 2, date, kind: 'strength', day, phase, planned: Object.keys(ex), plannedBase: Object.keys(ex), swaps: {}, ex, qualifies: true, complete: true, treadmill: { minutes: 20, title: '' }, savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' }, extra);
const tread = (date, phase) => ({ v: 2, date, kind: 'cardio', phase, treadmill: { minutes: 25, title: 'Fitness+ run' }, savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' });
const act = (date, a, name, min, more) => Object.assign({ id: 'a-' + a + '-' + date, a, name, min, feel: 'good', hurt: false, note: '', mv: true, at: date + 'T12:00:00Z' }, more);
const day = (date, acts) => ({ v: 2, date, kind: 'activity', acts, savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' });
const item = (id, name, meal, kcal, p) => ({ id, name, meal, qty: 1, unit: 'serving', grams: null, src: 'Quick add', n: [kcal, p, null, null, null, null, null, null, null, null, null, null, null, null] });
const FINALS = {};
[['2026-10-26', 48, 52, 'jacquie', ''], ['2026-11-02', 61, 58, 'tyson', ''], ['2026-11-09', 55, 63, 'jacquie', ''], ['2026-11-16', 64, 60, 'tyson', 'washes the car'], ['2026-11-23', 57, 66, 'jacquie', 'cooks Sunday dinner']]
  .forEach(([ws, t, j, w, st]) => { FINALS['results/' + ws] = Object.assign({ ws, tyson: t, jacquie: j, winner: w, played: true, final: true, teamWeek: true, closedAt: plus(ws, 9) + 'T12:00:00.000Z' }, st ? { stakes: st } : {}); });
// opt.settings: extra lifting settings. opt.jFull: which of the last three weeks Jacquie filled (default all). opt.jProfile / opt.tSettings / opt.sixDay / opt.sevenDay: goal variants.
// opt.thisWeek: Tyson's lift records for the current week. opt.jHistoryFrom: drop Jacquie's history before this Monday.
function seed(opt) {
  opt = opt || {};
  const sessions = {}, kv = Object.assign({}, FINALS), jFull = opt.jFull || {};
  WEEKS.forEach((ws, i) => { const ph = i < 2 ? 1 : i === 2 ? 2 : 3, d = n => plus(ws, n);
    sessions[d(0)] = lift(d(0), 'push', ph, SETS('push', i)); sessions[d(1)] = tread(d(1), ph); sessions[d(2)] = lift(d(2), 'pull', ph, SETS('pull', i)); sessions[d(3)] = tread(d(3), ph);
    sessions[d(4)] = i === 0 ? tread(d(4), ph) : lift(d(4), 'legs', ph, SETS('legs', i)); // the first week had two lifts, so five lift weeks are complete
    if (opt.sixDay) sessions[d(5)] = tread(d(5), ph);
    if (opt.jHistoryFrom && ws < opt.jHistoryFrom) return;
    const full = jFull[ws] !== false;
    kv['profiles/jacquie/sessions/' + d(0)] = day(d(0), [act(d(0), 'walkeasy', 'Easy walk', 20)]);
    if (full) kv['profiles/jacquie/sessions/' + d(2)] = day(d(2), [act(d(2), 'chairyoga', 'Chair yoga', 20)].concat(ws === '2026-11-30' ? [act(d(2), 'yard', 'Yard work or gardening', 20, { hurt: true, note: 'back tight after raking' })] : []));
    kv['profiles/jacquie/sessions/' + d(4)] = day(d(4), [act(d(4), 'walkbrisk', 'Brisk walk', 20, ws === '2026-11-02' ? { hurt: true, note: 'old note, long ago' } : ws === '2026-11-23' ? { hurt: true, note: 'left knee sore' } : ws === '2026-11-30' ? { hurt: true, note: 'knee again on the hill' } : {})]);
    if (opt.sevenDay) [1, 3, 5, 6].forEach(n => { kv['profiles/jacquie/sessions/' + d(n)] = day(d(n), [act(d(n), 'walkeasy', 'Easy walk', 20)]); });
  });
  (opt.thisWeek || []).forEach(r => { sessions[r.date] = r; });
  kv['profiles/jacquie/sessions/2026-12-07'] = day('2026-12-07', [act('2026-12-07', 'walkeasy', 'Easy walk', 20)]);
  kv['profiles/jacquie/sessions/2026-12-08'] = day('2026-12-08', [act('2026-12-08', 'chairyoga', 'Chair yoga', 20)]);
  kv['profiles/jacquie/food/2026-11-30'] = { v: 1, date: '2026-11-30', items: [item('f1', 'Seeded day', 'd', 1800, 100)], water: 76 };
  kv['profiles/jacquie/food/2026-12-01'] = { v: 1, date: '2026-12-01', items: [item('f2', 'Seeded day', 'd', 1800, 100)], water: 40 };
  kv['profiles/jacquie/food/2026-12-08'] = { v: 1, date: '2026-12-08', items: [item('y1', 'Oatmeal with milk', 'b', 300, 10), item('y2', 'Banana', 'b', 105, 1), item('y3', 'Chicken and rice', 'd', 650, 45)], water: 32 };
  kv['profiles/jacquie'] = Object.assign({ name: 'Jacquie', body: { sex: 'f', age: 30, heightIn: 64, weightLb: 150, activity: 'light', pace: 'maintain' }, weighIns: { '2026-10-26': 150 }, badges: { green: '2026-10-26', water1: '2026-11-30', fuel1: '2026-11-30' } }, opt.jProfile);
  kv['comp/settings'] = { start: '2026-10-26', stakes: '', stakesBy: { '2026-11-30': 'buys coffee' } };
  return 'if(!localStorage.getItem("seeded")){localStorage.setItem("seeded","1");localStorage.setItem("ml.sessions",' + JSON.stringify(JSON.stringify(sessions)) + ');localStorage.setItem("ml.settings",' +
    JSON.stringify(JSON.stringify(Object.assign({ startDate: '2026-10-26', goal: 5, maxed: {}, swaps: {} }, opt.settings))) + ');localStorage.setItem("ml.kv",' + JSON.stringify(JSON.stringify(kv)) + ');}' + (opt.pre || '');
}
const MON = T('2026-12-07T17:00:00Z'), WED = T('2026-12-09T17:00:00Z'), NEXT = T('2026-12-14T17:00:00Z');

(async () => {
  const browser = await chromium.launch();
  let ctx, page; const consoleErrors = [];
  const open = async (opts) => { ({ ctx, page } = await newPage(browser, opts)); page.on('console', m => { if (m.type() === 'error' && !/favicon/i.test(m.text())) consoleErrors.push(m.text()); }); await settled(page); return page; };
  const section = async (tag, fn) => {
    try { await fn(); } catch (e) { check(tag + ' ran to the end', false, String(e && e.message || e).split('\n')[0]); }
    try { if (ctx) await ctx.close(); } catch (e) { /* already closed */ }
  };

  // ---------- 0: the seed is what was asked for ----------
  await section('S', async () => {
    await open({ me: 'tyson', time: WED, init: seed() });
    const s = await ML(page, () => { const M = window.MorningLaps, d = M.state.data; return { mode: M.state.storage, phase: M.phaseFor('2026-12-09', 'tyson'), cw: M.completedWeeks('2026-12-09', 'tyson'), t: Object.keys(d.tyson.sessions).length, j: Object.keys(d.jacquie.sessions).length,
      first: Object.keys(d.tyson.sessions).sort()[0], stall: !!M.stallFor('shoulderpress', '2026-12-09'), others: ['chestpress', 'pushdown', 'latpull', 'seatedrow', 'dbcurl', 'legpress', 'legext', 'legcurl'].filter(k => M.stallFor(k, '2026-12-09')).length,
      full: ['2026-11-16', '2026-11-23', '2026-11-30'].every(ws => M.weekScore('jacquie', ws).moveFull), pain: M.painNotes('jacquie').list.length, stakes: M.compWeeks().filter(w => w.final && w.stakes).length }; });
    check('S browser-only, two profiles, six weeks of history, Tyson in Phase 3 with exactly one stalled lift', s.mode === 'local' && s.phase === 3 && s.cw === 5 && s.t === 30 && s.j >= 19 && s.first === '2026-10-26' && s.stall && s.others === 0, JSON.stringify(s));
    check('S three full weeks in a row for Jacquie, pain notes, stakes on closed weeks', s.full && s.pain === 3 && s.stakes >= 2, JSON.stringify(s));
  });

  // ---------- 1: saved meals and "copy from yesterday" ----------
  await section('M', async () => {
    await open({ me: 'jacquie', time: WED, init: seed() });
    await go(page, 'fuel');
    const yBefore = JSON.stringify(await kv(page, 'profiles/jacquie/food/2026-12-08'));
    check('M1 a meal the day before has items in offers "Copy from yesterday"', await txt(page, '.meal[data-mealsec="b"] [data-a="meal-copy"]') === 'Copy from yesterday' && await txt(page, '.meal[data-mealsec="d"] [data-a="meal-copy"]') === 'Copy from yesterday' && !(await has(page, '.meal[data-mealsec="l"] [data-a="meal-copy"]')));
    await page.evaluate(() => { window.__bursts = 0; const t = document.getElementById('toast'); window.__toasts = []; new MutationObserver(() => { if (!t.hidden) window.__toasts.push(t.textContent); }).observe(t, { childList: true, attributes: true, characterData: true, subtree: true }); });
    await page.click('.meal[data-mealsec="b"] [data-a="meal-copy"]'); const t1 = await toastWith(page, 'Copied');
    const today = await kv(page, 'profiles/jacquie/food/2026-12-09'), y = JSON.parse(yBefore), yb = y.items.filter(i => i.meal === 'b');
    const same = today.items.length === 2 && today.items.every((it, i) => it.name === yb[i].name && it.qty === yb[i].qty && it.unit === yb[i].unit && it.meal === 'b' && JSON.stringify(it.n) === JSON.stringify(yb[i].n));
    check('M1 copying yesterday\'s breakfast: the items and totals match', same && (await ML(page, () => window.MorningLaps.dayTotals('jacquie', '2026-12-09').kcal)) === 405 && (await ML(page, () => window.MorningLaps.dayTotals('jacquie', '2026-12-09').n[1])) === 11, JSON.stringify(today.items.map(i => [i.name, i.n[0]])));
    check('M1 the ids are new', new Set(today.items.map(i => i.id).concat(y.items.map(i => i.id))).size === 5 && today.items.every(i => !!i.id));
    check('M1 yesterday is unchanged', JSON.stringify(await kv(page, 'profiles/jacquie/food/2026-12-08')) === yBefore);
    check('M1 the toast shows the calories added, once for the whole meal', t1.includes('Copied yesterday\'s breakfast: 2 items, 405 cal') && (await page.evaluate(() => window.__toasts.filter(x => x.includes('Copied')).length >= 1 && new Set(window.__toasts.filter(x => x.includes('Copied'))).size === 1)), t1);
    check('M1 with items already there the button reads "Add yesterday\'s breakfast again"', await txt(page, '.meal[data-mealsec="b"] [data-a="meal-copy"]') === 'Add yesterday\'s breakfast again');
    await page.click('.meal[data-mealsec="b"] [data-a="meal-copy"]'); await page.waitForFunction(() => JSON.parse(localStorage.getItem('ml.kv'))['profiles/jacquie/food/2026-12-09'].items.length === 4);
    check('M1 and it adds to them', (await kv(page, 'profiles/jacquie/food/2026-12-09')).items.filter(i => i.meal === 'b').length === 4 && new Set((await kv(page, 'profiles/jacquie/food/2026-12-09')).items.map(i => i.id)).size === 4);
    // save as a meal
    await page.click('.meal[data-mealsec="d"] [data-a="meal-copy"]'); await page.waitForFunction(() => JSON.parse(localStorage.getItem('ml.kv'))['profiles/jacquie/food/2026-12-09'].items.length === 5);
    await page.click('.meal[data-mealsec="d"] [data-a="meal-saveas"]'); await page.waitForSelector('#mealName');
    check('M2 "Save as a meal" asks for a name', await val(page, '#mealName') === 'Usual dinner');
    await page.click('[data-a="ov-close"]');
    await pickDate(page, '2026-12-08'); await page.click('.meal[data-mealsec="b"] [data-a="meal-saveas"]'); await page.waitForSelector('#mealName'); await fill(page, '#mealName', 'Usual breakfast'); await page.click('[data-a="meal-save"]'); await toastWith(page, 'Saved "Usual breakfast"');
    const mealsNow = async () => { const k = await kvAll(page); return Object.keys(k).filter(p => p.indexOf('profiles/jacquie/meals/') === 0).map(p => Object.assign({ path: p }, k[p])); };
    const m1 = await mealsNow();
    check('M2 it is saved per person at profiles/<pid>/meals/<id> with its items', m1.length === 1 && m1[0].name === 'Usual breakfast' && m1[0].items.length === 2 && m1[0].items[0].name === 'Oatmeal with milk' && m1[0].items[0].n[0] === 300 && !m1[0].items[0].id && !(await kvAll(page))['profiles/tyson/meals/' + m1[0].path.split('/').pop()], JSON.stringify(m1));
    await page.waitForTimeout(1100); // a second saved meal, later: the list is newest first
    await page.click('.meal[data-mealsec="d"] [data-a="meal-saveas"]'); await page.waitForSelector('#mealName'); await fill(page, '#mealName', 'Chicken night'); await page.click('[data-a="meal-save"]'); await toastWith(page, 'Chicken night');
    const logged = async () => { const k = await kvAll(page); return JSON.stringify(['2026-12-06', '2026-12-08', '2026-12-09'].map(d => k['profiles/jacquie/food/' + d] || null)); };
    // add it to another day in one tap
    await pickDate(page, '2026-12-06'); await page.click('[data-a="food-add"][data-meal="l"]'); await page.waitForSelector('#myMeals');
    const order = await page.$$eval('#myMeals [data-a="meal-add"] .fn', els => els.map(e => e.textContent));
    check('M3 Add food lists My meals above Recent, newest first', order.join('|') === 'Chicken night|Usual breakfast' && await page.evaluate(() => { const box = document.getElementById('foodRes').textContent; return box.indexOf('My meals') >= 0 && (box.indexOf('Recent') < 0 || box.indexOf('My meals') < box.indexOf('Recent')); }), order.join('|'));
    await page.click('#myMeals [data-mealrow] [data-a="meal-add"] >> nth=1'); const t3 = await toastWith(page, 'Added Usual breakfast');
    const other = await kv(page, 'profiles/jacquie/food/2026-12-06');
    check('M3 one tap adds every item to the chosen meal on another day', other.items.length === 2 && other.items.every(i => i.meal === 'l') && other.items.map(i => i.n[0]).join() === '300,105' && t3.includes('Added Usual breakfast to Lunch: 2 items, 405 cal'), t3);
    const before = await logged();
    await page.click('[data-a="food-add"][data-meal="s"]'); await page.waitForSelector('#myMeals'); await page.click('#myMeals [data-mealrow] [data-a="meal-edit"] >> nth=1'); await page.waitForSelector('[data-a="meal-rename"]');
    await fill(page, '#mealName', 'Weekday breakfast'); await page.click('[data-a="meal-rename"]'); await toastWith(page, 'Renamed');
    check('M3 a saved meal can be renamed', (await mealsNow()).map(m => m.name).sort().join('|') === 'Chicken night|Weekday breakfast' && (await page.$$eval('#myMeals .fn', els => els.map(e => e.textContent))).includes('Weekday breakfast'));
    await page.click('#myMeals [data-mealrow] [data-a="meal-edit"] >> nth=1'); await page.waitForSelector('[data-a="meal-del"]'); await page.click('[data-a="meal-del"]'); await page.click('[data-a="meal-del"]'); await toastWith(page, 'Removed');
    check('M3 and deleted', (await mealsNow()).map(m => m.name).join('|') === 'Chicken night' && !(await page.$$eval('#myMeals .fn', els => els.map(e => e.textContent))).includes('Weekday breakfast'));
    check('M3 days already logged do not change through rename or delete', await logged() === before);
  });

  // ---------- 2: progression after Phase 3 ----------
  await section('P', async () => {
    await open({ me: 'tyson', time: WED, init: seed() });
    await page.waitForSelector('.ex[data-ex="shoulderpress"]');
    const line = await txt(page, '[data-stall-line="shoulderpress"]');
    check('P1 three same-weight sessions without an increase show one stuck line', /^Stuck at 50 lb · 3 sessions · Fix$/.test(line.replace(/\s+/g, ' ').trim()) && (await page.$$('.stallline')).length === 1 && !(await has(page, '.stall')), line);
    await page.click('[data-a="stall-open"][data-key="shoulderpress"]'); await page.waitForSelector('.stall[data-stall="shoulderpress"]');
    const card = await txt(page, '.stall[data-stall="shoulderpress"]');
    check('P1 Fix opens the stall card in place', card.includes('Stuck at 50 lb for 3 sessions') && card.includes('Reset: drop 10% and build back') && card.includes('Swap for 4 weeks') && (await page.$$('.stall')).length === 1, card);
    const rules = await ML(page, () => { const M = window.MorningLaps; return [M.easier('shoulderpress', 50), M.easier('legpress', 180), M.easier('latraise', 12.5), M.easier('dbcurl', 30), M.easier('assistpull', 80), M.stallFor('crunch', '2026-12-09'), M.stallFor('chestpress', '2026-12-09')]; });
    check('P2 the reset weight is 90%, rounded to each exercise\'s own step', JSON.stringify(rules.slice(0, 5)) === JSON.stringify([45, 160, 10, 27.5, 90]), JSON.stringify(rules));
    check('P1 bodyweight moves and progressing lifts get no card', rules[5] === null && rules[6] === null);
    await page.click('[data-a="stall-reset"][data-key="shoulderpress"]'); await page.waitForFunction(() => !document.querySelector('.stall') && !document.querySelector('.stallline'));
    const rs = (await settings(page)).resets.shoulderpress, sg = await ML(page, () => window.MorningLaps.suggest('shoulderpress', '2026-12-09'));
    check('P2 Reset suggests 90% for the next session', rs.w === 45 && rs.from === 50 && sg.w === 45 && sg.reset === true && await page.$eval('[data-usew="shoulderpress"]', b => b.dataset.val === '45') && (await txt(page, '.ex[data-ex="shoulderpress"] .exrx')).includes('reset'), JSON.stringify(sg));
    await ctx.close();
    await open({ me: 'tyson', time: WED, init: seed() });
    await page.click('[data-a="stall-open"][data-key="shoulderpress"]'); await page.click('[data-a="stall-x"][data-key="shoulderpress"]'); await page.waitForFunction(() => !document.querySelector('.stall') && !document.querySelector('.stallline'));
    await page.reload(); await page.waitForSelector('.ex[data-ex="shoulderpress"]'); await settled(page);
    check('P1 dismissing the card hides it, and it stays hidden', !(await has(page, '.stall')) && !(await has(page, '.stallline')) && (await settings(page)).stallSeen.shoulderpress === '2026-11-30');
    await ctx.close();
    await open({ me: 'tyson', time: WED, init: seed({ settings: { stallSeen: { shoulderpress: '2026-11-16' } } }) }); // dismissed three sessions ago: only two stalled sessions since
    check('P1 two more stalled sessions after a dismissal are not a new stall', !(await has(page, '.stallline')));
    await ctx.close();
    await open({ me: 'tyson', time: WED, init: seed({ settings: { stallSeen: { shoulderpress: '2026-11-09' } } }) }); // dismissed four sessions ago: three stalled sessions since
    check('P1 three later stalled sessions bring it back', await has(page, '[data-stall-line="shoulderpress"]'));
    await ctx.close();
    await open({ me: 'tyson', time: WED, init: seed({ settings: { maxed: { shoulderpress: true } } }) });
    check('P1 a lift marked "Can\'t go higher" gets no card', !(await has(page, '.stall')) && await has(page, '.ex[data-ex="shoulderpress"] .exhold'));
    await ctx.close();
    // swap for four weeks, then the offer to switch back
    await open({ me: 'tyson', time: WED, init: seed() });
    await page.click('[data-a="stall-open"][data-key="shoulderpress"]'); await page.click('[data-a="stall-swap"][data-key="shoulderpress"]'); await page.waitForSelector('.ex[data-ex="dbshoulder"]');
    const st = await settings(page);
    check('P1 "Swap for 4 weeks" applies the alternate as a default swap', st.swaps.shoulderpress === 'dbshoulder' && st.swapBack.shoulderpress.until === '2027-01-06' && !(await has(page, '.ex[data-ex="shoulderpress"]')) && (await page.$$('.ex[data-ex]')).length === 5, JSON.stringify(st.swapBack));
    check('P1 no switch-back offer before the four weeks are up', !(await has(page, '[data-swapback]')));
    const later = await carry(page); await ctx.close();
    await open({ me: 'tyson', time: T('2027-01-06T17:00:00Z'), init: later });
    check('P1 after 4 weeks it offers to switch back', (await txt(page, '[data-swapback="shoulderpress"]')).includes('Four weeks on Seated dumbbell shoulder press') && (await txt(page, '[data-swapback="shoulderpress"]')).includes('Switch back to Shoulder press machine?'));
    await page.evaluate(() => document.querySelectorAll('#coach details').forEach(d => { d.open = true; })); await page.click('[data-a="swapback-yes"]'); await page.waitForFunction(() => !document.querySelector('[data-swapback]'));
    check('P1 switching back removes the swap', !(await settings(page)).swaps.shoulderpress && !(await settings(page)).swapBack.shoulderpress);
    await ctx.close();

    // deload week
    await open({ me: 'tyson', time: WED, init: seed() });
    const offer = await txt(page, '#deloadBanner');
    check('P3 after 5 completed lift weeks the banner offers a deload', offer.includes('Deload week: 2 sets per lift at about 90% weight. Recovery week, same points.') && await has(page, '[data-a="deload-take"]') && await has(page, '[data-a="deload-skip"]'), offer);
    const normal = await ML(page, () => ['inclinedb', 'pecdeck', 'shoulderpress', 'latraise', 'pushdown'].map(k => { const s = window.MorningLaps.suggest(k, '2026-12-09'); return [k, s.w, s.sets]; }));
    check('P3 before taking it each lift shows 3 sets', (await page.$$eval('.ex[data-ex]', els => els.map(e => e.querySelectorAll('[data-field="rep"]').length))).join() === '3,3,3,3,3');
    await page.evaluate(() => document.querySelectorAll('#coach details').forEach(d => { d.open = true; })); await page.click('[data-a="deload-take"]'); await page.waitForFunction(() => document.getElementById('deloadBanner').textContent.includes('Deload week is on'));
    const dl = await ML(page, () => ['inclinedb', 'pecdeck', 'shoulderpress', 'latraise', 'pushdown'].map(k => { const s = window.MorningLaps.suggest(k, '2026-12-09'); return [k, s.w, s.sets]; }));
    check('P3 a deload week shows 2 sets per lift', (await page.$$eval('.ex[data-ex]', els => els.map(e => e.querySelectorAll('[data-field="rep"]').length))).join() === '2,2,2,2,2' && (await txt(page, '.ex[data-ex="shoulderpress"] .exrx')).includes('2 sets'));
    check('P3 and lighter suggestions: about 90%, rounded to the step', JSON.stringify(dl) === JSON.stringify([['inclinedb', 20, 2], ['pecdeck', 55, 2], ['shoulderpress', 45, 2], ['latraise', 7.5, 2], ['pushdown', 65, 2]]) && JSON.stringify(normal) === JSON.stringify([['inclinedb', 25, 3], ['pecdeck', 60, 3], ['shoulderpress', 50, 3], ['latraise', 10, 3], ['pushdown', 70, 3]]), JSON.stringify(dl) + ' vs ' + JSON.stringify(normal));
    await fill(page, '#tmMin', 20); for (const k of ['shoulderpress', 'pushdown']) { await page.click('[data-usew="' + k + '"]'); await fill(page, '#r-' + k + '-0', 10); await fill(page, '#r-' + k + '-1', 10); }
    await page.evaluate(() => { const b = document.querySelector('#rest:not([hidden]) [data-a="timer-x"]'); if (b) b.click(); }); await page.click('h1'); await page.click('#saveBtn'); await page.waitForFunction(() => { const r = JSON.parse(localStorage.getItem('ml.sessions'))['2026-12-09']; return r && r.kind === 'strength'; });
    const rec = await ses(page, '2026-12-09');
    check('P3 the session is saved with deload: true and still counts as a lift day', rec.deload === true && rec.qualifies === true && rec.ex.shoulderpress.w === 45 && rec.ex.shoulderpress.reps.length === 2 && (await score(page, 'tyson')).lifts === 1, JSON.stringify(rec.ex));
    await go(page, 'history'); await page.selectOption('#exHist', 'shoulderpress'); await page.waitForSelector('#exTrend');
    const tr = await page.evaluate(() => ({ dots: document.querySelectorAll('#exTrend circle').length, hollow: document.querySelectorAll('#exTrend circle.dl').length, best: document.getElementById('exBest').textContent, chip: document.querySelector('#exHist').closest('section').textContent.includes('deload') }));
    check('P5 History, By exercise: a trend line with the deload session marked, and the best set', tr.dots === 7 && tr.hollow === 1 && tr.best.includes('Best set: 50 lb × 10') && tr.best.includes('hollow dots are deload sessions') && tr.chip, JSON.stringify(tr));
    await page.selectOption('#exHist', 'chestpress'); await page.waitForFunction(() => document.getElementById('exBest').textContent.includes('95 lb'));
    check('P5 the best set is the heaviest one', (await txt(page, '#exBest')).includes('Best set: 95 lb × 12'));
    const next = await carry(page); await ctx.close();
    await open({ me: 'tyson', time: NEXT, init: next });
    const after = await ML(page, () => { const M = window.MorningLaps, s = M.suggest('shoulderpress', '2026-12-14'), p = M.suggest('pushdown', '2026-12-14'); return { w: s.w, sets: s.sets, last: s.last.date, lastW: s.last.w, deload: !!s.deload, on: M.deloadState(), pw: p.w, plast: p.last.date }; });
    check('P4 the first session after the deload suggests from the last normal session', after.w === 50 && after.sets === 3 && after.last === '2026-11-30' && after.lastW === 50 && !after.deload && after.pw === 70 && after.plast === '2026-11-30', JSON.stringify(after));
    check('P4 and the deload is over: no banner, 3 sets again', after.on === '' && !(await has(page, '#deloadBanner')) && (await page.$$eval('.ex[data-ex]', els => els.map(e => e.querySelectorAll('[data-field="rep"]').length))).every(n => n === 3));
    await ctx.close();
    // same lift days, normal against deload: the same points
    const wk = dl2 => ['2026-12-07', '2026-12-08', '2026-12-09'].map((d, i) => { const dayKey = ['push', 'pull', 'legs'][i], full = SETS(dayKey, 6), ex = {}; Object.keys(full).forEach(k => { ex[k] = { w: dl2 ? Math.round(full[k].w * 0.9 / 5) * 5 : full[k].w, reps: reps(12, dl2 ? 2 : 3) }; }); return lift(d, dayKey, 3, ex, dl2 ? { deload: true } : {}); });
    await open({ me: 'tyson', time: WED, init: seed({ thisWeek: wk(false) }) });
    const a = await ML(page, () => { const s = window.MorningLaps.weekScore('tyson', '2026-12-07'); return [s.total, s.raw, s.move, s.bonus, s.active, s.lifts, s.minutes]; });
    await ctx.close();
    await open({ me: 'tyson', time: WED, init: seed({ thisWeek: wk(true) }) });
    const b = await ML(page, () => { const s = window.MorningLaps.weekScore('tyson', '2026-12-07'); return [s.total, s.raw, s.move, s.bonus, s.active, s.lifts, s.minutes]; });
    check('P5 a deload week scores the same as a normal week with the same lift days', JSON.stringify(a) === JSON.stringify(b) && a[5] === 3, JSON.stringify(a) + ' vs ' + JSON.stringify(b));
    await ctx.close();
    await open({ me: 'tyson', time: WED, init: seed() });
    await page.evaluate(() => document.querySelectorAll('#coach details').forEach(d => { d.open = true; })); await page.click('[data-a="deload-skip"]'); await page.waitForFunction(() => !document.getElementById('deloadBanner'));
    await page.reload(); await page.waitForSelector('#main .card'); await settled(page);
    check('P3 Skip puts the offer away until the next five weeks', !(await has(page, '#deloadBanner')) && (await settings(page)).deloadAsked === 5 && !(await settings(page)).deload);
  });

  // ---------- 3: reminders, and paste from the clipboard ----------
  await section('R', async () => {
    const clip = 'window.__clipMode="ok";window.__clip="date: 2026-12-09\\nexercise: 31\\nsteps: 6200";try{Object.defineProperty(navigator,"clipboard",{configurable:true,get:function(){return window.__clipMode==="none"?undefined:{readText:function(){return window.__clipMode==="deny"?Promise.reject(new Error("NotAllowedError")):Promise.resolve(window.__clip);}};}});}catch(e){}';
    await open({ me: 'jacquie', time: WED, init: seed({ pre: clip }) });
    await go(page, 'me');
    const steps = () => page.evaluate(() => ({ m: document.querySelector('#remSteps [data-rem="morning"]').textContent, w: document.querySelector('#remSteps [data-rem="water"]').textContent, s: document.querySelector('#remSteps [data-rem="sunday"]').textContent, all: document.getElementById('remCard').textContent }));
    const d0 = await steps();
    check('R1 the Reminders card has the three automations, with setup steps', d0.all.includes('Time of Day') && d0.all.includes('Run Immediately') && d0.all.includes('Notify When Run') && d0.m.includes('Open URLs') && d0.m.includes('https://claude.ai/artifact/WpxQrh73Td3TuyfYKvHaMr') && d0.w.includes('Show Notification') && d0.w.includes('Water check: open Morning Laps and log a bottle.') && d0.s.includes('Last day of the week: see how to win it in Morning Laps.') && d0.s.includes('7:00 PM'), d0.m.slice(0, 200));
    check('R1 it says the times are only for the instructions and the phone does the reminding', d0.all.includes('only used to fill in the steps') && d0.all.includes('Your phone does the reminding'));
    check('R1 default times', d0.m.includes('6:00 AM') && d0.w.includes('2:30 PM'));
    await fill(page, '[data-form="rem"][data-k="morning"]', '05:45'); await fill(page, '[data-form="rem"][data-k="water"]', '15:15'); await page.click('[data-a="rem-save"]'); await toastWith(page, 'Steps updated');
    const d1 = await steps();
    check('R1 Jacquie\'s times are saved on her profile and filled into her steps', JSON.stringify((await kv(page, 'profiles/jacquie')).reminders) === JSON.stringify({ morning: '05:45', water: '15:15' }) && d1.m.includes('5:45 AM') && d1.w.includes('3:15 PM') && !d1.m.includes('6:00 AM'), d1.m.slice(0, 160));
    await switchTo(page, 'tyson'); await go(page, 'me');
    await fill(page, '[data-form="rem"][data-k="morning"]', '06:30'); await page.click('[data-a="rem-save"]'); await toastWith(page, 'Steps updated');
    const d2 = await steps();
    check('R1 Tyson\'s card shows his own times, not hers', d2.m.includes('6:30 AM') && d2.w.includes('2:30 PM') && !d2.m.includes('5:45') && (await kv(page, 'profiles/jacquie')).reminders.morning === '05:45');
    await switchTo(page, 'jacquie'); await go(page, 'me');
    check('R1 and hers are still hers', (await steps()).m.includes('5:45 AM') && await val(page, '[data-form="rem"][data-k="water"]') === '15:15');
    // clipboard
    await go(page, 'train'); await page.click('.sess [data-a="health"]'); await page.waitForSelector('#hkText');
    check('R2 (v15) the clipboard button is gone, and the box has focus when the sheet opens', !(await has(page, '#hkPaste')) && !(await has(page, '[data-a="hk-paste"]')) && await page.evaluate(() => document.activeElement.id === 'hkText') && await page.$eval('#hkText', b => b.placeholder === 'Tap here, then Paste'));
    await fill(page, '#hkText', 'date: 2026-12-09\nsteps: 4100');
    check('R2 the text box keeps working as before', (await txt(page, '#hkPreview')).includes('4,100 steps') && await page.$eval('#hkGo', b => !b.disabled));
    await page.click('#hkGo'); await page.waitForSelector('#ov', { state: 'hidden' });
    check('R2 and the import still saves', (await kv(page, 'profiles/jacquie/health/2026-12-09')).steps === 4100);
  });

  // ---------- 4: last week's recap and the IOU list ----------
  await section('W', async () => {
    await open({ me: 'jacquie', time: MON, init: seed() });
    await go(page, 'compete');
    const cell = async k => page.$eval('#recapCard [data-r="' + k + '"]', e => e.textContent);
    const grid = async () => { const o = {}; for (const k of ['active', 'minutes', 'best', 'cal', 'water', 'badges']) for (const p of ['tyson', 'jacquie']) o[k + ':' + p] = await cell(k + ':' + p); return o; };
    const g = await grid();
    check('W1 the "Last week" card is at the top of Compete', await page.evaluate(() => document.querySelector('#main > section') === document.getElementById('recapCard')) && (await txt(page, '#recapCard')).includes('Last week · Nov 30 to Dec 6'));
    // expected straight from the seed: Tyson 3 lifts (20 + 9 sets x 3 min) and 2 treadmill days of 25; Jacquie 4 activities of 20 over 3 days
    check('W1 active days and minutes are the seed\'s', g['active:tyson'] === '5' && g['minutes:tyson'] === String(3 * (20 + 27) + 2 * 25) && g['active:jacquie'] === '3' && g['minutes:jacquie'] === '80', JSON.stringify(g));
    check('W1 best weight increase, days in calorie range, days the water goal was met, badges earned that week', g['best:tyson'].includes('+10 lb') && g['best:tyson'].includes('Leg press machine') && g['best:jacquie'] === '–' && g['cal:jacquie'] === '2' && g['cal:tyson'] === '0' && g['water:jacquie'] === '1' && g['water:tyson'] === '0' && g['badges:jacquie'].includes('💧') && g['badges:jacquie'].includes('🍎') && g['badges:tyson'] === '–', JSON.stringify(g));
    check('W2 Monday: it says Provisional, with no winner', await txt(page, '#recapState') === 'Provisional' && (await txt(page, '#recapHead')).includes('leads') && (await txt(page, '#provLine')).includes('Provisional:') && !(await kv(page, 'results/2026-11-30')));
    // the same week in History, for each of you
    const hist = async () => page.$$eval('details.hi', els => els.filter(e => e.dataset.hdate >= '2026-11-30' && e.dataset.hdate <= '2026-12-06').map(e => ({ d: e.dataset.hdate, t: e.querySelector('summary').textContent })));
    await go(page, 'history'); const hj = await hist();
    const jMin = hj.reduce((s, r) => s + Number((/(\d+) min/.exec(r.t) || [0, 0])[1]), 0);
    await switchTo(page, 'tyson'); await go(page, 'history'); const ht = await hist();
    check('W1 the recap matches History for that week: Jacquie', hj.length === 3 && hj.filter(r => r.t.includes('active day')).length === Number(g['active:jacquie']) && jMin === Number(g['minutes:jacquie']), JSON.stringify(hj));
    check('W1 the recap matches History for that week: Tyson', ht.length === 5 && ht.filter(r => /lift day|activity/.test(r.t)).length === Number(g['active:tyson']) && ht.filter(r => r.t.includes('lift day')).length === 3, JSON.stringify(ht.map(r => r.t.slice(0, 40))));
    await switchTo(page, 'jacquie'); await go(page, 'compete');
    // IOUs
    const r23 = JSON.stringify(await kv(page, 'results/2026-11-23')), r16 = JSON.stringify(await kv(page, 'results/2026-11-16'));
    check('W3 Season lists every closed week with stakes and a winner as an IOU', (await txt(page, '.iou[data-iou="2026-11-23"]')).includes('Tyson owes: cooks Sunday dinner') && (await txt(page, '.iou[data-iou="2026-11-16"]')).includes('Jacquie owes: washes the car') && (await page.$$('.iou')).length === 2);
    check('W3 the unpaid count sits at the top of Season', await txt(page, '#iouCount') === 'Jacquie owes 1 · Tyson owes 1' && await page.evaluate(() => { const c = document.getElementById('seasonCard'); return c.textContent.indexOf('owes 1') < c.textContent.indexOf('Week of'); }), await txt(page, '#iouCount'));
    await page.click('.iou[data-iou="2026-11-23"] [data-a="iou-toggle"]'); await page.waitForFunction(() => document.getElementById('iouCount').textContent === 'Jacquie owes 1 · Tyson owes 0');
    check('W3 marking one paid is stored at iou/<weekStart>', (await kv(page, 'iou/2026-11-23')).paid === true && await page.$eval('.iou[data-iou="2026-11-23"] [data-a="iou-toggle"]', b => b.getAttribute('aria-pressed') === 'true'));
    await page.reload(); await page.waitForSelector('#main .card'); await settled(page); await go(page, 'compete');
    check('W3 it survives a reload', await txt(page, '#iouCount') === 'Jacquie owes 1 · Tyson owes 0' && await page.$eval('.iou[data-iou="2026-11-23"]', e => e.classList.contains('paid')));
    await switchTo(page, 'tyson'); await go(page, 'compete');
    check('W3 either of you can tap it: Tyson sees it paid and can mark his own', await txt(page, '#iouCount') === 'Tyson owes 0 · Jacquie owes 1');
    await page.click('.iou[data-iou="2026-11-16"] [data-a="iou-toggle"]'); await page.waitForFunction(() => document.getElementById('iouCount').textContent === 'Tyson owes 0 · Jacquie owes 0');
    await page.click('.iou[data-iou="2026-11-16"] [data-a="iou-toggle"]'); await page.waitForFunction(() => document.getElementById('iouCount').textContent === 'Tyson owes 0 · Jacquie owes 1');
    check('W3 and it toggles back', (await kv(page, 'iou/2026-11-16')).paid === false);
    check('W3 results/<weekStart> is byte-for-byte unchanged', JSON.stringify(await kv(page, 'results/2026-11-23')) === r23 && JSON.stringify(await kv(page, 'results/2026-11-16')) === r16 && r23 === JSON.stringify(FINALS['results/2026-11-23']));
    await switchTo(page, 'jacquie');
    const wed = await carry(page); await ctx.close();
    await open({ me: 'jacquie', time: WED, init: 'window.__keepOv=true;' + wed });
    await page.waitForFunction(() => !!(JSON.parse(localStorage.getItem('ml.kv')))['results/2026-11-30']);
    let said = '';
    for (let i = 0; i < 10; i++) { await page.waitForTimeout(250); const t = await page.evaluate(() => document.getElementById('ov').hidden ? '' : document.getElementById('ov').textContent); if (/wins|Dead heat/.test(t)) said = t; if (!t && said) break; if (t) await page.click('#ov [data-a="ov-close"]'); }
    await page.evaluate(() => { window.__keepOv = false; });
    const fin = await kv(page, 'results/2026-11-30'); await go(page, 'compete');
    const g2 = await grid(), win = fin.winner === 'jacquie' ? 'Jacquie' : 'Tyson', hi = Math.max(fin.tyson, fin.jacquie), lo = Math.min(fin.tyson, fin.jacquie);
    check('W2 Wednesday: the card switches to the final result and the winner', await txt(page, '#recapState') === 'Final' && await txt(page, '#recapHead') === win + ' won ' + hi + '–' + lo && !(await has(page, '#provLine')) && fin.final === true, await txt(page, '#recapHead'));
    check('W2 with the same highlights', JSON.stringify(g2) === JSON.stringify(g), JSON.stringify(g2));
    check('W2 the final-result announcement shows the highlights under the score', said.includes(win + ' wins, ' + hi + ' to ' + lo) && said.includes('Active days') && said.includes('Minutes') && said.includes('Best weight increase') && said.includes('Days in calorie range') && said.includes('Days water goal met') && said.includes('Badges earned') && said.includes('191') && said.includes('80'), said.replace(/\s+/g, ' ').slice(0, 400));
    check('W3 the newly closed week joins the IOU list with its own stakes', (await txt(page, '.iou[data-iou="2026-11-30"]')).includes(' owes: buys coffee') && (await page.$$('.iou')).length === 3 && fin.stakes === 'buys coffee' && (await kv(page, 'iou/2026-11-23')).paid === true);
    check('W3 older results are still byte-for-byte what was seeded', await page.evaluate(f => { const k = JSON.parse(localStorage.getItem('ml.kv')); return Object.keys(f).every(p => JSON.stringify(k[p]) === JSON.stringify(f[p])); }, FINALS));
  });

  // ---------- 5: the goal nudge ----------
  await section('N', async () => {
    await open({ me: 'jacquie', time: WED, init: seed() });
    const card = await txt(page, '#nudgeCard');
    check('N1 after 3 straight full weeks the card shows on Train', card.includes('Three full weeks in a row. Raise your goal to 4 days starting Monday?') && await has(page, '[data-a="nudge-yes"]') && await has(page, '[data-a="nudge-no"]') && await page.evaluate(() => window.MorningLaps.state.tab === 'train'), card);
    const before = await score(page, 'jacquie');
    await page.evaluate(() => document.querySelectorAll('#coach details').forEach(d => { d.open = true; })); await page.click('[data-a="nudge-yes"]'); await page.waitForFunction(() => !document.getElementById('nudgeCard'));
    const now = await ML(page, () => ({ wk: window.MorningLaps.weekGoals('jacquie', '2026-12-07').goal, live: window.MorningLaps.liveGoals('jacquie').goal, sc: window.MorningLaps.weekScore('jacquie').total }));
    check('N2 "Raise it" changes the setting and leaves this week\'s score alone', (await kv(page, 'profiles/jacquie')).move.goalDays === 4 && now.live === 4 && now.wk === 3 && now.sc === before.total && await txt(page, '#actCount') === '2/3', JSON.stringify(now));
    const next = await carry(page); await ctx.close();
    await open({ me: 'jacquie', time: NEXT, init: next });
    const lock = await kv(page, 'profiles/jacquie/weekgoals/2026-12-14');
    check('N2 next week\'s locked goal is the raised one', lock.goal === 4 && await txt(page, '#actCount') === '0/4' && (await ML(page, () => window.MorningLaps.weekGoals('jacquie', '2026-12-07').goal)) === 3);
    check('N2 and it does not ask again right away: the three full weeks were at the old goal', !(await has(page, '#nudgeCard')));
    await ctx.close();
    await open({ me: 'jacquie', time: WED, init: seed({ jHistoryFrom: '2026-11-23' }) });
    check('N1 not after only 2 full weeks', !(await has(page, '#nudgeCard')) && (await ML(page, () => ['2026-11-23', '2026-11-30'].every(ws => window.MorningLaps.weekScore('jacquie', ws).moveFull) && !window.MorningLaps.weekScore('jacquie', '2026-11-16').moveFull)));
    await ctx.close();
    await open({ me: 'jacquie', time: WED, init: seed({ jFull: { '2026-11-23': false } }) });
    check('N1 not after a broken streak', !(await has(page, '#nudgeCard')) && (await ML(page, () => window.MorningLaps.weekScore('jacquie', '2026-11-30').moveFull && !window.MorningLaps.weekScore('jacquie', '2026-11-23').moveFull && window.MorningLaps.weekScore('jacquie', '2026-11-16').moveFull)));
    await ctx.close();
    await open({ me: 'jacquie', time: WED, init: seed() });
    await page.evaluate(() => document.querySelectorAll('#coach details').forEach(d => { d.open = true; })); await page.click('[data-a="nudge-no"]'); await page.waitForFunction(() => !document.getElementById('nudgeCard'));
    check('N3 "Not now" hides the card and notes 3 weeks from today', (await kv(page, 'profiles/jacquie')).goalNudge.until === '2026-12-30' && (await kv(page, 'profiles/jacquie')).move === undefined);
    await page.reload(); await page.waitForSelector('#main .card'); await settled(page);
    check('N3 it stays hidden after a reload', !(await has(page, '#nudgeCard')));
    await ctx.close();
    await open({ me: 'jacquie', time: WED, init: seed({ jProfile: { goalNudge: { until: '2026-12-10' } } }) });
    check('N3 still hidden the day before the 3 weeks are up', !(await has(page, '#nudgeCard')));
    await ctx.close();
    await open({ me: 'jacquie', time: WED, init: seed({ jProfile: { goalNudge: { until: '2026-12-09' } } }) });
    check('N3 and back once they are', await has(page, '#nudgeCard'));
    await ctx.close();
    // caps
    await open({ me: 'tyson', time: WED, init: seed() });
    check('N4 the lifting program is offered 6 from 5', (await txt(page, '#nudgeCard')).includes('Raise your goal to 6 days starting Monday?'));
    await page.evaluate(() => document.querySelectorAll('#coach details').forEach(d => { d.open = true; })); await page.click('[data-a="nudge-yes"]'); await page.waitForFunction(() => !document.getElementById('nudgeCard'));
    check('N4 "Raise it" on the lifting program changes the weekly activity goal for next week', (await settings(page)).goal === 6 && (await ML(page, () => window.MorningLaps.weekGoals('tyson', '2026-12-07').goal)) === 5);
    await ctx.close();
    await open({ me: 'tyson', time: WED, init: seed({ sixDay: true, sevenDay: true, settings: { goal: 6 }, jProfile: { move: { goalDays: 7 } } }) });
    const caps = await ML(page, () => { const M = window.MorningLaps; return { t: M.goalNudge('tyson'), j: M.goalNudge('jacquie'), tf: ['2026-11-16', '2026-11-23', '2026-11-30'].every(ws => M.weekScore('tyson', ws).moveFull), jf: ['2026-11-16', '2026-11-23', '2026-11-30'].every(ws => M.weekScore('jacquie', ws).moveFull), tg: M.liveGoals('tyson').goal, jg: M.liveGoals('jacquie').goal }; });
    check('N4 never more than 6 on the lifting program, never more than 7 otherwise, even after three full weeks there', caps.t === null && caps.j === null && caps.tf && caps.jf && caps.tg === 6 && caps.jg === 7 && !(await has(page, '#nudgeCard')), JSON.stringify(caps));
  });

  // ---------- 6: pain notes that show a pattern ----------
  await section('H', async () => {
    await open({ me: 'jacquie', time: WED, init: seed() });
    check('H2 two pain notes on Brisk walk within 30 days flag it in the menu', await txt(page, '.act[data-k="walkbrisk"] [data-pain]') === 'Pain noted 2× recently' && !(await has(page, '.act[data-k="yard"] [data-pain]')) && (await page.$$('[data-pain]')).length === 1);
    const order = await page.$$eval('.act', els => els.map(e => e.dataset.k));
    check('H2 it sorts lower: last in the menu', order[order.length - 1] === 'walkbrisk', order.slice(-3).join());
    const picks = await ML(page, () => { const s = new Set(); for (let i = 0; i < 4000; i++) s.add(window.MorningLaps.surpriseActivity('jacquie')); return Array.from(s); });
    check('H2 Surprise me never picks it (4,000 draws)', !picks.includes('walkbrisk') && picks.length > 10 && picks.includes('walkpark'), picks.length + ' kinds');
    await page.click('.act[data-k="walkbrisk"]'); await page.waitForSelector('#actLog');
    check('H2 its sheet says so too', (await txt(page, '#ov')).includes('You noted pain on this 2 times in the last 30 days'));
    await page.click('[data-a="ov-close"]'); await go(page, 'history');
    const c = await page.evaluate(() => ({ all: document.getElementById('painCard').textContent, act: document.getElementById('painByAct').textContent, area: document.getElementById('painByArea').textContent, rows: Array.from(document.querySelectorAll('#painList tr')).map(r => r.textContent) }));
    check('H1 History has a Pain notes card for the last 30 days', c.all.includes('Pain notes') && c.all.includes('3 in the last 30 days'), c.all.slice(0, 80));
    check('H1 counted by activity', c.act.includes('Brisk walk 2×') && c.act.includes('Yard work or gardening 1×'), c.act);
    check('H1 and by body area, from each activity\'s stress areas', c.area.includes('Knees 3×') && c.area.includes('Ankles & feet 2×') && c.area.includes('Hips 2×') && c.area.includes('Back 1×'), c.area);
    check('H1 listed newest first with the note text', c.rows.length === 3 && c.rows[0].includes('Brisk walk') && c.rows[0].includes('knee again on the hill') && c.rows[0].includes('Dec 4') && c.rows[1].includes('Yard work') && c.rows[1].includes('back tight after raking') && c.rows[2].includes('left knee sore') && c.rows[2].includes('Nov 27'), JSON.stringify(c.rows));
    check('H3 a note older than 30 days is not in it', !c.all.includes('old note, long ago'));
    check('H1 the "not medical advice, talk to your doctor or PT" wording sits with the card', c.all.includes('not medical advice') && c.all.includes('talk to your doctor or physical therapist'));
    const later = await carry(page); await ctx.close();
    await open({ me: 'jacquie', time: T('2026-12-30T17:00:00Z'), init: later }); // Nov 27 is now 33 days back, Dec 4 is 26
    const d = await ML(page, () => { const p = window.MorningLaps.painNotes('jacquie'); return { n: p.list.length, flag: window.MorningLaps.painFlag('jacquie', 'walkbrisk'), names: p.list.map(x => x.date) }; });
    check('H3 when a note passes 30 days it drops off, and the flag with it', d.n === 2 && !d.names.includes('2026-11-27') && d.flag === false && !(await has(page, '[data-pain]')), JSON.stringify(d));
    const picks2 = await ML(page, () => { const s = new Set(); for (let i = 0; i < 4000; i++) s.add(window.MorningLaps.surpriseActivity('jacquie')); return Array.from(s); });
    check('H3 and Surprise me can pick it again', picks2.includes('walkbrisk'));
  });

  // ---------- nothing here changes how points are scored ----------
  await section('X', async () => {
    await open({ me: 'tyson', time: WED, init: seed() });
    const sc = await page.evaluate(weeks => { const M = window.MorningLaps; return weeks.map(ws => ['tyson', 'jacquie'].map(p => { const x = M.weekScore(p, ws); return [x.total, Math.round(x.move * 100) / 100, Math.round(x.fuel * 100) / 100, Math.round(x.water * 100) / 100, x.bonus, x.active, x.minutes]; })); }, WEEKS.concat(['2026-12-07']));
    // Tyson: 5 activity days and 3 lifts fill Move (50) and three kinds earn variety (5): 55, from 191 minutes. Jacquie two weeks back: Move 50, variety 5.
    check('X scores for seeded weeks are what the version 12 rules give', JSON.stringify(sc[3][0]) === JSON.stringify([55, 50, 0, 0, 5, 5, 191]) && sc[3][1][0] === 55 && sc[3][1][1] === 50 && sc[5][1][2] === 8 && sc[5][1][3] === Math.round((15 * (1 + 40 / 76) / 5) * 100) / 100, JSON.stringify([sc[3], sc[5]]));
    const lock = await kv(page, 'profiles/tyson/weekgoals/2026-12-07');
    check('X locked weekly targets keep their shape and scoring version', lock.scoring === 2 && lock.goal === 5 && lock.liftGoal === 3 && Object.keys(lock).sort().join() === 'goal,hi,kcal,liftGoal,lo,lockedAt,minMin,placeholder,plan,protein,scoring,v,waterOz,ws');
  });

  // ---------- smoke: every tab, both profiles, no console errors, nothing written by showing a screen ----------
  await section('G', async () => {
    await open({ me: 'tyson', time: WED, init: seed() });
    await switchTo(page, 'jacquie'); await page.waitForTimeout(300); await switchTo(page, 'tyson'); await page.waitForTimeout(700); // first-open housekeeping (week locks, closing last week, badges) finishes first
    await page.evaluate(() => { window.__w = []; const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k) { if (k === 'ml.kv' || k === 'ml.sessions' || k === 'ml.settings') window.__w.push(k); return set.apply(this, arguments); }; });
    const bad = [];
    for (const who of ['tyson', 'jacquie']) { if (who === 'jacquie') await switchTo(page, 'jacquie');
      for (const tab of ['train', 'program', 'history', 'fuel', 'compete', 'me']) { await go(page, tab); const n = await page.evaluate(() => document.querySelectorAll('#main .card, #main .sheet').length); if (!n || /undefined|NaN|\[object/.test(await txt(page, '#main'))) bad.push(who + ':' + tab); }
      await go(page, 'fuel'); await page.click('[data-a="food-add"][data-meal="b"]'); await page.waitForSelector('#foodQ'); await page.keyboard.press('Escape');
      await go(page, 'train'); await page.click('.sess [data-a="health"]'); await page.waitForSelector('#hkText'); await page.keyboard.press('Escape'); }
    await page.waitForTimeout(400);
    check('G smoke: every tab draws for both profiles, with nothing broken in the text', bad.length === 0, bad.join(' '));
    check('G showing screens and sheets writes nothing to the store', (await page.evaluate(() => window.__w.length)) === 0, JSON.stringify(await page.evaluate(() => window.__w)));
    check('G finished weeks already stored are byte-for-byte unchanged', (await page.evaluate(f => { const k = JSON.parse(localStorage.getItem('ml.kv')); return Object.keys(f).every(p => JSON.stringify(k[p]) === JSON.stringify(f[p])); }, FINALS)));
    check('G no console errors anywhere in this run', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  });

  await browser.close();
  process.exit(finish('version 13 checks') ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
