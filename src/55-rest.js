/* ---------- Rest timer: a bar in the foot of the lift sheet ---------- */
// Logging a set for today starts a countdown. The bar is part of the lift sheet's foot, above the Save bar and outside
// the part that scrolls, so it never sits on top of a button. It is patched in place by id (like the toast), never
// through render(), so it cannot disturb typing; when the sheet is redrawn it is drawn again from restT. It stops
// when the lift is saved or the sheet closes. No sound: a buzz where the browser supports vibration.
const restT = { end: 0, total: 0, tick: 0, hide: 0, done: false, label: '' };
const restSeconds = () => { const v = Number(state.settings.rest); return v === 60 || v === 120 ? v : 90; }; // main lifts; set on the Program tab
const restFor = key => EX[key] && (EX[key].bw || CORE.includes(key)) ? 60 : restSeconds();                   // core and bodyweight moves rest 60 s
const restClock = () => { const left = Math.max(0, Math.ceil((restT.end - Date.now()) / 1000)); return Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); };
const restLabel = () => restT.done ? 'Rest over · next set' : 'Rest' + (restT.label ? ' · ' + restT.label : '');
const restBarHTML = () => '<div id="rest" class="restbar' + (restT.done ? ' done' : '') + '" role="timer" aria-label="Rest timer"' + (restT.end ? '' : ' hidden') + '><i id="restFill"></i><b class="num" id="restTime">' + (restT.end ? restClock() : '1:30') + '</b><span id="restLabel">' + esc(restLabel()) + '</span>' +
  '<button type="button" class="small" data-a="timer-add" aria-label="Add 15 seconds">+15 s</button><button type="button" class="small" data-a="timer-x" aria-label="Dismiss rest timer">×</button></div>';
function restDraw() {
  const bar = $('#rest'); if (!bar) { if (restT.end) restStop(); return; } // the sheet is gone: so is the timer
  if (bar.hidden) return;
  const ms = restT.end - Date.now(), left = Math.max(0, Math.ceil(ms / 1000));
  $('#restTime').textContent = restClock();
  $('#restFill').style.width = (restT.total ? clamp(1 - ms / (restT.total * 1000), 0, 1) * 100 : 0).toFixed(1) + '%';
  if (left <= 0 && !restT.done) {
    restT.done = true; bar.classList.add('done'); $('#restLabel').textContent = restLabel();
    try { if (navigator.vibrate) navigator.vibrate([180, 90, 180]); } catch (e) { /* not supported */ }
    clearInterval(restT.tick); restT.tick = 0; restT.hide = setTimeout(restStop, 8000);
  }
}
function restStart(sec, label) {
  const bar = $('#rest'); if (!bar) return; // only while the lift sheet is open
  clearInterval(restT.tick); clearTimeout(restT.hide);
  restT.total = sec; restT.end = Date.now() + sec * 1000; restT.done = false; restT.label = label || '';
  bar.hidden = false; bar.classList.remove('done'); $('#restLabel').textContent = restLabel();
  restDraw(); restT.tick = setInterval(restDraw, 250);
}
function restStop() {
  const bar = $('#rest'); clearInterval(restT.tick); clearTimeout(restT.hide); restT.tick = 0; restT.end = 0; restT.done = false; restT.label = '';
  if (bar) { bar.hidden = true; bar.classList.remove('done'); }
}
ACT['timer-add'] = () => {
  if (!restT.end) return;
  restT.end = Math.max(restT.end, Date.now()) + 15000; restT.total += 15;
  if (restT.done) { restT.done = false; clearTimeout(restT.hide); const bar = $('#rest'); if (bar) { bar.classList.remove('done'); $('#restLabel').textContent = restLabel(); } restT.tick = setInterval(restDraw, 250); }
  restDraw();
};
ACT['timer-x'] = () => restStop();
// tapping the bar must not take focus from the set field being typed in (on a phone that would close the keyboard)
document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('#rest')) e.preventDefault(); });
