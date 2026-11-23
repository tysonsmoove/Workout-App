/* ---------- The daily check-in, the Healthplex, and the settings that go with them ---------- */
// "How are you feeling?" on Train, for today. Picking a choice only opens its preview: nothing is written until a
// session is saved, and what is saved carries the answer as `checkin`. Classes and court games are a separate, smaller
// link: they are never the suggested choice and nothing needs them.

/* --- settings: split, weekly lift goal, "Not at my gym" --- */
ACT['split-set'] = async el => {
  const v = el.dataset.v === 'full' ? 'full' : 'ppl'; if (v === splitOf()) return;
  await saveSettings({ split: v }); // old days keep the day they were saved as; only the next lift changes
  toast(v === 'full' ? 'Full body A/B. Your next lift is ' + DAYS[nextDayKey(addDays(todayIso(), 1))].name + '.' : 'Push / Pull / Legs. Your next lift is ' + DAYS[nextDayKey(addDays(todayIso(), 1))].name + '.', 3600);
};
ACT['lift-goal'] = async el => {
  const v = Number(el.dataset.v) === 2 ? 2 : 3; if (v === liveGoals(me()).liftGoal) return;
  await saveSettings({ liftGoal: v }); settle();
  toast('Weekly lift goal: ' + v + ' lift days. ' + startsNote() + '; this week stays at ' + thisWeek(me()).liftGoal + '.', 4200);
};
// The exercise's free stand-in becomes the default for every future workout. No slot is ever dropped.
async function notAtMyGym(base) {
  const to = EX[base] ? defaultSwapOption(base) : null;
  if (!to) { toast('There is no stand-in for ' + (EX[base] ? EX[base].name : 'that one') + '. Use Swap for this workout.', 3800); return false; }
  const d = state.drafts[state.selDate]; if (d && d.swaps[base] != null) { delete d.swaps[base]; persistDrafts(); } // this workout follows the new default too
  await saveSettings({ swaps: Object.assign({}, state.settings.swaps, { [base]: to }) });
  toast(EX[to].name + ' replaces ' + EX[base].name + ' in every future workout. Undo it on the Program tab.', 4600);
  return true;
}

/* --- the gym: facts, the first-week note, the morning plan --- */
// From the Healthplex website, November 2026. No equipment list is published.
const HP = { phone: '(317) 920-7400', weekday: '5:15 a.m.–10 p.m.', weekend: '7 a.m.–8 p.m.' };
const isWeekend = date => { const d = dow(date); return d === 0 || d === 6; };
function gymCardHTML() {
  if (!atHealthplex(me())) return '';
  const row = (k, v) => '<li><span>' + k + '</span><span class="muted" style="text-align:right">' + v + '</span></li>';
  return '<section class="card" id="gymInfo"><div class="row between"><h3>Your gym</h3><span class="muted tiny">' + HEALTHPLEX + ' · 3660 Guion Rd</span></div><div class="plan" style="margin-top:6px"><ul>' +
    row('Hours', 'Mon–Fri ' + HP.weekday + '<br>Sat–Sun ' + HP.weekend) +
    row('Track', 'Indoor, 1/8 mile · 8 laps = 1 mile') +
    row('Pools', '25-yard lap pool, 6 lanes, about 80°F<br>Therapy pool, about 90°F') +
    row('Recovery', 'Dry sauna, steam room and whirlpool<br>in both locker rooms · towels provided') +
    row('Courts', 'Basketball (with volleyball and pickleball gear)<br>Tennis: 6 indoor, 3 outdoor · 1 racquetball') +
    row('Floors', 'Cardio and strength: squat racks,<br>machines and free weights') +
    row('Also', 'Massage therapist on site') +
    row('Fitness desk', '<a href="tel:+13179207400">' + HP.phone + '</a>') + '</ul></div>' +
    '<p class="tiny muted" style="margin-top:8px">Hours as of Nov 2026. Check the Healthplex site before holidays. Classes are optional and never needed for a goal or a badge.</p></section>';
}
// For a week after a lifting profile's gym changes: one note about machines that are not there.
function gymBannerHTML() {
  const p = P(me()), since = state.data[me()].profile && state.data[me()].profile.placeSince, t = todayIso();
  if (p.plan !== 'program' || !atHealthplex(me()) || !validIso(since) || t < since || t >= addDays(since, 7)) return '';
  return '<div class="banner accent" id="gymBanner">First week at the Healthplex: if a machine isn\'t there, use ··· → Not at my gym.</div>';
}
function hpMorningHTML(kind) {
  const t = state.selDate, wkend = isWeekend(t), pick = state.ci && state.ci.date === t ? state.ci.choice : (state.sessions[t] && state.sessions[t].checkin) || null, row = (a, b) => '<span class="t num">' + a + '</span><span>' + b + '</span>';
  let rows, title = 'Morning plan · at IMS by 9';
  if (pick === 'tired') rows = row('6:00', 'Up. Water, small bite.') + row('6:20', 'At the Healthplex. Easy cardio, 20 to 30 min: track, treadmill, bike, elliptical or the lap pool.') + row('7:00', 'Optional sauna or steam, 10 min. Drink water.') + row('7:20', 'Shower. Out the door by 8:15, at IMS by 9.');
  else if (pick === 'sore') rows = row('6:00', 'Up. Water, small bite.') + row('6:20', 'At the Healthplex. 10 easy minutes on the track or in the therapy pool, then stretch.') + row('6:40', 'Sauna, steam or whirlpool, 10 min. Drink water.') + row('7:00', 'Shower. Out the door by 8:15, at IMS by 9.');
  else if (pick === 'rest' || kind === 'rest') rows = row('6:30', 'Up. Water, breakfast, no gym today.') + row('8:15', 'Out the door, at IMS by 9.');
  else rows = row('6:00', 'Up. Water, small bite.') + row('6:20', 'At the Healthplex. Warm-up 5–10 min.') + row('6:30', (DAYS[kind] ? DAYS[kind].name : 'Lift') + ' (about ' + (pick === 'short' ? '25 min, express' : '40 min, or 25 for express') + ').') +
    row('7:15', 'Optional sauna or steam, 10 min. Drink water.') + row('7:35', 'Shower. Out the door by 8:15, at IMS by 9.');
  return '<details class="card plain" data-dk="morning" id="morningPlan"><summary>' + title + '</summary><div class="sched" style="margin-top:8px">' + rows + '</div>' +
    '<p class="tiny muted" style="margin-top:8px" id="morningHours">' + (wkend ? 'Weekend: the Healthplex opens at 7, so everything starts later. Open ' + HP.weekend + '.' : 'Weekdays the Healthplex opens at 5:15. Open ' + HP.weekday + '.') + ' Missed a morning? Nothing shifts: the next lift is still the next one.</p></details>';
}

/* --- recovery rooms: the chip after a workout, the water offer --- */
const heatDone = (pid, date) => { const r = state.data[pid].sessions[date]; return !!(r && Array.isArray(r.acts) && r.acts.some(a => a && HEAT_KEYS.includes(a.a))); };
function heatChipHTML(date) {
  const pid = me(), di = dayInfo(pid, date);
  if (!atHealthplex(pid) || date !== todayIso() || !di.logged || di.rest || heatDone(pid, date)) return '';
  return '<div class="row" id="heatChip"><button type="button" class="chipbtn" data-a="heat-open">🔥 Sauna, steam or whirlpool after?</button></div>';
}
OV.heat = {
  html: o => '<div class="ov" role="dialog" aria-modal="true" aria-label="Recovery rooms">' + ovHead('After your workout', 'Recovery: it logs, but does not count toward active minutes') +
    '<p class="banner" id="heatNote">' + HEAT_NOTE + '</p><div class="results">' + HEAT_KEYS.map(k => '<button type="button" class="fooditem" data-a="heat-pick" data-k="' + k + '"><span class="fn">' + ACTS[k].icon + ' ' + ACTS[k].name + '</span><span class="fk">' + ACTS[k].min + ' min</span><span class="fq">locker room · towels provided</span></button>').join('') + '</div>' +
    '<div class="row"><button type="button" class="small" data-a="ov-close">Not today</button></div></div>'
};
ACT['heat-open'] = () => openOv({ type: 'heat', date: state.selDate });
ACT['heat-pick'] = el => { const k = el.dataset.k, a = ACTS[k]; openOv({ type: 'act', k, date: state.ov.date || state.selDate, min: String(a.min), feel: null, hurt: false, note: '', name: '' }); };
ACT['water-bottle'] = async () => {
  const pid = me(), date = state.waterDate || todayIso(), before = scoreSnapshot();
  const ok = await addWater(date, BOTTLE_OZ); if (!ok) return;
  if (wm) wmDraw(); else render();
  celebrate('+' + BOTTLE_OZ + ' oz · ' + Math.round(dayTotals(pid, date).water) + ' of ' + weekGoals(pid, weekStart(date)).waterOz, { ms: 2200, before });
};

/* --- Healthplex cards in the activity menu: a tap flips the card to its details --- */
function hpCardHTML(pid, k) {
  const a = ACTS[k], caution = actCaution(pid, k), open = state.hpFlip === k, anim = open && state.hpAnim === k, tag = classTag(a);
  if (anim) state.hpAnim = null; // the flip plays once, for the tap that caused it
  if (!open) return '<button type="button" class="act hp" data-a="hp-flip" data-k="' + k + '" aria-expanded="false"><span class="ai" aria-hidden="true">' + a.icon + '</span><span class="an">' + esc(a.name) + '</span><span class="am">' + a.min + ' min · ' + (a.mv === false ? 'recovery' : IMPACT[a.impact]) + '</span>' +
    (tag ? '<span class="aw" data-tag="' + k + '">' + tag + '</span>' : '') + (caution.length ? '<span class="aw">Go easy: ' + caution.map(x => AREAS[x].toLowerCase()).join(', ') + '</span>' : '') + (painFlag(pid, k) ? '<span class="aw" data-pain="' + k + '">Pain noted ' + painCount(pid, k) + '× recently</span>' : '') + '</button>';
  return '<div class="act hp back' + (anim ? ' flipin' : '') + '" data-hpback="' + k + '"><span class="an">' + a.icon + ' ' + esc(a.name) + '</span><span class="aw" style="color:var(--muted)">' + esc(a.desc) + '</span>' +
    (tag ? '<span class="aw" data-tag="' + k + '">' + tag + '</span>' : '') + (a.heat ? '<span class="aw">' + HEAT_NOTE + '</span>' : '') +
    (caution.length ? '<span class="aw">Loads an area you are protecting: ' + caution.map(x => AREAS[x].toLowerCase()).join(', ') + '.</span>' : '') +
    '<span class="row" style="grid-column:1/-1;gap:6px"><button type="button" class="small' + (modeOf(pid) === 'log' ? ' on' : '') + '" data-a="act" data-k="' + k + '">Log it</button><button type="button" class="small' + (modeOf(pid) === 'live' ? ' on' : '') + '" data-a="hp-start" data-k="' + k + '">Start live</button><button type="button" class="quiet" data-a="hp-flip" data-k="' + k + '">Close</button></span></div>';
}
ACT['hp-flip'] = el => { const k = el.dataset.k; state.hpFlip = state.hpFlip === k ? null : k; state.hpAnim = state.hpFlip; redrawPicker(); };
ACT['hp-start'] = el => { const k = el.dataset.k, a = ACTS[k]; if (!a) return; if (state.ov) closeOv(); wmOpen(stagePlan(a.name, null, [stageFor(k)]), el); };
// Classes and court games, from the small link under the check-in.
OV.hpextra = {
  html: o => { const pid = me(), keys = Object.keys(ACTS).filter(k => ACTS[k].cls || k === 'hpcourt' || k === 'hpbball');
    return '<div class="ov tall" role="dialog" aria-modal="true" aria-label="Class or game">' + ovHead('Class or game', 'Optional. Never suggested, never needed for a goal or a badge') +
      '<div class="results" id="hpExtra">' + keys.map(k => { const a = ACTS[k], tag = classTag(a); return '<button type="button" class="fooditem" data-a="hpextra-pick" data-k="' + k + '"><span class="fn">' + a.icon + ' ' + esc(a.name) + '</span><span class="fk">' + a.min + ' min</span><span class="fq">' + (tag || 'Counts as an activity day like anything else') + (actCaution(pid, k).length ? ' · go easy: ' + actCaution(pid, k).map(x => AREAS[x].toLowerCase()).join(', ') : '') + '</span></button>'; }).join('') + '</div>' +
      '<p class="tiny muted">Classes count as activity days like anything else. Check the Healthplex schedule for times.</p></div>'; }
};
ACT['hp-extra'] = () => openOv({ type: 'hpextra', date: state.selDate });
ACT['hpextra-pick'] = el => { const k = el.dataset.k, a = ACTS[k]; openOv({ type: 'act', k, date: state.ov.date || state.selDate, min: String(a.min), feel: null, hurt: false, note: '', name: '', felt: 'extra' }); };

/* --- the check-in --- */
const CI_PROGRAM = [['strong', '💪', 'Feeling strong'], ['short', '⏱️', 'Short on time'], ['tired', '🚶', 'Tired, just want to move'], ['sore', '🧊', 'Sore or run down'], ['rest', '🛌', 'Not going today']];
const CI_CHOICE = [['good', '🙂', 'Feeling good'], ['low', '🌤️', 'Low energy'], ['sore', '🧊', 'Sore or run down'], ['rest', '🛌', 'Not today']];
const ciShown = pid => P(pid).plan === 'program' || atHealthplex(pid); // a pick-your-own profile gets it once its gym is the Healthplex
const safeAct = (pid, k) => !actCaution(pid, k).length && !painFlag(pid, k);
const whyNot = (pid, k) => actCaution(pid, k).length ? ACTS[k].name + ' loads ' + actCaution(pid, k).map(x => AREAS[x].toLowerCase()).join(' and ') + ', which you asked to go easy on.' : ACTS[k].name + ' has hurt ' + painCount(pid, k) + ' times lately.';
// the most recent saved days before `date`, newest first, and whether each one was a sore day
function soreTrail(pid, date) {
  return recordsOf(pid).filter(r => r.date < date).slice(-2).reverse().map(r => r.rec.checkin === 'sore' || r.n.acts.some(a => a.hurt));
}
const liftKindFor = date => { const k = kindFor(date, model(date)); return DAYS[k] ? k : nextDayKey(date); };
// The suggestion, by the rules in order. Returns { choice, why }.
function checkinSuggest(pid, date) {
  const sore = soreTrail(pid, date), wasSore = sore[0] && !sore[1]; // one recovery day after a sore day, not an endless run of them
  if (P(pid).plan !== 'program') {
    let choice = wasSore ? 'sore' : dayInfo(pid, addDays(date, -1)).active ? 'low' : 'good', why = wasSore ? 'Last time was a sore day.' : choice === 'low' ? 'You were active yesterday.' : 'A normal day: a little cardio, then the machines.';
    // never something that loads a protected area or has hurt twice lately: step down to the next gentlest
    if (choice === 'good') { const g = ciStages(pid, 'good'); if (g.blocked) { choice = 'low'; why = g.blocked + ' Low energy is the next gentlest.'; } else if (g.note) why = g.note; }
    if (choice === 'low') { const l = ciStages(pid, 'low'); if (l.blocked) { choice = 'sore'; why = l.blocked + ' Stretching is the next gentlest.'; } else if (l.note && !/next gentlest/.test(why)) why = l.note; }
    return { choice, why };
  }
  if (wasSore) return { choice: 'sore', why: 'Last time was a sore day.' };
  const rec = recordsOf(pid), y = rec.find(r => r.date === addDays(date, -1)), ws = weekStart(date), g = weekGoals(pid, ws);
  if (y && y.n.kind === 'strength') return { choice: 'tired', why: 'You lifted yesterday.' };
  const done = rec.filter(r => r.date >= ws && r.date < date && r.n.qualifies).length, need = g.plan === 'program' ? Math.max(0, g.liftGoal - done) : 0, left = 7 - ((dow(date) + 6) % 7);
  if (need > 0 && left <= 2 * need - 1) return { choice: 'short', why: need + ' lift' + (need === 1 ? '' : 's') + ' to go, ' + left + ' day' + (left === 1 ? '' : 's') + ' left.' }; // no room left to skip a day between lifts
  const last = lastLift(date, pid), gap = last ? Math.round((toUTC(date) - toUTC(last.date)) / 86400000) : null;
  if (gap != null && gap >= 3) return { choice: 'strong', why: gap + ' days since your last lift.' };
  return isWeekend(date) ? { choice: 'tired', why: 'A weekend: keep it easy.' } : { choice: 'strong', why: 'A weekday: a good day for the full lift.' };
}
// Cardio a lifting profile can pick when tired: [activity key or 'treadmill', label].
const cardioOptions = pid => atHealthplex(pid) ? [['hptrack', 'Track walk'], ['hprun', 'Track run/walk'], ['treadmill', 'Treadmill (Fitness+)'], ['bike', 'Bike'], ['elliptical', 'Elliptical'], ['hpswim', 'Lap swim']] : [['treadmill', 'Treadmill (Fitness+)'], ['bike', 'Bike'], ['elliptical', 'Elliptical'], ['walkbrisk', 'Brisk walk']];
// A pick-your-own check-in choice as stages (for live mode) and as parts (for the "Log it" sheet).
// `blocked`: the choice has a part with no safe option. `note`: a safe stand-in was used.
function ciStages(pid, choice) {
  const first = (keys, min) => { const k = keys.find(x => safeAct(pid, x)); return { k: k || keys[0], min, swapped: !!k && k !== keys[0], none: !k, from: keys[0] }; };
  const opts = keys => keys.map(k => [k, ACTS[k].name]);
  if (choice === 'good') {
    const a = first(['hptrack', 'hpbike'], 10), c = first(['hpcircuit'], 15);
    return { stages: [stageFor(a.k, a.min), stageFor(c.k, c.min)], parts: [{ opts: opts(['hptrack', 'hpbike']), k: a.k, min: 10 }, { opts: opts(['hpcircuit']), k: 'hpcircuit', min: 15 }],
      blocked: c.none ? whyNot(pid, 'hpcircuit') : a.none ? whyNot(pid, a.from) : '', note: a.swapped ? ACTS[a.k].name + ' instead: ' + whyNot(pid, a.from) : '' };
  }
  if (choice === 'low') { const a = first(['hppool', 'hpbike'], 15); return { stages: [stageFor(a.k, a.min)], parts: [{ opts: opts(['hppool', 'hpbike']), k: a.k, min: 15 }], blocked: a.none ? whyNot(pid, a.from) : '', note: a.swapped ? ACTS[a.k].name + ' instead: ' + whyNot(pid, a.from) : '' }; }
  return { stages: [{ type: 'stretch', act: 'stretchfull', name: 'Gentle stretch', min: 10, rounds: 2 }, { type: 'heat', act: 'hpsauna', name: 'Sauna, steam or whirlpool', min: 10 }], parts: STRETCH_PART, heat: true, blocked: '', note: '' };
}
const STRETCH_PART = [{ opts: [['stretchfull', 'Stretch']], k: 'stretchfull', min: 10 }];
// What a choice will be: a title, how long, the first moves, the plan live mode runs, and the "Log it" sheet.
function ciPreview(pid, date, choice, opt) {
  const program = P(pid).plan === 'program';
  if (choice === 'rest') return { title: 'Rest day', time: '', moves: ['Doesn\'t count as activity' + (program ? ' and doesn\'t move the rotation.' : '.')], rest: true };
  if (!program) {
    const s = ciStages(pid, choice), mins = sum(s.stages, x => x.min);
    return { title: choice === 'good' ? 'Easy cardio, then the machines' : choice === 'low' ? 'Easy and short' : 'Stretch, then heat', time: 'about ' + mins + ' min', moves: s.stages.map(x => x.name + ' · ' + x.min + ' min'), warn: s.blocked, note: s.note,
      plan: stagePlan(choice === 'good' ? 'Feeling good' : choice === 'low' ? 'Low energy' : 'Recovery', choice, s.stages), sheet: { parts: s.parts, heat: !!s.heat } };
  }
  if (choice === 'strong' || choice === 'short') {
    const kind = liftKindFor(date), m = Object.assign({}, model(date), { kindSel: kind, checkin: choice }), slots = plannedFor(date, kind, m), main = slots.filter(p => !(slotOf(kind, p.base) || {}).optional);
    return { title: (choice === 'short' ? 'Express ' : '') + DAYS[kind].name, time: choice === 'short' ? 'about 25 min' : 'about 45 min', lift: { kind, express: choice === 'short' },
      moves: slots.slice(0, 3).map(p => { const sp = specFor(p.key, date), sg = suggest(p.key, date); return EX[p.key].name + ' · ' + (choice === 'short' ? 3 : sp.sets) + ' × ' + sp.lo + '–' + sp.hi + (sg.w != null ? ' · ' + sg.w + ' lb' : ''); }), more: choice === 'short' ? '' : main.length > 3 ? '+ ' + (slots.length - 3) + ' more' : '' };
  }
  if (choice === 'tired') {
    const opts = cardioOptions(pid), k = opts.some(o => o[0] === opt) ? opt : opts[0][0], st = k === 'treadmill' ? { type: 'timer', act: 'treadmill', name: 'Treadmill (Fitness+)', min: 25 } : stageFor(k, 25);
    return { title: 'Easy cardio', time: '20 to 30 min', opts, opt: k, moves: [st.name + (st.type === 'laps' ? ' · tap each lap, 8 laps = 1 mile' : st.type === 'lengths' ? ' · tap each 25-yard length' : ' · a timer, with optional intervals')], plan: stagePlan('Cardio', 'tired', [st]), sheet: { parts: [{ opts, k, min: 25 }], heat: false } };
  }
  // sore: an easy walk, a stretch, then a recovery room where there is one
  const hp = atHealthplex(pid), opts = hp ? [['hptrack', 'Track'], ['hppool', 'Therapy pool']] : [['walkeasy', 'Easy walk']], k = opts.some(o => o[0] === opt) ? opt : opts[0][0];
  const stages = [stageFor(k, 10), { type: 'stretch', act: k, name: 'Stretch', min: 5, rounds: 1 }].concat(hp ? [{ type: 'heat', act: 'hpsauna', name: 'Sauna, steam or whirlpool', min: 10 }] : []);
  return { title: 'Recovery', time: hp ? 'about 25 min' : 'about 15 min', opts, opt: k, moves: stages.map(x => x.name + ' · ' + x.min + ' min'), plan: stagePlan('Recovery', 'sore', stages), sheet: { parts: STRETCH_PART, heat: hp } };
}

/* --- Log it or go live: each person's last pick, kept on their profile --- */
const modeOf = pid => P(pid).trainMode === 'live' ? 'live' : 'log';
const modeSwitchHTML = pid => '<div class="seg modesw" id="modeSwitch" role="group" aria-label="Log it, or go live">' + [['log', 'Log it'], ['live', 'Go live']].map(x =>
  '<button type="button" data-a="mode-set" data-v="' + x[0] + '" class="' + (modeOf(pid) === x[0] ? 'on' : '') + '" aria-pressed="' + (modeOf(pid) === x[0]) + '">' + x[1] + '</button>').join('') + '</div>';
ACT['mode-set'] = async el => { const v = el.dataset.v === 'live' ? 'live' : 'log'; if (v === modeOf(me())) return; if (await saveProfile(me(), { trainMode: v })) render('[data-a="mode-set"][data-v="' + v + '"]'); };
const ciList = pid => P(pid).plan === 'program' ? CI_PROGRAM : CI_CHOICE;
const ciLabel = (pid, c) => { const r = ciList(pid).find(x => x[0] === c) || CI_PROGRAM.concat(CI_CHOICE).find(x => x[0] === c); return r ? r[2] : c === 'extra' ? 'Class or game' : ''; };
function dayWhat(pid, date) { // one or two words for what a logged day is
  const r = state.data[pid].sessions[date]; if (!r) return '';
  const n = normalize(r); return n.kind === 'strength' ? (n.day ? DAYS[n.day].name : 'Lift') : n.kind === 'cardio' ? 'Treadmill' : n.kind === 'rest' ? 'Rest day' : n.acts.length ? actName(n.acts.find(a => a.mv !== false) || n.acts[0]) : 'logged';
}
// The check-in sits first on Train, under the Log it / Go live switch, for today only. Once a choice is made or
// anything is logged today it is one line with "Change", so the log is what the screen is about.
function checkinHTML() {
  const pid = me(), date = state.selDate;
  if (date !== todayIso() || !ciShown(pid)) return '';
  const sw = modeSwitchHTML(pid), going = wmResumable(pid, date), rec = state.data[pid].sessions[date], d = state.draftsBy[pid][date], open = !!(state.ci && state.ci.date === date && state.ci.pid === pid);
  const line = (text, btn) => sw + '<section class="card ci line" id="checkin"><div class="row between" style="flex-wrap:nowrap"><span id="ciDone">' + text + '</span>' + btn + '</div></section>';
  if (going) return line('<b>Workout in progress</b> · ' + esc(going.title), '<button type="button" class="small on" id="wmResume" data-a="wm-resume">Resume workout</button>');
  if (!open) {
    const felt = (rec && CHECKIN_WORDS[rec.checkin] && rec.checkin) || (d && CHECKIN_WORDS[d.checkin] && d.checkin) || null;
    if (rec || felt) {
      const liftPick = !rec && (felt === 'strong' || felt === 'short') && DAYS[kindFor(date, d)], what = rec ? dayWhat(pid, date) : liftPick ? DAYS[kindFor(date, d)].name : '';
      return line('<b>' + (felt ? ciLabel(pid, felt) : 'Today is logged') + '</b>' + (what ? ' · ' + esc(what) : ''), '<button type="button" class="quiet" id="ciChange" data-a="ci-again">Change</button>');
    }
  }
  const list = ciList(pid), sg = checkinSuggest(pid, date), sel = open ? state.ci.choice : null, anim = sel && state.ciAnim === sel, mode = modeOf(pid);
  if (anim) state.ciAnim = null; // the expand plays once, for the tap that caused it
  let h = sw + '<section class="card stack ci" id="checkin"' + (sel ? ' data-open="' + sel + '"' : '') + (anim ? ' data-anim="1"' : '') + '><div class="row between"><h3>How are you feeling?</h3><span class="tiny muted">' + nice(date) + '</span></div>';
  list.forEach(c => {
    const on = sel === c[0], sug = sg.choice === c[0];
    h += '<button type="button" class="cic' + (on ? ' sel' + (anim ? ' lift' : '') : sel ? ' fade' : '') + (sug ? ' sug' : '') + '" data-a="ci-pick" data-v="' + c[0] + '" aria-expanded="' + on + '"><span class="ci-i" aria-hidden="true">' + c[1] + '</span><span class="ci-t"><b>' + c[2] + '</b>' +
      (sug ? '<span class="tiny" data-ci-why>' + esc(sg.why) + '</span>' : '') + '</span>' + (sug ? '<span class="chip accent" id="ciSuggested">Suggested</span>' : '') + '</button>';
    if (!on) return;
    const pv = ciPreview(pid, date, c[0], state.ci.opt), btn = (id, a, label, main) => '<button type="button" class="' + (main ? 'primary' : 'second') + '" id="' + id + '" data-a="' + a + '">' + label + '</button>';
    h += '<div class="cip' + (anim ? ' grow' : '') + '" id="ciPreview"><div class="row between"><b id="ciTitle">' + esc(pv.title) + '</b><span class="muted tiny" id="ciTime">' + esc(pv.time) + '</span></div>' +
      (pv.opts ? '<div class="chips wrapc" id="ciOpts">' + pv.opts.map(o => '<button type="button" data-a="ci-opt" data-v="' + o[0] + '" class="' + (pv.opt === o[0] ? 'on' : '') + '" aria-pressed="' + (pv.opt === o[0]) + '">' + o[1] + '</button>').join('') + '</div>' : '') +
      '<ol class="ci-moves" id="ciMoves">' + pv.moves.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol>' + (pv.more ? '<span class="tiny muted">' + pv.more + '</span>' : '') +
      (pv.warn ? '<p class="banner" id="ciWarn">' + esc(pv.warn) + ' You can still do it: keep it short and easy.</p>' : pv.note ? '<p class="tiny muted" id="ciNote">' + esc(pv.note) + '</p>' : '') +
      // two equal buttons: type it in, or do it live. The one this person used last leads.
      (pv.rest ? '<div class="row two">' + btn('ciRest', 'ci-rest', 'Log rest day', true) + '</div>' : '<div class="row two" id="ciGo">' + btn('ciLog', 'ci-log', 'Log it', mode === 'log') + btn('ciStart', 'ci-start', 'Start live', mode === 'live') + '</div>') +
      '<div class="row"><button type="button" class="quiet" data-a="ci-back">Back</button></div></div>';
  });
  if (atHealthplex(pid)) h += '<div class="row"><button type="button" class="quiet" id="ciExtra" data-a="hp-extra">Class or game (optional)</button></div>';
  return h + '</section>';
}
ACT['ci-pick'] = (el, e) => {
  const v = el.dataset.v, r = el.getBoundingClientRect();
  state.ci = { pid: me(), date: state.selDate, choice: v, opt: null }; state.ciAnim = v; state.ciPicks = (state.ciPicks || 0) + 1;
  render('#ciPreview .primary');
  burst({ count: 14, x: (r.left + r.width / 2) / window.innerWidth, y: Math.min(0.9, (r.top + r.height / 2) / window.innerHeight) }); // Full animations only
};
ACT['ci-opt'] = el => { if (state.ci) { state.ci.opt = el.dataset.v; render('[data-a="ci-opt"][data-v="' + el.dataset.v + '"]'); } };
ACT['ci-back'] = () => { const v = state.ci && state.ci.choice; state.ci = null; render(v ? '[data-a="ci-pick"][data-v="' + v + '"]' : null); };
ACT['ci-again'] = () => { state.ci = { pid: me(), date: state.selDate, choice: null, opt: null }; render('#checkin .cic'); };
ACT['ci-start'] = el => {
  const c = state.ci; if (!c) return;
  const pv = ciPreview(c.pid, c.date, c.choice, c.opt);
  if (pv.lift) wmOpen({ kind: 'lift', title: pv.title, felt: c.choice, day: pv.lift.kind, express: pv.lift.express }, el);
  else if (pv.plan) wmOpen(pv.plan, el);
};
ACT['ci-rest'] = async () => {
  const c = state.ci, before = scoreSnapshot(); if (!c) return;
  if (P(c.pid).plan === 'program') { const d = draft(c.date); d.kindSel = 'rest'; d.checkin = c.choice; persistDrafts(); state.ci = null; const ok = await save(); if (!ok) render(); return; }
  const ok = await logRest(c.date, c.choice); if (!ok) return;
  state.ci = null; render(); celebrate('Rest day logged. Rest is part of the plan.', { before });
};

/* --- "Log it": the same session, typed in instead of done live --- */
// A lift goes to the lifting log: the day is selected, the check-in is kept on the draft, and the first weight field
// has the cursor. Everything else gets one short sheet: the activity, minutes, and laps or lengths where they apply.
ACT['ci-log'] = () => {
  const c = state.ci; if (!c) return;
  const pv = ciPreview(c.pid, c.date, c.choice, c.opt);
  if (pv.lift) {
    const d = draft(c.date); d.kindSel = pv.lift.kind; d.checkin = c.choice; d.recovered = false; persistDrafts();
    const first = plannedFor(c.date, pv.lift.kind, d).find(p => !EX[p.key].bw);
    state.ci = null; state.scrollTo = 'logHead'; state.logJumps = (state.logJumps || 0) + 1;
    render(first ? '#w-' + first.key : '#tmMin'); return;
  }
  if (!pv.sheet) return;
  const o = { type: 'cilog', date: c.date, felt: c.choice, title: pv.title, parts: pv.sheet.parts, heat: !!pv.sheet.heat, room: 'hpsauna', heatMin: '' };
  pv.sheet.parts.forEach((p, i) => { o['k' + i] = p.k; o['min' + i] = String(p.min); o['laps' + i] = ''; });
  openOv(o);
};
const partKind = k => ACTS[k] && ACTS[k].wm === 'laps' ? 'laps' : ACTS[k] && ACTS[k].wm === 'lengths' ? 'lengths' : 'timer';
const partName = k => k === 'treadmill' ? 'Treadmill (Fitness+)' : ACTS[k] ? ACTS[k].name : 'Activity';
const distText = (kind, n) => kind === 'laps' ? n + ' lap' + (n === 1 ? '' : 's') + ' (' + milesText(n) + ')' : n + ' length' + (n === 1 ? '' : 's') + ' (' + n * POOL_YARDS + ' yd)';
const distLine = (kind, v) => { const n = Math.round(Number(v)); return n > 0 ? (kind === 'laps' ? n + ' lap' + (n === 1 ? '' : 's') + ' = ' + milesText(n) : n + ' length' + (n === 1 ? '' : 's') + ' = ' + n * POOL_YARDS + ' yards') : kind === 'laps' ? 'Each lap is 1/8 mile.' : 'Each length is ' + POOL_YARDS + ' yards.'; };
const cilogMin = o => o.parts.reduce((t, p, i) => t + (Math.round(Number(o['min' + i])) > 0 ? Math.round(Number(o['min' + i])) : 0), 0) + (o.heat && Math.round(Number(o.heatMin)) > 0 ? Math.round(Number(o.heatMin)) : 0);
const cilogLabel = o => { const m = cilogMin(o); return m > 0 ? 'Log ' + m + ' min' : 'Log it'; };
function refreshCilog() { // typing patches the labels in place, so the keyboard stays up
  const o = state.ov; if (!o || o.type !== 'cilog') return;
  o.parts.forEach((p, i) => { const el = document.getElementById('cilogDist' + i), kind = partKind(o['k' + i]); if (el && kind !== 'timer') el.textContent = distLine(kind, o['laps' + i]); });
  const b = $('#cilogSave'); if (b) b.textContent = cilogLabel(o);
}
OV.cilog = {
  html: o => {
    const num = (id, key, label, max, ph) => '<label class="f">' + label + '<input type="number" id="' + id + '" data-ovf="' + key + '" inputmode="numeric" pattern="[0-9]*" min="0" max="' + max + '" value="' + esc(o[key]) + '" placeholder="' + (ph || '–') + '"></label>';
    let h = '<div class="ov" role="dialog" aria-modal="true" aria-label="Log it">' + ovHead(esc(o.title), 'Log it · ' + rel(o.date).toLowerCase());
    o.parts.forEach((p, i) => {
      const k = o['k' + i], kind = partKind(k);
      h += '<div class="stack" data-part="' + i + '">' + (p.opts.length > 1 ? '<div class="chips wrapc" id="cilogOpts' + i + '">' + p.opts.map(x => '<button type="button" data-a="cilog-opt" data-i="' + i + '" data-v="' + x[0] + '" class="' + (k === x[0] ? 'on' : '') + '" aria-pressed="' + (k === x[0]) + '">' + x[1] + '</button>').join('') + '</div>' : '<div class="eyebrow">' + p.opts[0][1] + '</div>') +
        '<div class="formgrid">' + num('cilogMin' + i, 'min' + i, 'Minutes', 300) + (kind === 'laps' ? num('cilogLaps' + i, 'laps' + i, 'Laps (8 = 1 mile)', 400) : kind === 'lengths' ? num('cilogLaps' + i, 'laps' + i, 'Lengths (25 yards each)', 400) : '') + '</div>' +
        (kind !== 'timer' ? '<p class="tiny muted num" id="cilogDist' + i + '">' + distLine(kind, o['laps' + i]) + '</p>' : '') + '</div>';
    });
    if (o.heat) h += '<div class="stack" id="cilogHeat"><div class="eyebrow">Sauna, steam or whirlpool (optional)</div><div class="seg">' + HEAT_KEYS.map(k => '<button type="button" data-a="cilog-room" data-k="' + k + '" class="' + (o.room === k ? 'on' : '') + '" aria-pressed="' + (o.room === k) + '">' + ACTS[k].name + '</button>').join('') + '</div>' +
      '<div class="formgrid">' + num('cilogHeatMin', 'heatMin', 'Minutes, up to 20', 20) + '</div><p class="tiny muted">Logs as recovery: it shows in History but does not count toward active minutes. ' + HEAT_NOTE + '</p></div>';
    return h + '<div class="row"><button type="button" class="primary" id="cilogSave" data-a="cilog-save">' + cilogLabel(o) + '</button><button type="button" class="small" data-a="ov-close">Back</button></div></div>';
  }
};
ACT['cilog-opt'] = el => { const o = state.ov; o['k' + el.dataset.i] = el.dataset.v; renderOv(); };
ACT['cilog-room'] = el => { state.ov.room = el.dataset.k; renderOv(); };
ACT['cilog-save'] = async () => {
  const o = state.ov, date = o.date, felt = o.felt, now = new Date().toISOString(), names = [], notes = []; let min = 0, first = null;
  for (let i = 0; i < o.parts.length; i++) {
    const k = o['k' + i], raw = String(o['min' + i] == null ? '' : o['min' + i]).trim(), m = Math.round(Number(raw)), kind = partKind(k), laps = Math.round(Number(o['laps' + i])) || 0;
    if (raw === '' || m === 0) continue;
    if (!(m > 0) || m > 300) { toast('Enter minutes between 1 and 300.'); return; }
    if (laps < 0 || laps > 400) { toast('Check the ' + (kind === 'laps' ? 'laps' : 'lengths') + '.'); return; }
    first = first || k; min += m; names.push(partName(k)); notes.push({ name: partName(k), m, d: kind !== 'timer' && laps > 0 ? distText(kind, laps) : '' });
  }
  const hRaw = o.heat ? String(o.heatMin == null ? '' : o.heatMin).trim() : '', hm = Math.round(Number(hRaw));
  if (hRaw !== '' && hm !== 0 && (!(hm > 0) || hm > 20)) { toast('Keep the sauna, steam room or whirlpool to 20 minutes or less.', 3400); return; }
  const heat = hRaw !== '' && hm > 0 ? { k: HEAT_KEYS.includes(o.room) ? o.room : 'hpsauna', min: hm } : null;
  if (!min && !heat) { toast('Enter the minutes first.'); return; }
  // one part: just its laps or lengths. Several: each part's minutes, so the total can be read back.
  const note = notes.length === 1 ? notes[0].d : notes.map(x => x.name + ' ' + x.m + ' min' + (x.d ? ', ' + x.d : '')).join(' · ');
  if (first === 'treadmill') { // the lifting log's own treadmill day, saved by the same Save
    const d = draft(date); d.kindSel = 'cardio'; d.tm.minutes = String(min); if (felt) d.checkin = felt; d.recovered = false; persistDrafts();
    state.ci = null; closeOv(); if (state.selDate !== date) state.selDate = date;
    const ok = await save(); if (!ok) render(); return;
  }
  const before = scoreSnapshot(); let ok = true;
  if (min) { const a = ACTS[first] || ACTS.other; ok = await logActivity(date, { id: uid(), a: ACTS[first] ? first : 'other', name: names.join(' + '), min, feel: null, hurt: false, note, mv: a.mv !== false, at: now }, felt); }
  if (ok && heat) ok = await logActivity(date, { id: uid(), a: heat.k, name: ACTS[heat.k].name, min: heat.min, feel: null, hurt: false, note: '', mv: false, at: now }, felt);
  if (!ok) return;
  state.ci = null; closeOv(); render();
  const di = dayInfo(me(), date);
  celebrate((min ? min + ' min logged. ' : '') + (heat ? heat.min + ' min of ' + ACTS[heat.k].name.toLowerCase() + ' as recovery. ' : '') + (min ? (di.active ? 'That is an active day.' : 'Not an active day yet.') : ''), { before, force: di.active && min > 0 });
};
