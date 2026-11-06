const $ = id => document.getElementById(id);
let lastTabs = '';
let microphonePrompt = null;
const glassButton = document.createElement('button');
glassButton.id = 'glass'; glassButton.textContent = 'Glass';
glassButton.title = 'Toggle translucent whole-window appearance';
$('pin').after(glassButton);
let appearance = { enabled: false, tint: 65, blur: 24, websites: true };
try { Object.assign(appearance, JSON.parse(localStorage.getItem('ghost-appearance') || '{}')); } catch {}
const controls = document.createElement('div'); controls.id = 'glass-settings'; controls.hidden = true;
controls.innerHTML = '<label>Background tint <input id="glass-tint" type="range" min="15" max="95"><output id="tint-value"></output></label><label>Surface blur <input id="glass-blur" type="range" min="0" max="60"><output id="blur-value"></output></label><label><input id="glass-sites" type="checkbox"> Apply glass to website backgrounds (experimental)</label><small>Desktop background blur strength is controlled by the operating system. Surface blur affects the browser controls.</small><button id="glass-done">Done</button>';
document.body.append(controls);
const applyAppearance = () => {
  localStorage.setItem('ghost-appearance', JSON.stringify(appearance));
  window.ghost.command('glass', appearance);
};
glassButton.onclick = () => { appearance.enabled = !appearance.enabled; controls.hidden = !appearance.enabled; window.ghost.command("appearance-panel", !controls.hidden); applyAppearance(); };
$('glass-tint').value = appearance.tint; $('glass-blur').value = appearance.blur; $('glass-sites').checked = appearance.websites;
$('glass-tint').oninput = e => { appearance.tint = Number(e.target.value); applyAppearance(); };
$('glass-blur').oninput = e => { appearance.blur = Number(e.target.value); applyAppearance(); };
$('glass-sites').onchange = e => { appearance.websites = e.target.checked; applyAppearance(); };
$('glass-done').onclick = () => controls.hidden = true;
glassButton.oncontextmenu = e => { e.preventDefault(); controls.hidden = !controls.hidden; window.ghost.command("appearance-panel", !controls.hidden); };
applyAppearance();
const copyButton = document.createElement('button');copyButton.id='copy';copyButton.textContent='Copy';copyButton.title='Copy selected website text (Ctrl+C)';$('screenshot').before(copyButton);copyButton.onclick=()=>window.ghost.command('copy');
const micButton = document.createElement('button');
const pasteButton = document.createElement('button');
pasteButton.id = 'paste'; pasteButton.textContent = 'Paste';
pasteButton.title = 'Paste into the last focused website field (Ctrl+V)';
$('screenshot').after(pasteButton);
pasteButton.onclick = () => window.ghost.command('paste');
micButton.id = 'microphone-revoke'; micButton.textContent = 'Mic allowed · Reset'; micButton.hidden = true;
micButton.title = 'Remove microphone permission and reload this site’s tabs to stop recording';
$('notice').after(micButton);
micButton.onclick = () => window.ghost.command('microphone-revoke');
$('microphone-allow').onclick = () => microphonePrompt && window.ghost.command('microphone-answer', { id: microphonePrompt.id, allow: true });
$('microphone-block').onclick = () => microphonePrompt && window.ghost.command('microphone-answer', { id: microphonePrompt.id, allow: false });
function update(state) {
  document.documentElement.classList.toggle('glass', state.glass);
  const a = state.appearance || appearance;
  document.documentElement.style.setProperty('--glass-tint', a.tint / 100);
  document.documentElement.style.setProperty('--glass-blur', a.blur + 'px');
  $('tint-value').textContent = a.tint + '%'; $('blur-value').textContent = a.blur + 'px';
  glassButton.setAttribute('aria-pressed', String(state.glass));
  $('screenshot').disabled = state.screenshotBusy;
  $('screenshot').title = state.screenshotShortcutReady ? 'Capture an area outside Ghost (Ctrl+Shift+S)' : 'Capture an area outside Ghost — shortcut occupied by another app';
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
      select.onclick = () => window.ghost.command('select', tab.id);
      const close = document.createElement('button'); close.className = 'tab-close'; close.textContent = '×'; close.setAttribute('aria-label', `Close ${tab.title}`); close.dataset.focus = `close-${tab.id}`;
      close.onclick = () => window.ghost.command('close', tab.id);
      group.append(select, close); return group;
    }));
    if (focused) document.querySelector(`[data-focus="${focused}"]`)?.focus();
    lastTabs = signature;
  }
  if (document.activeElement !== $('address')) $('address').value = state.url;
  $('back').disabled = !state.canBack; $('forward').disabled = !state.canForward;
  $('pin').setAttribute('aria-pressed', String(state.pinned));
  $('protection').textContent = state.protected ? 'Capture exclusion on' : 'Capture exclusion unavailable';
  if (state.platform === 'darwin') $('protection').textContent = 'Mac capture protection is limited';
  $('notice').textContent = state.notice || 'Verify with a second participant before sharing.';
  $('shortcut').textContent = state.shortcutReady ? 'Ctrl + Shift + Space to hide / show' : 'Shortcut unavailable — use the system tray';
}
for (const name of ['new', 'back', 'forward', 'reload', 'home', 'pin', 'hide', 'screenshot']) $(name).onclick = () => window.ghost.command(name);
$('address-form').onsubmit = async event => {
  event.preventDefault();
  await window.ghost.command('navigate', $('address').value);
  $('address').blur();
};
$('address').addEventListener('focus', () => $('address').select());
window.ghost.onState(update);
window.ghost.onFocusAddress(() => { $('address').focus(); $('address').select(); });
window.ghost.command('state').then(update);
