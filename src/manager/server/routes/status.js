const express = require('express');
const router = express.Router();
const database = require('../../../core/database');

router.get('/', (req, res) => {
  res.json({
    allowGroup: database.getSys('allowGroup', ['*']),
    allowUser: database.getSys('allowUser', ['*']),
  });
});

module.exports = router;