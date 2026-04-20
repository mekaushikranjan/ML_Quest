'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { problemsApi } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';

interface QuickLink {
    href: string;
    label: string;
    desc: string;
    color: string;
    icon: string;
    adminOnly?: boolean;
}

const QUICK_LINKS: QuickLink[] = [
    { href: '/admin/problems/new', label: 'New Problem', desc: 'Create a problem with examples & test cases', color: '#00ff80', icon: '＋', adminOnly: false },
    { href: '/admin/problems', label: 'All Problems', desc: 'View, manage and delete problems', color: '#3b82f6', icon: '⊟', adminOnly: false },
    { href: '/admin/users', label: 'User Management', desc: 'Manage roles for all registered users', color: '#ef4444', icon: '⊛', adminOnly: true },
];

export default function AdminPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/auth/login'); return; }
        if (user && user.role !== 'admin' && user.role !== 'editor') router.push('/problems');
    }, [_hasHydrated, isAuthenticated, user, router]);

    const { data: problemsData } = useQuery({
        queryKey: ['admin-problem-count'],
        queryFn: async () => {
            const res = await problemsApi.getList({ page: 1, limit: 1 });
            return res.data?.data?.meta;
        },
        enabled: _hasHydrated && isAuthenticated,
    });

    if (!_hasHydrated || !user) return null;

    const isAdmin = user.role === 'admin';

    return (
        <div className="ml-quest-page ml-quest" style={{ color: '#e2e8f0', fontFamily: "'Syne', sans-serif" }}>
            <Navbar />
            <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 80px' }}>

                {/* Header */}
                <div style={{ marginBottom: 48 }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 3, color: '#00ff80', marginBottom: 10 }}>
                        {user.role.toUpperCase()} · CONTROL PANEL
                    </div>
                    <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', margin: '0 0 8px' }}>Admin Hub</h1>
                    <p style={{ fontSize: 15, color: '#475569', margin: 0 }}>
                        Manage problems, test cases, and users from one place.
                    </p>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48 }}>
                    {[
                        { label: 'Total Problems', value: problemsData?.total ?? '—', color: '#00ff80', suffix: '' },
                        { label: 'Easy / Medium / Hard', value: '…', color: '#64748b', suffix: '' },
                        { label: 'Your Role', value: user.role, color: user.role === 'admin' ? '#ef4444' : '#f59e0b', suffix: '' },
                    ].map(s => (
                        <div key={s.label} style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'Space Mono', monospace", marginBottom: 6, textTransform: 'capitalize' }}>
                                {s.value}{s.suffix}
                            </div>
                            <div style={{ fontSize: 12, color: '#334155', letterSpacing: 0.5, textTransform: 'uppercase' }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Quick links */}
                <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#334155', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 20 }}>Quick Actions</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                        {QUICK_LINKS.filter(l => !l.adminOnly || isAdmin).map(l => (
                            <Link key={l.href} href={l.href} style={{ textDecoration: 'none' }}>
                                <div style={{ padding: 24, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', gap: 16, alignItems: 'flex-start' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = l.color; (e.currentTarget as HTMLDivElement).style.background = `${l.color}08`; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'; }}>
                                    {/* Icon */}
                                    <div style={{ width: 40, height: 40, borderRadius: 8, background: `${l.color}15`, border: `1px solid ${l.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: l.color, flexShrink: 0 }}>
                                        {l.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{l.label}</div>
                                        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{l.desc}</div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Divider + back to app */}
                <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 16 }}>
                    <Link href="/problems" style={{ fontSize: 13, color: '#475569', textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                        onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                        ← Back to Problems
                    </Link>
                    <Link href="/dashboard" style={{ fontSize: 13, color: '#475569', textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                        onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                        Dashboard →
                    </Link>
                </div>
            </div>
        </div>
    );
}
