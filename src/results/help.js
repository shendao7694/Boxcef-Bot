module.exports = async ({ event, api }) => {
  const lines = [
    '可用指令：',
    '/sign <code>  签到（输入签到码领取金币）',
    '/signc  获取签到码（图片形式）',
    '/mc <ip>  查询 Minecraft 服务器状态',
    '/cat <名称>  对某个群成员喵喵叫',
    '/emoji  随机发送一张表情包',
    '/help  显示这条帮助',
    '/audio  来听音乐吧',
  ];
  const msg = lines.join('\n');
  return event.message_type === 'group'
    ? api.sendGroup(event.group_id, msg)
    : api.sendPrivate(event.user_id, msg);
};