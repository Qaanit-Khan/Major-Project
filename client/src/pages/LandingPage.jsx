import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  Phone, Brain, Filter, Download, Shield,
  Users, MessageSquare, Upload, Lock, Headphones, Database,
  BarChart2, Clock, Languages, ArrowRight, CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ── Static data (unchanged content, enhanced micro-animation classes) ── */
const FEATURES = [
  { icon: Phone,         animClass: 'icon-anim-phone',    label: 'Multi-Call Support',       desc: 'Handle thousands of concurrent AI voice calls simultaneously.' },
  { icon: Languages,     animClass: 'icon-anim-lang',     label: 'Multilingual AI',          desc: 'English, Hindi, Marathi and more with native language support.' },
  { icon: Brain,         animClass: 'icon-anim-brain',    label: 'Smart Classification',     desc: 'AI-powered interested and non-interested detection in real time.' },
  { icon: MessageSquare, animClass: 'icon-anim-chat',     label: 'Dynamic Questionnaires',   desc: 'Build custom question sets with expected answers per campaign.' },
  { icon: Filter,        animClass: 'icon-anim-filter',   label: 'Smart Lead Qualification', desc: 'Auto-scored leads filtered by status, language, and campaign.' },
  { icon: Upload,        animClass: 'icon-anim-upload',   label: 'Bulk Number Upload',       desc: 'Paste or upload thousands of numbers in seconds.' },
  { icon: Shield,        animClass: 'icon-anim-shield',   label: 'Secure Access',            desc: 'JWT auth, role-based access, AES-256 encryption, audit logs.' },
  { icon: Lock,          animClass: 'icon-anim-lock',     label: 'RBAC Roles',               desc: 'Admin, Manager, and Agent permission tiers out of the box.' },
  { icon: Headphones,    animClass: 'icon-anim-headset',  label: 'Call Recordings',          desc: 'Store and replay every call with a built-in audio player.' },
  { icon: Download,      animClass: 'icon-anim-download', label: 'Data Export',              desc: 'Export calls, leads, and campaigns as CSV, XLSX, or PDF.' },
  { icon: BarChart2,     animClass: 'icon-anim-chart',    label: 'Live Analytics',           desc: 'Real-time dashboard with charts, stats, and trend indicators.' },
  { icon: Database,      animClass: 'icon-anim-database', label: 'REST API & Webhooks',      desc: 'Plug in any AI calling engine via our documented API layer.' },
  { icon: Clock,         animClass: 'icon-anim-clock',    label: 'Follow-up Scheduling',     desc: 'Schedule callbacks with due-today badges and automated queueing.' },
];

const STEPS = [
  { num: '01', label: 'Add / Paste Numbers',       icon: Upload,        animClass: 'icon-anim-upload',    desc: 'Upload CSV or paste contacts instantly.' },
  { num: '02', label: 'AI Calls & Talks',           icon: Phone,         animClass: 'icon-anim-phone',     desc: 'Natural conversations in Hindi, Marathi, and English.' },
  { num: '03', label: 'Ask Questions Dynamically', icon: MessageSquare, animClass: 'icon-anim-chat',      desc: 'Follow custom conversation trees per campaign.' },
  { num: '04', label: 'Record Leads Automatically',icon: Database,      animClass: 'icon-anim-database',  desc: 'Real-time transcript capture and audio archive.' },
  { num: '05', label: 'Filter & Shortlist Leads',  icon: Filter,        animClass: 'icon-anim-filter',    desc: 'Score each interaction and flag high-intent customers.' },
  { num: '06', label: 'Export & Follow-Up',        icon: Download,      animClass: 'icon-anim-download',  desc: 'One-click spreadsheet export and reminder scheduling.' },
];

const BUBBLES = [
  { lang: 'English', text: 'Hello! Are you interested in our commercial property project in North Mumbai?' },
  { lang: 'Hindi',   text: 'नमस्ते! क्या आप हमारे नए प्रोजेक्ट के बारे में अधिक जानकारी प्राप्त करना चाहते हैं?' },
  { lang: 'Marathi', text: 'नमस्कार! आपण आमच्या आगामी योजनेबद्दल माहिती जाणून घेण्यास उत्सुक आहात का?' },
];

/* ── Scroll-reveal hook ─────────────────────────────────── */
function useReveal(threshold = 0.1) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('is-visible'); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ── Animated waveform bars ─────────────────────────────── */
function WaveformBars({ count = 18, height = 36 }) {
  const bars = Array.from({ length: count }, (_, i) => {
    const h = 0.3 + 0.7 * Math.abs(Math.sin(i * 0.7));
    return { h, delay: i * (1100 / count) };
  });
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
      {bars.map((b, i) => (
        <span
          key={i}
          className="lp-wavebar"
          style={{
            height: Math.round(b.h * height),
            animationDelay: `${b.delay}ms`,
            opacity: 0.55 + 0.45 * b.h,
          }}
        />
      ))}
    </div>
  );
}

/* ── Conversation Card ──────────────────────────────────── */
function ConvCard({ lang, text, floatClass, shadow, scale = 1, style = {} }) {
  const langColors = {
    English: { bg: 'rgba(214,83,109,0.09)', color: 'var(--color-primary)' },
    Hindi:   { bg: 'rgba(107,140,174,0.10)', color: 'var(--color-info)'    },
    Marathi: { bg: 'rgba(212,145,75,0.10)',  color: 'var(--color-warning)' },
  };
  const lc = langColors[lang] || langColors.English;
  return (
    <div
      className={`lp-conv-card ${floatClass}`}
      style={{
        boxShadow: shadow || '0 8px 24px -4px rgba(43,35,33,0.08), 0 2px 6px -1px rgba(43,35,33,0.04)',
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
        padding: '13px 18px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          backgroundColor: lc.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Languages size={13} strokeWidth={1.75} color={lc.color} />
        </div>
        <span style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 13,
          fontWeight: 600,
          color: lc.color,
          letterSpacing: '-0.01em',
        }}>
          {lang} Voice Agent
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 10, fontFamily: 'Nunito Sans, sans-serif',
          fontWeight: 700, color: 'var(--color-success)',
          display: 'flex', alignItems: 'center', gap: 4,
          backgroundColor: 'rgba(91,138,114,0.09)',
          padding: '2px 7px',
          borderRadius: 10,
        }}>
          <span className="live-dot-pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }} />
          Live
        </span>
      </div>
      <div style={{
        background: 'var(--color-surface-raised)',
        borderRadius: 8,
        padding: '6px 10px',
        marginBottom: 7,
        display: 'flex',
        alignItems: 'center',
      }}>
        <WaveformBars count={18} height={20} />
      </div>
      <p style={{
        fontFamily: 'Nunito Sans, sans-serif',
        fontSize: 12.5,
        color: 'var(--color-text-secondary)',
        lineHeight: 1.45,
        margin: 0,
        fontStyle: 'italic',
      }}>
        "{text}"
      </p>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [demoForm, setDemoForm] = useState({ name: '', email: '', phone: '' });
  const [demoSent, setDemoSent] = useState(false);
  const [sending, setSending]   = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const howRef  = useReveal(0.08);
  const featRef = useReveal(0.05);
  const demoRef = useReveal(0.1);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
          const current = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
          setScrollProgress(Math.min(100, Math.max(0, current)));
          setScrolled(window.scrollY > 15);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function handleDemo(e) {
    e.preventDefault();
    setSending(true);
    await new Promise(r => setTimeout(r, 800));
    setDemoSent(true);
    setSending(false);
    toast.success('Demo request received! Our team will contact you shortly.');
  }

  return (
    <div style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)', minHeight: '100vh' }}>

      {/* ── Subtle Scroll Progress Indicator (dusty rose) ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${scrollProgress}%`,
          height: 2.5,
          backgroundColor: 'var(--color-primary)',
          zIndex: 1001,
          transition: 'width 0.12s ease-out',
          pointerEvents: 'none',
        }}
      />

      {/* ══════════════════════════════════════
          NAVBAR — fixed / sticky, medium & thin (72px desktop)
      ══════════════════════════════════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        backgroundColor: scrolled ? 'rgba(253,248,243,0.97)' : 'rgba(253,248,243,0.94)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
        height: 72,
        boxShadow: scrolled ? '0 4px 20px -2px rgba(43,35,33,0.07)' : '0 1px 0 var(--color-border)',
        transition: 'background-color 0.25s ease, box-shadow 0.25s ease',
      }}>
        {/* Inner container — matches page content boundary */}
        <div style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '0 clamp(24px, 3.5vw, 56px)',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}>
          {/* Text-based Logo */}
          <div className="lp-brand-logo" onClick={() => navigate('/')}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1 }}>
              <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, fontSize: 17.5, color: 'var(--color-text-primary)', lineHeight: 1.15, margin: 0 }}>
                ARB Softech
              </span>
              <span style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 9, fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '1.2px', textTransform: 'uppercase', lineHeight: 1, marginTop: 3 }}>
                AI VOICE AGENT
              </span>
            </div>
          </div>

          {/* Nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {[['#features', 'Features'], ['#how', 'How It Works'], ['#demo', 'Request Demo']].map(([href, label]) => (
              <a key={href} href={href} className="lp-nav-link">{label}</a>
            ))}
            <button
              className="lp-btn-primary"
              onClick={() => navigate('/admin/login')}
              style={{ padding: '10px 22px', fontSize: 13, marginLeft: 8 }}
            >
              Admin Portal <span className="lp-btn-arrow"><ArrowRight size={14} strokeWidth={2} /></span>
            </button>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════
          HERO  — split-panel layout
      ══════════════════════════════════════ */}
      <section style={{
        position: 'relative',
        maxWidth: 1440,
        margin: '0 auto',
        padding: `clamp(60px, 8vh, 100px) clamp(24px, 3.5vw, 56px) clamp(60px, 8vh, 90px)`,
        overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: -40, right: -60, width: 480, height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(214,83,109,0.06) 0%, transparent 68%)',
          pointerEvents: 'none',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', bottom: -40, left: -80, width: 360, height: 360,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,167,152,0.08) 0%, transparent 68%)',
          pointerEvents: 'none',
        }} />

        {/* Split layout — visually balanced */}
        <div className="lp-hero-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', alignItems: 'center', gap: 'clamp(28px, 3.5vw, 52px)', position: 'relative' }}>

          {/* ── LEFT: Headline + CTA ── */}
          <div className="lp-hero-left" style={{ minWidth: 0 }}>
            {/* Eyebrow badge */}
            <div className="lp-hero-animate lp-delay-1" style={{ marginBottom: 22, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 8px', borderRadius: 999, background: 'var(--color-primary-light)', border: '1px solid var(--color-primary-ring)' }}>
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 10, height: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', display: 'block', position: 'relative', zIndex: 1 }} />
                <span style={{ position: 'absolute', inset: -3, borderRadius: '50%', background: 'var(--color-primary)', opacity: 0.35, animation: 'pulseRing 2s ease-out infinite' }} />
                <span style={{ position: 'absolute', inset: -6, borderRadius: '50%', background: 'var(--color-primary)', opacity: 0.15, animation: 'pulseRing 2s ease-out infinite 0.65s' }} />
              </span>
              <span className="lp-eyebrow" style={{ fontSize: 11 }}>Enterprise Multi-Call Voice AI Platform</span>
            </div>

            {/* Main headline */}
            <h1
              className="lp-heading lp-hero-animate lp-delay-2"
              style={{ fontSize: 'clamp(38px, 4.8vw, 60px)', marginBottom: 22, margin: '0 0 22px 0' }}
            >
              Automated Voice<br />Conversations.{' '}
              <span style={{ color: 'var(--color-primary)', fontStyle: 'italic' }}>Real Leads.</span>
              <br />Better Conversions.
            </h1>

            {/* Subheading */}
            <p
              className="lp-body lp-hero-animate lp-delay-3"
              style={{ fontSize: 16, marginBottom: 36, maxWidth: 460 }}
            >
              Connect thousands of concurrent customers with human-like AI voice calling in English, Hindi, and regional dialects with instant real-time qualification.
            </p>

            {/* CTAs */}
            <div className="lp-hero-animate lp-delay-4" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 40 }}>
              <button className="lp-btn-primary" onClick={() => navigate('/admin/login')}>
                Access Dashboard <span className="lp-btn-arrow"><ArrowRight size={16} strokeWidth={2} /></span>
              </button>
              <a href="#demo" style={{ textDecoration: 'none' }}>
                <button className="lp-btn-ghost">Request Demo</button>
              </a>
            </div>

            {/* Waveform strip in elevated surface container */}
            <div className="lp-hero-animate lp-delay-5" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 999,
              padding: '7px 16px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <WaveformBars count={18} height={22} />
              <span style={{
                fontFamily: "'Nunito Sans', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                whiteSpace: 'nowrap',
              }}>
                Live AI voice sessions · Hindi · English · Marathi
              </span>
            </div>
          </div>

          {/* ── RIGHT/CENTER: Layered conversation cards cohesive cascading visual composition ── */}
          <div
            className="lp-hero-right"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 480,
              margin: '0 auto',
              height: 440,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {/* Ambient backdrop glow */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: '5% 0%',
                background: 'radial-gradient(ellipse at center, rgba(214,83,109,0.07) 0%, rgba(232,167,152,0.03) 50%, transparent 75%)',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />

            {/* Decorative handwritten brand annotation */}
            <div
              className="lp-hero-annotation"
              aria-hidden="true"
            >
              <span className="lp-annotation-text">
                From<br />
                Conversations<br />
                to Conversions.
              </span>
            </div>

            {/* Card 1 — English — top, cascading position */}
            <div
              className="hero-card-in-1 lp-hero-card-wrap lp-hero-card-wrap-1"
              style={{
                position: 'absolute',
                top: 0,
                left: 32,
                right: 0,
                zIndex: 3,
              }}
            >
              <ConvCard
                lang="English"
                text={BUBBLES[0].text}
                floatClass="conv-float-a"
                scale={1}
                shadow="0 14px 34px -6px rgba(43,35,33,0.11), 0 4px 10px -2px rgba(43,35,33,0.05), 0 0 0 1px rgba(214,83,109,0.12)"
              />
            </div>

            {/* Card 2 — Hindi — middle, cascading position */}
            <div
              className="hero-card-in-2 lp-hero-card-wrap lp-hero-card-wrap-2"
              style={{
                position: 'absolute',
                top: 144,
                left: 0,
                right: 32,
                zIndex: 2,
              }}
            >
              <ConvCard
                lang="Hindi"
                text={BUBBLES[1].text}
                floatClass="conv-float-b"
                scale={0.985}
                shadow="0 10px 28px -6px rgba(43,35,33,0.09), 0 3px 8px -2px rgba(43,35,33,0.04), 0 0 0 1px rgba(43,35,33,0.04)"
              />
            </div>

            {/* Card 3 — Marathi — bottom, cascading position */}
            <div
              className="hero-card-in-3 lp-hero-card-wrap lp-hero-card-wrap-3"
              style={{
                position: 'absolute',
                top: 288,
                left: 24,
                right: 8,
                zIndex: 1,
              }}
            >
              <ConvCard
                lang="Marathi"
                text={BUBBLES[2].text}
                floatClass="conv-float-c"
                scale={0.97}
                shadow="0 8px 22px -6px rgba(43,35,33,0.08), 0 2px 6px -2px rgba(43,35,33,0.03), 0 0 0 1px rgba(43,35,33,0.04)"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          HOW IT WORKS — connected pipeline workflow
      ══════════════════════════════════════ */}
      <section id="how" style={{
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        padding: `clamp(60px, 7.5vh, 90px) 0`,
        scrollMarginTop: 72,
      }}>
        <div ref={howRef} className="lp-section-reveal" style={{
          width: '100%',
          maxWidth: 1440,
          margin: '0 auto',
          padding: '0 clamp(24px, 3.5vw, 56px)',
          boxSizing: 'border-box',
        }}>
          {/* Section header with hierarchical reveal */}
          <div className="lp-reveal-header" style={{ textAlign: 'center', marginBottom: 44 }}>
            <div className="lp-eyebrow" style={{ marginBottom: 12 }}>Simple Workflow</div>
            <h2 className="lp-heading" style={{ fontSize: 'clamp(28px, 3vw, 40px)', margin: 0 }}>
              How The Platform Operates
            </h2>
          </div>

          {/* Connected workflow container */}
          <div style={{ position: 'relative' }}>
            {/* Horizontal pipeline track line across steps with progressive reveal */}
            <div
              className="lp-workflow-track"
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 41,
                left: '3%',
                right: '3%',
                height: 2,
                zIndex: 0,
              }}
            />

            <div
              className="lp-stagger lp-steps-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 14,
                position: 'relative',
                zIndex: 1,
              }}
            >
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div
                    key={idx}
                    className="lp-step-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '20px 16px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: '0 2px 8px -2px rgba(43,35,33,0.05)',
                    }}
                  >
                    {/* Step badge row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 14 }}>
                      <div className={`lp-icon-box ${step.animClass}`} style={{
                        width: 42, height: 42, borderRadius: 11,
                        background: 'var(--color-surface-raised)',
                        border: '1px solid var(--color-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(43,35,33,0.04)',
                        flexShrink: 0,
                      }}>
                        <Icon size={19} strokeWidth={1.75} color="var(--color-primary)" />
                      </div>
                      <span className="lp-step-number" style={{
                        fontFamily: "'Fraunces', Georgia, serif",
                        fontSize: 16, fontWeight: 800,
                        color: 'var(--color-primary)',
                        opacity: 0.75,
                        letterSpacing: '-0.02em',
                        transition: 'opacity 0.2s ease, transform 0.2s ease',
                      }}>
                        {step.num}
                      </span>
                    </div>

                    <h3 style={{
                      fontFamily: "'Fraunces', Georgia, serif",
                      fontSize: 14, fontWeight: 700,
                      color: 'var(--color-text-primary)',
                      lineHeight: 1.35,
                      margin: '0 0 6px 0',
                    }}>
                      {step.label}
                    </h3>
                    <p className="lp-body" style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURES & CAPABILITIES — refined card grid
      ══════════════════════════════════════ */}
      <section id="features" style={{
        backgroundColor: 'var(--color-surface-raised)',
        borderBottom: '1px solid var(--color-border)',
        padding: `clamp(64px, 8vh, 96px) 0`,
        scrollMarginTop: 72,
      }}>
        <div ref={featRef} className="lp-section-reveal" style={{
          width: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 clamp(24px, 3.5vw, 48px)',
          boxSizing: 'border-box',
        }}>
          {/* Section header with hierarchical reveal */}
          <div className="lp-reveal-header" style={{ textAlign: 'center', marginBottom: 52 }}>
            <div className="lp-eyebrow" style={{ marginBottom: 12 }}>Capabilities</div>
            <h2
              className="lp-heading lp-capabilities-heading"
              style={{
                fontSize: 'clamp(28px, 3.2vw, 40px)',
                lineHeight: 1.25,
                margin: 0,
              }}
            >
              Enterprise Features <span style={{ whiteSpace: 'nowrap' }}>Built-in</span>
            </h2>
          </div>

          {/* Primary 2 columns × 3 rows grid */}
          <div
            className="lp-stagger lp-features-primary-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 20,
              marginBottom: 28,
            }}
          >
            {[
              FEATURES[0], // Multi-Call Support
              FEATURES[1], // Multilingual AI
              FEATURES[2], // Smart Classification
              FEATURES[3], // Dynamic Questionnaires
              FEATURES[4], // Smart Lead Qualification
              FEATURES[10], // Live Analytics
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="lp-feat-card"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '28px 28px',
                    display: 'flex',
                    gap: 18,
                    alignItems: 'flex-start',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div className={`lp-icon-box ${f.animClass}`} style={{
                    width: 46, height: 46, borderRadius: 12,
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(43,35,33,0.04)',
                  }}>
                    <Icon size={21} strokeWidth={1.75} color="var(--color-primary)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontFamily: "'Fraunces', Georgia, serif",
                      fontSize: 16.5, fontWeight: 700,
                      color: 'var(--color-text-primary)',
                      marginBottom: 6,
                      lineHeight: 1.3,
                      margin: '0 0 6px 0',
                    }}>
                      {f.label}
                    </h3>
                    <p className="lp-body" style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Supplementary enterprise foundation features grid (remaining 7 features) */}
          <div
            className="lp-stagger lp-features-secondary-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
            }}
          >
            {[
              FEATURES[5], // Bulk Number Upload
              FEATURES[6], // Secure Access
              FEATURES[7], // RBAC Roles
              FEATURES[8], // Call Recordings
              FEATURES[9], // Data Export
              FEATURES[11], // REST API & Webhooks
              FEATURES[12], // Follow-up Scheduling
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="lp-feat-card"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '18px 16px',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <div className={`lp-icon-box ${f.animClass}`} style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 10,
                  }}>
                    <Icon size={17} strokeWidth={1.75} color="var(--color-primary)" />
                  </div>
                  <h4 style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: 13.5, fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    margin: '0 0 5px 0',
                    lineHeight: 1.3,
                  }}>
                    {f.label}
                  </h4>
                  <p className="lp-body" style={{ fontSize: 12, lineHeight: 1.45, margin: 0 }}>
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          DEMO REQUEST — two-column
      ══════════════════════════════════════ */}
      <section id="demo" style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: `clamp(56px, 6.5vh, 80px) 0`,
        scrollMarginTop: 72,
      }}>
        <div ref={demoRef} className="lp-section-reveal" style={{
          width: '100%',
          maxWidth: 1080,
          margin: '0 auto',
          padding: '0 clamp(24px, 3.5vw, 48px)',
          boxSizing: 'border-box',
        }}>
          <div className="lp-demo-grid" style={{
            display: 'flex',
            gap: 'clamp(36px, 5vw, 64px)',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>

            {/* LEFT — copy with hierarchical reveal (vertically centered) */}
            <div style={{ flex: '1 1 0', maxWidth: 520 }}>
              <div className="lp-reveal-header">
                <div className="lp-eyebrow" style={{ marginBottom: 12 }}>Get Started</div>
                <h2 className="lp-heading" style={{ fontSize: 'clamp(28px, 3vw, 38px)', lineHeight: 1.2, marginBottom: 14, margin: '0 0 14px 0' }}>
                  Request Platform Demo
                </h2>
              </div>
              <p className="lp-body lp-reveal-sub" style={{ fontSize: 15, lineHeight: 1.55, marginBottom: 26, margin: '0 0 26px 0' }}>
                Experience human-like AI calling tailored to your enterprise campaigns.
              </p>

              {/* Trust signals using existing content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  'Multilingual — Hindi, English, Marathi',
                  'Thousands of concurrent AI calls',
                  'Real-time lead qualification & scoring',
                  'Role-based access + audit logs',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(91,138,114,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle size={13} strokeWidth={2} color="var(--color-success)" />
                    </div>
                    <span className="lp-body" style={{ fontSize: 13.5, color: 'var(--color-text-primary)' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — form card */}
            <div style={{ flex: '0 0 auto', width: '100%', maxWidth: 440 }}>
              <div style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                borderRadius: 20,
                padding: '32px 28px',
                boxShadow: 'var(--shadow-lg)',
              }}>
                {demoSent ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(91,138,114,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                      <CheckCircle size={30} strokeWidth={1.75} color="var(--color-success)" />
                    </div>
                    <h3 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-success)', marginBottom: 8, margin: '0 0 8px 0' }}>Demo Request Received</h3>
                    <p className="lp-body" style={{ fontSize: 14 }}>Our enterprise voice team will contact you within 24 hours.</p>
                  </div>
                ) : (
                  <>
                    <h3 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 22, margin: '0 0 22px 0' }}>Book a Live Demo</h3>
                    <form onSubmit={handleDemo} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {[
                        { label: 'Full Name',     key: 'name',  type: 'text',  placeholder: 'John Doe' },
                        { label: 'Work Email',    key: 'email', type: 'email', placeholder: 'john@company.com' },
                        { label: 'Phone Number',  key: 'phone', type: 'tel',   placeholder: '+91 98765 43210' },
                      ].map(({ label, key, type, placeholder }) => (
                        <div key={key}>
                          <label style={{ display: 'block', fontFamily: 'Nunito Sans, sans-serif', fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 7, letterSpacing: '0.3px' }}>
                            {label}
                          </label>
                          <input
                            type={type}
                            required
                            className="lp-input"
                            placeholder={placeholder}
                            value={demoForm[key]}
                            onChange={e => setDemoForm(f => ({ ...f, [key]: e.target.value }))}
                          />
                        </div>
                      ))}
                      <button
                        type="submit"
                        className="lp-btn-primary"
                        disabled={sending}
                        style={{ marginTop: 6, width: '100%', justifyContent: 'center', padding: '13px 0' }}
                      >
                        {sending ? 'Submitting…' : 'Submit Request'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <footer style={{
        backgroundColor: 'var(--color-background)',
        borderTop: '1px solid var(--color-border)',
        padding: `28px 0`,
      }}>
        <div style={{
          width: '100%',
          maxWidth: 1440,
          margin: '0 auto',
          padding: '0 clamp(24px, 3.5vw, 56px)',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1 }}>
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.15, margin: 0 }}>
              ARB Softech
            </span>
            <span style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 8.5, fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '1.1px', textTransform: 'uppercase', lineHeight: 1, marginTop: 2 }}>
              AI VOICE AGENT
            </span>
          </div>

          {/* Copyright */}
          <span className="lp-body" style={{ fontSize: 12 }}>
            © {new Date().getFullYear()} ARB Softech · AI Voice Agent Enterprise Platform. All rights reserved.
          </span>

          {/* Right nav */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[['#features', 'Features'], ['#how', 'How It Works'], ['#demo', 'Demo']].map(([href, label]) => (
              <a key={href} href={href} className="lp-nav-link" style={{ fontSize: 13, padding: '5px 10px' }}>{label}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

