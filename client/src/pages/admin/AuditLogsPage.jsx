import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../api/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ entity: '', action: '' });

  useEffect(() => { fetchLogs(); }, [page, filter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = { page, limit: 50, ...filter };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const { data } = await api.get('/audit-logs', { params });
      setLogs(data.logs);
      setTotal(data.total);
    } catch { }
    finally { setLoading(false); }
  }

  const totalPages = Math.ceil(total / 50);

  return (
    <AdminLayout title="Audit Logs" subtitle="Track all user actions and data changes">
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input className="input" style={{ width: 160 }} placeholder="Entity (e.g. Lead)"
          value={filter.entity} onChange={e => setFilter(f => ({ ...f, entity: e.target.value }))} />
        <input className="input" style={{ width: 180 }} placeholder="Action (e.g. UPDATE_LEAD)"
          value={filter.action} onChange={e => setFilter(f => ({ ...f, action: e.target.value }))} />
        <button className="btn-primary" onClick={() => { setPage(1); fetchLogs(); }}>Filter</button>
        <button className="btn-ghost" onClick={() => { setFilter({ entity: '', action: '' }); setPage(1); }}>Reset</button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Entity ID</th>
                <th>Old Value</th><th>New Value</th><th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-secondary)' }}>
                  {loading ? 'Loading…' : 'No audit logs found.'}
                </td></tr>
              ) : logs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
                  <td style={{ fontSize: 12 }}>{log.user_email || '—'}</td>
                  <td><span className="badge badge-primary" style={{ fontSize: 10 }}>{log.action}</span></td>
                  <td style={{ fontSize: 12 }}>{log.entity}</td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>
                    {log.entity_id ? log.entity_id.substring(0, 8) + '…' : '—'}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--color-text-secondary)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.old_value ? JSON.stringify(log.old_value) : '—'}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--color-text-secondary)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.new_value ? JSON.stringify(log.new_value) : '—'}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{log.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{total} total entries</span>
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
