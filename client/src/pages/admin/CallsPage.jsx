import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../api/client';
import { Download, X, ChevronLeft, ChevronRight, ArrowUpDown, FileText, Check } from 'lucide-react';
import toast from 'react-hot-toast';

function StatusBadge({ s }) {
  if (s === 'completed') return <span className="badge badge-green">Completed</span>;
  if (s === 'in_progress') return <span className="badge badge-amber badge-in-progress">In Progress</span>;
  if (s === 'failed') return <span className="badge badge-red">Failed</span>;
  if (s === 'busy') return <span className="badge badge-amber">Busy</span>;
  return <span className="badge badge-gray">{s?.replace('_', ' ') || 'unknown'}</span>;
}

function LeadBadge({ s }) {
  if (s === 'interested') return <span className="badge badge-green">Interested</span>;
  if (s === 'not_interested') return <span className="badge badge-red">Not Interested</span>;
  if (s === 'neutral') return <span className="badge badge-gray">Neutral</span>;
  return <span className="badge badge-amber">Pending</span>;
}

export default function CallsPage() {
  const [calls, setCalls] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Quick filter: 'all' | 'interested' | 'not_interested'
  const [quickFilter, setQuickFilter] = useState('all');

  // Sorting
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('DESC');

  // Notes editing in drawer
  const [drawerNote, setDrawerNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [filters, setFilters] = useState({
    language: '',
    status: '',
    lead_status: '',
    from: '',
    to: '',
    search: '',
  });

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 25,
        sort,
        order,
        ...filters,
      };
      if (quickFilter !== 'all') {
        params.quick_filter = quickFilter;
      }
      Object.keys(params).forEach(k => {
        if (params[k] === '' || params[k] === undefined) delete params[k];
      });
      const { data } = await api.get('/calls', { params });
      setCalls(data.calls);
      setTotal(data.total);
    } catch {
      toast.error('Failed to load calls');
    } finally {
      setLoading(false);
    }
  }, [page, filters, quickFilter, sort, order]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  useEffect(() => {
    if (selected) {
      setDrawerNote(selected.notes || '');
    }
  }, [selected]);

  function handleSort(col) {
    if (sort === col) {
      setOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSort(col);
      setOrder('DESC');
    }
    setPage(1);
  }

  async function handleExport(format) {
    try {
      setExporting(true);
      setShowExportMenu(false);
      const params = {
        format,
        sort,
        order,
        ...filters,
      };
      if (quickFilter !== 'all') {
        params.quick_filter = quickFilter;
      }
      Object.keys(params).forEach(k => {
        if (params[k] === '' || params[k] === undefined) delete params[k];
      });

      const response = await api.get('/calls/export', {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const ext = format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calls_export_${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Exported calls (${format.toUpperCase()})`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  async function handleSaveNote() {
    if (!selected) return;
    try {
      setSavingNote(true);
      await api.patch(`/calls/${selected.id}/notes`, { notes: drawerNote });
      setSelected(s => (s ? { ...s, notes: drawerNote } : null));
      setCalls(list => list.map(c => (c.id === selected.id ? { ...c, notes: drawerNote } : c)));
      toast.success('Note saved');
    } catch {
      toast.error('Failed to save note');
    } finally {
      setSavingNote(false);
    }
  }

  const totalPages = Math.ceil(total / 25);

  return (
    <AdminLayout title="Calls" subtitle="All AI voice call records">
      {/* Quick Filter tabs & Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'All Calls', value: 'all' },
            { label: 'Interested Only', value: 'interested' },
            { label: 'Not Interested Only', value: 'not_interested' },
          ].map(tab => (
            <button
              key={tab.value}
              className={quickFilter === tab.value ? 'btn-primary' : 'btn-ghost'}
              style={{ padding: '6px 14px', fontSize: 13 }}
              onClick={() => {
                setQuickFilter(tab.value);
                setPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Export controls */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-ghost"
            onClick={() => setShowExportMenu(v => !v)}
            disabled={exporting}
            style={{ padding: '6px 14px', fontSize: 13 }}
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

      {/* Filter panel */}
      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Search Phone</label>
          <input
            className="input"
            placeholder="Phone number…"
            style={{ width: 150 }}
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && fetchCalls()}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Language</label>
          <select
            className="input"
            style={{ width: 130 }}
            value={filters.language}
            onChange={e => setFilters(f => ({ ...f, language: e.target.value }))}
          >
            <option value="">All</option>
            <option>English</option>
            <option>Hindi</option>
            <option>Marathi</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Status</label>
          <select
            className="input"
            style={{ width: 130 }}
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            <option value="">All</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Lead Status</label>
          <select
            className="input"
            style={{ width: 140 }}
            value={filters.lead_status}
            onChange={e => setFilters(f => ({ ...f, lead_status: e.target.value }))}
          >
            <option value="">All</option>
            <option value="interested">Interested</option>
            <option value="not_interested">Not Interested</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>From</label>
          <input
            type="date"
            className="input"
            style={{ width: 140 }}
            value={filters.from}
            onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>To</label>
          <input
            type="date"
            className="input"
            style={{ width: 140 }}
            value={filters.to}
            onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
          />
        </div>
        <button className="btn-primary" onClick={() => { setPage(1); fetchCalls(); }}>Filter</button>
        <button
          className="btn-ghost"
          onClick={() => {
            setFilters({ language: '', status: '', lead_status: '', from: '', to: '', search: '' });
            setQuickFilter('all');
            setPage(1);
          }}
        >
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('phone_encrypted')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Phone <ArrowUpDown size={11} strokeWidth={1.5} />
                  </div>
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('language')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Language <ArrowUpDown size={11} strokeWidth={1.5} />
                  </div>
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Status <ArrowUpDown size={11} strokeWidth={1.5} />
                  </div>
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('duration_seconds')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Duration <ArrowUpDown size={11} strokeWidth={1.5} />
                  </div>
                </th>
                <th>Lead Score</th>
                <th>Lead Status</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('created_at')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Time <ArrowUpDown size={11} strokeWidth={1.5} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && calls.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-secondary)' }}>
                    Loading…
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-secondary)' }}>
                    No calls found. Awaiting AI model data.
                  </td>
                </tr>
              ) : (
                calls.map(call => (
                  <tr key={call.id} onClick={() => setSelected(call)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{call.phone_number || '—'}</td>
                    <td><span className="badge badge-blue">{call.language}</span></td>
                    <td><StatusBadge s={call.status} /></td>
                    <td style={{ fontSize: 13 }}>
                      {call.duration_seconds
                        ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
                        : '—'}
                    </td>
                    <td>
                      {call.classification?.lead_score != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="progress-bar" style={{ width: 50 }}>
                            <div className="progress-fill" style={{ width: `${call.classification.lead_score}%` }} />
                          </div>
                          <span style={{ fontSize: 11 }}>{call.classification.lead_score}%</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td><LeadBadge s={call.classification?.lead_status} /></td>
                    <td style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      {new Date(call.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{total} total</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn-ghost"
              style={{ padding: '6px 10px' }}
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={14} strokeWidth={1.75} />
            </button>
            <span style={{ fontSize: 13, padding: '6px 12px', color: 'var(--color-text-secondary)' }}>
              {page} / {totalPages || 1}
            </span>
            <button
              className="btn-ghost"
              style={{ padding: '6px 10px' }}
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {/* Call detail drawer */}
      {selected && (
        <>
          <div className="drawer-overlay" onClick={() => setSelected(null)} />
          <div className="drawer">
            <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Call Detail</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                  {selected.phone_number}
                </div>
              </div>
              <button className="btn-ghost-icon" onClick={() => setSelected(null)} style={{ padding: 8 }}>
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <StatusBadge s={selected.status} />
                <LeadBadge s={selected.classification?.lead_status} />
                <span className="badge badge-blue">{selected.language}</span>
              </div>

              {selected.classification?.talk_duration_seconds && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Talk Duration
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>
                    {Math.floor(selected.classification.talk_duration_seconds / 60)}m {selected.classification.talk_duration_seconds % 60}s
                  </div>
                </div>
              )}

              {selected.classification?.lead_score != null && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Lead Score
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="progress-bar" style={{ flex: 1 }}>
                      <div className="progress-fill" style={{ width: `${selected.classification.lead_score}%` }} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>
                      {selected.classification.lead_score}%
                    </div>
                  </div>
                </div>
              )}

              {selected.classification?.sentiment_score != null && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Sentiment Score
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>
                    {selected.classification.sentiment_score}
                  </div>
                </div>
              )}

              {selected.classification?.detected_keywords?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Keywords
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selected.classification.detected_keywords.map(kw => (
                      <span key={kw} className="chip">{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {selected.recording_url && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Recording
                  </div>
                  <audio controls style={{ width: '100%' }}>
                    <source src={selected.recording_url} />
                  </audio>
                </div>
              )}

              {/* Notes section in drawer */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Staff Notes
                </div>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Add internal notes for this call…"
                  value={drawerNote}
                  onChange={e => setDrawerNote(e.target.value)}
                  style={{ resize: 'vertical', width: '100%', marginBottom: 8 }}
                />
                <button
                  className="btn-secondary"
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  <Check size={12} strokeWidth={2} /> {savingNote ? 'Saving…' : 'Save Note'}
                </button>
              </div>

              {selected.transcript_text && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Transcript
                  </div>
                  <div
                    style={{
                      background: 'var(--color-surface-raised)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 14,
                      fontSize: 13,
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.7,
                      maxHeight: 220,
                      overflowY: 'auto',
                    }}
                  >
                    {selected.transcript_text}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
