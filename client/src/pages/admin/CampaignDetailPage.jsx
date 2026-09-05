import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import api from '../../api/client';
import { UploadCloud, Phone, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CampaignDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [tab, setTab]           = useState('numbers'); // numbers | settings
  const [numbers, setNumbers]   = useState('');
  const [language, setLanguage] = useState('English');
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [uploading, setUploading]= useState(false);

  useEffect(() => {
    api.get(`/campaigns/${id}`).then(r => setCampaign(r.data)).catch(() => toast.error('Campaign not found'));
  }, [id]);

  async function handlePreview() {
    try {
      setUploading(true);
      const fd = new FormData();
      if (file) { fd.append('file', file); }
      else { fd.append('numbers', numbers); }
      fd.append('language', language);
      fd.append('preview', 'true');
      const { data } = await api.post(`/campaigns/${id}/numbers`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreview(data);
    } catch { toast.error('Preview failed'); }
    finally { setUploading(false); }
  }

  async function handleSubmit() {
    try {
      setUploading(true);
      const fd = new FormData();
      if (file) { fd.append('file', file); }
      else { fd.append('numbers', numbers); }
      fd.append('language', language);
      const { data } = await api.post(`/campaigns/${id}/numbers`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`✅ ${data.inserted} numbers added. ${data.invalid} invalid skipped.`);
      setPreview(null);
      setNumbers('');
      setFile(null);
      setCampaign(c => ({ ...c, total_numbers: c.total_numbers + data.inserted }));
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  }

  if (!campaign) return (
    <AdminLayout title="Campaign Detail">
      <div style={{ color: 'var(--color-muted)', textAlign: 'center', padding: 60 }}>Loading…</div>
    </AdminLayout>
  );

  return (
    <AdminLayout title={campaign.name} subtitle={`Campaign · ${campaign.status} · ${campaign.language}`}>
      <button className="btn-ghost" style={{ marginBottom: 20 }} onClick={() => navigate('/admin/campaigns')}>
        <ArrowLeft size={14} strokeWidth={1.75} /> Back to Campaigns
      </button>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Numbers', value: campaign.total_numbers },
          { label: 'Dialed',        value: campaign.dialed_count },
          { label: 'Pending',       value: Math.max(0, campaign.total_numbers - campaign.dialed_count) },
          { label: 'Language',      value: campaign.language },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Upload Numbers */}
      <div className="card" style={{ padding: 28 }}>
        <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 6 }}>Add Phone Numbers</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 24 }}>
          Paste phone numbers (one per line or comma-separated), or upload a CSV/Excel file.<br />
          Numbers are queued only — the external AI calling engine will dial them.
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Language Override</label>
          <select className="input" style={{ width: 200 }} value={language} onChange={e => setLanguage(e.target.value)}>
            <option>English</option><option>Hindi</option><option>Marathi</option><option>Tamil</option><option>Telugu</option><option>Other</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Paste */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Paste Numbers</label>
            <textarea
              className="input"
              rows={8}
              placeholder="+91-9876543210&#10;+91-9123456789&#10;9000000001, 9000000002"
              value={numbers}
              onChange={e => { setNumbers(e.target.value); setFile(null); setPreview(null); }}
              style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
            />
          </div>

          {/* Upload */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Or Upload CSV/Excel</label>
            <label htmlFor="numFile" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 10, padding: '40px 20px', border: '2px dashed var(--color-primary-ring)', borderRadius: 12,
              cursor: 'pointer', background: 'var(--color-primary-light)', minHeight: 162, textAlign: 'center',
            }}>
              <UploadCloud size={32} strokeWidth={1.75} color="var(--color-primary)" style={{ opacity: 0.8 }} />
              <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>
                {file ? file.name : 'Click or drag a CSV / XLSX file here'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                Column A: Phone Number · Column B: Language (optional)
              </span>
            </label>
            <input id="numFile" type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
              onChange={e => { setFile(e.target.files[0]); setNumbers(''); setPreview(null); }} />
          </div>
        </div>

        {/* Preview */}
        {preview && (
          <div style={{
            marginTop: 20, padding: 16, borderRadius: 12,
            background: (preview.invalid > 0 || preview.duplicates > 0) ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
            border: `1px solid ${(preview.invalid > 0 || preview.duplicates > 0) ? 'var(--color-warning-border)' : 'var(--color-success-border)'}`,
          }}>
            <div style={{ display: 'flex', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: 14 }}>
                {preview.valid} valid numbers
              </span>
              {preview.duplicates > 0 && (
                <span style={{ color: 'var(--color-warning)', fontWeight: 700, fontSize: 14 }}>
                  {preview.duplicates} duplicates removed
                </span>
              )}
              {preview.invalid > 0 && (
                <span style={{ color: 'var(--color-danger)', fontWeight: 700, fontSize: 14 }}>
                  {preview.invalid} invalid (will be skipped)
                </span>
              )}
            </div>
            {preview.invalid_samples?.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Invalid samples: {preview.invalid_samples.join(', ')}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="btn-secondary" onClick={handlePreview} disabled={uploading || (!numbers && !file)}>
            <Check size={14} strokeWidth={1.75} /> Preview & Validate
          </button>
          {preview && (
            <button className="btn-primary" onClick={handleSubmit} disabled={uploading || preview.valid === 0}>
              <Phone size={14} strokeWidth={1.75} /> Confirm & Queue {preview.valid} Numbers
            </button>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
