/* ---------- Weekly score: each person is measured against their own goals ---------- */
// Move 50 + Fuel 20 + Water 15 + Bonus 15 = 100. A 10-minute walk that completes Jacquie's day is worth
// exactly what a lift day is worth to Tyson, because both are a share of a personal weekly goal.
const blankInfo = () => ({ active: false, lift: false, minutes: 0, kinds: [], rest: false, logged: false });
const minMin = pid => clamp(P(pid).move.minMinutes || 10, 5, 60);
function moveGoal(pid) { const p = P(pid); return p.plan === 'program' ? clamp(state.data[pid].settings.goal || GOAL, 3, 7) : clamp(p.move.goalDays || 3, 1, 7); }
function dayInfo(pid, date) {
  return cached('di:' + pid + ':' + date, () => {
    const rec = state.data[pid].sessions[date]; const o = blankInfo(); if (!rec) return o;
    const n = normalize(rec); o.logged = n.kind !== 'empty';
    if (n.kind === 'rest') o.rest = true;
    else if (n.kind === 'strength') { o.active = true; o.lift = n.qualifies; o.minutes = n.minutes; o.kinds = [n.day || 'lift'].concat(n.tm && n.tm.minutes > 0 ? ['treadmill'] : []); }
    else if (n.kind === 'cardio') { o.active = true; o.minutes = n.minutes; o.kinds = ['treadmill']; }
    else if (n.kind === 'activity') {
      o.minutes = n.minutes; o.active = n.minutes >= minMin(pid);
      o.kinds = Array.from(new Set(n.acts.filter(a => a.mv !== false).map(a => a.a === 'other' ? 'other:' + String(a.name || '').toLowerCase() : a.a)));
    }
    return o;
  });
}
function weekFacts(pid, ws) {
  return cached('wf:' + pid + ':' + ws, () => {
    const t = todayIso(), days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i), future = d > t, di = future ? blankInfo() : dayInfo(pid, d);
      days.push({ date: d, future, active: di.active, lift: di.lift, minutes: di.minutes, kinds: di.kinds.slice(), rest: di.rest, fuel: future ? 0 : fuelUnit(pid, d), water: future ? 0 : waterFrac(pid, d) });
    }
    let lastMin = 0; for (let i = 1; i <= 7; i++) lastMin += dayInfo(pid, addDays(ws, -i)).minutes;
    return { pid, ws, plan: P(pid).plan, goal: moveGoal(pid), days, lastMin };
  });
}
function scoreFacts(f) {
  const active = f.days.filter(d => d.active).length, lifts = f.days.filter(d => d.lift).length, minutes = sum(f.days, d => d.minutes);
  const kinds = new Set(); f.days.forEach(d => d.kinds.forEach(k => kinds.add(k)));
  const move = f.plan === 'program' ? 30 * Math.min(1, active / f.goal) + 20 * Math.min(1, lifts / LIFT_GOAL) : 50 * Math.min(1, active / f.goal);
  const fuel = 20 * Math.min(1, sum(f.days, d => d.fuel) / 5);
  const water = 15 * Math.min(1, sum(f.days, d => d.water) / 5);
  const pb = minutes > 0 && minutes > f.lastMin ? 5 : 0, variety = kinds.size >= 3 ? 5 : 0, weekend = (f.days[5].active || f.days[6].active) ? 5 : 0;
  const raw = move + fuel + water + pb + variety + weekend;
  return { move, fuel, water, bonus: pb + variety + weekend, pb, variety, weekend, raw, total: Math.round(raw), active, lifts, minutes, kinds: kinds.size, moveFull: move >= 49.99 };
}
const weekScore = (pid, ws) => scoreFacts(weekFacts(pid, ws || weekStart(todayIso())));
const cloneFacts = f => Object.assign({}, f, { days: f.days.map(d => Object.assign({}, d, { kinds: d.kinds.slice() })) });

/* ---------- Coach: what would add points, and by how much ---------- */
function coach(pid) {
  const t = todayIso(), ws = weekStart(t), f = weekFacts(pid, ws), base = scoreFacts(f), i = (dow(t) + 6) % 7, d = f.days[i], g = goalsFor(pid), tips = [];
  const add = (group, text, sub, tab, mut) => { const c = cloneFacts(f); mut(c); const gain = scoreFacts(c).total - base.total; if (gain > 0) tips.push({ group, text, sub, tab, gain, mut }); };
  if (!d.active) {
    if (f.plan === 'program') {
      const k = nextDayKey(t, pid);
      add('move', 'Log your ' + DAYS[k].name + ' lift day', 'Treadmill plus at least ' + QUALIFY_MIN + ' lifts', 'train', c => { const x = c.days[i]; x.active = true; x.lift = true; x.minutes += 45; x.kinds = [k, 'treadmill']; });
      add('move', 'Treadmill only today', 'Any Fitness+ treadmill workout', 'train', c => { const x = c.days[i]; x.active = true; x.minutes += 20; x.kinds = ['treadmill']; });
    } else {
      const need = Math.max(1, minMin(pid) - d.minutes);
      // no new kind is assumed here: repeating something already done this week earns no variety bonus
      add('move', d.minutes ? need + ' more minutes of movement today' : 'Move for ' + minMin(pid) + ' minutes today', 'A walk, a stretch, anything on your list', 'train', c => { const x = c.days[i]; x.active = true; x.minutes += need; });
    }
  }
  if (f.plan !== 'program' && !base.variety && base.kinds === 2) add('variety', 'Try something you have not done this week', 'A third kind of activity earns the variety bonus', 'train', c => { c.days[i].kinds.push('__new'); });
  if (!base.pb && f.lastMin > 0) { const need = f.lastMin - base.minutes + 1; add('pb', need + ' more active minutes this week', 'Beats last week\'s ' + f.lastMin + ' minutes', 'train', c => { c.days[i].minutes += need; }); }
  if (d.water < 1) { const need = Math.max(1, Math.ceil(g.waterOz - dayTotals(pid, t).water)); add('water', 'Drink ' + need + ' more oz of water', 'Reaches today\'s ' + g.waterOz + ' oz', 'fuel', c => { c.days[i].water = 1; }); }
  const overToday = dayTotals(pid, t).kcal > g.hi; // already past the range: nothing eaten later can bring today back into it
  if (d.fuel < 1 && !overToday) add('fuel', 'Log today\'s food and land in range', commas(g.lo) + ' to ' + commas(g.hi) + ' calories', 'fuel', c => { c.days[i].fuel = 1; });
  tips.sort((a, b) => b.gain - a.gain);
  // best case from here: every remaining day goes perfectly
  const best = cloneFacts(f);
  best.days.forEach((x, j) => { if (j >= i) { x.active = true; if (f.plan === 'program') x.lift = true; x.minutes += 30; if (!(j === i && overToday)) x.fuel = 1; x.water = 1; x.kinds.push('__k' + j); } });
  const bestMin = sum(best.days, x => x.minutes); if (bestMin <= f.lastMin) best.days[i].minutes += f.lastMin - bestMin + 1; // a perfect finish also beats last week's minutes
  const max = scoreFacts(best).total;
  // shortest list of today's actions that passes the other profile
  const other = weekScore(otherPid(pid), ws).total; let plan = null;
  if (base.total <= other) {
    const c = cloneFacts(f), used = [], seen = {};
    for (const tip of tips) { if (seen[tip.group]) continue; seen[tip.group] = 1; tip.mut(c); used.push(tip); if (scoreFacts(c).total > other) { plan = { used, total: scoreFacts(c).total }; break; } }
  }
  return { base, tips, max, other, plan, daysLeft: 6 - i };
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
function liveWeek(ws) {
  const a = weekScore('tyson', ws).total, b = weekScore('jacquie', ws).total;
  return { ws, tyson: a, jacquie: b, winner: a === b ? null : a > b ? 'tyson' : 'jacquie', played: a + b > 0, final: false };
}
function compWeeks() { // finished weeks, oldest first: the stored final result where there is one, otherwise worked out from the logs
  return cached('compWeeks', () => {
    const cur = weekStart(todayIso()), out = []; let ws = compStart(), guard = 0;
    while (ws < cur && guard++ < 156) { const r = state.results[ws]; out.push(r && isNum(r.tyson) && isNum(r.jacquie) ? Object.assign({ ws, played: r.tyson + r.jacquie > 0 }, r, { final: true }) : liveWeek(ws)); ws = addDays(ws, 7); }
    return out;
  });
}
async function closeWeeks() { // store the result of each week whose late-entry window has passed, so later goal changes cannot rewrite it
  const t = todayIso();
  for (const w of compWeeks()) {
    if (w.final || t < addDays(w.ws, 7 + GRACE_DAYS)) continue;
    try { await put('results/' + w.ws, { ws: w.ws, tyson: w.tyson, jacquie: w.jacquie, winner: w.winner, played: w.played, final: true, closedAt: new Date().toISOString() }); } catch (e) { return; }
  }
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
      if (f.days.filter(d => d.fuel >= 1).length >= 5) s.fuel5 = true;
      if (f.days.some(d => d.active && d.fuel >= 1 && d.water >= 1)) s.triple = true;
      if (f.days.some((d, j) => d.active && of.days[j].active)) s.teamDay = true;
      if (sc.moveFull && scoreFacts(of).moveFull) s.teamWeek = true;
      ws = addDays(ws, 7);
    }
    const weeks = compWeeks();
    s.wins = weeks.filter(w => w.winner === pid).length;
    s.photo = weeks.some(w => w.tyson > 0 && w.jacquie > 0 && Math.abs(w.tyson - w.jacquie) <= 3);
    s.pr = liftPR(pid); s.phase = phaseFor(t, pid);
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
  { id: 'teamweek', icon: '💞', name: 'Double Podium', desc: 'Both of you fill your Move score in the same week.', has: s => s.teamWeek }
];
function badgesFor(pid) { // earned = true now, or recorded on the profile earlier: a badge once earned is kept
  const s = statsFor(pid), p = P(pid), kept = p.badges;
  return BADGES.filter(b => !b.plan || b.plan === p.plan || kept[b.id]).map(b => { const live = !!b.has(s), earned = live || !!kept[b.id]; return { id: b.id, icon: b.icon, name: b.name, desc: b.desc, earned, live, since: kept[b.id] || null, prog: !earned && b.prog ? b.prog(s) : '' }; });
}
