const config = require('./config');
const database = require('./database');
const fs = require('fs');
const path = require('path');

const results = {};
const resultsDir = path.join(__dirname, '..', 'results');

for (const file of fs.readdirSync(resultsDir)) {
  if (!file.endsWith('.js')) continue;
  const name = path.basename(file, '.js');
  results[name] = require(path.join(resultsDir, file));
}

function isAllowed(event) {
  const allowGroup = database.getSys('allowGroup', ['*']);
  const allowUser = database.getSys('allowUser', ['*']);

  if (event.message_type === 'group') {
    if (allowGroup.includes('*')) return true;
    return allowGroup.includes(String(event.group_id));
  }
  if (event.message_type === 'private') {
    if (allowUser.includes('*')) return true;
    return allowUser.includes(String(event.user_id));
  }
  return false;
}

function shouldReply(cmd) {
  const cfg = config.get().reply || {};
  if (cfg.enabled === false) return false;
  const blacklist = cfg.blacklist || [];
  return !blacklist.includes(cmd);
}

function buildMsg(event, payload, withReply) {
  const seg = [];
  if (withReply && event.message_id != null) {
    seg.push({ type: 'reply', data: { id: String(event.message_id) } });
  }
  if (Array.isArray(payload)) {
    seg.push(...payload);
  } else {
    seg.push({ type: 'text', data: { text: String(payload) } });
  }
  return seg;
}

function wrapApi(api, event, withReply) {
  return {
    sendGroup: (groupId, payload) => api.sendGroup(groupId, buildMsg(event, payload, withReply)),
    sendPrivate: (userId, payload) => api.sendPrivate(userId, buildMsg(event, payload, withReply)),
    sendImageGroup: (groupId, filePath) => api.sendGroup(groupId, buildMsg(event, [
      { type: 'image', data: { file: `file://${filePath}` } },
    ], withReply)),
    sendImagePrivate: (userId, filePath) => api.sendPrivate(userId, buildMsg(event, [
      { type: 'image', data: { file: `file://${filePath}` } },
    ], withReply)),
    raw: api,
  };
}

async function handle(event, api) {
  if (!isAllowed(event)) return;

  const raw = (event.raw_message || '').trim();
  if (!raw.startsWith('/')) return;

  const [cmd, ...args] = raw.slice(1).split(/\s+/);
  const handler = results[cmd];
  if (!handler) return;

  const withReply = handler.noReply ? false : shouldReply(cmd);
  const wrappedApi = wrapApi(api, event, withReply);

  try {
    await handler({ event, args, api: wrappedApi, database, config });
  } catch (err) {
    console.error(`[cmd:${cmd}]`, err);
    wrappedApi.sendGroup(event.group_id, `指令执行出错: ${err.message}`).catch(() => {});
  }
}

module.exports = { handle, results };