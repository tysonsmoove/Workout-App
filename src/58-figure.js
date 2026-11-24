/* ---------- 58-figure.js: an articulated figure, drawn from joint angles, with the equipment to scale ---------- */
// One animation per exercise (FIG, in 59-figures.js). A pose is a handful of numbers: where the body is anchored,
// the lean of the torso, and for each limb either its two joint directions or the point its hand or foot must reach
// (the elbow or knee is then solved). The rep is played by blending between two or three poses on a real tempo:
// about 2 s lowering, a short pause, about 1 s lifting. Everything is drawn in a 200 x 150 box where 1 unit is about
// 1.77 cm, so a 175 cm person stands 99 units tall, a bench is 24 high and a 45 lb plate is 25 across.
// Directions are in degrees: 0 points straight down, 90 forward (the figure faces right), 180 up, negative backward.
const FG = { W: 200, H: 150, FLOOR: 136, shin: 24, thigh: 25, torso: 28, neck: 5, head: 6.5, ua: 17, fa: 15, ankle: 4, heel: 4, toe: 11, sh: 9.5, hw: 6 };
const fgU = a => { const r = a * Math.PI / 180; return [Math.sin(r), Math.cos(r)]; };
const fgAdd = (p, len, a) => { const u = fgU(a); return [p[0] + len * u[0], p[1] + len * u[1]]; };
const fgN = v => Math.round(v * 10) / 10;
const fgP = p => fgN(p[0]) + ' ' + fgN(p[1]);
// Two-bone reach: from root A to target T with bone lengths l1 and l2. `bend` picks the side the joint folds to.
function fgIK(A, T, l1, l2, bend) {
  let dx = T[0] - A[0], dy = T[1] - A[1], d = Math.hypot(dx, dy) || 0.001; const max = l1 + l2 - 0.05, min = Math.abs(l1 - l2) + 0.05;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; } else if (d < min) { dx *= min / d; dy *= min / d; d = min; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  return { J: [A[0] + dx * a / d - bend * h * dy / d, A[1] + dy * a / d + bend * h * dx / d], T: [A[0] + dx, A[1] + dy] };
}
const fgNum = (p, k, d) => p[k] == null ? d : p[k];
// Side view: every joint position for a pose.
function fgSolve(p) {
  const L = FG, tA = 180 - (p.lean || 0), nA = tA - (p.neck || 0);
  let H = [0, 0], S = fgAdd(H, L.torso, tA), N = fgAdd(S, L.neck, nA), Hd = fgAdd(N, L.head, nA);
  const leg = (th, sh) => { const K = fgAdd(H, L.thigh, th), A = fgAdd(K, L.shin, sh); return { K, A }; };
  const arm = (ua, fa, f) => { const E = fgAdd(S, L.ua * f, ua), W = fgAdd(E, L.fa, fa); return { E, W }; };
  let l1 = leg(p.thigh || 0, p.shin || 0), l2 = leg(fgNum(p, 'thigh2', p.thigh || 0), fgNum(p, 'shin2', p.shin || 0));
  let a1 = arm(p.ua || 0, fgNum(p, 'fa', p.ua || 0), fgNum(p, 'uaF', 1)), a2 = arm(fgNum(p, 'ua2', p.ua || 0), fgNum(p, 'fa2', fgNum(p, 'fa', p.ua || 0)), fgNum(p, 'uaF2', fgNum(p, 'uaF', 1)));
  const anchor = p.anchor || 'foot', at = p.at || [100, L.FLOOR - L.ankle];
  const foot = (A, ft) => { const f = fgU(ft), n = fgU(ft - 90); return { heel: [A[0] - L.heel * f[0] + L.ankle * n[0], A[1] - L.heel * f[1] + L.ankle * n[1]], toe: [A[0] + L.toe * f[0] + L.ankle * n[0], A[1] + L.toe * f[1] + L.ankle * n[1]] }; };
  const ref = anchor === 'hip' ? H : anchor === 'hand' ? a1.W : anchor === 'shoulder' ? S : anchor === 'toe' ? foot(l1.A, fgNum(p, 'ft', 90)).toe : l1.A;
  const dx = at[0] - ref[0], dy = at[1] - ref[1], mv = q => [q[0] + dx, q[1] + dy];
  H = mv(H); S = mv(S); N = mv(N); Hd = mv(Hd); l1 = { K: mv(l1.K), A: mv(l1.A) }; l2 = { K: mv(l2.K), A: mv(l2.A) }; a1 = { E: mv(a1.E), W: mv(a1.W) }; a2 = { E: mv(a2.E), W: mv(a2.W) };
  // limbs with a fixed end are solved from the point they must reach
  if (p.footAt) { const r = fgIK(H, p.footAt, L.thigh, L.shin, fgNum(p, 'kb', -1)); l1 = { K: r.J, A: r.T }; }
  if (p.foot2At) { const r = fgIK(H, p.foot2At, L.thigh, L.shin, fgNum(p, 'kb2', fgNum(p, 'kb', -1))); l2 = { K: r.J, A: r.T }; }
  else if (p.footAt && p.thigh2 == null) l2 = l1;
  const rel = (k, s2) => p[k + 'S' + s2] ? [S[0] + p[k + 'S' + s2][0], S[1] + p[k + 'S' + s2][1]] : p[k + 'H' + s2] ? [H[0] + p[k + 'H' + s2][0], H[1] + p[k + 'H' + s2][1]] : p[k + s2] || null, h1 = rel('hand', ''), h2 = rel('hand', '2');
  if (h1) { const f = fgNum(p, 'armF', 1), r = fgIK(S, h1, L.ua * fgNum(p, 'uaF', 1) * f, L.fa * fgNum(p, 'faF', 1) * f, fgNum(p, 'eb', 1)); a1 = { E: r.J, W: r.T }; }
  if (h2) { const f = fgNum(p, 'armF2', fgNum(p, 'armF', 1)), r = fgIK(S, h2, L.ua * fgNum(p, 'uaF2', 1) * f, L.fa * f, fgNum(p, 'eb2', fgNum(p, 'eb', 1))); a2 = { E: r.J, W: r.T }; }
  else if (h1 && p.ua2 == null) a2 = a1;
  const flat = A => A[1] > L.FLOOR - 9; // a foot near the floor lies flat; otherwise it follows the shin
  const dirOf = (K, A) => Math.atan2(A[0] - K[0], A[1] - K[1]) * 180 / Math.PI;
  const f1 = foot(l1.A, fgNum(p, 'ft', flat(l1.A) ? 90 : dirOf(l1.K, l1.A) + 80)), f2 = foot(l2.A, fgNum(p, 'ft2', fgNum(p, 'ft', flat(l2.A) ? 90 : dirOf(l2.K, l2.A) + 80)));
  return { H, S, N, Hd, K: l1.K, A: l1.A, K2: l2.K, A2: l2.A, E: a1.E, W: a1.W, E2: a2.E, W2: a2.W, F: f1, F2: f2, M: [(H[0] + S[0]) / 2, (H[1] + S[1]) / 2], twoLegs: l2 !== l1, twoArms: a2 !== a1 };
}
// Front view: the body faces the viewer and is the same on both sides unless a "2" field says otherwise (side 1 is
// on the right of the picture). Heights are above the floor; arm points are offsets from the shoulder, outward positive.
function fgFrontSolve(p) {
  const L = FG, cx = fgNum(p, 'cx', 100), fl = L.FLOOR, hipY = fl - fgNum(p, 'hip', 53), tl = fgNum(p, 'torso', L.torso), shY = hipY - tl, o = { front: true, cx };
  [1, -1].forEach(sd => { const s = sd === 1 ? '' : '2', g = k => fgNum(p, k + s, p[k]);
    const S = [cx + sd * L.sh, shY], H = [cx + sd * L.hw, hipY], A = [cx + sd * fgNum(p, 'stance' + s, fgNum(p, 'stance', 8)), fl - fgNum(p, 'ankleY' + s, fgNum(p, 'ankleY', L.ankle))];
    const K = [cx + sd * fgNum(p, 'kneeX' + s, fgNum(p, 'kneeX', 7)), fl - fgNum(p, 'kneeY' + s, fgNum(p, 'kneeY', 28))], e = g('e') || [2, 17], w = g('w') || [3, 32];
    o['S' + s] = S; o['H' + s] = H; o['A' + s] = A; o['K' + s] = K; o['E' + s] = [S[0] + sd * e[0], S[1] + e[1]]; o['W' + s] = [S[0] + sd * w[0], S[1] + w[1]]; });
  o.N = [cx, shY - L.neck + 1]; o.Hd = [cx, shY - L.neck - L.head + fgNum(p, 'headY', 0)]; o.M = [cx, (shY + hipY) / 2];
  return o;
}
// an arm in the front view from how far it is lifted out to the side (abd) and how much the elbow is bent inward
const fgArm = (abd, bend) => { const u = fgU(abd), v = fgU(abd + (bend || 0)); return { e: [FG.ua * u[0], FG.ua * u[1]], w: [FG.ua * u[0] + FG.fa * v[0], FG.ua * u[1] + FG.fa * v[1]] }; };
// blend two poses: numbers and points are blended, everything else is taken from the nearer pose
function fgLerp(a, b, f) {
  if (a === b || f <= 0) return a; if (f >= 1) return b;
  const o = {}, keys = Object.keys(a).concat(Object.keys(b).filter(k => !(k in a)));
  keys.forEach(k => { const x = a[k], y = b[k];
    if (typeof x === 'number' && typeof y === 'number') o[k] = x + (y - x) * f;
    else if (Array.isArray(x) && Array.isArray(y)) o[k] = x.map((v, i) => v + (y[i] - v) * f);
    else o[k] = f < 0.5 ? (x == null ? y : x) : (y == null ? x : y); });
  return o;
}

/* --- the tempo of a rep --- */
// A phase is [label, seconds, from pose, to pose]. `down` lowers first (squat, press on a bench); `up` lifts or pulls
// first and returns slowly (pulldown, curl, raise); `hold` eases into a stretch and stays there.
const FG_TEMPO = {
  down: l => [[l[0] || 'Lower', 2, 0, 1], ['Pause', 0.5, 1, 1], [l[1] || 'Drive up', 1, 1, 0], ['', 0.5, 0, 0]],
  up: l => [[l[0] || 'Lift', 1, 0, 1], [l[2] || 'Squeeze', 0.5, 1, 1], [l[1] || 'Lower slowly', 2, 1, 0], ['', 0.5, 0, 0]],
  hold: l => [[l[0] || 'Ease in', 2, 0, 1], [l[1] || 'Hold and breathe', 2.5, 1, 1], [l[2] || 'Ease out', 1.5, 1, 0], ['', 0.5, 0, 0]],
  // through a middle pose without stopping in it: the first half speeds up, the second slows down
  up3: l => [[l[0] || 'Lift', 0.5, 0, 1, 'in'], [l[0] || 'Lift', 0.5, 1, 2, 'out'], [l[2] || 'Squeeze', 0.5, 2, 2], [l[1] || 'Lower slowly', 1, 2, 1, 'in'], [l[1] || 'Lower slowly', 1, 1, 0, 'out'], ['', 0.5, 0, 0]],
  down3: l => [[l[0] || 'Lower', 1, 0, 1, 'in'], [l[0] || 'Lower', 1, 1, 2, 'out'], ['Pause', 0.5, 2, 2], [l[1] || 'Drive up', 0.5, 2, 1, 'in'], [l[1] || 'Drive up', 0.5, 1, 0, 'out'], ['', 0.5, 0, 0]]
};
const fgDef = key => FIG[FIG_ALIAS[key] || key] || null;
const fgViewOf = (def, view) => view === 'front' && def.front ? def.front : view === 'side' && def.keys ? def : def.keys ? def : def.front;
function fgPhases(v) { return v.phases || FG_TEMPO[v.tempo || 'down'](v.labels || []); }
const fgEase = (t, kind) => kind === 'in' ? t * t : kind === 'out' ? 1 - (1 - t) * (1 - t) : t * t * (3 - 2 * t);
// Where the rep is at `pos` (0 to 1 around the loop): the pose, the phase label, and the pose it is resting in, if any.
function fgAt(v, pos) {
  const ph = fgPhases(v), total = ph.reduce((t, x) => t + x[1], 0); let t = ((pos % 1) + 1) % 1 * total;
  for (let i = 0; i < ph.length; i++) { const x = ph[i]; if (t <= x[1] || i === ph.length - 1) { const f = x[2] === x[3] ? 0 : fgEase(clamp(t / x[1], 0, 1), x[4]);
    return { pose: fgLerp(v.keys[x[2]], v.keys[x[3]], f), label: x[0] || ph[0][0], rest: x[2] === x[3] ? x[2] : f > 0.97 ? x[3] : f < 0.03 ? x[2] : -1, total }; } t -= x[1]; }
}
// the loop position where the figure rests in its key pose (the bottom of a squat, the top of a curl)
function fgKeyPos(v) { const ph = fgPhases(v), total = ph.reduce((t, x) => t + x[1], 0), k = fgNum(v, 'still', 1); let t = 0;
  for (let i = 0; i < ph.length; i++) { if (ph[i][2] === k && ph[i][3] === k) return (t + ph[i][1] / 2) / total; t += ph[i][1]; } return 0; }

/* --- drawing --- */
const fgLine = (pts, w, cls) => '<path class="' + cls + '" d="M' + pts.map(fgP).join('L') + '" stroke-width="' + w + '"/>';
const fgDot = (c, r, cls) => '<circle class="' + cls + '" cx="' + fgN(c[0]) + '" cy="' + fgN(c[1]) + '" r="' + r + '"/>';
const fgBox = (x, y, w, h, r, cls, rot, o) => '<rect class="' + cls + '" x="' + fgN(x) + '" y="' + fgN(y) + '" width="' + fgN(w) + '" height="' + fgN(h) + '" rx="' + (r || 0) + '"' + (rot ? ' transform="rotate(' + fgN(rot) + ' ' + fgP(o || [x, y]) + ')"' : '') + '/>';
function fgBodySide(J) {
  const far = 'fgb fgfar', near = 'fgb', halo = 'fgh', sole = f => fgLine([f.heel, f.toe], 4.6, 'XX');
  const leg = (K, A, F, c) => fgLine([J.H, K], 8.6, c) + fgLine([K, A], 7, c) + sole(F).replace('XX', c);
  const arm = (E, W, c) => fgLine([J.S, E], 6.2, c) + fgLine([E, W], 5.2, c) + fgDot(W, 3, c + ' fgfill');
  return (J.twoLegs ? leg(J.K2, J.A2, J.F2, far) : '') + (J.twoArms ? arm(J.E2, J.W2, far) : '') +
    fgLine([J.H, J.S], 12.5, near) + fgLine([J.S, J.N], 5.4, near) + fgDot(J.Hd, FG.head, near + ' fgfill') +
    leg(J.K, J.A, J.F, near) + fgLine([J.S, J.E, J.W], 9.4, halo) + arm(J.E, J.W, near);
}
function fgBodyFront(J) {
  const c = 'fgb', limb = s => fgLine([J['H' + s], J['K' + s]], 8.6, c) + fgLine([J['K' + s], J['A' + s]], 7, c) + fgBox(J['A' + s][0] - 4.2, J['A' + s][1] + 0.2, 8.4, 4, 2, c + ' fgfill');
  const arm = s => fgLine([J['S' + s], J['E' + s]], 6.2, c) + fgLine([J['E' + s], J['W' + s]], 5.2, c) + fgDot(J['W' + s], 3, c + ' fgfill');
  return limb('') + limb('2') + '<path class="' + c + ' fgfill" stroke-width="5" d="M' + fgP(J.S) + 'L' + fgP(J.S2) + 'L' + fgP(J.H2) + 'L' + fgP(J.H) + 'Z"/>' +
    fgLine([J.N, [J.cx, J.S[1]]], 5.4, c) + fgDot(J.Hd, FG.head, c + ' fgfill') + fgLine([J.S, J.E, J.W], 9.4, 'fgh') + fgLine([J.S2, J.E2, J.W2], 9.4, 'fgh') + arm('') + arm('2');
}
// equipment, drawn from a few shapes. Weights and handles (what you hold) take the accent color.
const EQ = {
  floor: () => '<path class="fgl" d="M6 ' + FG.FLOOR + 'H194"/>',
  mat: (x0, x1) => fgBox(x0, FG.FLOOR - 2.2, x1 - x0, 2.2, 1, 'fge fgfill'),
  bench: (x0, x1, top) => { const y = fgNum({ t: top }, 't', FG.FLOOR - 24); return fgBox(x0, y, x1 - x0, 4, 2, 'fge fgfill') + fgLine([[x0 + 6, y + 4], [x0 + 6, FG.FLOOR]], 2.4, 'fge') + fgLine([[x1 - 6, y + 4], [x1 - 6, FG.FLOOR]], 2.4, 'fge') + fgLine([[x0 + 2, FG.FLOOR], [x0 + 10, FG.FLOOR]], 2.4, 'fge') + fgLine([[x1 - 10, FG.FLOOR], [x1 - 2, FG.FLOOR]], 2.4, 'fge'); },
  // a pad of a machine or an adjustable bench: from point a, `len` long, pointing at `ang`
  pad: (a, len, ang, th) => { const b = fgAdd(a, len, ang); return fgLine([a, b], th || 4.4, 'fge fgpad'); },
  post: (x, y0, y1, w) => fgLine([[x, y0], [x, y1 == null ? FG.FLOOR : y1]], w || 3, 'fge'),
  bar: (a, b, w) => fgLine([a, b], w || 2.2, 'fge'),
  seat: (x0, x1, y) => fgBox(x0, y, x1 - x0, 3.6, 1.8, 'fge fgfill') + fgLine([[(x0 + x1) / 2, y + 3.6], [(x0 + x1) / 2, FG.FLOOR]], 3, 'fge'),
  roll: c => fgDot(c, 3.6, 'fge fgpad fgfill'),
  plate: c => fgDot(c, 12.4, 'fgw') + fgDot(c, 2, 'fgw fgfill'),              // a 45 lb plate, seen from the end of the bar
  db: c => fgDot(c, 4.4, 'fgw fgfill'),                                        // a dumbbell, seen from its end
  dbSide: (c, ang) => { const a = fgAdd(c, 5.5, ang), b = fgAdd(c, -5.5, ang); return fgLine([a, b], 2, 'fgw') + fgDot(a, 3.2, 'fgw fgfill') + fgDot(b, 3.2, 'fgw fgfill'); },
  kb: c => fgDot([c[0], c[1] + 5], 5.6, 'fgw fgfill') + '<path class="fgw" stroke-width="1.8" d="M' + fgP([c[0] - 3.4, c[1] + 1]) + 'Q' + fgP([c[0], c[1] - 5]) + ' ' + fgP([c[0] + 3.4, c[1] + 1]) + '"/>',
  // a cable from a pulley to the hand, with what is clipped to it
  cable: (pul, to, att, ang) => fgDot(pul, 2.6, 'fge') + fgLine([pul, to], 0.9, 'fgc') + (att === 'rope' ? fgLine([to, fgAdd(to, 5, fgNum({ a: ang }, 'a', 200))], 1.8, 'fgw') : att === 'handle' ? fgDot(to, 3.4, 'fgw') : fgDot(to, 2.3, 'fgw fgfill')),
  stack: (x, top) => fgBox(x - 5, top, 10, FG.FLOOR - top, 2, 'fge') + fgBox(x - 3.4, FG.FLOOR - 34, 6.8, 30, 1, 'fge fgfill fgsoft')
};
// one frame as SVG markup (without the outer <svg>): equipment behind, the body, equipment in front, then markers
function fgFrame(key, view, pos, marks) {
  const def = fgDef(key); if (!def) return '';
  const v = fgViewOf(def, view), at = fgAt(v, pos), front = v.view === 'front', J = front ? fgFrontSolve(at.pose) : fgSolve(at.pose), eq = v.eq ? v.eq(J, at.pose) : {};
  let h = EQ.floor() + (eq.back || '') + (front ? fgBodyFront(J) : fgBodySide(J)) + (eq.front || '');
  if (marks) (v.marks || []).forEach((m, i) => { if (fgNum(m, 'k', fgNum(v, 'still', 1)) !== at.rest) return; const c0 = typeof m.j === 'function' ? m.j(J) : J[m.j], c = [c0[0] + (m.dx || 0), c0[1] + (m.dy || 0)];
    h += fgDot(c, 4.6, 'fgm') + '<text class="fgmt" x="' + fgN(c[0]) + '" y="' + fgN(c[1] + 2.5) + '" text-anchor="middle">' + (i + 1) + '</text>'; });
  return h;
}
const fgSVG = (key, view, pos, marks, label) => '<svg class="figs" viewBox="0 0 ' + FG.W + ' ' + FG.H + '" role="img" aria-label="' + esc(label || 'How the move looks') + '">' + fgFrame(key, view, pos, marks) + '</svg>';

/* --- the player: pause or play, drag through the rep, side or front --- */
// Each player has an id (data-fid) and keeps its place in figSt across redraws, so a screen that is drawn again does
// not restart the rep. One timer redraws whatever players are on screen, and stops when there are none.
const figSt = {};
let figRaf = 0, figLast = 0;
const figStill = () => motionOf() === 'off'; // Off animations or the phone's reduce-motion setting: the key position, as a still
function figState(fid, key) {
  const def = fgDef(key), s = figSt[fid];
  if (s && s.key === key) return s;
  const view = def && !def.keys ? 'front' : 'side', v = def ? fgViewOf(def, view) : null;
  return (figSt[fid] = { key, view, t0: Date.now(), paused: figStill(), pos: v ? fgKeyPos(v) : 0, drag: false });
}
function figPos(s, v) { if (s.paused) return s.pos; const total = fgAt(v, 0).total * 1000; return ((Date.now() - s.t0) % total) / total; }
// every marker of the view is always listed and the ones on screen are lit, so the legend never changes height
function figLegend(v, rest) { return (v.marks || []).map((m, i) => '<span' + (fgNum(m, 'k', fgNum(v, 'still', 1)) === rest ? ' class="on"' : '') + '><b>' + (i + 1) + '</b> ' + esc(m.t) + '</span>').join(''); }
// The player's markup. `name` is read out for the picture; `compact` is the smaller one at the top of a live screen.
function figHTML(key, fid, name, compact) {
  const def = fgDef(key); if (!def) return '';
  const s = figState(fid, key), v = fgViewOf(def, s.view), pos = figPos(s, v), at = fgAt(v, pos), both = !!(def.keys && def.front);
  figKick();
  return '<div class="fig' + (compact ? ' compact' : '') + '" data-fig="' + esc(key) + '" data-fid="' + esc(fid) + '" data-view="' + s.view + '">' +
    fgSVG(key, s.view, pos, true, name + ', ' + (v.view === 'front' ? 'front' : 'side') + ' view') +
    '<div class="figinfo"><b class="figphase" aria-live="off">' + esc(at.label) + '</b><div class="figlegend" aria-live="off">' + figLegend(v, at.rest) + '</div></div>' +
    '<div class="figbar"><button type="button" class="figplay" data-a="fig-play" data-fid="' + esc(fid) + '" aria-label="' + (s.paused ? 'Play' : 'Pause') + '" aria-pressed="' + !s.paused + '">' + (s.paused ? '▶' : '❚❚') + '</button>' +
    '<input type="range" class="figscrub" min="0" max="1000" step="1" value="' + Math.round(pos * 1000) + '" data-fid="' + esc(fid) + '" aria-label="Drag through the rep">' +
    (both ? '<button type="button" class="small figview" data-a="fig-view" data-fid="' + esc(fid) + '" aria-pressed="' + (s.view === 'front') + '">' + (s.view === 'front' ? 'Side view' : 'Front view') + '</button>' : '') + '</div></div>';
}
function figPaint(el) { // bring one player on screen up to date, in place
  const s = figSt[el.dataset.fid], def = s && fgDef(s.key); if (!def) return;
  const v = fgViewOf(def, s.view), pos = figPos(s, v), at = fgAt(v, pos), svg = el.querySelector('.figs'), ph = el.querySelector('.figphase'), lg = el.querySelector('.figlegend'), sc = el.querySelector('.figscrub');
  if (svg) svg.innerHTML = fgFrame(s.key, s.view, pos, true);
  if (ph && ph.textContent !== at.label) ph.textContent = at.label;
  if (lg) { const t = figLegend(v, at.rest); if (lg.dataset.t !== t) { lg.dataset.t = t; lg.innerHTML = t; } }
  if (sc && !s.drag) sc.value = String(Math.round(pos * 1000));
}
function figTick() {
  figRaf = 0; const els = document.querySelectorAll('.fig[data-fid]'); if (!els.length) return; // nothing to play: the timer stops
  const now = Date.now(); let moving = false;
  els.forEach(el => { const s = figSt[el.dataset.fid]; if (!s || s.paused || document.hidden) return; moving = true; if (now - figLast >= 33) figPaint(el); });
  if (now - figLast >= 33) figLast = now;
  if (moving) figRaf = requestAnimationFrame(figTick);
}
function figKick() { if (!figRaf) figRaf = requestAnimationFrame(figTick); }
function figRedraw(fid) { document.querySelectorAll('.fig[data-fid="' + fid + '"]').forEach(el => { const s = figSt[fid], b = el.querySelector('.figplay'), vb = el.querySelector('.figview'); el.dataset.view = s.view; figPaint(el);
  if (b) { b.textContent = s.paused ? '▶' : '❚❚'; b.setAttribute('aria-label', s.paused ? 'Play' : 'Pause'); b.setAttribute('aria-pressed', String(!s.paused)); }
  if (vb) { vb.textContent = s.view === 'front' ? 'Side view' : 'Front view'; vb.setAttribute('aria-pressed', String(s.view === 'front')); } }); figKick(); }
ACT['fig-play'] = el => { const s = figSt[el.dataset.fid]; if (!s) return; const def = fgDef(s.key), v = fgViewOf(def, s.view);
  if (s.paused) { s.t0 = Date.now() - s.pos * fgAt(v, 0).total * 1000; s.paused = false; } else { s.pos = figPos(s, v); s.paused = true; }
  figRedraw(el.dataset.fid); };
ACT['fig-view'] = el => { const s = figSt[el.dataset.fid]; if (!s) return; const def = fgDef(s.key); if (!(def.keys && def.front)) return;
  s.view = s.view === 'front' ? 'side' : 'front'; const v = fgViewOf(def, s.view); if (s.paused) s.pos = fgKeyPos(v); else s.t0 = Date.now();
  figRedraw(el.dataset.fid); };
// dragging the slider pauses the rep and shows the frame under the thumb
document.addEventListener('input', e => { const el = e.target; if (!el.classList || !el.classList.contains('figscrub')) return; const s = figSt[el.dataset.fid]; if (!s) return;
  s.paused = true; s.drag = true; s.pos = clamp(Number(el.value) / 1000, 0, 0.9999); figRedraw(el.dataset.fid); s.drag = false; });
document.addEventListener('visibilitychange', () => { if (!document.hidden) figKick(); }); // the timer stops while the page is hidden
