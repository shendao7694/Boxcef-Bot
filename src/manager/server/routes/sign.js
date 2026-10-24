const express = require('express');
const router = express.Router();
const database = require('../../../core/database');

router.get('/', (req, res) => {
  const lastMap = Object.fromEntries(database.listLastSign().map(r => [r.qq, r.date]));
  const rows = database.listSignCodes().map(r => ({
    qq: r.qq,
    code: r.code,
    last: lastMap[r.qq] || '',
  }));
  res.json(rows);
});

router.post('/', (req, res) => {
  const { qq, code } = req.body;
  if (!qq) return res.status(400).json({ error: 'qq required' });
  database.setSignCode(qq, code || '');
  res.json({ ok: true });
});

router.post('/last', (req, res) => {
  const { qq, date } = req.body;
  if (!qq) return res.status(400).json({ error: 'qq required' });
  database.setLastSign(qq, date || '');
  res.json({ ok: true });
});

router.delete('/last/:qq', (req, res) => {
  database.deleteLastSign(req.params.qq);
  res.json({ ok: true });
});

router.delete('/:qq', (req, res) => {
  database.deleteSignCode(req.params.qq);
  res.json({ ok: true });
});

module.exports = router;