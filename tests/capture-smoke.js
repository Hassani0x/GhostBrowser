const { app, screen } = require('electron');
const { captureDisplay } = require('../src/screenshot');
// Real API smoke check: discard pixels, do not save, inspect, or copy the image.
app.whenReady().then(async () => {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const image = await captureDisplay(display);
  if (image.isEmpty()) throw new Error('Empty desktop capture');
  console.log(JSON.stringify({ result: 'PASS', captureSize: image.getSize(), displaySize: display.bounds, scaleFactor: display.scaleFactor }));
  app.quit();
}).catch(error => { console.error(error.message); app.exit(1); });
