/* ---------- Nutrition: daily targets, food log, food database ---------- */
const NKEYS = ['kcal', 'protein', 'fat', 'carbs', 'fiber', 'sugar', 'satfat', 'transfat', 'chol', 'sodium', 'potassium', 'calcium', 'iron', 'vitd'];
const NI = {}; NKEYS.forEach((k, i) => { NI[k] = i; });
// FDA Daily Values for adults (2,000 calorie reference diet)
const DV = { fat: 78, satfat: 20, chol: 300, sodium: 2300, carbs: 275, fiber: 28, protein: 50, vitd: 20, calcium: 1300, iron: 18, potassium: 4700 };
const MEALS = [['b', 'Breakfast'], ['l', 'Lunch'], ['d', 'Dinner'], ['s', 'Snacks']];
const MEAL_NAME = { b: 'Breakfast', l: 'Lunch', d: 'Dinner', s: 'Snacks' };
const ACTIVITY = { sed: [1.2, 'Mostly sitting'], light: [1.375, 'Lightly active, 1 to 3 days a week'], mod: [1.55, 'Active, 3 to 5 days a week'], very: [1.725, 'Very active, 6 to 7 days a week'] };
const PACE = { lose1: [-500, 'Lose about 1 lb a week'], lose05: [-250, 'Lose about ½ lb a week'], maintain: [0, 'Hold steady'], gain05: [250, 'Gain about ½ lb a week'] };

function latestWeight(pid) {
  const p = P(pid), ds = Object.keys(p.weighIns).filter(validIso).sort();
  return ds.length ? p.weighIns[ds[ds.length - 1]] : (p.body.weightLb || null);
}
// Calories: the Mifflin-St Jeor equation for resting energy, times an activity factor, adjusted for the chosen pace,
// never below 1,200 (women) / 1,500 (men). Water: the National Academies beverage guideline by sex (about 9 cups for
// women, 13 for men), raised to half of body weight in ounces when that is more, capped at a gallon.
// A number entered from a doctor always replaces the estimate.
function goalsFor(pid) {
  return cached('goals:' + pid, () => {
    const p = P(pid), b = p.body, doc = p.doctor, lb = latestWeight(pid);
    const g = { ready: false, kcalSrc: 'default', waterSrc: 'default', kcal: 2000, waterOz: 80, bmr: null, tdee: null, floor: false, lb, waterBase: null };
    const sexed = b.sex === 'm' || b.sex === 'f';
    if (sexed && b.age > 0 && b.heightIn > 0 && lb > 0) {
      const kg = lb * 0.45359237, cm = b.heightIn * 2.54;
      g.bmr = Math.round(10 * kg + 6.25 * cm - 5 * b.age + (b.sex === 'm' ? 5 : -161));
      g.tdee = Math.round(g.bmr * (ACTIVITY[b.activity] || ACTIVITY.light)[0]);
      const floor = b.sex === 'm' ? 1500 : 1200;
      let k = g.tdee + (PACE[b.pace] || PACE.maintain)[0];
      if (k < floor) { k = floor; g.floor = true; }
      g.kcal = Math.round(k / 10) * 10; g.kcalSrc = 'estimate'; g.ready = true;
    }
    if (doc.kcal > 0) { g.kcal = Math.round(doc.kcal); g.kcalSrc = 'doctor'; g.ready = true; g.floor = false; }
    if (sexed) {
      g.waterBase = b.sex === 'm' ? 104 : 72;
      const byWeight = lb > 0 ? lb * 0.5 : 0;
      g.waterOz = Math.min(128, Math.round(Math.max(g.waterBase, byWeight) / 4) * 4);
      g.waterSrc = byWeight > g.waterBase ? 'weight' : 'sex';
    }
    if (doc.waterOz > 0) { g.waterOz = Math.round(doc.waterOz); g.waterSrc = 'doctor'; }
    g.lo = Math.round(g.kcal * 0.8 / 10) * 10; g.hi = Math.round(g.kcal * 1.1 / 10) * 10;
    g.protein = lb > 0 ? Math.min(Math.round(lb * 0.7), Math.round(g.kcal * 0.35 / 4)) : Math.round(g.kcal * 0.2 / 4);
    g.fat = Math.round(g.kcal * 0.3 / 9);
    g.carbs = Math.max(0, Math.round((g.kcal - g.protein * 4 - g.fat * 9) / 4));
    return g;
  });
}

/* ---------- Day log ---------- */
const foodDay = (pid, date) => state.data[pid].food[date] || { v: 1, date, items: [], water: 0 };
function dayTotals(pid, date) {
  return cached('ft:' + pid + ':' + date, () => {
    const d = foodDay(pid, date), n = NKEYS.map(() => 0);
    (d.items || []).forEach(it => (it.n || []).forEach((v, i) => { if (isNum(v)) n[i] += v; }));
    return { n, kcal: n[0], count: (d.items || []).length, water: d.water || 0 };
  });
}
// 1 = logged and inside the calorie range, 0.5 = a real day of logging that missed the range, 0 = little or nothing logged
function fuelUnit(pid, date) {
  const t = dayTotals(pid, date); if (!t.count) return 0;
  const g = goalsFor(pid);
  if (t.kcal >= g.lo && t.kcal <= g.hi) return 1;
  return t.kcal >= g.kcal * 0.5 ? 0.5 : 0;
}
const waterFrac = (pid, date) => Math.min(1, (dayTotals(pid, date).water || 0) / goalsFor(pid).waterOz);
function mealByClock() { const h = Number(tzHour.format(new Date())) % 24; return h < 11 ? 'b' : h < 15 ? 'l' : h < 21 ? 'd' : 's'; }
async function addFoodItem(date, item) {
  const path = PATH.food(me(), date), cur = getDoc(path) || { v: 1, date, items: [], water: 0 };
  return write(path, Object.assign({}, cur, { items: (cur.items || []).concat([item]), updatedAt: new Date().toISOString() }));
}
async function changeFoodItem(date, id, next) { // next = replacement item, or null to remove
  const path = PATH.food(me(), date), cur = getDoc(path); if (!cur) return false;
  const items = (cur.items || []).map(it => it.id === id ? next : it).filter(Boolean);
  return write(path, Object.assign({}, cur, { items, updatedAt: new Date().toISOString() }));
}
async function addWater(date, oz) {
  const path = PATH.food(me(), date), cur = getDoc(path) || { v: 1, date, items: [], water: 0 };
  return write(path, Object.assign({}, cur, { water: Math.max(0, Math.round(((cur.water || 0) + oz) * 10) / 10), updatedAt: new Date().toISOString() }));
}
function recentFoods(pid) {
  const food = state.data[pid].food, seen = new Set(), out = [];
  Object.keys(food).filter(validIso).sort().reverse().slice(0, 30).forEach(d => {
    (food[d].items || []).slice().reverse().forEach(it => { const k = it.name + '|' + it.unit + '|' + it.qty; if (!seen.has(k) && it.n) { seen.add(k); out.push(it); } });
  });
  return out.slice(0, 12);
}

/* ---------- Food database (USDA FoodData Central, shipped with the page) ---------- */
const foodDb = { state: 'idle', list: null, lc: null, src: '', promise: null };
function loadFoods() {
  if (foodDb.state === 'ready' || foodDb.state === 'loading') return foodDb.promise;
  foodDb.state = 'loading';
  foodDb.promise = fetch('foods.json').then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(j => { foodDb.list = j.f; foodDb.lc = j.f.map(f => f[0].toLowerCase()); foodDb.src = j.src || ''; foodDb.state = 'ready'; })
    .catch(() => { foodDb.state = 'error'; });
  return foodDb.promise;
}
function queryTokens(q) {
  return q.toLowerCase().replace(/[^a-z0-9%' ]+/g, ' ').split(/\s+/).filter(Boolean).map(t => {
    if (t.length > 4 && /ies$/.test(t)) return t.slice(0, -3);
    if (t.length > 4 && /oes$/.test(t)) return t.slice(0, -2);
    if (t.length > 3 && /s$/.test(t) && !/ss$/.test(t)) return t.slice(0, -1);
    return t;
  });
}
function scoreName(lc, toks) { // null when a word is missing; otherwise higher is a better match (may be negative for long names)
  let score = 0;
  for (let j = 0; j < toks.length; j++) {
    const idx = lc.indexOf(toks[j]); if (idx < 0) return null;
    const startOfWord = idx === 0 || ' ,(-/'.indexOf(lc[idx - 1]) >= 0;
    score += startOfWord ? 10 : 2;
    if (idx === 0 && j === 0) score += 15;
  }
  return score - lc.length * 0.12;
}
function searchFoods(q, limit) {
  const toks = queryTokens(q); if (!toks.length) return [];
  const hits = [];
  Object.keys(state.customFoods).forEach(id => { const c = state.customFoods[id]; const s = scoreName(String(c.name || '').toLowerCase(), toks); if (s != null) hits.push({ s: s + 30, custom: id }); });
  if (foodDb.state === 'ready') {
    const lc = foodDb.lc, list = foodDb.list, plain = toks.join(' ');
    for (let i = 0; i < lc.length; i++) {
      let s = scoreName(lc[i], toks); if (s == null) continue;
      if (list[i][1] === 1) s += 3;            // foods as eaten rank a little above raw ingredients
      if (lc[i] === plain) s += 50;
      hits.push({ s, i });
    }
  }
  hits.sort((a, b) => b.s - a.s);
  return hits.slice(0, limit || 40).map(h => h.custom ? customFood(h.custom) : dbFood(h.i));
}
function dbFood(i) {
  const f = foodDb.list[i];
  const portions = (f[3] || []).map(p => ({ label: p[0], grams: p[1] })).concat([{ label: '100 g', grams: 100 }, { label: '1 oz', grams: 28.35 }, { label: '1 g', grams: 1 }]);
  return { name: f[0], src: f[1] === 1 ? 'FNDDS' : 'SR Legacy', per100: f[2], portions };
}
function customFood(id) {
  const c = state.customFoods[id];
  return { name: c.name, src: 'Yours', customId: id, perServing: c.n, portions: [{ label: c.serving || '1 serving', grams: null }] };
}
// nutrients for qty × the chosen portion
function amountNutrients(food, portion, qty) {
  const q = qty > 0 ? qty : 0;
  if (food.perServing) return food.perServing.map((v, i) => v == null ? null : roundN(v * q, i));
  const f = (portion.grams || 0) * q / 100;
  return food.per100.map((v, i) => v == null ? null : roundN(v * f, i));
}
const roundN = (v, i) => i === 0 || (i >= 8 && i <= 11) ? Math.round(v) : Math.round(v * 10) / 10;
const fmtN = v => v == null ? '–' : (Math.round(v * 10) / 10).toString();

function factsHTML(n, serving) {
  const amt = (i, unit) => n[i] == null ? '–' : fmtN(n[i]) + unit;
  const dv = (i, key) => n[i] == null ? '' : Math.round(n[i] / DV[key] * 100) + '%';
  const row = (cls, label, a, d) => '<div class="fr ' + cls + '"><span>' + label + ' ' + a + '</span><b>' + d + '</b></div>';
  return '<div class="facts"><div class="ft">Nutrition Facts</div><div class="srv">' + esc(serving) + '</div>' +
    '<div class="cal"><span>Calories</span><b class="num">' + commas(n[0] || 0) + '</b></div><div class="dvh">% Daily Value*</div>' +
    row('', '<b>Total Fat</b>', amt(2, 'g'), dv(2, 'fat')) + row('sub', 'Saturated Fat', amt(6, 'g'), dv(6, 'satfat')) + row('sub', 'Trans Fat', amt(7, 'g'), '') +
    row('', '<b>Cholesterol</b>', amt(8, 'mg'), dv(8, 'chol')) + row('', '<b>Sodium</b>', amt(9, 'mg'), dv(9, 'sodium')) +
    row('', '<b>Total Carbohydrate</b>', amt(3, 'g'), dv(3, 'carbs')) + row('sub', 'Dietary Fiber', amt(4, 'g'), dv(4, 'fiber')) + row('sub', 'Total Sugars', amt(5, 'g'), '') +
    row('', '<b>Protein</b>', amt(1, 'g'), '') +
    row('thick', 'Vitamin D', amt(13, 'mcg'), dv(13, 'vitd')) + row('', 'Calcium', amt(11, 'mg'), dv(11, 'calcium')) + row('', 'Iron', amt(12, 'mg'), dv(12, 'iron')) + row('', 'Potassium', amt(10, 'mg'), dv(10, 'potassium')) +
    '<div class="fnote">* Percent Daily Values are based on a 2,000 calorie diet. A dash means the source lists no value.</div></div>';
}
