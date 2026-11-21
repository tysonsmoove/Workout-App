/* ---------- Rest timer: its own bar outside the page, so it never touches the render loop ---------- */
// Logging a set for today starts a countdown. Everything here writes straight to the #rest element (like the toast),
// never through render(), so it cannot disturb typing or a pending re-render. No sound: a flash, and a buzz where
// the browser supports vibration.
const restT = { end: 0, total: 0, tick: 0, hide: 0, done: false };
const restSeconds = () => { const v = Number(state.settings.rest); return v === 60 || v === 120 ? v : 90; }; // main lifts; set on the Program tab
const restFor = key => EX[key] && (EX[key].bw || CORE.includes(key)) ? 60 : restSeconds();                   // core and bodyweight moves rest 60 s
function restDraw() {
  const bar = $('#rest'); if (!bar || bar.hidden) return;
  const ms = restT.end - Date.now(), left = Math.max(0, Math.ceil(ms / 1000)), sb = $('#savebar');
  $('#restTime').textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
  $('#restFill').style.width = (restT.total ? clamp(1 - ms / (restT.total * 1000), 0, 1) * 100 : 0).toFixed(1) + '%';
  // sit just above the save bar while it is pinned to the bottom of the screen; otherwise at the bottom edge
  bar.style.setProperty('--lift', (sb && sb.getBoundingClientRect().bottom >= window.innerHeight - 2 ? sb.offsetHeight : 0) + 'px');
  if (left <= 0 && !restT.done) {
    restT.done = true; bar.classList.add('done'); $('#restLabel').textContent = 'Rest over · next set';
    try { if (navigator.vibrate) navigator.vibrate([180, 90, 180]); } catch (e) { /* not supported */ }
    clearInterval(restT.tick); restT.tick = 0; restT.hide = setTimeout(restStop, 8000);
  }
}
function restStart(sec, label) {
  const bar = $('#rest'); if (!bar) return;
  clearInterval(restT.tick); clearTimeout(restT.hide);
  restT.total = sec; restT.end = Date.now() + sec * 1000; restT.done = false;
  bar.hidden = false; bar.classList.remove('done'); document.body.classList.add('resting'); $('#restLabel').textContent = 'Rest · ' + label;
  restDraw(); restT.tick = setInterval(restDraw, 250);
}
function restStop() {
  const bar = $('#rest'); clearInterval(restT.tick); clearTimeout(restT.hide); restT.tick = 0; restT.end = 0;
  if (bar) { bar.hidden = true; bar.classList.remove('done'); } document.body.classList.remove('resting');
}
ACT['timer-add'] = () => {
  if (!restT.end) return;
  restT.end = Math.max(restT.end, Date.now()) + 15000; restT.total += 15;
  if (restT.done) { restT.done = false; clearTimeout(restT.hide); $('#rest').classList.remove('done'); $('#restLabel').textContent = 'Rest'; restT.tick = setInterval(restDraw, 250); }
  restDraw();
};
ACT['timer-x'] = () => restStop();
// tapping the bar must not take focus from the set field being typed in (on a phone that would close the keyboard)
(function () { const bar = $('#rest'); if (bar) bar.addEventListener('pointerdown', e => e.preventDefault()); })();
