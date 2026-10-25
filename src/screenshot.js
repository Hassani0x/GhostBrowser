const { BrowserWindow, desktopCapturer, screen, clipboard, ClipboardItem, ipcMain } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { cropRectangle } = require('./screenshot-geometry');
const PICKER = pathToFileURL(path.join(__dirname, 'screenshot.html')).href;

async function captureDisplay(display) {
  const displays = screen.getAllDisplays();
  const sources = await desktopCapturer.getSources({ types: ['screen'], fetchWindowIcons: false,
    thumbnailSize: {
      width: Math.max(...displays.map(d => Math.ceil(d.bounds.width * d.scaleFactor))),
      height: Math.max(...displays.map(d => Math.ceil(d.bounds.height * d.scaleFactor)))
    }
  });
  const source = sources.find(item => item.display_id === String(display.id));
  if (!source || source.thumbnail.isEmpty()) throw new Error('The selected monitor could not be captured.');
  return source.thumbnail;
}

async function copyScreenshot(image) {
  await clipboard.write([new ClipboardItem({
    'image/png': new Blob([new Uint8Array(image.toPNG())], { type: 'image/png' })
  })]);
}

function createScreenshotTool({ getMainWindow, onStatus, onRestoreFocus = () => {}, onBusy = () => {}, capture = captureDisplay, copy = copyScreenshot }) {
  let job = null;
  function finish(current, message, restore = true) {
    if (job !== current) return;
    job = null;
    clearTimeout(current.timeout);
    current.image = null;
    if (current.window && !current.window.isDestroyed()) current.window.destroy();
    const main = getMainWindow();
    if (restore && main && !main.isDestroyed() && current.wasVisible) {
      if (current.wasFocused) { main.show(); main.focus(); onRestoreFocus(); }
      else main.showInactive();
    }
    onBusy(false);
    if (message) onStatus(message);
  }
  function authorized(event) {
    return job?.window && !job.window.isDestroyed() && event.sender === job.window.webContents &&
      event.senderFrame === job.window.webContents.mainFrame && event.senderFrame.url === PICKER;
  }
  ipcMain.handle('screenshot-image', event => {
    if (!authorized(event) || !job.image) throw new Error('Untrusted screenshot request');
    return job.image.toDataURL();
  });
  ipcMain.handle('screenshot-ready', event => {
    if (!authorized(event)) throw new Error('Untrusted screenshot request');
    const current = job;
    // Give DWM time to apply exclusion before the first visible frame.
    setTimeout(() => {
      if (job !== current || current.window.isDestroyed()) return;
      clearTimeout(current.timeout);
      current.window.show(); current.window.focus();
    }, 250);
  });
  ipcMain.handle('screenshot-select', async (event, selection) => {
    if (!authorized(event) || !job.image) throw new Error('Untrusted screenshot request');
    const current = job;
    const [width, height] = current.window.getContentSize();
    const rectangle = cropRectangle(selection, { width, height }, current.image.getSize());
    if (!rectangle) return false;
    try {
      if (current.copying) return false;
      current.copying = true;
      await copy(current.image.crop(rectangle));
      finish(current, `Screenshot copied (${rectangle.width} × ${rectangle.height}). Paste with Ctrl+V.`);
      return true;
    } catch {
      finish(current, 'Screenshot could not be copied. Try again.'); return false;
    }
  });
  ipcMain.handle('screenshot-cancel', event => {
    if (!authorized(event)) throw new Error('Untrusted screenshot request');
    finish(job, 'Screenshot cancelled. Clipboard unchanged.');
  });
  return {
    get busy() { return !!job; },
    async start() {
      if (job) return;
      const main = getMainWindow();
      if (!main || main.isDestroyed()) return;
      const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
      const current = { wasVisible: main.isVisible() && !main.isMinimized(), wasFocused: main.isFocused(), window: null, image: null };
      job = current;
      onBusy(true);
      main.hide();
      current.timeout = setTimeout(() => finish(current, 'Screenshot timed out. Try again.'), 20000);
      try {
        await new Promise(resolve => setTimeout(resolve, 200));
        if (job !== current) return;
        const image = await capture(display);
        if (job !== current) return;
        if (!image || image.isEmpty()) throw new Error('Empty capture');
        current.image = image;
        const overlay = new BrowserWindow({
          ...display.bounds, title: 'Gost screenshot selection', show: false,
          frame: false, skipTaskbar: true, alwaysOnTop: true, hasShadow: false,
          resizable: false, movable: false, minimizable: false, maximizable: false,
          fullscreenable: false, enableLargerThanScreen: true, backgroundColor: '#101714',
          webPreferences: { preload: path.join(__dirname, 'screenshot-preload.js'), sandbox: true, contextIsolation: true, nodeIntegration: false }
        });
        current.window = overlay;
        overlay.setContentProtection(true);
        if (!overlay.isContentProtected()) throw new Error('Capture exclusion unavailable');
        overlay.setSkipTaskbar(true);
        overlay.setBounds(display.bounds);
        overlay.setAlwaysOnTop(true, 'screen-saver');
        overlay.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        overlay.webContents.on('will-navigate', event => event.preventDefault());
        overlay.webContents.on('before-input-event', (event, input) => {
          if (input.type === 'keyDown' && input.key === 'Escape') { event.preventDefault(); finish(current, 'Screenshot cancelled. Clipboard unchanged.'); }
        });
        overlay.webContents.on('render-process-gone', () => finish(current, 'Screenshot selection closed. Try again.'));
        overlay.on('closed', () => finish(current, 'Screenshot cancelled. Clipboard unchanged.'));
        // A disconnected or rescaled display invalidates the coordinate mapping.
        const displayChanged = () => finish(current, 'Display changed. Start a new screenshot.');
        screen.on('display-removed', displayChanged);
        screen.on('display-metrics-changed', displayChanged);
        overlay.once('closed', () => {
          screen.removeListener('display-removed', displayChanged);
          screen.removeListener('display-metrics-changed', displayChanged);
        });
        await overlay.loadFile(path.join(__dirname, 'screenshot.html'));
      } catch {
        finish(current, 'Screenshot could not start. Check the monitor and try again.');
      }
    },
    cancel() { if (job) finish(job, 'Screenshot cancelled. Clipboard unchanged.'); },
    dispose() {
      if (job) finish(job, '', false);
      for (const channel of ['screenshot-image', 'screenshot-ready', 'screenshot-select', 'screenshot-cancel']) ipcMain.removeHandler(channel);
    }
  };
}
module.exports = { createScreenshotTool, captureDisplay, copyScreenshot };
