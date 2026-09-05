import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../api/client';
import { Plus, Trash2, Copy, ShieldCheck, AlertCircle, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';

export default function IntegrationsPage() {
  const [keys, setKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchKeys(); }, []);

  async function fetchKeys() {
    try { const { data } = await api.get('/api-keys'); setKeys(data); }
    catch { toast.error('Failed to load API keys'); }
  }

  async function generateKey(e) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/api-keys', { name: newKeyName });
      setGeneratedKey(data);
      setNewKeyName('');
      fetchKeys();
    } catch { toast.error('Failed to generate key'); }
    finally { setLoading(false); }
  }

  async function revokeKey(id) {
    if (!window.confirm('Revoke this API key? Any AI model using it will stop working.')) return;
    try {
      await api.delete(`/api-keys/${id}`);
      toast.success('Key revoked');
      fetchKeys();
    } catch { toast.error('Revoke failed'); }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied!'));
  }

  return (
    <AdminLayout title="Integrations" subtitle="API keys for connecting your AI calling model">
      {/* Architecture diagram */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Terminal size={16} strokeWidth={1.75} color="var(--color-primary)" />
          <span>Integration Pipeline</span>
        </div>
        <div style={{
          fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-primary)',
          background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 20, lineHeight: 2, overflowX: 'auto',
        }}>
          <pre style={{ margin: 0 }}>{`Website queues numbers (POST /api/campaigns/:id/numbers)
    │
    ▼
AI Model pulls numbers  (GET /api/campaigns/:id/next-numbers)   [X-API-Key]
AI Model pulls questions (GET /api/campaigns/:id/questionnaire)  [X-API-Key]
    │
    ▼ (makes the actual call)
    │
    ▼
AI Model posts call-started  (POST /api/webhooks/call-started)  [X-API-Key]
    │
    ▼ (call happens externally)
    │
    ▼
AI Model posts call-ended    (POST /api/webhooks/call-ended)    [X-API-Key]
AI Model posts classification (POST /api/webhooks/classification) [X-API-Key]
    │
    ▼
Dashboard updates in real-time  (GET /api/stats/overview polls every 30s)`}</pre>
        </div>
      </div>

      {/* Show newly generated key */}
      {generatedKey && (
        <div style={{
          padding: 20, borderRadius: 'var(--radius-lg)', marginBottom: 24,
          background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ShieldCheck size={16} strokeWidth={1.75} color="var(--color-success)" />
            <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>API Key Generated — Save it now!</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 16px' }}>
            <code style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>{generatedKey.key}</code>
            <button className="btn-ghost" onClick={() => copyToClipboard(generatedKey.key)} style={{ flexShrink: 0 }}>
              <Copy size={14} strokeWidth={1.75} /> Copy
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} strokeWidth={1.75} /> This key will NOT be shown again. Copy it now and store it securely.
          </p>
          <button className="btn-ghost" onClick={() => setGeneratedKey(null)} style={{ marginTop: 8 }}>Dismiss</button>
        </div>
      )}

      {/* Generate new key */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 16 }}>Generate New API Key</div>
        <form onSubmit={generateKey} style={{ display: 'flex', gap: 12 }}>
          <input
            required className="input" style={{ flex: 1 }}
            placeholder="Key name (e.g. Production AI Model)"
            value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={loading} style={{ flexShrink: 0 }}>
            <Plus size={14} strokeWidth={1.75} /> {loading ? 'Generating…' : 'Generate Key'}
          </button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 10 }}>
          Send this key in the <code style={{ color: 'var(--color-primary)', fontWeight: 600 }}>X-API-Key</code> header on all webhook calls.
        </p>
      </div>

      {/* Existing keys */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
          Active API Keys ({keys.filter(k => k.is_active).length})
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Prefix</th><th>Created</th><th>Last Used</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-secondary)' }}>No API keys yet. Generate one above.</td></tr>
            ) : keys.map(k => (
              <tr key={k.id}>
                <td style={{ fontWeight: 500 }}>{k.name}</td>
                <td><code style={{ fontSize: 12, color: 'var(--color-primary)' }}>{k.key_prefix}…</code></td>
                <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{new Date(k.created_at).toLocaleDateString()}</td>
                <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Never'}</td>
                <td>
                  {k.is_active
                    ? <span className="badge badge-green">Active</span>
                    : <span className="badge badge-red">Revoked</span>}
                </td>
                <td>
                  {k.is_active && (
                    <button className="btn-ghost" style={{ padding: '5px 10px', color: 'var(--color-danger)' }} onClick={() => revokeKey(k.id)}>
                      <Trash2 size={13} strokeWidth={1.75} /> Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Endpoint reference */}
      <div className="card" style={{ padding: 24, marginTop: 24 }}>
        <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 16 }}>Webhook Endpoint Reference</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { method: 'POST', url: '/api/webhooks/call-started',    desc: 'Notify when AI starts a call',             auth: 'X-API-Key' },
            { method: 'POST', url: '/api/webhooks/call-ended',      desc: 'Update call with outcome & transcript',    auth: 'X-API-Key' },
            { method: 'POST', url: '/api/webhooks/classification',  desc: 'Post AI classification result',            auth: 'X-API-Key' },
            { method: 'GET',  url: '/api/campaigns/:id/next-numbers', desc: 'Fetch next batch of pending numbers',    auth: 'X-API-Key' },
            { method: 'GET',  url: '/api/campaigns/:id/questionnaire','desc': 'Fetch active questionnaire + expected answers', auth: 'X-API-Key' },
            { method: 'POST', url: '/api/followups',                 desc: 'Create a follow-up entry',                auth: 'X-API-Key or JWT' },
          ].map(ep => (
            <div key={ep.url} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
              background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
              flexWrap: 'wrap',
            }}>
              <span style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                background: ep.method === 'GET' ? 'var(--color-info-bg)' : 'var(--color-primary-light)',
                color: ep.method === 'GET' ? 'var(--color-info)' : 'var(--color-primary)',
              }}>{ep.method}</span>
              <code style={{ fontSize: 12, color: 'var(--color-primary)', flex: 1, minWidth: 240 }}>{ep.url}</code>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', flex: 2 }}>{ep.desc}</span>
              <span className="badge badge-gray" style={{ fontSize: 10 }}>{ep.auth}</span>
              <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => copyToClipboard(ep.url)}>
                <Copy size={11} strokeWidth={1.75} />
              </button>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 16 }}>
          Full documentation with curl examples is available at <code style={{ color: 'var(--color-primary)' }}>/docs/AI_MODEL_INTEGRATION.md</code> in the repository.
        </p>
      </div>
    </AdminLayout>
  );
}
