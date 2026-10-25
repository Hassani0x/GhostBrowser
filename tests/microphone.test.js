const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createMicrophonePermissions } = require('../src/microphone');
test('microphone grants cannot cross origins or grant camera / screen access', () => {
  let url = 'https://chatgpt.com/';
  const wc = { getURL: () => url, isDestroyed: () => false };
  const mic = createMicrophonePermissions({ owns: candidate => candidate === wc, changed() {} });
  const details = { securityOrigin: 'https://chatgpt.com', mediaTypes: ['audio'] };
  let result;
  mic.request(wc, 'media', value => { result = value; }, details);
  assert.equal(result, undefined);
  mic.respond(mic.prompt().id, true);
  assert.equal(result, true);
  assert.equal(mic.check(wc, 'media', details.securityOrigin, { mediaType: 'audio' }), true);
  assert.equal(mic.check(wc, 'media', details.securityOrigin, { mediaType: 'video' }), false);
  assert.equal(mic.check(wc, 'media', 'https://evil.example', { mediaType: 'audio' }), false);
  for (const [permission, mediaTypes] of [['media', ['audio', 'video']], ['display-capture', ['audio']], ['media', []]]) {
    mic.request(wc, permission, value => { result = value; }, { ...details, mediaTypes });
    assert.equal(result, false);
  }
  url = 'https://different.example';
  assert.equal(mic.check(wc, 'media', details.securityOrigin, { mediaType: 'audio' }), false);
});
test('navigation and stale prompt responses cannot grant permission', () => {
  const wc = { getURL: () => 'https://example.com', isDestroyed: () => false };
  const mic = createMicrophonePermissions({ owns: () => true, changed() {} });
  let result;
  mic.request(wc, 'media', value => { result = value; }, { securityOrigin: 'https://example.com', mediaTypes: ['audio'] });
  const id = mic.prompt().id;
  mic.cancel(wc); mic.respond(id, true);
  assert.equal(result, false);
  assert.equal(mic.status(wc), false);
});
