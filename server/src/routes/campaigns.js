const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { Campaign, PhoneNumber, Questionnaire, Question } = require('../models');
const { encrypt, decrypt } = require('../utils/encryption');
const { logAudit } = require('../utils/auditLogger');
const { sendExport } = require('../utils/exporter');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/campaigns
router.get('/', authMiddleware, async (req, res) => {
  try {
    const campaigns = await Campaign.findAll({ order: [['created_at', 'DESC']] });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// POST /api/campaigns
router.post('/', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, description, language } = req.body;
    if (!name) return res.status(400).json({ error: 'Campaign name required' });
    const campaign = await Campaign.create({
      name,
      description,
      language: language || 'English',
      created_by: req.user.id,
    });
    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'CREATE_CAMPAIGN',
      entity: 'Campaign',
      entityId: campaign.id,
      ipAddress: req.ip,
      source: 'manual',
    });
    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// GET /api/campaigns/export?format=csv|xlsx|pdf
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    const campaigns = await Campaign.findAll({ order: [['created_at', 'DESC']] });

    const rows = campaigns.map(c => ({
      name: c.name,
      description: c.description || '—',
      language: c.language || 'English',
      status: c.status || 'draft',
      total_numbers: c.total_numbers || 0,
      created_at: c.created_at ? new Date(c.created_at).toLocaleDateString() : '—',
    }));

    const columns = [
      { key: 'name', label: 'Campaign Name' },
      { key: 'description', label: 'Description' },
      { key: 'language', label: 'Language' },
      { key: 'status', label: 'Status' },
      { key: 'total_numbers', label: 'Total Numbers' },
      { key: 'created_at', label: 'Created Date' },
    ];

    await sendExport(res, format, 'campaigns_export', columns, rows);
  } catch (err) {
    console.error('Campaigns export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Backward compatibility: GET /api/campaigns/export/xlsx
router.get('/export/xlsx', authMiddleware, async (req, res) => {
  req.query.format = 'xlsx';
  const campaigns = await Campaign.findAll({ order: [['created_at', 'DESC']] });
  const rows = campaigns.map(c => ({
    name: c.name,
    description: c.description || '',
    language: c.language,
    status: c.status,
    total_numbers: c.total_numbers || 0,
    created_at: c.created_at,
  }));
  const columns = [
    { key: 'name', label: 'Campaign Name' },
    { key: 'description', label: 'Description' },
    { key: 'language', label: 'Language' },
    { key: 'status', label: 'Status' },
    { key: 'total_numbers', label: 'Total Numbers' },
    { key: 'created_at', label: 'Created Date' },
  ];
  return sendExport(res, 'xlsx', 'campaigns_export', columns, rows);
});

// GET /api/campaigns/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/campaigns/:id
router.patch('/:id', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const { name, description, status, language } = req.body;
    await campaign.update({ name, description, status, language });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/campaigns/:id/numbers — paste or CSV/XLSX upload with duplicate detection
router.post('/:id/numbers', authMiddleware, requireRole('admin', 'manager'), upload.single('file'), async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    let rawNumbers = [];

    if (req.file) {
      // Parse Excel or CSV
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      for (const row of data) {
        if (row[0]) {
          rawNumbers.push({
            phone: String(row[0]).trim(),
            language: row[1] ? String(row[1]).trim() : (req.body.language || campaign.language || 'English'),
          });
        }
      }
    } else {
      // Pasted text (lines or commas)
      const text = req.body.numbers || '';
      const lines = text.split(/[\n,]+/).map(l => l.trim()).filter(Boolean);
      const lang = req.body.language || campaign.language || 'English';
      rawNumbers = lines.map(p => ({ phone: p, language: lang }));
    }

    const totalRaw = rawNumbers.length;
    const phoneRegex = /^[+]?[\d\s\-().]{7,20}$/;
    const valid = [];
    const invalid = [];
    let duplicates = 0;
    const seenInBatch = new Set();

    for (const item of rawNumbers) {
      const cleanDigits = item.phone.replace(/[^\d+]/g, '');
      if (seenInBatch.has(cleanDigits)) {
        duplicates++;
        continue;
      }
      seenInBatch.add(cleanDigits);

      if (phoneRegex.test(item.phone) && cleanDigits.length >= 7) {
        valid.push({
          campaign_id: campaign.id,
          phone_encrypted: encrypt(item.phone),
          language: item.language || campaign.language || 'English',
          status: 'pending',
        });
      } else {
        invalid.push(item.phone);
      }
    }

    // Preview mode
    if (req.body.preview === 'true') {
      return res.json({
        total: totalRaw,
        valid: valid.length,
        invalid: invalid.length,
        duplicates,
        invalid_samples: invalid.slice(0, 10),
      });
    }

    // Commit queue insertion
    if (valid.length > 0) {
      await PhoneNumber.bulkCreate(valid, { ignoreDuplicates: true });
      await campaign.update({ total_numbers: (campaign.total_numbers || 0) + valid.length });

      await logAudit({
        userId: req.user?.id || null,
        userEmail: req.user?.email || null,
        action: 'QUEUE_PHONE_NUMBERS',
        entity: 'Campaign',
        entityId: campaign.id,
        newValue: { inserted: valid.length, invalid: invalid.length, duplicates },
        ipAddress: req.ip,
        source: 'manual',
      });
    }

    res.json({
      inserted: valid.length,
      invalid: invalid.length,
      duplicates,
      invalid_samples: invalid.slice(0, 10),
    });
  } catch (err) {
    console.error('Number upload error:', err);
    res.status(500).json({ error: 'Failed to upload numbers' });
  }
});

// GET /api/campaigns/:id/next-numbers?limit=10  (AI model endpoint, API key auth)
router.get('/:id/next-numbers', require('../middleware/apiKeyAuth').apiKeyAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 10), 100);
    const numbers = await PhoneNumber.findAll({
      where: { campaign_id: req.params.id, status: 'pending' },
      limit,
      order: [['created_at', 'ASC']],
    });

    const result = numbers.map(n => ({
      id: n.id,
      phone: decrypt(n.phone_encrypted),
      language: n.language,
    }));

    // Mark as dialing
    if (numbers.length) {
      await PhoneNumber.update({ status: 'dialing' }, { where: { id: numbers.map(n => n.id) } });
    }

    // Fetch active questionnaire ID
    const activeQ = await Questionnaire.findOne({
      where: { campaign_id: req.params.id, is_active: true },
      attributes: ['id'],
      order: [['version', 'DESC']],
    });

    res.json({
      numbers: result,
      campaign_id: req.params.id,
      questionnaire_id: activeQ?.id || null,
    });
  } catch (err) {
    console.error('next-numbers error:', err);
    res.status(500).json({ error: 'Failed to fetch next numbers' });
  }
});

// GET /api/campaigns/:id/questionnaire  (AI model endpoint, API key auth)
router.get('/:id/questionnaire', require('../middleware/apiKeyAuth').apiKeyAuth, async (req, res) => {
  try {
    const questionnaire = await Questionnaire.findOne({
      where: { campaign_id: req.params.id, is_active: true },
      include: [
        {
          model: Question,
          as: 'questions',
          where: { is_active: true },
          required: false,
          order: [['order_index', 'ASC']],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    if (!questionnaire) return res.status(404).json({ error: 'No active questionnaire for this campaign' });

    res.json({
      questionnaire_id: questionnaire.id,
      name: questionnaire.name,
      version: questionnaire.version,
      questions: questionnaire.questions.map(q => ({
        id: q.id,
        text: q.text,
        type: q.question_type,
        expected_answers: q.expected_answers,
        order: q.order_index,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questionnaire' });
  }
});

module.exports = router;
