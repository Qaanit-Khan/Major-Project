import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Mail, ArrowLeft, Zap, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent! Check your email.');
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-background)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        padding: '40px 40px 36px 40px',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 36, height: 36, background: 'var(--color-primary)',
            borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={18} strokeWidth={1.75} color="#fff" />
          </div>
          <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>ARB Softech</span>
        </div>

        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
          Reset Password
        </h1>
        <p style={{ fontFamily: 'Nunito Sans, sans-serif', color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 28 }}>
          Enter your registered email and we'll send a reset link.
        </p>

        {sent ? (
          <div style={{
            padding: '16px 18px', borderRadius: 'var(--radius-md)',
            background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)',
            color: 'var(--color-success)', fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <CheckCircle size={18} strokeWidth={1.75} />
            Reset link sent! Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ position: 'relative' }}>
              <Mail size={15} strokeWidth={1.75} style={{
                position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--color-text-tertiary)',
              }} />
              <input
                type="email" required className="input" style={{ paddingLeft: 40 }}
                placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: 11 }}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <Link to="/admin/login" style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 28,
          paddingTop: 20, borderTop: '1px solid var(--color-border)',
          fontSize: 13, color: 'var(--color-text-secondary)', textDecoration: 'none',
        }}>
          <ArrowLeft size={14} strokeWidth={1.75} /> Back to Login
        </Link>
      </div>
    </div>
  );
}
