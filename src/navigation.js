function isWebURL(value) {
  try { return ['https:', 'http:'].includes(new URL(value).protocol); }
  catch { return false; }
}

function resolveAddress(value) {
  const input = String(value || '').trim();
  if (!input) return null;
  if (isWebURL(input)) return new URL(input).href;
  if (/^[a-z][a-z\d+.-]*:/i.test(input) && !/^[\w.-]+:\d+(?:\/|$)/.test(input)) {
    throw new Error('Only http and https websites can open here.');
  }
  if (!/\s/.test(input) && /^(localhost|[\w-]+(?:\.[\w-]+)+)(:\d+)?(?:[/?#]|$)/i.test(input)) {
    return new URL(`${/^localhost(?::|\/|$)/i.test(input) ? 'http' : 'https'}://${input}`).href;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
}
module.exports = { isWebURL, resolveAddress };
