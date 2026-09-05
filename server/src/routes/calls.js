const express = require('express');
const { Op } = require('sequelize');
const { authMiddleware } = require('../middleware/auth');
const { Call, CallClassification } = require('../models');
const { decrypt } = require('../utils/encryption');
const { logAudit } = require('../utils/auditLogger');
const { sendExport } = require('../utils/exporter');

const router = express.Router();

function buildCallFilters(query) {
  const { language, status, lead_status, campaign_id, from, to, quick_filter } = query;

  const where = {};
  if (language) where.language = language;
  if (status) where.status = status;
  if (campaign_id) where.campaign_id = campaign_id;
  if (from && to) where.created_at = { [Op.between]: [new Date(from), new Date(to)] };

  const classificationWhere = {};
  const effectiveLeadStatus = lead_status || (quick_filter && quick_filter !== 'all' ? quick_filter : undefined);
  if (effectiveLeadStatus) {
    classificationWhere.lead_status = effectiveLeadStatus;
  }

  return { where, classificationWhere };
}

// GET /api/calls
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      search,
      sort = 'created_at',
      order = 'DESC',
    } = req.query;

    const { where, classificationWhere } = buildCallFilters(req.query);
    const hasClassificationFilter = Object.keys(classificationWhere).length > 0;

    const queryOptions = {
      where,
      include: [
        {
          model: CallClassification,
          as: 'classification',
          where: hasClassificationFilter ? classificationWhere : undefined,
          required: hasClassificationFilter,
        },
      ],
      order: [[sort, order]],
    };

    let calls;
    let total;

    if (search && search.trim()) {
      // Search by decrypted phone
      const allMatching = await Call.findAll(queryOptions);
      const cleanSearch = search.trim().toLowerCase().replace(/[^\d+]/g, '');

      const filtered = allMatching
        .map(c => {
          const decryptedPhone = decrypt(c.phone_encrypted) || '';
          return {
            ...c.toJSON(),
            phone_number: decryptedPhone,
            transcript_text: c.transcript_encrypted ? decrypt(c.transcript_encrypted) : null,
            phone_encrypted: undefined,
            transcript_encrypted: undefined,
          };
        })
        .filter(c => {
          const cleanPhone = (c.phone_number || '').toLowerCase().replace(/[^\d+]/g, '');
          return cleanPhone.includes(cleanSearch) || (c.phone_number || '').toLowerCase().includes(search.toLowerCase());
        });

      total = filtered.length;
      const offset = (Number(page) - 1) * Number(limit);
      calls = filtered.slice(offset, offset + Number(limit));
    } else {
      const offset = (Number(page) - 1) * Number(limit);
      const result = await Call.findAndCountAll({
        ...queryOptions,
        limit: Number(limit),
        offset,
      });

      total = result.count;
      calls = result.rows.map(c => ({
        ...c.toJSON(),
        phone_number: decrypt(c.phone_encrypted),
        transcript_text: c.transcript_encrypted ? decrypt(c.transcript_encrypted) : null,
        phone_encrypted: undefined,
        transcript_encrypted: undefined,
      }));
    }

    res.json({
      calls,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('Calls fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

// GET /api/calls/export?format=csv|xlsx|pdf
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { format = 'csv', search, sort = 'created_at', order = 'DESC' } = req.query;
    const { where, classificationWhere } = buildCallFilters(req.query);
    const hasClassificationFilter = Object.keys(classificationWhere).length > 0;

    const records = await Call.findAll({
      where,
      include: [
        {
          model: CallClassification,
          as: 'classification',
          where: hasClassificationFilter ? classificationWhere : undefined,
          required: hasClassificationFilter,
        },
      ],
      order: [[sort, order]],
    });

    let decrypted = records.map(c => ({
      phone_number: decrypt(c.phone_encrypted) || '',
      language: c.language || 'English',
      status: c.status || 'in_progress',
      duration_seconds: c.duration_seconds != null ? c.duration_seconds : '—',
      lead_status: c.classification?.lead_status || 'pending',
      lead_score: c.classification?.lead_score != null ? `${c.classification.lead_score}%` : '—',
      sentiment_score: c.classification?.sentiment_score != null ? c.classification.sentiment_score : '—',
      talk_duration_seconds: c.classification?.talk_duration_seconds != null ? c.classification.talk_duration_seconds : '—',
      created_at: c.created_at ? new Date(c.created_at).toLocaleString() : '—',
    }));

    if (search && search.trim()) {
      const cleanSearch = search.trim().toLowerCase().replace(/[^\d+]/g, '');
      decrypted = decrypted.filter(c => {
        const cleanPhone = (c.phone_number || '').toLowerCase().replace(/[^\d+]/g, '');
        return cleanPhone.includes(cleanSearch) || c.phone_number.toLowerCase().includes(search.toLowerCase());
      });
    }

    const columns = [
      { key: 'phone_number', label: 'Phone Number' },
      { key: 'language', label: 'Language' },
      { key: 'status', label: 'Status' },
      { key: 'duration_seconds', label: 'Duration (s)' },
      { key: 'lead_status', label: 'Lead Status' },
      { key: 'lead_score', label: 'Lead Score' },
      { key: 'sentiment_score', label: 'Sentiment' },
      { key: 'talk_duration_seconds', label: 'Talk Time (s)' },
      { key: 'created_at', label: 'Time' },
    ];

    await sendExport(res, format, 'calls_export', columns, decrypted);
  } catch (err) {
    console.error('Calls export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Backward compatibility: GET /api/calls/export/csv
router.get('/export/csv', authMiddleware, async (req, res) => {
  req.query.format = 'xlsx';
  return router.handle(req, res, () => {});
});

// GET /api/calls/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const call = await Call.findByPk(req.params.id, {
      include: [{ model: CallClassification, as: 'classification' }],
    });
    if (!call) return res.status(404).json({ error: 'Call not found' });
    const data = call.toJSON();
    data.phone_number = decrypt(call.phone_encrypted);
    data.transcript_text = call.transcript_encrypted ? decrypt(call.transcript_encrypted) : null;
    delete data.phone_encrypted;
    delete data.transcript_encrypted;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/calls/:id/notes
router.patch('/:id/notes', authMiddleware, async (req, res) => {
  try {
    const call = await Call.findByPk(req.params.id);
    if (!call) return res.status(404).json({ error: 'Call not found' });

    const previousNotes = call.notes;
    const newNotes = req.body.notes !== undefined ? req.body.notes : '';

    await call.update({ notes: newNotes });

    await logAudit({
      userId: req.user?.id || null,
      userEmail: req.user?.email || null,
      action: 'UPDATE_CALL_NOTES',
      entity: 'Call',
      entityId: call.id,
      oldValue: { notes: previousNotes },
      newValue: { notes: newNotes },
      ipAddress: req.ip,
      source: 'manual',
    });

    res.json({ success: true, notes: newNotes });
  } catch (err) {
    console.error('Call notes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
