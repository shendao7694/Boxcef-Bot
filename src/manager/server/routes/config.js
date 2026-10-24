const express = require('express');
const router = express.Router();
const config = require('../../../core/config');
const database = require('../../../core/database');

router.get('/', (req, res) => res.json(config.get()));

router.post('/', (req, res) => {
  config.save(req.body);
  res.json({ ok: true, config: config.get() });
});

router.post('/allowGroup', (req, res) => {
  database.setSys('allowGroup', req.body.allowGroup || ['*']);
  res.json({ ok: true });
});

router.post('/allowUser', (req, res) => {
  database.setSys('allowUser', req.body.allowUser || ['*']);
  res.json({ ok: true });
});

module.exports = router;