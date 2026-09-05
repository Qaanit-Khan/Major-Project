const express = require('express');
const { Op, fn, col } = require('sequelize');
const { authMiddleware } = require('../middleware/auth');
const { Call, CallClassification, Lead, Followup } = require('../models');

const router = express.Router();

function getDateRange(range = '7days', from, to) {
  const now = new Date();
  let currentStart;
  let currentEnd = now;
  let previousStart;
  let previousEnd;

  if (range === 'today') {
    currentStart = new Date(now);
    currentStart.setHours(0, 0, 0, 0);

    previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 1);
    previousEnd = new Date(currentStart);
  } else if (range === '7days') {
    currentStart = new Date(now.getTime() - 7 * 86400000);
    previousStart = new Date(now.getTime() - 14 * 86400000);
    previousEnd = currentStart;
  } else if (range === '30days') {
    currentStart = new Date(now.getTime() - 30 * 86400000);
    previousStart = new Date(now.getTime() - 60 * 86400000);
    previousEnd = currentStart;
  } else if (range === 'custom' && from && to) {
    currentStart = new Date(from);
    currentEnd = new Date(to);
    const diff = currentEnd.getTime() - currentStart.getTime();
    previousStart = new Date(currentStart.getTime() - diff);
    previousEnd = currentStart;
  } else {
    currentStart = new Date(now.getTime() - 7 * 86400000);
    previousStart = new Date(now.getTime() - 14 * 86400000);
    previousEnd = currentStart;
  }

  return {
    current: { [Op.between]: [currentStart, currentEnd] },
    previous: { [Op.between]: [previousStart, previousEnd] },
  };
}

// GET /api/stats/overview?range=today|7days|30days|custom&from=&to=
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const { range, from, to } = req.query;
    const { current, previous } = getDateRange(range, from, to);

    const [
      totalCalls,
      successfulCalls,
      interested,
      notInterested,
      leadsCount,
      shortlisted,
      followUps,
      pendingCalls,
      prevInterested,
      prevNotInterested,
    ] = await Promise.all([
      Call.count({ where: { created_at: current } }),
      Call.count({ where: { created_at: current, status: 'completed' } }),
      CallClassification.count({ where: { created_at: current, lead_status: 'interested' } }),
      CallClassification.count({ where: { created_at: current, lead_status: 'not_interested' } }),
      Lead.count({ where: { created_at: current } }),
      Lead.count({ where: { created_at: current, shortlisted: true } }),
      Followup.count({ where: { created_at: current, status: 'pending' } }),
      Call.count({ where: { created_at: current, status: 'in_progress' } }),
      CallClassification.count({ where: { created_at: previous, lead_status: 'interested' } }),
      CallClassification.count({ where: { created_at: previous, lead_status: 'not_interested' } }),
    ]);

    // Trend calculation vs previous equivalent period
    const calcTrend = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    res.json({
      totalCalls,
      successfulCalls,
      interested,
      notInterested,
      leadsCount,
      shortlisted,
      followUps,
      pendingCalls,
      interestedTrend: calcTrend(interested, prevInterested),
      notInterestedTrend: calcTrend(notInterested, prevNotInterested),
    });
  } catch (err) {
    console.error('Stats overview error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/stats/call-activity?range=today|7days|30days|custom&from=&to=
router.get('/call-activity', authMiddleware, async (req, res) => {
  try {
    const { range, from, to } = req.query;
    const { current } = getDateRange(range, from, to);

    const calls = await Call.findAll({
      where: { created_at: current },
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('COUNT', col('id')), 'count'],
      ],
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']],
      raw: true,
    });

    res.json(calls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch call activity' });
  }
});

// GET /api/stats/languages?range=today|7days|30days|custom&from=&to=
router.get('/languages', authMiddleware, async (req, res) => {
  try {
    const { range, from, to } = req.query;
    const where = range ? { created_at: getDateRange(range, from, to).current } : {};

    const data = await Call.findAll({
      where,
      attributes: ['language', [fn('COUNT', col('id')), 'count']],
      group: ['language'],
      raw: true,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch language stats' });
  }
});

// GET /api/stats/lead-status?range=today|7days|30days|custom&from=&to=
router.get('/lead-status', authMiddleware, async (req, res) => {
  try {
    const { range, from, to } = req.query;
    const where = range ? { created_at: getDateRange(range, from, to).current } : {};

    const data = await Lead.findAll({
      where,
      attributes: ['lead_status', [fn('COUNT', col('id')), 'count']],
      group: ['lead_status'],
      raw: true,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lead status stats' });
  }
});

module.exports = router;
