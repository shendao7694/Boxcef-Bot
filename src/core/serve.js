const WebSocket = require('ws');
const config = require('./config');
const cmdPatch = require('./cmd-patch');

let ws = null;
let echoId = 0;

function connect() {
  const { wsUrl, token } = config.get().napcat;
  const url = token ? `${wsUrl}?access_token=${token}` : wsUrl;
  ws = new WebSocket(url);

  ws.on('open', () => console.log('[serve] connected to NapCat:', wsUrl));
  ws.on('message', (raw) => {
    let event;
    try { event = JSON.parse(raw.toString()); } catch { return; }

    if (event.post_type === 'message') {
      cmdPatch.handle(event, { sendGroup, sendPrivate, sendImageGroup, sendImagePrivate });
    } else if (event.post_type === 'request') {
      handleRequest(event);
    }
  });
  ws.on('close', () => {
    console.warn('[serve] disconnected, retry in 5s');
    setTimeout(connect, 5000);
  });
  ws.on('error', (err) => console.error('[serve] ws error:', err.message));
}

function handleRequest(event) {
  if (event.request_type !== 'group' || event.sub_type !== 'add') return;
  const flag = event.flag;
  const groupId = event.group_id;
  const userId = event.user_id;
  const comment = event.comment || '';

  console.log(`[serve] group invite: group=${groupId} user=${userId} comment=${comment}`);

  call('set_group_add_request', {
    flag,
    sub_type: 'add',
    approve: true,
  }).then(() => {
    console.log(`[serve] accepted invite to group ${groupId}`);
  }).catch((err) => {
    console.error(`[serve] accept invite failed: ${err.message}`);
  });
}

function call(action, params) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error('ws not open'));
  const echo = String(++echoId);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), 10000);
    const onMsg = (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.echo === echo) {
        clearTimeout(timer);
        ws.off('message', onMsg);
        resolve(msg);
      }
    };
    ws.on('message', onMsg);
    ws.send(JSON.stringify({ action, params, echo }));
  });
}

function sendGroup(groupId, message) {
  return call('send_group_msg', { group_id: groupId, message });
}
function sendPrivate(userId, message) {
  return call('send_private_msg', { user_id: userId, message });
}
function sendImageGroup(groupId, filePath) {
  return sendGroup(groupId, `[CQ:image,file=file://${filePath}]`);
}
function sendImagePrivate(userId, filePath) {
  return sendPrivate(userId, `[CQ:image,file=file://${filePath}]`);
}

module.exports = { connect, call, sendGroup, sendPrivate, sendImageGroup, sendImagePrivate };