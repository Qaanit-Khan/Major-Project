import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Phone, Megaphone, HelpCircle,
  CalendarClock, KeyRound, ClipboardList, Zap, LogOut, Bell,
  RefreshCw, Menu, X, Plus, UploadCloud, FileQuestion, BarChart2, ChevronDown
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/admin/dashboard',            icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/leads',                icon: Users,            label: 'Leads' },
  { to: '/admin/calls',                icon: Phone,            label: 'Calls' },
  { to: '/admin/campaigns',            icon: Megaphone,        label: 'Campaigns' },
  { to: '/admin/questionnaires',        icon: HelpCircle,     label: 'Questionnaires' },
  { to: '/admin/schedule',             icon: CalendarClock,    label: 'Scheduling' },
  { to: '/admin/audit-logs',           icon: ClipboardList,    label: 'Reports', roles: ['admin'] },
  { to: '/admin/settings/integrations', icon: KeyRound,         label: 'Settings', roles: ['admin'] },
];

// Persistent across route navigation
let hasInitialNavbarAnimated = false;
let persistentPillStyle = null;

export default function TopNavbar({ onRefresh, refreshing }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Entrance animation fires only on initial application load, not route changes
  const isInitialLoad = useRef(!hasInitialNavbarAnimated);
  useEffect(() => {
    hasInitialNavbarAnimated = true;
  }, []);

  const visibleItems = NAV_ITEMS.filter(item => !item.roles || item.roles.includes(user?.role));

  const containerRef = useRef(null);
  const tabRefs = useRef([]);

  // Active navigation index
  const getActiveIndex = useCallback(() => {
    const path = location.pathname;
    let idx = visibleItems.findIndex(item => item.to === path);
    if (idx !== -1) return idx;
    idx = visibleItems.findIndex(item => item.to !== '/admin/dashboard' && path.startsWith(item.to));
    if (idx !== -1) return idx;
    if (path === '/admin' || path === '/admin/') {
      return visibleItems.findIndex(item => item.to === '/admin/dashboard');
    }
    return 0;
  }, [location.pathname, visibleItems]);

  const activeIdx = getActiveIndex();

  const [pillStyle, setPillStyle] = useState(() => {
    if (persistentPillStyle) return persistentPillStyle;
    return { left: 0, width: 0, opacity: 0 };
  });

  const updatePill = useCallback(() => {
    if (!containerRef.current) return;
    const target = tabRefs.current[activeIdx];
    if (target) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tabRect = target.getBoundingClientRect();
      const newStyle = {
        left: Math.round(tabRect.left - containerRect.left),
        width: Math.round(tabRect.width),
        opacity: 1,
      };
      setPillStyle(newStyle);
      persistentPillStyle = newStyle;
    } else {
      setPillStyle(prev => ({ ...prev, opacity: 0 }));
    }
  }, [activeIdx]);

  useLayoutEffect(() => {
    updatePill();
  }, [updatePill]);

  useEffect(() => {
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
  }, [updatePill]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <header className={`top-navbar ${isInitialLoad.current ? 'top-navbar-animate-in' : ''}`}>
      <div className="top-nav-inner">
        {/* ── Left: Logo ── */}
        <div className="top-nav-logo" onClick={() => navigate('/admin/dashboard')}>
          <div className="logo-icon-wrap">
            <Zap size={18} strokeWidth={1.75} color="#fff" />
          </div>
          <div className="logo-text-wrap">
            <span className="logo-title">ARB Softech</span>
            <span className="logo-sub">AI VOICE AGENT</span>
          </div>
        </div>

        {/* ── Center: Desktop Navigation Tabs ── */}
        <nav className="top-nav-tabs" ref={containerRef} aria-label="Main Navigation">
          {/* Animated Sliding Pill Indicator */}
          <div
            className="nav-sliding-pill"
            style={{
              transform: `translateX(${pillStyle.left}px)`,
              width: `${pillStyle.width}px`,
              opacity: pillStyle.opacity,
            }}
          />

          {visibleItems.map(({ to, icon: Icon, label }, idx) => {
            const isActive = idx === activeIdx;
            return (
              <NavLink
                key={to}
                to={to}
                ref={el => (tabRefs.current[idx] = el)}
                className={`top-nav-tab ${isActive ? 'active' : ''}`}
              >
                <Icon size={15} strokeWidth={1.75} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* ── Right Controls ── */}
        <div className="top-nav-actions">
          {/* Quick Actions Dropdown */}
          <div className="dropdown-wrap">
            <button
              className="btn-primary-sm"
              onClick={() => setQuickActionsOpen(!quickActionsOpen)}
            >
              <Plus size={15} strokeWidth={1.75} />
              <span className="hide-mobile">Quick Actions</span>
              <ChevronDown size={14} strokeWidth={1.75} />
            </button>

            {quickActionsOpen && (
              <>
                <div className="dropdown-backdrop" onClick={() => setQuickActionsOpen(false)} />
                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={() => { navigate('/admin/campaigns'); setQuickActionsOpen(false); }}>
                    <Plus size={14} strokeWidth={1.75} color="var(--color-primary)" /> New Campaign
                  </button>
                  <button className="dropdown-item" onClick={() => { navigate('/admin/campaigns'); setQuickActionsOpen(false); }}>
                    <UploadCloud size={14} strokeWidth={1.75} color="var(--color-primary)" /> Add Phone Numbers
                  </button>
                  <button className="dropdown-item" onClick={() => { navigate('/admin/questionnaires'); setQuickActionsOpen(false); }}>
                    <FileQuestion size={14} strokeWidth={1.75} color="var(--color-primary)" /> Upload Questions
                  </button>
                  <button className="dropdown-item" onClick={() => { navigate('/admin/leads'); setQuickActionsOpen(false); }}>
                    <BarChart2 size={14} strokeWidth={1.75} color="var(--color-primary)" /> View Reports
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              className="btn-ghost-icon"
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh Data"
            >
              <RefreshCw size={15} strokeWidth={1.75} className={refreshing ? 'spin-icon' : ''} />
            </button>
          )}

          {/* Notifications Bell */}
          <button className="btn-ghost-icon rel-badge" title="Notifications">
            <Bell size={16} strokeWidth={1.75} />
            <span className="dot-badge" />
          </button>

          {/* User Profile Menu */}
          <div className="dropdown-wrap">
            <div
              className="user-avatar-btn"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>

            {userMenuOpen && (
              <>
                <div className="dropdown-backdrop" onClick={() => setUserMenuOpen(false)} />
                <div className="dropdown-menu user-dropdown">
                  <div className="user-info-header">
                    <div className="user-name">{user?.name || 'Admin User'}</div>
                    <div className="user-role">{user?.role || 'administrator'}</div>
                  </div>
                  <div className="menu-divider" />
                  <button className="dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={14} strokeWidth={1.75} /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            className="mobile-hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Nav Overlay (<768px) ── */}
      {mobileOpen && (
        <div className="mobile-nav-panel">
          {visibleItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
          <div className="menu-divider" />
          <button className="mobile-nav-link danger" onClick={handleLogout}>
            <LogOut size={18} strokeWidth={1.75} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </header>
  );
}
