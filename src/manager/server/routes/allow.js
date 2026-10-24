const express = require('express');
const router = express.Router();
const database = require('../../../core/database');

router.get('/', (req, res) => {
  res.json({
    allowGroup: database.getSys('allowGroup', ['*']),
    allowUser: database.getSys('allowUser', ['*']),
  });
});

router.post('/', (req, res) => {
  const { allowGroup, allowUser } = req.body;
  if (Array.isArray(allowGroup)) database.setSys('allowGroup', allowGroup);
  if (Array.isArray(allowUser)) database.setSys('allowUser', allowUser);
  res.json({ ok: true });
});

router.post('/add', (req, res) => {
  const { type, value } = req.body;
  const key = type === 'group' ? 'allowGroup' : 'allowUser';
  const list = database.getSys(key, []);
  if (!list.includes(value)) list.push(value);
  database.setSys(key, list);
  res.json({ ok: true, list });
});

router.post('/remove', (req, res) => {
  const { type, value } = req.body;
  const key = type === 'group' ? 'allowGroup' : 'allowUser';
  const list = database.getSys(key, []).filter(v => v !== value);
  database.setSys(key, list);
  res.json({ ok: true, list });
});

module.exports = router;