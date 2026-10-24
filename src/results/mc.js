const path = require('path');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

const MC_COLORS = {
  '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
  '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
  '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
  'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF',
  'g': '#DDD605', 'h': '#E3D8D5',
};

const FONT_STACK = '"Noto Sans CJK SC", "Noto Sans SC", "WenQuanYi Micro Hei", sans-serif';

function parseMotd(raw) {
  if (!raw) return [{ text: '', color: '#FFFFFF', bold: false, italic: false, underline: false, strike: false }];
  const segments = [];
  let state = { color: '#FFFFFF', bold: false, italic: false, underline: false, strike: false };
  let buffer = '';

  const flush = () => {
    if (buffer) segments.push({ text: buffer, ...state });
    buffer = '';
  };

  const pushStyle = (key, val) => { flush(); state = { ...state, [key]: val }; };

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '§' && i + 1 < raw.length) {
      const code = raw[i + 1].toLowerCase();
      i++;
      if (MC_COLORS[code]) {
        pushStyle('color', MC_COLORS[code]);
        state.bold = false; state.italic = false; state.underline = false; state.strike = false;
      } else if (code === 'l') pushStyle('bold', true);
      else if (code === 'o') pushStyle('italic', true);
      else if (code === 'n') pushStyle('underline', true);
      else if (code === 'm') pushStyle('strike', true);
      else if (code === 'r') {
        flush();
        state = { color: '#FFFFFF', bold: false, italic: false, underline: false, strike: false };
      }
    } else {
      buffer += ch;
    }
  }
  flush();
  return segments.length ? segments : [{ text: '', color: '#FFFFFF', bold: false, italic: false, underline: false, strike: false }];
}

function segmentsToPlain(segs) {
  return segs.map(s => s.text).join('').replace(/\n/g, ' ').trim();
}

async function fetchStatus(host) {
  const url = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(host)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function fontStr(seg, size) {
  const style = `${seg.italic ? 'italic ' : ''}${seg.bold ? 'bold ' : ''}`;
  return `${style}${size}px ${FONT_STACK}`;
}

function layoutSegments(ctx, segments, maxWidth, size) {
  const lines = [[]];
  let lineWidth = 0;

  for (const seg of segments) {
    const chars = seg.text.split('');
    let buffer = '';
    for (const ch of chars) {
      if (ch === '\n') {
        if (buffer) {
          lines[lines.length - 1].push({ ...seg, text: buffer });
          buffer = '';
        }
        lines.push([]);
        lineWidth = 0;
        continue;
      }
      ctx.font = fontStr(seg, size);
      const test = buffer + ch;
      const w = ctx.measureText(test).width;
      if (lineWidth + w > maxWidth && (buffer || lines[lines.length - 1].length)) {
        if (buffer) lines[lines.length - 1].push({ ...seg, text: buffer });
        lines.push([]);
        lineWidth = 0;
        buffer = ch;
        ctx.font = fontStr(seg, size);
        lineWidth = ctx.measureText(buffer).width;
      } else {
        buffer = test;
        lineWidth += ctx.measureText(ch).width;
      }
    }
    if (buffer) {
      lines[lines.length - 1].push({ ...seg, text: buffer });
      ctx.font = fontStr(seg, size);
      lineWidth += 0;
    }
  }
  return lines.filter(l => l.length);
}

function drawSegmentsLine(ctx, segments, x, y, size) {
  let cursor = x;
  for (const seg of segments) {
    ctx.font = fontStr(seg, size);
    ctx.fillStyle = seg.color;
    ctx.fillText(seg.text, cursor, y);
    const w = ctx.measureText(seg.text).width;
    if (seg.underline) {
      ctx.fillRect(cursor, y + 3, w, 1.5);
    }
    if (seg.strike) {
      ctx.fillRect(cursor, y - size / 3, w, 1.5);
    }
    cursor += w;
  }
}

module.exports = async ({ event, args, api }) => {
  const reply = (msg) => event.message_type === 'group'
    ? api.sendGroup(event.group_id, msg)
    : api.sendPrivate(event.user_id, msg);

  const host = (args[0] || '').trim();
  if (!host) return reply('用法：/mc <ip[:端口]>');

  let data;
  try {
    data = await fetchStatus(host);
  } catch (err) {
    return reply(`查询失败：${err.message}`);
  }

  const online = data.online;
  const motdRaw = data.motd?.raw || data.motd?.clean || '';
  const motdSegments = parseMotd(motdRaw);
  const motdPlain = segmentsToPlain(motdSegments);
  const version = data.version?.name_clean || data.version?.name_raw || '未知';
  const protocol = data.version?.protocol ?? '-';
  const playersOnline = data.players?.online ?? 0;
  const playersMax = data.players?.max ?? 0;
  const list = (data.players?.list || []).map(p => p.name_clean || p.name_raw).filter(Boolean);
  const icon = data.icon || null;

  const W = 720;
  const H = 470;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#101014';
  ctx.fillRect(0, 0, W, H);

  const pad = 28;
  const headerH = 150;

  if (icon && icon.startsWith('data:image')) {
    try {
      const img = await loadImage(icon);
      ctx.drawImage(img, pad, pad, 96, 96);
      ctx.strokeStyle = '#2a2a32';
      ctx.lineWidth = 2;
      ctx.strokeRect(pad, pad, 96, 96);
    } catch {}
  }

  const textX = pad + 120;

  ctx.fillStyle = online ? '#4ade80' : '#f87171';
  ctx.beginPath();
  ctx.arc(textX + 6, pad + 12, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f0f0f5';
  ctx.font = `bold 22px ${FONT_STACK}`;
  const hostText = host.length > 40 ? host.slice(0, 39) + '…' : host;
  ctx.fillText(hostText, textX + 22, pad + 20);

  ctx.fillStyle = '#a0a0aa';
  ctx.font = `14px ${FONT_STACK}`;
  ctx.fillText(online ? '在线' : '离线', textX, pad + 48);

  ctx.fillStyle = '#a0a0aa';
  ctx.fillText(`版本 ${version}  ·  协议 ${protocol}`, textX, pad + 70);

  ctx.fillStyle = '#f0f0f5';
  ctx.font = `bold 16px ${FONT_STACK}`;
  ctx.fillText(`玩家 ${playersOnline} / ${playersMax}`, textX, pad + 100);

  const barX = textX;
  const barY = pad + 112;
  const barW = W - barX - pad;
  const barH = 6;
  ctx.fillStyle = '#2a2a32';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = '#4ade80';
  const ratio = playersMax > 0 ? Math.min(playersOnline / playersMax, 1) : 0;
  ctx.fillRect(barX, barY, barW * ratio, barH);

  ctx.fillStyle = '#2a2a32';
  ctx.fillRect(pad, headerH, W - pad * 2, 1);

  let y = headerH + 28;
  const lineH = 24;
  const colW = W - pad * 2;

  ctx.fillStyle = '#70707a';
  ctx.font = `12px ${FONT_STACK}`;
  ctx.fillText('MOTD', pad, y);
  y += 22;

  const motdLines = layoutSegments(ctx, motdSegments, colW, 15);
  const motdDraw = motdLines.slice(0, 3);
  for (const line of motdDraw) {
    drawSegmentsLine(ctx, line, pad, y, 15);
    y += lineH;
  }
  if (!motdDraw.length) {
    ctx.fillStyle = '#50505a';
    ctx.font = `15px ${FONT_STACK}`;
    ctx.fillText('（无）', pad, y);
    y += lineH;
  }
  y += 12;

  ctx.fillStyle = '#70707a';
  ctx.font = `12px ${FONT_STACK}`;
  ctx.fillText('在线玩家', pad, y);
  y += 24;

  if (!list.length) {
    ctx.fillStyle = '#50505a';
    ctx.font = `14px ${FONT_STACK}`;
    ctx.fillText('（无）', pad, y);
  } else {
    ctx.fillStyle = '#e6e6eb';
    ctx.font = `14px ${FONT_STACK}`;
    const cols = 3;
    const colW2 = colW / cols;
    list.slice(0, 18).forEach((name, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const display = name.length > 20 ? name.slice(0, 19) + '…' : name;
      ctx.fillText(display, pad + col * colW2, y + row * 22);
    });
  }

  ctx.fillStyle = '#40404a';
  ctx.font = `11px ${FONT_STACK}`;
  const ts = new Date().toLocaleString('zh-CN', { hour12: false });
  ctx.fillText(`查询时间 ${ts}`, pad, H - 16);

  const outDir = path.join(__dirname, '..', 'data', 'tmp');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `mc_${Date.now()}.png`);
  fs.writeFileSync(file, canvas.toBuffer('image/png'));

  if (event.message_type === 'group') {
    await api.sendImageGroup(event.group_id, file);
  } else {
    await api.sendImagePrivate(event.user_id, file);
  }

  setTimeout(() => fs.unlink(file, () => {}), 60_000);
};