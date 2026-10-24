const $ = (id) => document.getElementById(id);
let PWD = '';

function headers(json = false) {
  const h = { 'x-manager-password': PWD };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function api(path, opts = {}) {
  const isJson = opts.body && typeof opts.body === 'string';
  const res = await fetch(path, {
    ...opts,
    headers: { ...headers(isJson), ...(opts.headers || {}) },
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 1800);
}

function confirmModal(title, body) {
  return new Promise(resolve => {
    $('modal-title').textContent = title;
    $('modal-body').textContent = body || '';
    $('modal').hidden = false;
    const cleanup = () => {
      $('modal').hidden = true;
      $('modal-ok').onclick = null;
      $('modal-cancel').onclick = null;
    };
    $('modal-ok').onclick = () => { cleanup(); resolve(true); };
    $('modal-cancel').onclick = () => { cleanup(); resolve(false); };
  });
}

$('loginBtn').onclick = doLogin;
$('pwd').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  const pwd = $('pwd').value;
  if (!pwd) { $('loginMsg').textContent = '请输入密码'; return; }
  $('loginMsg').textContent = '';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || '登录失败');
    PWD = pwd;
    $('loginView').hidden = true;
    $('appView').hidden = false;
    switchTab('sign');
  } catch (e) {
    $('loginMsg').textContent = e.message;
  }
}

$('logoutBtn').onclick = () => {
  PWD = '';
  $('pwd').value = '';
  $('appView').hidden = true;
  $('loginView').hidden = false;
};

const LOADERS = {
  sign: loadSign,
  signed: loadSigned,
  emoji: loadEmoji,
  user: loadUser,
  allow: loadAllow,
  config: loadConfig,
};

function switchTab(name) {
  Object.keys(LOADERS).forEach(t => { $(`pane-${t}`).hidden = t !== name; });
  document.querySelectorAll('.pill-nav button').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === name));
  LOADERS[name]?.().catch(e => toast(e.message));
}
document.querySelectorAll('.pill-nav button').forEach(b =>
  b.onclick = () => switchTab(b.dataset.tab));

async function loadSign() {
  const rows = await api('/api/sign');
  $('sign-count').textContent = rows.length;
  const list = $('sign-list');
  list.innerHTML = '';
  if (!rows.length) {
    list.innerHTML = '<div class="empty">暂无签到码</div>';
    return;
  }
  rows.forEach(r => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <span class="key">${r.qq}</span>
      <span class="val">${r.code || '—'} · ${r.last || '未签到'}</span>
    `;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const del = document.createElement('button');
    del.textContent = '✕';
    del.title = '清空签到码';
    del.onclick = async () => {
      if (!await confirmModal('清空签到码', `确定清空 ${r.qq} 的签到码？`)) return;
      await api('/api/sign/' + r.qq, { method: 'DELETE' });
      toast('已清空');
      loadSign();
    };
    actions.appendChild(del);
    row.appendChild(actions);
    list.appendChild(row);
  });
}
$('sign-set').onclick = async () => {
  const qq = $('sign-qq').value.trim();
  const code = $('sign-code').value.trim();
  if (!qq) return toast('请填 QQ');
  await api('/api/sign', { method: 'POST', body: JSON.stringify({ qq, code }) });
  $('sign-qq').value = '';
  $('sign-code').value = '';
  toast('已保存');
  loadSign();
};

async function loadSigned() {
  const data = await api('/api/user/signed');
  $('signed-date').textContent = data.date;
  const list = $('signed-list');
  list.innerHTML = '';
  if (!data.list.length) {
    list.innerHTML = '<div class="empty">今天还没有人签到</div>';
    return;
  }
  data.list.forEach(r => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `<span class="key">${r.qq}</span><span class="val">${r.date}</span>`;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const del = document.createElement('button');
    del.textContent = '✕';
    del.title = '删除签到记录';
    del.onclick = async () => {
      if (!await confirmModal('删除签到记录', `删除 ${r.qq} 的签到记录？`)) return;
      await api('/api/sign/last/' + r.qq, { method: 'DELETE' });
      toast('已删除');
      loadSigned();
    };
    actions.appendChild(del);
    row.appendChild(actions);
    list.appendChild(row);
  });
}

$('emoji-file').onchange = () => {
  const f = $('emoji-file').files[0];
  $('emoji-filename').textContent = f ? f.name : '';
};

async function loadEmoji() {
  const files = await api('/api/emoji');
  $('emoji-count').textContent = files.length;
  const grid = $('emoji-grid');
  grid.innerHTML = '';
  if (!files.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1">还没有 emoji</div>';
    return;
  }
  files.forEach(name => {
    const card = document.createElement('div');
    card.className = 'emoji-card';
    const img = document.createElement('img');
    fetch(`/api/emoji/raw/${encodeURIComponent(name)}`, { headers: headers() })
      .then(r => r.blob())
      .then(b => img.src = URL.createObjectURL(b));
    const del = document.createElement('button');
    del.className = 'del';
    del.textContent = '✕';
    del.onclick = async () => {
      if (!await confirmModal('删除 Emoji', `删除 ${name}?`)) return;
      await api('/api/emoji/' + encodeURIComponent(name), { method: 'DELETE' });
      toast('已删除');
      loadEmoji();
    };
    card.appendChild(img);
    card.appendChild(del);
    grid.appendChild(card);
  });
}
$('emoji-upload').onclick = async () => {
  const file = $('emoji-file').files[0];
  if (!file) return toast('选择文件');
  const fd = new FormData();
  fd.append('file', file);
  await api('/api/emoji', { method: 'POST', body: fd });
  $('emoji-file').value = '';
  $('emoji-filename').textContent = '';
  toast('上传成功');
  loadEmoji();
};

async function loadUser() {
  const rows = await api('/api/user');
  $('user-count').textContent = rows.length;
  const list = $('user-list');
  list.innerHTML = '';
  if (!rows.length) {
    list.innerHTML = '<div class="empty">暂无用户</div>';
    return;
  }
  rows.forEach(r => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `<span class="key">${r.qq}</span><span class="val">${r.coin} 金币</span>`;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const del = document.createElement('button');
    del.textContent = '✕';
    del.title = '删除用户';
    del.onclick = async () => {
      if (!await confirmModal('删除用户', `删除 ${r.qq} 的全部数据？`)) return;
      await api('/api/user/' + r.qq, { method: 'DELETE' });
      toast('已删除');
      loadUser();
    };
    actions.appendChild(del);
    row.appendChild(actions);
    list.appendChild(row);
  });
}
$('user-set').onclick = async () => {
  const qq = $('user-qq').value.trim();
  const coin = Number($('user-coin').value);
  if (!qq || isNaN(coin)) return toast('填 QQ 和金币');
  await api('/api/user', { method: 'POST', body: JSON.stringify({ qq, coin }) });
  toast('已设置');
  loadUser();
};
$('user-adjust').onclick = async () => {
  const qq = $('user-qq').value.trim();
  const delta = Number($('user-delta').value);
  if (!qq || isNaN(delta)) return toast('填 QQ 和增减量');
  await api('/api/user/adjust', { method: 'POST', body: JSON.stringify({ qq, delta }) });
  toast('已调整');
  loadUser();
};

async function loadAllow() {
  const { allowGroup, allowUser } = await api('/api/allow');
  renderChips('allow-group-list', allowGroup, 'group');
  renderChips('allow-user-list', allowUser, 'user');
}
function renderChips(id, list, type) {
  const wrap = $(id);
  wrap.innerHTML = '';
  if (!list.length) {
    wrap.innerHTML = '<span class="muted">（空）</span>';
    return;
  }
  list.forEach(v => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `<span>${v}</span>`;
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.onclick = async () => {
      await api('/api/allow/remove', { method: 'POST', body: JSON.stringify({ type, value: v }) });
      toast('已删除');
      loadAllow();
    };
    chip.appendChild(btn);
    wrap.appendChild(chip);
  });
}
$('allow-group-add').onclick = async () => {
  const value = $('allow-group-input').value.trim();
  if (!value) return;
  await api('/api/allow/add', { method: 'POST', body: JSON.stringify({ type: 'group', value }) });
  $('allow-group-input').value = '';
  toast('已添加');
  loadAllow();
};
$('allow-user-add').onclick = async () => {
  const value = $('allow-user-input').value.trim();
  if (!value) return;
  await api('/api/allow/add', { method: 'POST', body: JSON.stringify({ type: 'user', value }) });
  $('allow-user-input').value = '';
  toast('已添加');
  loadAllow();
};

async function loadConfig() {
  const c = await api('/api/config');
  $('cfg-ws').value = c.napcat.wsUrl;
  $('cfg-token').value = c.napcat.token || '';
  $('cfg-port').value = c.manager.port;
  $('cfg-pwd').value = c.manager.password;
  $('cfg-min').value = c.sign.coinMin;
  $('cfg-max').value = c.sign.coinMax;
}
$('cfg-save').onclick = async () => {
  const next = {
    napcat: { wsUrl: $('cfg-ws').value, token: $('cfg-token').value },
    manager: { port: Number($('cfg-port').value), password: $('cfg-pwd').value },
    sign: { coinMin: Number($('cfg-min').value), coinMax: Number($('cfg-max').value) },
  };
  await api('/api/config', { method: 'POST', body: JSON.stringify(next) });
  toast('已保存（端口/密码变更需重启）');
};