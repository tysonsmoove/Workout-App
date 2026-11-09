/* ---------- Me: profile, badges, look, daily targets ---------- */
function bodyVals(pid) {
  const p = P(pid), b = p.body, d = p.doctor, lb = latestWeight(pid), f = state.forms.body || {};
  const v = (k, stored) => k in f ? f[k] : (stored == null ? '' : String(stored));
  return { sex: v('sex', b.sex), age: v('age', b.age), ft: v('ft', b.heightIn ? Math.floor(b.heightIn / 12) : ''), inch: v('inch', b.heightIn ? Math.round((b.heightIn % 12) * 10) / 10 : ''), lb: v('lb', lb),
    activity: v('activity', b.activity || 'light'), pace: v('pace', b.pace || 'maintain'), dkcal: v('dkcal', d.kcal), dwater: v('dwater', d.waterOz) };
}
function sparkSVG(pts) {
  if (pts.length < 2) return '';
  const W = 300, H = 64, pad = 6, vs = pts.map(p => p.v), mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs), span = (mx - mn) || 1;
  const x = i => pad + (W - 2 * pad) * i / (pts.length - 1), y = v => pad + (H - 2 * pad) * (1 - (v - mn) / span);
  return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Weight trend across ' + pts.length + ' weigh-ins, from ' + mn + ' to ' + mx + ' pounds"><path d="' + pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ') + '"/><circle cx="' + x(pts.length - 1).toFixed(1) + '" cy="' + y(vs[vs.length - 1]).toFixed(1) + '" r="3.5"/></svg>';
}
function targetNotes(pid) {
  const g = goalsFor(pid), b = P(pid).body, out = [];
  if (g.kcalSrc === 'doctor') out.push('Calories: the number from your doctor.');
  else if (g.kcalSrc === 'estimate') out.push('Calories: resting energy of ' + commas(g.bmr) + ' (Mifflin-St Jeor equation) times ' + (ACTIVITY[b.activity] || ACTIVITY.light)[0] + ' for activity is ' + commas(g.tdee) + ' a day. ' + (PACE[b.pace] || PACE.maintain)[1] + (g.floor ? ', held at the ' + (b.sex === 'm' ? '1,500' : '1,200') + ' calorie minimum.' : '.'));
  else out.push('Calories: a placeholder of 2,000 until you add sex, age, height and weight below.');
  if (g.waterSrc === 'doctor') out.push('Water: the number from your doctor.');
  else if (g.waterSrc === 'weight') out.push('Water: half your body weight in ounces, which is above the National Academies guideline of ' + g.waterBase + ' oz of beverages a day.');
  else if (g.waterSrc === 'sex') out.push('Water: the National Academies guideline of about ' + (g.waterBase === 104 ? '13' : '9') + ' cups (' + g.waterBase + ' oz) of beverages a day.');
  else out.push('Water: a placeholder of 80 oz until you add your numbers.');
  return out;
}
function renderMe() {
  const pid = me(), p = P(pid), g = goalsFor(pid), bs = badgesFor(pid), earned = bs.filter(b => b.earned).length, sk = p.skin, v = bodyVals(pid);
  const seg = (a, k, cur, opts) => '<div class="seg">' + Object.keys(opts).map(o => '<button type="button" data-a="' + a + '" data-k="' + k + '" data-v="' + o + '" class="' + (cur === o ? 'on' : '') + '" aria-pressed="' + (cur === o) + '">' + (Array.isArray(opts[o]) ? opts[o][0] : opts[o]) + '</button>').join('') + '</div>';
  let h = '<section class="card"><div class="row" style="flex-wrap:nowrap">' + avatarHTML(pid, 'lg') + '<div class="grow"><h2>' + esc(p.name) + '</h2><div class="tiny muted">' + (p.plan === 'program' ? 'Lifting program' : 'Pick-your-own workouts') + ' · ' + earned + ' badge' + (earned === 1 ? '' : 's') + '</div></div><button type="button" class="small" data-a="who">Switch</button></div></section>';

  h += '<section class="card stack"><div class="row between"><h3>Badges</h3><span class="chip" id="badgeCount">' + earned + ' of ' + bs.length + '</span></div><div class="badges">' +
    bs.map(b => '<button type="button" class="badge' + (b.earned ? '' : ' locked') + '" data-a="badge" data-id="' + b.id + '" aria-label="' + esc(b.name) + (b.earned ? ', earned' : ', locked') + '"><span class="medal">' + b.icon + '</span><span class="bn">' + esc(b.name) + '</span></button>').join('') + '</div></section>';

  const cur = skinVars(sk), customHex = sk.custom || '#E83E8C';
  h += '<section class="card stack" id="lookCard"><div class="row between"><h3>Your look</h3><span class="tiny muted">' + esc(cur.name) + '</span></div>' +
    '<div><div class="eyebrow">Color</div><div class="swatches" style="margin-top:6px">' + Object.keys(SKINS).map(k => { const s = SKINS[k]; return '<button type="button" class="sw' + (!sk.custom && sk.preset === k ? ' on' : '') + '" data-a="skin-preset" data-v="' + k + '" style="--ph:' + s.ah + ';--ps:' + s.as + '%;--pl:' + s.al + '%;--pld:' + s.ald + '%" aria-label="' + s.name + '" aria-pressed="' + (!sk.custom && sk.preset === k) + '" title="' + s.name + '"></button>'; }).join('') +
    '<input type="color" id="skinColor" value="' + esc(customHex) + '" aria-label="Pick any color" title="Pick any color"' + (sk.custom ? ' style="box-shadow:0 0 0 3px var(--fg)"' : '') + '></div></div>' +
    '<div><div class="eyebrow">Headings</div>' + seg('skin-set', 'font', sk.font, FONTS) + '</div>' +
    '<div><div class="eyebrow">Corners</div>' + seg('skin-set', 'shape', sk.shape, SHAPES) + '</div>' +
    '<div><div class="eyebrow">Backdrop</div>' + seg('skin-set', 'backdrop', sk.backdrop, BACKDROPS) + '</div>' +
    '<div><div class="row between"><div class="eyebrow">Celebrations</div><button type="button" class="quiet" data-a="fx-preview">Preview</button></div>' + seg('skin-set', 'fx', sk.fx, FXS) + '</div>' +
    '<div><div class="eyebrow">Avatar</div><div class="emojis" style="margin-top:6px">' + AVATARS.map(a => '<button type="button" data-a="avatar-set" data-v="' + a + '" class="' + ((p.avatar || '') === a ? 'on' : '') + '" aria-pressed="' + ((p.avatar || '') === a) + '" aria-label="' + (a ? 'Avatar ' + a : 'Use my initial') + '">' + (a || esc(p.name.slice(0, 1).toUpperCase())) + '</button>').join('') + '</div></div>' +
    '<div class="row" style="flex-wrap:nowrap;align-items:flex-end"><label class="f grow">Display name<input type="text" data-form="name" data-k="name" maxlength="20" value="' + esc('name' in (state.forms.name || {}) ? state.forms.name.name : p.name) + '"></label><button type="button" class="small" data-a="name-save" style="min-height:44px">Save</button></div>' +
    '<p class="tiny muted">Your look applies whenever your profile is active, on any phone.</p></section>';

  h += '<section class="card stack" id="bodyCard"><div class="row between"><h3>Daily targets</h3>' + (g.ready ? '<span class="chip good">' + (g.kcalSrc === 'doctor' ? 'doctor' : 'estimate') + '</span>' : '<span class="chip warn">placeholder</span>') + '</div>' +
    '<div class="kv"><span>Calories</span><b id="tKcal">' + commas(g.kcal) + '</b><span class="muted">Counts between</span><b class="muted">' + commas(g.lo) + '–' + commas(g.hi) + '</b><span>Water</span><b id="tWater">' + g.waterOz + ' oz</b><span class="muted">Protein · carbs · fat guide</span><b class="muted">' + g.protein + ' · ' + g.carbs + ' · ' + g.fat + ' g</b></div>' +
    '<div class="tiny muted stack" style="gap:4px">' + targetNotes(pid).map(x => '<p>' + esc(x) + '</p>').join('') + '</div>' +
    '<div><div class="eyebrow">Sex, for the estimate</div><div class="seg" style="margin-top:4px">' + [['m', 'Male'], ['f', 'Female']].map(o => '<button type="button" data-a="form-set" data-form="body" data-k="sex" data-v="' + o[0] + '" class="' + (v.sex === o[0] ? 'on' : '') + '" aria-pressed="' + (v.sex === o[0]) + '">' + o[1] + '</button>').join('') + '</div></div>' +
    '<div class="formgrid">' +
    '<label class="f">Age<input type="number" data-form="body" data-k="age" inputmode="numeric" min="18" max="100" value="' + esc(v.age) + '"></label>' +
    '<label class="f">Weight lb<input type="number" data-form="body" data-k="lb" inputmode="decimal" min="60" max="700" value="' + esc(v.lb) + '"></label>' +
    '<label class="f">Height ft<input type="number" data-form="body" data-k="ft" inputmode="numeric" min="3" max="8" value="' + esc(v.ft) + '"></label>' +
    '<label class="f">Height in<input type="number" data-form="body" data-k="inch" inputmode="decimal" min="0" max="11.9" value="' + esc(v.inch) + '"></label>' +
    '<label class="f wide">Day-to-day activity<select data-form="body" data-k="activity">' + Object.keys(ACTIVITY).map(k => '<option value="' + k + '"' + (v.activity === k ? ' selected' : '') + '>' + ACTIVITY[k][1] + '</option>').join('') + '</select></label>' +
    '<label class="f wide">Goal<select data-form="body" data-k="pace">' + Object.keys(PACE).map(k => '<option value="' + k + '"' + (v.pace === k ? ' selected' : '') + '>' + PACE[k][1] + '</option>').join('') + '</select></label>' +
    '</div>' +
    '<div><div class="eyebrow">From your doctor (optional, replaces the estimate)</div><div class="formgrid" style="margin-top:4px">' +
    '<label class="f">Calories a day<input type="number" data-form="body" data-k="dkcal" inputmode="numeric" min="800" max="6000" value="' + esc(v.dkcal) + '" placeholder="–"></label>' +
    '<label class="f">Water oz a day<input type="number" data-form="body" data-k="dwater" inputmode="numeric" min="20" max="250" value="' + esc(v.dwater) + '" placeholder="–"></label></div></div>' +
    '<div class="row"><button type="button" class="primary" data-a="body-save">Save targets</button></div>' +
    '<p class="tiny muted">These are general estimates for healthy adults, not medical advice. If you are pregnant, nursing, or managing a condition such as diabetes, kidney or heart disease, use the numbers your doctor gives you. Your weight and calories stay on this screen and never show in the competition.</p></section>';

  const wi = p.weighIns, wd = Object.keys(wi).filter(d => validIso(d) && isNum(wi[d])).sort(), pts = wd.slice(-30).map(d => ({ d, v: wi[d] }));
  h += '<section class="card stack"><div class="row between"><h3>Weigh-ins</h3>' + (wd.length ? '<span class="tiny muted num">' + wi[wd[wd.length - 1]] + ' lb · ' + shortDate(wd[wd.length - 1]) + '</span>' : '') + '</div>' + sparkSVG(pts) +
    (wd.length >= 2 ? '<p class="tiny muted num">' + (function () { const ch = Math.round((wi[wd[wd.length - 1]] - wi[wd[0]]) * 10) / 10; return (ch === 0 ? 'No change' : (ch < 0 ? 'Down ' : 'Up ') + Math.abs(ch) + ' lb') + ' since ' + shortDate(wd[0]) + '.'; })() + '</p>' : '<p class="tiny muted">Log a weight now and then. Same scale, same time of day, once a week is plenty.</p>') +
    '<div class="row" style="flex-wrap:nowrap;align-items:flex-end"><label class="f grow">Today\'s weight lb<input type="number" data-form="weigh" data-k="lb" inputmode="decimal" min="60" max="700" value="' + esc((state.forms.weigh || {}).lb || '') + '" placeholder="–"></label><button type="button" class="small" data-a="weigh-save" style="min-height:44px">Log</button></div></section>';

  h += '<section class="card stack" id="healthCard"><h3>Apple Health and Apple Watch</h3><p class="tiny muted">A web page cannot read Apple Health directly. A one-tap shortcut on your iPhone copies the day\'s Exercise Minutes, steps, active calories, water and weight, and you paste them in.</p>' +
    '<div class="row"><button type="button" class="small" data-a="health">Import from Health</button></div>' +
    '<details class="plain" data-dk="hksteps"><summary>Set up the shortcut, once per iPhone</summary><div style="margin-top:8px">' + shortcutStepsHTML() + '</div></details></section>';
  h += '<section class="card stack"><h3>Workout style</h3>' + seg('plan-set', 'plan', p.plan, { program: 'Lifting program', choice: 'Pick-your-own' }) +
    '<p class="tiny muted">' + (p.plan === 'program' ? 'Push, Pull, Legs rotation with weight suggestions. Weekly goal: ' + moveGoal(pid) + ' activity days, ' + LIFT_GOAL + ' of them lifts.' : 'Choose from a gentle menu each day. Weekly goal: ' + moveGoal(pid) + ' active days of ' + minMin(pid) + ' minutes or more. Adjust it under Train, Plan.') + ' Switching keeps everything already logged.</p></section>';

  const sync = state.storage === 'db' ? (state.cantWrite ? 'This account can read the shared log but not save to it.' : 'Saving to the shared log on your Claude account.') : state.storage === 'local' ? 'Saving in this browser only.' : state.storage === 'nodb' ? 'The shared log cannot be reached right now.' : 'Connecting…';
  h += '<section class="card stack"><h3>Two phones, one log</h3><p class="tiny muted">' + sync + '</p><p class="tiny muted">Both profiles live in one shared log. To use it from two phones, open this page\'s Share menu and invite your partner by email as an Editor, or sign in to the same Claude account on both. Each phone remembers which profile it uses, and the top-right button switches.</p></section>';
  return h;
}
ACT.badge = el => { const b = badgesFor(me()).find(x => x.id === el.dataset.id); if (b) openOv({ type: 'badgeinfo', badge: b }); };
ACT['skin-preset'] = async el => { await saveProfile(me(), { skin: { preset: el.dataset.v, custom: null } }); applySkin(); render(); };
ACT['skin-set'] = async el => { const patch = {}; patch[el.dataset.k] = el.dataset.v; await saveProfile(me(), { skin: patch }); applySkin(); render(); if (el.dataset.k === 'fx') burst({ count: 60 }); };
ACT['fx-preview'] = () => burst({ count: 90 });
ACT['avatar-set'] = async el => { await saveProfile(me(), { avatar: el.dataset.v || '' }); render(); };
ACT['name-save'] = async () => {
  const name = String((state.forms.name || {}).name == null ? P(me()).name : state.forms.name.name).trim().slice(0, 20);
  if (!name) { toast('Enter a name.'); return; }
  typing = false;
  const ok = await saveProfile(me(), { name }); if (!ok) return; // a refused save keeps what was typed
  delete state.forms.name; render(); toast('Saved');
};
ACT['form-set'] = el => { const f = el.dataset.form; (state.forms[f] = state.forms[f] || {})[el.dataset.k] = el.dataset.v; render(); };
ACT['plan-set'] = async el => { if (P(me()).plan === el.dataset.v) return; await saveProfile(me(), { plan: el.dataset.v }); settle(); render(); toast(el.dataset.v === 'program' ? 'Lifting program on. Your Train tab is the Push, Pull, Legs log.' : 'Pick-your-own on. Your Train tab is the activity menu.', 3200); };
ACT['body-save'] = async () => {
  const pid = me(), v = bodyVals(pid), num = s => { const t = String(s).trim(); return t === '' ? null : Number(t); };
  const age = num(v.age), ft = num(v.ft), inch = num(v.inch), lb = num(v.lb), dkcal = num(v.dkcal), dwater = num(v.dwater);
  const bad = (x, lo, hi) => x != null && !(x >= lo && x <= hi);
  if (bad(age, 18, 100)) { toast('The estimate is for adults: enter an age from 18 to 100, or leave it blank and use your doctor\'s numbers.', 4000); return; }
  if (bad(ft, 3, 8) || bad(inch, 0, 11.99)) { toast('Height: feet from 3 to 8, inches from 0 to 11.'); return; }
  if (bad(lb, 60, 700)) { toast('Weight: 60 to 700 lb.'); return; }
  if (bad(dkcal, 800, 6000)) { toast('Doctor\'s calories: 800 to 6,000, or blank.'); return; }
  if (bad(dwater, 20, 250)) { toast('Doctor\'s water: 20 to 250 oz, or blank.'); return; }
  const heightIn = ft != null ? ft * 12 + (inch || 0) : null;
  const patch = { body: { sex: v.sex === 'm' || v.sex === 'f' ? v.sex : null, age, heightIn, weightLb: lb, activity: ACTIVITY[v.activity] ? v.activity : 'light', pace: PACE[v.pace] ? v.pace : 'maintain' }, doctor: { kcal: dkcal, waterOz: dwater } };
  if (lb != null && lb !== latestWeight(pid)) { patch.weighIns = {}; patch.weighIns[todayIso()] = lb; }
  typing = false;
  const ok = await saveProfile(pid, patch); if (!ok) return;
  delete state.forms.body; settle(); render();
  const g = goalsFor(pid);
  toast(g.ready ? 'Targets set: ' + commas(g.kcal) + ' calories and ' + g.waterOz + ' oz of water a day.' : 'Saved. Add sex, age, height and weight, or a doctor\'s number, to replace the placeholder.', 3600);
};
ACT['weigh-save'] = async () => {
  const lb = Number(String((state.forms.weigh || {}).lb || '').trim());
  if (!(lb >= 60 && lb <= 700)) { toast('Enter a weight from 60 to 700 lb.'); return; }
  const patch = { weighIns: {}, body: { weightLb: lb } }; patch.weighIns[todayIso()] = lb;
  typing = false;
  const ok = await saveProfile(me(), patch); if (!ok) return;
  delete state.forms.weigh; settle(); render(); toast('Weigh-in logged: ' + lb + ' lb.');
};

/* ---------- Profile switcher ---------- */
OV.who = {
  locked: o => !!o.first,
  html: o => '<div class="ov" role="dialog" aria-modal="true" aria-label="Choose a profile">' + (o.first ? '<div><h2>Who is logging?</h2><div class="tiny muted">This phone remembers your pick. Switch any time from the top right.</div></div>' : ovHead('Switch profile')) +
    PIDS.map(pid => { const p = P(pid); return '<button type="button" class="whocard' + (state.pid === pid ? ' on' : '') + '" data-a="who-pick" data-pid="' + pid + '">' + avatarHTML(pid, 'lg') + '<span><b style="font-size:1.125rem">' + esc(p.name) + '</b><br><span class="tiny muted">' + (p.plan === 'program' ? 'Lifting program' : 'Pick-your-own workouts') + '</span></span><span class="num muted">' + (state.ready ? weekScore(pid).total + ' pts' : '') + '</span></button>'; }).join('') + '</div>'
};
ACT.who = () => openOv({ type: 'who' });
ACT['who-pick'] = el => { switchProfile(el.dataset.pid); closeOv(); };
function switchProfile(pid) {
  if (!PIDS.includes(pid)) return;
  state.pid = pid; lsSet('ml.me', pid);
  state.status = {}; state.formError = {}; state.menu = null; state.forms = {}; state.details = {}; state.confirmRemove = null;
  applySkin(); render();
  if (state.ready) announce();
}
