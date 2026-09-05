# ARB Softech AI Voice Agent — AI Model Integration Guide

> **Purpose**: This document is the single source of truth for connecting an external AI
> voice calling engine to the ARB Softech web platform. Every endpoint, webhook, and data
> pipeline is documented here with request/response payloads and curl examples.
>
> **Ground rule**: The website never computes, classifies, or infers any call data.
> All classification fields (`lead_status`, `lead_score`, `sentiment_score`,
> `detected_keywords`, `talk_duration_seconds`) are written **to** this system by the
> external AI model via the webhooks below.

---

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ARB Softech Web Platform                      │
│                                                                       │
│  Admin queues phone numbers                                           │
│  POST /api/campaigns/:id/numbers                                      │
└──────────────────────────────┬────────────────────────────────────────┘
                               │
                               ▼  (AI Model fetches its work queue)
┌─────────────────────────────────────────────────────────────────────┐
│                         External AI Calling Engine                    │
│                                                                       │
│  GET /api/campaigns/:id/next-numbers     [X-API-Key]                 │
│  GET /api/campaigns/:id/questionnaire    [X-API-Key]                 │
│                                                                       │
│  ← (makes the actual voice call externally) →                        │
│                                                                       │
│  POST /api/webhooks/call-started         [X-API-Key]                 │
│  POST /api/webhooks/call-ended           [X-API-Key]                 │
│  POST /api/webhooks/classification       [X-API-Key]                 │
│  POST /api/followups                     [X-API-Key]   (optional)    │
└──────────────────────────────┬────────────────────────────────────────┘
                               │
                               ▼  (Dashboard reads data)
┌─────────────────────────────────────────────────────────────────────┐
│  GET /api/stats/overview  →  Stat cards update every 30s             │
│  GET /api/calls           →  Calls table                             │
│  GET /api/leads           →  Leads page                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Authentication

All AI model endpoints use API key authentication:

```
Header: X-API-Key: arb_<your_48_char_hex_key>
```

Generate API keys from the admin UI at `/admin/settings/integrations` or use the
`POST /api/api-keys` endpoint (requires admin JWT).

JWT-authenticated endpoints (admin/staff access) use:
```
Header: Authorization: Bearer <jwt_token>
```

---

## Endpoint Reference

### 1. Fetch Next Numbers to Dial

```
GET /api/campaigns/:campaign_id/next-numbers?limit=10
Auth: X-API-Key
```

**Description**: Returns the next batch of pending phone numbers for the AI model to dial.
Automatically marks fetched numbers as `dialing`.

**Response**:
```json
{
  "campaign_id": "uuid",
  "questionnaire_id": "uuid",
  "numbers": [
    { "id": "uuid", "phone": "+919876543210", "language": "Hindi" },
    { "id": "uuid", "phone": "+919123456789", "language": "English" }
  ]
}
```

**curl**:
```bash
curl -X GET "http://localhost:5000/api/campaigns/CAMPAIGN_ID/next-numbers?limit=10" \
  -H "X-API-Key: arb_your_api_key_here"
```

---

### 2. Fetch Active Questionnaire + Expected Answers

```
GET /api/campaigns/:campaign_id/questionnaire
Auth: X-API-Key
```

**Description**: Returns the published questionnaire for this campaign, including each
question's expected answer(s). The AI model uses these to guide the conversation and
score responses. This app does NOT process the answers — that logic belongs to the AI model.

**Response**:
```json
{
  "questionnaire_id": "uuid",
  "name": "Insurance Discovery Q1 2025",
  "version": 3,
  "questions": [
    {
      "id": "uuid",
      "text": "Are you currently covered by health insurance?",
      "type": "yes_no",
      "expected_answers": ["yes", "no", "partially"],
      "order": 0
    },
    {
      "id": "uuid",
      "text": "What is your monthly budget for insurance?",
      "type": "open_ended",
      "expected_answers": ["under 500", "500-1000", "above 1000"],
      "order": 1
    }
  ]
}
```

**curl**:
```bash
curl -X GET "http://localhost:5000/api/campaigns/CAMPAIGN_ID/questionnaire" \
  -H "X-API-Key: arb_your_api_key_here"
```

---

### 3. Webhook — Call Started

```
POST /api/webhooks/call-started
Auth: X-API-Key
Content-Type: application/json
```

**Description**: Call this immediately when the AI model begins dialing a number.
Creates an `in_progress` call record in the database.

**Request body**:
```json
{
  "phone_number": "+919876543210",
  "campaign_id": "uuid-of-campaign",
  "language": "Hindi",
  "started_at": "2025-01-15T10:30:00Z",
  "phone_number_id": "uuid-of-phone-record"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `phone_number` | string | ✅ | The E.164 phone number being called |
| `campaign_id` | uuid | optional | Campaign this call belongs to |
| `language` | string | optional | Language of the call (English/Hindi/Marathi) |
| `started_at` | ISO datetime | optional | Defaults to server time |
| `phone_number_id` | uuid | optional | ID from `next-numbers` response |

**Response** `201`:
```json
{ "call_id": "uuid-of-new-call", "message": "Call record created." }
```

**curl**:
```bash
curl -X POST "http://localhost:5000/api/webhooks/call-started" \
  -H "X-API-Key: arb_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+919876543210",
    "campaign_id": "CAMPAIGN_UUID",
    "language": "Hindi",
    "started_at": "2025-01-15T10:30:00Z"
  }'
```

---

### 4. Webhook — Call Ended

```
POST /api/webhooks/call-ended
Auth: X-API-Key
Content-Type: application/json
```

**Description**: Call this when the AI conversation ends. Updates the call record with
final outcome, duration, transcript, and recording URL.

**Request body**:
```json
{
  "call_id": "uuid-from-call-started-response",
  "duration_seconds": 127,
  "ended_at": "2025-01-15T10:32:07Z",
  "recording_url": "https://storage.example.com/calls/abc123.mp3",
  "transcript_text": "Agent: Hello, is this Mr Sharma? ... Customer: Yes, who is this?...",
  "call_status": "completed"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `call_id` | uuid | ✅ | ID returned from call-started webhook |
| `duration_seconds` | integer | optional | Total call duration in seconds |
| `ended_at` | ISO datetime | optional | Defaults to server time |
| `recording_url` | string | optional | Public/presigned URL to MP3/WAV recording |
| `transcript_text` | string | optional | Full conversation transcript |
| `call_status` | enum | optional | `completed`, `failed`, `no_answer`, `busy`, `voicemail` |

**Response** `200`:
```json
{ "message": "Call record updated." }
```

**curl**:
```bash
curl -X POST "http://localhost:5000/api/webhooks/call-ended" \
  -H "X-API-Key: arb_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "call_id": "CALL_UUID",
    "duration_seconds": 127,
    "recording_url": "https://storage.example.com/rec.mp3",
    "transcript_text": "Full transcript here...",
    "call_status": "completed"
  }'
```

---

### 5. Webhook — Classification Result ⭐ Most Important

```
POST /api/webhooks/classification
Auth: X-API-Key
Content-Type: application/json
```

**Description**: Post the AI model's analysis of the completed call. This is the core
data that populates the dashboard's "Interested vs Not Interested" cards and charts.
**This platform never computes these values — they come exclusively from the AI model.**

**Request body**:
```json
{
  "call_id": "uuid-from-call-started-response",
  "talk_duration_seconds": 98,
  "detected_keywords": ["insurance", "budget", "interested", "callback"],
  "sentiment_score": 0.72,
  "lead_status": "interested",
  "lead_score": 85.5
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `call_id` | uuid | ✅ | The call being classified |
| `talk_duration_seconds` | integer | optional | Actual talk time (vs. total duration) |
| `detected_keywords` | string[] | optional | Array of detected topic keywords |
| `sentiment_score` | float | optional | Sentiment value, e.g. -1.0 to 1.0 |
| `lead_status` | enum | optional | `"interested"` \| `"not_interested"` \| `"neutral"` \| `"pending"` |
| `lead_score` | float | optional | Lead quality score, e.g. 0–100 |

**`lead_status` enum values**:
- `"interested"` — Counted in "Interested Customers" dashboard card (green)
- `"not_interested"` — Counted in "Not Interested" dashboard card (red)
- `"neutral"` — Neither
- `"pending"` — Default before AI posts

**Response** `200`:
```json
{
  "message": "Classification stored.",
  "classification_id": "uuid",
  "lead_id": "uuid"
}
```

**curl**:
```bash
curl -X POST "http://localhost:5000/api/webhooks/classification" \
  -H "X-API-Key: arb_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "call_id": "CALL_UUID",
    "talk_duration_seconds": 98,
    "detected_keywords": ["interested", "callback"],
    "sentiment_score": 0.72,
    "lead_status": "interested",
    "lead_score": 85.5
  }'
```

---

### 6. Create Follow-up (Optional)

```
POST /api/followups
Auth: X-API-Key  OR  Bearer JWT
Content-Type: application/json
```

**Description**: The AI model can schedule a follow-up call automatically when it detects
the caller requested a callback. Staff can also call this endpoint with a JWT token.

**Request body**:
```json
{
  "lead_id": "uuid-optional",
  "call_id": "uuid-optional",
  "campaign_id": "uuid-optional",
  "scheduled_at": "2025-01-16T14:00:00Z",
  "notes": "Customer requested callback tomorrow at 2pm",
  "created_by_type": "ai_model"
}
```

**Response** `201`:
```json
{ "id": "uuid", "scheduled_at": "2025-01-16T14:00:00Z", "status": "pending" }
```

**curl**:
```bash
curl -X POST "http://localhost:5000/api/followups" \
  -H "X-API-Key: arb_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "call_id": "CALL_UUID",
    "scheduled_at": "2025-01-16T14:00:00Z",
    "notes": "Requested callback",
    "created_by_type": "ai_model"
  }'
```

---

## Data Types & Enums Reference

| Field | Type | Allowed Values |
|---|---|---|
| `lead_status` | enum | `interested`, `not_interested`, `neutral`, `pending` |
| `call_status` | enum | `completed`, `failed`, `no_answer`, `busy`, `voicemail`, `in_progress` |
| `language` | string | `English`, `Hindi`, `Marathi`, `Tamil`, `Telugu`, `Other` |
| `lead_score` | float | `0.0` – `100.0` |
| `sentiment_score` | float | any float (suggest `-1.0` to `1.0`) |

---

## Codebase File Locations

| Endpoint | File |
|---|---|
| `POST /api/webhooks/call-started` | `server/src/routes/webhooks.js` |
| `POST /api/webhooks/call-ended` | `server/src/routes/webhooks.js` |
| `POST /api/webhooks/classification` | `server/src/routes/webhooks.js` |
| `GET /api/campaigns/:id/next-numbers` | `server/src/routes/campaigns.js` |
| `GET /api/campaigns/:id/questionnaire` | `server/src/routes/campaigns.js` |
| `POST /api/followups` | `server/src/routes/followups.js` |
| API key auth middleware | `server/src/middleware/apiKeyAuth.js` |
| Call model | `server/src/models/Call.js` |
| Classification model | `server/src/models/CallClassification.js` |
| Encryption utilities | `server/src/utils/encryption.js` |

---

## Notes

- Phone numbers and call transcripts are **AES-256 encrypted at rest** in the database.
  The API returns decrypted values to authenticated clients.
- The classification webhook can be called **multiple times** for the same `call_id` —
  it will update the existing record (upsert behavior).
- The `next-numbers` endpoint marks returned numbers as `dialing`. If a call fails before
  `call-ended` is posted, mark the phone number as `failed` by updating its status via a
  direct API call (or re-post `call-ended` with `call_status: "failed"`).
- All timestamps should be **ISO 8601 UTC** format: `YYYY-MM-DDTHH:mm:ssZ`.
