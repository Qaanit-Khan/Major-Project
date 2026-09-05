const express = require('express');
const { Op } = require('sequelize');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { Lead } = require('../models');
const { decrypt } = require('../utils/encryption');
const { logAudit } = require('../utils/auditLogger');
const { sendExport } = require('../utils/exporter');

const router = express.Router();

function buildLeadFilters(query) {
  const {
    lead_status,
    interested_status,
    shortlisted,
    campaign_id,
    language,
    score_min,
    score_max,
    from,
    to,
  } = query;

  const where = {};
  if (lead_status) where.lead_status = lead_status;
  if (interested_status) where.interested_status = interested_status;
  if (shortlisted !== undefined && shortlisted !== '') where.shortlisted = shortlisted === 'true';
  if (campaign_id) where.campaign_id = campaign_id;
  if (language) where.language = language;
  if (score_min || score_max) {
    where.lead_score = {};
    if (score_min) where.lead_score[Op.gte] = Number(score_min);
    if (score_max) where.lead_score[Op.lte] = Number(score_max);
  }
  if (from && to) where.created_at = { [Op.between]: [new Date(from), new Date(to)] };

  return where;
}

// GET /api/leads
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      sort = 'created_at',
      order = 'DESC',
    } = req.query;

    const where = buildLeadFilters(req.query);
    const offset = (Number(page) - 1) * Number(limit);

    const { rows, count } = await Lead.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [[sort, order]],
    });

    const leads = rows.map(l => ({
      ...l.toJSON(),
      phone: decrypt(l.phone_encrypted),
      phone_encrypted: undefined,
    }));

    res.json({
      leads,
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / Number(limit)),
    });
  } catch (err) {
    console.error('Leads fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /api/leads/export?format=csv|xlsx|pdf
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { format = 'csv', sort = 'created_at', order = 'DESC' } = req.query;
    const where = buildLeadFilters(req.query);

    const rows = await Lead.findAll({
      where,
      order: [[sort, order]],
    });

    const decrypted = rows.map(l => ({
      name: l.name || '—',
      phone: decrypt(l.phone_encrypted) || '—',
      lead_status: l.lead_status || 'Warm',
      lead_score: l.lead_score != null ? `${l.lead_score}%` : '—',
      interested_status: l.interested_status || 'pending',
      shortlisted: l.shortlisted ? 'Yes' : 'No',
      follow_up_date: l.follow_up_date ? new Date(l.follow_up_date).toLocaleDateString() : '—',
      language: l.language || 'English',
      last_call_date: l.last_call_date ? new Date(l.last_call_date).toLocaleDateString() : '—',
    }));

    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'lead_status', label: 'Lead Status' },
      { key: 'lead_score', label: 'Score' },
      { key: 'interested_status', label: 'Interested' },
      { key: 'shortlisted', label: 'Shortlisted' },
      { key: 'follow_up_date', label: 'Follow-up Date' },
      { key: 'language', label: 'Language' },
      { key: 'last_call_date', label: 'Last Call' },
    ];

    await sendExport(res, format, 'leads_export', columns, decrypted);
  } catch (err) {
    console.error('Leads export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Backward compatibility: GET /api/leads/export/xlsx
router.get('/export/xlsx', authMiddleware, async (req, res) => {
  req.query.format = 'xlsx';
  const where = buildLeadFilters(req.query);
  const rows = await Lead.findAll({ where });
  const decrypted = rows.map(l => ({
    name: l.name || '—',
    phone: decrypt(l.phone_encrypted) || '—',
    lead_status: l.lead_status,
    lead_score: l.lead_score,
    interested_status: l.interested_status,
    shortlisted: l.shortlisted ? 'Yes' : 'No',
    follow_up_date: l.follow_up_date ? new Date(l.follow_up_date).toLocaleDateString() : '—',
    language: l.language,
    last_call_date: l.last_call_date ? new Date(l.last_call_date).toLocaleDateString() : '—',
  }));
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'lead_status', label: 'Lead Status' },
    { key: 'lead_score', label: 'Score' },
    { key: 'interested_status', label: 'Interested' },
    { key: 'shortlisted', label: 'Shortlisted' },
    { key: 'follow_up_date', label: 'Follow-up Date' },
    { key: 'language', label: 'Language' },
    { key: 'last_call_date', label: 'Last Call' },
  ];
  return sendExport(res, 'xlsx', 'leads_export', columns, decrypted);
});

// GET /api/leads/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    const data = lead.toJSON();
    data.phone = decrypt(lead.phone_encrypted);
    delete data.phone_encrypted;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/leads/:id — manual override
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const oldVal = {
      lead_status: lead.lead_status,
      interested_status: lead.interested_status,
    };
    const updates = {};
    if (req.body.lead_status) {
      updates.lead_status = req.body.lead_status;
      updates.status_override_by = req.user.id;
      updates.status_override_source = 'manual';
    }
    if (req.body.interested_status) updates.interested_status = req.body.interested_status;
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    if (req.body.follow_up_date !== undefined) updates.follow_up_date = req.body.follow_up_date;

    await lead.update(updates);
    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'UPDATE_LEAD',
      entity: 'Lead',
      entityId: lead.id,
      oldValue: oldVal,
      newValue: updates,
      ipAddress: req.ip,
      source: 'manual',
    });

    const data = lead.toJSON();
    data.phone = decrypt(lead.phone_encrypted);
    delete data.phone_encrypted;
    res.json(data);
  } catch (err) {
    console.error('Lead update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/leads/bulk-shortlist
router.post('/bulk-shortlist', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });

    await Lead.update(
      { shortlisted: true, shortlisted_at: new Date(), shortlisted_by: req.user.id },
      { where: { id: { [Op.in]: ids } } }
    );

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'BULK_SHORTLIST',
      entity: 'Lead',
      newValue: { ids, count: ids.length },
      ipAddress: req.ip,
      source: 'manual',
    });

    res.json({ success: true, count: ids.length });
  } catch (err) {
    console.error('Bulk shortlist error:', err);
    res.status(500).json({ error: 'Bulk shortlist failed' });
  }
});

module.exports = router;
