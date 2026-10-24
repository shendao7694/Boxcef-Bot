const path = require('path');
const fs = require('fs');

const STORE_PATH = path.join(__dirname, '..', 'data', 'store.json');

const defaultStore = () => ({
  sign: { code: {}, last: {} },
  user: { coin: {} },
  sys: { allowGroup: ['*'], allowUser: ['*'] },
});

let store = null;
let saveTimer = null;

function load() {
  if (fs.existsSync(STORE_PATH)) {
    try {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        sign: { code: {}, last: {}, ...(parsed.sign || {}) },
        user: { coin: {}, ...(parsed.user || {}) },
        sys: { allowGroup: ['*'], allowUser: ['*'], ...(parsed.sys || {}) },
      };
    } catch (err) {
      console.error('[db] store.json parse failed:', err.message);
      try { fs.renameSync(STORE_PATH, STORE_PATH + '.bak-' + Date.now()); } catch {}
    }
  }
  return defaultStore();
}

function ensure() {
  if (!store) {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    store = load();
    saveNow();
  }
  return store;
}

function saveNow() {
  if (!store) return;
  const tmp = STORE_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, STORE_PATH);
}

function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try { saveNow(); } catch (err) { console.error('[db] write failed:', err.message); }
  }, 50);
}

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function getSignCode(qq) {
  return ensure().sign.code[String(qq)] || null;
}

function setSignCode(qq, code) {
  const s = ensure();
  const key = String(qq);
  if (code === '' || code === null || code === undefined) {
    delete s.sign.code[key];
  } else {
    s.sign.code[key] = code;
  }
  save();
}

function deleteSignCode(qq) {
  const s = ensure();
  delete s.sign.code[String(qq)];
  save();
}

function getLastSign(qq) {
  return ensure().sign.last[String(qq)] || null;
}

function setLastSign(qq, date) {
  const s = ensure();
  const key = String(qq);
  if (date === '' || date === null || date === undefined) {
    delete s.sign.last[key];
  } else {
    s.sign.last[key] = date;
  }
  save();
}

function deleteLastSign(qq) {
  const s = ensure();
  delete s.sign.last[String(qq)];
  save();
}

function getCoin(qq) {
  return ensure().user.coin[String(qq)] || 0;
}

function addCoin(qq, amount) {
  const s = ensure();
  const key = String(qq);
  s.user.coin[key] = (s.user.coin[key] || 0) + amount;
  save();
  return s.user.coin[key];
}

function setCoin(qq, amount) {
  ensure().user.coin[String(qq)] = amount;
  save();
}

function deleteUser(qq) {
  const s = ensure();
  const key = String(qq);
  delete s.user.coin[key];
  delete s.sign.last[key];
  delete s.sign.code[key];
  save();
}

function getSys(key, fallback) {
  const s = ensure().sys;
  return s[key] === undefined ? fallback : s[key];
}

function setSys(key, value) {
  ensure().sys[key] = value;
  save();
}

function initSys() {
  const s = ensure();
  if (!Array.isArray(s.sys.allowGroup)) s.sys.allowGroup = ['*'];
  if (!Array.isArray(s.sys.allowUser)) s.sys.allowUser = ['*'];
  save();
}

function listSignCodes() {
  const s = ensure();
  return Object.entries(s.sign.code).map(([qq, code]) => ({ qq, code }));
}

function listLastSign() {
  const s = ensure();
  return Object.entries(s.sign.last).map(([qq, date]) => ({ qq, date }));
}

function listUsers() {
  const s = ensure();
  return Object.entries(s.user.coin)
    .map(([qq, coin]) => ({ qq, coin }))
    .sort((a, b) => b.coin - a.coin);
}

module.exports = {
  getSignCode, setSignCode, deleteSignCode,
  getLastSign, setLastSign, deleteLastSign,
  getCoin, addCoin, setCoin, deleteUser,
  getSys, setSys, initSys,
  listSignCodes, listLastSign, listUsers,
  today, saveNow,
  get raw() { return ensure(); },
};