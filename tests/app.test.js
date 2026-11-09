// Profiles, looks, pick-your-own logging, nutrition, competition, badges, storage paths, layouts.
// Run: node tests/app.test.js  (see tests/helpers.js for the local server it expects)
const { chromium, check, T, newPage, val, txt, has, fill, toastText, go, cssVar, score, overflow, fakeDb, finish } = require('./helpers');
const SHOTS = process.env.ML_SHOTS ? process.env.ML_SHOTS + '/' : null;
const shot = (page, name, full) => SHOTS ? page.screenshot({ path: SHOTS + name, fullPage: !!full }) : Promise.resolve();
const seen = page => page.evaluate(() => window.__seen.slice());
const kv = (page, path) => page.evaluate(p => (JSON.parse(localStorage.getItem('ml.kv') || '{}'))[p] || null, path);
const pickDate = (page, d) => page.click('.datebar [data-date="' + d + '"]');
const switchTo = async (page, pid) => { await page.click('#whoBtn'); await page.click('[data-a="who-pick"][data-pid="' + pid + '"]'); await page.waitForFunction(p => window.MorningLaps.state.pid === p && document.getElementById('ov').hidden, pid); };
// wait for a toast containing `part` (an older toast may still be on screen); returns its text, or what is showing on timeout
const toastWith = (page, part) => page.waitForFunction(x => { const t = document.getElementById('toast'); return !t.hidden && t.textContent.includes(x) ? t.textContent : false; }, part, { timeout: 4000 }).then(h => h.jsonValue()).catch(() => txt(page, '#toast'));
const logAct = async (page, k, opts = {}) => {
  await page.click('.act[data-k="' + k + '"]'); await page.waitForSelector('#actLog');
  if (opts.min != null) await fill(page, '#actMin', opts.min);
  await page.click('#actLog'); await page.waitForSelector('#ov', { state: 'hidden' });
};

(async () => {
  const browser = await chromium.launch();
  let ctx, page;

  // ---------- E: profiles and looks ----------
  ({ ctx, page } = await newPage(browser, { me: null }));
  check('E chooser shows on a new phone', (await txt(page, '#ov')).includes('Who is logging?'));
  await page.keyboard.press('Escape');
  check('E chooser cannot be dismissed without a pick', !(await page.$eval('#ov', e => e.hidden)));
  await shot(page, 'who.png');
  await page.click('[data-a="who-pick"][data-pid="jacquie"]'); await page.waitForSelector('.acts');
  check('E header shows Jacquie', (await txt(page, '#whoBtn')).includes('Jacquie'));
  check('E Jacquie defaults to pink', await cssVar(page, '--ah') === '334');
  check('E Jacquie gets the pick-your-own screen', await has(page, '.act[data-k="walkeasy"]') && !(await has(page, '#kindSeg')));
  await page.reload(); await page.waitForSelector('.acts');
  check('E phone remembers the profile', (await txt(page, '#whoBtn')).includes('Jacquie') && await page.$eval('#ov', e => e.hidden));
  await go(page, 'me');
  await page.click('[data-a="skin-preset"][data-v="ocean"]'); await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--ah').trim() === '206');
  check('E preset color applies', await cssVar(page, '--ah') === '206');
  await switchTo(page, 'tyson');
  check('E Tyson keeps his own look', await cssVar(page, '--ah') === '3' && (await txt(page, '#whoBtn')).includes('Tyson'));
  check('E Tyson gets the lifting log', (await go(page, 'train'), await has(page, '#kindSeg')));
  await switchTo(page, 'jacquie');
  check('E look follows the profile back', await cssVar(page, '--ah') === '206');
  await go(page, 'me');
  await page.$eval('#skinColor', el => { el.value = '#22aa66'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--ah').trim() === '150');
  check('E custom color applies and saves', (await kv(page, 'profiles/jacquie')).skin.custom === '#22aa66');
  await page.click('[data-a="skin-preset"][data-v="peony"]'); await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--ah').trim() === '334');
  await page.click('[data-a="skin-set"][data-k="font"][data-v="soft"]'); await page.waitForFunction(() => document.documentElement.dataset.font === 'soft');
  check('E heading style applies and its font is requested', await has(page, 'link#font-soft'));
  await page.click('[data-a="skin-set"][data-k="shape"][data-v="round"]'); await page.click('[data-a="skin-set"][data-k="backdrop"][data-v="dots"]'); await page.click('[data-a="skin-set"][data-k="fx"][data-v="hearts"]');
  await page.waitForFunction(() => document.documentElement.dataset.backdrop === 'dots');
  check('E corners and backdrop apply', await page.evaluate(() => document.documentElement.dataset.shape === 'round' && document.documentElement.dataset.backdrop === 'dots'));
  await page.click('[data-a="avatar-set"][data-v="🌸"]'); await page.waitForFunction(() => document.getElementById('whoBtn').textContent.includes('🌸'));
  await fill(page, '[data-form="name"]', 'Jacq'); await page.click('[data-a="name-save"]'); await page.waitForFunction(() => document.getElementById('whoBtn').textContent.includes('Jacq'));
  check('E name and avatar show in the header', (await txt(page, '#whoBtn')).includes('🌸') && (await txt(page, '#whoBtn')).includes('Jacq'));
  await shot(page, 'me-pink.png', true);
  await page.reload(); await page.waitForSelector('#main .card');
  const prof = await kv(page, 'profiles/jacquie');
  check('E look persists across reload', await cssVar(page, '--ah') === '334' && await page.evaluate(() => document.documentElement.dataset.font === 'soft') && prof.skin.fx === 'hearts' && prof.name === 'Jacq');
  check('E other profile untouched', (await kv(page, 'profiles/tyson')) === null);
  await ctx.close();

  // ---------- F: pick-your-own logging ----------
  ({ ctx, page } = await newPage(browser, { me: 'jacquie' }));
  await page.click('.act[data-k="walkeasy"]'); await page.waitForSelector('#actLog');
  check('F activity sheet opens with default minutes', await val(page, '#actMin') === '15' && (await txt(page, '#actLog')) === 'Log 15 min');
  await shot(page, 'act-sheet.png');
  await page.click('#actLog'); const t1 = await toastWith(page, 'easy walk logged');
  check('F toast names the activity and the points', t1.includes('15 min of easy walk logged') && t1.includes('+22 pts'), t1);
  check('F counts as an active day', (await txt(page, '#statusLine')).includes('counts as an active day') && await txt(page, '#actCount') === '1/3' && await txt(page, '#minCount') === '15');
  check('F score is a third of Move plus personal best', (await score(page, 'jacquie')).total === 22);
  check('F first badge celebrated', (await seen(page)).includes('Green Flag'), JSON.stringify(await seen(page)));
  const rec1 = await kv(page, 'profiles/jacquie/sessions/2026-11-03');
  check('F stored under Jacquie, not in Tyson\'s log', rec1 && rec1.kind === 'activity' && rec1.acts.length === 1 && rec1.acts[0].min === 15 && await page.evaluate(() => !localStorage.getItem('ml.sessions') || localStorage.getItem('ml.sessions') === '{}'));
  await page.click('[data-a="act-edit"]'); await page.waitForSelector('#actLog');
  await page.click('[data-a="act-min"][data-d="5"]'); check('F stepper adds five', await val(page, '#actMin') === '20');
  await page.click('[data-a="act-feel"][data-v="good"]'); await page.click('#actLog'); await page.waitForSelector('#ov', { state: 'hidden' });
  check('F edit replaces the entry, no duplicate', (await kv(page, 'profiles/jacquie/sessions/2026-11-03')).acts.length === 1 && (await txt(page, '.done-list')).includes('20 min · Just right'));
  await pickDate(page, '2026-11-02'); await logAct(page, 'stretchwake');
  check('F five minutes is logged but not yet a day', (await txt(page, '#statusLine')).includes('5 more min of movement to count') && await txt(page, '#actCount') === '1/3');
  await logAct(page, 'necksh');
  check('F two short sessions add up to a day', (await txt(page, '#statusLine')).includes('counts as an active day') && await txt(page, '#actCount') === '2/3');
  check('F three kinds earns variety', (await score(page, 'jacquie')).total === 43, JSON.stringify(await score(page, 'jacquie')));
  await pickDate(page, '2026-11-03'); await logAct(page, 'breathe');
  check('F recovery logs without adding active minutes', await txt(page, '#minCount') === '30' && (await txt(page, '.done-list')).includes('recovery'));
  await page.click('[data-a="filter-quick"]');
  check('F quick filter hides long activities', !(await has(page, '.act[data-k="walkpark"]')) && await has(page, '.act[data-k="walkdinner"]'));
  await page.click('[data-a="filter-quick"]');
  await page.click('.act[data-k="walkpair"]'); await page.waitForSelector('#actLog'); await page.click('[data-a="act-fav"]'); await page.waitForSelector('[data-a="act-fav"].on'); await page.click('[data-a="ov-close"]');
  await page.click('[data-a="filter-fav"]');
  check('F favorites filter', (await page.$$('.act')).length === 1 && await has(page, '.act[data-k="walkpair"].fav'));
  await page.click('[data-a="filter-fav"]');
  await page.click('[data-a="surprise"]'); await page.waitForSelector('#actLog');
  check('F surprise me opens a suggestion', await has(page, '#actLog')); await page.click('[data-a="ov-close"]');
  await go(page, 'program');
  check('F plan tab explains the goal', (await txt(page, '#main')).includes('Move 3 days a week'));
  await page.click('[data-a="protect"][data-k="knee"]'); await page.waitForSelector('[data-a="protect"][data-k="knee"].on');
  await go(page, 'train');
  check('F protected area is flagged on activities that load it', (await txt(page, '.act[data-k="walkbrisk"] .aw')).includes('knees') && !(await has(page, '.act[data-k="walkeasy"] .aw')));
  const order = await page.$$eval('.act', els => els.map(e => e.dataset.k));
  check('F flagged activities sort below safe ones', order.indexOf('walkbrisk') > order.indexOf('recbike'), order.join(','));
  await pickDate(page, '2026-11-01'); await page.click('[data-a="rest"]'); await page.waitForFunction(() => document.getElementById('statusLine').textContent.includes('Rest day logged'));
  check('F rest day logs, earns its badge, adds no active day', (await seen(page)).includes('Smart Rest') && await txt(page, '#actCount') === '2/3');
  await go(page, 'history'); await page.click('details.hi[data-hdate="2026-11-03"] summary');
  const h3 = await txt(page, 'details.hi[data-hdate="2026-11-03"]');
  check('F history shows what was done', h3.includes('Easy walk') && h3.includes('20 min · Just right') && h3.includes('active day'), h3);
  check('F by-activity summary', (await txt(page, '#main')).includes('By activity'));
  await go(page, 'program'); await page.click('[data-a="move-goal"][data-v="2"]'); await page.waitForFunction(() => document.getElementById('actCount').textContent === '2/2');
  check('F lowering the goal fills Move', (await score(page, 'jacquie')).move === 50 && (await score(page, 'jacquie')).total === 60);
  await go(page, 'me');
  check('F badges tally on Me', /^\d+ of \d+$/.test(await txt(page, '#badgeCount')) && Number((await txt(page, '#badgeCount')).split(' ')[0]) >= 3, await txt(page, '#badgeCount'));
  check('F earned badges are recorded on the profile', !!((await kv(page, 'profiles/jacquie')).badges || {}).goal, JSON.stringify((await kv(page, 'profiles/jacquie')).badges));
  await go(page, 'program'); await page.click('[data-a="move-goal"][data-v="7"]'); await page.waitForFunction(() => document.getElementById('actCount').textContent === '2/7'); await go(page, 'me');
  check('F raising the goal later does not take a badge away', await has(page, '.badge[data-id="goal"]:not(.locked)') && (await score(page, 'jacquie')).move < 50);
  await page.evaluate(() => { window.__keepOv = true; }); await page.click('.badge[data-id="green"]'); await page.waitForSelector('#ov.center');
  check('F badge detail opens', (await txt(page, '#ov')).includes('Green Flag') && (await txt(page, '#ov')).includes('Earned'));
  await shot(page, 'badge-info.png'); await page.click('[data-a="ov-close"]');
  await ctx.close();

  // ---------- G: nutrition ----------
  ({ ctx, page } = await newPage(browser, { me: 'tyson' }));
  await go(page, 'fuel');
  check('G placeholder targets are labelled', (await txt(page, '#main')).includes('placeholders') && await txt(page, '#kcalLeft') === '2,000');
  await page.click('[data-a="go-body"]'); await page.waitForSelector('#bodyCard');
  await page.click('[data-a="form-set"][data-k="sex"][data-v="m"]');
  await fill(page, '[data-form="body"][data-k="age"]', 30); await fill(page, '[data-form="body"][data-k="lb"]', 200); await fill(page, '[data-form="body"][data-k="ft"]', 5); await fill(page, '[data-form="body"][data-k="inch"]', 10);
  await page.selectOption('[data-form="body"][data-k="pace"]', 'lose1');
  check('G half-filled form survives a re-render', await val(page, '[data-form="body"][data-k="age"]') === '30' && await val(page, '[data-form="body"][data-k="lb"]') === '200');
  await page.click('[data-a="body-save"]'); const tg = await toastWith(page, 'Targets set');
  check('G calorie estimate: Mifflin-St Jeor, light activity, minus 500', tg.includes('2,080 calories') && await txt(page, '#tKcal') === '2,080', tg);
  check('G water: men\'s guideline of 104 oz beats half body weight', tg.includes('104 oz') && await txt(page, '#tWater') === '104 oz');
  check('G explanation names the method', (await txt(page, '#bodyCard')).includes('Mifflin-St Jeor') && (await txt(page, '#bodyCard')).includes('National Academies'));
  check('G weight saved as a weigh-in', (await kv(page, 'profiles/tyson')).weighIns['2026-11-03'] === 200);
  await fill(page, '[data-form="body"][data-k="age"]', 12); await page.click('[data-a="body-save"]');
  check('G under-18 age rejected', (await toastWith(page, 'adults')).includes('adults')); await fill(page, '[data-form="body"][data-k="age"]', 30);
  await go(page, 'fuel');
  await page.click('[data-a="food-add"][data-meal="l"]'); await page.waitForSelector('#foodQ');
  await page.waitForFunction(() => document.getElementById('foodRes').textContent.includes('Type to search'), null, { timeout: 15000 });
  const count = await page.evaluate(() => window.MorningLaps.foodCount());
  check('G thousands of foods loaded', count > 12000, 'foods: ' + count);
  const long = await page.evaluate(() => window.MorningLaps.searchFoods('skin not eaten', 500).length);
  check('G long names are not dropped from results', long > 50, 'matches: ' + long);
  await fill(page, '#foodQ', 'banana'); await page.waitForSelector('.results .fooditem');
  const firsts = await page.$$eval('.results .fooditem .fn', els => els.slice(0, 5).map(e => e.textContent));
  check('G search ranks the plain food first', firsts[0] === 'Banana, raw', firsts.join(' | '));
  await shot(page, 'food-search.png');
  const rank = async q => page.evaluate(x => window.MorningLaps.searchFoods(x, 5).map(f => f.name), q);
  check('G search: chicken breast', (await rank('chicken breast'))[0].toLowerCase().startsWith('chicken breast'), (await rank('chicken breast')).join(' | '));
  check('G search: brand item', (await rank('big mac')).some(n => /big mac/i.test(n)));
  check('G search: plural and word order', (await rank('eggs scrambled')).some(n => /egg.*scrambled/i.test(n)) && (await rank('tomatoes')).some(n => /^tomato/i.test(n)));
  await page.click('.results .fooditem:has-text("Banana, raw")'); await page.waitForSelector('#factsBox .facts');
  check('G facts label for one banana', (await txt(page, '#factsBox .cal b')) === '122' && (await txt(page, '#factsBox')).includes('Potassium'));
  await fill(page, '#fQty', 2);
  check('G quantity scales the label and the button', (await txt(page, '#factsBox .cal b')) === '244' && (await txt(page, '#foodAdd')) === 'Add to Lunch · 244 cal');
  await shot(page, 'food-item.png');
  await page.click('#foodAdd'); await page.waitForSelector('#ov', { state: 'hidden' });
  check('G item lands in Lunch and the ring updates', (await txt(page, '.meal:nth-child(2)')).includes('Banana, raw') && await txt(page, '#kcalLeft') === '1,836');
  await page.click('[data-a="food-add"][data-meal="d"]'); await page.waitForSelector('#foodQ'); await page.click('[data-a="food-quick"]'); await page.waitForSelector('[data-ovf="kcal"]');
  await page.click('[data-a="quick-save"]'); check('G quick add needs calories', (await toastWith(page, 'Enter the calories')).includes('Enter the calories'));
  await fill(page, '[data-ovf="name"]', 'Chili night'); await fill(page, '[data-ovf="kcal"]', 1500); await page.click('[data-a="quick-save"]'); await page.waitForSelector('#ov', { state: 'hidden' });
  check('G day inside the range is marked and scored', (await txt(page, '#main')).includes('in range') && (await score(page, 'tyson')).fuel === 4);
  await page.click('[data-a="food-add"][data-meal="s"]'); await page.waitForSelector('#foodQ'); await fill(page, '#foodQ', 'zzbar'); await page.click('[data-a="food-custom"]'); await page.waitForSelector('[data-a="custom-save"]');
  check('G create-a-food starts from the search text', await val(page, '[data-ovf="name"]') === 'zzbar');
  await fill(page, '[data-ovf="kcal"]', 200); await fill(page, '[data-ovf="p"]', 20); await page.click('[data-a="custom-save"]'); await page.waitForSelector('#foodAdd');
  check('G own food opens ready to add', (await txt(page, '#foodAdd')) === 'Add to Snacks · 200 cal'); await page.click('#foodAdd'); await page.waitForSelector('#ov', { state: 'hidden' });
  check('G own food is searchable afterwards', (await rank('zzbar'))[0] === 'zzbar');
  check('G totals after three items, still in range', (await score(page, 'tyson')).fuel === 4 && await txt(page, '#kcalLeft') === '136');
  await page.click('.fooditem:has-text("Banana, raw")'); await page.waitForSelector('#foodAdd'); await fill(page, '#fQty', 1); await page.click('#foodAdd'); await page.waitForSelector('#ov', { state: 'hidden' });
  check('G editing an item rescales it in place', await txt(page, '#kcalLeft') === '258' && (await kv(page, 'profiles/tyson/food/2026-11-03')).items.length === 3);
  await page.click('.fooditem:has-text("zzbar")'); await page.waitForSelector('[data-a="food-del"]'); await page.click('[data-a="food-del"]'); await page.waitForSelector('#ov', { state: 'hidden' });
  check('G removing an item', (await kv(page, 'profiles/tyson/food/2026-11-03')).items.length === 2 && await txt(page, '#kcalLeft') === '458');
  check('G whole-day facts available', await has(page, 'details .facts'));
  for (const oz of ['32', '32', '32']) await page.click('[data-a="water"][data-oz="' + oz + '"]');
  check('G water adds up', await txt(page, '#waterNow') === '96');
  await page.click('[data-a="water"][data-oz="8"]'); const tw = await toastWith(page, 'Water goal reached');
  check('G reaching the water goal is called out', tw.includes('Water goal reached: 104 oz'), tw);
  check('G water goal scores a fifth of Water', (await score(page, 'tyson')).water === 3 && (await seen(page)).includes('First Fill'));
  await page.click('[data-a="water"][data-oz="-8"]'); check('G water can be corrected', await txt(page, '#waterNow') === '96');
  await page.click('[data-a="food-add"][data-meal="b"]'); await page.waitForSelector('#foodRes .fooditem');
  check('G recent foods offered for one-tap re-add', (await txt(page, '#foodRes')).includes('Recent') && (await txt(page, '#foodRes')).includes('Banana, raw'));
  await page.click('#foodRes .fooditem:has-text("Banana, raw")'); await page.waitForSelector('#ov', { state: 'hidden' });
  check('G re-add lands in the chosen meal', (await txt(page, '.meal:nth-child(1)')).includes('Banana, raw'));
  await shot(page, 'fuel-day.png', true);
  await switchTo(page, 'jacquie'); await go(page, 'me');
  await page.click('[data-a="form-set"][data-k="sex"][data-v="f"]');
  await fill(page, '[data-form="body"][data-k="age"]', 45); await fill(page, '[data-form="body"][data-k="lb"]', 150); await fill(page, '[data-form="body"][data-k="ft"]', 5); await fill(page, '[data-form="body"][data-k="inch"]', 4);
  await page.selectOption('[data-form="body"][data-k="activity"]', 'sed'); await page.selectOption('[data-form="body"][data-k="pace"]', 'lose1');
  await page.click('[data-a="body-save"]'); const tf = await toastWith(page, '1,200 calories');
  check('G women\'s floor of 1,200 holds; water rises to half body weight', tf.includes('1,200 calories') && tf.includes('76 oz') && (await txt(page, '#bodyCard')).includes('1,200 calorie minimum'), tf);
  await fill(page, '[data-form="body"][data-k="dkcal"]', 1500); await fill(page, '[data-form="body"][data-k="dwater"]', 64); await page.click('[data-a="body-save"]'); const td = await toastWith(page, '1,500 calories');
  check('G doctor\'s numbers replace the estimate', td.includes('1,500 calories') && td.includes('64 oz') && (await txt(page, '#bodyCard')).includes('from your doctor'), td);
  check('G each profile keeps its own targets', (await page.evaluate(() => window.MorningLaps.goalsFor('tyson').kcal)) === 2080);
  await fill(page, '[data-form="weigh"][data-k="lb"]', 148.5); await page.click('[data-a="weigh-save"]'); await toastWith(page, 'Weigh-in logged');
  check('G weigh-in logged', (await kv(page, 'profiles/jacquie')).weighIns['2026-11-03'] === 148.5);
  await ctx.close();

  // ---------- H: competition ----------
  const seedComp = () => {
    if (localStorage.getItem('seeded')) return; localStorage.setItem('seeded', '1');
    const mk = (date, day, ex) => ({ v: 2, date, kind: 'strength', day, phase: 1, planned: Object.keys(ex), plannedBase: Object.keys(ex), swaps: {}, ex, qualifies: true, complete: true, treadmill: { minutes: 20, title: '' }, savedAt: date + 'T12:00:00Z' });
    localStorage.setItem('ml.sessions', JSON.stringify({ '2026-11-02': mk('2026-11-02', 'push', { chestpress: { w: 70, reps: [12, 12, 12] }, shoulderpress: { w: 50, reps: [10, 10, 10] } }) }));
    localStorage.setItem('ml.settings', JSON.stringify({ startDate: '2026-11-02', goal: 5, maxed: {}, swaps: {} }));
    localStorage.setItem('ml.kv', JSON.stringify({
      'profiles/jacquie/sessions/2026-11-02': { v: 2, date: '2026-11-02', kind: 'activity', acts: [{ id: 'a1', a: 'walkeasy', name: 'Easy walk', min: 15, feel: 'good', hurt: false, note: '', mv: true, at: '2026-11-02T12:00:00Z' }], savedAt: '2026-11-02T12:00:00Z', updatedAt: '2026-11-02T12:00:00Z' },
      'comp/settings': { start: '2026-11-02', stakes: '' }
    }));
  };
  ({ ctx, page } = await newPage(browser, { me: 'tyson', init: seedComp }));
  check('H one lift day against a five-day goal scores 18', (await score(page, 'tyson')).total === 18, JSON.stringify(await score(page, 'tyson')));
  check('H one walk against a three-day goal scores 22', (await score(page, 'jacquie')).total === 22);
  check('H header strip shows both scores', await txt(page, '#myScore') === '18' && await txt(page, '#theirScore') === '22');
  await go(page, 'compete');
  check('H lead line', (await txt(page, '#leadLine')).includes('Jacquie leads by 4'));
  check('H race lanes drawn for both', (await page.$$('.lane')).length === 2 && await page.$eval('.lane', e => e.style.getPropertyValue('--p') === '0.180'));
  const tips = await page.$$eval('.tip', els => els.map(e => e.textContent));
  check('H coach lists a lift day worth 17', tips.some(x => x.includes('Log your Pull lift day') && x.includes('+17')), tips.join(' | '));
  check('H coach lists water and food', tips.some(x => x.includes('more oz of water') && x.includes('+3')) && tips.some(x => x.includes('land in range') && x.includes('+4')));
  check('H plan to pass is spelled out', (await txt(page, '#planLine')).includes('To pass Jacquie today: log your Pull lift day') && (await txt(page, '#planLine')).includes('35 to 22'), await txt(page, '#planLine'));
  await shot(page, 'compete.png', true);
  await page.click('[data-a="stakes-edit"]'); await fill(page, '#stakesIn', 'Loser cooks Sunday'); await page.click('[data-a="stakes-save"]'); await page.waitForFunction(() => document.getElementById('main').textContent.includes('Loser cooks Sunday'));
  check('H stakes saved', (await kv(page, 'comp/settings')).stakes === 'Loser cooks Sunday');
  await go(page, 'fuel'); for (const oz of ['32', '32', '24']) await page.click('[data-a="water"][data-oz="' + oz + '"]');
  check('H doing the water tip adds exactly its points', (await score(page, 'tyson')).total === 21);
  await page.click('[data-a="food-add"][data-meal="d"]'); await page.waitForSelector('#foodQ'); await page.click('[data-a="food-quick"]'); await fill(page, '[data-ovf="kcal"]', 2000); await page.click('[data-a="quick-save"]'); await page.waitForSelector('#ov[hidden]', { state: 'attached' });
  check('H food in range puts Tyson ahead', (await score(page, 'tyson')).total === 25);
  check('H lead change is celebrated', (await seen(page)).includes('Tyson takes the lead'), JSON.stringify(await seen(page)));
  await switchTo(page, 'jacquie'); await go(page, 'compete');
  check('H Jacquie sees she trails and how to answer', (await txt(page, '#leadLine')).includes('Tyson leads by 3') && (await txt(page, '#planLine')).includes('To pass Tyson today: move for 10 minutes today'), await txt(page, '#planLine'));
  await go(page, 'train'); await page.evaluate(() => { window.__keepOv = true; });
  await page.click('.act[data-k="walkdinner"]'); await page.waitForSelector('#actLog'); await page.click('#actLog'); await page.waitForSelector('#ov.center');
  check('H a ten-minute walk retakes the lead', (await txt(page, '#ov')).includes('Jacquie takes the lead') && (await score(page, 'jacquie')).total === 38);
  await shot(page, 'lead-change.png');
  check('H celebration canvas is live', await page.evaluate(() => { const c = document.getElementById('fx'); return c.width > 0 && c.height > 0; }));
  await ctx.close();
  // the following Monday: last week's result is announced once, and the season tally shows it
  ({ ctx, page } = await newPage(browser, { me: 'jacquie', init: seedComp, time: T('2026-11-09T12:00:00Z') }));
  check('H weekly result announced on Monday', (await seen(page)).includes('Jacquie wins, 22 to 18'), JSON.stringify(await seen(page)));
  check('H new week starts at zero', (await score(page, 'jacquie')).total === 0);
  await go(page, 'compete');
  check('H season tally', (await txt(page, '#main')).includes('Jacquie 1 – 0 Tyson') && (await txt(page, '.weeks')).includes('Week of Nov 2'));
  await go(page, 'me');
  check('H winner earns the Checkered Flag', await has(page, '.badge[data-id="win1"]:not(.locked)'));
  await page.reload(); await page.waitForSelector('#main .card');
  check('H result is not announced twice', !(await seen(page)).some(x => x.includes('wins')));
  await go(page, 'compete');
  check('H last week stays open for late entries on Monday', (await txt(page, '.weeks')).includes('open through Tue') && (await kv(page, 'results/2026-11-02')) === null);
  await ctx.close();
  // Wednesday: the result is closed and stored; changing a goal afterwards cannot rewrite it
  ({ ctx, page } = await newPage(browser, { me: 'jacquie', init: seedComp, time: T('2026-11-11T12:00:00Z') }));
  await page.waitForFunction(() => !!(JSON.parse(localStorage.getItem('ml.kv') || '{}'))['results/2026-11-02']);
  const fin = await kv(page, 'results/2026-11-02');
  check('H result is stored as final after Tuesday', fin.final === true && fin.jacquie === 22 && fin.tyson === 18 && fin.winner === 'jacquie');
  await go(page, 'program'); await page.click('[data-a="move-goal"][data-v="7"]'); await page.waitForFunction(() => document.querySelector('[data-a="move-goal"][data-v="7"]').classList.contains('on'));
  await go(page, 'compete');
  check('H a later goal change does not rewrite a final week', (await txt(page, '.weeks')).includes('Jacquie 22–18') && !(await txt(page, '.weeks')).includes('open through Tue'), await txt(page, '.weeks'));
  await ctx.close();

  // ---------- J: account storage paths, sync, failure ----------
  ({ ctx, page } = await newPage(browser, { me: 'jacquie', init: fakeDb }));
  await page.waitForFunction(() => window.MorningLaps.state.storage === 'db');
  check('J no browser-only banner when the account store answers', !(await txt(page, '#main')).includes('Saving in this browser only'));
  await logAct(page, 'walkeasy'); await page.waitForFunction(() => !!window.__store['profiles/jacquie/sessions/2026-11-03']);
  check('J Jacquie\'s activity goes to her own path', await page.evaluate(() => window.__store['profiles/jacquie/sessions/2026-11-03'].acts.length === 1 && !window.__store['sessions/2026-11-03']));
  await go(page, 'fuel'); await page.click('[data-a="water"][data-oz="8"]'); await page.waitForFunction(() => !!window.__store['profiles/jacquie/food/2026-11-03']);
  check('J water goes to her food log', await page.evaluate(() => window.__store['profiles/jacquie/food/2026-11-03'].water === 8));
  await go(page, 'me'); await page.click('[data-a="skin-preset"][data-v="lilac"]'); await page.waitForFunction(() => { const d = window.__store['profiles/jacquie']; return !!(d && d.skin && d.skin.preset === 'lilac'); });
  check('J look is stored on the profile, so it follows her to any phone', true);
  await switchTo(page, 'tyson'); await go(page, 'train');
  await fill(page, '#tmMin', 20); await page.click('#saveBtn'); await page.waitForFunction(() => !!window.__store['sessions/2026-11-03']);
  check('J Tyson\'s log stays at its original path', await page.evaluate(() => window.__store['sessions/2026-11-03'].kind === 'cardio' && !window.__store['profiles/tyson/sessions/2026-11-03']));
  await page.waitForFunction(() => document.getElementById('statusLine').textContent.includes('Saved · synced'));
  await go(page, 'fuel'); await page.evaluate(() => { window.__failSet = true; });
  await page.click('[data-a="water"][data-oz="12"]'); const tfail = await toastWith(page, 'Could not save');
  check('J a refused save says so and puts the old value back', tfail.includes('Could not save') && await txt(page, '#waterNow') === '0', tfail);
  await page.evaluate(() => { window.__failSet = false; });
  await page.click('[data-a="water"][data-oz="12"]'); await page.waitForFunction(() => window.__store['profiles/tyson/food/2026-11-03'] && window.__store['profiles/tyson/food/2026-11-03'].water === 12);
  check('J retry succeeds', await txt(page, '#waterNow') === '12');
  await ctx.close();

  // ---------- K: layouts ----------
  for (const [w, h, name] of [[375, 667, '375'], [390, 844, '390'], [430, 932, '430'], [844, 390, 'landscape'], [1280, 800, 'desktop']]) {
    for (const who of ['tyson', 'jacquie']) {
      ({ ctx, page } = await newPage(browser, { width: w, height: h, me: who, init: seedComp, scheme: name === '430' ? 'dark' : 'light' }));
      const bad = [];
      for (const tab of ['train', 'program', 'history', 'fuel', 'compete', 'me']) { await go(page, tab); const o = await overflow(page); if (o > 0) bad.push(tab + ':' + o); if (name === '390' || name === '430') await shot(page, 'k-' + name + '-' + who + '-' + tab + '.png', tab === 'me'); }
      await go(page, 'fuel'); await page.click('[data-a="food-add"][data-meal="b"]'); await page.waitForSelector('#foodQ');
      const sheet = await page.evaluate(() => { const r = document.querySelector('.ov').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; });
      check('K ' + name + ' ' + who + ': no sideways scroll on any tab', !bad.length, bad.join(' '));
      check('K ' + name + ' ' + who + ': food sheet fits the screen', sheet);
      await ctx.close();
    }
  }

  await browser.close();
  process.exit(finish('profiles, fuel, compete') ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
