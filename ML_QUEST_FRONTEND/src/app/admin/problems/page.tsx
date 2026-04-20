'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { problemsApi } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
    admin: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    editor: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    user: { color: '#475569', bg: 'rgba(71,85,105,0.1)' },
};

const DIFF_COLORS: Record<string, string> = {
    easy: '#00ff80', medium: '#f59e0b', hard: '#ef4444',
};

export default function AdminProblemsPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/auth/login'); return; }
        if (user && user.role !== 'admin' && user.role !== 'editor') router.push('/problems');
    }, [_hasHydrated, isAuthenticated, user, router]);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['admin-problems'],
        queryFn: async () => {
            const res = await problemsApi.getList({ page: 1, limit: 100 });
            return res.data?.data;
        },
        enabled: _hasHydrated && isAuthenticated,
    });

    const problems: any[] = data?.problems ?? [];

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        try {
            await problemsApi.deleteProblem(id);
            refetch();
        } catch (e: any) {
            alert(e?.response?.data?.error?.message || 'Failed to delete problem');
        }
    };

    if (!_hasHydrated || !user) return null;

    return (
        <div className="ml-quest-page ml-quest" style={{ color: '#e2e8f0', fontFamily: "'Syne', sans-serif" }}>
            <Navbar />
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
                    <div>
                        <Link href="/admin" style={{ fontSize: 13, color: '#475569', textDecoration: 'none', marginBottom: 12, display: 'block' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                            onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                            ← Admin Hub
                        </Link>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 3, color: '#f59e0b', marginBottom: 8 }}>PROBLEM MANAGEMENT</div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>All Problems</h1>
                    </div>
                    <Link href="/admin/problems/new"
                        style={{ padding: '12px 24px', background: '#00ff80', color: '#080d08', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                        + New Problem
                    </Link>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
                    {[
                        { label: 'Total', value: problems.length, color: '#e2e8f0' },
                        { label: 'Easy', value: problems.filter(p => p.difficulty === 'easy').length, color: '#00ff80' },
                        { label: 'Medium', value: problems.filter(p => p.difficulty === 'medium').length, color: '#f59e0b' },
                        { label: 'Hard', value: problems.filter(p => p.difficulty === 'hard').length, color: '#ef4444' },
                    ].map(s => (
                        <div key={s.label} style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
                            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: "'Space Mono', monospace", marginBottom: 4 }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                    {/* Header row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 120px', padding: '12px 20px', background: 'rgba(255,255,255,0.03)', fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#334155', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        <span>Title</span><span>Difficulty</span><span>Tags</span><span>Acceptance</span><span style={{ textAlign: 'right' }}>Actions</span>
                    </div>

                    {isLoading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#334155', fontSize: 14 }}>Loading problems…</div>
                    ) : problems.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#334155', fontSize: 14 }}>No problems yet. <Link href="/admin/problems/new" style={{ color: '#00ff80' }}>Create one →</Link></div>
                    ) : problems.map((p: any, i: number) => (
                        <div key={p.id} style={{
                            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 120px',
                            padding: '14px 20px', alignItems: 'center',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                            transition: 'background 0.15s',
                        }}>
                            <div>
                                <Link href={`/problems/${p.slug}`}
                                    style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', textDecoration: 'none' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#00ff80'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#e2e8f0'}>
                                    {p.title}
                                </Link>
                                <div style={{ fontSize: 11, color: '#334155', marginTop: 2, fontFamily: "'Space Mono', monospace" }}>/{p.slug}</div>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: DIFF_COLORS[p.difficulty], textTransform: 'capitalize' }}>{p.difficulty}</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {(p.tags || []).slice(0, 2).map((t: string) => (
                                    <span key={t} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, color: '#64748b', fontFamily: "'Space Mono', monospace" }}>{t}</span>
                                ))}
                            </div>
                            <span style={{ fontSize: 13, color: '#64748b', fontFamily: "'Space Mono', monospace" }}>
                                {((p.acceptance_rate || 0) * 100).toFixed(1)}%
                            </span>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <Link href={`/problems/${p.slug}`}
                                    style={{ padding: '5px 10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12, color: '#94a3b8', textDecoration: 'none' }}>
                                    View
                                </Link>
                                <button onClick={() => handleDelete(p.id, p.title)}
                                    style={{ padding: '5px 10px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, fontSize: 12, color: '#ef4444', background: 'none', cursor: 'pointer' }}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
