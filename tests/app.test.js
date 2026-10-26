const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');

async function main() {
  const root = path.resolve(__dirname, '..');
  const results = path.join(root, 'test-results');
  await fs.mkdir(results, { recursive: true });
  const profile = await fs.mkdtemp(path.join(results, 'profile-'));
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<title>${req.url === '/next' ? 'Next page' : 'Browser fixture'}</title><h1>Local test page</h1><a href="/next">Next</a><a href="/popup" target="_blank">Popup</a><a href="file:///C:/Windows/win.ini">Blocked file</a>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  let application;
  try {
    const env = { ...process.env, GOST_TEST_PROFILE: profile }; delete env.ELECTRON_RUN_AS_NODE;
    application = await electron.launch({ executablePath: process.env.GOST_TEST_EXECUTABLE, args: [...(process.env.GOST_TEST_EXECUTABLE ? [] : [root]), '--use-fake-device-for-media-stream'], env });
    const shell = await application.firstWindow();
    await shell.waitForFunction(() => document.querySelector('#protection')?.textContent === 'Capture exclusion on');
    const native = await application.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0];
      return { protected: w.isContentProtected(), handle: w.getNativeWindowHandle().readBigUInt64LE().toString() };
    });
    assert.equal(native.protected, true);
    const script = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class GostAffinity { [DllImport("user32.dll", SetLastError=true)] public static extern bool GetWindowDisplayAffinity(IntPtr hWnd, out uint affinity); }'; [uint32]$affinity=0; if (-not [GostAffinity]::GetWindowDisplayAffinity([IntPtr]::new([long]${native.handle}),[ref]$affinity)) { throw 'GetWindowDisplayAffinity failed' }; Write-Output $affinity`;
    assert.equal(execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8', windowsHide: true }).trim(), '17');
    console.log('PASS: Windows reports WDA_EXCLUDEFROMCAPTURE (0x11).');
    const preview = await application.evaluate(async ({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0];
      await new Promise(resolve => setTimeout(resolve, 500));
      const image = await w.capturePage();
      return image.toPNG().toString('base64');
    });
    await fs.writeFile(path.join(results, 'preview.png'), Buffer.from(preview, 'base64'));
    const homePreview = await application.evaluate(async ({ BrowserWindow }) => {
      const view = BrowserWindow.getAllWindows()[0].contentView.children.find(v => v.webContents?.getURL().endsWith('home.html'));
      return (await view.webContents.capturePage()).toPNG().toString('base64');
    });
    await fs.writeFile(path.join(results, 'home.png'), Buffer.from(homePreview, 'base64'));
    await shell.locator('#address').fill(url);
    await shell.locator('#address-form').evaluate(form => form.requestSubmit());
    await shell.waitForFunction(() => document.querySelector('.tab-select')?.textContent === 'Browser fixture');
    const webId = await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].contentView.children.find(v => v.webContents?.getURL().startsWith('http')).webContents.id);
    const runWeb = (script) => application.evaluate(({ webContents }, { id, script }) => webContents.fromId(id).executeJavaScript(script, true), { id: webId, script });
    await shell.waitForFunction(async () => !(await window.gost.command('state')).tabs[0].loading);
    assert.equal(await runWeb('typeof require'), 'undefined');
    assert.equal(await runWeb('typeof window.gost'), 'undefined');
    // Exercise real Windows image clipboard -> native Chromium paste event.
    await application.evaluate(async ({ app, clipboard, nativeImage, ClipboardItem }) => {
      app.clipboardBackup = await clipboard.read();
      const png = nativeImage.createFromBitmap(Buffer.alloc(16 * 16 * 4, 255), { width: 16, height: 16 }).toPNG();
      await clipboard.write([new ClipboardItem({ 'image/png': new Blob([new Uint8Array(png)], {type:'image/png'}) })]);
    });
    try {
      await runWeb(`window.pasteResults=[]; const field=document.createElement('div'); field.id='paste-target'; field.contentEditable='true'; document.body.append(field); field.addEventListener('paste',e=>{e.preventDefault();window.pasteResults.push([...e.clipboardData.files].map(f=>({type:f.type,size:f.size})));}); field.focus();`);
      await shell.evaluate(() => window.gost.command('paste'));
      const pasteResults = await runWeb('window.pasteResults');
      assert.equal(pasteResults[0]?.[0]?.type, 'image/png');
      assert.ok(pasteResults[0][0].size > 0);
      await application.evaluate(({ webContents }, id) => {
        const wc = webContents.fromId(id); wc.focus();
        wc.sendInputEvent({ type: 'keyDown', keyCode: 'V', modifiers: ['control'] });
        wc.sendInputEvent({ type: 'keyUp', keyCode: 'V', modifiers: ['control'] });
      }, webId);
      await application.evaluate(async ({ webContents }, id) => {
        const wc = webContents.fromId(id), deadline = Date.now() + 3000;
        while (await wc.executeJavaScript('window.pasteResults.length') < 2 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
      }, webId);
      assert.equal((await runWeb('window.pasteResults'))[1]?.[0]?.type, 'image/png');
      console.log('PASS: real Windows image clipboard pastes as PNG through Paste control and Ctrl+V into a sandboxed website.');
    } finally {
      await application.evaluate(async ({ app, clipboard, ClipboardItem }) => {
        if (app.clipboardBackup.length) {
          const items = [];
          for (const item of app.clipboardBackup) {
            const data = {};
            for (const type of item.types) data[type] = await item.getType(type);
            if (Object.keys(data).length) items.push(new ClipboardItem(data));
          }
          if (items.length) await clipboard.write(items);
          else clipboard.clear();
        }
        else clipboard.clear();
        delete app.clipboardBackup;
      });
    }
    const requestAudio = () => runWeb(`window.micResult = 'pending'; navigator.mediaDevices.getUserMedia({audio:true}).then(stream => { window.testStream = stream; window.micResult = 'allowed'; }).catch(error => window.micResult = error.name); void 0;`);
    const micResult = () => application.evaluate(({ webContents }, id) => webContents.fromId(id).executeJavaScript(`window.micResult`), webId);
    await requestAudio();
    await shell.waitForFunction(() => !document.querySelector('#microphone-prompt').hidden);
    assert.equal(await shell.locator('#microphone-origin').textContent(), url);
    await shell.locator('#microphone-block').evaluate(button => button.click());
    await shell.waitForFunction(() => document.querySelector('#microphone-prompt').hidden);
    assert.equal(await micResult(), 'NotAllowedError');
    await requestAudio();
    await shell.waitForFunction(() => !document.querySelector('#microphone-prompt').hidden);
    const promptImage = await application.evaluate(async ({ BrowserWindow }) => (await BrowserWindow.getAllWindows()[0].capturePage()).toPNG().toString('base64'));
    await fs.writeFile(path.join(results, 'microphone-prompt.png'), Buffer.from(promptImage, 'base64'));
    await shell.locator('#microphone-allow').evaluate(button => button.click());
    await shell.waitForFunction(() => !document.querySelector('#microphone-revoke').hidden);
    await application.evaluate(async ({ webContents }, id) => {
      const wc = webContents.fromId(id), end = Date.now() + 5000;
      while (await wc.executeJavaScript('window.micResult') === 'pending' && Date.now() < end) await new Promise(resolve => setTimeout(resolve, 25));
    }, webId);
    assert.equal(await micResult(), 'allowed');
    assert.equal(await runWeb(`navigator.mediaDevices.getUserMedia({video:true}).then(s=>{s.getTracks().forEach(t=>t.stop());return 'allowed'}).catch(e=>e.name)`), 'NotAllowedError');
    await shell.locator('#microphone-revoke').evaluate(button => button.click());
    await shell.waitForFunction(() => document.querySelector('#microphone-revoke').hidden);
    await shell.waitForFunction(async () => !(await window.gost.command('state')).tabs[0].loading);
    await requestAudio();
    await shell.waitForFunction(() => !document.querySelector('#microphone-prompt').hidden);
    await shell.locator('#microphone-block').evaluate(button => button.click());
    console.log('PASS: microphone prompt, block, allow with fake audio, revoke, re-prompt and camera denial.');
    await runWeb(`document.querySelector('a').click()`);
    await shell.waitForFunction(() => document.querySelector('.tab-select')?.textContent === 'Next page');
    await shell.waitForFunction(async () => !(await window.gost.command('state')).tabs[0].loading);
    await shell.locator('#back').evaluate(button => button.click());
    await shell.waitForFunction(() => document.querySelector('.tab-select')?.textContent === 'Browser fixture');
    await runWeb(`document.querySelector('[target]').click()`);
    await shell.waitForFunction(() => document.querySelectorAll('.tab').length === 2);
    assert.equal(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 1);
    await shell.locator('.tab-close').last().evaluate(button => button.click());
    await shell.waitForFunction(() => document.querySelectorAll('.tab').length === 1);
    await shell.evaluate(() => window.gost.command('pin'));
    const pinState = await shell.evaluate(() => window.gost.command('state'));
    assert.equal(pinState.pinned, await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isAlwaysOnTop()));
    if (pinState.pinned) await shell.evaluate(() => window.gost.command('pin'));
    else {
      assert.match(pinState.notice, /Windows could not change pin-on-top/);
      console.log('LIMITATION: Windows refused pin-on-top; the UI reports the failure.');
    }
    await shell.locator('#address').fill('file:///C:/Windows/win.ini');
    await shell.locator('#address-form').evaluate(form => form.requestSubmit());
    await shell.waitForFunction(() => document.querySelector('#notice').textContent.includes('Only http'));
    const shortcut = key => application.evaluate(({ BrowserWindow }, key) => {
      const wc = BrowserWindow.getAllWindows()[0].webContents;
      wc.focus();
      wc.sendInputEvent({ type: 'keyDown', keyCode: key, modifiers: ['control'] });
      wc.sendInputEvent({ type: 'keyUp', keyCode: key, modifiers: ['control'] });
    }, key);
    await shortcut('T');
    await shell.waitForFunction(() => document.querySelectorAll('.tab').length === 2);
    await shortcut('W');
    await shell.waitForFunction(() => document.querySelectorAll('.tab').length === 1);
    await shell.locator('#home').evaluate(button => button.click());
    await shell.waitForFunction(() => document.querySelector('.tab-select').textContent === 'New tab');
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(760, 520));
    assert.equal(await shell.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await shell.locator('#hide').evaluate(button => button.click());
    await application.evaluate(async ({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0];
      const deadline = Date.now() + 3000;
      while (w.isVisible() && !w.isMinimized() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    });
    assert.equal(await application.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; return !w.isVisible() || w.isMinimized(); }), true);
    console.log('PASS: navigation, back, protected pop-up tabs, close, shortcuts, pin status reporting, hide, minimum width, scheme blocking and renderer isolation.');
    await fs.writeFile(path.join(results, 'verification.json'), JSON.stringify({ date: new Date().toISOString(), windowsAffinity: '0x11', appChecks: 'passed', pinSupported: pinState.pinned, microphoneDevice: 'simulated', meetParticipantCheck: 'NOT RUN' }, null, 2));
  } catch (error) {
    if (application) console.log('Failure state:', await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map(w => w.contentView.children.map(v => v.webContents ? ({ url: v.webContents.getURL(), title: v.webContents.getTitle(), loading: v.webContents.isLoading(), history: v.webContents.navigationHistory.getAllEntries() }) : {}))));
    throw error;
  } finally {
    if (application) await application.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
