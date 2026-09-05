import { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../api/client';
import {
  Phone, PhoneCall, ThumbsUp, ThumbsDown, Users, Star,
  CalendarClock, Clock, TrendingUp, TrendingDown, Plus,
  UploadCloud, FileQuestion, BarChart2, X, Play, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const DATE_RANGES = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7days' },
  { label: '30 Days', value: '30days' },
  { label: 'Custom', value: 'custom' },
];

const CHART_COLORS = ['#D6536D', '#6B8CAE', '#5B8A72', '#D4914B', '#E8A798', '#C4544A'];

function AnimatedNumber({ value }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === null || value === undefined || isNaN(value)) return;
    const isReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) {
      setDisplayValue(Number(value));
      return;
    }
    const target = Number(value);
    const start = 0;
    const duration = 700; // ~600-800ms ease-out
    const startTime = performance.now();

    let animationFrame;
    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * easeOut);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(update);
      } else {
        setDisplayValue(target);
      }
    };

    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  if (value === null || value === undefined) return '--';
  return displayValue.toLocaleString();
}

// Icon tint config — determines background tint + icon color for stat card icons
const ICON_TINTS = {
  neutral: { bg: 'rgba(214,83,109,0.10)',  color: 'var(--color-primary)' },
  success: { bg: 'rgba(91,138,114,0.12)',  color: 'var(--color-success)' },
  danger:  { bg: 'rgba(196,84,74,0.12)',   color: 'var(--color-danger)'  },
  warning: { bg: 'rgba(212,145,75,0.12)',  color: 'var(--color-warning)' },
  info:    { bg: 'rgba(107,140,174,0.12)', color: 'var(--color-info)'    },
};

function StatCard({ icon: Icon, label, value, iconVariant = 'neutral', trend, sub }) {
  const tint = ICON_TINTS[iconVariant] || ICON_TINTS.neutral;
  return (
    <div className="stat-card" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          backgroundColor: tint.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={18} strokeWidth={1.75} color={tint.color} />
        </div>
        {trend !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Nunito Sans, sans-serif', color: trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 3 }}>
            {trend >= 0 ? <TrendingUp size={12} strokeWidth={1.75} /> : <TrendingDown size={12} strokeWidth={1.75} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-stat-number" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.15, color: 'var(--color-text-primary)' }}>
        <AnimatedNumber value={value} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: 8, letterSpacing: '0.2px' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', opacity: 0.85, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function EmptyChart({ label }) {
  return (
    <div className="empty-state" style={{ padding: '40px 20px' }}>
      <BarChart2 size={32} strokeWidth={1.75} />
      <p style={{ fontWeight: 600, marginTop: 8 }}>No data yet</p>
      <p style={{ fontSize: 12 }}>{label}</p>
    </div>
  );
}

const LEAD_STATUS_COLORS = { Hot: '#C4544A', Warm: '#D4914B', Cold: '#6B8CAE', Unqualified: '#8A7B72' };

export default function DashboardPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState('7days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [leadStatus, setLeadStatus] = useState([]);
  const [calls, setCalls] = useState([]);
  const [callsTotal, setCallsTotal] = useState(0);
  const [callsPage, setCallsPage] = useState(1);
  const [callsFilter, setCallsFilter] = useState('all'); // all | interested | not_interested
  const [selectedCall, setSelectedCall] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef(null);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = range === 'custom' ? { range, from: customFrom, to: customTo } : { range };
      const [s, a, l, ls, c] = await Promise.all([
        api.get('/stats/overview', { params }),
        api.get('/stats/call-activity', { params }),
        api.get('/stats/languages', { params }),
        api.get('/stats/lead-status', { params }),
        api.get('/calls', {
          params: {
            page: callsPage, limit: 25,
            ...(callsFilter !== 'all' ? { lead_status: callsFilter } : {}),
          }
        }),
      ]);
      setStats(s.data);
      setActivity(a.data);
      setLanguages(l.data);
      setLeadStatus(ls.data);
      setCalls(c.data.calls);
      setCallsTotal(c.data.total);
    } catch (e) {
      console.error('Dashboard fetch error', e);
    } finally {
      setRefreshing(false);
    }
  }, [range, customFrom, customTo, callsPage, callsFilter]);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchAll]);

  // Classification donut data
  const classificationData = stats
    ? [
      { name: 'Interested',     value: stats.interested,    color: '#5B8A72' },
      { name: 'Not Interested', value: stats.notInterested, color: '#C4544A' },
      { name: 'Neutral', value: Math.max(0, stats.totalCalls - stats.interested - stats.notInterested), color: '#8A7B72' },
    ].filter(d => d.value > 0)
    : [];

  const langData = languages.map((l, i) => ({ name: l.language, value: Number(l.count), color: CHART_COLORS[i % CHART_COLORS.length] }));
  const lsData = leadStatus.map(l => ({ name: l.lead_status, value: Number(l.count), color: LEAD_STATUS_COLORS[l.lead_status] || '#D6536D' }));

  function getBadge(ls) {
    if (ls === 'interested') return <span className="badge badge-green">Interested</span>;
    if (ls === 'not_interested') return <span className="badge badge-red">Not Interested</span>;
    if (ls === 'neutral') return <span className="badge badge-gray">Neutral</span>;
    return <span className="badge badge-amber">Pending</span>;
  }

  function getStatusBadge(s) {
    if (s === 'completed') return <span className="badge badge-green">Completed</span>;
    if (s === 'in_progress') return <span className="badge badge-amber badge-in-progress">In Progress</span>;
    if (s === 'failed') return <span className="badge badge-red">Failed</span>;
    return <span className="badge badge-gray">{s}</span>;
  }

  const totalPages = Math.ceil(callsTotal / 25);

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Real-time overview of your AI voice calling campaigns"
      onRefresh={fetchAll}
      refreshing={refreshing}
    >
      {/* ── Date Range Filter ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {DATE_RANGES.map(d => (
          <button
            key={d.value}
            className={range === d.value ? 'btn-primary' : 'btn-ghost'}
            style={{ padding: '7px 16px', fontSize: 13 }}
            onClick={() => setRange(d.value)}
          >
            {d.label}
          </button>
        ))}
        {range === 'custom' && (
          <>
            <input type="date" className="input" style={{ width: 150 }} value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span style={{ color: 'var(--color-text-secondary)' }}>to</span>
            <input type="date" className="input" style={{ width: 150 }} value={customTo} onChange={e => setCustomTo(e.target.value)} />
            <button className="btn-primary" onClick={fetchAll} style={{ padding: '7px 14px', fontSize: 13 }}>Apply</button>
          </>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {refreshing ? '⟳ Refreshing…' : 'Auto-refresh: 30s'}
        </span>
      </div>

      {/* ── ROW 1: Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard icon={Phone}        label="Total Calls"            value={stats?.totalCalls}       iconVariant="neutral" />
        <StatCard icon={PhoneCall}    label="Successful Calls"       value={stats?.successfulCalls}  iconVariant="neutral" />
        <StatCard icon={ThumbsUp}     label="Interested Customers"   value={stats?.interested}       iconVariant="success" sub="From AI classification" trend={stats?.interestedTrend} />
        <StatCard icon={ThumbsDown}   label="Not Interested"         value={stats?.notInterested}    iconVariant="danger"  sub="From AI classification" trend={stats?.notInterestedTrend} />
        <StatCard icon={Users}        label="Leads Captured"         value={stats?.leadsCount}       iconVariant="neutral" />
        <StatCard icon={Star}         label="Shortlisted Leads"      value={stats?.shortlisted}      iconVariant="neutral" />
        <StatCard icon={CalendarClock} label="Follow Ups Scheduled" value={stats?.followUps}        iconVariant="warning" />
        <StatCard icon={Clock}        label="Pending / In Progress"  value={stats?.pendingCalls}     iconVariant="warning" />
      </div>

      {/* ── ROW 2: Charts 2×2 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Call Activity */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 16, marginBottom: 4, color: 'var(--color-text-primary)' }}>Call Activity</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 20 }}>Volume over selected period</div>
          {activity.length === 0
            ? <EmptyChart label="No calls recorded yet" />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activity} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D6536D" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#D6536D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontFamily: 'Nunito Sans, sans-serif' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontFamily: 'Nunito Sans, sans-serif' }} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)', fontFamily: 'Nunito Sans, sans-serif' }} />
                  <Area type="monotone" dataKey="count" stroke="#D6536D" fill="url(#areaGrad)" strokeWidth={2} animationDuration={500} />
                </AreaChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Interested vs Not Interested */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 16, marginBottom: 4, color: 'var(--color-text-primary)' }}>Interested vs Not Interested</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 20 }}>From AI classification data</div>
          {classificationData.length === 0
            ? <EmptyChart label="Awaiting AI classification data" />
            : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={classificationData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3} animationDuration={500}>
                      {classificationData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, fontFamily: 'Nunito Sans, sans-serif' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {classificationData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', flex: 1 }}>{d.name}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-primary)' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Top Languages */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 16, marginBottom: 4, color: 'var(--color-text-primary)' }}>Top Languages</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 20 }}>Calls by language</div>
          {langData.length === 0
            ? <EmptyChart label="No language data yet" />
            : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={langData} cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={3} animationDuration={500}>
                      {langData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, fontFamily: 'Nunito Sans, sans-serif' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {langData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', flex: 1 }}>{d.name}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-primary)' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Lead Status */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 16, marginBottom: 4, color: 'var(--color-text-primary)' }}>Lead Status</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 20 }}>Hot / Warm / Cold distribution</div>
          {lsData.length === 0
            ? <EmptyChart label="No lead data yet" />
            : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={lsData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontFamily: 'Nunito Sans, sans-serif' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)', fontFamily: 'Nunito Sans, sans-serif' }} width={70} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, fontFamily: 'Nunito Sans, sans-serif' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={500}>
                    {lsData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>

      {/* ── ROW 3: Recent Calls Table + Quick Actions sidebar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 16 }}>
        {/* Calls Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Recent Calls</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'All Calls', value: 'all' },
                { label: 'Interested', value: 'interested' },
                { label: 'Not Interested', value: 'not_interested' },
              ].map(f => (
                <button key={f.value}
                  className={callsFilter === f.value ? 'btn-primary' : 'btn-ghost'}
                  style={{ padding: '6px 14px', fontSize: 12 }}
                  onClick={() => { setCallsFilter(f.value); setCallsPage(1); }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Phone Number</th>
                  <th>Language</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Lead Score</th>
                  <th>Lead Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {calls.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)' }}>
                    No calls found. Awaiting AI model data.
                  </td></tr>
                ) : calls.map(call => (
                  <tr key={call.id} onClick={() => setSelectedCall(call)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{call.phone_number || '—'}</td>
                    <td>{call.language}</td>
                    <td>{getStatusBadge(call.status)}</td>
                    <td>{call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : '—'}</td>
                    <td>
                      {call.classification?.lead_score != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar" style={{ width: 60 }}>
                            <div className="progress-fill" style={{ width: `${call.classification.lead_score}%` }} />
                          </div>
                          <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{call.classification.lead_score}%</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td>{getBadge(call.classification?.lead_status)}</td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {new Date(call.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              {callsTotal} total calls
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-ghost" style={{ padding: '6px 10px' }} disabled={callsPage === 1} onClick={() => setCallsPage(p => p - 1)}>
                <ChevronLeft size={14} strokeWidth={1.75} />
              </button>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '6px 12px', fontVariantNumeric: 'tabular-nums' }}>
                {callsPage} / {totalPages || 1}
              </span>
              <button className="btn-ghost" style={{ padding: '6px 10px' }} disabled={callsPage >= totalPages} onClick={() => setCallsPage(p => p + 1)}>
                <ChevronRight size={14} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 16 }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: Plus, label: 'New Campaign', path: '/admin/campaigns' },
                { icon: UploadCloud, label: 'Add Phone Numbers', path: '/admin/campaigns' },
                { icon: FileQuestion, label: 'Upload Questions', path: '/admin/questionnaires' },
                { icon: BarChart2, label: 'View Reports', path: '/admin/leads' },
              ].map(({ icon: Icon, label, path }) => (
                <button
                  key={label}
                  className="btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', gap: 10, padding: '10px 12px' }}
                  onClick={() => navigate(path)}
                >
                  <Icon size={15} strokeWidth={1.75} color="var(--color-primary)" />
                  <span style={{ fontSize: 13 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Call Detail Drawer ── */}
      {selectedCall && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedCall(null)} />
          <div className="drawer">
            <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 18, color: 'var(--color-text-primary)' }}>Call Detail</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>{selectedCall.phone_number}</div>
              </div>
              <button className="btn-ghost-icon" onClick={() => setSelectedCall(null)} style={{ padding: 8 }}>
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Status Row */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {getStatusBadge(selectedCall.status)}
                {getBadge(selectedCall.classification?.lead_status)}
                <span className="badge badge-blue">{selectedCall.language}</span>
              </div>

              {/* Duration */}
              {selectedCall.classification?.talk_duration_seconds && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Talk Duration</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {Math.floor(selectedCall.classification.talk_duration_seconds / 60)}m {selectedCall.classification.talk_duration_seconds % 60}s
                  </div>
                </div>
              )}

              {/* Lead Score */}
              {selectedCall.classification?.lead_score != null && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Lead Score</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="progress-bar" style={{ flex: 1 }}>
                      <div className="progress-fill" style={{ width: `${selectedCall.classification.lead_score}%` }} />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>{selectedCall.classification.lead_score}%</span>
                  </div>
                </div>
              )}

              {/* Sentiment Score */}
              {selectedCall.classification?.sentiment_score != null && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Sentiment Score</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedCall.classification.sentiment_score}</div>
                </div>
              )}

              {/* Keywords */}
              {selectedCall.classification?.detected_keywords?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Detected Keywords</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedCall.classification.detected_keywords.map(kw => (
                      <span key={kw} className="chip">{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio */}
              {selectedCall.recording_url && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Recording</div>
                  <audio controls style={{ width: '100%' }}>
                    <source src={selectedCall.recording_url} />
                  </audio>
                </div>
              )}

              {/* Transcript */}
              {selectedCall.transcript_text && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Transcript</div>
                  <div style={{
                    background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)', padding: 14, fontSize: 13, color: 'var(--color-text-secondary)',
                    lineHeight: 1.7, maxHeight: 200, overflowY: 'auto',
                  }}>
                    {selectedCall.transcript_text}
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
