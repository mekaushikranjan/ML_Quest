'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';

const ROLES = ['user', 'editor', 'admin'] as const;
type Role = typeof ROLES[number];

const ROLE_META: Record<Role, { color: string; bg: string; border: string }> = {
    admin: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
    editor: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
    user: { color: '#475569', bg: 'rgba(71,85,105,0.08)', border: 'rgba(71,85,105,0.2)' },
};

export default function AdminUsersPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [updating, setUpdating] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/auth/login'); return; }
        if (user && user.role !== 'admin') router.push('/admin');
    }, [_hasHydrated, isAuthenticated, user, router]);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const res = await authApi.getUsers({ limit: 100 });
            return res.data?.data;
        },
        enabled: _hasHydrated && isAuthenticated && user?.role === 'admin',
    });

    const users: any[] = data?.users ?? [];

    const handleRoleChange = async (userId: string, newRole: Role) => {
        setUpdating(userId);
        try {
            await authApi.updateUserRole(userId, newRole);
            await refetch();
            setToast(`Role updated to ${newRole}`);
            setTimeout(() => setToast(null), 2500);
        } catch (e: any) {
            alert(e?.response?.data?.error?.message || 'Failed to update role');
        } finally {
            setUpdating(null);
        }
    };

    if (!_hasHydrated || !user) return null;

    return (
        <div className="ml-quest-page ml-quest" style={{ color: '#e2e8f0', fontFamily: "'Syne', sans-serif" }}>
            <Navbar />
            {/* Toast */}
            {toast && (
                <div style={{ position: 'fixed', bottom: 32, right: 32, padding: '12px 20px', background: 'rgba(0,255,128,0.1)', border: '1px solid rgba(0,255,128,0.3)', borderRadius: 8, color: '#00ff80', fontSize: 13, zIndex: 9999, fontFamily: "'Space Mono', monospace" }}>
                    ✓ {toast}
                </div>
            )}
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>

                {/* Header */}
                <div style={{ marginBottom: 40 }}>
                    <Link href="/admin" style={{ fontSize: 13, color: '#475569', textDecoration: 'none', marginBottom: 12, display: 'block' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                        onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                        ← Admin Hub
                    </Link>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 3, color: '#ef4444', marginBottom: 8 }}>USER MANAGEMENT</div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Users</h1>
                    <div style={{ fontSize: 14, color: '#475569', marginTop: 8 }}>{users.length} total users</div>
                </div>

                {/* Table */}
                <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 160px', padding: '12px 20px', background: 'rgba(255,255,255,0.03)', fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#334155', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        <span>User</span><span>Email</span><span>Tier</span><span>Joined</span><span>Role</span>
                    </div>

                    {isLoading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#334155', fontSize: 14 }}>Loading users…</div>
                    ) : users.map((u: any, i: number) => {
                        const role: Role = u.role || 'user';
                        const meta = ROLE_META[role];
                        const isMe = u.id === user.id;
                        return (
                            <div key={u.id} style={{
                                display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 160px',
                                padding: '14px 20px', alignItems: 'center',
                                borderTop: '1px solid rgba(255,255,255,0.05)',
                                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                                opacity: updating === u.id ? 0.5 : 1,
                                transition: 'opacity 0.2s',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {/* Avatar */}
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${u.username?.charCodeAt(0) * 15 || 200}, 60%, 20%)`, border: `1px solid hsl(${u.username?.charCodeAt(0) * 15 || 200}, 60%, 35%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: `hsl(${u.username?.charCodeAt(0) * 15 || 200}, 80%, 70%)`, flexShrink: 0 }}>
                                        {u.username?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{u.username} {isMe && <span style={{ fontSize: 10, color: '#00ff80', fontFamily: "'Space Mono', monospace" }}>(you)</span>}</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: 13, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                                <div style={{ fontSize: 12, color: u.tier === 'premium' ? '#f59e0b' : '#475569', textTransform: 'capitalize' }}>{u.tier || 'free'}</div>
                                <div style={{ fontSize: 12, color: '#334155', fontFamily: "'Space Mono', monospace" }}>
                                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                                </div>
                                {/* Role selector */}
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={role}
                                        disabled={isMe || updating === u.id}
                                        onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                                        style={{ width: '100%', padding: '6px 10px', background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 6, color: meta.color, fontSize: 12, fontWeight: 700, cursor: isMe ? 'not-allowed' : 'pointer', outline: 'none', appearance: 'none', textAlign: 'center' }}>
                                        {ROLES.map(r => <option key={r} value={r} style={{ background: '#0d1117', color: '#e2e8f0' }}>{r}</option>)}
                                    </select>
                                    <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: meta.color, fontSize: 10 }}>▾</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
