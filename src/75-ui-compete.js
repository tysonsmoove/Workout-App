/* ---------- Compete: the weekly race, and the team week you win together ---------- */
// one person's Move rule in words, built from their own plan and the goals locked for this week
// When a setting was changed mid-week, the line shows this week's locked rule first and then the one that starts Monday.
function fairLine(pid) {
  const wk = thisWeek(pid), live = liveGoals(pid), nm = '<b>' + esc(P(pid).name) + '</b>';
  const rule = g => g.plan === 'program'
    ? ', on the lifting program: 30 for activity days (goal ' + g.goal + ' a week) plus 20 for lift days (goal ' + g.liftGoal + ' a week). A day with no lift still counts as an activity day with a treadmill entry or ' + g.minMin + ' minutes of anything else.'
    : ', on pick-your-own: 50 for active days of ' + g.minMin + ' minutes or more (goal ' + g.goal + ' a week).';
  const changed = ['plan', 'goal', 'liftGoal', 'minMin'].some(k => live[k] !== wk[k]);
  return nm + rule(wk) + (changed ? ' <span class="chip accent">' + startsNote() + '</span> ' + nm + rule(live) : '');
}
function moveProgress(pid, sc) { // "2 of 5 activity days · 1 of 3 lifts"
  const g = thisWeek(pid);
  return sc.moveFull ? 'Move score full' : Math.min(sc.active, g.goal) + ' of ' + g.goal + (g.plan === 'program' ? ' activity days · ' + Math.min(sc.lifts, g.liftGoal) + ' of ' + g.liftGoal + ' lifts' : ' active days');
}
function countdownText(cd, banked) {
  const d = cd.days, when = d > 1 ? d + ' days to ' + cd.phrase : d === 1 ? '1 day to ' + cd.phrase : d === 0 ? 'Today: ' + cd.phrase : cd.phrase.charAt(0).toUpperCase() + cd.phrase.slice(1) + ' was ' + (-d) + ' day' + (d === -1 ? '' : 's') + ' ago';
  return when + (banked != null ? ' · ' + banked + ' team week' + (banked === 1 ? '' : 's') : '');
}
function renderCompete() {
  const pid = me(), other = otherPid(pid), t = todayIso(), ws = weekStart(t), A = weekScore(pid, ws), B = weekScore(other, ws), c = coach(pid), pa = P(pid), pb = P(other), ga = thisWeek(pid);
  const diff = A.total - B.total, left = c.daysLeft, stakes = stakesFor(ws), all = compWeeks(), prev = all[all.length - 1];
  const lead = diff === 0 ? (A.total === 0 ? 'Green flag. First points take the lead.' : 'Dead heat.') : diff > 0 ? 'You lead by ' + diff + '.' : pb.name + ' leads by ' + (-diff) + '.';
  const lane = (p, sc) => '<div class="lane" style="' + avStyle(p) + ';--p:' + (clamp(sc.total, 0, 100) / 100).toFixed(3) + '" role="img" aria-label="' + esc(P(p).name) + ': ' + sc.total + ' of 100 points"><div class="fill"></div><div class="car">' + avatarHTML(p) + '</div></div>';
  let h = '<section class="card stack"><div class="row between"><div><div class="eyebrow">Week of ' + shortDate(ws) + '</div><h2>' + (left === 0 ? 'Final day' : left + ' day' + (left === 1 ? '' : 's') + ' left') + '</h2></div><span class="chip">resets Monday</span></div>' +
    '<div class="vs"><div class="side">' + avatarHTML(pid, 'lg') + '<b>' + esc(pa.name) + '</b><span class="pts" id="myPts">' + A.total + '</span></div><div class="mid">VS</div><div class="side">' + avatarHTML(other, 'lg') + '<b>' + esc(pb.name) + '</b><span class="pts" id="theirPts">' + B.total + '</span></div></div>' +
    '<div class="race">' + lane(pid, A) + lane(other, B) + '</div>' +
    '<p id="leadLine"><b>' + esc(lead) + '</b> <span class="muted">Out of 100. Each of you is scored against your own goals.</span></p>';
  // last week stays open for late entries through Tuesday: until then its result is only provisional, and says so quietly
  if (prev && !prev.final && prev.played) h += '<p class="tiny muted" id="provLine">Last week · ' + esc(provisionalText(prev)) + '. The winner is announced once it is final.</p>';
  if (state.forms.stakes) h += '<div class="row" style="flex-wrap:nowrap"><input type="text" id="stakesIn" data-form="stakes" data-k="text" maxlength="80" value="' + esc(state.forms.stakes.text || '') + '" placeholder="Loser cooks Sunday dinner" aria-label="What is on the line this week"><button type="button" class="small" data-a="stakes-save">Save</button></div>';
  else h += stakes ? '<p class="tiny" id="stakesLine">On the line this week: <b>' + esc(stakes) + '</b> <button type="button" class="quiet" data-a="stakes-edit">Change</button></p>' : '<div id="stakesLine"><button type="button" class="quiet" data-a="stakes-edit">Add what\'s on the line this week</button></div>';
  h += '</section>';

  const cell = (p, sc, key, max) => '<span class="cell" style="' + avStyle(p) + '"><span class="bar"><i style="width:' + Math.round(clamp(sc[key] / max, 0, 1) * 100) + '%"></i></span><b class="num">' + Math.round(sc[key]) + '</b></span>';
  const cat = (label, key, max) => '<span class="muted">' + label + ' <span class="tiny">/' + max + '</span></span>' + cell(pid, A, key, max) + cell(other, B, key, max);
  const tick = v => v ? '✓' : '–';
  const waterWeek = p => sum(weekFacts(p, ws).days, d => d.future ? 0 : dayTotals(p, d.date).water);
  h += '<section class="card stack"><div class="mini"><span></span><b>' + esc(pa.name) + '</b><b>' + esc(pb.name) + '</b>' + cat('Move', 'move', 50) + cat('Fuel', 'fuel', 20) + cat('Water', 'water', 15) + cat('Bonus', 'bonus', 15) + '</div>' +
    '<p class="tiny muted">You: ' + A.active + ' of ' + ga.goal + ' active days' + (ga.plan === 'program' ? ', ' + A.lifts + ' of ' + ga.liftGoal + ' lift days' : '') + ', ' + A.minutes + ' min. Bonus: personal best ' + tick(A.pb) + ' · variety ' + tick(A.variety) + ' · weekend ' + tick(A.weekend) + '.</p>' +
    '<p class="tiny muted">Together this week: ' + (A.active + B.active) + ' active days and ' + Math.round(waterWeek(pid) + waterWeek(other)) + ' oz of water.</p></section>';

  // the team week: both of you fill your own Move score. Nobody has to lose for it to count.
  const ts = teamStats(), cd = countdown(), f = state.forms.cd;
  const trow = (p, sc) => '<div class="trow" style="' + avStyle(p) + '">' + avatarHTML(p, 'sm') + '<span class="tn"><b>' + esc(P(p).name) + '</b><br><span class="tiny muted">' + esc(moveProgress(p, sc)) + '</span></span><span class="bar"><i style="width:' + Math.round(clamp(sc.move / 50, 0, 1) * 100) + '%"></i></span><span class="chip' + (sc.moveFull ? ' good' : '') + '">' + (sc.moveFull ? 'locked in' : Math.round(sc.move) + '/50') + '</span></div>';
  h += '<section class="card stack" id="teamCard"><div class="row between"><div><div class="eyebrow">Together</div><h3>Team week</h3></div><span class="chip' + (ts.locked === 2 ? ' good' : '') + '" id="teamLock">Team week: ' + ts.locked + ' of 2 locked in</span></div>' +
    trow(pid, A) + trow(other, B) +
    '<p class="tiny muted">A team week is one where you both fill your own Move score. It runs next to the race, and you win it together.</p>' +
    '<div class="kv"><span>Team streak</span><b id="teamStreak">' + ts.streak + ' week' + (ts.streak === 1 ? '' : 's') + ' in a row</b><span class="muted">Team weeks so far</span><b class="muted">' + ts.total + '</b></div>';
  if (f) h += '<div class="formgrid" id="cdForm"><label class="f">Counting down to<input type="text" data-form="cd" data-k="label" maxlength="24" value="' + esc(f.label == null ? '' : f.label) + '" placeholder="Wedding"></label><label class="f">Date<input type="date" data-form="cd" data-k="date" value="' + esc(f.date || '') + '" min="' + t + '"></label>' +
    '<div class="wide row"><button type="button" class="small" data-a="cd-save">Save countdown</button><button type="button" class="quiet" data-a="cd-cancel">Cancel</button>' + (cd ? '<button type="button" class="quiet" data-a="cd-clear">Remove countdown</button>' : '') + '</div></div>';
  else h += cd ? '<p id="cdLine"><b>' + esc(countdownText(cd, ts.banked)) + '</b> <button type="button" class="quiet" data-a="cd-edit">Change</button></p>' : '<div><button type="button" class="quiet" data-a="cd-edit">Add a countdown you are both working toward</button></div>';
  h += '</section>';

  let planLine;
  if (diff > 0) planLine = 'You are ahead. These keep you there.';
  else if (c.plan) planLine = 'To pass ' + pb.name + ' today: ' + c.plan.used.map(x => x.text.charAt(0).toLowerCase() + x.text.slice(1)).join(', then ') + '. That puts you at ' + c.plan.total + ' to ' + c.other + '.';
  else if (c.max > c.other) planLine = 'Today alone will not pass ' + pb.name + '. Bank these and keep going; your best case this week is ' + c.max + '.';
  else planLine = pb.name + ' is out of reach on points this week. ' + teamPointer(c) + ' A fresh race starts Monday.';
  h += '<section class="card stack"><div><h3>Ways to gain today</h3><p class="tiny muted" id="planLine" style="margin-top:2px">' + esc(planLine) + '</p></div>' +
    (c.tips.length ? '<div class="tips">' + c.tips.map(tip => '<a class="tip" href="#' + tip.tab + '" data-tip="' + tip.group + '"><span><b>' + esc(tip.text) + '</b><br><span class="tiny muted">' + esc(tip.sub) + '</span></span><span class="gain">+' + tip.gain + '</span></a>').join('') + '</div>' : '<p class="muted">Everything available today is banked. Nice.</p>') +
    '<p class="tiny muted">Best case from here: ' + c.max + ' points this week.</p></section>';

  const v2 = ga.scoring >= 2;
  h += '<details class="card plain" data-dk="fair"><summary>How scoring stays fair</summary><ul class="rules" id="fairRules" style="margin-top:8px">' +
    '<li><b>Move, 50 points.</b> Your share of your own weekly goal, so a short walk that completes a day is worth as much as a lift day.<br>' + fairLine('tyson') + '<br>' + fairLine('jacquie') + '</li>' +
    '<li><b>Fuel, 20 points.</b> ' + (v2 ? 'Each' : 'From the week of ' + nice(RULES_V2_FROM) + ': each') + ' day counts 0.7 for landing in your calorie range (a logged day outside it earns half of that) plus 0.3 for reaching at least 90% of your own protein target. Five full days fills it. A quick add with no protein entered counts as 0 g.' + (v2 ? '' : ' Until then, a day is the calorie range alone.') + '</li>' +
    '<li><b>Water, 15 points.</b> Each day earns the share of your water goal you drank. Five full days fills it.</li>' +
    '<li><b>Bonus, 15 points.</b> Five each for more active minutes than your own last week, three different kinds of activity, and moving on Saturday or Sunday. Watch minutes add time, not a new kind.</li>' +
    '<li><b>Your goals lock each Monday.</b> Changing a goal, a workout style or your body numbers never moves the week already running. The change starts the next Monday.</li>' +
    '<li>Rest days cost nothing. Body weight and calorie totals never appear here, only points.</li>' +
    '<li>Scores are worked out from the saved logs, so editing an entry updates the race and nothing counts twice.</li>' +
    '<li>A finished week stays open through Tuesday for anything you forgot to log. Until then its result is provisional. On Wednesday it is final, the winner is announced, and nothing can rewrite it.</li></ul></details>';

  const weeks = all.filter(w => w.played).slice().reverse(), finals = weeks.filter(w => w.final), wins = p => finals.filter(w => w.winner === p).length, ties = finals.filter(w => !w.winner).length;
  h += '<section class="card stack" id="seasonCard"><div class="row between"><h3>Season</h3><span class="num">' + esc(pa.name) + ' <b>' + wins(pid) + '</b> – <b>' + wins(other) + '</b> ' + esc(pb.name) + (ties ? ' · ' + ties + ' tied' : '') + '</span></div>' +
    (weeks.length ? '<div class="weeks">' + weeks.slice(0, 10).map(w => { const sl = stakesLine(w); return '<div class="wk" data-wk="' + w.ws + '"><span>Week of ' + shortDate(w.ws) + (w.final ? (isTeamWeek(w.ws) ? ' <span class="chip good">team week</span>' : '') : ' <span class="chip">provisional · open through Tue</span>') + (sl ? '<br><span class="tiny muted">' + esc(sl) + '</span>' : '') + '</span><span class="num">' + (w.final ? (w.winner ? '<b>' + esc(P(w.winner).name) + '</b> ' : 'Tie ') : '') + w[pid] + '–' + w[other] + '</span></div>'; }).join('') + '</div>' : '<p class="muted tiny">The first result posts once a week has finished.</p>') +
    '<p class="tiny muted">Wins count once a week is final.</p></section>';
  return h;
}
ACT['stakes-edit'] = () => { state.forms.stakes = { text: stakesFor(weekStart(todayIso())) }; render('#stakesIn'); };
ACT['stakes-save'] = async () => {
  const text = String((state.forms.stakes || {}).text || '').trim().slice(0, 80), cur = weekStart(todayIso()), c = state.comp;
  // stakes are kept per week; ones saved before that (one text, no week) are filed under the week they were set in
  const by = Object.assign({}, c.stakesBy && typeof c.stakesBy === 'object' ? c.stakesBy : (c.stakes ? { [LEGACY_STAKES_WS]: c.stakes } : {}));
  by[cur] = text; Object.keys(by).sort().slice(0, -8).forEach(k => { delete by[k]; }); // closed weeks carry their own copy
  typing = false;
  const ok = await write('comp/settings', Object.assign({}, c, { stakesBy: by, stakes: text }));
  if (ok) delete state.forms.stakes; // a refused save keeps what was typed
  render();
};
ACT['cd-edit'] = () => { const cd = countdown(); state.forms.cd = { label: cd ? cd.label : 'Wedding', date: cd ? cd.date : '' }; render(); };
ACT['cd-cancel'] = () => { delete state.forms.cd; render(); };
ACT['cd-save'] = async () => {
  const f = state.forms.cd || {}, label = String(f.label || '').trim().slice(0, 24) || 'Wedding', date = String(f.date || ''), old = state.comp.countdown;
  if (!validIso(date)) { toast('Pick the date you are counting down to.'); return; }
  typing = false;
  // team weeks are banked from the day the countdown was first set, so editing the label or date keeps them
  const ok = await write('comp/settings', Object.assign({}, state.comp, { countdown: { date, label, setAt: old && validIso(old.setAt) ? old.setAt : todayIso() } }));
  if (ok) delete state.forms.cd;
  render();
};
ACT['cd-clear'] = async () => {
  const next = Object.assign({}, state.comp); delete next.countdown;
  const ok = await write('comp/settings', next); if (ok) delete state.forms.cd;
  render();
};
