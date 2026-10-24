const express = require('express');
const router = express.Router();
const database = require('../../../core/database');

router.get('/', (req, res) => {
  res.json(database.listUsers());
});

router.get('/signed', (req, res) => {
  const today = database.today();
  const list = database.listLastSign().filter(r => r.date === today);
  res.json({ date: today, list });
});

router.post('/', (req, res) => {
  const { qq, coin } = req.body;
  if (!qq || typeof coin !== 'number') return res.status(400).json({ error: 'qq and coin required' });
  database.setCoin(qq, coin);
  res.json({ ok: true });
});

router.post('/adjust', (req, res) => {
  const { qq, delta } = req.body;
  if (!qq || typeof delta !== 'number') return res.status(400).json({ error: 'qq and delta required' });
  const total = database.addCoin(qq, delta);
  res.json({ ok: true, total });
});

router.delete('/:qq', (req, res) => {
  database.deleteUser(req.params.qq);
  res.json({ ok: true });
});

module.exports = router;