import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../api/client';
import { Filter, Download, Star, ChevronLeft, ChevronRight, Pencil, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

function LeadStatusBadge({ s }) {
  const map = { Hot: 'badge-red', Warm: 'badge-amber', Cold: 'badge-blue', Unqualified: 'badge-gray' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
}

function InterestedBadge({ s }) {
  if (s === 'interested')     return <span className="badge badge-green">Interested</span>;
  if (s === 'not_interested') return <span className="badge badge-red">Not Interested</span>;
  if (s === 'neutral')        return <span className="badge badge-gray">Neutral</span>;
  return <span className="badge badge-amber">Pending</span>;
}

export default function LeadsPage() {
  const [leads, setLeads]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [editId, setEditId]     = useState(null);
  const [editVal, setEditVal]   = useState({});
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [filters, setFilters] = useState({
    lead_status: '', interested_status: '', shortlisted: '',
    campaign_id: '', language: '', score_min: '', score_max: '',
    from: '', to: '',
  });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25, ...filters };
      Object.keys(params).forEach(k => { if (params[k] === '') delete params[k]; });
      const { data } = await api.get('/leads', { params });
      setLeads(data.leads);
      setTotal(data.total);
    } catch { toast.error('Failed to fetch leads'); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleAll() {
    setSelected(selected.length === leads.length ? [] : leads.map(l => l.id));
  }

  async function bulkShortlist() {
    if (!selected.length) return;
    try {
      await api.post('/leads/bulk-shortlist', { ids: selected });
      toast.success(`${selected.length} leads shortlisted`);
      setSelected([]);
      fetchLeads();
    } catch { toast.error('Shortlist failed'); }
  }

  async function saveEdit(id) {
    try {
      await api.patch(`/leads/${id}`, editVal);
      toast.success('Lead updated (manual override logged)');
      setEditId(null);
      fetchLeads();
    } catch { toast.error('Update failed'); }
  }

  async function handleExport(format = 'xlsx') {
    try {
      setExporting(true);
      setShowExportMenu(false);
      const params = { format, ...filters };
      Object.keys(params).forEach(k => { if (params[k] === '') delete params[k]; });

      const response = await api.get('/leads/export', {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const ext = format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_export_${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Exported leads (${format.toUpperCase()})`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.ceil(total / 25);

  return (
    <AdminLayout title="Leads" subtitle="Qualify, shortlist and export your leads">
      {/* Filter panel */}
      <div className="card" style={{ padding: 20, marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Lead Status</label>
          <select className="input" style={{ width: 140 }} value={filters.lead_status}
            onChange={e => setFilters(f => ({ ...f, lead_status: e.target.value }))}>
            <option value="">All</option>
            <option>Hot</option><option>Warm</option><option>Cold</option><option>Unqualified</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Interested</label>
          <select className="input" style={{ width: 160 }} value={filters.interested_status}
            onChange={e => setFilters(f => ({ ...f, interested_status: e.target.value }))}>
            <option value="">All</option>
            <option value="interested">Interested</option>
            <option value="not_interested">Not Interested</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Shortlisted</label>
          <select className="input" style={{ width: 130 }} value={filters.shortlisted}
            onChange={e => setFilters(f => ({ ...f, shortlisted: e.target.value }))}>
            <option value="">All</option><option value="true">Yes</option><option value="false">No</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Score Min</label>
          <input type="number" className="input" style={{ width: 90 }} placeholder="0" value={filters.score_min}
            onChange={e => setFilters(f => ({ ...f, score_min: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Score Max</label>
          <input type="number" className="input" style={{ width: 90 }} placeholder="100" value={filters.score_max}
            onChange={e => setFilters(f => ({ ...f, score_max: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>From</label>
          <input type="date" className="input" style={{ width: 150 }} value={filters.from}
            onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>To</label>
          <input type="date" className="input" style={{ width: 150 }} value={filters.to}
            onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
        </div>
        <button className="btn-primary" onClick={() => { setPage(1); fetchLeads(); }} style={{ alignSelf: 'flex-end' }}>
          <Filter size={14} strokeWidth={1.75} /> Apply
        </button>
        <button className="btn-ghost" onClick={() => { setFilters({ lead_status:'',interested_status:'',shortlisted:'',campaign_id:'',language:'',score_min:'',score_max:'',from:'',to:'' }); setPage(1); }} style={{ alignSelf: 'flex-end' }}>
          Reset
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
          {selected.length > 0 && (
            <button className="btn-accent" onClick={bulkShortlist}>
              <Star size={14} strokeWidth={1.75} /> Shortlist {selected.length} Leads
            </button>
          )}
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
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={selected.length === leads.length && leads.length > 0} onChange={toggleAll} /></th>
                <th>Name</th><th>Phone</th><th>Lead Status</th><th>Score</th>
                <th>Interested</th><th>Shortlisted</th><th>Follow-up</th><th>Last Call</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-secondary)' }}>
                  {loading ? 'Loading…' : 'No leads found. Awaiting AI classification data.'}
                </td></tr>
              ) : leads.map(lead => (
                <tr key={lead.id}>
                  <td><input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggleSelect(lead.id)} onClick={e => e.stopPropagation()} /></td>
                  <td style={{ fontWeight: 500 }}>{lead.name || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{lead.phone || '—'}</td>
                  <td>
                    {editId === lead.id ? (
                      <select className="input" style={{ width: 100, padding: '4px 8px', fontSize: 12 }}
                        value={editVal.lead_status || lead.lead_status}
                        onChange={e => setEditVal(v => ({ ...v, lead_status: e.target.value }))}>
                        <option>Hot</option><option>Warm</option><option>Cold</option><option>Unqualified</option>
                      </select>
                    ) : <LeadStatusBadge s={lead.lead_status} />}
                  </td>
                  <td>
                    {lead.lead_score != null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="progress-bar" style={{ width: 50 }}>
                          <div className="progress-fill" style={{ width: `${lead.lead_score}%` }} />
                        </div>
                        <span style={{ fontSize: 11 }}>{lead.lead_score}%</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td><InterestedBadge s={lead.interested_status} /></td>
                  <td>
                    {lead.shortlisted
                      ? <span className="badge badge-accent">★ Yes</span>
                      : <span className="badge badge-gray">No</span>}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {lead.last_call_date ? new Date(lead.last_call_date).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    {editId === lead.id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => saveEdit(lead.id)}><Check size={13} strokeWidth={1.75} /></button>
                        <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setEditId(null)}><X size={13} strokeWidth={1.75} /></button>
                      </div>
                    ) : (
                      <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setEditId(lead.id); setEditVal({}); }}>
                        <Pencil size={13} strokeWidth={1.75} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{total} total leads</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-ghost" style={{ padding: '6px 10px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} strokeWidth={1.75} /></button>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '6px 12px' }}>{page} / {totalPages || 1}</span>
            <button className="btn-ghost" style={{ padding: '6px 10px' }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} strokeWidth={1.75} /></button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
