const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { AuditLog } = require('../models');

const router = express.Router();

// GET /api/audit-logs?page=1&limit=50&entity=&action=&user_id=
router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, entity, action, user_id } = req.query;
    const where = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (user_id) where.user_id = user_id;

    const offset = (Number(page) - 1) * Number(limit);
    const { rows, count } = await AuditLog.findAndCountAll({
      where, limit: Number(limit), offset, order: [['created_at', 'DESC']],
    });

    res.json({ logs: rows, total: count, page: Number(page), totalPages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
