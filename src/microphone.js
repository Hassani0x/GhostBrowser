function originOf(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) return url.origin;
  } catch {}
  return null;
}

// Grants last for this application session, and are scoped to a top-level origin.
function createMicrophonePermissions({ owns, changed }) {
  const allowed = new Set();
  let pending = null, serial = 0;
  function eligible(wc, origin) {
    return wc && !wc.isDestroyed() && owns(wc) && origin && originOf(wc.getURL()) === origin;
  }
  function finish(allow) {
    const request = pending;
    if (!request) return;
    pending = null;
    const granted = allow && eligible(request.wc, request.origin);
    if (granted) allowed.add(request.origin);
    for (const callback of request.callbacks) callback(!!granted);
    changed();
  }
  return {
    check(wc, permission, requestingOrigin, details = {}) {
      const origin = originOf(details.securityOrigin || requestingOrigin);
      return permission === 'media' && details.mediaType === 'audio' && eligible(wc, origin) && allowed.has(origin);
    },
    request(wc, permission, callback, details = {}) {
      const origin = originOf(details.securityOrigin || details.requestingUrl);
      if (permission !== 'media' || !details.mediaTypes?.length || details.mediaTypes.some(type => type !== 'audio') || !eligible(wc, origin)) {
        callback(false); return;
      }
      if (allowed.has(origin)) { callback(true); return; }
      if (pending) {
        if (pending.wc === wc && pending.origin === origin) pending.callbacks.push(callback);
        else callback(false);
        return;
      }
      pending = { id: ++serial, wc, origin, callbacks: [callback] };
      changed();
    },
    respond(id, allow) { if (pending?.id === id) finish(allow === true); },
    cancel(wc) { if (pending?.wc === wc) finish(false); },
    revoke(origin) { allowed.delete(origin); if (pending?.origin === origin) finish(false); changed(); },
    status(wc) { return !!wc && allowed.has(originOf(wc.getURL())); },
    prompt() { return pending ? { id: pending.id, origin: pending.origin } : null; }
  };
}
module.exports = { createMicrophonePermissions, originOf };
