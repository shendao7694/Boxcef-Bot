const path = require('path');
const fs = require('fs');

const EMOJI_DIR = path.join(__dirname, '..', 'data', 'assets', 'emoji');

module.exports = async ({ event, api }) => {
  const files = fs.existsSync(EMOJI_DIR)
    ? fs.readdirSync(EMOJI_DIR).filter(f => /\.(png|jpg|jpeg|gif)$/i.test(f))
    : [];
  if (!files.length) {
    const msg = 'emoji 文件夹是空的。';
    return event.message_type === 'group'
      ? api.sendGroup(event.group_id, msg)
      : api.sendPrivate(event.user_id, msg);
  }
  const pick = path.join(EMOJI_DIR, files[Math.floor(Math.random() * files.length)]);
  return event.message_type === 'group'
    ? api.sendImageGroup(event.group_id, pick)
    : api.sendImagePrivate(event.user_id, pick);
};