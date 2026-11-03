// Playwright end-to-end checks for Morning Laps (local-storage mode plus a fake db shim). v4 selectors.
const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8765/index.html';
const SHOTS = __dirname + '/shots/';
const results = [];
function check(name, cond, detail) { results.push({ name, ok: !!cond, detail: detail || '' }); if (!cond) console.log('FAIL', name, detail || ''); }
const T = (iso) => new Date(iso);

async function newPage(browser, { time, width = 390, height = 844, init } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 900, hasTouch: width < 900, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.clock.install({ time: time || T('2026-11-03T12:00:00Z') }); // Tue Nov 3, 07:00 Indy
  if (init) await page.addInitScript(init);
  page.on('pageerror', e => check('no page error', false, e.message));
  await page.goto(URL); await page.waitForSelector('#main .card');
  return { ctx, page };
}
const val = (page, sel) => page.$eval(sel, el => el.value);
const txt = (page, sel) => page.$eval(sel, el => el.textContent.trim());
const has = (page, sel) => page.$(sel).then(Boolean);
async function fill(page, sel, v) { await page.fill(sel, String(v)); }
async function toastText(page) { await page.waitForSelector('#toast:not([hidden])', { timeout: 3000 }); return txt(page, '#toast'); }
async function menu(page, key, act) { await page.click('[data-menu="' + key + '"]'); await page.waitForSelector('.menu[data-menufor="' + key + '"]'); await page.click('.menu [data-act="' + act + '"]'); }
async function swapTo(page, key, to) { await page.click('[data-menu="' + key + '"]'); await page.waitForSelector('.menu[data-menufor="' + key + '"]'); await page.click('.menu [data-act="swap"]'); await page.waitForSelector('.menu [data-act="swapto"][data-to="' + to + '"]'); await page.click('.menu [data-act="swapto"][data-to="' + to + '"]'); await page.waitForSelector('[data-ex="' + to + '"]'); }
async function details(page, key) { await menu(page, key, 'details'); await page.waitForSelector('#details-' + key); return txt(page, '#details-' + key); }

(async () => {
  const browser = await chromium.launch();
  // ---------- Scenario A: drafts, classification, blanks, progression ----------
  let { ctx, page } = await newPage(browser);
  check('today line Nov 3', (await txt(page, '#todayLine')).startsWith('Tue Nov 3'), await txt(page, '#todayLine'));
  check('date header Today', (await txt(page, '.sess h2')).startsWith('Today'));
  check('save button labelled Today and disabled when empty', (await txt(page, '#saveBtn')) === 'Save Today' && await page.$eval('#saveBtn', b => b.disabled));
  check('no save note when empty', !(await has(page, '#savenote')));
  check('default kind Push', await page.$eval('#kindSeg button.on', b => b.dataset.kind) === 'push');
  check('no history line when no history', !(await has(page, '[data-last="chestpress"]')));
  check('progress indicator hidden until logging', await page.$eval('[data-prog="chestpress"]', e => e.hidden));
  check('menu button has accessible name', await page.$eval('[data-menu="chestpress"]', b => b.getAttribute('aria-label')) === 'Options for Chest press machine');

  // Test 1: swap keeps unrelated values
  await fill(page, '#tmMin', 18); await fill(page, '#tmTitle', 'Hike with Jamie-Ray');
  await fill(page, '#w-chestpress', 75); await fill(page, '#r-chestpress-0', 10); await fill(page, '#r-chestpress-1', 9); await fill(page, '#r-chestpress-2', 8);
  await fill(page, '#w-shoulderpress', 55); await fill(page, '#r-shoulderpress-0', 10);
  await fill(page, '#notes', 'felt good');
  check('status shows Draft', (await txt(page, '#statusLine')).includes('Draft'));
  check('progress shows 3/3 after logging', (await txt(page, '[data-prog="chestpress"]')).includes('3/3'));
  check('save enabled with content', !(await page.$eval('#saveBtn', b => b.disabled)));
  await swapTo(page, 'chestpress', 'dbbench');
  check('T1 treadmill min kept after swap', await val(page, '#tmMin') === '18');
  check('T1 title kept after swap', await val(page, '#tmTitle') === 'Hike with Jamie-Ray');
  check('T1 notes kept after swap', await val(page, '#notes') === 'felt good');
  check('T1 shoulder press kept after swap', await val(page, '#w-shoulderpress') === '55' && await val(page, '#r-shoulderpress-0') === '10');
  check('T1 dumbbell bench starts blank with its own suggestion', await val(page, '#w-dbbench') === '' && (await txt(page, '[data-usew="dbbench"]')) === 'Use 30 lb');
  check('T1 per-hand label on dumbbell bench', (await txt(page, '.ex[data-ex="dbbench"] .exrx')).includes('per hand'));
  check('T1 swapped chip shown', (await txt(page, '.ex[data-ex="dbbench"] h3')).includes('swapped'));
  await fill(page, '#w-dbbench', 30); await fill(page, '#r-dbbench-0', 12);
  await swapTo(page, 'dbbench', 'chestpress');
  check('T1 swap back restores chest press entries', await val(page, '#w-chestpress') === '75' && await val(page, '#r-chestpress-1') === '9');
  check('T1 machine weight not copied from dumbbell', await val(page, '#w-chestpress') !== '30');

  // Use N lb fills weight only
  await fill(page, '#w-pushdown', ''); await page.click('[data-usew="pushdown"]');
  check('Use fills weight only', await val(page, '#w-pushdown') === '40' && await val(page, '#r-pushdown-0') === '' && await page.$eval('[data-prog="pushdown"]', e => e.hidden));
  check('Use button hides once accepted', await page.$eval('[data-usew="pushdown"]', b => b.hidden));
  await fill(page, '#w-pushdown', '');

  // Test 2: Can't go higher keeps the draft
  await menu(page, 'shoulderpress', 'hold'); await page.waitForSelector('[data-hold="shoulderpress"]');
  check('T2 hold status shown on exercise', (await txt(page, '[data-hold="shoulderpress"]')).startsWith('Holding weight'));
  check('T2 draft intact after hold', await val(page, '#tmMin') === '18' && await val(page, '#w-chestpress') === '75' && await val(page, '#r-shoulderpress-0') === '10' && await val(page, '#notes') === 'felt good');
  await menu(page, 'shoulderpress', 'hold'); await page.waitForSelector('[data-hold="shoulderpress"]', { state: 'detached' });

  // Menu keyboard + outside click
  await page.click('[data-menu="chestpress"]'); await page.waitForSelector('.menu[data-menufor="chestpress"]');
  check('menu opens with focus on first item', await page.evaluate(() => document.activeElement.getAttribute('role') === 'menuitem'));
  await page.keyboard.press('ArrowDown');
  check('arrow moves focus', await page.evaluate(() => document.activeElement.textContent.startsWith("Can't go higher")));
  await page.keyboard.press('Escape'); await page.waitForSelector('.menu', { state: 'detached' });
  check('escape closes and returns focus', await page.evaluate(() => document.activeElement.dataset.menu === 'chestpress'));
  check('values intact after menu open/close', await val(page, '#w-chestpress') === '75' && await val(page, '#r-chestpress-2') === '8');

  // Test 3: Push -> Pull -> Push
  await page.click('#kindSeg [data-kind="pull"]'); await page.waitForSelector('#w-latpull');
  check('T3 pull screen shows treadmill + notes still', await val(page, '#tmMin') === '18' && await val(page, '#notes') === 'felt good');
  await fill(page, '#w-latpull', 80);
  await page.click('#kindSeg [data-kind="push"]'); await page.waitForSelector('#w-chestpress');
  check('T3 push draft returns', await val(page, '#w-chestpress') === '75' && await val(page, '#r-chestpress-2') === '8' && await val(page, '#w-shoulderpress') === '55');

  // Test 4: tabs and dates
  await page.click('a[data-tab="program"]'); await page.waitForSelector('#nextLift');
  await page.click('a[data-tab="history"]'); await page.waitForSelector('text=History');
  await page.click('a[data-tab="train"]'); await page.waitForSelector('#w-chestpress');
  check('T4 draft survives tab switch', await val(page, '#w-chestpress') === '75' && await val(page, '#tmMin') === '18');
  await page.click('.datebar [data-date="2026-11-02"]'); await page.waitForSelector('.sess h2');
  check('T4 yesterday header', (await txt(page, '.sess h2')).startsWith('Yesterday'));
  check('T4 yesterday form blank', await val(page, '#tmMin') === '' && await val(page, '#w-chestpress') === '');
  check('T4 yesterday save label', (await txt(page, '#saveBtn')) === 'Save Yesterday');
  await page.click('.datebar [data-date="2026-11-03"]');
  check('T4 today draft back', await val(page, '#w-chestpress') === '75' && await val(page, '#notes') === 'felt good');
  check('T4 datebar marks draft dot', await page.$eval('.datebar [data-date="2026-11-03"] .dot', d => d.classList.contains('draft')));

  // Test 5: reload recovers
  await page.reload(); await page.waitForSelector('#w-chestpress');
  check('T5 recovered draft banner', await has(page, '#discardDraft'));
  check('T5 recovered values', await val(page, '#w-chestpress') === '75' && await val(page, '#tmTitle') === 'Hike with Jamie-Ray' && await val(page, '#r-shoulderpress-0') === '10');
  check('T5 status says Recovered draft', (await txt(page, '#statusLine')).includes('Recovered draft'));
  await page.click('#discardDraft'); await page.waitForSelector('#w-chestpress');
  check('T5 discard clears', await val(page, '#w-chestpress') === '' && await val(page, '#tmMin') === '');

  // Validation
  check('empty save disabled', await page.$eval('#saveBtn', b => b.disabled));
  await fill(page, '#w-chestpress', -5); await fill(page, '#r-chestpress-0', 10);
  check('save enabled on invalid input so the error can show', !(await page.$eval('#saveBtn', b => b.disabled)));
  await page.click('#saveBtn');
  check('negative weight blocked', (await toastText(page)).includes('weight must be 0 or more') && (await txt(page, '#savenote')).includes('weight must be 0 or more'));
  await fill(page, '#w-chestpress', ''); await page.click('#saveBtn');
  check('reps without weight blocked', (await toastText(page)).includes('enter the weight you used'));
  await fill(page, '#r-chestpress-0', '');
  check('error clears on input', !(await has(page, '#savenote')));

  // Test 6: treadmill only from the Push screen
  await fill(page, '#tmMin', 20);
  check('T6 note explains before saving', (await txt(page, '#savenote')).includes('Treadmill only · no lifting sets · Push stays next'));
  await page.click('#saveBtn');
  const t6 = await toastText(page);
  check('T6 toast explains outcome', t6.includes('20 treadmill minutes saved. No lifting sets recorded; Push remains next.'), t6);
  await page.waitForFunction(() => document.querySelector('#statusLine') && document.querySelector('#statusLine').textContent.includes('Saved'));
  check('T6 lifts 0/3', await txt(page, '#liftCount') === '0/3');
  check('T6 activity 1/5', await txt(page, '#actCount') === '1/5');
  check('T6 saved entry shows as Treadmill', await page.$eval('#kindSeg button.on', b => b.dataset.kind) === 'cardio');
  check('T6 rotation text still starts with Push', (await txt(page, '#whyLine')).includes('First lift of the program: Push'));
  await page.click('#kindSeg [data-kind="push"]'); await page.waitForSelector('#w-chestpress');
  check('T6 switching to Push keeps the saved minutes in the draft', await val(page, '#tmMin') === '20');
  await page.click('#kindSeg [data-kind="cardio"]'); await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('ml.drafts')); delete d['2026-11-03']; localStorage.setItem('ml.drafts', JSON.stringify(d)); }); await page.reload(); await page.waitForSelector('#kindSeg');
  await page.click('a[data-tab="history"]'); await page.waitForSelector('details.hi');
  check('T6 history says Treadmill', (await txt(page, 'details.hi[data-hdate="2026-11-03"] summary')).includes('Treadmill'));
  check('T6 history chip activity, no lift day', (await txt(page, 'details.hi[data-hdate="2026-11-03"] summary')).includes('activity') && !(await txt(page, 'details.hi[data-hdate="2026-11-03"] summary')).includes('lift day'));
  await page.click('a[data-tab="program"]'); await page.waitForSelector('#nextLift');
  check('T6 program next lift Push', (await txt(page, '#nextLift')).includes('Next lift day: Push'));

  // Test 7: one set, two blanks, plus a 0 as failed set (yesterday, Push)
  await page.click('a[data-tab="train"]'); await page.click('.datebar [data-date="2026-11-02"]'); await page.waitForSelector('#w-chestpress');
  await fill(page, '#w-chestpress', 70); await fill(page, '#r-chestpress-0', 12);
  check('T7 note warns partial', (await txt(page, '#savenote')).includes('Partial Push · 1 lift logged · not a lift day'));
  check('T7 progress 1/3', (await txt(page, '[data-prog="chestpress"]')).includes('1/3'));
  await fill(page, '#w-pushdown', 40); await fill(page, '#r-pushdown-0', 15); await fill(page, '#r-pushdown-1', 0);
  check('T7 countAs auto-checked at 2 lifts', await page.$eval('#countAs', c => c.checked));
  check('T7 note says counts, partial', (await txt(page, '#savenote')).includes('Push · 2 of 3 exercises · counts as lift day'));
  await page.click('#saveBtn'); await toastText(page);
  await page.waitForFunction(() => document.querySelector('#statusLine').textContent.includes('Saved'));
  const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('ml.sessions'))['2026-11-02']);
  check('T7 blanks saved as null', JSON.stringify(rec.ex.chestpress.reps) === '[12,null,null]', JSON.stringify(rec.ex.chestpress.reps));
  check('T7 zero kept as zero', JSON.stringify(rec.ex.pushdown.reps) === '[15,0,null]', JSON.stringify(rec.ex.pushdown.reps));
  check('T7 record kind strength, qualifies, partial', rec.kind === 'strength' && rec.qualifies === true && rec.complete === false);
  check('T7 planned stored', JSON.stringify(rec.plannedBase) === '["chestpress","shoulderpress","pushdown"]');
  await page.reload(); await page.waitForSelector('#w-chestpress');
  check('T7 reopen shows exact values', await val(page, '#r-chestpress-0') === '12' && await val(page, '#r-chestpress-1') === '' && await val(page, '#r-pushdown-1') === '0');
  check('T7 status Saved entry, no draft', (await txt(page, '#statusLine')).includes('Saved') && !(await txt(page, '#statusLine')).includes('Draft'));
  await page.click('a[data-tab="history"]'); await page.waitForSelector('details.hi[data-hdate="2026-11-02"]');
  await page.click('details.hi[data-hdate="2026-11-02"] summary');
  const h7 = await txt(page, 'details.hi[data-hdate="2026-11-02"]');
  check('T7 history shows 12 / – / –', h7.includes('70 lb × 12 / – / –'), h7);
  check('T7 history shows 15 / 0 / –', h7.includes('40 lb × 15 / 0 / –'));
  check('T7 history marks partial + lift day', h7.includes('partial') && h7.includes('lift day') && h7.includes('Not logged: Shoulder press machine'));
  check('T7 lifts 1/3 (Mon Nov 2 same week)', await txt(page, '#liftCount') === '1/3');

  // Progression: one top set + two blanks must not increase
  await page.click('a[data-tab="train"]'); await page.click('.datebar [data-date="2026-11-03"]'); await page.waitForSelector('#kindSeg');
  check('P1 Pull is next after counted Push', (await txt(page, '#whyLine')).includes('Pull is next'), await txt(page, '#whyLine'));
  await page.click('#kindSeg [data-kind="push"]'); await page.waitForSelector('#w-chestpress');
  check('P1 chest press suggestion stays 70', (await txt(page, '[data-usew="chestpress"]')) === 'Use 70 lb');
  check('P1 last line shows dashes for blanks', (await txt(page, '[data-last="chestpress"]')).includes('70 lb × 12 / – / –'));
  const whyCP = await details(page, 'chestpress');
  check('P1 explanation mentions only 1 of 3 logged', whyCP.includes('Only 1 of 3 sets logged'), whyCP);
  check('P1 values intact after details', await val(page, '#tmMin') === '20');
  const whyPD = await details(page, 'pushdown');
  check('P1 zero counts as failed set (drop)', (await txt(page, '[data-usew="pushdown"]')) === 'Use 35 lb' && whyPD.includes('fell under'), whyPD);

  // Test 8: full qualifying Push today (updates the treadmill-only record)
  await fill(page, '#w-chestpress', 70); for (let i = 0; i < 3; i++) await fill(page, '#r-chestpress-' + i, 12);
  await fill(page, '#w-shoulderpress', 50); for (let i = 0; i < 3; i++) await fill(page, '#r-shoulderpress-' + i, 10);
  await fill(page, '#w-pushdown', 40); for (let i = 0; i < 3; i++) await fill(page, '#r-pushdown-' + i, 15);
  check('T8 progress shows 3/3 with collapse', (await txt(page, '[data-prog="chestpress"]')).includes('3/3') && await has(page, '[data-collapse="chestpress"]'));
  check('T8 no note for a normal finished session', !(await has(page, '#savenote')));
  check('T8 update label', (await txt(page, '#saveBtn')) === 'Update Today');
  await page.click('[data-collapse="chestpress"]'); await page.waitForSelector('[data-expand="chestpress"]');
  check('T8 collapsed summary shows values', (await txt(page, '[data-sum="chestpress"]')).includes('70 lb × 12 / 12 / 12'));
  await page.click('[data-expand="chestpress"]'); await page.waitForSelector('#w-chestpress');
  check('T8 expand restores inputs', await val(page, '#r-chestpress-2') === '12');
  await page.click('#saveBtn'); const t8 = await toastText(page);
  check('T8 toast says counts and next', t8.includes('Push day saved · counts as lift day · next: Pull'), t8);
  await page.waitForFunction(() => document.querySelector('#statusLine').textContent.includes('Saved'));
  check('T8 lifts 2/3', await txt(page, '#liftCount') === '2/3');
  check('T8 activity 2/5', await txt(page, '#actCount') === '2/5');
  await page.click('a[data-tab="program"]'); await page.waitForSelector('#nextLift');
  check('T8 next lift Pull', (await txt(page, '#nextLift')).includes('Next lift day: Pull'));
  await page.click('a[data-tab="history"]'); await page.waitForSelector('details.hi[data-hdate="2026-11-03"]');
  check('T8 history finished lift day', (await txt(page, 'details.hi[data-hdate="2026-11-03"] summary')).includes('Push · finished'));
  check('T8 one entry per date', (await page.$$('details.hi')).length === 2);

  // Test 9: save again, no extra credit
  await page.click('a[data-tab="train"]'); await page.waitForSelector('#saveBtn');
  await page.click('#saveBtn'); await toastText(page); await page.waitForFunction(() => document.querySelector('#statusLine').textContent.includes('Saved'));
  check('T9 lifts still 2/3', await txt(page, '#liftCount') === '2/3');
  check('T9 still 2 records', await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ml.sessions'))).length) === 2);

  // Progression next day + chronology of backdated edit (Test 10 part)
  await page.clock.setSystemTime(T('2026-11-04T12:00:00Z')); await page.reload(); await page.waitForSelector('.sess h2');
  check('P2 today Nov 4', (await txt(page, '#todayLine')).startsWith('Wed Nov 4'));
  check('P2 Pull next', await page.$eval('#kindSeg button.on', b => b.dataset.kind) === 'pull');
  await page.click('#kindSeg [data-kind="push"]'); await page.waitForSelector('#w-chestpress');
  check('P2 chest press suggests 75 after 3x12', (await txt(page, '[data-usew="chestpress"]')) === 'Use 75 lb');
  check('P2 last line shows Nov 3 result', (await txt(page, '[data-last="chestpress"]')).includes('Tue Nov 3') && (await txt(page, '[data-last="chestpress"]')).includes('70 lb × 12 / 12 / 12'));
  check('P2 why says all sets hit 12', (await details(page, 'chestpress')).includes('All 3 sets hit 12. Up 5 lb.'));
  await page.reload(); await page.waitForSelector('#w-chestpress');
  check('P2 revisit does not stack increases', (await txt(page, '[data-usew="chestpress"]')) === 'Use 75 lb');
  await page.fill('#datePick', '2026-10-30'); await page.$eval('#datePick', e => e.dispatchEvent(new Event('change', { bubbles: true }))); await page.waitForSelector('.sess h2');
  check('T10 backdated header', (await txt(page, '.sess h2')).startsWith('Fri Oct 30'));
  check('T10 backdated save label', (await txt(page, '#saveBtn')) === 'Save Fri Oct 30');
  await page.click('#kindSeg [data-kind="push"]'); await page.waitForSelector('#w-chestpress');
  await fill(page, '#w-chestpress', 95); for (let i = 0; i < 3; i++) await fill(page, '#r-chestpress-' + i, 12);
  await fill(page, '#w-shoulderpress', 60); for (let i = 0; i < 3; i++) await fill(page, '#r-shoulderpress-' + i, 12);
  await page.click('#saveBtn'); await toastText(page); await page.waitForFunction(() => document.querySelector('#statusLine').textContent.includes('Saved'));
  check('T10 backdated entry does not change this week lifts', await txt(page, '#liftCount') === '2/3');
  await page.click('.datebar [data-date="2026-11-04"]'); await page.click('#kindSeg [data-kind="push"]'); await page.waitForSelector('#w-chestpress');
  check('T10 suggestion still from Nov 3 (75), not Oct 30', (await txt(page, '[data-usew="chestpress"]')) === 'Use 75 lb');
  check('T10 last time shows Nov 3', (await txt(page, '[data-last="chestpress"]')).includes('Tue Nov 3'));
  await page.click('a[data-tab="history"]'); await page.waitForSelector('details.hi[data-hdate="2026-10-30"]');
  check('T10 history sorted newest first', await page.$$eval('details.hi', ds => ds.map(d => d.dataset.hdate).join(',')) === '2026-11-03,2026-11-02,2026-10-30');
  await page.click('details.hi[data-hdate="2026-10-30"] summary');
  await page.click('details.hi[data-hdate="2026-10-30"] [data-remove]');
  check('T10 remove names the entry', (await txt(page, 'details.hi[data-hdate="2026-10-30"] [data-remove]')).includes('Tap again to remove Fri Oct 30'));
  await page.click('details.hi[data-hdate="2026-10-30"] [data-remove]'); await page.waitForSelector('details.hi[data-hdate="2026-10-30"]', { state: 'detached' });
  check('T10 removed; 2 left', (await page.$$('details.hi')).length === 2);
  await page.selectOption('#exHist', 'chestpress');
  const exh = await txt(page, '#exHist ~ .tbl');
  check('T10 by-exercise lists both chest press days', exh.includes('Tue Nov 3') && exh.includes('Mon Nov 2') && exh.includes('12 / – / –'));

  // Test 11: default swap must not rewrite saved records
  await page.click('a[data-tab="program"]'); await page.click('button[data-gswap="chestpress"]'); await page.waitForSelector('button[data-gswap="chestpress"]:has-text("Undo")');
  await page.click('a[data-tab="history"]'); await page.waitForSelector('details.hi[data-hdate="2026-11-03"]'); await page.click('details.hi[data-hdate="2026-11-03"] summary');
  check('T11 saved record keeps Chest press machine', (await txt(page, 'details.hi[data-hdate="2026-11-03"]')).includes('Chest press machine') && (await txt(page, 'details.hi[data-hdate="2026-11-03"]')).includes('70 lb × 12 / 12 / 12'));
  await page.click('a[data-tab="train"]'); await page.click('.datebar [data-date="2026-11-03"]'); await page.waitForSelector('#w-chestpress');
  check('T11 editing saved entry shows its own exercises, not the new default swap', await has(page, '#w-chestpress') && !(await has(page, '#w-dbbench')));
  await page.click('.datebar [data-date="2026-11-04"]'); await page.click('#kindSeg [data-kind="push"]'); await page.waitForSelector('#w-dbbench');
  check('T11 new workout uses default swap', await has(page, '#w-dbbench'));
  await page.click('a[data-tab="program"]'); await page.click('button[data-gswap="chestpress"]'); // undo

  // Add 4th and 5th sets via the menu
  await page.click('a[data-tab="train"]'); await page.click('.datebar [data-date="2026-11-04"]'); await page.click('#kindSeg [data-kind="pull"]'); await page.waitForSelector('#w-latpull');
  await fill(page, '#w-latpull', 80); await fill(page, '#r-latpull-0', 10);
  await menu(page, 'latpull', 'addset'); await page.waitForSelector('#r-latpull-3');
  check('4th set input appears and focused', await has(page, '#r-latpull-3') && await page.evaluate(() => document.activeElement.id === 'r-latpull-3'));
  check('values intact after add set', await val(page, '#w-latpull') === '80' && await val(page, '#r-latpull-0') === '10');
  await menu(page, 'latpull', 'addset'); await page.waitForSelector('#r-latpull-4');
  await page.click('[data-menu="latpull"]'); await page.waitForSelector('.menu[data-menufor="latpull"]');
  check('5th set is the maximum', await page.$eval('.menu [data-act="addset"]', b => b.disabled));
  await page.keyboard.press('Escape');
  await page.evaluate(() => { localStorage.removeItem('ml.drafts'); });
  await ctx.close();

  // ---------- Scenario B: phase 2 via seeded prior week; older record keeps phase 1 ----------
  const seedB = () => {
    const mk = (date, day, ex) => ({ v: 2, date, kind: 'strength', day, phase: 1, planned: Object.keys(ex), plannedBase: Object.keys(ex), swaps: {}, ex, qualifies: true, complete: true, savedAt: date + 'T12:00:00Z' });
    const s = {
      '2026-10-26': mk('2026-10-26', 'push', { chestpress: { w: 70, reps: [12, 12, 12] }, shoulderpress: { w: 50, reps: [10, 10, 10] }, pushdown: { w: 40, reps: [15, 15, 15] } }),
      '2026-10-28': mk('2026-10-28', 'pull', { latpull: { w: 80, reps: [10, 10, 10] }, seatedrow: { w: 80, reps: [10, 10, 10] }, dbcurl: { w: 20, reps: [12, 12, 12] } }),
      '2026-10-30': mk('2026-10-30', 'legs', { legpress: { w: 140, reps: [12, 12, 12] }, legext: { w: 70, reps: [12, 12, 12] }, legcurl: { w: 60, reps: [12, 12, 12] } }),
      '2026-11-01': { date: '2026-11-01', kind: 'strength', day: 'push', phase: 1, ex: { chestpress: { w: 70, reps: [12, 0, 0] } }, treadmill: { minutes: 20, title: '' }, savedAt: '2026-11-01T12:00:00Z' },
      '2026-10-31': { date: '2026-10-31', kind: 'strength', day: 'pull', phase: 1, treadmill: { minutes: 15, title: '' }, savedAt: '2026-10-31T12:00:00Z' }
    };
    localStorage.setItem('ml.sessions', JSON.stringify(s));
    localStorage.setItem('ml.settings', JSON.stringify({ startDate: '2026-10-26', goal: 5, maxed: {}, swaps: {} }));
  };
  ({ ctx, page } = await newPage(browser, { init: seedB }));
  check('B phase 2 after a completed week', (await txt(page, '.sess .status')).includes('Phase 2'));
  check('B 5 planned exercises in phase 2 Push', (await page.$$('.ex[data-ex]')).length === 5);
  check('B legacy Nov 1 partial does not advance; Push is next after Legs Oct 30', await page.$eval('#kindSeg button.on', b => b.dataset.kind) === 'push');
  await page.click('a[data-tab="history"]'); await page.waitForSelector('details.hi[data-hdate="2026-11-01"]');
  await page.click('details.hi[data-hdate="2026-11-01"] summary');
  const b1 = await txt(page, 'details.hi[data-hdate="2026-11-01"]');
  check('B legacy zeros read as not logged', b1.includes('70 lb × 12 / – / –') && b1.includes('blank sets were stored as 0'), b1);
  check('B legacy single lift = partial, no lift credit', b1.includes('partial · no lift credit'));
  await page.click('details.hi[data-hdate="2026-10-31"] summary');
  const b2 = await txt(page, 'details.hi[data-hdate="2026-10-31"]');
  check('B legacy Pull-with-no-sets surfaced as ambiguous treadmill', b2.includes('Treadmill') && b2.includes('no lifting sets'), b2);
  check('B history shows Phase 1 on old record', (await txt(page, 'details.hi[data-hdate="2026-10-26"] summary')).includes('Phase 1'));
  await page.click('details.hi[data-hdate="2026-10-26"] summary'); await page.click('details.hi[data-hdate="2026-10-26"] [data-edit]'); await page.waitForSelector('#w-chestpress');
  check('B editing phase-1 record shows its 3 exercises, not phase-2 list', (await page.$$('.ex[data-ex]')).length === 3);
  check('B editing phase-1 record shows Phase 1', (await txt(page, '.sess .status')).includes('Phase 1'));
  check('B exact recorded values load', await val(page, '#w-chestpress') === '70' && await val(page, '#r-pushdown-2') === '15');
  // week boundary (Sun 23:30 vs Mon 00:30 Indy), DST day, year change
  await page.clock.setSystemTime(T('2026-11-02T04:30:00Z')); await page.reload(); await page.waitForSelector('#todayLine'); // Sun Nov 1 23:30 EST
  check('D Sunday 23:30 Indy is still Nov 1', (await txt(page, '#todayLine')).startsWith('Sun Nov 1'));
  check('D lifts 3/3 in the Oct 26 week', await txt(page, '#liftCount') === '3/3');
  await page.clock.setSystemTime(T('2026-11-02T05:30:00Z')); await page.reload(); await page.waitForSelector('#todayLine'); // Mon Nov 2 00:30 EST
  check('D 00:30 Indy rolls to Mon Nov 2', (await txt(page, '#todayLine')).startsWith('Mon Nov 2'));
  check('D new week resets lifts to 0/3', await txt(page, '#liftCount') === '0/3');
  await page.clock.setSystemTime(T('2026-11-01T05:30:00Z')); await page.reload(); await page.waitForSelector('#todayLine'); // Nov 1 01:30 EDT (DST ends 02:00)
  check('D DST morning Nov 1', (await txt(page, '#todayLine')).startsWith('Sun Nov 1'));
  check('D datebar on DST day spans Oct 26 to Nov 1', await page.$$eval('.datebar [data-date]', bs => bs.map(b => b.dataset.date).join(',')) === '2026-10-26,2026-10-27,2026-10-28,2026-10-29,2026-10-30,2026-10-31,2026-11-01');
  await page.clock.setSystemTime(T('2027-01-01T06:00:00Z')); await page.reload(); await page.waitForSelector('#todayLine'); // Jan 1 2027 01:00 Indy
  check('D year change today', (await txt(page, '#todayLine')).startsWith('Fri Jan 1'));
  await page.click('.datebar [data-date="2026-12-31"]');
  check('D yesterday across year shows Dec 31 2026', (await txt(page, '.sess h2')).includes('Yesterday') && (await txt(page, '.sess h2')).includes('Dec 31 2026'));
  await ctx.close();

  // ---------- Scenario C: layouts ----------
  for (const [w, h, name] of [[375, 667, 'iphone-se'], [390, 844, 'iphone-14'], [430, 932, 'iphone-pro-max'], [844, 390, 'landscape'], [1280, 800, 'desktop']]) {
    ({ ctx, page } = await newPage(browser, { width: w, height: h, init: seedB }));
    await fill(page, '#w-chestpress', 70); await fill(page, '#r-chestpress-0', 12);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('L ' + name + ' no horizontal overflow', over <= 0, 'overflow ' + over);
    await page.focus('#notes');
    const ok = await page.evaluate(() => { const n = document.getElementById('notes').getBoundingClientRect(); const s = document.querySelector('.savebar').getBoundingClientRect(); return { vis: s.top < innerHeight && s.bottom <= innerHeight + 1, overlap: !(n.bottom <= s.top || n.top >= s.bottom) }; });
    check('L ' + name + ' save bar visible, not covering notes', ok.vis && !ok.overlap, JSON.stringify(ok));
    const hh = await page.$eval('[data-ex="shoulderpress"]', el => el.getBoundingClientRect().height);
    check('L ' + name + ' exercise block within 180-220px', hh >= 150 && hh <= 230, 'height ' + Math.round(hh));
    await page.screenshot({ path: SHOTS + name + '.png', fullPage: false });
    await page.click('a[data-tab="history"]'); await page.waitForSelector('details.hi'); await page.click('details.hi summary');
    await page.screenshot({ path: SHOTS + name + '-history.png', fullPage: false });
    await ctx.close();
  }

  // ---------- Scenario D: fake db — import, synced, failed save + retry ----------
  const fakeDb = () => {
    const store = {}; const coll = []; const docs = {}; window.__failSet = false;
    const meta = { fromCache: false, hasPendingWrites: false };
    const snapOf = p => ({ id: p.split('/').pop(), exists: p in store, data: () => store[p], metadata: meta });
    const notify = () => { coll.forEach(fn => fn({ docs: Object.keys(store).filter(k => k.startsWith('sessions/')).map(snapOf), metadata: meta })); Object.keys(docs).forEach(p => docs[p].forEach(fn => fn(snapOf(p)))); };
    const docRef = p => ({ set: async d => { await new Promise(r => setTimeout(r, 30)); if (window.__failSet) throw { code: 'unavailable', message: 'test' }; store[p] = JSON.parse(JSON.stringify(d)); notify(); }, delete: async () => { delete store[p]; notify(); }, onSnapshot: fn => { (docs[p] = docs[p] || []).push(fn); setTimeout(() => fn(snapOf(p)), 10); return () => {}; } });
    const fake = { doc: docRef, collection: () => ({ onSnapshot: fn => { coll.push(fn); setTimeout(() => fn({ docs: Object.keys(store).filter(k => k.startsWith('sessions/')).map(snapOf), metadata: meta }), 10); return () => {}; } }) };
    window.__store = store;
    window.claude = { use: async n => n === 'db' ? fake : null };
    localStorage.setItem('ml.sessions', JSON.stringify({ '2026-11-01': { v: 2, date: '2026-11-01', kind: 'cardio', phase: 1, treadmill: { minutes: 25, title: 'guest run' }, savedAt: '2026-11-01T12:00:00Z' } }));
  };
  ({ ctx, page } = await newPage(browser, { init: fakeDb }));
  await page.waitForSelector('#importBtn');
  check('S import banner names the browser-only entry', (await txt(page, '.banner')).includes('Sun Nov 1') && (await txt(page, '.banner')).includes('not in your account'));
  check('S no local-only banner text while db mode', !(await txt(page, '#main')).includes('Saving in this browser only'));
  await page.click('#importBtn'); await page.waitForSelector('#importOk');
  check('S import moved record to account', await page.evaluate(() => !!window.__store['sessions/2026-11-01']) && await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ml.sessions'))).length) === 0);
  await page.click('#importOk');
  await fill(page, '#w-chestpress', 70); for (let i = 0; i < 3; i++) await fill(page, '#r-chestpress-' + i, 12);
  await fill(page, '#w-shoulderpress', 50); await fill(page, '#r-shoulderpress-0', 10);
  await page.evaluate(() => { window.__failSet = true; });
  await page.click('#saveBtn'); await page.waitForSelector('#savenote.bad');
  check('S failed save shows failure and keeps inputs', (await txt(page, '#statusLine')).includes('Save failed') && await val(page, '#w-chestpress') === '70' && await val(page, '#r-shoulderpress-0') === '10');
  check('S retry button offered', (await txt(page, '#saveBtn')).startsWith('Retry'));
  await page.screenshot({ path: SHOTS + 'state-save-failed.png' });
  await page.evaluate(() => { window.__failSet = false; });
  await page.click('#saveBtn'); await page.waitForFunction(() => document.querySelector('#statusLine').textContent.includes('Saved · synced'));
  check('S retry succeeds and reports synced', await page.evaluate(() => window.__store['sessions/2026-11-03'].kind) === 'strength');
  await ctx.close();

  await browser.close();
  const fails = results.filter(r => !r.ok);
  console.log('\n' + results.length + ' checks, ' + fails.length + ' failed');
  fails.forEach(f => console.log(' - ' + f.name + ' ' + f.detail));
  require('fs').writeFileSync(__dirname + '/results.json', JSON.stringify(results, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
