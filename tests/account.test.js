// What a signed-in person's account remembers, for phones that empty a page's own storage between visits:
// which profile they use, the weekly result and badges already shown, and unsaved lifting drafts.
// "Reopen" below means a fresh browser context (empty device storage) against the same account store.
// Run: node tests/account.test.js  (see tests/helpers.js for the local server it expects)
const { chromium, check, T, newPage, val, txt, has, fill, cssVar, fakeDb, finish } = require('./helpers');
const seen = page => page.evaluate(() => window.__seen.slice());
const dump = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__store)));
const ready = page => page.waitForFunction(() => window.MorningLaps.state.ready && window.MorningLaps.state.storage === 'db');
const WATCH = 'window.__whoShown=false;document.addEventListener("DOMContentLoaded",function(){var o=document.getElementById("ov");new MutationObserver(function(){if(o.querySelector("[data-a=\\"who-pick\\"]"))window.__whoShown=true;}).observe(o,{childList:true,subtree:true,attributes:true});});';
const acct = (docs, uid, pre) => WATCH + (pre || '') + ';window.__uid=' + JSON.stringify(uid) + ';(' + fakeDb.toString() + ')();Object.assign(window.__store,' + JSON.stringify(docs || {}) + ');';
const pick = async (page, pid) => { await page.click('[data-a="who-pick"][data-pid="' + pid + '"]'); await page.waitForFunction(p => window.MorningLaps.state.pid === p, pid); };
const lift = (date, day, ex, extra) => Object.assign({ v: 2, date, kind: 'strength', day, phase: 1, planned: Object.keys(ex), plannedBase: Object.keys(ex), swaps: {}, ex, qualifies: true, complete: true, treadmill: { minutes: 20, title: '' }, savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' }, extra || {});
const PUSH = { chestpress: { w: 70, reps: [12, 12, 12] }, shoulderpress: { w: 50, reps: [10, 10, 10] } };
const walk = (date, min) => ({ v: 2, date, kind: 'activity', acts: [{ id: 'a1', a: 'walkeasy', name: 'Easy walk', min, feel: 'good', hurt: false, note: '', mv: true, at: date + 'T12:00:00Z' }], savedAt: date + 'T12:00:00Z', updatedAt: date + 'T12:00:00Z' });
const SETTINGS = { startDate: '2026-11-02', goal: 5, maxed: {}, swaps: {} };
const prefsOf = (store, uid) => store['data/users/' + uid + '/prefs'] || {};
const field = (o, start) => { const k = Object.keys(o).find(x => x.indexOf(start) === 0); return k ? o[k] : undefined; };

(async () => {
  const browser = await chromium.launch();
  let ctx, page, store;
  const section = async (tag, fn) => {
    try { await fn(); } catch (e) { check(tag + ' ran to the end', false, String(e && e.message || e).split('\n')[0]); }
    try { if (ctx) await ctx.close(); } catch (e) { /* already closed */ }
  };

  // ---------- A1: the profile is asked for once, then remembered by the account ----------
  await section('A1', async () => {
    ({ ctx, page } = await newPage(browser, { me: null, init: acct({}, 'u_j') }));
    check('A1 a phone the account has never seen asks who is logging', (await txt(page, '#ov')).includes('Who is logging?'));
    check('A1 nothing is drawn until then', await page.evaluate(() => getComputedStyle(document.getElementById('main')).visibility === 'hidden'));
    await pick(page, 'jacquie'); await page.waitForFunction(() => { const o = window.__store['data/users/u_j/prefs']; return !!o && Object.keys(o).some(k => k.indexOf('me_') === 0); });
    store = await dump(page);
    check('A1 the pick is saved in her private corner of the account', field(prefsOf(store, 'u_j'), 'me_') === 'jacquie', JSON.stringify(prefsOf(store, 'u_j')));
    check('A1 and nowhere the other profile could read it', !Object.keys(store).some(k => k.indexOf('data/users/') !== 0 && JSON.stringify(store[k]).includes('me_')));
    await ctx.close();

    ({ ctx, page } = await newPage(browser, { me: null, init: acct(store, 'u_j', 'window.__snapDelay=600') }));
    check('A1 reopening with the phone\'s storage emptied goes straight to her log', (await txt(page, '#whoBtn')).includes('Jacquie') && await page.$eval('#ov', e => e.hidden) && await has(page, '.act[data-k="walkeasy"]'));
    check('A1 with her look, and the chooser never flashed up', await cssVar(page, '--ah') === '334' && await page.evaluate(() => window.__whoShown === false && !document.documentElement.classList.contains('nopid')));
    await ctx.close();

    ({ ctx, page } = await newPage(browser, { me: null, init: acct(store, 'u_t') }));
    check('A1 a different account is not handed her profile', (await txt(page, '#ov')).includes('Who is logging?'));
    await pick(page, 'tyson'); await page.waitForFunction(() => { const o = window.__store['data/users/u_t/prefs']; return !!o && Object.keys(o).some(k => k.indexOf('me_') === 0); });
    check('A1 each account keeps its own answer', await page.evaluate(() => { const a = window.__store['data/users/u_j/prefs'], b = window.__store['data/users/u_t/prefs'], f = o => o[Object.keys(o).find(k => k.indexOf('me_') === 0)]; return f(a) === 'jacquie' && f(b) === 'tyson'; }));
    await ctx.close();

    ({ ctx, page } = await newPage(browser, { me: null, width: 430, height: 932, init: acct(store, 'u_j') }));
    check('A1 a different kind of device on the same account is asked once for itself', (await txt(page, '#ov')).includes('Who is logging?'));
    await pick(page, 'tyson'); await page.waitForFunction(() => Object.keys(window.__store['data/users/u_j/prefs']).filter(k => k.indexOf('me_') === 0).length === 2);
    check('A1 and its answer does not change the first phone\'s', await page.evaluate(() => { const o = window.__store['data/users/u_j/prefs']; return Object.keys(o).filter(k => k.indexOf('me_') === 0).map(k => o[k]).sort().join() === 'jacquie,tyson'; }));
  });

  // ---------- A2: last week's final result is announced once per person, not on every open ----------
  await section('A2', async () => {
    const week = { 'sessions/2026-11-02': lift('2026-11-02', 'push', PUSH), 'settings/program': SETTINGS, 'profiles/jacquie/sessions/2026-11-02': walk('2026-11-02', 15), 'comp/settings': { start: '2026-11-02', stakes: '' } };
    ({ ctx, page } = await newPage(browser, { me: null, time: T('2026-11-11T12:00:00Z'), init: acct(week, 'u_j') })); // Wednesday: the week before is final
    await pick(page, 'jacquie');
    await page.waitForFunction(() => window.__seen.some(x => x.includes('wins')), null, { timeout: 4000 }).catch(() => {});
    check('A2 Wednesday: the final result is announced', (await seen(page)).includes('Jacquie wins, 22 to 18'), JSON.stringify(await seen(page)));
    await page.waitForFunction(() => { const o = window.__store['data/users/u_j/prefs']; return !!o && Object.keys(o).some(k => k.indexOf('seenFinalWeek_') === 0 && o[k] === '2026-11-02'); });
    store = await dump(page);
    check('A2 the account notes which final week was shown, and the result is stored', field(prefsOf(store, 'u_j'), 'seenFinalWeek_') === '2026-11-02' && store['results/2026-11-02'].final === true && store['results/2026-11-02'].winner === 'jacquie');
    await ctx.close();

    for (const n of [1, 2]) {
      ({ ctx, page } = await newPage(browser, { me: null, time: T('2026-11-11T1' + n + ':00:00Z'), init: acct(store, 'u_j') }));
      await ready(page); await page.waitForTimeout(400);
      check('A2 reopen ' + n + ' with storage emptied: not announced again, and no chooser', !(await seen(page)).some(x => x.includes('wins')) && await page.evaluate(() => window.__whoShown === false), JSON.stringify(await seen(page)));
      await ctx.close();
    }
    store['profiles/jacquie/sessions/2026-11-10'] = walk('2026-11-10', 15);
    ({ ctx, page } = await newPage(browser, { me: null, time: T('2026-11-18T12:00:00Z'), init: acct(store, 'u_j') }));
    await page.waitForFunction(() => window.__seen.some(x => x.includes('wins')), null, { timeout: 4000 }).catch(() => {});
    check('A2 the following Wednesday the new final result is announced', (await seen(page)).some(x => x.includes('Jacquie wins')), JSON.stringify(await seen(page)));
  });

  // ---------- A3: a badge is celebrated once ----------
  await section('A3', async () => {
    ({ ctx, page } = await newPage(browser, { me: null, init: acct({}, 'u_j') }));
    await pick(page, 'jacquie'); await ready(page);
    await page.click('.act[data-k="walkeasy"]'); await page.waitForSelector('#actLog'); await page.click('#actLog'); await page.waitForSelector('#ov', { state: 'hidden' });
    await page.waitForFunction(() => window.__seen.length > 0, null, { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(700);
    const first = await seen(page);
    store = await dump(page);
    const kept = prefsOf(store, 'u_j').badgesJacquie || [];
    check('A3 a first walk earns a badge and it is celebrated', first.length > 0 && kept.length > 0, JSON.stringify(first) + ' ' + JSON.stringify(kept));
    await ctx.close();
    ({ ctx, page } = await newPage(browser, { me: null, init: acct(store, 'u_j') }));
    await ready(page); await page.waitForTimeout(500);
    check('A3 reopening with storage emptied does not celebrate it again', (await seen(page)).length === 0, JSON.stringify(await seen(page)));
    await page.goto(page.url().split('#')[0] + '#me'); await page.waitForSelector('.badge:not(.locked)');
    check('A3 the badge is still earned', (await page.$$('.badge:not(.locked)')).length === kept.length);
  });

  // ---------- A4: an unsaved lifting log survives the phone emptying its storage ----------
  await section('A4', async () => {
    ({ ctx, page } = await newPage(browser, { me: null, init: acct({ 'settings/program': SETTINGS }, 'u_t') }));
    await pick(page, 'tyson'); await ready(page); await page.waitForSelector('#w-chestpress');
    await fill(page, '#tmMin', 25); await fill(page, '#w-chestpress', 75); await fill(page, '#r-chestpress-0', 10);
    await page.waitForFunction(() => { const d = window.__store['data/users/u_t/drafts']; return !!(d && d.tyson && d.tyson['2026-11-03'] && d.tyson['2026-11-03'].ex.chestpress && d.tyson['2026-11-03'].ex.chestpress.reps[0] === '10'); });
    check('A4 typing is copied to the account a moment later', true);
    await fill(page, '#r-chestpress-1', 9);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.waitForFunction(() => window.__store['data/users/u_t/drafts'].tyson['2026-11-03'].ex.chestpress.reps[1] === '9', null, { timeout: 600 }).catch(() => {});
    check('A4 switching away from the app writes the latest typing at once', await page.evaluate(() => window.__store['data/users/u_t/drafts'].tyson['2026-11-03'].ex.chestpress.reps[1] === '9'));
    store = await dump(page);
    check('A4 nothing is saved to the log yet', !store['sessions/2026-11-03']);
    await ctx.close();

    ({ ctx, page } = await newPage(browser, { me: null, init: acct(store, 'u_t') }));
    await ready(page); await page.waitForSelector('#w-chestpress');
    check('A4 reopening with storage emptied brings the unsaved sets back', await val(page, '#tmMin') === '25' && await val(page, '#w-chestpress') === '75' && await val(page, '#r-chestpress-0') === '10' && await val(page, '#r-chestpress-1') === '9');
    await fill(page, '#r-chestpress-2', 8); await page.click('h1');
    await page.click('#saveBtn'); await page.waitForFunction(() => !!window.__store['sessions/2026-11-03']);
    await page.waitForFunction(() => !window.__store['data/users/u_t/drafts'].tyson['2026-11-03'], null, { timeout: 4000 }).catch(() => {});
    store = await dump(page);
    check('A4 saving stores the workout and clears the account\'s copy of the draft', store['sessions/2026-11-03'].ex.chestpress.reps.join() === '10,9,8' && store['sessions/2026-11-03'].treadmill.minutes === 25 && !store['data/users/u_t/drafts'].tyson['2026-11-03']);
    await ctx.close();

    ({ ctx, page } = await newPage(browser, { me: null, init: acct(store, 'u_t') }));
    await ready(page); await page.waitForSelector('#w-chestpress');
    check('A4 the next open shows the saved workout, with no leftover draft', await val(page, '#r-chestpress-2') === '8' && (await txt(page, '#statusLine')).includes('Saved') && await page.evaluate(() => Object.keys(window.MorningLaps.state.draftsBy.tyson).length === 0), await txt(page, '#statusLine'));
  });

  // ---------- A5: an account draft older than the saved day is ignored; a newer one is used ----------
  await section('A5', async () => {
    const draft = (min, at) => ({ kindSel: null, tm: { minutes: String(min), title: '' }, notes: '', ex: {}, swaps: {}, extra: {}, countAs: null, closed: {}, created: Date.parse(at), updatedAt: Date.parse(at), recovered: false, fromRecord: false });
    const base = { 'settings/program': SETTINGS, 'sessions/2026-11-03': lift('2026-11-03', 'push', PUSH, { treadmill: { minutes: 30, title: '' }, updatedAt: '2026-11-03T11:00:00Z' }) };
    ({ ctx, page } = await newPage(browser, { me: 'tyson', init: acct(Object.assign({ 'data/users/u_t/drafts': { v: 1, tyson: { '2026-11-03': draft(11, '2026-11-03T09:00:00Z') }, jacquie: {} } }, base), 'u_t') }));
    await ready(page); await page.waitForSelector('#tmMin');
    check('A5 a draft from before the day was saved is not brought back', await val(page, '#tmMin') === '30' && await val(page, '#w-chestpress') === '70');
    await ctx.close();
    ({ ctx, page } = await newPage(browser, { me: 'tyson', init: acct(Object.assign({ 'data/users/u_t/drafts': { v: 1, tyson: { '2026-11-03': draft(41, '2026-11-03T11:30:00Z'), 'not-a-date': draft(1, '2026-11-03T11:30:00Z'), '2026-11-02': 'junk' }, jacquie: 7 } }, base), 'u_t') }));
    await ready(page); await page.waitForSelector('#tmMin');
    check('A5 a draft touched after the save is brought back, and junk entries are skipped', await val(page, '#tmMin') === '41' && await page.evaluate(() => Object.keys(window.MorningLaps.state.draftsBy.tyson).join() === '2026-11-03'));
  });

  // ---------- A6: when the account cannot be reached, the page still asks and still remembers the answer ----------
  await section('A6', async () => {
    ({ ctx, page } = await newPage(browser, { me: null, init: acct({}, 'u_j', 'window.__snapDelay=60000') })); // the chooser comes up after ten seconds
    check('A6 with the account slow to answer, the chooser appears instead of a blank page', (await txt(page, '#ov')).includes('Who is logging?') && await page.evaluate(() => !window.MorningLaps.state.ready));
    await pick(page, 'jacquie');
    check('A6 her log shows, marked as still loading', (await txt(page, '#whoBtn')).includes('Jacquie') && (await txt(page, '#main')).includes('Still loading your log'));
    await page.clock.fastForward(60000); await ready(page);
    await page.waitForFunction(() => !!window.__store['data/users/u_j/prefs'], null, { timeout: 4000 }).catch(() => {});
    check('A6 once the account answers, the pick made meanwhile is saved to it', field(prefsOf(await dump(page), 'u_j'), 'me_') === 'jacquie');
  });

  await browser.close();
  process.exit(finish('account memory') ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
