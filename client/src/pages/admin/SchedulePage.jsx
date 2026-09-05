import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../api/client';
import { Plus, Calendar, Clock, CheckCircle, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

function StatusBadge({ s }) {
  const map = { pending: 'badge-amber', done: 'badge-green', cancelled: 'badge-gray' };
  return <span className={`badge ${map[s] || 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{s}</span>;
}

export default function SchedulePage() {
  const [followups, setFollowups]             = useState([]);
  const [dueToday, setDueToday]               = useState(0);
  const [needsFollowupLeads, setNeedsFollowup]= useState([]);
  const [view, setView]                       = useState('list'); // list | create
  const [form, setForm]                       = useState({ scheduled_at: '', notes: '', lead_id: '', call_id: '' });
  const [filter, setFilter]                   = useState('pending'); // 'pending' | 'done' | 'cancelled' | 'needs_followup' | ''
  const [loading, setLoading]                 = useState(false);

  useEffect(() => {
    fetchAll();
  }, [filter]);

  async function fetchAll() {
    setLoading(true);
    try {
      if (filter === 'needs_followup') {
        const [nfRes, dRes] = await Promise.all([
          api.get('/followups/needs-followup'),
          api.get('/followups/due-today'),
        ]);
        setNeedsFollowup(nfRes.data);
        setDueToday(dRes.data.count);
      } else {
        const [fRes, dRes, nfRes] = await Promise.all([
          api.get('/followups', { params: { status: filter || undefined } }),
          api.get('/followups/due-today'),
          api.get('/followups/needs-followup'),
        ]);
        setFollowups(fRes.data);
        setDueToday(dRes.data.count);
        setNeedsFollowup(nfRes.data);
      }
    } catch {
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.post('/followups', form);
      toast.success('Follow-up scheduled!');
      setView('list');
      setForm({ scheduled_at: '', notes: '', lead_id: '', call_id: '' });
      fetchAll();
    } catch {
      toast.error('Failed to schedule follow-up');
    }
  }

  function startScheduleForLead(lead) {
    setForm({
      scheduled_at: '',
      notes: `Follow-up for ${lead.name !== '—' ? lead.name : lead.phone} (Score: ${lead.lead_score != null ? lead.lead_score + '%' : 'N/A'})`,
      lead_id: lead.id,
      call_id: '',
    });
    setView('create');
  }

  async function markDone(id) {
    try {
      await api.patch(`/followups/${id}`, { status: 'done' });
      toast.success('Marked as done');
      fetchAll();
    } catch {
      toast.error('Update failed');
    }
  }

  async function cancel(id) {
    try {
      await api.patch(`/followups/${id}`, { status: 'cancelled' });
      fetchAll();
    } catch {
      toast.error('Cancel failed');
    }
  }

  const isOverdue = (d) => new Date(d) < new Date() && new Date(d).toDateString() !== new Date().toDateString();
  const isDueToday = (d) => new Date(d).toDateString() === new Date().toDateString();

  return (
    <AdminLayout title="Schedule" subtitle="Upcoming calls and follow-ups">
      {/* Header metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px', borderColor: dueToday > 0 ? 'var(--color-warning-border)' : 'var(--color-border)' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Due Today</div>
          <div style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: dueToday > 0 ? 'var(--color-warning)' : 'var(--color-text-primary)' }}>
            {dueToday}
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Total Pending</div>
          <div style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-primary)' }}>
            {followups.filter(f => f.status === 'pending').length}
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px', borderColor: needsFollowupLeads.length > 0 ? 'var(--color-primary-ring)' : 'var(--color-border)' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Needs Follow-up</div>
          <div style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-primary)' }}>
            {needsFollowupLeads.length}
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Completed</div>
          <div style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-success)' }}>
            {followups.filter(f => f.status === 'done').length}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Pending', value: 'pending' },
            { label: 'Needs Follow-up', value: 'needs_followup' },
            { label: 'Done', value: 'done' },
            { label: 'Cancelled', value: 'cancelled' },
            { label: 'All', value: '' },
          ].map(tab => (
            <button
              key={tab.value}
              className={filter === tab.value ? 'btn-primary' : 'btn-ghost'}
              style={{ padding: '7px 16px', fontSize: 13 }}
              onClick={() => {
                setFilter(tab.value);
                setView('list');
              }}
            >
              {tab.label}
              {tab.value === 'needs_followup' && needsFollowupLeads.length > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    padding: '1px 6px',
                    fontSize: 11,
                    borderRadius: 10,
                    background: filter === 'needs_followup' ? '#FFFFFF' : 'var(--color-primary)',
                    color: filter === 'needs_followup' ? 'var(--color-primary)' : '#FFFFFF',
                    fontWeight: 700,
                  }}
                >
                  {needsFollowupLeads.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <button className="btn-primary" onClick={() => setView('create')}>
          <Plus size={14} strokeWidth={1.75} /> Schedule Follow-up
        </button>
      </div>

      {/* Create form */}
      {view === 'create' && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 20 }}>
            Schedule a Follow-up
          </div>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Scheduled Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                className="input"
                style={{ width: 260 }}
                value={form.scheduled_at}
                onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Lead ID (optional)
              </label>
              <input
                className="input"
                placeholder="Lead UUID"
                value={form.lead_id}
                onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Notes
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder="Add notes…"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn-primary">Schedule</button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setView('list');
                  setForm({ scheduled_at: '', notes: '', lead_id: '', call_id: '' });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Needs Follow-up List View */}
      {filter === 'needs_followup' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 48 }}>Loading…</div>
          ) : needsFollowupLeads.length === 0 ? (
            <div className="card empty-state" style={{ padding: 60 }}>
              <CheckCircle size={40} strokeWidth={1.75} color="var(--color-success)" />
              <p style={{ fontWeight: 600, marginTop: 12 }}>All caught up!</p>
              <p>No interested leads are currently awaiting follow-up scheduling.</p>
            </div>
          ) : (
            needsFollowupLeads.map(lead => (
              <div
                key={lead.id}
                className="card"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  borderColor: 'var(--color-primary-ring)',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-md)',
                    flexShrink: 0,
                    background: 'var(--color-primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertCircle size={18} strokeWidth={1.75} color="var(--color-primary)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {lead.name !== '—' ? lead.name : lead.phone}
                    </span>
                    <span className="badge badge-green">Interested Customer</span>
                    <span className="badge badge-blue">{lead.language}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    Phone: <span style={{ fontFamily: 'monospace' }}>{lead.phone}</span> · Lead Status: {lead.lead_status} {lead.lead_score != null && `(${lead.lead_score}%)`}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 3 }}>
                    Last call: {lead.last_call_date ? new Date(lead.last_call_date).toLocaleDateString() : 'Recent'} · No follow-up scheduled
                  </div>
                </div>
                <button
                  className="btn-primary"
                  style={{ padding: '6px 14px', fontSize: 12 }}
                  onClick={() => startScheduleForLead(lead)}
                >
                  <Plus size={13} strokeWidth={2} /> Schedule Follow-up
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Regular Followup list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 48 }}>Loading…</div>
          ) : followups.length === 0 ? (
            <div className="card empty-state" style={{ padding: 60 }}>
              <Calendar size={40} strokeWidth={1.75} />
              <p style={{ fontWeight: 600, marginTop: 12 }}>No follow-ups scheduled</p>
              <p>Schedule your first follow-up or wait for the AI model to create one</p>
            </div>
          ) : (
            followups.map(f => (
              <div
                key={f.id}
                className="card"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  borderColor:
                    isDueToday(f.scheduled_at) && f.status === 'pending'
                      ? 'var(--color-warning-border)'
                      : isOverdue(f.scheduled_at) && f.status === 'pending'
                      ? 'var(--color-danger-border)'
                      : 'var(--color-border)',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-md)',
                    flexShrink: 0,
                    background: isDueToday(f.scheduled_at) ? 'var(--color-warning-bg)' : 'var(--color-primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Calendar
                    size={18}
                    strokeWidth={1.75}
                    color={isDueToday(f.scheduled_at) ? 'var(--color-warning)' : 'var(--color-primary)'}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Clock size={12} strokeWidth={1.75} color="var(--color-text-secondary)" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {new Date(f.scheduled_at).toLocaleString()}
                    </span>
                    {isDueToday(f.scheduled_at) && f.status === 'pending' && (
                      <span className="badge badge-amber" style={{ fontSize: 10 }}>DUE TODAY</span>
                    )}
                    {isOverdue(f.scheduled_at) && f.status === 'pending' && (
                      <span className="badge badge-red" style={{ fontSize: 10 }}>OVERDUE</span>
                    )}
                  </div>
                  {f.notes && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{f.notes}</div>}
                  {f.Lead && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-primary)', marginTop: 2 }}>
                      Lead: {f.Lead.name !== '—' ? f.Lead.name : f.Lead.phone} ({f.Lead.phone})
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 3 }}>
                    Created by: {f.created_by_type === 'ai_model' ? 'AI Model' : 'Staff'}
                  </div>
                </div>
                <StatusBadge s={f.status} />
                {f.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-ghost-icon" onClick={() => markDone(f.id)} title="Mark done" style={{ width: 32, height: 32 }}>
                      <CheckCircle size={15} strokeWidth={1.75} color="var(--color-success)" />
                    </button>
                    <button className="btn-ghost-icon" onClick={() => cancel(f.id)} title="Cancel" style={{ width: 32, height: 32 }}>
                      <X size={15} strokeWidth={1.75} color="var(--color-danger)" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </AdminLayout>
  );
}
