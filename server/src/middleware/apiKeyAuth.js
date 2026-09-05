const bcrypt = require('bcryptjs');
const { ApiKey } = require('../models');

async function apiKeyAuth(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'X-API-Key header required' });
    }

    // Find active key by prefix
    const prefix = apiKey.substring(0, 8);
    const keys = await ApiKey.findAll({ where: { key_prefix: prefix, is_active: true, revoked_at: null } });

    let matched = null;
    for (const k of keys) {
      const valid = await bcrypt.compare(apiKey, k.key_hash);
      if (valid) { matched = k; break; }
    }

    if (!matched) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    await matched.update({ last_used_at: new Date() });
    req.apiKey = matched;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'API key validation failed' });
  }
}

module.exports = { apiKeyAuth };
