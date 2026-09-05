const express = require('express');
const { Op } = require('sequelize');
const { authMiddleware } = require('../middleware/auth');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const { Followup, Lead } = require('../models');
const { decrypt } = require('../utils/encryption');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

// GET /api/followups?status=pending&from=&to=&lead_id=
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, from, to, lead_id } = req.query;
    const where = {};
    if (status) where.status = status;
    if (lead_id) where.lead_id = lead_id;
    if (from && to) where.scheduled_at = { [Op.between]: [new Date(from), new Date(to)] };

    const followups = await Followup.findAll({
      where,
      include: [{ model: Lead, as: 'Lead', attributes: ['id', 'name', 'phone_encrypted', 'lead_status', 'language'] }],
      order: [['scheduled_at', 'ASC']],
    });

    const formatted = followups.map(f => {
      const data = f.toJSON();
      if (data.Lead) {
        data.Lead.phone = decrypt(data.Lead.phone_encrypted);
        delete data.Lead.phone_encrypted;
      }
      return data;
    });

    res.json(formatted);
  } catch (err) {
    console.error('Fetch followups error:', err);
    res.status(500).json({ error: 'Failed to fetch followups' });
  }
});

// GET /api/followups/due-today
router.get('/due-today', authMiddleware, async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const count = await Followup.count({
      where: {
        scheduled_at: { [Op.between]: [start, end] },
        status: 'pending',
      },
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/followups/needs-followup — pure database query for interested leads with no scheduled follow-up
router.get('/needs-followup', authMiddleware, async (req, res) => {
  try {
    // Find all leads marked interested where follow_up_date is null
    const leads = await Lead.findAll({
      where: {
        interested_status: 'interested',
        follow_up_date: null,
      },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    const result = leads.map(l => ({
      id: l.id,
      name: l.name || '—',
      phone: decrypt(l.phone_encrypted) || '—',
      lead_status: l.lead_status || 'Warm',
      lead_score: l.lead_score,
      interested_status: l.interested_status,
      language: l.language || 'English',
      last_call_date: l.last_call_date,
      created_at: l.created_at,
    }));

    res.json(result);
  } catch (err) {
    console.error('needs-followup error:', err);
    res.status(500).json({ error: 'Failed to fetch leads needing follow-up' });
  }
});

// POST /api/followups — accepts both JWT auth (staff) and API key (AI model)
async function createFollowup(req, res) {
  try {
    const { lead_id, call_id, campaign_id, scheduled_at, notes, created_by_type } = req.body;
    if (!scheduled_at) return res.status(400).json({ error: 'scheduled_at is required' });

    const followup = await Followup.create({
      lead_id: lead_id || null,
      call_id: call_id || null,
      campaign_id: campaign_id || null,
      scheduled_at: new Date(scheduled_at),
      notes: notes || null,
      created_by: req.user?.id || null,
      created_by_type: created_by_type || (req.user ? 'user' : 'ai_model'),
    });

    // Auto-update lead follow_up_date if lead_id given
    if (lead_id) {
      await Lead.update({ follow_up_date: scheduled_at }, { where: { id: lead_id } });
    }

    if (req.user) {
      await logAudit({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'CREATE_FOLLOWUP',
        entity: 'Followup',
        entityId: followup.id,
        newValue: { scheduled_at, lead_id },
        ipAddress: req.ip,
        source: 'manual',
      });
    }

    res.status(201).json(followup);
  } catch (err) {
    console.error('Create followup error:', err);
    res.status(500).json({ error: 'Failed to create followup' });
  }
}

// Allow both auth types: X-API-Key (AI engine) or Bearer JWT (Staff)
router.post('/', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey) return apiKeyAuth(req, res, next);
  return authMiddleware(req, res, next);
}, createFollowup);

// PATCH /api/followups/:id
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const f = await Followup.findByPk(req.params.id);
    if (!f) return res.status(404).json({ error: 'Not found' });

    const oldStatus = f.status;
    await f.update(req.body);

    if (req.user) {
      await logAudit({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'UPDATE_FOLLOWUP',
        entity: 'Followup',
        entityId: f.id,
        oldValue: { status: oldStatus },
        newValue: req.body,
        ipAddress: req.ip,
        source: 'manual',
      });
    }

    res.json(f);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
