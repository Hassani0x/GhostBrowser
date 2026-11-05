const { originOf } = require('./microphone');

function canWriteClipboard(wc, requestingURL, details, isActive) {
  if (!wc || wc.isDestroyed() || !isActive(wc) || details.isMainFrame === false) return false;
  const origin = originOf(requestingURL);
  return !!origin && origin === originOf(wc.getURL());
}

module.exports = { canWriteClipboard };
