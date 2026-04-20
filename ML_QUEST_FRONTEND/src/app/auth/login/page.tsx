"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import LogoIcon from '@/components/ui/LogoIcon';

export default function LoginPage() {
    const router = useRouter();
    const { login, loading, error, isAuthenticated } = useAuth();
    const { _hasHydrated } = useAuthStore();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (!_hasHydrated) return;   // wait for localStorage to load
        if (isAuthenticated) router.push('/dashboard');
    }, [_hasHydrated, isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await login(form);
    };

    return (
        <div className="ml-quest-center" style={{ overflow: 'hidden' }}>

            {/* Background glow */}
            <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 600, height: 300,
                background: 'radial-gradient(ellipse, rgba(0,255,128,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Grid */}
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

            {/* Card */}
            <div className="form-card" style={{ padding: '44px 44px 40px' }}>
                <div style={{ marginBottom: 32, textAlign: 'left' }}>
                    <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2, color: '#f1f5f9' }}>
                        Welcome back
                    </h1>
                    <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.5 }}>
                        Sign in to continue your practice
                    </p>
                </div>

                {error && <div className="error-box">⚠ {error}</div>}

                <form onSubmit={handleSubmit}>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <label className="label" htmlFor="password" style={{ margin: 0 }}>Password</label>
                            <a href="#" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#00ff80'}
                                onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                                Forgot password?
                            </a>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className="input-field"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                style={{ paddingRight: 60 }}
                                required
                            />
                            <button
                                type="button"
                                className="show-pw"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? 'HIDE' : 'SHOW'}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8 }}>
                        {loading ? (
                            <>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.9s linear infinite', flexShrink: 0 }}>
                                    <circle cx="12" cy="12" r="9" strokeDasharray="28 44" />
                                </svg>
                                Signing in...
                            </>
                        ) : 'Sign In →'}
                    </button>
                </form>

                <div className="divider-line" style={{ margin: '28px 0 24px' }}>or continue with</div>

                <a href="#" className="social-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </a>

                <p style={{ textAlign: 'center', fontSize: 14, color: '#64748b', marginTop: 28, lineHeight: 1.5 }}>
                    No account?{' '}
                    <Link href="/auth/register" className="link">Create one free</Link>
                </p>
            </div>

            {/* Bottom tag */}
            <p style={{ marginTop: 40, fontSize: 11, color: '#334155', fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>
                SECURE · ENCRYPTED · FREE
            </p>
        </div>
    );
}