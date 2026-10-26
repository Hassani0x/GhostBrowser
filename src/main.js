const { app, BrowserWindow, WebContentsView, ipcMain, globalShortcut, session, Menu, Tray, nativeImage } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { isWebURL, resolveAddress } = require('./navigation');
const { createMicrophonePermissions, originOf } = require('./microphone');
const { createScreenshotTool } = require('./screenshot');

const smoke = process.env.GHOST_TEST_PROFILE;
if (smoke) app.setPath('userData', smoke);
const HOME = pathToFileURL(path.join(__dirname, 'home.html')).href;
const SHELL = pathToFileURL(path.join(__dirname, 'shell.html')).href;
const TOP = 132;
let win, tabs = [], activeId, nextId = 1, notice = '', shortcutReady = false;
let browserSession, tray, screenshotTool, screenshotShortcutReady = false;
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
    screenshotBusy: !!screenshotTool?.busy, screenshotShortcutReady
  };
}
function publish() {
  if (win && !win.isDestroyed()) win.webContents.send('state', state());
}
function layout() {
  if (!win || win.isDestroyed()) return;
  const [width, height] = win.getContentSize();
  const top = TOP + (microphone.prompt() ? 72 : 0);
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
  if (ctrl && ['l', 't', 'w', 'r', 'tab'].includes(key)) {
    event.preventDefault();
    if (key === 'l') focusAddress();
    if (key === 't') { createTab(); focusAddress(); }
    if (key === 'w') closeTab(activeId);
    if (key === 'r') active()?.view.webContents.reload();
    if (key === 'tab') {
      const i = tabs.findIndex(t => t.id === activeId);
      select(tabs[(i + (input.shift ? tabs.length - 1 : 1)) % tabs.length].id);
    }
  }
}
function createTab(url = HOME) {
  if (tabs.length >= 24) { notice = 'Close a tab before opening another (24 tab limit).'; publish(); return; }
  const view = new WebContentsView({ webPreferences: {
    session: browserSession, nodeIntegration: false, contextIsolation: true, sandbox: true,
    webSecurity: true, allowRunningInsecureContent: false, navigateOnDragDrop: false,
    disableDialogs: true, safeDialogs: true
  }});
  const tab = { id: nextId++, title: 'New tab', view };
  tabs.push(tab); win.contentView.addChildView(view);
  const wc = view.webContents;
  wc.on('context-menu', (_event, params) => {
    if (!params.isEditable) return;
    Menu.buildFromTemplate([
      { label: 'Paste', accelerator: 'Ctrl+V', click: () => { wc.focus(); wc.paste(); } },
      { role: 'copy' }, { role: 'cut' }, { role: 'selectAll' }
    ]).popup({ window: win });
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

app.whenReady().then(async () => {
  if (process.platform !== 'win32') throw new Error('This build requires Windows 11.');
  Menu.setApplicationMenu(null);
  browserSession = session.fromPartition('persist:ghost-web');
  browserSession.setPermissionCheckHandler(microphone.check);
  browserSession.setPermissionRequestHandler(microphone.request);
  browserSession.on('will-download', (event) => {
    event.preventDefault(); notice = 'Downloads are disabled in this first version.'; publish();
  });
  win = new BrowserWindow({
    title: 'Ghost Browser', width: 1180, height: 800, minWidth: 760, minHeight: 520,
    show: false, skipTaskbar: true, backgroundColor: '#101514', autoHideMenuBar: true,
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
    switch (name) {
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
      case 'reload': wc.reload(); break;
      case 'home': wc.loadURL(HOME).catch(() => {}); break;
      case 'pin': {
        const desired = !win.isAlwaysOnTop();
        win.setAlwaysOnTop(desired);
        notice = win.isAlwaysOnTop() === desired ? '' : 'Windows could not change pin-on-top. The browser is still usable and capture exclusion remains on.';
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
