'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import LogoIcon from '@/components/ui/LogoIcon';
import Navbar from '@/components/layout/Navbar';
import { problemsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

function Counter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const duration = 2000;
        const step = end / (duration / 16);
        const timer = setInterval(() => {
          start += step;
          if (start >= end) {
            setCount(end);
            clearInterval(timer);
          } else setCount(Math.floor(start));
        }, 16);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0,255,128,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,128,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,255,128,0.08) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}

function CodeCard() {
  const lines = [
    { text: 'def two_sum(nums, target):', color: '#e2e8f0' },
    { text: '    seen = {}', color: '#94a3b8' },
    { text: '    for i, num in enumerate(nums):', color: '#94a3b8' },
    { text: '        comp = target - num', color: '#94a3b8' },
    { text: '        if comp in seen:', color: '#00ff80' },
    { text: '            return [seen[comp], i]', color: '#00ff80' },
    { text: '        seen[num] = i', color: '#94a3b8' },
  ];

  return (
    <div
      style={{
        background: 'rgba(15,20,15,0.9)',
        border: '1px solid rgba(0,255,128,0.2)',
        borderRadius: 12,
        padding: 20,
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 13,
        lineHeight: 1.8,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 0 60px rgba(0,255,128,0.08), 0 24px 48px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
        <span style={{ marginLeft: 8, color: '#475569', fontSize: 11 }}>solution.py</span>
      </div>
      {lines.map((line, i) => (
        <div key={i} style={{ color: line.color, animation: `fadeIn 0.3s ease ${i * 0.08}s both` }}>
          <span style={{ color: '#334155', marginRight: 12, userSelect: 'none', fontSize: 11 }}>
            {String(i + 1).padStart(2, '0')}
          </span>
          {line.text}
        </div>
      ))}
      <div
        style={{
          marginTop: 16,
          padding: '8px 12px',
          background: 'rgba(0,255,128,0.08)',
          borderRadius: 6,
          border: '1px solid rgba(0,255,128,0.15)',
          color: '#00ff80',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#00ff80',
            boxShadow: '0 0 8px #00ff80',
            display: 'inline-block',
          }}
        />
        Accepted · 42ms · 5/5 test cases
      </div>
    </div>
  );
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const features = [
    {
      icon: (
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#00ff80" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
      title: 'Real-time Judging',
      desc: 'Submit code and watch results stream live. Our judge evaluates your solution against hidden test cases in milliseconds.',
    },
    {
      icon: (
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#00ff80" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      ),
      title: 'Multi-language Support',
      desc: 'Write in Python, JavaScript, Java, C++, or Go. Same problem, your preferred language.',
    },
    {
      icon: (
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#00ff80" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
      title: 'Performance Analytics',
      desc: 'Track runtime percentile, memory usage, and acceptance rate across all your submissions.',
    },
    {
      icon: (
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#00ff80" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      title: 'Secure Sandbox',
      desc: 'Every submission runs in an isolated container with strict resource limits. Safe, fair, consistent.',
    },
  ];

  const mlFeatures = [
    {
      icon: (
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#00ccff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
      title: 'ML Model Challenges',
      desc: 'Build and train machine learning models on real datasets. Test your ML knowledge with hands-on challenges.',
    },
    {
      icon: (
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#00ccff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 21H3V3h18v18zm-9-10l-3 4m6-4l3 4m-12-6h18" />
        </svg>
      ),
      title: 'Dataset Integration',
      desc: 'Access curated ML datasets for classification, regression, and clustering problems. Learn with realistic data.',
    },
    {
      icon: (
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#00ccff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
      title: 'Metric-based Evaluation',
      desc: 'Auto-evaluate models with accuracy, precision, recall, F1-score. Get detailed performance insights.',
    },
    {
      icon: (
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#00ccff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
          <path d="M12 5v14M5 19h14" />
        </svg>
      ),
      title: 'Framework Support',
      desc: 'Use scikit-learn, TensorFlow, PyTorch, and more. Choose your ML framework and showcase your skills.',
    },
  ];

  const steps = [
    { num: '01', title: 'Pick a Problem', desc: 'Browse our curated problem set. Filter by difficulty, topic, or search by name.' },
    { num: '02', title: 'Write Your Solution', desc: 'Use our VS Code-powered editor. Syntax highlighting, autocomplete, multiple languages.' },
    { num: '03', title: 'Get Instant Verdict', desc: 'Results stream in real time via SSE. See which test cases passed, runtime, and memory.' },
  ];

  const { data: problemsMeta } = useQuery({
    queryKey: ['home-stats'],
    queryFn: () => problemsApi.getList({ limit: 1, page: 1 }),
  });
  const totalProblems = problemsMeta?.data?.data?.meta?.total ?? 0;

  const stats = [
    { value: totalProblems, suffix: '', label: 'Problems Available', sub: 'across all difficulties' },
    { value: 5, suffix: '', label: 'Languages Supported', sub: 'Python, JS, Java, C++, Go' },
    { value: 'Live', suffix: '', label: 'Real-time Judging', sub: 'instant feedback' },
  ];

  return (
    <div className="ml-quest-page">
      <Navbar />

      <section style={{ position: 'relative', padding: '120px 24px 100px', overflow: 'hidden' }}>
        <GridBackground />
        <div className="ml-quest-container" style={{ paddingTop: 0, paddingBottom: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div>
            <div className="hero-badge" style={{ marginBottom: 24 }}>
              <span className="tag">✦ Open Source · Free to Use</span>
            </div>
            <h1
              className="hero-h1"
              style={{
                fontSize: 'clamp(42px, 5vw, 68px)',
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: '-2px',
                color: '#f1f5f9',
                marginBottom: 24,
              }}
            >
              Master{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #00ff80 0%, #00ccff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Algorithms & ML
              </span>
              <br />
              Ship Better Code
            </h1>
            <p className="hero-sub" style={{ fontSize: 18, color: '#64748b', lineHeight: 1.7, marginBottom: 40, maxWidth: 480 }}>
              Practice DSA and ML with real-time code execution, hidden test cases, dataset challenges, and instant feedback. Built for engineers who want to level up.
            </p>
            <div className="hero-cta" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {isAuthenticated ? (
                <Link href="/dashboard" className="btn-primary">
                  Go to Dashboard
                  <span>→</span>
                </Link>
              ) : (
                <Link href="/auth/register" className="btn-primary">
                  Sign Up Free
                  <span>→</span>
                </Link>
              )}
              <Link href="/problems" className="btn-secondary">
                Browse Problems
              </Link>
            </div>
            <div style={{ marginTop: 48, display: 'flex', gap: 32 }}>
              {[
                { label: 'Problems', value: totalProblems > 0 ? `${totalProblems}` : '—' },
                { label: 'Languages', value: '5' },
                { label: 'Free', value: '100%' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: '#00ff80' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-code" style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                inset: -20,
                background: 'radial-gradient(ellipse at center, rgba(0,255,128,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            <CodeCard />
          </div>
        </div>
      </section>

      <hr className="divider" />

      <section style={{ padding: '80px 24px' }}>
        <div className="ml-quest-container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p className="section-label" style={{ marginBottom: 12 }}>
              By the numbers
            </p>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px' }}>Built for scale</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {stats.map((s) => (
              <div key={s.label} className="stat-card">
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 48, fontWeight: 700, color: '#00ff80', lineHeight: 1, marginBottom: 8 }}>
                  {typeof s.value === 'number' && mounted ? <Counter end={s.value} suffix={s.suffix} /> : `${s.value}${s.suffix}`}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 13, color: '#475569' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="divider" />

      <section style={{ padding: '80px 24px' }}>
        <div className="ml-quest-container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p className="section-label" style={{ marginBottom: 12 }}>Why ML Quest</p>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px' }}>
              Everything you need to{' '}
              <span style={{ background: 'linear-gradient(135deg, #00ff80, #00ccff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                practice seriously
              </span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {features.map((f) => (
              <div key={f.title} className="feature-card">
                <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: '#f1f5f9' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="divider" />

      <section style={{ padding: '80px 24px' }}>
        <div className="ml-quest-container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p className="section-label" style={{ marginBottom: 12 }}>Machine Learning</p>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px' }}>
              Hands-on ML{' '}
              <span style={{ background: 'linear-gradient(135deg, #00ccff, #0099ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Practice & Challenges
              </span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {mlFeatures.map((f) => (
              <div key={f.title} className="feature-card">
                <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: '#f1f5f9' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 60, padding: '40px', borderRadius: 12, border: '1px solid rgba(0, 204, 255, 0.2)', background: 'rgba(0, 204, 255, 0.03)' }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Why ML Problems Matter</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              <div>
                <div style={{ marginBottom: 16 }}>
                  <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#00ccff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </div>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>Learn with real datasets and understand practical ML workflows</p>
              </div>
              <div>
                <div style={{ marginBottom: 16 }}>
                  <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#00ccff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="5" r="1" />
                    <circle cx="5" cy="5" r="1" />
                    <circle cx="5" cy="19" r="1" />
                    <circle cx="19" cy="19" r="1" />
                    <path d="M12 12v6" />
                    <path d="M12 12L5 5" />
                    <path d="M12 12L19 5" />
                    <path d="M12 12L5 19" />
                    <path d="M12 12L19 19" />
                  </svg>
                </div>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>Master algorithms by implementing models from scratch</p>
              </div>
              <div>
                <div style={{ marginBottom: 16 }}>
                  <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#00ccff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                </div>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>Get instant feedback on model performance and accuracy</p>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <Link href="/ml-practice" className="btn-primary">
              Explore ML Problems
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      <hr className="divider" />

      <section style={{ padding: '80px 24px' }}>
        <div className="ml-quest-container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p className="section-label" style={{ marginBottom: 12 }}>How it works</p>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px' }}>From problem to verdict in seconds</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: 28,
                left: '16.6%',
                right: '16.6%',
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(0,255,128,0.3), transparent)',
              }}
            />
            {steps.map((step, i) => (
              <div key={step.num} style={{ textAlign: 'center', padding: '0 16px' }}>
                <div style={{ marginBottom: 24, display: 'inline-flex', width: 56, height: 56, borderRadius: '50%', border: '1px solid rgba(0,255,128,0.3)', background: 'rgba(0,255,128,0.05)', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: '#00ff80' }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: '#f1f5f9' }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="divider" />

      <section style={{ padding: '100px 24px' }}>
        <div className="ml-quest-container" style={{ maxWidth: 700, paddingTop: 0, paddingBottom: 0, textAlign: 'center' }}>
          <div
            style={{
              padding: '64px 48px',
              border: '1px solid rgba(0,255,128,0.15)',
              borderRadius: 20,
              background: 'rgba(0,255,128,0.02)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(ellipse at 50% 0%, rgba(0,255,128,0.07) 0%, transparent 60%)',
                pointerEvents: 'none',
              }}
            />
            <p className="section-label" style={{ marginBottom: 16 }}>Start today</p>
            <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 16, lineHeight: 1.1 }}>
              Ready to level up?
            </h2>
            <p style={{ color: '#64748b', fontSize: 16, marginBottom: 36, lineHeight: 1.7 }}>
              Join engineers who use ML Quest to sharpen their problem-solving. Free, fast, and open.
            </p>
            {isAuthenticated ? (
              <Link href="/dashboard" className="btn-primary" style={{ fontSize: 16, padding: '16px 40px' }}>
                Go to Dashboard
                <span>→</span>
              </Link>
            ) : (
              <Link href="/auth/register" className="btn-primary" style={{ fontSize: 16, padding: '16px 40px' }}>
                Sign Up Free — It&apos;s Free
                <span>→</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 24px' }}>
        <div className="ml-quest-container" style={{ paddingTop: 0, paddingBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoIcon size={24} />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#475569' }}>ML Quest</span>
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            <Link href="/problems" style={{ color: '#475569', textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }} className="hover:text-[#94a3b8]">
              Problems
            </Link>
            {isAuthenticated ? (
              <Link href="/dashboard" style={{ color: '#475569', textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }} className="hover:text-[#94a3b8]">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/login" style={{ color: '#475569', textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }} className="hover:text-[#94a3b8]">
                  Sign In
                </Link>
                <Link href="/auth/register" style={{ color: '#475569', textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }} className="hover:text-[#94a3b8]">
                  Register
                </Link>
              </>
            )}
          </div>
          <p style={{ color: '#334155', fontSize: 12, fontFamily: "'Space Mono', monospace" }}>© 2026 ML Quest</p>
        </div>
      </footer>
    </div>
  );
}
