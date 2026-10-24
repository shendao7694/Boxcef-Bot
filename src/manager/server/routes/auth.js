const express = require('express');
const router = express.Router();
const config = require('../../../core/config');

router.post('/login', (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ ok: false, error: 'password required' });
  if (password !== config.get().manager.password) {
    return res.status(401).json({ ok: false, error: '密码错误' });
  }
  res.json({ ok: true });
});

module.exports = router;