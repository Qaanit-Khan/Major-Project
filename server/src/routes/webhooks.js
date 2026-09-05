const express = require('express');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const { Call, CallClassification, Lead, PhoneNumber } = require('../models');
const { encrypt } = require('../utils/encryption');

const router = express.Router();

// All webhook routes require API key auth
router.use(apiKeyAuth);

/**
 * POST /api/webhooks/call-started
 * Payload: { phone_number, campaign_id, language, started_at }
 * Creates a new in-progress call record.
 */
router.post('/call-started', async (req, res) => {
  try {
    const { phone_number, campaign_id, language, started_at, phone_number_id } = req.body;
    if (!phone_number) return res.status(400).json({ error: 'phone_number is required' });

    const call = await Call.create({
      campaign_id: campaign_id || null,
      phone_number_id: phone_number_id || null,
      phone_encrypted: encrypt(phone_number),
      language: language || 'English',
      status: 'in_progress',
      started_at: started_at ? new Date(started_at) : new Date(),
    });

    // Mark phone number as dialing if id provided
    if (phone_number_id) {
      await PhoneNumber.update({ status: 'dialing' }, { where: { id: phone_number_id } });
    }

    res.status(201).json({ call_id: call.id, message: 'Call record created.' });
  } catch (err) {
    console.error('call-started webhook error:', err);
    res.status(500).json({ error: 'Failed to create call record' });
  }
});

/**
 * POST /api/webhooks/call-ended
 * Payload: { call_id, duration_seconds, ended_at, recording_url, transcript_text, call_status }
 * Updates the call record with final outcome.
 */
router.post('/call-ended', async (req, res) => {
  try {
    const { call_id, duration_seconds, ended_at, recording_url, transcript_text, call_status } = req.body;
    if (!call_id) return res.status(400).json({ error: 'call_id is required' });

    const call = await Call.findByPk(call_id);
    if (!call) return res.status(404).json({ error: 'Call not found' });

    await call.update({
      status: call_status || 'completed',
      duration_seconds: duration_seconds || null,
      ended_at: ended_at ? new Date(ended_at) : new Date(),
      recording_url: recording_url || null,
      transcript_encrypted: transcript_text ? encrypt(transcript_text) : null,
    });

    // Mark phone number as done
    if (call.phone_number_id) {
      await PhoneNumber.update({ status: 'done' }, { where: { id: call.phone_number_id } });
    }

    res.json({ message: 'Call record updated.' });
  } catch (err) {
    console.error('call-ended webhook error:', err);
    res.status(500).json({ error: 'Failed to update call record' });
  }
});

/**
 * POST /api/webhooks/classification
 * Payload: { call_id, talk_duration_seconds, detected_keywords[], sentiment_score,
 *            lead_status, lead_score }
 * Populates classification fields. Values are NEVER computed by this app — only stored.
 */
router.post('/classification', async (req, res) => {
  try {
    const {
      call_id,
      talk_duration_seconds,
      detected_keywords,
      sentiment_score,
      lead_status,
      lead_score,
    } = req.body;

    if (!call_id) return res.status(400).json({ error: 'call_id is required' });

    const validLeadStatuses = ['interested', 'not_interested', 'neutral', 'pending'];
    if (lead_status && !validLeadStatuses.includes(lead_status)) {
      return res.status(400).json({ error: `lead_status must be one of: ${validLeadStatuses.join(', ')}` });
    }

    const call = await Call.findByPk(call_id);
    if (!call) return res.status(404).json({ error: 'Call not found' });

    // Upsert classification - strictly store external AI values
    const [classification] = await CallClassification.findOrCreate({
      where: { call_id },
      defaults: {
        call_id,
        talk_duration_seconds: talk_duration_seconds != null ? talk_duration_seconds : null,
        detected_keywords: detected_keywords || [],
        sentiment_score: sentiment_score != null ? sentiment_score : null,
        lead_status: lead_status || 'pending',
        lead_score: lead_score != null ? lead_score : null,
      },
    });

    if (!classification.isNewRecord) {
      await classification.update({
        talk_duration_seconds: talk_duration_seconds != null ? talk_duration_seconds : classification.talk_duration_seconds,
        detected_keywords: detected_keywords || classification.detected_keywords,
        sentiment_score: sentiment_score != null ? sentiment_score : classification.sentiment_score,
        lead_status: lead_status || classification.lead_status,
        lead_score: lead_score != null ? lead_score : classification.lead_score,
      });
    }

    // Upsert lead record - associate with call
    const phone = call.phone_encrypted;
    const resolvedQuality = req.body.lead_quality || req.body.lead_category || mapLeadStatus(lead_score);

    const [lead] = await Lead.findOrCreate({
      where: { call_id },
      defaults: {
        call_id,
        campaign_id: call.campaign_id,
        phone_encrypted: phone,
        lead_status: resolvedQuality,
        lead_score: lead_score != null ? lead_score : null,
        interested_status: lead_status || 'pending',
        language: call.language,
        last_call_date: new Date(),
      },
    });

    if (!lead.isNewRecord) {
      const updates = {
        lead_score: lead_score != null ? lead_score : lead.lead_score,
        interested_status: lead_status || lead.interested_status,
        last_call_date: new Date(),
      };
      if (lead.status_override_source !== 'manual') {
        updates.lead_status = resolvedQuality;
      }
      await lead.update(updates);
    }

    res.json({ message: 'Classification stored.', classification_id: classification.id, lead_id: lead.id });
  } catch (err) {
    console.error('classification webhook error:', err);
    res.status(500).json({ error: 'Failed to store classification' });
  }
});

function mapLeadStatus(score) {
  if (score === undefined || score === null) return 'Warm';
  if (score >= 75) return 'Hot';
  if (score >= 40) return 'Warm';
  return 'Cold';
}

module.exports = router;
