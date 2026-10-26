const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { cropRectangle } = require('../src/screenshot-geometry');

async function main() {
  const results = path.resolve('test-results');
  await fs.mkdir(results, { recursive: true });
  const env = { ...process.env, GOST_TEST_PROFILE: await fs.mkdtemp(path.join(results, 'capture-profile-')) }; delete env.ELECTRON_RUN_AS_NODE;
  const application = await electron.launch({ args: [path.join(__dirname, 'screenshot-harness.js')], env });
  try {
    await application.firstWindow();
    await application.evaluate(async ({ app }) => {
      while (!app.screenshotTest) await new Promise(resolve => setTimeout(resolve, 20));
    });
    async function start() {
      const opening = application.waitForEvent('window');
      await application.evaluate(({ app }) => app.screenshotTest.tool.start());
      const overlay = await opening;
      await overlay.waitForFunction(() => document.getElementById('desktop').naturalWidth > 0);
      await application.evaluate(async ({ BrowserWindow }) => {
        const w = BrowserWindow.getAllWindows().find(w => w.getTitle() === 'Gost screenshot selection');
        while (!w.isVisible()) await new Promise(resolve => setTimeout(resolve, 20));
      });
      return overlay;
    }
    const overlay = await start();
    const windowData = await application.evaluate(({ app, BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows().find(w => w.getTitle() === 'Gost screenshot selection');
      return { protected: w.isContentProtected(), handle: w.getNativeWindowHandle().readBigUInt64LE().toString(), mainVisible: app.screenshotTest.main.isVisible(), size: w.getContentSize() };
    });
    assert.equal(windowData.mainVisible, false);
    assert.equal(windowData.protected, true);
    const script = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class ScreenshotAffinity { [DllImport("user32.dll")] public static extern bool GetWindowDisplayAffinity(IntPtr hWnd, out uint affinity); }'; [uint32]$affinity=0; if (-not [ScreenshotAffinity]::GetWindowDisplayAffinity([IntPtr]::new([long]${windowData.handle}),[ref]$affinity)) { throw 'Affinity check failed' }; Write-Output $affinity`;
    assert.equal(execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8', windowsHide: true }).trim(), '17');
    // Duplicate triggers must never create overlapping selection windows.
    await application.evaluate(({ app }) => app.screenshotTest.tool.start());
    assert.equal(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 2);
    await overlay.mouse.move(320, 350); await overlay.mouse.down(); await overlay.mouse.move(100, 180);
    const preview = await application.evaluate(async ({ BrowserWindow }) => (await BrowserWindow.getAllWindows().find(w => w.getTitle() === 'Gost screenshot selection').capturePage()).toPNG().toString('base64'));
    await fs.writeFile(path.join(results, 'screenshot-picker.png'), Buffer.from(preview, 'base64'));
    await overlay.mouse.up();
    await application.evaluate(async ({ app }) => { while (app.screenshotTest.tool.busy) await new Promise(resolve => setTimeout(resolve, 20)); });
    const expected = cropRectangle({ x: 100, y: 180, width: 220, height: 170 }, { width: windowData.size[0], height: windowData.size[1] }, { width: 800, height: 600 });
    const copied = await application.evaluate(({ app }, rect) => {
      const t = app.screenshotTest;
      return { count: t.copies.length, matches: t.copies[0]?.toPNG().equals(t.fixture.crop(rect).toPNG()), mainVisible: t.main.isVisible() };
    }, expected);
    assert.deepEqual(copied, { count: 1, matches: true, mainVisible: true });
    await application.evaluate(async ({ app, clipboard, ClipboardItem }) => {
      const backup = await clipboard.read();
      const restore = [];
      for (const item of backup) {
        const data = {};
        for (const type of item.types) data[type] = await item.getType(type);
        if (Object.keys(data).length) restore.push(new ClipboardItem(data));
      }
      try {
        await app.screenshotTest.copyScreenshot(app.screenshotTest.copies[0]);
        if (!await clipboard.has('image/png')) throw new Error('Screenshot missing from real clipboard');
      } finally {
        if (restore.length) await clipboard.write(restore); else clipboard.clear();
      }
    });
    console.log('PASS: production screenshot copy writes image/png to the real Windows clipboard.');
    const cancelled = await start();
    await cancelled.locator('#cancel').evaluate(button => button.click());
    await application.evaluate(async ({ app }) => { while (app.screenshotTest.tool.busy) await new Promise(resolve => setTimeout(resolve, 20)); });
    assert.equal(await application.evaluate(({ app }) => app.screenshotTest.copies.length), 1);
    await application.evaluate(({ app }) => app.screenshotTest.main.hide());
    await start();
    await application.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows().find(w => w.getTitle() === 'Gost screenshot selection');
      w.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
    });
    await application.evaluate(async ({ app }) => { while (app.screenshotTest.tool.busy) await new Promise(resolve => setTimeout(resolve, 20)); });
    assert.equal(await application.evaluate(({ app }) => app.screenshotTest.main.isVisible()), false);
    assert.equal(await application.evaluate(({ app }) => app.screenshotTest.copies.length), 1);
    await application.evaluate(async ({ app }) => { const t = app.screenshotTest; t.main.show(); t.failCapture = true; await t.tool.start(); });
    assert.equal(await application.evaluate(({ app }) => app.screenshotTest.main.isVisible()), true);
    assert.match(await application.evaluate(({ app }) => app.screenshotTest.messages.at(-1)), /could not start/);
    console.log('PASS: protected selection overlay (native 0x11), reverse drag, exact image crop, duplicate suppression, cancel, Escape, visibility restoration and capture-failure recovery. Selection uses a synthetic desktop; real clipboard write is checked separately.');
  } finally { await application.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
