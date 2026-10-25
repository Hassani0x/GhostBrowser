const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveAddress, isWebURL } = require('../src/navigation');
test('website addresses and searches stay on web protocols', () => {
  assert.equal(resolveAddress('chatgpt.com'), 'https://chatgpt.com/');
  assert.equal(resolveAddress('https://example.com/a?q=two#b'), 'https://example.com/a?q=two#b');
  assert.equal(resolveAddress('localhost:3210/test'), 'http://localhost:3210/test');
  assert.equal(resolveAddress('two words'), 'https://www.google.com/search?q=two%20words');
  assert.equal(resolveAddress('  '), null);
});
test('native and executable address schemes are rejected', () => {
  for (const url of ['file:///C:/Windows/win.ini', 'javascript:alert(1)', 'data:text/html,hello', 'ms-settings:display', 'mailto:a@example.com']) {
    assert.throws(() => resolveAddress(url));
    assert.equal(isWebURL(url), false);
  }
});
