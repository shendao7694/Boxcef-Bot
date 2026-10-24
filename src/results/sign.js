module.exports = async ({ event, args, api, database, config }) => {
  const qq = String(event.user_id);
  const reply = (msg) => event.message_type === 'group'
    ? api.sendGroup(event.group_id, msg)
    : api.sendPrivate(event.user_id, msg);

  const today = database.today();
  if (database.getLastSign(qq) === today) {
    return reply('你今天已经签过到了，明天再来吧。');
  }

  const input = (args[0] || '').toUpperCase();
  const saved = database.getSignCode(qq);

  if (!saved) return reply('你还没有签到码，先发 /signc 获取。');
  if (input !== saved) return reply('签到码错误，请重新输入。');

  const { coinMin, coinMax } = config.get().sign;
  const gain = Math.floor(Math.random() * (coinMax - coinMin + 1)) + coinMin;

  database.deleteSignCode(qq);
  database.setLastSign(qq, today);
  const total = database.addCoin(qq, gain);
  return reply(`签到成功！获得 ${gain} 金币，当前共 ${total} 金币。`);
};