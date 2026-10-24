function ts() { return new Date().toISOString(); }
module.exports = {
  info: (...a) => console.log(`[${ts()}]`, ...a),
  warn: (...a) => console.warn(`[${ts()}]`, ...a),
  error: (...a) => console.error(`[${ts()}]`, ...a),
};