const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { Questionnaire, Question } = require('../models');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/questionnaires
router.get('/', authMiddleware, async (req, res) => {
  try {
    const list = await Questionnaire.findAll({
      include: [{ model: Question, as: 'questions', where: { is_active: true }, required: false }],
      order: [['created_at', 'DESC']],
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questionnaires' });
  }
});

// GET /api/questionnaires/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const q = await Questionnaire.findByPk(req.params.id, {
      include: [{ model: Question, as: 'questions', order: [['order_index', 'ASC']] }],
    });
    if (!q) return res.status(404).json({ error: 'Not found' });
    res.json(q);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/questionnaires
router.post('/', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, campaign_id, questions } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const q = await Questionnaire.create({ name, campaign_id: campaign_id || null });
    if (questions && questions.length) {
      const qrows = questions.map((item, i) => ({
        questionnaire_id: q.id,
        text: item.text,
        question_type: item.question_type || 'open_ended',
        expected_answers: item.expected_answers || [],
        order_index: item.order_index ?? i,
        is_active: true,
      }));
      await Question.bulkCreate(qrows);
    }
    const full = await Questionnaire.findByPk(q.id, { include: [{ model: Question, as: 'questions' }] });
    res.status(201).json(full);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create questionnaire' });
  }
});

// PUT /api/questionnaires/:id
router.put('/:id', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const q = await Questionnaire.findByPk(req.params.id);
    if (!q) return res.status(404).json({ error: 'Not found' });

    const { name, campaign_id, questions } = req.body;
    await q.update({ name: name || q.name, campaign_id: campaign_id || q.campaign_id });

    if (questions) {
      // Delete old questions and recreate
      await Question.destroy({ where: { questionnaire_id: q.id } });
      const qrows = questions.map((item, i) => ({
        questionnaire_id: q.id,
        text: item.text,
        question_type: item.question_type || 'open_ended',
        expected_answers: item.expected_answers || [],
        order_index: item.order_index ?? i,
        is_active: item.is_active !== false,
      }));
      await Question.bulkCreate(qrows);
    }

    const full = await Questionnaire.findByPk(q.id, { include: [{ model: Question, as: 'questions' }] });
    res.json(full);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update questionnaire' });
  }
});

// POST /api/questionnaires/:id/publish
router.post('/:id/publish', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const q = await Questionnaire.findByPk(req.params.id);
    if (!q) return res.status(404).json({ error: 'Not found' });

    // Deactivate other questionnaires for same campaign
    if (q.campaign_id) {
      await Questionnaire.update({ is_active: false }, { where: { campaign_id: q.campaign_id } });
    }
    await q.update({ is_active: true, published_at: new Date(), version: q.version + 1 });

    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'PUBLISH_QUESTIONNAIRE', entity: 'Questionnaire', entityId: q.id, ipAddress: req.ip });
    res.json({ success: true, message: 'Questionnaire published successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to publish' });
  }
});

// DELETE /api/questionnaires/:id
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const q = await Questionnaire.findByPk(req.params.id);
    if (!q) return res.status(404).json({ error: 'Not found' });
    await Question.destroy({ where: { questionnaire_id: q.id } });
    await q.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// POST /api/questionnaires/:id/import-questions (CSV/Excel bulk import)
router.post('/:id/import-questions', authMiddleware, requireRole('admin', 'manager'), upload.single('file'), async (req, res) => {
  try {
    const q = await Questionnaire.findByPk(req.params.id);
    if (!q) return res.status(404).json({ error: 'Questionnaire not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const questions = rows.map((row, i) => ({
      questionnaire_id: q.id,
      text: row['question_text'] || row['text'] || '',
      question_type: row['question_type'] || 'open_ended',
      expected_answers: row['expected_answers']
        ? String(row['expected_answers']).split('|').map(s => s.trim())
        : [],
      order_index: row['order'] ?? i,
      is_active: true,
    })).filter(r => r.text);

    await Question.bulkCreate(questions);
    res.json({ imported: questions.length });
  } catch (err) {
    res.status(500).json({ error: 'Import failed' });
  }
});

module.exports = router;
