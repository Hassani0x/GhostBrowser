function settings(value = {}) {
  const clamp = (n, fallback, min, max) => Number.isFinite(Number(n)) ? Math.max(min, Math.min(max, Number(n))) : fallback;
  return { enabled: value.enabled === true, tint: clamp(value.tint, 65, 15, 95), blur: clamp(value.blur, 24, 0, 60), websites: value.websites === true };
}
function websiteCSS(options) {
  if (!options.enabled || !options.websites) return '';
  return `html,body{background:transparent!important} body{color:#edf4ef!important} body :where(main,section,article,header,footer,aside,nav,div,pre,textarea,input){background-color:rgba(16,30,24,${options.tint / 100 * 0.35})!important;background-image:none!important} :where(pre,textarea,input){color:#edf4ef!important} a{color:#a9e7ff!important}`;
}
module.exports = { settings, websiteCSS };
