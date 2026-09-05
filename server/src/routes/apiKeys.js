const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ApiKey } = require('../models');

const router = express.Router();

// GET /api/api-keys
router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const keys = await ApiKey.findAll({
      attributes: ['id', 'name', 'key_prefix', 'created_by', 'last_used_at', 'revoked_at', 'is_active', 'created_at'],
      order: [['created_at', 'DESC']],
    });
    res.json(keys);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// POST /api/api-keys — generate new key
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    // Generate a secure random key: arb_ + 48 random hex chars
    const rawKey = 'arb_' + crypto.randomBytes(24).toString('hex');
    const prefix = rawKey.substring(0, 8);
    const hash = await bcrypt.hash(rawKey, 10);

    const key = await ApiKey.create({ name, key_prefix: prefix, key_hash: hash, created_by: req.user.id });

    // Return the raw key ONCE — not stored in plaintext
    res.status(201).json({
      id: key.id,
      name: key.name,
      key: rawKey,
      key_prefix: prefix,
      message: 'Save this key now — it will not be shown again.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// DELETE /api/api-keys/:id — revoke
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const key = await ApiKey.findByPk(req.params.id);
    if (!key) return res.status(404).json({ error: 'Key not found' });
    await key.update({ revoked_at: new Date(), is_active: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke key' });
  }
});

module.exports = router;
