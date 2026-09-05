import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, Zap, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) redirectByRole(user.role);
    if (params.get('expired')) {
      toast.error('Session expired. Please log in again.', { id: 'expired' });
    }
  }, [user]);

  function redirectByRole(role) {
    navigate(role === 'agent' ? '/admin/calls' : '/admin/dashboard', { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const u = await login(form.email, form.password);
      redirectByRole(u.role);
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.';
      setError(msg);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-background)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      {/* Login Card */}
      <div style={{
        width: '100%',
        maxWidth: 440,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        padding: '40px 40px 36px 40px',
      }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={20} strokeWidth={1.75} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
              ARB Softech
            </div>
            <div style={{ fontFamily: 'Nunito Sans, sans-serif', fontSize: 9, fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              AI VOICE AGENT
            </div>
          </div>
        </div>

        {/* Page Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            Sign in
          </h1>
          <p style={{ fontFamily: 'Nunito Sans, sans-serif', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Access the AI Voice Agent admin portal.
          </p>
        </div>

        {/* Restricted Access Notice */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 24,
          backgroundColor: 'var(--color-primary-light)',
          border: '1px solid var(--color-primary-ring)',
        }}>
          <ShieldCheck size={16} strokeWidth={1.75} color="var(--color-primary)" />
          <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>
            Restricted Admin Portal — Authorized Access Only
          </span>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{
            padding: '11px 14px', borderRadius: 'var(--radius-md)', marginBottom: 20,
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger)', fontSize: 13, fontWeight: 500
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Email */}
          <div>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 600,
              color: 'var(--color-text-primary)', marginBottom: 6,
            }}>
              Email address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} strokeWidth={1.75} style={{
                position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--color-text-tertiary)', pointerEvents: 'none',
              }} />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="input"
                style={{ paddingLeft: 40 }}
                placeholder="admin@arbsoftech.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 600,
              color: 'var(--color-text-primary)', marginBottom: 6,
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} strokeWidth={1.75} style={{
                position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--color-text-tertiary)', pointerEvents: 'none',
              }} />
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className="input"
                style={{ paddingLeft: 40, paddingRight: 44 }}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-tertiary)', padding: 4, display: 'flex',
                }}
              >
                {showPwd
                  ? <EyeOff size={15} strokeWidth={1.75} />
                  : <Eye size={15} strokeWidth={1.75} />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div style={{ textAlign: 'right', marginTop: -6 }}>
            <Link to="/admin/forgot-password" style={{
              fontSize: 12, fontWeight: 600,
              color: 'var(--color-primary)', textDecoration: 'none',
            }}>
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '11px', justifyContent: 'center', marginTop: 2 }}
          >
            {loading ? 'Authenticating…' : 'Sign in'}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--color-border)',
          textAlign: 'center', fontSize: 11, color: 'var(--color-text-tertiary)',
        }}>
          © {new Date().getFullYear()} ARB Softech • AI Voice Agent Platform
        </div>
      </div>
    </div>
  );
}
