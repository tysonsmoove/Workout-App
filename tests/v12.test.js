// The checks for the 8 fixes and 3 features of version 12, run the way they were asked for: a headless browser in
// browser-only mode with seeded localStorage: two profiles, three weeks of history, Tyson in Phase 3.
// "Carry" below means a fresh browser context opened later in time with the same storage, as a phone would be.
// Run: node tests/v12.test.js  (see tests/helpers.js for the local server it expects)
const { chromium, check, T, newPage, val, txt, has, fill, go, score, finish } = require('./helpers');
const seen = page => page.evaluate(() => window.__seen.slice());
const kv = (page, path) => page.evaluate(p => (JSON.parse(localStorage.getItem('ml.kv') || '{}'))[p] || null, path);
const ses = (page, d) => page.evaluate(x => (JSON.parse(localStorage.getItem('ml.sessions') || '{}'))[x] || null, d);
const ML = (page, fn, arg) => page.evaluate(fn, arg);
const toastWith = (page, part) => page.waitForFunction(x => { const t = document.getElementById('toast'); return !t.hidden && t.textContent.includes(x) ? t.textContent : false; }, part, { timeout: 5000 }).then(h => h.jsonValue()).catch(() => txt(page, '#toast'));
const settled = page => page.waitForFunction(() => window.MorningLaps.state.ready && !!(JSON.parse(localStorage.getItem('ml.kv') || '{}'))['profiles/jacquie/weekgoals/' + (function () { const s = window.MorningLaps.state.today, d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8))); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); })()]);
const switchTo = async (page, pid) => { await page.click('#whoBtn'); await page.click('[data-a="who-pick"][data-pid="' + pid + '"]'); await page.waitForFunction(p => window.MorningLaps.state.pid === p && document.getElementById('ov').hidden, pid); };
const pickDate = (page, d) => page.click('.datebar [data-date="' + d + '"]');
const carry = async (page, drop) => { const all = await page.evaluate(() => Object.assign({}, localStorage)); (drop || []).forEach(k => delete all[k]); return 'if(!localStorage.getItem("carried")){localStorage.clear();var s=' + JSON.stringify(all) + ';Object.keys(s).forEach(function(k){localStorage.setItem(k,s[k]);});localStorage.setItem("carried","1");}'; };

/* ---------- the seed ---------- */
const SETS = { push: { chestpress: { w: 70, reps: [12, 12, 12] }, shoulderpress: { w: 50, reps: [10, 10, 10] }, pushdown: { w: 40, reps: [12, 12, 12] } },
  pull: { latpull: { w: 80, reps: [10, 10, 10] }, seatedrow: { w: 80, reps: [10, 10, 10] }, dbcurl: { w: 20, reps: [10, 10, 10] } },
  legs: { legpress: { w: 140, reps: [10, 10, 10] }, legext: { w: 70, reps: [12, 12, 12] }, legcurl: { w: 60, reps: [12, 12, 12] } } };
const lift = (date, day, phase) => ({ v: 2, date, kind: 'strength', day, phase, planned: Object.keys(SETS[day]), plannedBase: Object.keys(SETS[day]), swaps: {}, ex: SETS[day], qualifies: true, complete: true, treadmill: { minutes: 20, title: '' }, savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' });
const tread = (date, phase) => ({ v: 2, date, kind: 'cardio', phase, treadmill: { minutes: 25, title: 'Fitness+ run' }, savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' });
const walk = (date, a, name, min) => ({ v: 2, date, kind: 'activity', acts: [{ id: 'a-' + date, a, name, min, feel: 'good', hurt: false, note: '', mv: true, at: date + 'T12:00:00Z' }], savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' });
const foodDay = (date, kcal, protein, water) => ({ v: 1, date, items: [{ id: 'f-' + date, name: 'Seeded day', meal: 'd', qty: 1, unit: 'quick add', grams: null, src: 'Quick add', n: [kcal, protein, null, null, null, null, null, null, null, null, null, null, null, null] }], water });
const FINALS = { 'results/2026-11-02': { ws: '2026-11-02', tyson: 61, jacquie: 58, winner: 'tyson', played: true, final: true, closedAt: '2026-11-11T12:00:00.000Z' },
  'results/2026-11-09': { ws: '2026-11-09', tyson: 55, jacquie: 63, winner: 'jacquie', played: true, final: true, closedAt: '2026-11-18T12:00:00.000Z' } };
// opt.tysonThisWeek: lift days this week (none by default). opt.tysonBody: give Tyson real targets. opt.swaps: his default swaps. opt.comp: extra shared settings.
function seed(opt) {
  opt = opt || {};
  const sessions = {};
  [['2026-11-02', 1], ['2026-11-09', 2]].forEach(([ws, ph]) => { const d = n => new Date(Date.parse(ws + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
    sessions[d(0)] = lift(d(0), 'push', ph); sessions[d(1)] = tread(d(1), ph); sessions[d(2)] = lift(d(2), 'pull', ph); sessions[d(3)] = tread(d(3), ph); sessions[d(4)] = lift(d(4), 'legs', ph); });
  (opt.tysonThisWeek || []).forEach(([date, day]) => { sessions[date] = day === 'tread' ? tread(date, 3) : lift(date, day, 3); });
  const kv = Object.assign({}, FINALS, { 'comp/settings': Object.assign({ start: '2026-11-02', stakes: '' }, opt.comp),
    'profiles/jacquie': { name: 'Jacquie', body: { sex: 'f', age: 30, heightIn: 64, weightLb: 150, activity: 'light', pace: 'maintain' }, weighIns: { '2026-11-02': 150 } } });
  if (opt.tysonBody) kv['profiles/tyson'] = { body: { sex: 'm', age: 26, heightIn: 74, weightLb: 240, activity: 'light', pace: 'maintain' } };
  ['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09', '2026-11-11', '2026-11-13'].forEach(d => { kv['profiles/jacquie/sessions/' + d] = walk(d, 'walkeasy', 'Easy walk', 20); });
  kv['profiles/jacquie/sessions/2026-11-16'] = walk('2026-11-16', 'walkeasy', 'Easy walk', 20);
  kv['profiles/jacquie/sessions/2026-11-18'] = walk('2026-11-18', 'chairyoga', 'Chair yoga', 20);
  kv['profiles/jacquie/food/2026-11-16'] = foodDay('2026-11-16', 1800, 100, 76);
  if (opt.strongJ) { // a near-perfect week for Jacquie: four active days of three kinds, food and water on target six days running
    kv['profiles/jacquie/sessions/2026-11-20'] = walk('2026-11-20', 'recbike', 'Recumbent bike', 30); kv['profiles/jacquie/sessions/2026-11-21'] = walk('2026-11-21', 'walkpark', 'Park or trail walk', 30);
    ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21'].forEach(d => { kv['profiles/jacquie/food/' + d] = foodDay(d, 1800, 100, 76); });
  }
  return 'if(!localStorage.getItem("seeded")){localStorage.setItem("seeded","1");localStorage.setItem("ml.sessions",' + JSON.stringify(JSON.stringify(sessions)) + ');localStorage.setItem("ml.settings",' +
    JSON.stringify(JSON.stringify({ startDate: '2026-11-02', goal: 5, maxed: {}, swaps: opt.swaps || {} })) + ');localStorage.setItem("ml.kv",' + JSON.stringify(JSON.stringify(kv)) + ');}' + (opt.pre || '');
}
const SAT = T('2026-11-21T17:00:00Z'), SUN = T('2026-11-22T17:00:00Z'), MON = T('2026-11-23T17:00:00Z'), WED = T('2026-11-25T17:00:00Z');

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
    await open({ me: 'tyson', time: SAT, init: seed() });
    const s = await ML(page, () => ({ phase: window.MorningLaps.phaseFor('2026-11-21', 'tyson'), recs: Object.keys(window.MorningLaps.state.data.tyson.sessions).length, jrecs: Object.keys(window.MorningLaps.state.data.jacquie.sessions).length, mode: window.MorningLaps.state.storage, weeks: window.MorningLaps.compWeeks().length }));
    check('S browser-only mode, two profiles, three weeks of history, Tyson in Phase 3', s.mode === 'local' && s.phase === 3 && s.recs === 10 && s.jrecs === 8 && s.weeks === 2, JSON.stringify(s));
  });

  // ---------- Bug 1: a swap never drops an exercise ----------
  await section('B1', async () => {
    await open({ me: 'tyson', time: SAT, init: seed() });
    const r = await ML(page, () => {
      const M = window.MorningLaps, bad = [], uniq = a => new Set(a).size === a.length; let tried = 0, defaults = 0;
      ['push', 'pull', 'legs'].forEach(kind => [1, 2, 3].forEach(ph => {
        const want = M.DAYS[kind].phases[ph].length, base = M.planSlots(kind, ph, {});
        base.forEach(slot => M.swapOptions(base, slot).forEach(to => {            // every swap the menu offers
          const sw = {}; sw[slot.base] = to; const one = M.planSlots(kind, ph, sw); tried++;
          if (one.length !== want || !uniq(one.map(x => x.key))) bad.push(kind + ph + ' ' + slot.base + '>' + to);
          one.forEach(s2 => { if (s2.base === slot.base) return; M.swapOptions(one, s2).forEach(to2 => { // and every second swap offered after it
            const sw2 = Object.assign({}, sw); sw2[s2.base] = to2; const two = M.planSlots(kind, ph, sw2); tried++;
            if (two.length !== want || !uniq(two.map(x => x.key))) bad.push(kind + ph + ' ' + slot.base + '>' + to + ' + ' + s2.base + '>' + to2); }); });
        }));
      }));
      Object.keys(M.EX).forEach(k => { const to = M.defaultSwapOption(k); if (!to) return; defaults++; const sw = {}; sw[k] = to; // every default swap the Program tab offers
        ['push', 'pull', 'legs'].forEach(kind => [1, 2, 3].forEach(ph => { const p = M.planSlots(kind, ph, sw); if (p.length !== M.DAYS[kind].phases[ph].length || !uniq(p.map(x => x.key))) bad.push('default ' + k + '>' + to + ' in ' + kind + ph); })); });
      const old = [['push', 3, { inclinedb: 'pecdeck' }], ['push', 3, { pecdeck: 'inclinedb' }], ['pull', 3, { hammer: 'dbcurl' }], ['legs', 2, { dbrdl: 'legcurl' }], ['legs', 3, { dbrdl: 'legcurl' }], ['legs', 2, { legcurl: 'dbrdl' }], ['legs', 3, { legcurl: 'dbrdl' }], ['legs', 2, { legpress: 'goblet', calf: 'goblet' }]]
        .map(c => { const p = M.planSlots(c[0], c[1], c[2]); return p.length === M.DAYS[c[0]].phases[c[1]].length && uniq(p.map(x => x.key)); });
      const p3 = M.planSlots('push', 3, {}), pull3 = M.planSlots('pull', 3, {}), legs3 = M.planSlots('legs', 3, { squat: 'goblet' });
      return { bad, tried, defaults, old, incline: M.swapOptions(p3, p3.find(x => x.base === 'inclinedb')), pec: M.swapOptions(p3, p3.find(x => x.base === 'pecdeck')), hammer: M.swapOptions(pull3, pull3.find(x => x.base === 'hammer')), calf: M.swapOptions(legs3, legs3.find(x => x.base === 'calf')) };
    });
    check('B1 every day in every phase keeps its full count after any offered swap, alone or in pairs (' + r.tried + ' swaps tried)', r.bad.length === 0 && r.tried > 60, r.bad.slice(0, 5).join(' | '));
    check('B1 every default swap the Program tab offers keeps every day whole (' + r.defaults + ' defaults tried)', r.defaults >= 20 && !r.bad.some(x => x.indexOf('default') === 0));
    check('B1 old saved swaps that collide no longer drop a lift (the five named cases and a double goblet)', r.old.every(Boolean), JSON.stringify(r.old));
    check('B1 Phase 3 Push: Incline DB press and Pec deck are not offered to each other', !r.incline.includes('pecdeck') && r.incline.includes('chestpress') && !r.pec.includes('inclinedb') && r.pec.length > 0, r.incline.join() + ' / ' + r.pec.join());
    check('B1 Phase 3 Pull: Hammer curl is offered Cable curl, not DB curl', r.hammer.join() === 'cablecurl', r.hammer.join());
    check('B1 with no alternate left the swap is empty', r.calf.length === 0);
    // the same on screen
    await page.click('#kindSeg [data-kind="push"]'); await page.waitForSelector('.ex[data-ex="inclinedb"]');
    const count = () => page.$$eval('.ex[data-ex]', els => els.length);
    check('B1 screen: Phase 3 Push shows five lifts', await count() === 5);
    await page.click('[data-menu="inclinedb"]'); await page.click('.menu [data-act="swap"]'); await page.waitForSelector('.menu [data-act="swapto"]');
    const offered = await page.$$eval('.menu [data-act="swapto"]', els => els.map(e => e.dataset.to));
    check('B1 screen: the ··· menu for Incline DB press leaves Pec deck out', !offered.includes('pecdeck') && offered.includes('chestpress'), offered.join());
    await page.click('.menu [data-act="swapto"][data-to="chestpress"]'); await page.waitForSelector('.ex[data-ex="chestpress"]');
    check('B1 screen: after the swap the day still has five lifts', await count() === 5 && await has(page, '.ex[data-ex="pecdeck"]'));
    await page.click('#kindSeg [data-kind="legs"]'); await page.waitForSelector('.ex[data-ex="squat"]');
    await page.click('[data-menu="squat"]'); await page.click('.menu [data-act="swap"]'); await page.click('.menu [data-act="swapto"][data-to="goblet"]'); await page.waitForSelector('.ex[data-ex="goblet"]');
    await page.click('[data-menu="calf"]'); await page.waitForSelector('.menu [data-act="swap"]');
    check('B1 screen: a swap with nothing left shows as unavailable', await page.$eval('.menu [data-act="swap"]', b => b.disabled && b.textContent.includes('already in today\'s workout')), await txt(page, '.menu [data-act="swap"]'));
    check('B1 screen: Legs still has all eight moves', await count() === 8);
    await page.keyboard.press('Escape'); await go(page, 'program');
    check('B1 screen: the default swap offered for Incline DB press is one that is free in every phase', (await txt(page, 'li[data-swaprow="inclinedb"] [data-gswap]')) === 'Use Dumbbell bench press', await txt(page, 'li[data-swaprow="inclinedb"]'));
    await page.click('li[data-swaprow="dbrdl"] [data-gswap]'); await page.waitForFunction(() => !!JSON.parse(localStorage.getItem('ml.settings')).swaps.dbrdl);
    const dflt = await ML(page, () => { const M = window.MorningLaps, sw = JSON.parse(localStorage.getItem('ml.settings')).swaps; return { to: sw.dbrdl, counts: [2, 3].map(ph => M.planSlots('legs', ph, sw).length), want: [2, 3].map(ph => M.DAYS.legs.phases[ph].length) }; });
    check('B1 screen: a default swap for Dumbbell RDL keeps Legs whole in Phases 2 and 3', dflt.to !== 'legcurl' && dflt.counts.join() === dflt.want.join(), JSON.stringify(dflt));
    await ctx.close();
    await open({ me: 'tyson', time: SAT, init: seed({ swaps: { inclinedb: 'pecdeck', hammer: 'dbcurl' } }) }); // defaults saved by the old version
    await page.click('#kindSeg [data-kind="push"]'); await page.waitForSelector('.ex[data-ex="inclinedb"]');
    check('B1 screen: an old colliding default swap leaves Push with five lifts', await page.$$eval('.ex[data-ex]', els => els.length) === 5 && await has(page, '.ex[data-ex="pecdeck"]'));
    await page.click('#kindSeg [data-kind="pull"]'); await page.waitForSelector('.ex[data-ex="hammer"]');
    check('B1 screen: and Pull with all eight moves', await page.$$eval('.ex[data-ex]', els => els.length) === 8);
    await go(page, 'program');
    check('B1 screen: the Program tab explains the collision and offers Undo', (await txt(page, 'li[data-swaprow="inclinedb"]')).includes('already in that day\'s workout') && (await txt(page, 'li[data-swaprow="inclinedb"] [data-gswap]')) === 'Undo');
  });

  // ---------- Bug 2: a goal change starts next Monday ----------
  await section('B2', async () => {
    await open({ me: 'jacquie', time: SAT, init: seed() });
    const before = await score(page, 'jacquie'), strip = await txt(page, '#actCount');
    const lock = await kv(page, 'profiles/jacquie/weekgoals/2026-11-16');
    check('B2 opening the app locks this week\'s targets for both of you', lock && lock.goal === 3 && lock.plan === 'choice' && lock.minMin === 10 && lock.liftGoal === 3 && lock.kcal === 1900 && lock.lo === 1520 && lock.hi === 2090 && lock.waterOz === 76 && lock.protein === 105 && lock.scoring === 1 && !!(await kv(page, 'profiles/tyson/weekgoals/2026-11-16')), JSON.stringify(lock));
    check('B2 start: Jacquie has 2 of 3 active days', strip === '2/3' && before.active === 2, strip + ' ' + before.total);
    await go(page, 'program'); await page.click('[data-a="move-goal"][data-v="2"]'); await page.waitForSelector('[data-lock="goal"]');
    const after = await score(page, 'jacquie');
    check('B2 Saturday: lowering the goal from 3 to 2 does not move this week\'s score', after.total === before.total && after.move === before.move && await txt(page, '#actCount') === '2/3', before.total + ' -> ' + after.total);
    check('B2 the setting says when it starts', (await txt(page, '[data-lock="goal"]')).includes('Starts Mon Nov 23') && (await txt(page, '[data-lock="goal"]')).includes('This week stays at 3 active days'), await txt(page, '[data-lock="goal"]'));
    await page.click('[data-a="move-min"][data-v="30"]'); await page.waitForSelector('[data-lock="minMin"]');
    check('B2 raising the minutes that count does not move it either', (await score(page, 'jacquie')).total === before.total && (await txt(page, '[data-lock="minMin"]')).includes('Starts Mon Nov 23'));
    await go(page, 'me');
    await fill(page, '[data-form="body"][data-k="lb"]', 200); await fill(page, '[data-form="body"][data-k="dwater"]', 40); await page.click('h1'); await page.click('[data-a="body-save"]'); await toastWith(page, 'Targets set');
    const s3 = await score(page, 'jacquie');
    check('B2 new body stats and a doctor\'s water number leave this week\'s Fuel and Water alone', s3.total === before.total && s3.fuel === before.fuel && s3.water === before.water, JSON.stringify([before.fuel, s3.fuel, before.water, s3.water]));
    const lt = await txt(page, '#lockedTargets');
    check('B2 Me shows this week\'s locked numbers next to the new ones', lt.includes('This week, locked') && lt.includes('1,900 calories') && lt.includes('76 oz') && lt.includes('Starts Mon Nov 23') && await txt(page, '#tWater') === '40 oz', lt);
    await page.click('[data-a="plan-set"][data-v="program"]'); await page.waitForSelector('#planLock');
    check('B2 switching workout style does not move it, and says when scoring switches', (await score(page, 'jacquie')).total === before.total && (await txt(page, '#planLock')).includes('Starts Mon Nov 23') && (await txt(page, '#planLock')).includes('still scored as pick-your-own'), await txt(page, '#planLock'));
    await page.click('[data-a="plan-set"][data-v="choice"]'); await page.waitForFunction(() => !document.getElementById('planLock'));
    check('B2 the first snapshot is never rewritten', JSON.stringify(await kv(page, 'profiles/jacquie/weekgoals/2026-11-16')) === JSON.stringify(lock));
    const next = await carry(page); await ctx.close();
    await open({ me: 'jacquie', time: MON, init: next });
    const g = await ML(page, () => ({ now: window.MorningLaps.weekGoals('jacquie', '2026-11-23'), was: window.MorningLaps.weekGoals('jacquie', '2026-11-16'), old: window.MorningLaps.weekScore('jacquie', '2026-11-16').total }));
    check('B2 next week uses the new goal, minutes and targets', g.now.goal === 2 && g.now.minMin === 30 && g.now.waterOz === 40 && g.now.locked && await txt(page, '#actCount') === '0/2', JSON.stringify(g.now));
    check('B2 and last week is still scored on its own locked goals', g.was.goal === 3 && g.was.minMin === 10 && g.was.waterOz === 76 && g.old === before.total, g.old + ' vs ' + before.total);
    await ctx.close();
    // the one exception: a week locked on placeholder targets takes the first real ones right away
    await open({ me: 'tyson', time: SAT, init: seed() });
    const ph = await kv(page, 'profiles/tyson/weekgoals/2026-11-16');
    await go(page, 'me');
    await page.click('[data-a="form-set"][data-k="sex"][data-v="m"]'); await fill(page, '[data-form="body"][data-k="age"]', 26); await fill(page, '[data-form="body"][data-k="lb"]', 240); await fill(page, '[data-form="body"][data-k="ft"]', 6); await fill(page, '[data-form="body"][data-k="inch"]', 2);
    await page.click('h1'); await page.click('[data-a="body-save"]'); await toastWith(page, 'Targets set');
    await page.waitForFunction(() => (JSON.parse(localStorage.getItem('ml.kv')))['profiles/tyson/weekgoals/2026-11-16'].placeholder === false);
    const real = await ML(page, () => ({ wk: window.MorningLaps.weekGoals('tyson', '2026-11-16'), live: window.MorningLaps.liveGoals('tyson') }));
    check('B2 exception: locked on placeholders, Tyson\'s first real targets apply this week', ph.placeholder === true && ph.kcal === 2000 && real.live.kcal > 2500 && real.wk.kcal === real.live.kcal && real.wk.waterOz === real.live.waterOz && real.wk.protein === real.live.protein, JSON.stringify([ph.kcal, real.wk.kcal, real.live.kcal]));
    await fill(page, '[data-form="body"][data-k="lb"]', 200); await page.click('h1'); await page.click('[data-a="body-save"]'); await toastWith(page, 'Starts');
    const again = await ML(page, () => ({ wk: window.MorningLaps.weekGoals('tyson', '2026-11-16').kcal, live: window.MorningLaps.liveGoals('tyson').kcal }));
    check('B2 exception is one time: the next change waits for Monday', again.wk === real.wk.kcal && again.live !== again.wk, JSON.stringify(again));
  });

  // ---------- Bug 3: the winner is announced when the week is final ----------
  await section('B3', async () => {
    const init = seed({ tysonThisWeek: [['2026-11-16', 'push'], ['2026-11-17', 'tread'], ['2026-11-18', 'pull'], ['2026-11-20', 'legs']] });
    await open({ me: 'jacquie', time: MON, init });
    const prov = await toastWith(page, 'Provisional');
    const mon = await ML(page, () => { const w = window.MorningLaps.compWeeks().slice(-1)[0]; return { t: w.tyson, j: w.jacquie, final: w.final }; });
    check('B3 Monday: the wrong-so-far leader gets only a quiet provisional line', mon.t > mon.j && !mon.final && prov === 'Provisional: Tyson leads ' + mon.t + '–' + mon.j + ' · late entries count through Tuesday', prov);
    check('B3 Monday: no winner overlay and no confetti', !(await seen(page)).some(x => /wins|Dead heat/.test(x)) && await page.evaluate(() => document.getElementById('ov').hidden), JSON.stringify(await seen(page)));
    await go(page, 'compete');
    check('B3 Monday: Compete says provisional and counts no win', (await txt(page, '#provLine')).includes('Provisional: Tyson leads') && (await txt(page, '.wk[data-wk="2026-11-16"]')).includes('provisional') && (await txt(page, '#seasonCard')).includes('Jacquie 1 – 1 Tyson'), await txt(page, '#seasonCard'));
    // Jacquie fills in her weekend, which is allowed through Tuesday
    await go(page, 'train');
    for (const [d, k] of [['2026-11-21', 'recbike'], ['2026-11-22', 'walkpark']]) { await pickDate(page, d); await page.click('.act[data-k="' + k + '"]'); await page.waitForSelector('#actLog'); await page.click('#actLog'); await page.waitForSelector('#ov', { state: 'hidden' }); }
    const flip = await ML(page, () => { const w = window.MorningLaps.compWeeks().slice(-1)[0]; return { t: w.tyson, j: w.jacquie }; });
    check('B3 late entries flip the lead', flip.j > flip.t, JSON.stringify(flip));
    await page.reload(); await page.waitForSelector('#main .card'); await settled(page); await page.waitForTimeout(400);
    check('B3 still Monday after a reload: nothing is announced', !(await seen(page)).some(x => /wins/.test(x)) && !(await kv(page, 'results/2026-11-16')));
    const wed = await carry(page); await ctx.close();
    await open({ me: 'jacquie', time: WED, init: wed });
    await page.waitForFunction(() => window.__seen.some(x => x.includes('wins')), null, { timeout: 5000 }).catch(() => {});
    const fin = await kv(page, 'results/2026-11-16'), said = await seen(page);
    check('B3 Wednesday: the result is stored as final with the right winner', !!fin && fin.final === true && fin.winner === 'jacquie' && fin.jacquie === flip.j && fin.tyson === flip.t, JSON.stringify(fin));
    check('B3 Wednesday: the correct winner is announced, once', said.filter(x => x.includes('wins')).length === 1 && said.includes('Jacquie wins, ' + flip.j + ' to ' + flip.t), JSON.stringify(said));
    await page.reload(); await page.waitForSelector('#main .card'); await settled(page); await page.waitForTimeout(500);
    check('B3 it is not announced again on the same phone', !(await seen(page)).some(x => x.includes('wins')));
    // Tyson's phone: the same shared data, but its own memory, which last saw Monday's provisional line
    const phone2 = (await carry(page, ['carried'])) + 'if(!localStorage.getItem("p2")){localStorage.setItem("p2","1");localStorage.setItem("ml.me",JSON.stringify("tyson"));localStorage.setItem("ml.seenFinalWeek",JSON.stringify("2026-11-09"));localStorage.setItem("ml.seenWeek",JSON.stringify("2026-11-16"));}'; await ctx.close();
    await open({ me: 'tyson', time: WED, init: phone2 });
    await page.waitForFunction(() => window.__seen.some(x => x.includes('wins')), null, { timeout: 5000 }).catch(() => {});
    check('B3 the other phone shows the same final result once', (await seen(page)).filter(x => x.includes('wins')).join() === 'Jacquie wins, ' + flip.j + ' to ' + flip.t, JSON.stringify(await seen(page)));
  });

  // ---------- Bug 4: Watch minutes never double-count ----------
  await section('B4', async () => {
    await open({ me: 'jacquie', time: SAT, init: seed() });
    const mins = () => ML(page, () => window.MorningLaps.dayInfo('jacquie', '2026-11-21').minutes);
    const acts = async () => ((await kv(page, 'profiles/jacquie/sessions/2026-11-21')) || { acts: [] }).acts;
    await page.click('.sess [data-a="health"]'); await fill(page, '#hkText', 'date: 2026-11-21\nexercise: 30'); await page.click('#hkGo'); await page.waitForSelector('#ov', { state: 'hidden' });
    check('B4 import 30 Watch minutes: the day shows 30', await mins() === 30 && (await acts()).length === 1 && (await acts())[0].id === 'hk-exercise', JSON.stringify(await acts()));
    const kinds0 = await ML(page, () => window.MorningLaps.dayInfo('jacquie', '2026-11-21').kinds.length);
    check('B4 the Watch entry is not a kind of activity (no variety, no Sampler credit)', kinds0 === 0);
    await page.click('.act[data-k="walkeasy"]'); await page.waitForSelector('#actLog'); await fill(page, '#actMin', 30); await page.click('#actLog'); await page.waitForSelector('#ov', { state: 'hidden' });
    check('B4 then log the same 30-minute walk by hand: the day still shows 30', await mins() === 30 && (await acts()).length === 1 && (await acts())[0].a === 'walkeasy' && (await txt(page, '#statusLine')).includes('30 min logged'), (await mins()) + ' ' + JSON.stringify(await acts()));
    await page.click('.done-list [data-a="act-edit"]'); await page.waitForSelector('#actLog'); await fill(page, '#actMin', 45); await page.click('#actLog'); await page.waitForSelector('#ov', { state: 'hidden' });
    check('B4 change the walk to 45: the day shows 45 and the top-up is gone', await mins() === 45 && !(await acts()).some(a => a.id === 'hk-exercise'));
    await page.click('.done-list [data-a="act-edit"]'); await page.waitForSelector('[data-a="act-del"]'); await page.click('[data-a="act-del"]'); await page.waitForSelector('#ov', { state: 'hidden' });
    check('B4 delete the walk: back to 30 from the Watch', await mins() === 30 && (await acts()).length === 1 && (await acts())[0].id === 'hk-exercise' && (await acts())[0].min === 30, JSON.stringify(await acts()));
    await page.click('.act[data-k="walkeasy"]'); await page.waitForSelector('#actLog'); await fill(page, '#actMin', 20); await page.click('#actLog'); await page.waitForSelector('#ov', { state: 'hidden' });
    check('B4 a shorter hand-logged walk leaves only the difference as top-up', await mins() === 30 && (await acts()).find(a => a.id === 'hk-exercise').min === 10);
    await page.click('.done-list [data-a="hk-info"]'); await page.waitForSelector('[data-a="hk-off"]');
    check('B4 the top-up explains itself', (await txt(page, '#ov')).includes('Your Watch counted 30 exercise minutes') && (await txt(page, '#ov')).includes('20 min'));
    await page.click('[data-a="hk-off"]'); await page.waitForSelector('#ov', { state: 'hidden' });
    check('B4 and can be turned off for the day', await mins() === 20 && !(await acts()).some(a => a.id === 'hk-exercise'));
  });

  // ---------- Bug 5: the lifting-program profile can log anything else too ----------
  await section('B5', async () => {
    await open({ me: 'tyson', time: SAT, init: seed() });
    const addWalk = async min => { await page.click('[data-a="act-pick"]'); await page.waitForSelector('.ov .act[data-k="walkpair"]'); await page.click('.ov .act[data-k="walkpair"]'); await page.waitForSelector('#actLog'); await fill(page, '#actMin', min); await page.click('#actLog'); await page.waitForSelector('#ov', { state: 'hidden' }); };
    const saveLift = async () => { await page.click('#kindSeg [data-kind="push"]'); await page.waitForSelector('#w-shoulderpress'); await fill(page, '#tmMin', 30); await fill(page, '#w-shoulderpress', 50); await fill(page, '#r-shoulderpress-0', 10); await fill(page, '#w-pushdown', 40); await fill(page, '#r-pushdown-0', 12); await page.click('h1'); await page.click('#saveBtn'); };
    check('B5 the lifting log offers "+ Add a walk or other activity"', (await txt(page, '[data-a="act-pick"]')) === '+ Add a walk or other activity');
    // today: the walk first, then the lift. Saving the lift used to erase the walk.
    await addWalk(20);
    check('B5 a 20-minute walk alone counts as one of his activity days', (await ses(page, '2026-11-21')).kind === 'activity' && await txt(page, '#actCount') === '1/5' && (await score(page, 'tyson')).active === 1, await txt(page, '#actCount'));
    await saveLift(); await page.waitForFunction(() => { const r = JSON.parse(localStorage.getItem('ml.sessions'))['2026-11-21']; return r && r.kind === 'strength'; });
    const both = await ses(page, '2026-11-21'), di = await ML(page, () => window.MorningLaps.dayInfo('tyson', '2026-11-21'));
    check('B5 Push day and "Walk together" on the same date: both are saved', both.kind === 'strength' && both.day === 'push' && Object.keys(both.ex).length === 2 && both.acts.length === 1 && both.acts[0].name === 'Walk together' && both.acts[0].min === 20, JSON.stringify(both.acts));
    check('B5 the day\'s minutes include the walk', di.minutes === 30 + 2 * 3 + 20 && di.lift === true && di.kinds.includes('walkpair') && di.kinds.includes('push'), JSON.stringify(di));
    check('B5 the strip matches the score', await txt(page, '#actCount') === (await score(page, 'tyson')).active + '/5' && await txt(page, '#liftCount') === (await score(page, 'tyson')).lifts + '/3');
    check('B5 the lifting log lists the walk under the lift', (await txt(page, '#extras')).includes('Walk together') && !(await txt(page, '#main')).includes('replaces them'));
    // yesterday: the lift first, then the walk
    await pickDate(page, '2026-11-20'); await saveLift(); await page.waitForFunction(() => { const r = JSON.parse(localStorage.getItem('ml.sessions'))['2026-11-20']; return r && r.kind === 'strength'; });
    await addWalk(25);
    const y = await ses(page, '2026-11-20');
    check('B5 adding a walk to a saved lift day keeps the lift', y.kind === 'strength' && Object.keys(y.ex).length === 2 && y.acts.length === 1 && y.acts[0].min === 25);
    // a day with only a walk
    await pickDate(page, '2026-11-19'); await addWalk(20);
    check('B5 a day with only a 20-minute walk counts as an activity day', (await ses(page, '2026-11-19')).kind === 'activity' && (await score(page, 'tyson')).active === 3 && await txt(page, '#actCount') === '3/5');
    await pickDate(page, '2026-11-18'); await addWalk(5);
    check('B5 under 10 minutes does not', (await score(page, 'tyson')).active === 3 && await txt(page, '#actCount') === '3/5');
    await go(page, 'history'); await page.click('details.hi[data-hdate="2026-11-21"] summary');
    const h = await txt(page, 'details.hi[data-hdate="2026-11-21"]');
    check('B5 History shows both parts of the combined day', h.includes('Push') && h.includes('Walk together') && h.includes('Shoulder press machine') && h.includes('20 min of activities') && h.includes('Remove lift'), h.slice(0, 200));
    await page.click('[data-remove="2026-11-21"]'); await page.click('[data-remove="2026-11-21"]'); await toastWith(page, 'activities');
    const left = await ses(page, '2026-11-21');
    check('B5 removing the lift keeps the walk', left.kind === 'activity' && left.acts.length === 1 && left.acts[0].name === 'Walk together' && !left.ex);
    // Watch minutes for the lifting-program profile
    await go(page, 'train'); await pickDate(page, '2026-11-17');
    await page.click('.sess [data-a="health"]'); await fill(page, '#hkText', 'date: 2026-11-17\nexercise: 35'); await page.click('#hkGo'); await page.waitForSelector('#ov', { state: 'hidden' });
    check('B5 on a day with no lift or treadmill, Watch minutes count as a top-up', (await ses(page, '2026-11-17')).acts[0].id === 'hk-exercise' && (await ML(page, () => window.MorningLaps.dayInfo('tyson', '2026-11-17'))).minutes === 35);
    await pickDate(page, '2026-11-20');
    await page.click('.sess [data-a="health"]'); await fill(page, '#hkText', 'date: 2026-11-20\nexercise: 60');
    check('B5 on a lift day they are shown only', (await txt(page, '#hkPreview')).includes('shown with it, not added on top') && !(await has(page, '[data-a="hk-toggle"][data-k="move"]')));
    await page.click('#hkGo'); await page.waitForSelector('#ov', { state: 'hidden' });
    check('B5 and the lift day\'s minutes do not change', !(await ses(page, '2026-11-20')).acts.some(a => a.id === 'hk-exercise') && (await txt(page, '#hkLine')).includes('60 exercise min'));
  });

  // ---------- Bug 6: the fair-scoring text follows each person's plan ----------
  await section('B6', async () => {
    await open({ me: 'jacquie', time: SAT, init: seed() });
    await go(page, 'compete');
    const a = await txt(page, '#fairRules');
    check('B6 before: Tyson\'s line is the lifting program, Jacquie\'s is pick-your-own, each with their own goals', a.includes('Tyson, on the lifting program: 30 for activity days (goal 5 a week) plus 20 for lift days (goal 3 a week)') && a.includes('Jacquie, on pick-your-own: 50 for active days of 10 minutes or more (goal 3 a week)'), a.slice(0, 400));
    await go(page, 'me'); await page.click('[data-a="plan-set"][data-v="program"]'); await page.waitForSelector('#planLock'); await go(page, 'compete');
    const b = await txt(page, '#fairRules');
    check('B6 after switching Jacquie to the lifting program her line describes activity days plus lift days', /Jacquie[^.]*lifting program: 30 for activity days \(goal 5 a week\) plus 20 for lift days \(goal 3 a week\)/.test(b), b.slice(0, 600));
    check('B6 and says honestly that this week is still scored the old way', b.includes('Starts Mon Nov 23') && b.includes('Jacquie, on pick-your-own: 50 for active days'), b.slice(0, 600));
    const next = await carry(page); await ctx.close();
    await open({ me: 'jacquie', time: MON, init: next }); await go(page, 'compete');
    const c = await txt(page, '#fairRules');
    check('B6 from Monday her line is the lifting-program one only', c.includes('Jacquie, on the lifting program: 30 for activity days') && !c.includes('Jacquie, on pick-your-own'), c.slice(0, 400));
  });

  // ---------- Bug 7: the gym is a setting ----------
  await section('B7', async () => {
    await open({ me: 'tyson', time: SAT, init: seed() });
    check('B7 Tyson\'s default is still Avon Anytime Fitness', (await txt(page, '#todayLine')).includes('Avon Anytime Fitness'));
    await go(page, 'me'); await fill(page, '[data-form="gym"][data-k="place"]', 'Indianapolis Healthplex'); await page.click('[data-a="gym-save"]'); await toastWith(page, 'Gym set');
    check('B7 the header updates', (await txt(page, '#todayLine')).includes('Indianapolis Healthplex') && (await kv(page, 'profiles/tyson')).place === 'Indianapolis Healthplex');
    await go(page, 'train');
    check('B7 the morning plan updates', (await txt(page, 'details[data-dk="morning"]')).includes('drive to Indianapolis Healthplex'));
    const where = [];
    for (const who of ['tyson', 'jacquie']) { if (who === 'jacquie') await switchTo(page, 'jacquie');
      for (const tab of ['train', 'program', 'history', 'fuel', 'compete', 'me']) { await go(page, tab); if (/Anytime Fitness|Avon/.test(await page.evaluate(() => document.body.innerText + ' ' + document.getElementById('main').textContent))) where.push(who + ':' + tab); } }
    await go(page, 'train'); await page.click('.act[data-k="machines"]'); await page.waitForSelector('#actLog');
    const mach = await txt(page, '#ov');
    check('B7 nothing else on any tab, for either profile, says Anytime Fitness', where.length === 0, where.join(' '));
    check('B7 the machine circuit says "at the gym"', mach.includes('At the gym: leg press') && !/Anytime/.test(mach));
  });

  // ---------- Bug 8: stakes belong to a week; custom foods can be fixed ----------
  await section('B8', async () => {
    await open({ me: 'jacquie', time: SAT, init: seed({ tysonThisWeek: [['2026-11-16', 'push']] }) });
    await go(page, 'compete');
    await page.click('[data-a="stakes-edit"]'); await fill(page, '#stakesIn', 'cooks Sunday dinner'); await page.click('[data-a="stakes-save"]'); await page.waitForFunction(() => document.getElementById('stakesLine').textContent.includes('cooks Sunday dinner'));
    check('B8 stakes are saved with the week they are for', (await kv(page, 'comp/settings')).stakesBy['2026-11-16'] === 'cooks Sunday dinner');
    const next = await carry(page); await ctx.close();
    await open({ me: 'jacquie', time: WED, init: 'window.__keepOv=true;' + next });
    await page.waitForFunction(() => !!(JSON.parse(localStorage.getItem('ml.kv')))['results/2026-11-16']);
    let said = '';
    for (let i = 0; i < 8; i++) { await page.waitForTimeout(250); const t = await page.evaluate(() => document.getElementById('ov').hidden ? '' : document.getElementById('ov').textContent); if (/wins/.test(t)) said = t; if (!t && said) break; if (t) await page.click('#ov [data-a="ov-close"]'); }
    await page.evaluate(() => { window.__keepOv = false; });
    const r = await kv(page, 'results/2026-11-16'); await go(page, 'compete');
    const row = await txt(page, '.wk[data-wk="2026-11-16"]'), loser = r.winner === 'jacquie' ? 'Tyson' : 'Jacquie', winner = r.winner === 'jacquie' ? 'Jacquie' : 'Tyson';
    check('B8 when the week closes its stakes are copied into the result', r.final === true && r.stakes === 'cooks Sunday dinner' && !!r.winner, JSON.stringify(r));
    check('B8 the Season row shows who owes what', row.includes(winner + ' won · ' + loser + ' owes: cooks Sunday dinner'), row);
    check('B8 the new week starts with no stakes', (await txt(page, '#stakesLine')) === 'Add what\'s on the line this week' && !(await txt(page, '#main')).includes('On the line this week'), await txt(page, '#stakesLine'));
    check('B8 the final announcement names the stakes too', said.includes('Final · week of Nov 16') && said.includes(winner + ' won · ' + loser + ' owes: cooks Sunday dinner'), said);
    // custom foods
    await go(page, 'fuel');
    await page.click('[data-a="food-add"][data-meal="l"]'); await page.waitForSelector('#foodQ'); await page.click('[data-a="food-custom"]'); await page.waitForSelector('[data-a="custom-save"]');
    await fill(page, '[data-ovf="name"]', 'Trackside chili'); await fill(page, '[data-ovf="kcal"]', 300); await fill(page, '[data-ovf="p"]', 20); await page.click('[data-a="custom-save"]'); await page.waitForSelector('#foodAdd');
    await page.click('#foodAdd'); await page.waitForSelector('#ov[hidden]', { state: 'attached' });
    const day = () => ML(page, () => { const t = window.MorningLaps.dayTotals('jacquie', '2026-11-25'); return { kcal: t.kcal, p: t.n[1], count: t.count }; });
    const logged = await day();
    check('B8 a custom food is created and logged', logged.kcal === 300 && logged.p === 20 && logged.count === 1);
    const find = async q => { await page.click('[data-a="food-add"][data-meal="d"]'); await page.waitForSelector('#foodQ'); await fill(page, '#foodQ', q); await page.waitForTimeout(250); return page.$$eval('#foodRes [data-a="food-pick"]', els => els.map(e => e.textContent)); };
    const r1 = await find('trackside chili');
    await page.click('#foodRes [data-a="food-pick"]'); await page.waitForSelector('[data-a="custom-edit"]');
    check('B8 its detail sheet has Edit and Delete', r1.length >= 1 && r1[0].includes('Trackside chili') && await has(page, '[data-a="custom-del"]'));
    await page.click('[data-a="custom-edit"]'); await page.waitForSelector('[data-a="custom-save"]');
    check('B8 Edit opens the food with its numbers filled in', await val(page, '[data-ovf="kcal"]') === '300' && await val(page, '[data-ovf="p"]') === '20' && await val(page, '[data-ovf="name"]') === 'Trackside chili');
    await fill(page, '[data-ovf="kcal"]', 420); await fill(page, '[data-ovf="name"]', 'Trackside chili, big bowl'); await page.click('[data-a="custom-save"]'); await toastWith(page, 'Food updated');
    const foods = await page.evaluate(() => { const k = JSON.parse(localStorage.getItem('ml.kv')); return Object.keys(k).filter(p => p.indexOf('foods/') === 0).map(p => k[p]); });
    check('B8 the edit changes the saved food, not a copy', foods.length === 1 && foods[0].n[0] === 420 && foods[0].name === 'Trackside chili, big bowl' && !!foods[0].createdAt && !!foods[0].updatedAt);
    check('B8 what was already logged keeps the nutrition it was logged with', JSON.stringify(await day()) === JSON.stringify(logged) && (await kv(page, 'profiles/jacquie/food/2026-11-25')).items[0].name === 'Trackside chili');
    await page.click('[data-a="custom-del"]'); await page.click('[data-a="custom-del"]'); await toastWith(page, 'Removed');
    await page.keyboard.press('Escape'); await page.waitForSelector('#ov[hidden]', { state: 'attached' });
    const r2 = await find('trackside chili');
    check('B8 Delete removes it from search, for either of you', r2.filter(x => x.includes('Trackside')).length === 0 && await page.evaluate(() => !Object.keys(JSON.parse(localStorage.getItem('ml.kv'))).some(p => p.indexOf('foods/') === 0)));
    check('B8 and the past log is still unchanged', JSON.stringify(await day()) === JSON.stringify(logged));
  });

  // ---------- Feature A: the team score ----------
  await section('FA', async () => {
    await open({ me: 'jacquie', time: SAT, init: seed() });
    await go(page, 'compete');
    const card = await txt(page, '#teamCard');
    check('FA the Team card sits on Compete with each person\'s progress', card.includes('Team week') && card.includes('Jacquie') && card.includes('2 of 3 active days') && card.includes('Tyson') && card.includes('0 of 5 activity days · 0 of 3 lifts'), card.slice(0, 300));
    check('FA it counts who has locked in their Move score', await txt(page, '#teamLock') === 'Team week: 0 of 2 locked in');
    check('FA the streak counts finished team weeks in a row', await txt(page, '#teamStreak') === '2 weeks in a row', await txt(page, '#teamStreak'));
    await go(page, 'train'); await page.click('.act[data-k="recbike"]'); await page.waitForSelector('#actLog'); await page.click('#actLog'); await page.waitForSelector('#ov', { state: 'hidden' });
    await go(page, 'compete');
    check('FA filling her Move score locks in her half', await txt(page, '#teamLock') === 'Team week: 1 of 2 locked in' && (await txt(page, '#teamCard')).includes('Move score full'));
    await page.click('[data-a="cd-edit"]'); await page.waitForSelector('#cdForm');
    check('FA the countdown label defaults to Wedding', await val(page, '[data-form="cd"][data-k="label"]') === 'Wedding');
    await fill(page, '[data-form="cd"][data-k="date"]', '2027-04-12'); await page.click('[data-a="cd-save"]'); await page.waitForSelector('#cdLine');
    check('FA the countdown shows the days left and the team weeks banked since it was set', (await txt(page, '#cdLine')).includes('142 days to the wedding · 0 team weeks'), await txt(page, '#cdLine'));
    check('FA it is saved in the shared settings', JSON.stringify((await kv(page, 'comp/settings')).countdown) === JSON.stringify({ date: '2027-04-12', label: 'Wedding', setAt: '2026-11-21' }));
    await page.click('[data-a="cd-edit"]'); await fill(page, '[data-form="cd"][data-k="label"]', 'Honeymoon'); await page.click('[data-a="cd-save"]'); await page.waitForFunction(() => document.getElementById('cdLine').textContent.includes('Honeymoon'));
    check('FA the label can be edited', (await txt(page, '#cdLine')).includes('142 days to Honeymoon'));
    await go(page, 'me');
    check('FA two team weeks in a row earn the badge', await has(page, '.badge[data-id="team2"]:not(.locked)') && await has(page, '.badge[data-id="team4"].locked'));
    await ctx.close();
    await open({ me: 'tyson', time: SAT, init: seed({ comp: { countdown: { date: '2027-04-12', label: 'Wedding', setAt: '2026-11-03' } } }) });
    await go(page, 'compete');
    check('FA team weeks banked since the countdown was set are counted', (await txt(page, '#cdLine')).includes('142 days to the wedding · 2 team weeks'), await txt(page, '#cdLine'));
    await ctx.close();
    // the coach, when the points race is out of reach
    await open({ me: 'tyson', time: SUN, init: seed({ strongJ: true, tysonThisWeek: [['2026-11-16', 'push'], ['2026-11-17', 'tread'], ['2026-11-18', 'pull'], ['2026-11-19', 'tread']] }) });
    await go(page, 'compete');
    const c = await ML(page, () => { const k = window.MorningLaps.coach('tyson'); return { out: k.outOfReach, max: k.max, other: k.other, need: k.team.need, can: k.team.can }; });
    const pl = await txt(page, '#planLine');
    check('FA when the coach says Tyson cannot pass Jacquie this week it points to the team week', c.out === true && c.max <= c.other && c.can === true && pl.includes('Jacquie is out of reach on points this week') && pl.includes('The team week is still on: 1 more activity day and 1 more lift day fills your Move score'), pl + ' ' + JSON.stringify(c));
    await ctx.close();
    await open({ me: 'tyson', time: SUN, init: seed({ strongJ: true }) });
    await go(page, 'compete');
    check('FA and says so plainly when the team week cannot be reached either', (await txt(page, '#planLine')).includes('The team week is out of reach this week as well'), await txt(page, '#planLine'));
  });

  // ---------- Feature B: faster set logging and the rest timer ----------
  await section('FB', async () => {
    await open({ me: 'tyson', time: SAT, init: seed({ pre: 'window.__vib=[];try{Object.defineProperty(navigator,"vibrate",{configurable:true,value:function(p){window.__vib.push(p);return true;}});}catch(e){}' }) });
    await page.click('#kindSeg [data-kind="push"]'); await page.waitForSelector('#w-shoulderpress');
    check('FB the rest timer is its own element outside #main, hidden until a set is logged', await page.evaluate(() => { const r = document.getElementById('rest'); return r.hidden && !document.getElementById('main').contains(r); }));
    check('FB "Same as last time" shows where there is a last time', await page.$eval('[data-same="shoulderpress"]', b => !b.hidden) && !(await has(page, '[data-same="inclinedb"]')));
    await fill(page, '#r-shoulderpress-0', 8); await page.click('[data-same="shoulderpress"]');
    check('FB it fills the suggested weight and last session\'s reps into empty fields only', await val(page, '#w-shoulderpress') === '50' && await val(page, '#r-shoulderpress-0') === '8' && await val(page, '#r-shoulderpress-1') === '10' && await val(page, '#r-shoulderpress-2') === '10');
    check('FB and then steps aside', await page.$eval('[data-same="shoulderpress"]', b => b.hidden));
    check('FB "Repeat for all sets" is hidden until set 1 has reps', !(await has(page, '[data-repeat="latraise"]')));
    await fill(page, '#r-latraise-0', 12);
    check('FB once set 1 has reps the chip appears', await has(page, '[data-repeat="latraise"]'));
    await fill(page, '#r-latraise-2', 9); await page.click('[data-repeat="latraise"]');
    check('FB it fills the remaining empty sets with that number, and only those', await val(page, '#r-latraise-1') === '12' && await val(page, '#r-latraise-2') === '9' && !(await has(page, '[data-repeat="latraise"]')));
    const dr = await page.evaluate(() => JSON.parse(localStorage.getItem('ml.drafts'))['2026-11-21'].ex);
    check('FB both fills land in the draft', dr.shoulderpress.reps.join() === '8,10,10' && dr.shoulderpress.w === '50' && dr.latraise.reps.join() === '12,12,9');
    // rest timer (the fills above logged sets for today, so it is already running: dismiss it and start clean)
    check('FB logging those sets started it', await page.$eval('#rest', r => !r.hidden));
    await page.click('[data-a="timer-x"]');
    await page.evaluate(() => { document.getElementById('tmMin').__mark = 1; document.querySelector('.ex[data-ex="pushdown"]').__mark = 1; });
    await page.focus('#r-pushdown-0'); await page.keyboard.type('1');
    check('FB typing a digit alone does not start it', await page.$eval('#rest', r => r.hidden));
    await page.keyboard.type('2'); await page.focus('#r-pushdown-1');
    check('FB leaving the field with a set logged starts 90 seconds for a main lift', await page.$eval('#rest', r => !r.hidden) && await txt(page, '#restTime') === '1:30' && (await txt(page, '#restLabel')).includes('Cable triceps pushdown'), await txt(page, '#restTime'));
    await page.clock.fastForward(10000);
    check('FB it counts down', await txt(page, '#restTime') === '1:20');
    await page.click('[data-a="timer-add"]');
    check('FB +15 s adds fifteen seconds', await txt(page, '#restTime') === '1:35');
    await page.keyboard.type('11');
    check('FB it runs without a re-render, so typing keeps its place', await page.evaluate(() => document.getElementById('tmMin').__mark === 1 && document.querySelector('.ex[data-ex="pushdown"]').__mark === 1 && document.activeElement.id === 'r-pushdown-1') && await val(page, '#r-pushdown-1') === '11');
    await page.clock.fastForward(96000);
    check('FB at zero it flashes and buzzes, with no sound', await page.$eval('#rest', r => r.classList.contains('done')) && (await txt(page, '#restLabel')).includes('Rest over') && await page.evaluate(() => window.__vib.length === 1 && !document.querySelector('audio') && !/AudioContext|new Audio\(/.test(document.documentElement.innerHTML)), await txt(page, '#restLabel'));
    await page.click('[data-a="timer-x"]');
    check('FB the dismiss button hides it', await page.$eval('#rest', r => r.hidden));
    await page.click('h1'); await page.click('#kindSeg [data-kind="pull"]'); await page.waitForSelector('#r-crunch-0');
    await fill(page, '#r-crunch-0', 15); await page.focus('#r-crunch-1');
    check('FB core and bodyweight moves get 60 seconds', await txt(page, '#restTime') === '1:00');
    await page.click('[data-a="timer-x"]'); await page.click('h1');
    await go(page, 'program'); await page.click('[data-a="rest-len"][data-v="120"]'); await page.waitForFunction(() => JSON.parse(localStorage.getItem('ml.settings')).rest === 120);
    check('FB the Program tab offers 60, 90 or 120', (await page.$$eval('[data-a="rest-len"]', els => els.map(e => e.dataset.v))).join() === '60,90,120' && await page.$eval('[data-a="rest-len"][data-v="120"]', b => b.classList.contains('on')));
    await go(page, 'train'); await page.waitForSelector('#r-latpull-0'); await fill(page, '#w-latpull', 80); await fill(page, '#r-latpull-0', 10); await page.focus('#r-latpull-1');
    check('FB a main lift now rests 120 seconds', await txt(page, '#restTime') === '2:00');
    await fill(page, '#r-legraise-0', 10); await page.focus('#r-legraise-1');
    check('FB core stays at 60', await txt(page, '#restTime') === '1:00');
    const box = await page.evaluate(() => { const r = document.getElementById('rest').getBoundingClientRect(), s = document.getElementById('savebar').getBoundingClientRect(); return { above: r.bottom <= s.top + 1, inView: r.top >= 0 && r.right <= innerWidth && r.left >= 0 }; });
    check('FB it sits just above the save bar', box.above && box.inView, JSON.stringify(box));
    await page.click('[data-a="timer-x"]'); await page.click('h1'); await pickDate(page, '2026-11-20'); await page.waitForSelector('#r-shoulderpress-0');
    await fill(page, '#w-shoulderpress', 50); await fill(page, '#r-shoulderpress-0', 10); await page.focus('#r-shoulderpress-1');
    check('FB filling in a past day does not start a timer', await page.$eval('#rest', r => r.hidden));
  });

  // ---------- Feature C: protein in the Fuel score ----------
  await section('FC', async () => {
    await open({ me: 'jacquie', time: SAT, init: seed({ tysonBody: true }) });
    const sat = await ML(page, () => ({ f: window.MorningLaps.weekFacts('jacquie', '2026-11-16').scoring, fp: window.MorningLaps.fuelParts('jacquie', '2026-11-16'), s: window.MorningLaps.weekScore('jacquie', '2026-11-16') }));
    check('FC this week keeps the old rule: a day in the calorie range is a full Fuel day', sat.f === 1 && sat.fp.cal === 1 && sat.fp.unit === 1 && sat.s.fuel === 4, JSON.stringify(sat.fp));
    await go(page, 'compete');
    check('FC "How scoring stays fair" explains the protein rule and when it starts', (await txt(page, '#fairRules')).includes('From the week of Mon Nov 23: each day counts 0.7 for landing in your calorie range') && (await txt(page, '#fairRules')).includes('plus 0.3 for reaching at least 90% of your own protein target') && (await txt(page, '#fairRules')).includes('A quick add with no protein entered counts as 0 g'));
    await go(page, 'fuel'); await pickDate(page, '2026-11-16');
    check('FC the Fuel tab shows protein as a progress line', (await txt(page, '#protLine')).includes('100 of 105 g protein'), await txt(page, '#protLine'));
    const before = sat.s.total, next = await carry(page); await ctx.close();
    await open({ me: 'jacquie', time: MON, init: next });
    const lock = await kv(page, 'profiles/jacquie/weekgoals/2026-11-23'), tl = await kv(page, 'profiles/tyson/weekgoals/2026-11-23');
    check('FC Monday\'s locked week carries scoring version 2 for both of you', lock.scoring === 2 && tl.scoring === 2 && lock.protein === 105 && tl.protein > 100, JSON.stringify([lock.scoring, tl.scoring, lock.protein, tl.protein]));
    check('FC last week is untouched: same rule, same score', (await ML(page, () => window.MorningLaps.weekScore('jacquie', '2026-11-16').total)) === before && (await ML(page, () => window.MorningLaps.weekFacts('jacquie', '2026-11-16').scoring)) === 1);
    await go(page, 'fuel');
    const quick = async (kcal, p) => { await page.click('[data-a="food-add"][data-meal="d"]'); await page.waitForSelector('#foodQ'); await page.click('[data-a="food-quick"]'); await fill(page, '[data-ovf="kcal"]', kcal); if (p != null) await fill(page, '[data-ovf="p"]', p); await page.click('[data-a="quick-save"]'); await page.waitForSelector('#ov[hidden]', { state: 'attached' }); };
    await quick(1700);
    const d1 = await ML(page, () => ({ fp: window.MorningLaps.fuelParts('jacquie', '2026-11-23'), s: window.MorningLaps.weekScore('jacquie', '2026-11-23') }));
    check('FC in the calorie range with no protein entered: 0.7 of a day (a quick add counts as 0 g)', d1.fp.cal === 1 && d1.fp.prot === 0 && d1.fp.unit === 0.7 && Math.abs(d1.s.fuel - 2.8) < 1e-9, JSON.stringify(d1.fp) + ' fuel ' + d1.s.fuel);
    check('FC the protein line reads "0 of 105 g protein"', (await txt(page, '#protLine')).includes('0 of 105 g protein') && (await txt(page, '#protLine')).includes('Reaching 95 g'), await txt(page, '#protLine'));
    await quick(100, 77);
    await go(page, 'compete');
    const tip = await ML(page, () => { const t = window.MorningLaps.coach('jacquie').tips.find(x => x.group === 'protein'); return t ? { text: t.text, gain: t.gain } : null; });
    const tipRow = await txt(page, '.tip[data-tip="protein"]').catch(() => '');
    check('FC the coach has a protein tip with its point value', tip && tip.text === 'Eat 28 g more protein today' && tip.gain >= 1 && tipRow.includes('Eat 28 g more protein today') && tipRow.includes('+' + tip.gain), JSON.stringify(tip) + ' ' + tipRow);
    const s0 = (await score(page, 'jacquie')).total;
    await go(page, 'fuel'); await quick(0, 18);
    const d2 = await ML(page, () => ({ fp: window.MorningLaps.fuelParts('jacquie', '2026-11-23'), s: window.MorningLaps.weekScore('jacquie', '2026-11-23') }));
    check('FC reaching 90% of the target makes it a full Fuel day', d2.fp.prot === 1 && d2.fp.unit === 1 && d2.s.fuel === 4 && d2.s.total - s0 === tip.gain, JSON.stringify(d2.fp) + ' gained ' + (d2.s.total - s0));
    check('FC and the protein line reads "95 of 105 g protein"', (await txt(page, '#protLine')).includes('95 of 105 g protein') && (await txt(page, '#protLine')).includes('counts today'), await txt(page, '#protLine'));
    await switchTo(page, 'tyson'); await go(page, 'fuel'); await quick(2900, 10);
    const ty = await ML(page, () => ({ fp: window.MorningLaps.fuelParts('tyson', '2026-11-23'), g: window.MorningLaps.weekGoals('tyson', '2026-11-23') }));
    check('FC the same rule applies to Tyson, against his own target', ty.fp.cal === 1 && ty.fp.prot === 0 && ty.fp.unit === 0.7 && ty.g.protein === 168, JSON.stringify(ty.fp) + ' ' + ty.g.protein);
    await go(page, 'compete');
    check('FC from Monday the fair-scoring text states the rule as current', (await txt(page, '#fairRules')).includes('Fuel, 20 points. each day counts 0.7') === false && (await txt(page, '#fairRules')).includes('Fuel, 20 points. Each day counts 0.7'), (await txt(page, '#fairRules')).slice(300, 520));
  });

  // ---------- Ground rules, and a smoke test of every tab for both profiles ----------
  await section('G', async () => {
    const before = consoleErrors.length;
    await open({ me: 'tyson', time: SAT, init: seed() });
    await switchTo(page, 'jacquie'); await page.waitForTimeout(300); await switchTo(page, 'tyson'); await page.waitForTimeout(600); // each profile's badges are recorded on first open: let that finish
    const writes = await page.evaluate(() => { window.__w = 0; const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k) { if (k === 'ml.kv' || k === 'ml.sessions' || k === 'ml.settings') window.__w++; return set.apply(this, arguments); }; return true; });
    const bad = [];
    for (const who of ['tyson', 'jacquie']) { if (who === 'jacquie') await switchTo(page, 'jacquie');
      for (const tab of ['train', 'program', 'history', 'fuel', 'compete', 'me']) { await go(page, tab); const n = await page.evaluate(() => document.querySelectorAll('#main .card, #main .sheet').length); if (!n || /undefined|NaN|\[object/.test(await txt(page, '#main'))) bad.push(who + ':' + tab); } }
    await page.waitForTimeout(300);
    check('G smoke: every tab draws for both profiles, with nothing broken in the text', writes && bad.length === 0, bad.join(' '));
    check('G drawing the screens writes nothing to the store', await page.evaluate(() => window.__w === 0), 'writes: ' + (await page.evaluate(() => window.__w)));
    const res = await page.evaluate(() => { const k = JSON.parse(localStorage.getItem('ml.kv')); return [k['results/2026-11-02'], k['results/2026-11-09']]; });
    check('G finished weeks already stored are byte-for-byte unchanged', JSON.stringify(res) === JSON.stringify([FINALS['results/2026-11-02'], FINALS['results/2026-11-09']]));
    const old = await ML(page, () => { const M = window.MorningLaps, n = M.normalize({ kind: 'strength', day: 'push', ex: { chestpress: { w: 70, reps: [12, 0, 12] } }, treadmill: { minutes: 20 } }), a = M.normalize({ v: 2, kind: 'activity', acts: [{ id: 'x', a: 'walkeasy', min: 15, mv: true }] }), r = M.normalize({ v: 2, kind: 'rest' });
      return [n.kind, n.acts.length, n.minutes, a.kind, a.minutes, r.kind, M.weekGoals('tyson', '2026-11-02').goal, M.weekFacts('tyson', '2026-11-02').scoring]; });
    check('G old records read the same without the new fields', JSON.stringify(old) === JSON.stringify(['strength', 0, 26, 'activity', 15, 'rest', 5, 1]), JSON.stringify(old));
    check('G no console errors anywhere in this run', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
    void before;
  });
  await section('G2', async () => { // the same smoke on the first week of the new rules
    await open({ me: 'jacquie', time: WED, init: seed({ tysonBody: true }) });
    const bad = [];
    for (const who of ['jacquie', 'tyson']) { if (who === 'tyson') await switchTo(page, 'tyson');
      for (const tab of ['train', 'program', 'history', 'fuel', 'compete', 'me']) { await go(page, tab); if (/undefined|NaN|\[object/.test(await txt(page, '#main'))) bad.push(who + ':' + tab); } }
    check('G smoke on the first week of the new rules: every tab, both profiles', bad.length === 0, bad.join(' '));
    check('G no console errors there either', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  });

  await browser.close();
  process.exit(finish('version 12 checks') ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
