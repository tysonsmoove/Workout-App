/* ---------- Apple Health import: the paste box and the shortcut recipe ---------- */
const hkWhen = d => { const r = rel(d); return r === nice(d) ? r : r.toLowerCase(); };
const healthLine = (pid, date) => { const h = healthDay(pid, date), s = h ? healthStatsText(h) : ''; return s ? 'Apple Health: ' + s : ''; };
const healthButton = () => '<button type="button" class="quiet" data-a="health" style="margin-left:auto">Import from Health</button>';
function shortcutStepsHTML() {
  const find = (type, name, extra) => '<li>Add <b>Find Health Samples</b>. Set <b>Type</b> to <b>' + type + '</b>. Tap <b>Add Filter</b> and set it to <b>Start Date is today</b>. ' + extra + ' Then add <b>Set Variable</b> and name it <code>' + name + '</code>.</li>';
  const total = 'Open the options and set <b>Group by</b> to <b>Day</b>; turn <b>Fill Missing</b> off if you see it.';
  return '<ol class="steps">' +
    '<li>On your iPhone open the <b>Shortcuts</b> app, tap <b>+</b>, and rename the new shortcut <b>Laps Health</b>.</li>' +
    find('Exercise Minutes', 'exercise', total) +
    find('Steps', 'steps', total) +
    find('Active Calories', 'active', total + ' Some iOS versions call it Active Energy.') +
    find('Water', 'water', total + ' Set <b>Unit</b> to fl oz.') +
    find('Weight', 'weight', 'Leave Group by alone. Set <b>Sort by</b> to <b>Start Date</b>, <b>Order</b> to <b>Latest First</b>, turn <b>Limit</b> on and get <b>1</b> item. Set <b>Unit</b> to lb.') +
    '<li>Add <b>Format Date</b>. Date: <b>Current Date</b>. Date Format: <b>Custom</b>. Format String: <code>yyyy-MM-dd</code></li>' +
    '<li>Add <b>Text</b> and type these six lines. After each colon insert the matching variable from the bar above the keyboard: Formatted Date first, then your five named variables.<pre class="code">date:\nexercise:\nsteps:\nactive:\nwater:\nweight:</pre>Tap each of the five health variables once it is in place and choose <b>Value</b>, so only the number is copied.</li>' +
    '<li>Add <b>Copy to Clipboard</b>. It should read "Copy Text to clipboard".</li>' +
    '<li>Optional: add <b>Open URLs</b> with the link to this page, so the shortcut finishes by opening Morning Laps.</li>' +
    '<li>Tap <b>Done</b>, then run it once. iOS asks whether Shortcuts may read each kind of Health data. Choose <b>Allow</b> each time.</li>' +
    '<li>Come back here, tap <b>Import from Health</b>, tap the box, choose <b>Paste</b>, then <b>Import</b>.</li></ol>' +
    '<p class="tiny muted">Any line can be left out; the app imports what it finds and shows you exactly what it understood before anything is saved. If a number is missing, open the Health app, tap your picture, then Apps, then Shortcuts, and switch on what the shortcut reads. Apple lets Shortcuts read daily totals but not the list of workouts, so movement comes from your Watch\'s Exercise Minutes. For one-tap use, add the shortcut to your Home Screen.</p>';
}
function refreshHealthPreview() {
  const o = state.ov, box = $('#hkPreview'), btn = $('#hkGo'); if (!o || o.type !== 'health' || !box) return;
  const text = String(o.text || '');
  if (!text.trim()) { box.innerHTML = ''; if (btn) { btn.disabled = true; btn.textContent = 'Import'; } return; }
  const pid = me(), parsed = parseHealthPaste(text), plan = healthPlan(pid, parsed, state.selDate);
  let h = '';
  if (plan.err) h += '<div class="banner bad">' + esc(plan.err) + '</div>';
  else {
    h += '<div class="eyebrow">For ' + esc(nice(plan.date)) + (parsed.date ? '' : ' · no date in the paste, so the day selected in the app') + '</div>';
    plan.rows.forEach(r => {
      const on = r.can && o.use[r.k] !== false;
      h += '<div class="hkrow">' + (r.can ? '<button type="button" class="tick' + (on ? ' on' : '') + '" data-a="hk-toggle" data-k="' + r.k + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Included' : 'Skipped') + ': ' + esc(r.title) + '">' + (on ? '✓' : '') + '</button>' : '<span class="tick off" aria-hidden="true">–</span>') +
        '<div><b>' + esc(r.title) + '</b><div class="tiny muted">' + esc(r.sub) + '</div></div></div>';
    });
  }
  if (parsed.unknown.length) h += '<p class="tiny muted">Not understood and skipped: ' + parsed.unknown.slice(0, 4).map(x => '“' + esc(x) + '”').join(', ') + (parsed.unknown.length > 4 ? ' and ' + (parsed.unknown.length - 4) + ' more' : '') + '.</p>';
  box.innerHTML = h;
  const go = !plan.err && (plan.stats || plan.rows.some(r => r.can && o.use[r.k] !== false));
  if (btn) { btn.disabled = !go; btn.textContent = plan.err ? 'Import' : 'Import for ' + hkWhen(plan.date); }
}
OV.health = {
  html: o => '<div class="ov" role="dialog" aria-modal="true" aria-label="Import from Apple Health">' + ovHead('Import from Health', 'Into ' + esc(P(me()).name) + '\'s log') +
    '<p class="muted">Run your <b>Laps Health</b> shortcut on this iPhone, then tap the box and choose <b>Paste</b>.</p>' +
    '<textarea id="hkText" data-ovf="text" rows="6" placeholder="Paste here" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Text copied by the shortcut">' + esc(o.text || '') + '</textarea>' +
    '<div id="hkPreview" class="stack" aria-live="polite"></div>' +
    '<div class="row"><button type="button" class="primary" id="hkGo" data-a="hk-import" disabled>Import</button></div>' +
    '<details class="plain" id="hkHelp"><summary>Set up the shortcut, once per iPhone</summary><div style="margin-top:8px">' + shortcutStepsHTML() + '</div></details></div>',
  after: () => refreshHealthPreview()
};
ACT.health = () => openOv({ type: 'health', text: '', use: {} });
ACT['hk-toggle'] = el => { const o = state.ov, k = el.dataset.k; o.use[k] = o.use[k] === false; refreshHealthPreview(); };
ACT['hk-import'] = async () => {
  const o = state.ov, pid = me(), parsed = parseHealthPaste(o.text), plan = healthPlan(pid, parsed, state.selDate);
  if (plan.err) { toast(plan.err, 3400); return; }
  const before = scoreSnapshot();
  const did = await applyHealthImport(pid, plan, parsed, o.use);
  state.selDate = plan.date; persistDrafts();
  closeOv(); render();
  celebrate(did.length ? 'Imported for ' + hkWhen(plan.date) + ': ' + did.join(', ') + '.' : 'Nothing new to import.', { ms: 3600, before });
};
