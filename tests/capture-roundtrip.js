const { app, BrowserWindow, screen, clipboard, ClipboardItem, nativeImage } = require('electron');
const { captureDisplay, copyScreenshot } = require('../src/screenshot');
const assert = require('node:assert/strict');
app.whenReady().then(async () => {
  const backup = await clipboard.read(), restore = [];
  for (const item of backup) {
    const data = {};
    for (const type of item.types) data[type] = await item.getType(type);
    restore.push(new ClipboardItem(data));
  }
  let target;
  try {
    const display = screen.getPrimaryDisplay();
    target = new BrowserWindow({ x: display.bounds.x + 100, y: display.bounds.y + 100, width: 600, height: 400, frame: false, show: false, backgroundColor: '#c83250', webPreferences: { sandbox: true } });
    await target.loadURL('data:text/html,<body style="margin:0;background:rgb(200,50,80)"><div style="position:absolute;left:300px;top:0;width:300px;height:400px;background:rgb(30,120,210)"></div>');
    target.show(); target.focus();
    await new Promise(resolve => setTimeout(resolve, 700));
    const screenshot = await captureDisplay(display);
    const bounds = target.getContentBounds(), size = screenshot.getSize();
    const sx = size.width / display.bounds.width, sy = size.height / display.bounds.height;
    const crop = screenshot.crop({ x: Math.round((bounds.x - display.bounds.x + 40) * sx), y: Math.round((bounds.y - display.bounds.y + 80) * sy), width: Math.round(500 * sx), height: Math.round(150 * sy) });
    const bitmap = crop.toBitmap(), width = crop.getSize().width;
    const at = x => [...bitmap.subarray((20 * width + x) * 4, (20 * width + x) * 4 + 4)];
    const left = at(20), right = at(width - 20);
    assert.ok(Math.abs(left[2] - 200) < 12 && Math.abs(left[1] - 50) < 12, 'Real capture did not contain red fixture');
    assert.ok(Math.abs(right[0] - 210) < 12 && Math.abs(right[1] - 120) < 12, 'Real capture did not contain blue fixture');
    await copyScreenshot(crop);
    const item = (await clipboard.read()).find(item => item.types.includes('image/png'));
    assert.ok(item, 'PNG missing');
    const blob = await item.getType('image/png');
    const pasted = nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer()));
    assert.deepEqual(pasted.getSize(), crop.getSize());
    assert.ok(pasted.toBitmap().equals(bitmap), 'Clipboard pixels differ from desktop crop');
    console.log('PASS: real desktop capture preserves red/blue app pixels; clipboard PNG matches the selected crop pixel-for-pixel (not white).');
  } finally {
    if (restore.length) await clipboard.write(restore); else clipboard.clear();
    target?.destroy();
  }
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
