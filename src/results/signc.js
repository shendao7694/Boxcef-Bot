const path = require('path');
const fs = require('fs');
const { createCanvas } = require('canvas');

module.exports = async ({ event, api, database }) => {
  const qq = String(event.user_id);
  const reply = (msg) => event.message_type === 'group'
    ? api.sendGroup(event.group_id, msg)
    : api.sendPrivate(event.user_id, msg);

  const today = database.today();
  if (database.getLastSign(qq) === today) {
    return reply('你今天已经签过到了，明天再来吧。');
  }

  database.deleteSignCode(qq);

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];

  database.setSignCode(qq, code);

  const width = 300, height = 120;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `rgba(${Math.random()*255|0},${Math.random()*255|0},${Math.random()*255|0},0.5)`;
    ctx.beginPath();
    ctx.moveTo(Math.random()*width, Math.random()*height);
    ctx.lineTo(Math.random()*width, Math.random()*height);
    ctx.stroke();
  }

  ctx.font = 'bold 48px sans-serif';
  for (let i = 0; i < code.length; i++) {
    ctx.save();
    const x = 30 + i * 42;
    const y = 70 + (Math.random() - 0.5) * 20;
    ctx.translate(x, y);
    ctx.rotate((Math.random() - 0.5) * 0.6);
    ctx.fillStyle = `hsl(${Math.random()*360|0},60%,40%)`;
    ctx.fillText(code[i], 0, 0);
    ctx.restore();
  }

  const outDir = path.join(__dirname, '..', 'data', 'tmp');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `signc_${qq}_${Date.now()}.png`);
  fs.writeFileSync(file, canvas.toBuffer('image/png'));

  if (event.message_type === 'group') {
    await api.sendImageGroup(event.group_id, file);
  } else {
    await api.sendImagePrivate(event.user_id, file);
  }

  setTimeout(() => fs.unlink(file, () => {}), 60_000);
};