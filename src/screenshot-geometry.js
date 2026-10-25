// Convert a renderer's CSS-pixel selection to the actual captured image pixels.
// Do not assume the image size equals display bounds or Windows scaling.
function cropRectangle(selection, viewport, image) {
  const values = [selection?.x, selection?.y, selection?.width, selection?.height,
    viewport?.width, viewport?.height, image?.width, image?.height];
  if (!values.every(Number.isFinite) || viewport.width <= 0 || viewport.height <= 0 || image.width <= 0 || image.height <= 0 || selection.width < 3 || selection.height < 3) return null;
  const clamp = (n, max) => Math.min(max, Math.max(0, n));
  const left = clamp(Math.floor(selection.x * image.width / viewport.width), image.width);
  const top = clamp(Math.floor(selection.y * image.height / viewport.height), image.height);
  const right = clamp(Math.ceil((selection.x + selection.width) * image.width / viewport.width), image.width);
  const bottom = clamp(Math.ceil((selection.y + selection.height) * image.height / viewport.height), image.height);
  return right > left && bottom > top ? { x: left, y: top, width: right - left, height: bottom - top } : null;
}
module.exports = { cropRectangle };
