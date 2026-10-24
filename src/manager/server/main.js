const express = require('express');
const path = require('path');
const config = require('../../core/config');

function start() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/api/auth', require('./routes/auth'));

  app.use('/api', (req, res, next) => {
    if (req.headers['x-manager-password'] !== config.get().manager.password) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    next();
  });

  app.use('/api/status', require('./routes/status'));
  app.use('/api/config', require('./routes/config'));
  app.use('/api/sign', require('./routes/sign'));
  app.use('/api/emoji', require('./routes/emoji'));
  app.use('/api/user', require('./routes/user'));
  app.use('/api/allow', require('./routes/allow'));

  const port = config.get().manager.port;
  app.listen(port, () => console.log(`[manager] http://0.0.0.0:${port}`));
}

module.exports = { start };