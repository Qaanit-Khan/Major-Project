import { Bell, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Topbar({ title, subtitle, onRefresh, refreshing }) {
  const { user } = useAuth();

  return (
    <header style={{
      height: 64,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-surface)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'var(--color-text-primary)' }}>{title}</h1>
        {subtitle && <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onRefresh && (
          <button className="btn-ghost-icon" onClick={onRefresh} disabled={refreshing}
            title="Refresh data">
            <RefreshCw size={15} strokeWidth={1.75} className={refreshing ? 'spin-icon' : ''} />
          </button>
        )}
        <button className="btn-ghost-icon" title="Notifications">
          <Bell size={16} strokeWidth={1.75} />
        </button>
        <div className="user-avatar-btn">
          {user?.name?.[0]?.toUpperCase() || 'A'}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </header>
  );
}
