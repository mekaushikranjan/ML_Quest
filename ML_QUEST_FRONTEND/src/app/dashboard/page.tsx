'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { submissionsApi, problemsApi } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import type { Submission } from '@/types';

const STATUS_COLOR: Record<string, string> = {
  accepted: '#00ff80',
  wrong_answer: '#ef4444',
  runtime_error: '#ef4444',
  time_limit_exceeded: '#f59e0b',
  compilation_error: '#ef4444',
  pending: '#3b82f6',
  running: '#3b82f6',
};

const STATUS_LABEL: Record<string, string> = {
  accepted: 'Accepted',
  wrong_answer: 'Wrong Answer',
  runtime_error: 'Runtime Error',
  time_limit_exceeded: 'TLE',
  compilation_error: 'Compile Error',
  pending: 'Pending',
  running: 'Running',
};

function StatCard({ value, label, sub, accent = false }: { value: string | number; label: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      padding: '24px',
      border: `1px solid ${accent ? 'rgba(0,255,128,0.15)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 12,
      background: accent ? 'rgba(0,255,128,0.02)' : 'rgba(255,255,255,0.01)',
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 36,
        fontWeight: 700,
        color: accent ? '#00ff80' : '#e2e8f0',
        lineHeight: 1,
        marginBottom: 8,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: sub ? 2 : 0 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#334155', fontFamily: "'Space Mono', monospace" }}>{sub}</div>}
    </div>
  );
}

function HeatmapGrid({ submissions }: { submissions: Submission[] }) {
  // Build a simple last-30-days activity map
  const days = 30;
  const today = new Date();
  const counts: Record<string, number> = {};

  submissions.forEach(s => {
    const date = new Date(s.createdAt).toDateString();
    counts[date] = (counts[date] || 0) + 1;
  });

  const cells = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    const count = counts[d.toDateString()] || 0;
    return { date: d, count };
  });

  const getColor = (count: number) => {
    if (count === 0) return 'rgba(255,255,255,0.04)';
    if (count === 1) return 'rgba(0,255,128,0.2)';
    if (count <= 3) return 'rgba(0,255,128,0.4)';
    return 'rgba(0,255,128,0.7)';
  };

  return (
    <div>
      <div style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 10, letterSpacing: 2, color: '#334155', marginBottom: 12,
      }}>ACTIVITY · LAST 30 DAYS</div>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {cells.map((cell, i) => (
          <div
            key={i}
            title={`${cell.date.toDateString()}: ${cell.count} submission${cell.count !== 1 ? 's' : ''}`}
            style={{
              width: 14, height: 14,
              borderRadius: 3,
              background: getColor(cell.count),
              transition: 'transform 0.1s',
              cursor: 'default',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.3)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;          // wait for localStorage to load
    if (!isAuthenticated) router.push('/auth/login');
  }, [_hasHydrated, isAuthenticated, router]);

  const { data: submissionsData, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ['user-submissions'],
    queryFn: () => submissionsApi.getUserSubmissions({ limit: 50 }),
    enabled: isAuthenticated,
  });

  const { data: problemsData, isLoading: isLoadingProblems } = useQuery({
    queryKey: ['problems-all'],
    queryFn: () => problemsApi.getList({ limit: 1000 }), // large limit to get map of problemId to difficulty
    enabled: isAuthenticated,
  });

  const isLoading = isLoadingSubmissions || isLoadingProblems;

  const submissions: Submission[] = submissionsData?.data?.data || [];
  const problems = problemsData?.data?.data?.problems || [];

  // Create problem dictionary for O(1) lookups
  const problemDict: Record<string, any> = {};
  problems.forEach((p: any) => {
    problemDict[p.id] = p;
  });

  // Compute stats
  const total = submissions.length;
  const accepted = submissions.filter(s => s.status === 'accepted').length;
  const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

  // Find unique accepted problems and their difficulties
  const acceptedSubmissions = submissions.filter(s => s.status === 'accepted');
  const uniqueAcceptedProblems = new Set(acceptedSubmissions.map(s => s.problemId));
  const uniqueProblems = new Set(submissions.map(s => s.problemId)).size;

  const difficultyCounts = {
    easy: 0,
    medium: 0,
    hard: 0,
  };

  uniqueAcceptedProblems.forEach(pid => {
    const p = problemDict[pid];
    if (p && p.difficulty) {
      if (p.difficulty === 'easy') difficultyCounts.easy++;
      if (p.difficulty === 'medium') difficultyCounts.medium++;
      if (p.difficulty === 'hard') difficultyCounts.hard++;
    }
  });

  const avgRuntime = submissions.filter(s => s.runtimeMs).length > 0
    ? Math.round(submissions.filter(s => s.runtimeMs).reduce((a, s) => a + (s.runtimeMs || 0), 0) / submissions.filter(s => s.runtimeMs).length)
    : 0;

  const recentSubmissions = submissions.slice(0, 10);

  if (!_hasHydrated) return null;       // avoid flash before hydration
  if (!isAuthenticated || !user) return null;

  return (
    <div className="ml-quest-page">
      <Navbar />
      <div className="ml-quest-container-narrow">

        {/* Profile Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginBottom: 40,
          paddingBottom: 40,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          animation: 'fadeInUp 0.5s ease both',
        }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #00ff80, #00ccff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: '#080d08',
            flexShrink: 0,
          }}>
            {user.username.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>
                {user.username}
              </h1>
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 9,
                padding: '3px 8px',
                borderRadius: 4,
                background: user.tier === 'premium' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${user.tier === 'premium' ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`,
                color: user.tier === 'premium' ? '#f59e0b' : '#475569',
                letterSpacing: 1,
              }}>
                {user.tier.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#475569' }}>{user.email}</div>
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <Link href="/problems" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              background: '#00ff80',
              color: '#080d08',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 13,
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#00e672'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#00ff80'; }}
            >
              Solve Problems →
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 40,
          animation: 'fadeInUp 0.5s ease 0.1s both',
        }}>
          <StatCard value={accepted} label="Problems Solved" sub="accepted" accent />
          <StatCard value={`${acceptanceRate}%`} label="Acceptance Rate" sub={`${total} submissions`} />
          <StatCard value={uniqueProblems} label="Unique Problems" sub="attempted" />
          <StatCard value={avgRuntime ? `${avgRuntime}ms` : '—'} label="Avg Runtime" sub="accepted only" />
        </div>

        {/* Activity Heatmap */}
        <div style={{
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
          marginBottom: 32,
          animation: 'fadeInUp 0.5s ease 0.2s both',
        }}>
          <HeatmapGrid submissions={submissions} />
        </div>

        {/* Difficulty Breakdown */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 40,
          animation: 'fadeInUp 0.5s ease 0.25s both',
        }}>
          {[
            { label: 'Easy', color: '#00ff80', count: difficultyCounts.easy },
            { label: 'Medium', color: '#f59e0b', count: difficultyCounts.medium },
            { label: 'Hard', color: '#ef4444', count: difficultyCounts.hard },
          ].map(d => (
            <div key={d.label} style={{
              padding: '20px',
              border: `1px solid ${d.color}20`,
              borderRadius: 10,
              background: `${d.color}04`,
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 28, fontWeight: 700,
                color: d.color, marginBottom: 4,
              }}>{d.count}</div>
              <div style={{ fontSize: 12, color: '#475569' }}>{d.label} solved</div>
              <div style={{
                marginTop: 10, height: 3, borderRadius: 2,
                background: 'rgba(255,255,255,0.05)',
              }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: d.color,
                  width: `${Math.min(d.count * 10, 100)}%`,
                  transition: 'width 0.8s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Recent Submissions */}
        <div style={{ animation: 'fadeInUp 0.5s ease 0.3s both' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p className="section-label" style={{ margin: 0 }}>RECENT SUBMISSIONS</p>
            <Link href="/problems" style={{ fontSize: 12, color: '#475569', textDecoration: 'none', fontFamily: "'Space Mono', monospace" }}
              onMouseEnter={e => e.currentTarget.style.color = '#00ff80'}
              onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
              VIEW ALL →
            </Link>
          </div>

          <div style={{
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div className="sub-row" style={{
              background: 'rgba(255,255,255,0.02)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: 1.5,
              color: '#334155',
            }}>
              <div>PROBLEM</div>
              <div>STATUS</div>
              <div>LANGUAGE</div>
              <div>RUNTIME</div>
              <div>TIME</div>
            </div>

            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="sub-row">
                  <div className="skeleton" style={{ width: '70%' }} />
                  <div className="skeleton" style={{ width: '80%' }} />
                  <div className="skeleton" style={{ width: '60%' }} />
                  <div className="skeleton" style={{ width: '50%' }} />
                  <div className="skeleton" style={{ width: '70%' }} />
                </div>
              ))
            ) : recentSubmissions.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#334155' }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, marginBottom: 8 }}>
                  NO SUBMISSIONS YET
                </div>
                <Link href="/problems" style={{ fontSize: 13, color: '#00ff80', textDecoration: 'none' }}>
                  Start solving →
                </Link>
              </div>
            ) : (
              recentSubmissions.map(sub => {
                const statusColor = STATUS_COLOR[sub.status] || '#64748b';
                const timeAgo = (() => {
                  const diff = Date.now() - new Date(sub.createdAt).getTime();
                  const mins = Math.floor(diff / 60000);
                  const hrs = Math.floor(mins / 60);
                  const days = Math.floor(hrs / 24);
                  if (days > 0) return `${days}d ago`;
                  if (hrs > 0) return `${hrs}h ago`;
                  if (mins > 0) return `${mins}m ago`;
                  return 'just now';
                })();

                const pDetails = problemDict[sub.problemId];
                return (
                  <div key={sub.id} className="sub-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, display: 'inline-block', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pDetails?.title || sub.problemId.slice(0, 8) + '...'}
                      </span>
                      {pDetails?.difficulty && (
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          fontFamily: "'Space Mono', monospace",
                          padding: '2px 6px',
                          borderRadius: 4,
                          textTransform: 'uppercase',
                          color: pDetails.difficulty === 'easy' ? '#00ff80' : pDetails.difficulty === 'medium' ? '#f59e0b' : '#ef4444',
                          background: pDetails.difficulty === 'easy' ? 'rgba(0,255,128,0.1)' : pDetails.difficulty === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                          flexShrink: 0
                        }}>
                          {pDetails.difficulty}
                        </span>
                      )}
                    </div>
                    <div>
                      <span style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 10,
                        color: statusColor,
                        background: statusColor + '15',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontWeight: 700,
                      }}>
                        {STATUS_LABEL[sub.status] || sub.status}
                      </span>
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#475569' }}>
                      {sub.language}
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#475569' }}>
                      {sub.runtimeMs ? `${sub.runtimeMs}ms` : '—'}
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#334155' }}>
                      {timeAgo}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}