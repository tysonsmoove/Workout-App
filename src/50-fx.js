/* ---------- Overlays, celebrations, and the action registry ---------- */
const ACT = {};   // data-a="name" on any element routes its click here
const OV = {};    // overlay type -> { html(o), center, locked, after(o) }
function renderOv() {
  const root = $('#ov'), o = state.ov, act = document.activeElement;
  // remember which control had focus so a redraw of the same overlay hands it back
  const keep = act && root.contains(act) ? ['data-a', 'data-d', 'data-v', 'data-ovf'].map(k => act.getAttribute(k) != null ? '[' + k + '="' + act.getAttribute(k) + '"]' : '').join('') : '';
  if (!o || !OV[o.type]) { state.ov = null; root.hidden = true; root.innerHTML = ''; delete root.dataset.type; document.body.style.overflow = ''; return; }
  const def = OV[o.type], same = root.dataset.type === o.type;
  root.hidden = false; root.className = 'ov-root' + (def.center ? ' center' : ''); root.dataset.type = o.type;
  root.innerHTML = def.html(o);
  document.body.style.overflow = 'hidden';
  if (def.after) def.after(o);
  if (!root.contains(document.activeElement)) { const f = (same && keep && root.querySelector(keep)) || root.querySelector('.primary:not(:disabled), .xbtn, button'); if (f) f.focus({ preventScroll: true }); }
}
function openOv(o) { state.ov = o; if (OV[o.type] && !OV[o.type].center) $('#toast').hidden = true; renderOv(); } // a sheet replaces any message still showing
function queueOv(o) { if (state.ov) state.ovQ.push(o); else openOv(o); }
function closeOv() { state.ov = state.ovQ.length ? state.ovQ.shift() : null; renderOv(); }
const ovHead = (title, sub) => '<div class="ov-head"><div><h2>' + title + '</h2>' + (sub ? '<div class="tiny muted">' + sub + '</div>' : '') + '</div><button type="button" class="xbtn" data-a="ov-close" aria-label="Close">×</button></div>';
ACT['ov-close'] = () => closeOv();

/* ---------- Particle bursts on a full-screen canvas ---------- */
const fx = { parts: [], raf: 0 };
function burst(opts) {
  opts = opts || {};
  if (reducedMotion()) return;
  const cv = $('#fx'); if (!cv || !cv.getContext) return;
  const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const p = P(opts.pid || me()), v = skinVars(p.skin), kind = opts.kind || p.skin.fx || 'confetti';
  const colors = kind === 'flags' ? ['#15181C', '#FFFFFF', 'hsl(' + v.ah + ' ' + v.as + '% ' + v.al + '%)']
    : ['hsl(' + v.ah + ' ' + v.as + '% ' + v.al + '%)', 'hsl(' + v.ah + ' ' + v.as + '% 72%)', '#FFFFFF', '#F5C542', 'hsl(' + ((v.ah + 170) % 360) + ' 60% 55%)'];
  const glyphs = { hearts: ['💖', '💗', '🩷'], stars: ['⭐', '✨', '🌟'], flags: ['🏁'] }[kind] || null;
  const n = opts.count || 80, ox = W * (opts.x == null ? 0.5 : opts.x), oy = H * (opts.y == null ? 0.62 : opts.y);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.0, sp = 5 + Math.random() * 11;
    fx.parts.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, g: 0.26 + Math.random() * 0.14, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
      s: 6 + Math.random() * 7, life: 0, max: 95 + Math.random() * 50, c: colors[i % colors.length], gl: glyphs && Math.random() < (kind === 'flags' ? 0.3 : 0.65) ? glyphs[i % glyphs.length] : null, sq: kind === 'flags' });
  }
  if (!fx.raf) fx.raf = requestAnimationFrame(fxTick);
}
function fxTick() {
  const cv = $('#fx'), ctx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight, dpr = cv.width / (W || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  fx.parts = fx.parts.filter(p => p.life < p.max && p.y < H + 40);
  fx.parts.forEach(p => {
    p.life++; p.vy += p.g; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, Math.min(1, (p.max - p.life) / 25));
    if (p.gl) { ctx.font = Math.round(p.s * 2.1) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.gl, 0, 0); }
    else { ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.sq ? p.s : p.s * 0.55); }
    ctx.restore();
  });
  fx.raf = fx.parts.length ? requestAnimationFrame(fxTick) : 0;
  if (!fx.raf) ctx.clearRect(0, 0, W, H);
}

/* ---------- What an action changed: points, the lead, badges ---------- */
function scoreSnapshot() { const ws = weekStart(todayIso()), o = {}; PIDS.forEach(p => { o[p] = weekScore(p, ws).total; }); return o; }
function keepBadges(pid) { // write newly earned badges onto the profile, with the day they were earned
  if (!state.ready || state.cantWrite) return;
  const fresh = badgesFor(pid).filter(b => b.live && !b.since); if (!fresh.length) return;
  const cur = state.data[pid].profile || {}, badges = Object.assign({}, cur.badges);
  fresh.forEach(b => { badges[b.id] = todayIso(); });
  put(PATH.profile(pid), Object.assign({}, cur, { badges, updatedAt: new Date().toISOString() })).catch(() => {});
}
function settle() { keepBadges(me()); } // after a change that is not celebrated (an edit, a removal, a goal change)
function checkBadges(pid, quiet) { // returns badges earned since this device last looked
  keepBadges(pid);
  const earned = badgesFor(pid).filter(b => b.earned), seen = lsGet('ml.badges.' + pid, null);
  if (seen == null || quiet) { lsSet('ml.badges.' + pid, earned.map(b => b.id)); return []; }
  const fresh = earned.filter(b => !seen.includes(b.id));
  if (fresh.length) lsSet('ml.badges.' + pid, seen.concat(fresh.map(b => b.id)));
  return fresh;
}
// opts.before: the scores taken just before the change was made. Comparing against that moment, rather than against
// the last thing this phone celebrated, keeps the other phone's activity in between from faking or hiding a lead change.
function celebrate(msg, opts) {
  opts = opts || {};
  const pid = me(), other = otherPid(pid), now = scoreSnapshot(), prev = opts.before || now;
  const gained = now[pid] - prev[pid];
  if (gained > 0 || opts.force) burst({ count: gained >= 10 ? 120 : 70 });
  if (msg) toast(msg + (gained > 0 ? '  +' + gained + ' pts' : ''), opts.ms || 3000);
  if (prev[pid] <= prev[other] && now[pid] > now[other] && now[other] > 0) queueOv({ type: 'lead', pid });
  checkBadges(pid).slice(0, 3).forEach(b => queueOv({ type: 'badge', pid, badge: b }));
  return gained;
}
function announce() { // on opening the app: badges and last week's result this device has not shown yet
  const pid = me();
  checkBadges(pid).slice(0, 3).forEach(b => queueOv({ type: 'badge', pid, badge: b }));
  const weeks = compWeeks(), w = weeks[weeks.length - 1];
  if (w && w.played && lsGet('ml.seenWeek', '') < w.ws) { lsSet('ml.seenWeek', w.ws); queueOv({ type: 'weekwin', week: w }); }
}
function onReady() {
  state.ready = true; reconcileBlindDrafts(); settle();
  PIDS.forEach(pid => { if (lsGet('ml.badges.' + pid, null) == null) checkBadges(pid, true); });
  applySkin();
  if (!state.pid) openOv({ type: 'who', first: true }); else announce();
  closeWeeks();
  render();
}

OV.badge = {
  center: true,
  html: o => '<div class="ov" role="dialog" aria-modal="true" aria-label="Badge earned"><div class="eyebrow">Badge earned</div><div class="medal lg pop">' + o.badge.icon + '</div><h2>' + esc(o.badge.name) + '</h2><p class="muted">' + esc(o.badge.desc) + '</p><div class="row" style="width:100%"><button type="button" class="primary" data-a="ov-close">Nice</button></div></div>',
  after: o => burst({ pid: o.pid, y: 0.5, count: 110 })
};
OV.badgeinfo = {
  center: true,
  html: o => '<div class="ov" role="dialog" aria-modal="true" aria-label="' + esc(o.badge.name) + '"><div class="eyebrow">' + (o.badge.earned ? 'Earned' + (o.badge.since && validIso(o.badge.since) ? ' ' + shortDate(o.badge.since) : '') : 'Locked') + '</div><div class="badge ' + (o.badge.earned ? '' : 'locked') + '"><div class="medal lg">' + o.badge.icon + '</div></div><h2>' + esc(o.badge.name) + '</h2><p class="muted">' + esc(o.badge.desc) + '</p>' + (o.badge.prog ? '<p class="num"><b>' + esc(o.badge.prog) + '</b></p>' : '') + '<div class="row" style="width:100%"><button type="button" class="primary" data-a="ov-close">Close</button></div></div>'
};
OV.lead = {
  center: true,
  html: o => { const s = scoreSnapshot(), other = otherPid(o.pid); return '<div class="ov" role="dialog" aria-modal="true" aria-label="Lead change"><div class="eyebrow">Lead change</div><div class="pop">' + avatarHTML(o.pid, 'lg') + '</div><h2>' + esc(P(o.pid).name) + ' takes the lead</h2><p class="num"><b>' + s[o.pid] + '</b> to ' + s[other] + ' over ' + esc(P(other).name) + '</p><div class="row" style="width:100%"><button type="button" class="primary" data-a="ov-close">Keep going</button></div></div>'; },
  after: o => burst({ pid: o.pid, kind: 'flags', y: 0.5, count: 120 })
};
OV.weekwin = {
  center: true,
  html: o => {
    const w = o.week, win = w.winner;
    const line = win ? esc(P(win).name) + ' wins, ' + Math.max(w.tyson, w.jacquie) + ' to ' + Math.min(w.tyson, w.jacquie) : 'Dead heat at ' + w.tyson;
    return '<div class="ov" role="dialog" aria-modal="true" aria-label="Last week\'s result"><div class="eyebrow">Week of ' + shortDate(w.ws) + '</div><div class="pop">' + (win ? avatarHTML(win, 'lg') : '<div class="medal lg">🤝</div>') + '</div><h2>' + line + '</h2><p class="muted">' + (win ? 'A new week is already running. Scores reset every Monday.' : 'Nobody gets bragging rights. Settle it this week.') + '</p><div class="row" style="width:100%"><button type="button" class="primary" data-a="ov-close">On to this week</button></div></div>';
  },
  after: o => { if (o.week.winner) burst({ pid: o.week.winner, kind: 'flags', y: 0.5, count: 140 }); }
};
