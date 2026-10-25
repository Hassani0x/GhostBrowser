const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cropRectangle } = require('../src/screenshot-geometry');
test('maps CSS selection to physical pixels at 125% and 200% scaling', () => {
  const rect = { x: 100, y: 80, width: 200, height: 120 };
  assert.deepEqual(cropRectangle(rect, { width: 1536, height: 864 }, { width: 1920, height: 1080 }), { x: 125, y: 100, width: 250, height: 150 });
  assert.deepEqual(cropRectangle(rect, { width: 960, height: 540 }, { width: 1920, height: 1080 }), { x: 200, y: 160, width: 400, height: 240 });
});
test('uses actual capture dimensions, clamps monitor edges and rejects malformed selections', () => {
  assert.deepEqual(cropRectangle({ x: -10, y: 90, width: 120, height: 30 }, { width: 100, height: 100 }, { width: 200, height: 150 }), { x: 0, y: 135, width: 200, height: 15 });
  for (const rect of [null, { x: NaN, y: 0, width: 20, height: 20 }, { x: 0, y: 0, width: 1, height: 100 }, { x: 200, y: 200, width: 10, height: 10 }]) {
    assert.equal(cropRectangle(rect, { width: 100, height: 100 }, { width: 100, height: 100 }), null);
  }
});
