// Isolated integration harness: never reads the desktop or touches the clipboard.
const { app, BrowserWindow, nativeImage } = require('electron');
const { createScreenshotTool, copyScreenshot } = require('../src/screenshot');
app.setPath('userData', process.env.GOST_TEST_PROFILE);
app.whenReady().then(async () => {
  const main = new BrowserWindow({ show: true, width: 800, height: 600, skipTaskbar: true });
  main.setContentProtection(true);
  await main.loadURL('data:text/html,<title>Screenshot test</title><h1>Screenshot test fixture</h1>');
  const pixels = Buffer.alloc(800 * 600 * 4);
  for (let y = 0; y < 600; y++) for (let x = 0; x < 800; x++) {
    const i = (y * 800 + x) * 4;
    pixels[i] = x % 256; pixels[i + 1] = y % 256; pixels[i + 2] = 100; pixels[i + 3] = 255;
  }
  const fixture = nativeImage.createFromBitmap(pixels, { width: 800, height: 600 });
  const state = { main, fixture, copyScreenshot, copies: [], messages: [], failCapture: false, captureDelay: 0, tool: null };
  state.tool = createScreenshotTool({
    getMainWindow: () => main,
    onStatus: message => state.messages.push(message),
    capture: async () => {
      await new Promise(resolve => setTimeout(resolve, state.captureDelay));
      if (state.failCapture) throw new Error('Synthetic capture error');
      return fixture;
    },
    copy: image => state.copies.push(image)
  });
  app.screenshotTest = state;
  main.on('closed', () => state.tool.dispose());
});
app.on('window-all-closed', () => app.quit());
