const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const EMOJI_DIR = path.join(__dirname, '..', '..', '..', 'data', 'assets', 'emoji');
fs.mkdirSync(EMOJI_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, EMOJI_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(png|jpg|jpeg|gif|webp)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('only png/jpg/jpeg/gif/webp allowed'));
  },
});

router.get('/', (req, res) => {
  const files = fs.readdirSync(EMOJI_DIR).filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f));
  res.json(files);
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  res.json({ ok: true, filename: req.file.filename });
});

router.delete('/:name', (req, res) => {
  const name = path.basename(req.params.name);
  const file = path.join(EMOJI_DIR, name);
  if (!file.startsWith(EMOJI_DIR)) return res.status(400).json({ error: 'invalid' });
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'not found' });
  fs.unlinkSync(file);
  res.json({ ok: true });
});

router.get('/raw/:name', (req, res) => {
  const name = path.basename(req.params.name);
  const file = path.join(EMOJI_DIR, name);
  if (!fs.existsSync(file)) return res.status(404).end();
  res.sendFile(file);
});

module.exports = router;