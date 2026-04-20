'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { mlProblemsApi, mlApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import Navbar from '@/components/layout/Navbar';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const TASK_TYPE_COLOR: Record<string, { color: string; bg: string }> = {
    clustering: { color: '#38bdf8', bg: 'rgba(56,189,248,0.10)' },
    regression: { color: '#fb923c', bg: 'rgba(251,146,60,0.10)' },
    classification: { color: '#4ade80', bg: 'rgba(74,222,128,0.10)' },
    dataframe_analysis: { color: '#facc15', bg: 'rgba(250,204,21,0.10)' },
    neural_network: { color: '#f472b6', bg: 'rgba(244,114,182,0.10)' },
    dimensionality_reduction: { color: '#a78bfa', bg: 'rgba(167,139,250,0.10)' },
    general: { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' },
};

const TASK_TYPE_LABEL: Record<string, string> = {
    clustering: 'Clustering', regression: 'Regression', classification: 'Classification',
    dataframe_analysis: 'DataFrame', neural_network: 'Neural Net',
    dimensionality_reduction: 'Dim. Reduction', general: 'General',
};

const DIFFICULTY_STYLE: Record<string, { color: string }> = {
    easy: { color: '#00ff80' }, medium: { color: '#f59e0b' }, hard: { color: '#ef4444' },
};

type MLStatus = 'idle' | 'submitting' | 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'runtime_error';
type LeftTab = 'description' | 'testcases' | 'history';

export default function MLProblemPage() {
    const params = useParams<{ id: string }>();
    const slug = params?.id ?? '';
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const queryClient = useQueryClient();

    const [code, setCode] = useState('');
    const [activeTab, setActiveTab] = useState<LeftTab>('description');
    const [mlStatus, setMlStatus] = useState<MLStatus>('idle');
    const [mlResult, setMlResult] = useState<any>(null);
    const [mlError, setMlError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const codeRef = useRef(false);

    const { data: problemData, isLoading } = useQuery({
        queryKey: ['ml-problem', slug],
        queryFn: () => mlProblemsApi.getById(slug),
        enabled: !!slug,
    });
    const problem = problemData?.data?.data;

    if (problem && !codeRef.current) {
        codeRef.current = true;
        setCode(problem.starterCode || '');
    }

    const { data: historyData } = useQuery({
        queryKey: ['ml-user-submissions'],
        queryFn: () => mlApi.getUserSubmissions({ limit: 20 }),
        enabled: isAuthenticated,
    });
    const history: any[] = historyData?.data?.data || [];

    const { data: latestCodeData } = useQuery({
        queryKey: ['latest-accepted-ml-code', problem?.id],
        queryFn: () => mlApi.getLatestAccepted(problem!.id),
        enabled: !!problem?.id && isAuthenticated,
        staleTime: Infinity,
    });

    useEffect(() => {
        if (latestCodeData?.data?.data) {
            setCode(latestCodeData.data.data.code);
            codeRef.current = true; // Mark as initialized so problem.starterCode doesn't override it
        }
    }, [latestCodeData]);

    const pollStatus = useCallback(async (id: string) => {
        try {
            const res = await mlApi.getById(id);
            const status = res.data?.data?.status as MLStatus;
            setMlStatus(status);

            if (status === 'completed') {
                try {
                    const resultRes = await mlApi.getResults(id);
                    setMlResult(resultRes.data?.data);
                } catch { /* retry handled by user */ }
                queryClient.invalidateQueries({ queryKey: ['ml-user-submissions'] });
                return;
            }

            if (['failed', 'timeout', 'runtime_error'].includes(status)) {
                setMlError(`Submission ${status.replace('_', ' ')}`);
                queryClient.invalidateQueries({ queryKey: ['ml-user-submissions'] });
                return;
            }

            pollRef.current = setTimeout(() => pollStatus(id), 3000);
        } catch { setMlError('Failed to fetch status'); }
    }, [queryClient]);

    const handleAnalyze = async () => {
        if (!isAuthenticated) { router.push('/auth/login'); return; }
        if (!code.trim()) return;

        setMlStatus('submitting');
        setMlResult(null);
        setMlError(null);
        if (pollRef.current) clearTimeout(pollRef.current);

        try {
            const res = await mlApi.submit({
                code,
                problemId: problem?.id,
                taskTypeHint: problem?.taskType,
            });
            const id = res.data?.data?.id;
            if (!id) throw new Error('No submission id');
            setMlStatus('pending');
            pollRef.current = setTimeout(() => pollStatus(id), 2000);
        } catch (err: any) {
            const msg = err?.response?.data?.error?.message || err.message || 'Submission failed';
            setMlError(msg);
            setMlStatus('idle');
        }
    };

    const isAnalyzing = ['submitting', 'pending', 'running'].includes(mlStatus);
    const taskStyle = TASK_TYPE_COLOR[problem?.taskType || ''] || TASK_TYPE_COLOR.general;
    const testCases: any[] = problem?.testCases || [];
    const testResults: any[] = mlResult?.testCaseResults || [];
    const passedCount = testResults.filter((t: any) => t.passed).length;

    return (
        <div className="ml-quest-page" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {isAnalyzing && (
                <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                    zIndex: 9999, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)',
                }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={taskStyle.color}
                        strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                    <div style={{ marginTop: 14, color: '#f8fafc', fontWeight: 600, fontSize: 15 }}>
                        {mlStatus === 'submitting' ? 'Submitting…' : mlStatus === 'pending' ? 'Queued…' : 'Analyzing ML code…'}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: '#64748b', fontFamily: "'Space Mono', monospace" }}>
                        {mlStatus}
                    </div>
                </div>
            )}

            <Navbar />

            {/* Breadcrumb */}
            <div style={{
                flexShrink: 0, padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12, color: '#334155', fontFamily: "'Space Mono', monospace",
            }}>
                <Link href="/ml-practice" style={{ color: '#a78bfa', textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#c4b5fd'}
                    onMouseLeave={e => e.currentTarget.style.color = '#a78bfa'}>
                    ML PRACTICE
                </Link>
                <span>/</span>
                <span style={{ color: '#64748b' }}>{problem?.title || slug}</span>
            </div>

            <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

                {/* ── LEFT PANEL ── */}
                <div style={{
                    width: '42%', minWidth: 320,
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 16px', gap: 4 }}>
                        {(['description', 'testcases', 'history'] as const).map((tab) => (
                            <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                                style={{ position: 'relative' }}>
                                {tab === 'description' ? 'Description'
                                    : tab === 'testcases' ? (
                                        <>
                                            Test Cases
                                            {testCases.length > 0 && (
                                                <span style={{
                                                    marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                                                    background: testResults.length > 0
                                                        ? passedCount === testResults.length ? 'rgba(0,255,128,0.15)' : 'rgba(239,68,68,0.15)'
                                                        : 'rgba(255,255,255,0.06)',
                                                    color: testResults.length > 0
                                                        ? passedCount === testResults.length ? '#00ff80' : '#ef4444'
                                                        : '#475569',
                                                }}>
                                                    {testResults.length > 0 ? `${passedCount}/${testCases.length}` : testCases.length}
                                                </span>
                                            )}
                                        </>
                                    ) : 'My Submissions'}
                            </button>
                        ))}
                    </div>

                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px' }}>

                        {/* ── DESCRIPTION TAB ── */}
                        {activeTab === 'description' && !isLoading && problem && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                                    <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.3, flex: 1, paddingRight: 12 }}>
                                        {problem.title}
                                    </h1>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                                        <span style={{
                                            fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700,
                                            padding: '3px 8px', borderRadius: 4, color: taskStyle.color, background: taskStyle.bg,
                                        }}>
                                            {TASK_TYPE_LABEL[problem.taskType] || problem.taskType}
                                        </span>
                                        <span style={{
                                            fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700,
                                            padding: '3px 8px', borderRadius: 4, textAlign: 'center',
                                            color: DIFFICULTY_STYLE[problem.difficulty]?.color || '#94a3b8',
                                            background: (DIFFICULTY_STYLE[problem.difficulty]?.color || '#94a3b8') + '15',
                                        }}>
                                            {problem.difficulty}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 20 }}>
                                    {(problem.tags || []).map((tag: string) => (
                                        <span key={tag} style={{
                                            padding: '3px 8px', borderRadius: 4, fontSize: 11,
                                            fontFamily: "'Space Mono', monospace",
                                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#475569',
                                        }}>{tag}</span>
                                    ))}
                                </div>

                                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#334155', marginBottom: 8 }}>
                                    DESCRIPTION
                                </div>
                                <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.8, marginBottom: 24, whiteSpace: 'pre-wrap' }}>
                                    {problem.description}
                                </div>

                                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#334155', marginBottom: 10 }}>
                                    EVALUATION CRITERIA
                                </div>
                                <div style={{
                                    padding: '14px 16px', borderRadius: 8, marginBottom: 20,
                                    background: 'rgba(255,255,255,0.02)', border: `1px solid ${taskStyle.color}25`,
                                }}>
                                    {(problem.evaluationCriteria || []).map((c: string, i: number) => (
                                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < problem.evaluationCriteria.length - 1 ? 8 : 0 }}>
                                            <span style={{ color: taskStyle.color, fontSize: 13, flexShrink: 0 }}>◈</span>
                                            <span style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{c}</span>
                                        </div>
                                    ))}
                                </div>

                                {(problem.hints || []).length > 0 && (
                                    <>
                                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#334155', marginBottom: 10 }}>
                                            HINTS
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {(problem.hints || []).map((h: string, i: number) => (
                                                <div key={i} style={{
                                                    padding: '10px 14px', borderRadius: 8, fontSize: 13, color: '#64748b',
                                                    background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)',
                                                    display: 'flex', gap: 8,
                                                }}>
                                                    <span style={{ color: '#f59e0b', flexShrink: 0 }}>💡</span>
                                                    {h}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {/* ── TEST CASES TAB ── */}
                        {activeTab === 'testcases' && (
                            <>
                                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#334155', marginBottom: 12 }}>
                                    TEST CASES
                                </div>
                                {testCases.length === 0 ? (
                                    <div style={{ fontSize: 13, color: '#475569' }}>No test cases defined for this problem.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {testCases.map((tc: any, i: number) => {
                                            const result = testResults.find((r: any) => r.id === tc.id);
                                            const hasPassed = result?.passed;
                                            const hasRun = result !== undefined;
                                            return (
                                                <div key={tc.id} style={{
                                                    border: hasRun
                                                        ? `1px solid ${hasPassed ? 'rgba(0,255,128,0.25)' : 'rgba(239,68,68,0.25)'}`
                                                        : '1px solid rgba(255,255,255,0.07)',
                                                    borderRadius: 10, overflow: 'hidden',
                                                }}>
                                                    {/* Header */}
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        padding: '10px 14px',
                                                        background: hasRun
                                                            ? hasPassed ? 'rgba(0,255,128,0.05)' : 'rgba(239,68,68,0.05)'
                                                            : 'rgba(255,255,255,0.02)',
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <span style={{
                                                                fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#334155',
                                                            }}>
                                                                TC{i + 1}
                                                            </span>
                                                            <span style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>
                                                                {tc.description}
                                                            </span>
                                                        </div>
                                                        {hasRun ? (
                                                            <span style={{
                                                                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                                                                color: hasPassed ? '#00ff80' : '#ef4444',
                                                                background: hasPassed ? 'rgba(0,255,128,0.1)' : 'rgba(239,68,68,0.1)',
                                                                fontFamily: "'Space Mono', monospace",
                                                            }}>
                                                                {hasPassed ? '✓ PASS' : '✗ FAIL'}
                                                            </span>
                                                        ) : (
                                                            <span style={{
                                                                fontSize: 10, padding: '2px 8px', borderRadius: 4, color: '#334155',
                                                                background: 'rgba(255,255,255,0.04)', fontFamily: "'Space Mono', monospace",
                                                            }}>
                                                                NOT RUN
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Expected output */}
                                                    <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                                        <div style={{ fontSize: 10, color: '#334155', fontFamily: "'Space Mono', monospace", marginBottom: 5 }}>
                                                            EXPECTED OUTPUT
                                                        </div>
                                                        <code style={{
                                                            fontSize: 12, color: '#94a3b8',
                                                            fontFamily: "'Space Mono', monospace",
                                                            background: 'rgba(255,255,255,0.03)',
                                                            padding: '5px 8px', borderRadius: 4, display: 'block',
                                                        }}>
                                                            {tc.expectedOutput}
                                                        </code>
                                                    </div>

                                                    {/* Failure hint */}
                                                    {hasRun && !hasPassed && result?.actualHint && (
                                                        <div style={{
                                                            padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.04)',
                                                            background: 'rgba(239,68,68,0.04)',
                                                        }}>
                                                            <div style={{ fontSize: 10, color: '#ef4444', fontFamily: "'Space Mono', monospace", marginBottom: 4 }}>
                                                                WHAT WENT WRONG
                                                            </div>
                                                            <div style={{ fontSize: 12, color: '#fca5a5' }}>{result.actualHint}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {testCases.length > 0 && testResults.length === 0 && (
                                    <div style={{
                                        marginTop: 16, padding: '10px 14px', borderRadius: 8, fontSize: 12, color: '#475569',
                                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                                    }}>
                                        👆 Click <strong style={{ color: '#a78bfa' }}>Analyze</strong> to run these test cases against your code.
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── HISTORY TAB ── */}
                        {activeTab === 'history' && (
                            <div>
                                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#334155', marginBottom: 12 }}>
                                    YOUR ML SUBMISSIONS
                                </div>
                                {!isAuthenticated ? (
                                    <div style={{ fontSize: 13, color: '#475569' }}>Sign in to see your submissions.</div>
                                ) : history.length === 0 ? (
                                    <div style={{ fontSize: 13, color: '#475569' }}>No submissions yet.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {history.map((sub: any) => {
                                            const ts = TASK_TYPE_COLOR[sub.taskType] || TASK_TYPE_COLOR.general;
                                            const isTerminal = ['completed', 'failed', 'timeout', 'runtime_error'].includes(sub.status);
                                            return (
                                                <div key={sub.id} style={{
                                                    padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)',
                                                    borderRadius: 8, background: 'rgba(255,255,255,0.02)',
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, color: ts.color, background: ts.bg, fontFamily: "'Space Mono', monospace" }}>
                                                                {TASK_TYPE_LABEL[sub.taskType] || sub.taskType}
                                                            </span>
                                                            <span style={{
                                                                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                                                                color: sub.status === 'completed' ? '#00ff80' : sub.status === 'failed' ? '#ef4444' : '#3b82f6',
                                                                background: sub.status === 'completed' ? 'rgba(0,255,128,0.1)' : sub.status === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                                                                display: 'flex', alignItems: 'center', gap: 4,
                                                            }}>
                                                                {!isTerminal && (
                                                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
                                                                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                                                                    </svg>
                                                                )}
                                                                {sub.status}
                                                            </span>
                                                        </div>
                                                        <span style={{ fontSize: 11, color: '#475569', fontFamily: "'Space Mono', monospace" }}>
                                                            {sub.runtimeMs ? `${sub.runtimeMs}ms` : '—'}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#334155', marginTop: 6 }}>
                                                        {new Date(sub.createdAt).toLocaleString()}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Editor + Result ── */}
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

                    {/* Toolbar */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: 'rgba(255,255,255,0.01)', flexShrink: 0,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                                fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#475569',
                                background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)',
                            }}>
                                Python 3  ·  ML only
                            </span>
                            {mlResult && testCases.length > 0 && (
                                <span style={{
                                    fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                                    color: passedCount === testCases.length ? '#00ff80' : '#f59e0b',
                                    background: passedCount === testCases.length ? 'rgba(0,255,128,0.08)' : 'rgba(245,158,11,0.08)',
                                    border: `1px solid ${passedCount === testCases.length ? 'rgba(0,255,128,0.2)' : 'rgba(245,158,11,0.2)'}`,
                                    fontFamily: "'Space Mono', monospace",
                                }}>
                                    {passedCount}/{testCases.length} tests passed
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || isLoading}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '8px 20px', fontSize: 13, fontWeight: 700,
                                background: isAnalyzing ? 'rgba(167,139,250,0.2)' : taskStyle.color,
                                color: isAnalyzing ? taskStyle.color : '#080d08',
                                border: `1px solid ${taskStyle.color}`,
                                borderRadius: 8, cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {isAnalyzing ? (
                                <>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                                    </svg>
                                    Analyzing…
                                </>
                            ) : (
                                <>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                        <polygon points="5 3 19 12 5 21 5 3" />
                                    </svg>
                                    Analyze
                                </>
                            )}
                        </button>
                    </div>

                    {/* Monaco */}
                    <div style={{ flex: 1, minHeight: 300, overflow: 'hidden' }}>
                        <MonacoEditor
                            height="100%"
                            language="python"
                            value={code}
                            onChange={(val) => setCode(val || '')}
                            theme="vs-dark"
                            options={{
                                fontSize: 13,
                                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                fontLigatures: true,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                wordWrap: 'on',
                                lineNumbers: 'on',
                                tabSize: 4,
                                automaticLayout: true,
                                padding: { top: 12 },
                                renderLineHighlight: 'none',
                            }}
                        />
                    </div>

                    {/* ── Result Panel ── */}
                    <div style={{
                        flexShrink: 0, height: 320, overflowY: 'auto',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.01)', padding: '14px 18px',
                    }}>
                        {!mlResult && !mlError && (
                            <div style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                height: '100%', fontFamily: "'Space Mono', monospace", fontSize: 13, color: '#334155', textAlign: 'center',
                            }}>
                                <span style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#475569' }}>
                                    ML Analysis results will appear here
                                </span>
                                <span style={{ fontSize: 12, color: '#1e293b' }}>Write your Python ML code and click Analyze</span>
                            </div>
                        )}

                        {mlError && (
                            <div style={{
                                padding: '12px 14px', borderRadius: 8,
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            }}>
                                <div style={{ fontWeight: 700, color: '#ef4444', fontSize: 13, marginBottom: 4 }}>Analysis Failed</div>
                                <div style={{ fontSize: 12, color: '#fca5a5', fontFamily: "'Space Mono', monospace" }}>{mlError}</div>
                            </div>
                        )}

                        {mlResult && (
                            <div>
                                {/* Summary row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                        background: taskStyle.color + '20', border: `1px solid ${taskStyle.color}40`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                                    }}>✓</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: taskStyle.color }}>Analysis Complete</div>
                                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontFamily: "'Space Mono', monospace" }}>
                                            {mlResult.summary}
                                        </div>
                                    </div>
                                    {/* Test case badge */}
                                    {testCases.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                            <div style={{
                                                fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 800,
                                                color: passedCount === testCases.length ? '#00ff80' : '#f59e0b',
                                            }}>
                                                {passedCount}/{testCases.length}
                                            </div>
                                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#334155' }}>TESTS</div>
                                        </div>
                                    )}
                                </div>

                                {/* Test case rows in result panel */}
                                {testResults.length > 0 && (
                                    <div style={{ marginBottom: 14 }}>
                                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#334155', marginBottom: 8 }}>
                                            TEST CASE RESULTS
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {testResults.map((r: any, idx: number) => (
                                                <div key={r.id} style={{
                                                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', borderRadius: 6,
                                                    background: r.passed ? 'rgba(0,255,128,0.04)' : 'rgba(239,68,68,0.04)',
                                                    border: `1px solid ${r.passed ? 'rgba(0,255,128,0.12)' : 'rgba(239,68,68,0.12)'}`,
                                                }}>
                                                    <span style={{
                                                        width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center',
                                                        justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 1,
                                                        color: r.passed ? '#00ff80' : '#ef4444',
                                                        background: r.passed ? 'rgba(0,255,128,0.12)' : 'rgba(239,68,68,0.12)',
                                                    }}>
                                                        {r.passed ? '✓' : '✗'}
                                                    </span>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>
                                                            TC{idx + 1}: {r.description}
                                                        </div>
                                                        {!r.passed && r.actualHint && (
                                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>→ {r.actualHint}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Metrics */}
                                {mlResult.metrics?.length > 0 && (
                                    <div style={{ marginBottom: 14 }}>
                                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#334155', marginBottom: 8 }}>
                                            METRICS
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                                            {mlResult.metrics.map((m: any, i: number) => (
                                                <div key={i} style={{
                                                    padding: '10px 12px', borderRadius: 8,
                                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                                }}>
                                                    <div style={{ fontSize: 10, color: '#475569', fontFamily: "'Space Mono', monospace", marginBottom: 4 }}>
                                                        {m.label}
                                                    </div>
                                                    <div style={{ fontWeight: 700, fontSize: 14, color: taskStyle.color }}>
                                                        {m.value}{m.unit ? ` ${m.unit}` : ''}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Insights */}
                                {mlResult.insights?.length > 0 && (
                                    <div style={{ marginBottom: 10 }}>
                                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#334155', marginBottom: 8 }}>
                                            INSIGHTS
                                        </div>
                                        {mlResult.insights.map((ins: string, i: number) => (
                                            <div key={i} style={{
                                                padding: '7px 12px', borderRadius: 6, fontSize: 12, color: '#94a3b8',
                                                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                                                display: 'flex', gap: 8, marginBottom: 5,
                                            }}>
                                                <span style={{ color: taskStyle.color, flexShrink: 0 }}>•</span>
                                                {ins}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Warnings */}
                                {mlResult.warnings?.length > 0 && (
                                    <div>
                                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#334155', marginBottom: 8 }}>
                                            WARNINGS
                                        </div>
                                        {mlResult.warnings.map((w: string, i: number) => (
                                            <div key={i} style={{
                                                padding: '7px 12px', borderRadius: 6, fontSize: 12, color: '#fbbf24',
                                                background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)',
                                                display: 'flex', gap: 8, marginBottom: 5,
                                            }}>
                                                <span style={{ flexShrink: 0 }}>⚠️</span>
                                                {w}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
