const $ = id => document.getElementById(id);
let lastTabs = '';
let microphonePrompt = null;
const micButton = document.createElement('button');
const pasteButton = document.createElement('button');
pasteButton.id = 'paste'; pasteButton.textContent = 'Paste';
pasteButton.title = 'Paste into the last focused website field (Ctrl+V)';
$('screenshot').after(pasteButton);
pasteButton.onclick = () => window.gost.command('paste');
micButton.id = 'microphone-revoke'; micButton.textContent = 'Mic allowed · Reset'; micButton.hidden = true;
micButton.title = 'Remove microphone permission and reload this site’s tabs to stop recording';
$('notice').after(micButton);
micButton.onclick = () => window.gost.command('microphone-revoke');
$('microphone-allow').onclick = () => microphonePrompt && window.gost.command('microphone-answer', { id: microphonePrompt.id, allow: true });
$('microphone-block').onclick = () => microphonePrompt && window.gost.command('microphone-answer', { id: microphonePrompt.id, allow: false });
function update(state) {
  $('screenshot').disabled = state.screenshotBusy;
  $('screenshot').title = state.screenshotShortcutReady ? 'Capture an area outside Gost (Ctrl+Shift+S)' : 'Capture an area outside Gost — shortcut occupied by another app';
  microphonePrompt = state.microphonePrompt;
  $('microphone-prompt').hidden = !microphonePrompt;
  $('microphone-origin').textContent = microphonePrompt?.origin || '';
  $('microphone-origin').title = microphonePrompt?.origin || '';
  micButton.hidden = !state.microphoneAllowed;
  const signature = JSON.stringify([state.tabs, state.activeId]);
  if (signature !== lastTabs) {
    const focused = document.activeElement?.dataset?.focus;
    $('tabs').replaceChildren(...state.tabs.map(tab => {
      const group = document.createElement('div'); group.className = `tab${tab.id === state.activeId ? ' active' : ''}`; group.setAttribute('role', 'presentation');
      const select = document.createElement('button'); select.className = 'tab-select'; select.textContent = `${tab.loading ? '… ' : ''}${tab.title}`; select.title = tab.title;
      select.setAttribute('role', 'tab'); select.setAttribute('aria-selected', String(tab.id === state.activeId)); select.dataset.focus = `tab-${tab.id}`;
      select.onclick = () => window.gost.command('select', tab.id);
      const close = document.createElement('button'); close.className = 'tab-close'; close.textContent = '×'; close.setAttribute('aria-label', `Close ${tab.title}`); close.dataset.focus = `close-${tab.id}`;
      close.onclick = () => window.gost.command('close', tab.id);
      group.append(select, close); return group;
    }));
    if (focused) document.querySelector(`[data-focus="${focused}"]`)?.focus();
    lastTabs = signature;
  }
  if (document.activeElement !== $('address')) $('address').value = state.url;
  $('back').disabled = !state.canBack; $('forward').disabled = !state.canForward;
  $('pin').setAttribute('aria-pressed', String(state.pinned));
  $('protection').textContent = state.protected ? 'Capture exclusion on' : 'Capture exclusion unavailable';
  $('notice').textContent = state.notice || 'Verify with a second participant before sharing.';
  $('shortcut').textContent = state.shortcutReady ? 'Ctrl + Shift + Space to hide / show' : 'Shortcut unavailable — use the system tray';
}
for (const name of ['new', 'back', 'forward', 'reload', 'home', 'pin', 'hide', 'screenshot']) $(name).onclick = () => window.gost.command(name);
$('address-form').onsubmit = async event => {
  event.preventDefault();
  await window.gost.command('navigate', $('address').value);
  $('address').blur();
};
$('address').addEventListener('focus', () => $('address').select());
window.gost.onState(update);
window.gost.onFocusAddress(() => { $('address').focus(); $('address').select(); });
window.gost.command('state').then(update);
