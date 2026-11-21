/* ---------- Fuel: calories, water, food log ---------- */
const RING_C = 326.7; // circumference of the r=52 ring
function ringSVG(frac, cls) {
  const f = clamp(frac || 0, 0, 1);
  return '<svg class="ring ' + cls + '" viewBox="0 0 120 120" aria-hidden="true"><circle class="rbg" cx="60" cy="60" r="52"/><circle class="rfg" cx="60" cy="60" r="52" stroke-dasharray="' + RING_C + '" stroke-dashoffset="' + (RING_C * (1 - f)).toFixed(1) + '"/></svg>';
}
const fmtQty = q => (Math.round(q * 100) / 100).toString();
const portionText = p => p.label + (p.grams && !/\d\s?g$/.test(p.label) ? ' (' + Math.round(p.grams) + ' g)' : '');
function renderFuel() {
  // the targets locked for the week this day belongs to; `live` is what the settings say now (next week's numbers)
  const pid = me(), date = state.selDate, live = goalsFor(pid), g = weekGoals(pid, weekStart(date)), mg = macroGuide(g.kcal, g.protein), t = dayTotals(pid, date), day = foodDay(pid, date);
  const prot = Math.round(t.n[1]), protAt = Math.ceil(g.protein * 0.9), changed = live.kcal !== g.kcal || live.waterOz !== g.waterOz || live.protein !== g.protein;
  const left = g.kcal - t.kcal, over = t.kcal > g.hi, inRange = t.count > 0 && t.kcal >= g.lo && t.kcal <= g.hi, water = Math.round(t.water);
  let h = '<section class="card sess">' + dateHead('Food and water for', 'fuel') + '<div class="status"><span>' + (t.count ? t.count + ' item' + (t.count === 1 ? '' : 's') + ' logged' : 'Nothing logged yet') + '</span>' + healthButton() + '</div></section>';
  if (!live.ready) h += '<div class="banner accent"><span>These targets are placeholders: 2,000 calories and ' + g.waterOz + ' oz of water. Add your numbers, or your doctor\'s, to get your own.</span><div class="row"><button type="button" class="small" data-a="go-body">Set my targets</button></div></div>';
  h += '<section class="card stack"><div class="rings">' +
    '<div class="ringbox">' + ringSVG(t.kcal / g.kcal, over ? 'over' : '') + '<div class="ringtxt"><b id="kcalLeft">' + commas(Math.abs(left)) + '</b><span>' + (left >= 0 ? 'calories left' : 'over target') + '</span></div><div class="tiny muted num">' + commas(t.kcal) + ' of ' + commas(g.kcal) + '</div></div>' +
    '<div class="ringbox">' + ringSVG(t.water / g.waterOz, 'water') + '<div class="ringtxt"><b id="waterNow">' + water + '</b><span>of ' + g.waterOz + ' oz</span></div><div class="tiny muted">' + (t.water >= g.waterOz ? 'Water goal met' : Math.ceil(g.waterOz - t.water) + ' oz to go') + '</div></div></div>' +
    '<div class="waterbtns" aria-label="Add water">' + [[8, '+8 oz'], [12, '+12'], [16.9, '+Bottle 16.9'], [24, '+24'], [32, '+32']].map(w => '<button type="button" data-a="water" data-oz="' + w[0] + '">' + w[1] + '</button>').join('') + (t.water > 0 ? '<button type="button" data-a="water" data-oz="-8" aria-label="Remove 8 ounces">−8</button>' : '') + '</div>' +
    '<div class="protline" id="protLine"><div class="row between"><span><b>' + prot + '</b> of <b>' + g.protein + '</b> g protein</span><span class="chip' + (prot >= protAt ? ' good' : '') + '">' + (prot >= protAt ? (prot >= g.protein ? 'target met' : 'counts today') : (g.protein - prot) + ' g to go') + '</span></div><div class="bar" role="img" aria-label="Protein: ' + prot + ' of ' + g.protein + ' grams"><i style="width:' + Math.round(clamp(prot / (g.protein || 1), 0, 1) * 100) + '%"></i><em style="left:90%"></em></div>' +
    '<span class="tiny muted">' + (g.scoring >= 2 ? 'Reaching ' + protAt + ' g (90% of your target) earns the protein share of today\'s Fuel points.' : 'Protein joins the Fuel score from the week of ' + nice(RULES_V2_FROM) + ': 90% of your target, ' + Math.ceil(liveGoals(pid).protein * 0.9) + ' g, will count.') + '</span></div>' +
    '<div class="macros two">' + [['Carbs', 3, mg.carbs], ['Fat', 2, mg.fat]].map(m => '<div class="macro"><span class="muted">' + m[0] + '</span><div class="bar"><i style="width:' + Math.round(clamp(t.n[m[1]] / (m[2] || 1), 0, 1) * 100) + '%"></i></div><span><b>' + Math.round(t.n[m[1]]) + '</b> / ' + m[2] + ' g</span></div>').join('') + '</div>' +
    '<p class="tiny muted">' + (inRange ? '<span class="chip good">in range</span> ' : '') + 'A day counts for the competition between ' + commas(g.lo) + ' and ' + commas(g.hi) + ' calories. ' + (changed ? 'These are the targets locked for that week. Your new ones start ' + nice(nextMonday()).replace(/^\w+ /, 'Mon ') + '.' : live.kcalSrc === 'doctor' ? 'Target from your doctor.' : live.kcalSrc === 'estimate' ? 'Target estimated from your numbers.' : '') + '</p></section>';
  h += '<section class="card">';
  MEALS.forEach(m => {
    const items = (day.items || []).filter(it => it.meal === m[0]), kc = sum(items, it => (it.n && it.n[0]) || 0);
    h += '<div class="meal"><div class="mh"><h3>' + m[1] + (items.length ? ' <span class="muted num" style="font-weight:400;font-size:.875rem">' + commas(kc) + ' cal</span>' : '') + '</h3><button type="button" class="small" data-a="food-add" data-meal="' + m[0] + '" aria-label="Add food to ' + m[1] + '">+ Add</button></div>' +
      items.map(it => '<button type="button" class="fooditem" data-a="food-item" data-id="' + esc(it.id) + '"><span class="fn">' + esc(it.name) + '</span><span class="fk">' + commas((it.n && it.n[0]) || 0) + '</span><span class="fq">' + esc(fmtQty(it.qty) + ' × ' + it.unit) + '</span></button>').join('') + '</div>';
  });
  h += '</section>';
  if (t.count) h += '<details class="card plain" data-dk="dayfacts"><summary>Nutrition facts for the whole day</summary><div style="margin-top:10px">' + factsHTML(t.n, 'Everything logged ' + (rel(date) === nice(date) ? nice(date) : rel(date).toLowerCase()) + ' · ' + t.count + ' item' + (t.count === 1 ? '' : 's')) + '</div></details>';
  h += '<p class="tiny muted">Food data: U.S. Department of Agriculture, FoodData Central' + (foodDb.list ? ' · ' + commas(foodDb.list.length) + ' foods' : '') + '. Brand recipes change, so check the package when it matters.</p>';
  return h;
}
ACT['go-body'] = () => { state.scrollTo = 'bodyCard'; if (state.tab === 'me') render(); else location.hash = 'me'; };
ACT.water = async el => {
  const pid = me(), date = state.selDate, oz = Number(el.dataset.oz), g = weekGoals(pid, weekStart(date)), had = dayTotals(pid, date).water, before = scoreSnapshot();
  const ok = await addWater(date, oz); if (!ok) return;
  render();
  const now = dayTotals(pid, date).water, hit = had < g.waterOz && now >= g.waterOz;
  celebrate(hit ? 'Water goal reached: ' + Math.round(now) + ' oz.' : (oz > 0 ? '+' : '−') + Math.abs(oz) + ' oz · ' + Math.round(now) + ' of ' + g.waterOz, { force: hit, ms: 1800, before });
};
ACT['food-add'] = el => openOv({ type: 'food', meal: el.dataset.meal || mealByClock(), date: state.selDate, q: '' });
ACT['food-item'] = el => {
  const it = (foodDay(me(), state.selDate).items || []).find(x => x.id === el.dataset.id); if (!it) return;
  openOv({ type: 'fooditem', item: it, meal: it.meal, date: state.selDate, qty: fmtQty(it.qty) });
};

let foodT;
function fillFoodResults() {
  const o = state.ov, box = $('#foodRes'); if (!o || o.type !== 'food' || !box) return;
  const q = String(o.q || '').trim();
  const row = (a, i, name, kcal, sub) => '<button type="button" class="fooditem" data-a="' + a + '" data-i="' + i + '"><span class="fn">' + esc(name) + '</span><span class="fk num">' + commas(kcal || 0) + '</span><span class="fq">' + esc(sub) + '</span></button>';
  if (!q) {
    const rec = recentFoods(me()); o.results = rec;
    const hint = foodDb.state === 'loading' ? 'Loading the food list…' : foodDb.state === 'error' ? 'The food list could not load. Quick add and your own foods still work.' : 'Type to search ' + (foodDb.list ? commas(foodDb.list.length) : 'thousands of') + ' foods.';
    box.innerHTML = '<p class="muted tiny" style="padding:6px 0">' + hint + '</p>' + (rec.length ? '<div class="eyebrow" style="padding:4px 0">Recent · tap to add again</div>' + rec.map((it, i) => row('food-again', i, it.name, it.n[0], fmtQty(it.qty) + ' × ' + it.unit)).join('') : '');
    return;
  }
  const res = searchFoods(q, 40); o.results = res;
  const head = foodDb.state === 'loading' ? '<p class="muted tiny" style="padding:6px 0">Loading the food list…</p>' : foodDb.state === 'error' ? '<p class="muted tiny" style="padding:6px 0">The food list could not load. Showing your own foods only.</p>' : '';
  box.innerHTML = head + (res.length ? res.map((f, i) => { const p = f.portions[0]; return row('food-pick', i, f.name, amountNutrients(f, p, 1)[0], portionText(p) + ' · ' + f.src); }).join('')
    : (foodDb.state === 'ready' ? '<p class="muted" style="padding:8px 0">No match for “' + esc(q) + '”. Try fewer words, or use Quick add.</p>' : ''));
}
const mealSeg = o => '<div class="seg" aria-label="Meal">' + MEALS.map(m => '<button type="button" data-a="ov-meal" data-v="' + m[0] + '" class="' + (o.meal === m[0] ? 'on' : '') + '" aria-pressed="' + (o.meal === m[0]) + '">' + m[1] + '</button>').join('') + '</div>';
ACT['ov-meal'] = el => { state.ov.meal = el.dataset.v; renderOv(); };
OV.food = {
  html: o => '<div class="ov tall" role="dialog" aria-modal="true" aria-label="Add food">' + ovHead('Add food', rel(o.date)) + mealSeg(o) +
    '<input type="search" id="foodQ" data-ovf="q" value="' + esc(o.q || '') + '" placeholder="Search: banana, chicken breast, pizza" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Search foods">' +
    '<div class="row"><button type="button" class="small" data-a="food-quick">Quick add calories</button><button type="button" class="small" data-a="food-custom">Create a food</button></div>' +
    '<div id="foodRes" class="results" aria-live="polite"></div></div>',
  after: o => { const loaded = loadFoods(); fillFoodResults(); const q = $('#foodQ'); if (q && !o.keepBlur) q.focus({ preventScroll: true }); loaded.then(() => { if (state.ov && state.ov.type === 'food') fillFoodResults(); }); } // start the load first, so the hint says it is loading
};
ACT['food-pick'] = el => {
  const o = state.ov, f = o.results && o.results[Number(el.dataset.i)]; if (!f) return;
  openOv({ type: 'fooditem', food: f, meal: o.meal, date: o.date, qty: '1', pi: 0, back: { type: 'food', meal: o.meal, date: o.date, q: o.q, keepBlur: true } });
};
ACT['food-again'] = async el => {
  const o = state.ov, it = o.results && o.results[Number(el.dataset.i)]; if (!it) return;
  const before = scoreSnapshot();
  const ok = await addFoodItem(o.date, Object.assign({}, it, { id: uid(), meal: o.meal })); if (!ok) return;
  closeOv(); render(); celebrate('Added to ' + MEAL_NAME[o.meal] + ': ' + it.name + '.', { before });
};
function ovNutrients(o) {
  const q = Number(o.qty) > 0 ? Number(o.qty) : 0;
  if (o.item) { const base = o.item.qty > 0 ? o.item.qty : 1; return o.item.n.map((v, i) => v == null ? null : roundN(v * q / base, i)); }
  return amountNutrients(o.food, o.food.portions[Number(o.pi) || 0], q);
}
const ovServing = o => fmtQty(Number(o.qty) > 0 ? Number(o.qty) : 0) + ' × ' + (o.item ? o.item.unit : portionText(o.food.portions[Number(o.pi) || 0]));
const ovAddLabel = o => (o.item ? 'Update' : 'Add to ' + MEAL_NAME[o.meal]) + ' · ' + commas(ovNutrients(o)[0] || 0) + ' cal';
function refreshFoodItem() {
  const o = state.ov; if (!o || o.type !== 'fooditem') return;
  const box = $('#factsBox'), btn = $('#foodAdd');
  if (box) box.innerHTML = factsHTML(ovNutrients(o), ovServing(o));
  if (btn) { btn.textContent = ovAddLabel(o); btn.disabled = !(Number(o.qty) > 0); }
}
OV.fooditem = {
  html: o => {
    const editing = !!o.item, name = editing ? o.item.name : o.food.name;
    let h = '<div class="ov" role="dialog" aria-modal="true" aria-label="' + esc(name) + '">' + ovHead(esc(name), editing ? 'Logged ' + rel(o.date).toLowerCase() : o.food.src === 'Yours' ? 'Your food' : 'USDA ' + o.food.src) +
      '<div class="formgrid"><label class="f">How many<input type="number" id="fQty" data-ovf="qty" inputmode="decimal" min="0" step="0.25" value="' + esc(o.qty) + '"></label>';
    h += editing ? '<label class="f">Portion<input type="text" value="' + esc(o.item.unit) + '" disabled></label>'
      : '<label class="f">Portion<select id="fPortion" data-ovf="pi">' + o.food.portions.map((p, i) => '<option value="' + i + '"' + (Number(o.pi) === i ? ' selected' : '') + '>' + esc(portionText(p)) + '</option>').join('') + '</select></label>';
    h += '</div>' + mealSeg(o) + '<div id="factsBox">' + factsHTML(ovNutrients(o), ovServing(o)) + '</div>' +
      '<div class="row"><button type="button" class="primary" id="foodAdd" data-a="food-save"' + (Number(o.qty) > 0 ? '' : ' disabled') + '>' + ovAddLabel(o) + '</button>' + (editing ? '<button type="button" class="small danger" data-a="food-del">Remove</button>' : '<button type="button" class="small" data-a="food-back">Back</button>') + '</div>';
    // a food one of you created can be fixed or removed by either of you; what is already logged keeps its own numbers
    if (!editing && o.food.customId) h += '<div class="row" id="customTools"><button type="button" class="small" data-a="custom-edit">Edit this food</button><button type="button" class="small danger" data-a="custom-del">' + (o.confirmDel ? 'Tap again to delete it' : 'Delete this food') + '</button></div>' +
      '<p class="tiny muted">Editing or deleting changes the saved food for both of you. Anything already logged keeps the nutrition it was logged with.</p>';
    return h + '</div>';
  }
};
ACT['food-back'] = () => { const b = state.ov.back; if (b) openOv(b); else closeOv(); };
ACT['food-save'] = async () => {
  const o = state.ov, q = Number(o.qty); if (!(q > 0)) { toast('Enter how many.'); return; }
  const before = scoreSnapshot(); let ok, name;
  if (o.item) { name = o.item.name; ok = await changeFoodItem(o.date, o.item.id, Object.assign({}, o.item, { qty: q, meal: o.meal, n: ovNutrients(o) })); }
  else {
    const p = o.food.portions[Number(o.pi) || 0]; name = o.food.name;
    ok = await addFoodItem(o.date, { id: uid(), name, meal: o.meal, qty: q, unit: p.label, grams: p.grams ? Math.round(p.grams * q * 10) / 10 : null, src: o.food.src, n: ovNutrients(o) });
  }
  if (!ok) return;
  const was = o.item; closeOv(); render();
  celebrate((was ? 'Updated: ' : 'Added to ' + MEAL_NAME[o.meal] + ': ') + name + '.', { before });
};
ACT['food-del'] = async () => { const o = state.ov; const ok = await changeFoodItem(o.date, o.item.id, null); if (!ok) return; closeOv(); settle(); render(); toast('Removed'); };

const numOrNull = v => { const s = String(v == null ? '' : v).trim(); if (!s) return null; const n = Number(s); return isFinite(n) && n >= 0 ? n : NaN; };
const ovField = (o, k, label, extra) => '<label class="f">' + label + '<input type="' + (extra && extra.text ? 'text' : 'number') + '" data-ovf="' + k + '" ' + (extra && extra.text ? 'maxlength="60"' : 'inputmode="decimal" min="0"') + ' value="' + esc(o[k] == null ? '' : o[k]) + '"' + (extra && extra.ph ? ' placeholder="' + extra.ph + '"' : '') + '></label>';
OV.quick = {
  html: o => '<div class="ov" role="dialog" aria-modal="true" aria-label="Quick add">' + ovHead('Quick add', 'For a label you can read or a restaurant menu') + mealSeg(o) +
    '<div class="formgrid"><div class="wide">' + ovField(o, 'name', 'What was it? (optional)', { text: true, ph: 'Turkey sandwich' }) + '</div><div class="wide">' + ovField(o, 'kcal', 'Calories') + '</div>' + ovField(o, 'p', 'Protein g') + ovField(o, 'c', 'Carbs g') + ovField(o, 'f', 'Fat g') + '</div>' +
    '<div class="row"><button type="button" class="primary" data-a="quick-save">Add to ' + MEAL_NAME[o.meal] + '</button><button type="button" class="small" data-a="food-back">Back</button></div></div>'
};
ACT['food-quick'] = () => { const o = state.ov; openOv({ type: 'quick', meal: o.meal, date: o.date, name: '', kcal: '', p: '', c: '', f: '', back: { type: 'food', meal: o.meal, date: o.date, q: o.q } }); };
ACT['quick-save'] = async () => {
  const o = state.ov, kcal = numOrNull(o.kcal), p = numOrNull(o.p), c = numOrNull(o.c), f = numOrNull(o.f);
  if (kcal == null || Number.isNaN(kcal) || kcal > 10000) { toast('Enter the calories, 0 to 10,000.'); return; }
  if ([p, c, f].some(v => Number.isNaN(v))) { toast('Protein, carbs and fat must be numbers, or blank.'); return; }
  const n = NKEYS.map(() => null); n[0] = Math.round(kcal); n[1] = p; n[2] = f; n[3] = c;
  const name = String(o.name || '').trim() || 'Quick add', before = scoreSnapshot();
  const ok = await addFoodItem(o.date, { id: uid(), name, meal: o.meal, qty: 1, unit: 'quick add', grams: null, src: 'Quick add', n }); if (!ok) return;
  closeOv(); render(); celebrate('Added to ' + MEAL_NAME[o.meal] + ': ' + name + '.', { before });
};
OV.custom = {
  html: o => '<div class="ov" role="dialog" aria-modal="true" aria-label="' + (o.id ? 'Edit food' : 'Create a food') + '">' + ovHead(o.id ? 'Edit food' : 'Create a food', o.id ? 'Changes the saved food for both of you' : 'Saved for both of you, searchable by name') +
    '<div class="formgrid"><div class="wide">' + ovField(o, 'name', 'Name', { text: true, ph: 'Mom\'s chili' }) + '</div><div class="wide">' + ovField(o, 'serving', 'One serving is', { text: true, ph: '1 bowl' }) + '</div>' +
    ovField(o, 'kcal', 'Calories') + ovField(o, 'p', 'Protein g') + ovField(o, 'c', 'Carbs g') + ovField(o, 'f', 'Fat g') + ovField(o, 'fiber', 'Fiber g') + ovField(o, 'sugar', 'Sugars g') + ovField(o, 'sat', 'Sat fat g') + ovField(o, 'na', 'Sodium mg') + '</div>' +
    '<p class="tiny muted">Per serving. Calories are required; leave anything else blank if you do not know it.</p>' +
    '<div class="row"><button type="button" class="primary" data-a="custom-save">' + (o.id ? 'Save changes' : 'Save food') + '</button><button type="button" class="small" data-a="food-back">Back</button></div></div>'
};
ACT['custom-edit'] = () => {
  const o = state.ov, id = o.food && o.food.customId, c = id && state.customFoods[id]; if (!c) { toast('That food is no longer saved.'); return; }
  const n = c.n || [], s = i => n[i] == null ? '' : String(n[i]);
  openOv({ type: 'custom', id, meal: o.meal, date: o.date, name: c.name || '', serving: c.serving || '1 serving', kcal: s(NI.kcal), p: s(NI.protein), c: s(NI.carbs), f: s(NI.fat), fiber: s(NI.fiber), sugar: s(NI.sugar), sat: s(NI.satfat), na: s(NI.sodium), back: Object.assign({}, o, { confirmDel: false }), list: o.back });
};
ACT['custom-del'] = async () => {
  const o = state.ov, id = o.food && o.food.customId; if (!id) return;
  if (!o.confirmDel) { o.confirmDel = true; renderOv(); return; }
  const ok = await write('foods/' + id, null); if (!ok) return;
  if (o.back) openOv(o.back); else closeOv();
  toast('Food deleted. Anything already logged keeps its numbers.', 3200);
};
ACT['food-custom'] = () => { const o = state.ov; openOv({ type: 'custom', meal: o.meal, date: o.date, name: String(o.q || '').trim(), serving: '1 serving', kcal: '', p: '', c: '', f: '', fiber: '', sugar: '', sat: '', na: '', back: { type: 'food', meal: o.meal, date: o.date, q: o.q } }); };
ACT['custom-save'] = async () => {
  const o = state.ov, name = String(o.name || '').trim(), v = {};
  ['kcal', 'p', 'c', 'f', 'fiber', 'sugar', 'sat', 'na'].forEach(k => { v[k] = numOrNull(o[k]); });
  if (!name) { toast('Give the food a name.'); return; }
  if (v.kcal == null || Number.isNaN(v.kcal) || v.kcal > 10000) { toast('Enter calories per serving, 0 to 10,000.'); return; }
  if (Object.keys(v).some(k => Number.isNaN(v[k]))) { toast('Nutrition values must be numbers, or blank.'); return; }
  const n = NKEYS.map(() => null); n[NI.kcal] = Math.round(v.kcal); n[NI.protein] = v.p; n[NI.carbs] = v.c; n[NI.fat] = v.f; n[NI.fiber] = v.fiber; n[NI.sugar] = v.sugar; n[NI.satfat] = v.sat; n[NI.sodium] = v.na;
  const id = o.id || uid(), prev = o.id ? state.customFoods[o.id] : null, now = new Date().toISOString();
  const doc = Object.assign({}, prev, { name, serving: String(o.serving || '').trim() || '1 serving', n, by: prev && prev.by || me(), createdAt: prev && prev.createdAt || now }, prev ? { updatedAt: now, updatedBy: me() } : {});
  const ok = await write('foods/' + id, doc); if (!ok) return;
  openOv({ type: 'fooditem', food: customFood(id), meal: o.meal, date: o.date, qty: '1', pi: 0, back: o.id ? o.list : o.back });
  toast(o.id ? 'Food updated. Past logs keep their numbers.' : 'Saved. It now shows up in search.', 3000);
};
