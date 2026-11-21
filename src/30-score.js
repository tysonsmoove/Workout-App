/* ---------- Weekly targets, locked per week ---------- */
// Each person's targets are frozen for a week the first time the app is opened in it (profiles/<pid>/weekgoals/<monday>).
// Everything that scores a week reads that snapshot, so changing a goal, a workout style or body numbers mid-week
// cannot move this week's race: the change starts next Monday. The earliest snapshot wins and is never rewritten,
// with one exception: a week locked on placeholder calorie targets takes the person's first real ones right away.
const RULES_V2_FROM = '2026-11-23';     // the first Monday scored with protein in Fuel (scoring version 2)
const LEGACY_STAKES_WS = '2026-11-16';  // stakes saved before they were kept per week belong to this week
const scoringFor = ws => ws >= RULES_V2_FROM ? 2 : 1;
const planOf = pid => P(pid).plan === 'program' ? 'program' : 'choice';
function liveGoals(pid) { // what the settings say right now: the numbers next week will lock
  return cached('lg:' + pid, () => {
    const p = P(pid), g = goalsFor(pid), plan = planOf(pid);
    return { plan, goal: plan === 'program' ? clamp(state.data[pid].settings.goal || GOAL, 3, 7) : clamp(p.move.goalDays || 3, 1, 7), liftGoal: LIFT_GOAL,
      minMin: plan === 'program' ? 10 : clamp(p.move.minMinutes || 10, 5, 60), kcal: g.kcal, lo: g.lo, hi: g.hi, waterOz: g.waterOz, protein: g.protein, placeholder: !g.ready };
  });
}
function weekGoals(pid, ws) { // the targets a week is scored against
  return cached('wg:' + pid + ':' + ws, () => {
    const all = state.data[pid].weekgoals || {}, live = liveGoals(pid), cur = weekStart(todayIso());
    let s = all[ws]; const exact = !!s;
    // a past week from before targets were locked: the earliest lock after it stands in, so it never moves again
    if (!s && ws < cur) { const later = Object.keys(all).filter(k => validIso(k) && k > ws).sort()[0]; if (later) s = all[later]; }
    const num = (k, lo, hi) => s && isNum(s[k]) ? clamp(s[k], lo, hi) : live[k];
    const g = { ws, locked: exact, plan: s && (s.plan === 'program' || s.plan === 'choice') ? s.plan : live.plan, goal: num('goal', 1, 7), liftGoal: num('liftGoal', 1, 7), minMin: num('minMin', 5, 60) };
    const nut = s && !(s.placeholder && !live.placeholder) ? s : null; // locked on placeholders: the first real targets apply right away
    ['kcal', 'lo', 'hi', 'waterOz', 'protein'].forEach(k => { g[k] = nut && isNum(nut[k]) && nut[k] > 0 ? nut[k] : live[k]; });
    g.placeholder = nut ? !!nut.placeholder : live.placeholder;
    g.scoring = exact && isNum(s.scoring) ? s.scoring : scoringFor(ws);
    return g;
  });
}
const thisWeek = pid => weekGoals(pid, weekStart(todayIso()));
const minMin = pid => thisWeek(pid).minMin;   // minutes that make a day count, this week
const moveGoal = pid => thisWeek(pid).goal;   // active days that fill Move, this week
const nextMonday = () => addDays(weekStart(todayIso()), 7);
const startsNote = () => 'Starts ' + nice(nextMonday());
const macroGuide = (kcal, protein) => { const fat = Math.round(kcal * 0.3 / 9); return { fat, carbs: Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4)) }; };
// Creates missing snapshots: this week, plus any finished week whose result is not final yet. Never called from render.
async function lockWeeks() {
  if (!state.ready || state.cantWrite) return;
  const cur = weekStart(todayIso()), weeks = [cur].concat(compWeeks().filter(w => !w.final).map(w => w.ws)).filter((w, i, a) => a.indexOf(w) === i);
  for (const pid of PIDS) for (const ws of weeks) {
    const path = PATH.weekgoal(pid, ws), have = getDoc(path), l = liveGoals(pid), now = new Date().toISOString();
    try {
      if (!have) await put(path, { v: 1, ws, plan: l.plan, goal: l.goal, liftGoal: l.liftGoal, minMin: l.minMin, kcal: l.kcal, lo: l.lo, hi: l.hi, waterOz: l.waterOz, protein: l.protein, placeholder: l.placeholder, scoring: scoringFor(ws), lockedAt: now });
      else if (have.placeholder && !l.placeholder) await put(path, Object.assign({}, have, { kcal: l.kcal, lo: l.lo, hi: l.hi, waterOz: l.waterOz, protein: l.protein, placeholder: false, targetsAt: now }));
    } catch (e) { return; }
  }
}

/* ---------- Weekly score: each person is measured against their own goals ---------- */
// Move 50 + Fuel 20 + Water 15 + Bonus 15 = 100. A 10-minute walk that completes Jacquie's day is worth
// exactly what a lift day is worth to Tyson, because both are a share of a personal weekly goal.
const blankInfo = () => ({ active: false, lift: false, minutes: 0, kinds: [], rest: false, logged: false, hk: false });
const actKind = a => a.a === 'other' ? 'other:' + String(a.name || '').toLowerCase() : a.a;
function dayInfo(pid, date) {
  return cached('di:' + pid + ':' + date, () => {
    const rec = state.data[pid].sessions[date]; const o = blankInfo(); if (!rec) return o;
    const n = normalize(rec), moving = n.acts.filter(a => a.mv !== false); o.logged = n.kind !== 'empty';
    // the Watch top-up is minutes, not a kind of activity: it never earns variety
    const kinds = Array.from(new Set(moving.filter(a => !isHk(a)).map(actKind))); o.hk = moving.some(isHk);
    o.minutes = n.minutes;
    if (n.kind === 'rest') o.rest = true;
    else if (n.kind === 'strength') { o.active = true; o.lift = n.qualifies; o.kinds = [n.day || 'lift'].concat(n.tm && n.tm.minutes > 0 ? ['treadmill'] : [], kinds); }
    else if (n.kind === 'cardio') { o.active = true; o.kinds = ['treadmill'].concat(kinds); }
    else if (n.kind === 'activity') { o.active = n.minutes >= weekGoals(pid, weekStart(date)).minMin; o.kinds = kinds; }
    return o;
  });
}
function weekFacts(pid, ws) {
  return cached('wf:' + pid + ':' + ws, () => {
    const t = todayIso(), days = [], g = weekGoals(pid, ws);
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i), future = d > t, di = future ? blankInfo() : dayInfo(pid, d), fp = future ? { cal: 0, prot: 0 } : fuelParts(pid, d);
      // weeks scored under the first rules keep counting an imported Watch entry as its own kind, as they did then
      days.push({ date: d, future, active: di.active, lift: di.lift, minutes: di.minutes, kinds: di.kinds.concat(g.scoring < 2 && di.hk ? ['other:apple watch exercise'] : []), rest: di.rest, cal: fp.cal, prot: fp.prot, water: future ? 0 : waterFrac(pid, d) });
    }
    let lastMin = 0; for (let i = 1; i <= 7; i++) lastMin += dayInfo(pid, addDays(ws, -i)).minutes;
    return { pid, ws, plan: g.plan, goal: g.goal, liftGoal: g.liftGoal, scoring: g.scoring, days, lastMin };
  });
}
// Fuel for one day. Scoring 1: the calorie range is the whole day. Scoring 2: 0.7 for the calorie range, 0.3 for protein.
const fuelDay = (f, d) => f.scoring >= 2 ? 0.7 * d.cal + 0.3 * d.prot : d.cal;
function scoreFacts(f) {
  const active = f.days.filter(d => d.active).length, lifts = f.days.filter(d => d.lift).length, minutes = sum(f.days, d => d.minutes), liftGoal = f.liftGoal || LIFT_GOAL;
  const kinds = new Set(); f.days.forEach(d => d.kinds.forEach(k => kinds.add(k)));
  const move = f.plan === 'program' ? 30 * Math.min(1, active / f.goal) + 20 * Math.min(1, lifts / liftGoal) : 50 * Math.min(1, active / f.goal);
  const fuel = 20 * Math.min(1, Math.round(sum(f.days, d => fuelDay(f, d)) * 100) / 100 / 5);
  const water = 15 * Math.min(1, sum(f.days, d => d.water) / 5);
  const pb = minutes > 0 && minutes > f.lastMin ? 5 : 0, variety = kinds.size >= 3 ? 5 : 0, weekend = (f.days[5].active || f.days[6].active) ? 5 : 0;
  const raw = move + fuel + water + pb + variety + weekend;
  return { move, fuel, water, bonus: pb + variety + weekend, pb, variety, weekend, raw, total: Math.round(raw), active, lifts, minutes, kinds: kinds.size, moveFull: move >= 49.99 };
}
const weekScore = (pid, ws) => scoreFacts(weekFacts(pid, ws || weekStart(todayIso())));
const cloneFacts = f => Object.assign({}, f, { days: f.days.map(d => Object.assign({}, d, { kinds: d.kinds.slice() })) });
// what is left to fill a person's Move score this week, in words ('' when it is full)
function moveNeed(pid, ws) {
  const f = weekFacts(pid, ws), sc = scoreFacts(f), a = Math.max(0, f.goal - sc.active), l = f.plan === 'program' ? Math.max(0, f.liftGoal - sc.lifts) : 0, bits = [];
  if (a) bits.push(a + ' more ' + (f.plan === 'program' ? 'activity' : 'active') + ' day' + (a === 1 ? '' : 's'));
  if (l) bits.push(l + ' more lift day' + (l === 1 ? '' : 's'));
  return bits.join(' and ');
}

/* ---------- Coach: what would add points, and by how much ---------- */
function coach(pid) {
  const t = todayIso(), ws = weekStart(t), f = weekFacts(pid, ws), base = scoreFacts(f), i = (dow(t) + 6) % 7, d = f.days[i], g = weekGoals(pid, ws), tot = dayTotals(pid, t), tips = [];
  const add = (group, text, sub, tab, mut) => { const c = cloneFacts(f); mut(c); const gain = scoreFacts(c).total - base.total; if (gain > 0) tips.push({ group, text, sub, tab, gain, mut }); };
  if (!d.active) {
    if (f.plan === 'program') {
      const k = nextDayKey(t, pid);
      add('move', 'Log your ' + DAYS[k].name + ' lift day', 'Treadmill plus at least ' + QUALIFY_MIN + ' lifts', 'train', c => { const x = c.days[i]; x.active = true; x.lift = true; x.minutes += 45; x.kinds = x.kinds.concat([k, 'treadmill']); });
      add('move', 'Treadmill only today', 'Any Fitness+ treadmill workout, or a ' + g.minMin + '-minute walk', 'train', c => { const x = c.days[i]; x.active = true; x.minutes += 20; x.kinds = x.kinds.concat(['treadmill']); });
    } else {
      const need = Math.max(1, g.minMin - d.minutes);
      // no new kind is assumed here: repeating something already done this week earns no variety bonus
      add('move', d.minutes ? need + ' more minutes of movement today' : 'Move for ' + g.minMin + ' minutes today', 'A walk, a stretch, anything on your list', 'train', c => { const x = c.days[i]; x.active = true; x.minutes += need; });
    }
  }
  if (f.plan !== 'program' && !base.variety && base.kinds === 2) add('variety', 'Try something you have not done this week', 'A third kind of activity earns the variety bonus', 'train', c => { c.days[i].kinds.push('__new'); });
  if (!base.pb && f.lastMin > 0) { const need = f.lastMin - base.minutes + 1; add('pb', need + ' more active minutes this week', 'Beats last week\'s ' + f.lastMin + ' minutes', 'train', c => { c.days[i].minutes += need; }); }
  if (d.water < 1) { const need = Math.max(1, Math.ceil(g.waterOz - tot.water)); add('water', 'Drink ' + need + ' more oz of water', 'Reaches today\'s ' + g.waterOz + ' oz', 'fuel', c => { c.days[i].water = 1; }); }
  const overToday = tot.kcal > g.hi; // already past the range: nothing eaten later can bring today back into it
  if (d.cal < 1 && !overToday) add('fuel', 'Log today\'s food and land in range', commas(g.lo) + ' to ' + commas(g.hi) + ' calories', 'fuel', c => { c.days[i].cal = 1; });
  if (f.scoring >= 2 && d.prot < 1) { const need = Math.max(1, Math.ceil(g.protein - tot.n[1])); add('protein', 'Eat ' + need + ' g more protein today', 'Reaches your ' + g.protein + ' g target', 'fuel', c => { c.days[i].prot = 1; }); }
  tips.sort((a, b) => b.gain - a.gain);
  // best case from here: every remaining day goes perfectly
  const best = cloneFacts(f);
  best.days.forEach((x, j) => { if (j >= i) { x.active = true; if (f.plan === 'program') x.lift = true; x.minutes += 30; if (!(j === i && overToday)) x.cal = 1; x.prot = 1; x.water = 1; x.kinds.push('__k' + j); } });
  const bestMin = sum(best.days, x => x.minutes); if (bestMin <= f.lastMin) best.days[i].minutes += f.lastMin - bestMin + 1; // a perfect finish also beats last week's minutes
  const max = scoreFacts(best).total;
  // shortest list of today's actions that passes the other profile
  const op = otherPid(pid), other = weekScore(op, ws).total; let plan = null;
  if (base.total <= other) {
    const c = cloneFacts(f), used = [], seen = {};
    for (const tip of tips) { if (seen[tip.group]) continue; seen[tip.group] = 1; tip.mut(c); used.push(tip); if (scoreFacts(c).total > other) { plan = { used, total: scoreFacts(c).total }; break; } }
  }
  // the race you can both win: each filling your own Move score in the same week
  const theirs = weekScore(op, ws).moveFull, open = k => f.days.filter((x, j) => j >= i && !x[k]).length; // days from today on that could still count
  const can = base.moveFull || (Math.max(0, f.goal - base.active) <= open('active') && (f.plan !== 'program' || Math.max(0, f.liftGoal - base.lifts) <= open('lift')));
  const team = { mine: base.moveFull, theirs, can, locked: (base.moveFull ? 1 : 0) + (theirs ? 1 : 0), need: moveNeed(pid, ws), theirNeed: moveNeed(op, ws) };
  return { base, tips, max, other, plan, daysLeft: 6 - i, team, outOfReach: base.total < other && max <= other };
}

/* ---------- Competition history ---------- */
function compStart() {
  if (state.comp.start && validIso(state.comp.start)) return weekStart(state.comp.start);
  // no start on record: the race begins the first week in which both of you logged something, so solo weeks before it never count
  const weeksOf = pid => new Set(Object.keys(state.data[pid].sessions).concat(Object.keys(state.data[pid].food)).filter(validIso).map(weekStart));
  const a = weeksOf('tyson'), b = weeksOf('jacquie'), both = Array.from(a).filter(w => b.has(w)).sort();
  return both.length ? both[0] : weekStart(todayIso());
}
const GRACE_DAYS = 2; // a finished week stays open for late entries through Tuesday, then its result is final
const finalResult = ws => { const r = state.results[ws]; return r && isNum(r.tyson) && isNum(r.jacquie) ? r : null; };
// What is on the line belongs to one week. A closed week carries its own copy; an open one reads the shared settings.
function stakesFor(ws) {
  const r = finalResult(ws); if (r) return typeof r.stakes === 'string' ? r.stakes : '';
  const by = state.comp.stakesBy; if (by && typeof by === 'object') return typeof by[ws] === 'string' ? by[ws] : '';
  return ws === LEGACY_STAKES_WS && typeof state.comp.stakes === 'string' ? state.comp.stakes : '';
}
function liveWeek(ws) {
  const a = weekScore('tyson', ws).total, b = weekScore('jacquie', ws).total;
  return { ws, tyson: a, jacquie: b, winner: a === b ? null : a > b ? 'tyson' : 'jacquie', played: a + b > 0, final: false, stakes: stakesFor(ws) };
}
function compWeeks() { // finished weeks, oldest first: the stored final result where there is one, otherwise worked out from the logs
  return cached('compWeeks', () => {
    const cur = weekStart(todayIso()), out = []; let ws = compStart(), guard = 0;
    while (ws < cur && guard++ < 156) { const r = finalResult(ws); out.push(r ? Object.assign({ ws, played: r.tyson + r.jacquie > 0 }, r, { final: true, stakes: stakesFor(ws) }) : liveWeek(ws)); ws = addDays(ws, 7); }
    return out;
  });
}
// Stores the result of each week whose late-entry window has passed, with what was on the line and whether it was a
// team week, so nothing later can rewrite it. A stored result is never touched again. Returns how many it stored.
async function closeWeeks() {
  const t = todayIso(); let n = 0;
  for (const w of compWeeks()) {
    if (w.final || t < addDays(w.ws, 7 + GRACE_DAYS)) continue;
    const doc = { ws: w.ws, tyson: w.tyson, jacquie: w.jacquie, winner: w.winner, played: w.played, final: true, teamWeek: teamWeekLive(w.ws), closedAt: new Date().toISOString() };
    if (w.stakes) doc.stakes = w.stakes;
    try { await put('results/' + w.ws, doc); n++; } catch (e) { return n; }
  }
  return n;
}
const leadLine = w => w.winner ? P(w.winner).name + ' leads ' + Math.max(w.tyson, w.jacquie) + '–' + Math.min(w.tyson, w.jacquie) : 'tied at ' + w.tyson;
const provisionalText = w => 'Provisional: ' + leadLine(w) + ' · late entries count through Tuesday';
// who owes what for a finished week, in words ('' when nothing was on the line)
function stakesLine(w) {
  if (!w.stakes) return '';
  if (!w.final) return 'On the line: ' + w.stakes;
  return w.winner ? P(w.winner).name + ' won · ' + P(otherPid(w.winner)).name + ' owes: ' + w.stakes : 'Tied · on the line was: ' + w.stakes;
}

/* ---------- Team: the race you win together ---------- */
const teamWeekLive = ws => PIDS.every(p => weekScore(p, ws).moveFull);
const isTeamWeek = ws => { const r = finalResult(ws); return r && typeof r.teamWeek === 'boolean' ? r.teamWeek : teamWeekLive(ws); };
function countdown() { // the shared date you are both working toward
  const c = state.comp.countdown; if (!c || !validIso(c.date)) return null;
  const label = String(c.label || '').trim() || 'Wedding', days = Math.round((toUTC(c.date) - toUTC(todayIso())) / 86400000);
  return { date: c.date, label, days, setWs: validIso(c.setAt) ? weekStart(c.setAt) : null, phrase: label.toLowerCase() === 'wedding' ? 'the wedding' : label };
}
function teamStats() {
  return cached('team', () => {
    const cur = weekStart(todayIso()), done = compWeeks().map(w => w.ws), locked = PIDS.filter(p => weekScore(p, cur).moveFull).length, all = done.filter(isTeamWeek).concat(locked === 2 ? [cur] : []);
    let streak = locked === 2 ? 1 : 0; for (let i = done.length - 1; i >= 0 && isTeamWeek(done[i]); i--) streak++;
    let best = 0, run = 0; done.concat([cur]).forEach(ws => { run = all.includes(ws) ? run + 1 : 0; best = Math.max(best, run); });
    const cd = countdown();
    return { locked, streak, best, total: all.length, banked: cd && cd.setWs ? all.filter(ws => ws >= cd.setWs).length : null };
  });
}

/* ---------- Achievements: all derived from the saved logs ---------- */
function liftPR(pid) {
  const first = {}; let pr = false;
  recordsOf(pid).forEach(r => Object.keys(r.n.ex).forEach(k => {
    const w = r.n.ex[k].w; if (w == null || !EX[k] || EX[k].bw) return;
    if (!(k in first)) first[k] = w; else if (EX[k].inc < 0 ? w < first[k] : w > first[k]) pr = true;
  }));
  return pr;
}
function statsFor(pid) {
  return cached('stats:' + pid, () => {
    const recs = recordsOf(pid), t = todayIso(), other = otherPid(pid), food = state.data[pid].food;
    const activeDates = recs.filter(r => dayInfo(pid, r.date).active).map(r => r.date);
    const s = { activeDays: activeDates.length, minutes: sum(recs, r => dayInfo(pid, r.date).minutes), liftDays: recs.filter(r => r.n.qualifies).length, restDays: recs.filter(r => r.n.kind === 'rest').length,
      three: false, goalWeeks: 0, goalRun: 0, bestScore: 0, water5: false, fuel5: false, triple: false, teamDay: false, teamWeek: false };
    let run = 0, prev = null; s.streak = 0; s.comeback = false;
    activeDates.forEach(d => { run = prev && addDays(prev, 1) === d ? run + 1 : 1; if (prev && toUTC(d) - toUTC(prev) >= 8 * 86400000) s.comeback = true; s.streak = Math.max(s.streak, run); prev = d; });
    const kinds = new Set(); recs.forEach(r => dayInfo(pid, r.date).kinds.forEach(k => kinds.add(k))); s.kinds = kinds.size;
    s.rotation = ROTATION.filter(k => recs.some(r => r.n.qualifies && r.n.day === k)).length;
    const fdates = Object.keys(food).filter(validIso).sort();
    s.foodDays = fdates.filter(d => (food[d].items || []).length).length;
    s.waterDays = fdates.filter(d => waterFrac(pid, d) >= 1).length;
    const firstDate = [recs.length ? recs[0].date : t, fdates.length ? fdates[0] : t].sort()[0];
    let ws = weekStart(firstDate), grun = 0, guard = 0; const cur = weekStart(t);
    while (ws <= cur && guard++ < 156) {
      const f = weekFacts(pid, ws), sc = scoreFacts(f), of = weekFacts(other, ws);
      if (sc.active >= 3) s.three = true;
      if (sc.moveFull) { s.goalWeeks++; grun++; s.goalRun = Math.max(s.goalRun, grun); } else if (ws < cur) grun = 0;
      s.bestScore = Math.max(s.bestScore, sc.total);
      if (f.days.filter(d => d.water >= 1).length >= 5) s.water5 = true;
      if (f.days.filter(d => d.cal >= 1).length >= 5) s.fuel5 = true;
      if (f.days.some(d => d.active && d.cal >= 1 && d.water >= 1)) s.triple = true;
      if (f.days.some((d, j) => d.active && of.days[j].active)) s.teamDay = true;
      if (sc.moveFull && scoreFacts(of).moveFull) s.teamWeek = true;
      ws = addDays(ws, 7);
    }
    const weeks = compWeeks().filter(w => w.final); // a win is a win once the week is final; a provisional lead can still flip
    s.wins = weeks.filter(w => w.winner === pid).length;
    s.photo = weeks.some(w => w.tyson > 0 && w.jacquie > 0 && Math.abs(w.tyson - w.jacquie) <= 3);
    s.pr = liftPR(pid); s.phase = phaseFor(t, pid); s.teamRun = teamStats().best;
    return s;
  });
}
// plan: only shown for that workout style. has: earned. prog: short progress text while locked.
const BADGES = [
  { id: 'green', icon: '🟢', name: 'Green Flag', desc: 'Log your first active day.', has: s => s.activeDays >= 1 },
  { id: 'three', icon: '3️⃣', name: 'Hat Trick', desc: 'Three active days in one week.', has: s => s.three },
  { id: 'goal', icon: '🎯', name: 'Goal Week', desc: 'Fill your whole Move score in a week.', has: s => s.goalWeeks >= 1 },
  { id: 'goal2', icon: '🔁', name: 'Back-to-Back', desc: 'Two goal weeks in a row.', has: s => s.goalRun >= 2, prog: s => s.goalRun + '/2' },
  { id: 'goal4', icon: '🏆', name: 'Four-Time Winner', desc: 'Four goal weeks in a row.', has: s => s.goalRun >= 4, prog: s => s.goalRun + '/4' },
  { id: 'streak3', icon: '🔥', name: 'Three in a Row', desc: 'Active three days straight.', has: s => s.streak >= 3, prog: s => s.streak + '/3' },
  { id: 'comeback', icon: '🪃', name: 'Bounce Back', desc: 'Get moving again after a week or more away.', has: s => s.comeback },
  { id: 'rest', icon: '🛌', name: 'Smart Rest', desc: 'Log a rest day. Recovery is part of the plan.', has: s => s.restDays >= 1 },
  { id: 'min100', icon: '💯', name: 'Century', desc: '100 active minutes logged.', has: s => s.minutes >= 100, prog: s => Math.min(s.minutes, 100) + '/100' },
  { id: 'min500', icon: '🏁', name: 'The 500', desc: '500 active minutes logged.', has: s => s.minutes >= 500, prog: s => Math.min(s.minutes, 500) + '/500' },
  { id: 'min1500', icon: '🛣️', name: 'Long Haul', desc: '1,500 active minutes logged.', has: s => s.minutes >= 1500, prog: s => Math.min(s.minutes, 1500) + '/1,500' },
  { id: 'sampler', plan: 'choice', icon: '🎨', name: 'Sampler', desc: 'Try five different activities.', has: s => s.kinds >= 5, prog: s => Math.min(s.kinds, 5) + '/5' },
  { id: 'lift1', plan: 'program', icon: '🏋️', name: 'First Lift Day', desc: 'Log a counted lift day.', has: s => s.liftDays >= 1 },
  { id: 'rotation', plan: 'program', icon: '🔄', name: 'Full Rotation', desc: 'Complete a Push, a Pull and a Legs day.', has: s => s.rotation >= 3, prog: s => s.rotation + '/3' },
  { id: 'pr', plan: 'program', icon: '📈', name: 'Moved Up', desc: 'Raise the weight on any lift.', has: s => s.pr },
  { id: 'phase2', plan: 'program', icon: '🔓', name: 'Phase 2', desc: 'Complete a three-lift week and unlock Phase 2.', has: s => s.phase >= 2 },
  { id: 'water1', icon: '💧', name: 'First Fill', desc: 'Reach your water goal for a day.', has: s => s.waterDays >= 1 },
  { id: 'water5', icon: '🥛', name: 'Winner\'s Milk', desc: 'Reach your water goal five days in one week.', has: s => s.water5 },
  { id: 'fuel1', icon: '🍎', name: 'First Bite', desc: 'Log a food.', has: s => s.foodDays >= 1 },
  { id: 'fuel7', icon: '📓', name: 'Food Journal', desc: 'Log food on seven different days.', has: s => s.foodDays >= 7, prog: s => Math.min(s.foodDays, 7) + '/7' },
  { id: 'fuel5', icon: '🎚️', name: 'Dialed In', desc: 'Land in your calorie range five days in one week.', has: s => s.fuel5 },
  { id: 'triple', icon: '👑', name: 'Triple Crown', desc: 'Move, calorie range and water goal on the same day.', has: s => s.triple },
  { id: 'score90', icon: '⭐', name: 'Near-Perfect Lap', desc: 'Score 90 or more in a week.', has: s => s.bestScore >= 90, prog: s => 'best ' + s.bestScore },
  { id: 'win1', icon: '🥇', name: 'Checkered Flag', desc: 'Win a weekly competition.', has: s => s.wins >= 1 },
  { id: 'win3', icon: '🍾', name: 'Podium Regular', desc: 'Win three weekly competitions.', has: s => s.wins >= 3, prog: s => s.wins + '/3' },
  { id: 'photo', icon: '📸', name: 'Photo Finish', desc: 'A week decided by three points or fewer.', has: s => s.photo },
  { id: 'teamday', icon: '🤝', name: 'Team Day', desc: 'Both of you active on the same day.', has: s => s.teamDay },
  { id: 'teamweek', icon: '💞', name: 'Double Podium', desc: 'Both of you fill your Move score in the same week.', has: s => s.teamWeek },
  { id: 'team2', icon: '🚥', name: 'Two-Week Tandem', desc: 'Two team weeks in a row: both Move scores filled, back to back.', has: s => s.teamRun >= 2, prog: s => Math.min(s.teamRun, 2) + '/2' },
  { id: 'team4', icon: '💍', name: 'Four-Week Tandem', desc: 'Four team weeks in a row.', has: s => s.teamRun >= 4, prog: s => Math.min(s.teamRun, 4) + '/4' }
];
function badgesFor(pid) { // earned = true now, or recorded on the profile earlier: a badge once earned is kept
  const s = statsFor(pid), p = P(pid), kept = p.badges;
  return BADGES.filter(b => !b.plan || b.plan === p.plan || kept[b.id]).map(b => { const live = !!b.has(s), earned = live || !!kept[b.id]; return { id: b.id, icon: b.icon, name: b.name, desc: b.desc, earned, live, since: kept[b.id] || null, prog: !earned && b.prog ? b.prog(s) : '' }; });
}
