// Regression checks for the code-review fixes: writes before the log loads, old-day drafts, double taps,
// day rollover, the season tally, coach gains, calorie floors, plural food search, stale lead changes,
// open sections surviving a redraw, forms surviving a refused save, a dead connection, and odd stored values.
// Run: node tests/review.test.js  (see tests/helpers.js for the local server it expects)
const { chromium, check, T, newPage, val, txt, has, fill, go, score, fakeDb, finish } = require('./helpers');
const seen = page => page.evaluate(() => window.__seen.slice());
const kv = (page, path) => page.evaluate(p => (JSON.parse(localStorage.getItem('ml.kv') || '{}'))[p] || null, path);
const ML = (page, fn, arg) => page.evaluate(fn, arg);
const toastWith = (page, part) => page.waitForFunction(x => { const t = document.getElementById('toast'); return !t.hidden && t.textContent.includes(x) ? t.textContent : false; }, part, { timeout: 4000 }).then(h => h.jsonValue()).catch(() => txt(page, '#toast'));
const ready = page => page.waitForFunction(() => window.MorningLaps.state.ready && window.MorningLaps.state.storage === 'db');
// a page whose account store starts with `docs`; `pre` runs first (for example to slow the first snapshots)
const dbWith = (docs, pre) => (pre || '') + ';(' + fakeDb.toString() + ')();Object.assign(window.__store,' + JSON.stringify(docs || {}) + ');';
const lift = (date, day, ex, extra) => Object.assign({ v: 2, date, kind: 'strength', day, phase: 1, planned: Object.keys(ex), plannedBase: Object.keys(ex), swaps: {}, ex, qualifies: true, complete: true, treadmill: { minutes: 20, title: '' }, savedAt: date + 'T12:00:00Z' }, extra || {});
const PUSH = { chestpress: { w: 70, reps: [12, 12, 12] }, shoulderpress: { w: 50, reps: [10, 10, 10] } };
const walk = (date, min, more) => ({ v: 2, date, kind: 'activity', acts: [{ id: 'a1', a: 'walkeasy', name: 'Easy walk', min, feel: 'good', hurt: false, note: '', mv: true, at: date + 'T12:00:00Z' }].concat(more || []), savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' });
const SETTINGS = { startDate: '2026-11-02', goal: 5, maxed: {}, swaps: {} };
const both = { 'sessions/2026-11-02': lift('2026-11-02', 'push', PUSH), 'settings/program': SETTINGS, 'comp/settings': { start: '2026-11-02', stakes: '' } };

(async () => {
  const browser = await chromium.launch();
  let ctx, page;
  // one section failing or hanging is reported as a failed check, and the rest still run
  const section = async (tag, fn) => {
    try { await fn(); } catch (e) { check(tag + ' ran to the end', false, String(e && e.message || e).split('\n')[0]); }
    try { if (ctx) await ctx.close(); } catch (e) { /* already closed */ }
  };

  // ---------- R1: a draft for an old day is kept; a draft nobody touched for weeks is dropped ----------
  await section('R1', async () => {
    ({ ctx, page } = await newPage(browser, { me: 'tyson', init: 'if(!localStorage.getItem("seeded")){localStorage.setItem("seeded","1");' +
      'localStorage.setItem("ml.sessions",' + JSON.stringify(JSON.stringify({ '2026-10-13': lift('2026-10-13', 'push', PUSH) })) + ');' +
      'localStorage.setItem("ml.settings",' + JSON.stringify(JSON.stringify({ startDate: '2026-10-12', goal: 5, maxed: {}, swaps: {} })) + ');' +
      'localStorage.setItem("ml.drafts",' + JSON.stringify(JSON.stringify({ '2026-11-01': { kindSel: 'cardio', tm: { minutes: '11', title: '' }, notes: '', ex: {}, swaps: {}, extra: {}, countAs: null, closed: {}, created: 1, updatedAt: Date.parse('2026-10-01T12:00:00Z'), recovered: false, fromRecord: false } })) + ');}' }));
    await go(page, 'history'); await page.click('details[data-hdate="2026-10-13"] summary'); await page.click('[data-edit="2026-10-13"]'); await page.waitForSelector('#tmMin');
    await fill(page, '#tmMin', 33);
    await page.click('h1'); await fill(page, '#datePick', '2026-11-03'); await page.waitForFunction(() => window.MorningLaps.state.selDate === '2026-11-03');
    const d1 = await page.evaluate(() => JSON.parse(localStorage.getItem('ml.drafts') || '{}'));
    check('R1 an edit to a three-week-old day survives leaving that day', !!d1['2026-10-13'] && d1['2026-10-13'].tm.minutes === '33', JSON.stringify(Object.keys(d1)));
    check('R1 a draft untouched for a month is dropped', !d1['2026-11-01']);
    await page.reload(); await page.waitForSelector('#main .card');
    await go(page, 'history'); await page.click('details[data-hdate="2026-10-13"] summary'); await page.click('[data-edit="2026-10-13"]'); await page.waitForSelector('#tmMin');
    check('R1 the old-day edit is still there after a reload', await val(page, '#tmMin') === '33' && await val(page, '#w-chestpress') === '70');
    await page.click('#saveBtn'); await page.waitForFunction(() => JSON.parse(localStorage.getItem('ml.sessions'))['2026-10-13'].treadmill.minutes === 33);
    check('R1 saving it keeps the sets', await page.evaluate(() => { const r = JSON.parse(localStorage.getItem('ml.sessions'))['2026-10-13']; return r.ex.chestpress.reps.join() === '12,12,12' && r.ex.shoulderpress.w === 50; }));
    await ctx.close();
  });

  // ---------- R2: nothing is saved on top of a log that has not loaded yet ----------
  await section('R2', async () => {
    ({ ctx, page } = await newPage(browser, { me: 'tyson', init: dbWith({ 'sessions/2026-11-03': lift('2026-11-03', 'push', PUSH), 'settings/program': SETTINGS }, 'window.__snapDelay=2500') }));
    check('R2 the lifting log says it is loading and Save is off', (await txt(page, '#statusLine')).includes('Loading your log') && await page.$eval('#saveBtn', b => b.disabled));
    await fill(page, '#tmMin', 25);
    await page.evaluate(() => document.getElementById('logForm').requestSubmit());
    const t2 = await toastWith(page, 'Still loading');
    check('R2 saving before the log loads is refused, with a reason', t2.includes('Still loading') && await page.evaluate(() => window.__store['sessions/2026-11-03'].treadmill.minutes === 20), t2);
    await ready(page); await page.click('h1'); await page.waitForSelector('#w-chestpress');
    check('R2 once loaded, the early typing is merged with what was already saved', await val(page, '#tmMin') === '25' && await val(page, '#w-chestpress') === '70' && await val(page, '#r-chestpress-2') === '12');
    await page.click('#saveBtn'); await page.waitForFunction(() => window.__store['sessions/2026-11-03'].treadmill.minutes === 25);
    check('R2 saving then keeps every set that was on the account', await page.evaluate(() => { const r = window.__store['sessions/2026-11-03']; return r.ex.chestpress.reps.join() === '12,12,12' && r.ex.shoulderpress.reps.join() === '10,10,10'; }));
    await ctx.close();
    ({ ctx, page } = await newPage(browser, { me: 'jacquie', init: dbWith({ 'profiles/jacquie/sessions/2026-11-03': walk('2026-11-03', 15) }, 'window.__snapDelay=2500') }));
    await page.click('.act[data-k="walkdinner"]'); await page.waitForSelector('#actLog'); await page.click('#actLog');
    const t2b = await toastWith(page, 'Still loading');
    check('R2 an activity logged before the log loads is refused, not written over the day', t2b.includes('Still loading') && await page.evaluate(() => window.__store['profiles/jacquie/sessions/2026-11-03'].acts.length === 1), t2b);
    await ready(page); await page.click('#actLog'); await page.waitForSelector('#ov', { state: 'hidden' });
    await page.waitForFunction(() => window.__store['profiles/jacquie/sessions/2026-11-03'].acts.length === 2);
    check('R2 after loading, the same tap adds to the day and keeps the earlier walk', await page.evaluate(() => window.__store['profiles/jacquie/sessions/2026-11-03'].acts.map(a => a.a).join() === 'walkeasy,walkdinner'));
    await ctx.close();
  });

  // ---------- R3: an old-format lift day keeps its exercises when a default swap is set later ----------
  await section('R3', async () => {
    const legacy = { date: '2026-11-02', kind: 'strength', day: 'push', ex: { chestpress: { w: 70, reps: [12, 12, 12] }, shoulderpress: { w: 50, reps: [10, 10, 10] }, pushdown: { w: 40, reps: [12, 12, 12] } }, treadmill: { minutes: 20, title: '' }, savedAt: '2026-11-02T12:00:00Z' };
    ({ ctx, page } = await newPage(browser, { me: 'tyson', init: 'if(!localStorage.getItem("seeded")){localStorage.setItem("seeded","1");' +
      'localStorage.setItem("ml.sessions",' + JSON.stringify(JSON.stringify({ '2026-11-02': legacy })) + ');' +
      'localStorage.setItem("ml.settings",' + JSON.stringify(JSON.stringify({ startDate: '2026-11-02', goal: 5, maxed: {}, swaps: { chestpress: 'dbbench' } })) + ');}' }));
    await page.click('.datebar [data-date="2026-11-02"]'); await page.waitForSelector('#w-chestpress');
    check('R3 the saved exercise still shows, not its swap', await val(page, '#w-chestpress') === '70' && !(await has(page, '#w-dbbench')));
    await fill(page, '#tmMin', 22); await page.click('#saveBtn'); await page.waitForFunction(() => JSON.parse(localStorage.getItem('ml.sessions'))['2026-11-02'].treadmill.minutes === 22);
    check('R3 saving the day again keeps its chest press sets', await page.evaluate(() => { const r = JSON.parse(localStorage.getItem('ml.sessions'))['2026-11-02']; return !!r.ex.chestpress && r.ex.chestpress.reps.join() === '12,12,12' && !r.ex.dbbench; }));
    await page.click('.datebar [data-date="2026-11-03"]'); await page.waitForSelector('#logForm');
    await ctx.close();
  });

  // ---------- R4: a double tap saves once (water is the exception: two taps, two glasses) ----------
  await section('R4', async () => {
    ({ ctx, page } = await newPage(browser, { me: 'jacquie', init: dbWith({}) }));
    await ready(page);
    await page.click('.act[data-k="walkeasy"]'); await page.waitForSelector('#actLog');
    await page.evaluate(() => { const b = document.getElementById('actLog'); b.click(); b.click(); });
    await page.waitForSelector('#ov', { state: 'hidden' }); await page.waitForTimeout(150);
    check('R4 a double tap on Log makes one entry', await page.evaluate(() => window.__store['profiles/jacquie/sessions/2026-11-03'].acts.length === 1));
    await go(page, 'fuel'); await page.click('[data-a="food-add"][data-meal="b"]'); await page.waitForSelector('#foodQ'); await page.click('[data-a="food-quick"]'); await fill(page, '[data-ovf="kcal"]', 300);
    await page.evaluate(() => { const b = document.querySelector('[data-a="quick-save"]'); b.click(); b.click(); });
    await page.waitForSelector('#ov[hidden]', { state: 'attached' }); await page.waitForTimeout(150);
    check('R4 a double tap on Add makes one food entry', await page.evaluate(() => window.__store['profiles/jacquie/food/2026-11-03'].items.length === 1));
    await page.evaluate(() => { const b = document.querySelector('[data-a="water"][data-oz="8"]'); b.click(); b.click(); });
    await page.waitForFunction(() => window.__store['profiles/jacquie/food/2026-11-03'].water === 16, null, { timeout: 3000 }).catch(() => {});
    check('R4 two taps on a glass of water count as two glasses', await page.evaluate(() => window.__store['profiles/jacquie/food/2026-11-03'].water === 16 && window.__store['profiles/jacquie/food/2026-11-03'].items.length === 1));
    await page.click('[data-a="food-add"][data-meal="l"]'); await page.waitForSelector('#foodQ'); await page.click('[data-a="food-quick"]'); await fill(page, '[data-ovf="kcal"]', 200); await page.click('[data-a="quick-save"]');
    await page.waitForFunction(() => window.__store['profiles/jacquie/food/2026-11-03'].items.length === 2);
    check('R4 the next save still goes through', true);
    await ctx.close();
  });

  // ---------- R5: a profile and a custom food kept only in this browser are offered for import ----------
  await section('R5', async () => {
    ({ ctx, page } = await newPage(browser, { me: 'jacquie', init: 'localStorage.setItem("ml.kv",' + JSON.stringify(JSON.stringify({ 'profiles/jacquie': { name: 'Jac', skin: { preset: 'lilac' } }, 'foods/c1': { name: 'Trackside granola', serving: '1 bar', n: [190, 4, 28, 7, null, null, null, null, null, null, null, null, null, null], by: 'jacquie', createdAt: 'x' } })) + ');' + dbWith({}) }));
    await ready(page); await page.waitForSelector('#importBtn');
    check('R5 both browser-only entries are offered', (await txt(page, '#main')).includes('2 entries saved in this browser are not in your account'));
    await page.click('#importBtn'); await page.waitForFunction(() => !!window.__store['profiles/jacquie'] && !!window.__store['foods/c1']);
    check('R5 importing puts the profile and the food on the account', await page.evaluate(() => window.__store['profiles/jacquie'].name === 'Jac' && window.__store['foods/c1'].name === 'Trackside granola') && (await txt(page, '#whoBtn')).includes('Jac'));
    await ctx.close();
  });

  // ---------- R6: the day rolls over on a phone left open overnight ----------
  await section('R6', async () => {
    ({ ctx, page } = await newPage(browser, { me: 'jacquie' }));
    check('R6 starts on Tuesday', (await txt(page, '#todayLine')).includes('Nov 3'));
    await page.clock.fastForward('20:00:00'); // 03:00 Wednesday in Indianapolis
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForFunction(() => document.getElementById('todayLine').textContent.includes('Nov 4'), null, { timeout: 3000 }).catch(() => {});
    check('R6 coming back to the app moves today forward', (await txt(page, '#todayLine')).includes('Nov 4') && await page.evaluate(() => window.MorningLaps.state.selDate === '2026-11-04'), await txt(page, '#todayLine'));
    await page.click('.act[data-k="walkeasy"]'); await page.waitForSelector('#actLog'); await page.click('#actLog'); await page.waitForSelector('#ov', { state: 'hidden' });
    check('R6 the next activity is logged on the new day', !!(await kv(page, 'profiles/jacquie/sessions/2026-11-04')) && !(await kv(page, 'profiles/jacquie/sessions/2026-11-03')));
    await ctx.close();
    ({ ctx, page } = await newPage(browser, { me: 'jacquie' }));
    await page.click('.datebar [data-date="2026-11-02"]'); await page.waitForFunction(() => window.MorningLaps.state.selDate === '2026-11-02');
    await page.clock.fastForward('20:00:00'); await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    check('R6 a past day chosen on purpose stays chosen', await page.evaluate(() => window.MorningLaps.state.selDate === '2026-11-02') && (await txt(page, '#todayLine')).includes('Nov 4'));
    await ctx.close();
  });

  // ---------- R7: weeks before both of you had logged do not count in the season ----------
  await section('R7', async () => {
    ({ ctx, page } = await newPage(browser, { me: 'tyson', time: T('2026-11-09T12:00:00Z'), init: 'if(!localStorage.getItem("seeded")){localStorage.setItem("seeded","1");' +
      'localStorage.setItem("ml.sessions",' + JSON.stringify(JSON.stringify({ '2026-10-20': lift('2026-10-20', 'push', PUSH), '2026-10-27': lift('2026-10-27', 'push', PUSH), '2026-11-02': lift('2026-11-02', 'push', PUSH) })) + ');' +
      'localStorage.setItem("ml.settings",' + JSON.stringify(JSON.stringify({ startDate: '2026-10-19', goal: 5, maxed: {}, swaps: {} })) + ');' +
      'localStorage.setItem("ml.kv",' + JSON.stringify(JSON.stringify({ 'profiles/jacquie/sessions/2026-11-02': walk('2026-11-02', 15) })) + ');}' }));
    const wk = await page.evaluate(() => window.MorningLaps.compWeeks().filter(w => w.played).map(w => w.ws));
    check('R7 only the week both logged is in the season', wk.join() === '2026-11-02', wk.join());
    await go(page, 'compete');
    check('R7 solo weeks hand out no wins', (await txt(page, '#main')).includes('Tyson 0 – 1 Jacquie'), (await txt(page, '#main')).match(/Season.{0,60}/));
    await ctx.close();
  });

  // ---------- R8: the coach promises exactly what an action earns ----------
  await section('R8', async () => {
    ({ ctx, page } = await newPage(browser, { me: 'jacquie', init: 'if(!localStorage.getItem("seeded")){localStorage.setItem("seeded","1");' +
      'localStorage.setItem("ml.kv",' + JSON.stringify(JSON.stringify({ 'profiles/jacquie/sessions/2026-11-02': walk('2026-11-02', 15, [{ id: 'a2', a: 'chairyoga', name: 'Chair yoga', min: 15, feel: null, hurt: false, note: '', mv: true, at: 'x' }]) })) + ');}' }));
    const s0 = (await score(page, 'jacquie')).total, tip = await page.evaluate(() => { const t = window.MorningLaps.coach('jacquie').tips.find(x => x.group === 'move'); return t ? t.gain : null; });
    await page.click('.act[data-k="walkeasy"]'); await page.waitForSelector('#actLog'); await page.click('#actLog'); await page.waitForSelector('#ov', { state: 'hidden' });
    const s1 = (await score(page, 'jacquie')).total;
    check('R8 repeating an activity earns what the move tip said, with no variety bonus assumed', tip != null && s1 - s0 === tip, 'tip ' + tip + ', real ' + (s1 - s0));
    await ctx.close();
    ({ ctx, page } = await newPage(browser, { me: 'tyson' }));
    await go(page, 'fuel'); await page.click('[data-a="food-add"][data-meal="d"]'); await page.waitForSelector('#foodQ'); await page.click('[data-a="food-quick"]'); await fill(page, '[data-ovf="kcal"]', 4000); await page.click('[data-a="quick-save"]'); await page.waitForSelector('#ov[hidden]', { state: 'attached' });
    const c8 = await page.evaluate(() => { const c = window.MorningLaps.coach('tyson'), s = window.MorningLaps.weekScore('tyson'); return { fuelTip: c.tips.some(t => t.group === 'fuel'), max: c.max, fuel: s.fuel }; });
    check('R8 no "land in range" tip once today is already over the range', c8.fuelTip === false, JSON.stringify(c8));
    await ctx.close();
    ({ ctx, page } = await newPage(browser, { me: 'tyson', time: T('2026-11-08T17:00:00Z') })); // Sunday noon: today is the only day left
    await go(page, 'fuel'); await page.click('[data-a="food-add"][data-meal="d"]'); await page.waitForSelector('#foodQ'); await page.click('[data-a="food-quick"]'); await fill(page, '[data-ovf="kcal"]', 4000); await page.click('[data-a="quick-save"]'); await page.waitForSelector('#ov[hidden]', { state: 'attached' });
    const c8b = await page.evaluate(() => { const c = window.MorningLaps.coach('tyson'), s = window.MorningLaps.weekScore('tyson'); return { max: c.max, total: s.total, fuel: s.fuel }; });
    // lift day 12.67 + water 3 + personal best 5 + weekend 5 + the 2 already earned for logging food = 27.67
    check('R8 the best case does not count an over-range day as in range', c8b.fuel === 2 && c8b.max === 28, JSON.stringify(c8b));
    await ctx.close();
  });

  // ---------- R9: the counted calorie range never dips under the safe minimum ----------
  await section('R9', async () => {
    ({ ctx, page } = await newPage(browser, { me: 'jacquie', init: 'localStorage.setItem("ml.kv",' + JSON.stringify(JSON.stringify({
      'profiles/jacquie': { body: { sex: 'f', age: 65, heightIn: 60, weightLb: 110, activity: 'sed', pace: 'lose1' } },
      'profiles/tyson': { body: { sex: 'm', age: 26, heightIn: 74, weightLb: 240, activity: 'light', pace: 'maintain' } } })) + ');' }));
    const g9 = await page.evaluate(() => ({ j: window.MorningLaps.goalsFor('jacquie'), t: window.MorningLaps.goalsFor('tyson') }));
    check('R9 at the 1,200 minimum the range starts at 1,200', g9.j.kcal === 1200 && g9.j.lo === 1200, g9.j.kcal + ' / ' + g9.j.lo);
    check('R9 a higher target keeps its normal range', g9.t.kcal > 2500 && g9.t.lo === Math.round(g9.t.kcal * 0.8 / 10) * 10, g9.t.kcal + ' / ' + g9.t.lo);
    await go(page, 'me'); check('R9 the Me screen shows the floored range', (await txt(page, '#bodyCard')).includes('1,200–1,320'), (await txt(page, '#bodyCard')).slice(0, 120));
    await ctx.close();
  });

  // ---------- R10: plural searches find the food ----------
  await section('R10', async () => {
    ({ ctx, page } = await newPage(browser, { me: 'tyson' }));
    await page.evaluate(() => window.MorningLaps.loadFoods());
    const rank = q => page.evaluate(x => window.MorningLaps.searchFoods(x, 6).map(f => f.name), q);
    const fries = await rank('fries'), brownies = await rank('brownies'), berries = await rank('strawberries'), eggs = await rank('eggs'), tom = await rank('tomatoes');
    check('R10 "fries" finds fries', fries.length > 0 && fries.every(n => /fries|fried/i.test(n)) && /fries/i.test(fries[0]), fries.join(' | '));
    check('R10 "brownies" finds brownies', brownies.length > 0 && /brownie/i.test(brownies[0]), brownies.join(' | '));
    check('R10 "strawberries" finds strawberries', berries.length > 0 && /strawberr/i.test(berries[0]), berries.join(' | '));
    check('R10 "eggs" and "tomatoes" still work', eggs.length > 0 && /egg/i.test(eggs[0]) && tom.length > 0 && /tomato/i.test(tom[0]), eggs[0] + ' | ' + tom[0]);
    await ctx.close();
  });

  // ---------- R11: a lead change is judged from the moment of the tap, not from an old snapshot ----------
  await section('R11', async () => {
    ({ ctx, page } = await newPage(browser, { me: 'tyson', init: dbWith(both) }));
    await ready(page);
    check('R11 start: Tyson 18, Jacquie 0', (await score(page, 'tyson')).total === 18 && (await score(page, 'jacquie')).total === 0);
    await page.evaluate(d => window.__remoteSet('profiles/jacquie/sessions/2026-11-02', d), walk('2026-11-02', 15));
    await page.waitForFunction(() => document.getElementById('theirScore').textContent === '22');
    await fill(page, '#tmMin', 20); await page.click('#saveBtn'); await page.waitForFunction(() => !!window.__store['sessions/2026-11-03']);
    await page.waitForFunction(() => window.__seen.some(x => x.includes('takes the lead')), null, { timeout: 3000 }).catch(() => {});
    check('R11 passing a partner who scored from the other phone is celebrated', (await seen(page)).includes('Tyson takes the lead') && (await score(page, 'tyson')).total === 24, JSON.stringify(await seen(page)));
    await ctx.close();
    ({ ctx, page } = await newPage(browser, { me: 'tyson', init: dbWith(Object.assign({ 'profiles/jacquie/sessions/2026-11-02': walk('2026-11-02', 15) }, both)) }));
    await ready(page);
    await page.evaluate(d => window.__remoteSet('profiles/jacquie/sessions/2026-11-02', d), walk('2026-11-02', 5));
    await page.waitForFunction(() => document.getElementById('theirScore').textContent === '5');
    await go(page, 'fuel'); await page.click('[data-a="water"][data-oz="32"]'); await page.waitForFunction(() => !!window.__store['profiles/tyson/food/2026-11-03']);
    await page.waitForTimeout(300);
    check('R11 a lead that changed on the other phone is not announced as yours', !(await seen(page)).some(x => x.includes('takes the lead')), JSON.stringify(await seen(page)));
    await ctx.close();
  });

  // ---------- R12: an open section stays open when the other phone saves ----------
  await section('R12', async () => {
    ({ ctx, page } = await newPage(browser, { me: 'tyson', init: dbWith(both) }));
    await ready(page); await go(page, 'history');
    await page.click('details[data-hdate="2026-11-02"] summary');
    check('R12 history entry opens', await page.$eval('details[data-hdate="2026-11-02"]', d => d.open));
    await page.evaluate(d => window.__remoteSet('profiles/jacquie/sessions/2026-11-03', d), walk('2026-11-03', 15));
    await page.waitForFunction(() => document.getElementById('theirScore').textContent === '22');
    check('R12 it is still open after a save from the other phone', await page.$eval('details[data-hdate="2026-11-02"]', d => d.open));
    await go(page, 'compete'); await page.click('details[data-dk="fair"] summary');
    await page.evaluate(() => window.__remoteSet('profiles/jacquie/food/2026-11-03', { v: 1, date: '2026-11-03', items: [], water: 80 }));
    await page.waitForFunction(() => document.getElementById('theirScore').textContent === '25');
    check('R12 the scoring rules stay open too', await page.$eval('details[data-dk="fair"]', d => d.open));
    await go(page, 'history');
    check('R12 leaving the tab and coming back starts folded', !(await page.$eval('details[data-hdate="2026-11-02"]', d => d.open)));
    await ctx.close();
  });

  // ---------- R13: a refused save keeps what was typed ----------
  await section('R13', async () => {
    ({ ctx, page } = await newPage(browser, { me: 'tyson', init: dbWith(both) }));
    await ready(page); await go(page, 'me');
    await fill(page, '[data-form="body"][data-k="age"]', 30); await fill(page, '[data-form="body"][data-k="lb"]', 238);
    await page.evaluate(() => { window.__failSet = true; });
    await page.click('[data-a="body-save"]'); const t13 = await toastWith(page, 'Could not save');
    check('R13 a refused targets save keeps the typed numbers', t13.includes('Could not save') && await val(page, '[data-form="body"][data-k="age"]') === '30' && await val(page, '[data-form="body"][data-k="lb"]') === '238', t13);
    await page.evaluate(() => { window.__failSet = false; });
    await page.click('[data-a="body-save"]'); await page.waitForFunction(() => { const d = window.__store['profiles/tyson']; return !!(d && d.body && d.body.age === 30); });
    check('R13 trying again saves them', await page.evaluate(() => window.__store['profiles/tyson'].body.weightLb === 238));
    await go(page, 'compete'); await page.click('[data-a="stakes-edit"]'); await fill(page, '#stakesIn', 'Loser washes the car');
    await page.evaluate(() => { window.__failSet = true; });
    await page.click('[data-a="stakes-save"]'); await toastWith(page, 'Could not save');
    check('R13 a refused stakes save keeps the text in the box', await has(page, '#stakesIn') && await val(page, '#stakesIn') === 'Loser washes the car');
    await ctx.close();
  });

  // ---------- R14: a connection that dies after loading stops saves instead of losing them quietly ----------
  await section('R14', async () => {
    ({ ctx, page } = await newPage(browser, { me: 'tyson', init: dbWith(both) }));
    await ready(page);
    await page.evaluate(() => window.__failListen());
    await page.waitForFunction(() => window.MorningLaps.state.storage === 'nodb');
    check('R14 the page says nothing can be saved', (await txt(page, '#main')).includes('nothing can be saved') && (await txt(page, '#statusLine')).includes('Log unreachable'));
    await go(page, 'fuel'); await page.click('[data-a="water"][data-oz="8"]'); const t14 = await toastWith(page, 'cannot be reached');
    check('R14 a tap is refused with a reason and nothing is written', t14.includes('nothing was saved') && await page.evaluate(() => !window.__store['profiles/tyson/food/2026-11-03']) && await txt(page, '#waterNow') === '0', t14);
    await ctx.close();
  });

  // ---------- R15: odd text and odd stored values do not break the page ----------
  await section('R15', async () => {
    ({ ctx, page } = await newPage(browser, { me: 'tyson', init: 'if(!localStorage.getItem("seeded")){localStorage.setItem("seeded","1");' +
      'localStorage.setItem("ml.sessions",' + JSON.stringify(JSON.stringify({ '2026-11-02': lift('2026-11-02', 'push', PUSH, { phase: '9<b id="xss">x</b>' }) })) + ');' +
      'localStorage.setItem("ml.settings",' + JSON.stringify(JSON.stringify({ startDate: 'not-a-date', goal: 5, maxed: {}, swaps: {} })) + ');' +
      'localStorage.setItem("ml.kv",' + JSON.stringify(JSON.stringify({ 'profiles/tyson': { weighIns: { '2026-11-01': 'heavy', '2026-11-02': 200, 'junk': 5 } } })) + ');}' }));
    const hp = await page.evaluate(() => { try { const r = window.MorningLaps.parseHealthPaste('constructor: 5\ntoString: 9\nsteps: 100'); return { steps: r.vals.steps, keys: Object.keys(r.vals).join(), unknown: r.unknown.length }; } catch (e) { return { err: String(e) }; } });
    check('R15 a pasted line named like a built-in is skipped, not crashed on', hp.steps === 100 && hp.keys === 'steps' && hp.unknown === 2, JSON.stringify(hp));
    await page.click('.datebar [data-date="2026-11-02"]'); await page.waitForSelector('#w-chestpress');
    check('R15 a damaged phase value is not written into the page', !(await has(page, '#xss')) && /Phase [123]/.test(await txt(page, '.status')));
    await go(page, 'history'); await go(page, 'program');
    check('R15 a damaged start date does not break the program', !(await has(page, '#xss')) && !(await txt(page, '#main')).includes('NaN') && !(await txt(page, '#main')).includes('Invalid'));
    await go(page, 'me');
    check('R15 a damaged weigh-in is ignored', !(await txt(page, '#main')).includes('NaN') && !(await txt(page, '#main')).includes('heavy') && (await txt(page, '#main')).includes('200 lb'));
    await ctx.close();
  });

  await browser.close();
  process.exit(finish('review fixes') ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
