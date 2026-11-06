const { app, BrowserWindow, WebContentsView, ipcMain, globalShortcut, session, Menu, Tray, nativeImage } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { isWebURL, resolveAddress } = require('./navigation');
const { createMicrophonePermissions, originOf } = require('./microphone');
const { createScreenshotTool } = require('./screenshot');
const { canWriteClipboard } = require('./clipboard-permissions');
const { settings: glassSettings, websiteCSS } = require('./glass');

const smoke = process.env.GHOST_TEST_PROFILE;
if (smoke) app.setPath('userData', smoke);
const HOME = pathToFileURL(path.join(__dirname, 'home.html')).href;
const SHELL = pathToFileURL(path.join(__dirname, 'shell.html')).href;
const TOP = 132;
let win, tabs = [], activeId, nextId = 1, notice = '', shortcutReady = false;
let browserSession, tray, screenshotTool, screenshotShortcutReady = false;
let refreshing = false;
let glass = false, appearancePanel = false;
let appearance = glassSettings();
function applyPageGlass(tab) {
  tab.glassWork = (tab.glassWork || Promise.resolve()).then(() => applyPageGlassNow(tab)).catch(() => {});
  return tab.glassWork;
}
async function applyPageGlassNow(tab) {
  const wc = tab.view.webContents;
  if (wc.isDestroyed()) return;
  if (tab.glassKey) await wc.removeInsertedCSS(tab.glassKey).catch(() => {});
  tab.glassKey = null;
  tab.view.setBackgroundColor(appearance.enabled && appearance.websites ? '#00000000' : '#ffffffff');
  const css = websiteCSS(appearance);
  if (css) tab.glassKey = await wc.insertCSS(css).catch(() => null);
}
const active = () => tabs.find(tab => tab.id === activeId);
const microphone = createMicrophonePermissions({
  owns: wc => tabs.some(tab => tab.view.webContents === wc),
  changed: () => { layout(); publish(); }
});

function state() {
  const current = active();
  return {
    tabs: tabs.map(t => ({ id: t.id, title: t.title, loading: t.view.webContents.isLoading() })),
    activeId, url: current && current.view.webContents.getURL() !== HOME ? current.view.webContents.getURL() : '',
    canBack: current?.view.webContents.navigationHistory.canGoBack() || false,
    canForward: current?.view.webContents.navigationHistory.canGoForward() || false,
    protected: !!win?.isContentProtected(), pinned: !!win?.isAlwaysOnTop(), notice, shortcutReady,
    microphonePrompt: microphone.prompt(), microphoneAllowed: microphone.status(current?.view.webContents),
    screenshotBusy: !!screenshotTool?.busy, screenshotShortcutReady, refreshing, glass,
    platform: process.platform, appearance
  };
}
function publish() {
  if (win && !win.isDestroyed()) win.webContents.send('state', state());
}
function layout() {
  if (!win || win.isDestroyed()) return;
  const [width, height] = win.getContentSize();
  const top = TOP + (microphone.prompt() ? 72 : 0) + (appearancePanel ? 250 : 0);
  for (const tab of tabs) {
    tab.view.setVisible(tab.id === activeId);
    tab.view.setBounds({ x: 0, y: top, width, height: Math.max(0, height - top) });
  }
}
function select(id) {
  if (!tabs.some(t => t.id === id)) return;
  activeId = id; notice = ''; layout(); publish(); active().view.webContents.focus();
}
function focusAddress() {
  win.webContents.focus(); win.webContents.send('focus-address');
}
function keyboard(event, input) {
  if (input.type !== 'keyDown') return;
  const ctrl = input.control || input.meta;
  const key = input.key.toLowerCase();
  if (key === 'f5' || (ctrl && key === 'r')) {
    event.preventDefault(); void refreshSite(); return;
  }
  if (ctrl && ['l', 't', 'w', 'r', 'tab'].includes(key)) {
    event.preventDefault();
    if (key === 'l') focusAddress();
    if (key === 't') { createTab(); focusAddress(); }
    if (key === 'w') closeTab(activeId);
    if (key === 'tab') {
      const i = tabs.findIndex(t => t.id === activeId);
      select(tabs[(i + (input.shift ? tabs.length - 1 : 1)) % tabs.length].id);
    }
  }
}
function createTab(url = HOME, replacing = null) {
  if (!replacing && tabs.length >= 24) { notice = 'Close a tab before opening another (24 tab limit).'; publish(); return; }
  const view = new WebContentsView({ webPreferences: {
    session: browserSession, nodeIntegration: false, contextIsolation: true, sandbox: true,
    webSecurity: true, allowRunningInsecureContent: false, navigateOnDragDrop: false,
    disableDialogs: true, safeDialogs: true
  }});
  const tab = { id: replacing?.id || nextId++, title: 'New tab', view };
  if (replacing) {
    const index = tabs.indexOf(replacing);
    microphone.cancel(replacing.view.webContents);
    win.contentView.removeChildView(replacing.view);
    replacing.view.webContents.close({ waitForBeforeUnload: false });
    tabs[index] = tab;
  } else tabs.push(tab);
  win.contentView.addChildView(view);
  const wc = view.webContents;
  wc.on('did-finish-load', () => { void applyPageGlass(tab); });
  wc.on('context-menu', (_event, params) => {
    const items = [];
    if (params.selectionText) items.push({ label: 'Copy', accelerator: 'Ctrl+C', click: () => { wc.focus(); wc.copy(); } });
    if (params.isEditable) items.push(
      { label: 'Cut', accelerator: 'Ctrl+X', enabled: params.editFlags.canCut, click: () => { wc.focus(); wc.cut(); } },
      { label: 'Paste', accelerator: 'Ctrl+V', click: () => { wc.focus(); wc.paste(); } }
    );
    if (!items.length) return;
    items.push({ label: 'Select all', accelerator: 'Ctrl+A', click: () => { wc.focus(); wc.selectAll(); } });
    Menu.buildFromTemplate(items).popup({ window: win, frame: params.frame });
  });
  wc.on('did-start-navigation', (_event, _url, isInPlace, isMainFrame) => {
    if (isMainFrame && !isInPlace) microphone.cancel(wc);
  });
  wc.on('destroyed', () => microphone.cancel(wc));
  wc.on('before-input-event', keyboard);
  // Keep every destination inside the already protected top-level window.
  // Blocking native pop-ups also avoids a visible first frame before protection.
  wc.setWindowOpenHandler(({ url: target }) => {
    if (isWebURL(target)) createTab(target);
    else { notice = 'This pop-up uses an unsupported address.'; publish(); }
    return { action: 'deny' };
  });
  wc.on('will-navigate', (event, target) => {
    if (!isWebURL(target)) { event.preventDefault(); notice = 'Only web addresses are allowed.'; publish(); }
  });
  wc.on('will-redirect', (event, target) => {
    if (!isWebURL(target)) event.preventDefault();
  });
  wc.on('page-title-updated', (_event, title) => { tab.title = title || 'Untitled'; publish(); });
  for (const event of ['did-start-loading', 'did-stop-loading', 'did-navigate', 'did-navigate-in-page']) wc.on(event, () => {
    tab.title = wc.getTitle() || 'Untitled'; publish();
  });
  wc.on('did-fail-load', (_event, code, description, _url, mainFrame) => {
    if (mainFrame && code !== -3 && tab.id === activeId) { notice = `Page could not load: ${description}. Check the address or reload.`; publish(); }
  });
  wc.on('render-process-gone', () => { notice = 'A page stopped responding. Reload it to continue.'; publish(); });
  select(tab.id);
  wc.loadURL(url).catch(() => {});
  return tab;
}
function closeTab(id) {
  const index = tabs.findIndex(t => t.id === id);
  if (index < 0) return;
  const [tab] = tabs.splice(index, 1);
  microphone.cancel(tab.view.webContents);
  win.contentView.removeChildView(tab.view);
  tab.view.webContents.close();
  if (!tabs.length) createTab();
  else if (activeId === id) select(tabs[Math.min(index, tabs.length - 1)].id);
  publish();
}
function toggleVisible() {
  if (screenshotTool?.busy) { screenshotTool.cancel(); return; }
  if (win.isVisible() && !win.isMinimized()) {
    win.hide();
  }
  else { win.show(); win.restore(); win.focus(); }
}

async function refreshSite() {
  if (refreshing || !active()) return;
  const url = active().view.webContents.getURL();
  if (!isWebURL(url)) { active().view.webContents.reload(); return; }
  const origin = new URL(url).origin;
  const selected = activeId;
  const affected = tabs.filter(t => {
    try { return new URL(t.view.webContents.getURL()).origin === origin; } catch { return false; }
  }).map(t => ({ tab: t, url: t.view.webContents.getURL() }));
  refreshing = true;
  try {
    // Destroy the old documents before clearing storage so unload handlers cannot
    // write it back. Fresh WebContents also discard their sessionStorage.
    for (const item of affected) item.replacement = createTab(HOME, item.tab);
    select(selected);
    notice = 'Clearing this website’s data…'; publish();
    microphone.revoke(origin);
    await browserSession.clearData({ origins: [origin], originMatchingMode: 'third-parties-included' });
    for (const item of affected) {
      if (!item.replacement.view.webContents.isDestroyed()) await item.replacement.view.webContents.loadURL(item.url);
    }
    notice = 'Website data cleared and page reloaded.';
  } catch (error) {
    notice = `Refresh could not finish: ${error.message}`;
  } finally { refreshing = false; layout(); publish(); }
}

function keepOnTop() {
  if (!win || win.isDestroyed()) return;
  win.setAlwaysOnTop(true, 'floating');
  if (!win.isAlwaysOnTop()) notice = 'Windows could not change pin-on-top.';
  publish();
}

app.whenReady().then(async () => {
  if (!['win32', 'darwin'].includes(process.platform)) throw new Error('This desktop build requires Windows or macOS.');
  Menu.setApplicationMenu(null);
  browserSession = session.fromPartition('persist:ghost-web');
  const clipboardActive = wc => wc === active()?.view.webContents && win?.isVisible();
  browserSession.setPermissionCheckHandler((wc, permission, origin, details = {}) =>
    permission === 'clipboard-sanitized-write'
      ? canWriteClipboard(wc, details.requestingUrl || origin, details, clipboardActive)
      : microphone.check(wc, permission, origin, details));
  browserSession.setPermissionRequestHandler((wc, permission, callback, details = {}) => {
    if (permission === 'clipboard-sanitized-write') callback(canWriteClipboard(wc, details.requestingUrl, details, clipboardActive));
    else microphone.request(wc, permission, callback, details);
  });
  browserSession.on('will-download', (event) => {
    event.preventDefault(); notice = 'Downloads are disabled in this first version.'; publish();
  });
  win = new BrowserWindow({
    title: 'Ghost Browser', width: 1180, height: 800, minWidth: 760, minHeight: 520,
    show: false, skipTaskbar: true, alwaysOnTop: true, backgroundColor: '#101514', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  win.setContentProtection(true);
  win.setSkipTaskbar(true);
  if (!win.isContentProtected()) throw new Error('Windows capture exclusion could not be enabled.');
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.on('before-input-event', keyboard);
  win.on('resize', layout);
  win.on('always-on-top-changed', publish);
  win.on('show', keepOnTop);
  win.on('restore', keepOnTop);
  screenshotTool = createScreenshotTool({
    getMainWindow: () => win,
    onRestoreFocus: () => active()?.view.webContents.focus(),
    onStatus: message => { notice = message; publish(); },
    onBusy: publish
  });
  // A tray entry gives a recovery path even when the global shortcut is occupied.
  const pixels = Buffer.alloc(32 * 32 * 4);
  for (let y = 4; y < 29; y++) for (let x = 6; x < 26; x++) {
    const eye = y >= 12 && y <= 16 && ((x >= 11 && x <= 13) || (x >= 19 && x <= 21));
    const i = (y * 32 + x) * 4;
    pixels[i] = eye ? 20 : 205; pixels[i + 1] = eye ? 23 : 239; pixels[i + 2] = eye ? 16 : 184; pixels[i + 3] = 255;
  }
  tray = new Tray(nativeImage.createFromBitmap(pixels, { width: 32, height: 32 }));
  tray.setToolTip('Ghost Browser — click to show or hide');
  tray.on('click', toggleVisible);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show Ghost Browser', click: () => { screenshotTool.cancel(); win.show(); win.restore(); win.focus(); } },
    { label: 'Hide Ghost Browser', click: () => win.hide() },
    { label: 'Capture area (Ctrl+Shift+S)', click: () => { void screenshotTool.start(); } },
    { type: 'separator' }, { label: 'Quit', click: () => app.quit() }
  ]));
  win.on('closed', () => {
    screenshotTool.dispose();
    for (const tab of tabs) if (!tab.view.webContents.isDestroyed()) tab.view.webContents.close();
    tabs = []; win = null;
  });
  ipcMain.handle('command', (event, name, value) => {
    if (event.sender !== win?.webContents || event.senderFrame !== win.webContents.mainFrame || event.senderFrame.url !== SHELL) throw new Error('Untrusted sender');
    const wc = active()?.view.webContents;
    if (refreshing && !['state', 'hide'].includes(name)) return state();
    switch (name) {
      case 'glass': {
        appearance = glassSettings(typeof value === 'boolean' ? { ...appearance, enabled: value } : value);
        glass = appearance.enabled;
        win.setOpacity(1);
        win.setBackgroundColor(glass ? '#00000000' : '#101514');
        if (process.platform === 'win32') win.setBackgroundMaterial(glass ? 'acrylic' : 'none');
        if (process.platform === 'darwin') win.setVibrancy(glass ? 'under-window' : null);
        for (const tab of tabs) void applyPageGlass(tab);
        break;
      }
      case 'appearance-panel': appearancePanel = value === true; layout(); break;
      case 'copy': wc.focus(); wc.copy(); break;
      case 'state': return state();
      case 'navigate': {
        try { const target = resolveAddress(value); if (target) { notice = ''; wc.loadURL(target).catch(() => {}); } }
        catch (error) { notice = error.message; }
        break;
      }
      case 'new': createTab(); focusAddress(); break;
      case 'select': select(Number(value)); break;
      case 'close': closeTab(Number(value)); break;
      case 'back': if (wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack(); break;
      case 'forward': if (wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward(); break;
      case 'reload': return refreshSite();
      case 'home': wc.loadURL(HOME).catch(() => {}); break;
      case 'pin': {
        keepOnTop();
        break;
      }
      case 'hide': toggleVisible(); break;
      case 'screenshot': void screenshotTool.start(); break;
      case 'paste': wc.focus(); wc.paste(); break;
      case 'microphone-answer': microphone.respond(value?.id, value?.allow); break;
      case 'microphone-revoke': {
        const origin = originOf(wc.getURL());
        microphone.revoke(origin);
        // Reload all tabs for this origin to stop any existing audio tracks.
        for (const tab of tabs) if (originOf(tab.view.webContents.getURL()) === origin) tab.view.webContents.reload();
        break;
      }
      default: throw new Error('Unknown command');
    }
    publish();
  });
  shortcutReady = globalShortcut.register('CommandOrControl+Shift+Space', toggleVisible);
  screenshotShortcutReady = globalShortcut.register('CommandOrControl+Shift+S', () => { void screenshotTool.start(); });
  await win.loadFile(path.join(__dirname, 'shell.html'));
  createTab();
  // Let the compositor apply capture exclusion before showing any content.
  setTimeout(() => { if (win && !win.isDestroyed()) { win.show(); publish(); } }, 250);
}).catch(error => { console.error(error); app.exit(1); });
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => { globalShortcut.unregisterAll(); tray?.destroy(); });
