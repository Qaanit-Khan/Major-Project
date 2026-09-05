import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../api/client';
import { Plus, Download, ChevronRight, Activity, Phone, CheckCircle, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function StatusBadge({ s }) {
  const map = { active: 'badge-green', draft: 'badge-gray', paused: 'badge-amber', completed: 'badge-blue' };
  return <span className={`badge ${map[s] || 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{s}</span>;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [form, setForm] = useState({ name: '', description: '', language: 'English' });
  const navigate = useNavigate();

  async function fetchCampaigns() {
    setLoading(true);
    try { const { data } = await api.get('/campaigns'); setCampaigns(data); }
    catch { toast.error('Failed to load campaigns'); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchCampaigns(); }, []);

  async function createCampaign(e) {
    e.preventDefault();
    try {
      const { data } = await api.post('/campaigns', form);
      toast.success('Campaign created!');
      setShowNew(false);
      setForm({ name: '', description: '', language: 'English' });
      setCampaigns(c => [data, ...c]);
    } catch { toast.error('Failed to create campaign'); }
  }

  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  async function handleExport(format = 'xlsx') {
    try {
      setExporting(true);
      setShowExportMenu(false);
      const response = await api.get('/campaigns/export', {
        params: { format },
        responseType: 'blob',
      });
      const blob = new Blob([response.data]);
      const ext = format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaigns_export_${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Exported campaigns (${format.toUpperCase()})`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <AdminLayout title="Campaigns" subtitle="Manage your calling campaigns">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20, gap: 10 }}>
        <div style={{ position: 'relative' }}>
          <button
            className="btn-ghost"
            onClick={() => setShowExportMenu(v => !v)}
            disabled={exporting}
          >
            <Download size={14} strokeWidth={1.75} /> {exporting ? 'Exporting…' : 'Export'}
          </button>
          {showExportMenu && (
            <div
              className="card"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 6px)',
                zIndex: 20,
                minWidth: 140,
                padding: 6,
                boxShadow: '0 8px 24px rgba(43,35,33,0.12)',
              }}
            >
              <button
                className="btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 12 }}
                onClick={() => handleExport('csv')}
              >
                CSV (.csv)
              </button>
              <button
                className="btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 12 }}
                onClick={() => handleExport('xlsx')}
              >
                Excel (.xlsx)
              </button>
              <button
                className="btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 12 }}
                onClick={() => handleExport('pdf')}
              >
                PDF (.pdf)
              </button>
            </div>
          )}
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={15} strokeWidth={1.75} /> New Campaign
        </button>
      </div>

      {/* New Campaign Modal */}
      {showNew && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 20 }}>Create New Campaign</div>
          <form onSubmit={createCampaign} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Campaign Name *</label>
              <input required className="input" placeholder="e.g. Q4 Insurance Campaign" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Description</label>
              <textarea className="input" rows={3} placeholder="Optional description…" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Primary Language</label>
              <select className="input" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                <option>English</option><option>Hindi</option><option>Marathi</option><option>Tamil</option><option>Telugu</option><option>Other</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn-primary">Create Campaign</button>
              <button type="button" className="btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Campaign Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {loading ? (
          <div style={{ color: 'var(--color-text-secondary)', gridColumn: '1/-1', textAlign: 'center', padding: 48 }}>Loading campaigns…</div>
        ) : campaigns.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', gridColumn: '1/-1' }}>
            <Activity size={36} strokeWidth={1.75} style={{ opacity: 0.3, marginBottom: 12 }} color="var(--color-primary)" />
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>No campaigns yet. Create your first campaign.</p>
          </div>
        ) : campaigns.map(c => (
          <div key={c.id} className="card" style={{ padding: 20, cursor: 'pointer' }}
            onClick={() => navigate(`/admin/campaigns/${c.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ flex: 1, marginRight: 10 }}>
                <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{c.description || 'No description'}</div>
              </div>
              <StatusBadge s={c.status} />
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Phone size={13} strokeWidth={1.75} /> {c.total_numbers} numbers
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={13} strokeWidth={1.75} /> {c.dialed_count} dialed
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Globe size={13} strokeWidth={1.75} /> {c.language}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{new Date(c.created_at).toLocaleDateString()}</span>
              <ChevronRight size={16} strokeWidth={1.75} color="var(--color-text-tertiary)" />
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
