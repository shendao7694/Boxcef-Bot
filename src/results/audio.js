const path = require('path');
const fs = require('fs');

const AUDIO_DIR = path.join(__dirname, '..', 'data', 'assets', 'audio');

module.exports = async ({ event, api }) => {
  const reply = (msg) => event.message_type === 'group'
    ? api.sendGroup(event.group_id, msg)
    : api.sendPrivate(event.user_id, msg);

  if (!fs.existsSync(AUDIO_DIR)) {
    return reply('audio 文件夹不存在');
  }

  const files = fs.readdirSync(AUDIO_DIR).filter(f => /\.(mp3|wav|silk|amr|m4a|ogg|flac)$/i.test(f));
  if (!files.length) {
    return reply('audio 文件夹是空的');
  }

  const pick = files[Math.floor(Math.random() * files.length)];
  const fullPath = path.join(AUDIO_DIR, pick);

  const msg = [
    { type: 'record', data: { file: fullPath } },
  ];

  if (event.message_type === 'group') {
    return api.sendGroup(event.group_id, msg);
  }
  return api.sendPrivate(event.user_id, msg);
};