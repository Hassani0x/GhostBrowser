const desktop = document.getElementById('desktop');
const selection = document.getElementById('selection');
const shade = document.getElementById('shade');
const instructions = document.getElementById('instructions');
let start = null, rectangle = null, submitting = false, ready = false;
function point(event) { return { x: Math.max(0, Math.min(innerWidth, event.clientX)), y: Math.max(0, Math.min(innerHeight, event.clientY)) }; }
function update(event) {
  const end = point(event);
  rectangle = { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
  Object.assign(selection.style, { left: `${rectangle.x}px`, top: `${rectangle.y}px`, width: `${rectangle.width}px`, height: `${rectangle.height}px` });
}
async function submit(rect) {
  if (submitting || !ready) return;
  submitting = true;
  try { await window.screenshot.select(rect); }
  finally { submitting = false; }
}
document.getElementById('cancel').onclick = () => window.screenshot.cancel();
document.addEventListener('pointerdown', event => {
  if (!ready || submitting || event.button !== 0 || instructions.contains(event.target)) return;
  start = point(event); rectangle = null; selection.hidden = false; shade.hidden = true; instructions.hidden = true;
  document.body.setPointerCapture(event.pointerId); update(event);
});
document.addEventListener('pointermove', event => { if (start) update(event); });
document.addEventListener('pointerup', event => {
  if (!start || event.button !== 0) return;
  update(event); start = null;
  if (document.body.hasPointerCapture(event.pointerId)) document.body.releasePointerCapture(event.pointerId);
  if (rectangle.width >= 3 && rectangle.height >= 3) void submit(rectangle);
  else { selection.hidden = true; shade.hidden = false; instructions.hidden = false; }
});
document.addEventListener('pointercancel', () => { start = null; selection.hidden = true; shade.hidden = false; instructions.hidden = false; });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); void window.screenshot.cancel(); }
  if (event.key === 'Enter' && event.target.tagName !== 'BUTTON') { event.preventDefault(); void submit({ x: 0, y: 0, width: innerWidth, height: innerHeight }); }
});
window.screenshot.image().then(async data => {
  desktop.src = data;
  await desktop.decode(); ready = true;
  await window.screenshot.ready();
}).catch(() => window.screenshot.cancel());
