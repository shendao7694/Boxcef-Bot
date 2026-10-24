const path = require('path');
const fs = require('fs');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json');

const defaultConfig = {
  napcat: {
    wsUrl: 'ws://127.0.0.1:3001',
    token: '',
  },
  manager: {
    port: 7694,
    password: 'admin',
  },
  sign: {
    coinMin: 50,
    coinMax: 200,
  },
  reply: {
    enabled: true,
    blacklist: ['cat'],
  },
};

function load() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    return JSON.parse(JSON.stringify(defaultConfig));
  }
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  return {
    ...defaultConfig,
    ...raw,
    napcat: { ...defaultConfig.napcat, ...(raw.napcat || {}) },
    manager: { ...defaultConfig.manager, ...(raw.manager || {}) },
    sign: { ...defaultConfig.sign, ...(raw.sign || {}) },
    reply: { ...defaultConfig.reply, ...(raw.reply || {}) },
  };
}

let config = load();

module.exports = {
  get: () => config,
  reload: () => { config = load(); return config; },
  save: (next) => {
    config = {
      ...config,
      ...next,
      napcat: { ...config.napcat, ...(next.napcat || {}) },
      manager: { ...config.manager, ...(next.manager || {}) },
      sign: { ...config.sign, ...(next.sign || {}) },
      reply: { ...config.reply, ...(next.reply || {}) },
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  },
};