/* ---------- Compete: the weekly race ---------- */
function renderCompete() {
  const pid = me(), other = otherPid(pid), t = todayIso(), ws = weekStart(t), A = weekScore(pid, ws), B = weekScore(other, ws), c = coach(pid), pa = P(pid), pb = P(other);
  const diff = A.total - B.total, left = c.daysLeft;
  const lead = diff === 0 ? (A.total === 0 ? 'Green flag. First points take the lead.' : 'Dead heat.') : diff > 0 ? 'You lead by ' + diff + '.' : pb.name + ' leads by ' + (-diff) + '.';
  const lane = (p, sc) => '<div class="lane" style="' + avStyle(p) + ';--p:' + (clamp(sc.total, 0, 100) / 100).toFixed(3) + '" role="img" aria-label="' + esc(P(p).name) + ': ' + sc.total + ' of 100 points"><div class="fill"></div><div class="car">' + avatarHTML(p) + '</div></div>';
  let h = '<section class="card stack"><div class="row between"><div><div class="eyebrow">Week of ' + shortDate(ws) + '</div><h2>' + (left === 0 ? 'Final day' : left + ' day' + (left === 1 ? '' : 's') + ' left') + '</h2></div><span class="chip">resets Monday</span></div>' +
    '<div class="vs"><div class="side">' + avatarHTML(pid, 'lg') + '<b>' + esc(pa.name) + '</b><span class="pts" id="myPts">' + A.total + '</span></div><div class="mid">VS</div><div class="side">' + avatarHTML(other, 'lg') + '<b>' + esc(pb.name) + '</b><span class="pts" id="theirPts">' + B.total + '</span></div></div>' +
    '<div class="race">' + lane(pid, A) + lane(other, B) + '</div>' +
    '<p id="leadLine"><b>' + esc(lead) + '</b> <span class="muted">Out of 100. Each of you is scored against your own goals.</span></p>';
  if (state.forms.stakes) h += '<div class="row" style="flex-wrap:nowrap"><input type="text" id="stakesIn" data-form="stakes" data-k="text" maxlength="80" value="' + esc(state.forms.stakes.text || '') + '" placeholder="Loser cooks Sunday dinner" aria-label="What is on the line"><button type="button" class="small" data-a="stakes-save">Save</button></div>';
  else h += state.comp.stakes ? '<p class="tiny">On the line: <b>' + esc(state.comp.stakes) + '</b> <button type="button" class="quiet" data-a="stakes-edit">Change</button></p>' : '<div><button type="button" class="quiet" data-a="stakes-edit">Add what is on the line this week</button></div>';
  h += '</section>';

  const cell = (p, sc, key, max) => '<span class="cell" style="' + avStyle(p) + '"><span class="bar"><i style="width:' + Math.round(clamp(sc[key] / max, 0, 1) * 100) + '%"></i></span><b class="num">' + Math.round(sc[key]) + '</b></span>';
  const cat = (label, key, max) => '<span class="muted">' + label + ' <span class="tiny">/' + max + '</span></span>' + cell(pid, A, key, max) + cell(other, B, key, max);
  const tick = v => v ? '✓' : '–';
  const waterWeek = p => sum(weekFacts(p, ws).days, d => d.future ? 0 : dayTotals(p, d.date).water);
  h += '<section class="card stack"><div class="mini"><span></span><b>' + esc(pa.name) + '</b><b>' + esc(pb.name) + '</b>' + cat('Move', 'move', 50) + cat('Fuel', 'fuel', 20) + cat('Water', 'water', 15) + cat('Bonus', 'bonus', 15) + '</div>' +
    '<p class="tiny muted">You: ' + A.active + ' of ' + moveGoal(pid) + ' active days' + (pa.plan === 'program' ? ', ' + A.lifts + ' of ' + LIFT_GOAL + ' lift days' : '') + ', ' + A.minutes + ' min. Bonus: personal best ' + tick(A.pb) + ' · variety ' + tick(A.variety) + ' · weekend ' + tick(A.weekend) + '.</p>' +
    '<p class="tiny muted">Together this week: ' + (A.active + B.active) + ' active days and ' + Math.round(waterWeek(pid) + waterWeek(other)) + ' oz of water.</p></section>';

  let planLine;
  if (diff > 0) planLine = 'You are ahead. These keep you there.';
  else if (c.plan) planLine = 'To pass ' + pb.name + ' today: ' + c.plan.used.map(x => x.text.charAt(0).toLowerCase() + x.text.slice(1)).join(', then ') + '. That puts you at ' + c.plan.total + ' to ' + c.other + '.';
  else if (c.max > c.other) planLine = 'Today alone will not pass ' + pb.name + '. Bank these and keep going; your best case this week is ' + c.max + '.';
  else planLine = pb.name + ' is out of reach on points this week. Bank the habit; a fresh race starts Monday.';
  h += '<section class="card stack"><div><h3>Ways to gain today</h3><p class="tiny muted" id="planLine" style="margin-top:2px">' + esc(planLine) + '</p></div>' +
    (c.tips.length ? '<div class="tips">' + c.tips.map(tip => '<a class="tip" href="#' + tip.tab + '"><span><b>' + esc(tip.text) + '</b><br><span class="tiny muted">' + esc(tip.sub) + '</span></span><span class="gain">+' + tip.gain + '</span></a>').join('') + '</div>' : '<p class="muted">Everything available today is banked. Nice.</p>') +
    '<p class="tiny muted">Best case from here: ' + c.max + ' points this week.</p></section>';

  h += '<details class="card plain"><summary>How scoring stays fair</summary><ul class="rules" style="margin-top:8px">' +
    '<li><b>Move, 50 points.</b> Your share of your own weekly goal. ' + esc(P('tyson').name) + ': 30 for activity days plus 20 for lift days. ' + esc(P('jacquie').name) + ': 50 for active days of ' + minMin('jacquie') + ' minutes or more. Each of you sets your own goal, so a short walk that completes a day is worth as much as a lift day.</li>' +
    '<li><b>Fuel, 20 points.</b> Days logged inside your calorie range. Five such days fills it; a logged day outside the range earns half.</li>' +
    '<li><b>Water, 15 points.</b> Each day earns the share of your water goal you drank. Five full days fills it.</li>' +
    '<li><b>Bonus, 15 points.</b> Five each for more active minutes than your own last week, three different kinds of activity, and moving on Saturday or Sunday.</li>' +
    '<li>Rest days cost nothing. Body weight and calorie totals never appear here, only points.</li>' +
    '<li>Scores are worked out from the saved logs, so editing an entry updates the race and nothing counts twice.</li>' +
    '<li>A finished week stays open through Tuesday for anything you forgot to log. After that its result is final, and later goal changes cannot rewrite it.</li></ul></details>';

  const weeks = compWeeks().filter(w => w.played).slice().reverse(), wins = p => weeks.filter(w => w.winner === p).length, ties = weeks.filter(w => !w.winner).length;
  h += '<section class="card stack"><div class="row between"><h3>Season</h3><span class="num">' + esc(pa.name) + ' <b>' + wins(pid) + '</b> – <b>' + wins(other) + '</b> ' + esc(pb.name) + (ties ? ' · ' + ties + ' tied' : '') + '</span></div>' +
    (weeks.length ? '<div class="weeks">' + weeks.slice(0, 10).map(w => '<div class="wk"><span>Week of ' + shortDate(w.ws) + (w.final ? '' : ' <span class="chip">open through Tue</span>') + '</span><span class="num">' + (w.winner ? '<b>' + esc(P(w.winner).name) + '</b> ' : 'Tie ') + w[pid] + '–' + w[other] + '</span></div>').join('') + '</div>' : '<p class="muted tiny">The first result posts on Monday, when this week closes.</p>') + '</section>';
  return h;
}
ACT['stakes-edit'] = () => { state.forms.stakes = { text: state.comp.stakes || '' }; render('#stakesIn'); };
ACT['stakes-save'] = async () => {
  const text = String((state.forms.stakes || {}).text || '').trim().slice(0, 80);
  delete state.forms.stakes; typing = false;
  await write('comp/settings', Object.assign({}, state.comp, { stakes: text })); render();
};
