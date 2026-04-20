"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import LogoIcon from '@/components/ui/LogoIcon';

function PasswordStrength({ password }: { password: string }) {
    const checks = [
        { label: 'Min 8 chars', pass: password.length >= 8 },
        { label: 'Uppercase', pass: /[A-Z]/.test(password) },
        { label: 'Number', pass: /[0-9]/.test(password) },
        { label: 'Special char', pass: /[^A-Za-z0-9]/.test(password) },
    ];
    const strength = checks.filter(c => c.pass).length;
    const colors = ['#334155', '#ef4444', '#f59e0b', '#3b82f6', '#00ff80'];
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

    if (!password) return null;

    return (
        <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= strength ? colors[strength] : '#1e293b',
                        transition: 'background 0.3s ease',
                    }} />
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {checks.map(c => (
                        <span key={c.label} style={{
                            fontSize: 10,
                            fontFamily: "'Space Mono', monospace",
                            color: c.pass ? '#00ff80' : '#334155',
                            transition: 'color 0.2s',
                        }}>
                            {c.pass ? '✓' : '○'} {c.label}
                        </span>
                    ))}
                </div>
                <span style={{ fontSize: 11, color: colors[strength], fontWeight: 600 }}>
                    {labels[strength]}
                </span>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    const router = useRouter();
    const { register, loading, error, isAuthenticated } = useAuth();
    const { _hasHydrated } = useAuthStore();
    const [form, setForm] = useState({ username: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState(1);

    useEffect(() => {
        if (!_hasHydrated) return;   // wait for localStorage to load
        if (isAuthenticated) router.push('/dashboard');
    }, [_hasHydrated, isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await register(form);
    };

    return (
        <div className="ml-quest-center" style={{ overflow: 'hidden' }}>

            {/* Background */}
            <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 600, height: 300,
                background: 'radial-gradient(ellipse, rgba(0,255,128,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: `
            linear-gradient(rgba(0,255,128,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,128,0.03) 1px, transparent 1px)
          `,
                backgroundSize: '48px 48px',
            }} />

            {/* Logo */}
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
                <LogoIcon size={32} />
                <span style={{ fontWeight: 800, fontSize: 20, color: '#e2e8f0', letterSpacing: '-0.03em' }}>ML Quest</span>
            </Link>

            <div style={{ display: 'flex', gap: 32, width: '100%', maxWidth: 840, alignItems: 'flex-start' }}>

                {/* Left — Perks (hidden on mobile) */}
                <div style={{ flex: 1, paddingTop: 8, display: 'none', flexDirection: 'column' }} className="perks-panel">
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 3, color: '#00ff80', marginBottom: 20 }}>
                        WHAT YOU GET
                    </div>
                    {[
                        {
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                </svg>
                            ),
                            title: 'Real-time judging',
                            desc: 'Results stream via SSE as tests run',
                        },
                        {
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z" />
                                    <path d="M12 6v6l4 2" />
                                </svg>
                            ),
                            title: '5 languages',
                            desc: 'Python, JS, Java, C++, Go',
                        },
                        {
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="20" x2="18" y2="10" />
                                    <line x1="12" y1="20" x2="12" y2="4" />
                                    <line x1="6" y1="20" x2="6" y2="14" />
                                </svg>
                            ),
                            title: 'Performance stats',
                            desc: 'Track runtime and memory per submission',
                        },
                        {
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            ),
                            title: 'Free forever',
                            desc: 'No paywalls on core features',
                        },
                    ].map(p => (
                        <div key={p.title} className="perk">
                            <div className="perk-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.icon}</div>
                            <div>
                                <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>{p.title}</div>
                                <div style={{ fontSize: 12, marginTop: 1 }}>{p.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right — Form */}
                <div className="form-card" style={{ flex: 'none', padding: '44px 44px 40px' }}>
                    <div style={{ marginBottom: 32, textAlign: 'left' }}>
                        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2, color: '#f1f5f9' }}>
                            Create account
                        </h1>
                        <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.5 }}>
                            Free forever. No credit card needed.
                        </p>
                    </div>

                    {error && <div className="error-box">⚠ {error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 20 }}>
                            <label className="label" htmlFor="username" style={{ marginBottom: 10 }}>Username</label>
                            <input
                                id="username"
                                type="text"
                                className="input-field"
                                placeholder="coolcoder42"
                                value={form.username}
                                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                                required
                                minLength={3}
                                maxLength={50}
                            />
                            {form.username && (
                                <div style={{ marginTop: 6, fontSize: 11, fontFamily: "'Space Mono', monospace", color: '#475569' }}>
                                    ml-quest.dev/<span style={{ color: '#00ff80' }}>{form.username}</span>
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label className="label" htmlFor="email" style={{ marginBottom: 10 }}>Email address</label>
                            <input
                                id="email"
                                type="email"
                                className="input-field"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: 28 }}>
                            <label className="label" htmlFor="password" style={{ marginBottom: 10 }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="input-field"
                                    placeholder="Min 8 characters"
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    style={{ paddingRight: 60 }}
                                    required
                                    minLength={8}
                                />
                                <button type="button" className="show-pw" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? 'HIDE' : 'SHOW'}
                                </button>
                            </div>
                            <PasswordStrength password={form.password} />
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
                            {loading ? (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.9s linear infinite', flexShrink: 0 }}>
                                        <circle cx="12" cy="12" r="9" strokeDasharray="28 44" strokeOpacity={1} />
                                    </svg>
                                    Creating account...
                                </>
                            ) : 'Create Free Account →'}
                        </button>

                        <p style={{ textAlign: 'center', fontSize: 12, color: '#475569', marginTop: 20, lineHeight: 1.6 }}>
                            By signing up you agree to our{' '}
                            <a href="#" style={{ color: '#64748b' }}>Terms</a> and{' '}
                            <a href="#" style={{ color: '#64748b' }}>Privacy Policy</a>
                        </p>
                    </form>

                    <p style={{ textAlign: 'center', fontSize: 14, color: '#64748b', marginTop: 28, lineHeight: 1.5 }}>
                        Already have an account?{' '}
                        <Link href="/auth/login" className="link">Sign in</Link>
                    </p>
                </div>
            </div>

            <p style={{ marginTop: 40, fontSize: 11, color: '#334155', fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>
                SECURE · ENCRYPTED · FREE
            </p>
        </div>
    );
}