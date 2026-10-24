module.exports = async ({ event, args, api }) => {
  let targetQQ = null;
  let targetName = null;

  const segments = Array.isArray(event.message) ? event.message : [];

  for (const seg of segments) {
    if (seg.type === 'at' && String(seg.data.qq) !== 'all') {
      targetQQ = String(seg.data.qq);
      targetName = seg.data.name || null;
    }
  }

  if (!targetQQ && args.length) {
    const name = args.join(' ').trim();
    if (/^\d{5,12}$/.test(name)) {
      targetQQ = name;
    } else {
      targetName = name;
    }
  }

  if (!targetQQ && !targetName) {
    return api.sendGroup(event.group_id, '用法：/cat @某人 或 /cat 名称');
  }

  const msg = [];
  if (targetQQ) {
    msg.push({ type: 'at', data: { qq: targetQQ } });
  } else {
    msg.push({ type: 'text', data: { text: targetName } });
  }
  msg.push({ type: 'text', data: { text: ' 我喜欢你喵~' } });

  return api.sendGroup(event.group_id, msg);
};