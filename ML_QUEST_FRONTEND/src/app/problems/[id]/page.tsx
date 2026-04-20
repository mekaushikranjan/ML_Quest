'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { problemsApi, submissionsApi } from '@/lib/api';
import { useSubmission } from '@/hooks/useSubmission';
import { useAuthStore } from '@/store/auth.store';
import Navbar from '@/components/layout/Navbar';
import type { Language } from '@/types';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const STARTERS: Record<Language, string> = {
  python: `import sys\n\ndef solve():\n    data = sys.stdin.read().strip().split('\\n')\n    # Your solution here\n    pass\n\nsolve()`,
  javascript: `const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\n// Your solution here`,
  java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Your solution here\n    }\n}`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Your solution here\n    return 0;\n}`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n    // Your solution here\n}`,
};

const STATUS_CONFIG = {
  accepted: { color: '#00ff80', bg: 'rgba(0,255,128,0.08)', icon: '✓', label: 'Accepted' },
  wrong_answer: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: '✗', label: 'Wrong Answer' },
  runtime_error: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: '!', label: 'Runtime Error' },
  time_limit_exceeded: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: '⏱', label: 'Time Limit Exceeded' },
  compilation_error: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: '⚙', label: 'Compilation Error' },
  pending: { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', icon: '○', label: 'Pending' },
  running: { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', icon: '◉', label: 'Running...' },
};

export default function ProblemPage() {
  const params = useParams<{ id: string }>();
  const slug = params?.id ?? '';
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [language, setLanguage] = useState<Language>('python');
  const [code, setCode] = useState(STARTERS.python);
  const [activeTab, setActiveTab] = useState<'description' | 'submissions'>('description');
  const { submit, isSubmitting, result, progress, setResult } = useSubmission();

  const handleViewSubmission = async (sub: any) => {
    try {
      const detailed = await submissionsApi.getDetails(sub.id);
      if (detailed.data?.data) {
        setResult({ ...detailed.data.data, submissionId: sub.id });
      }
    } catch (err) {
      console.error('Failed to view full submission', err);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['problem', slug],
    queryFn: () => problemsApi.getBySlug(slug),
    enabled: !!slug,
  });

  const rawProblem = data?.data?.data;
  // Backend may return examples as JSON string; normalize to array
  const problem = rawProblem
    ? {
      ...rawProblem,
      examples: Array.isArray(rawProblem.examples)
        ? rawProblem.examples
        : typeof rawProblem.examples === 'string'
          ? (() => {
            try {
              return JSON.parse(rawProblem.examples) as unknown[];
            } catch {
              return [];
            }
          })()
          : [],
    }
    : undefined;

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSubmitting && result) {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['problem-submissions', problem?.id] });
        queryClient.invalidateQueries({ queryKey: ['problem-stats', problem?.id] });
      }, 500);
    }
  }, [isSubmitting, result, problem?.id, queryClient]);

  const { data: submissionsData } = useQuery({
    queryKey: ['problem-submissions', problem?.id],
    queryFn: () => submissionsApi.getUserSubmissions({ problemId: problem!.id, limit: 50 }),
    enabled: !!problem?.id && isAuthenticated,
    refetchInterval: isSubmitting ? 2000 : false, // Poll while submitting
  });

  const { data: statsData } = useQuery({
    queryKey: ['problem-stats', problem?.id],
    queryFn: () => submissionsApi.getSubmissionStats(problem!.id),
    enabled: !!problem?.id && isAuthenticated,
  });

  const { data: latestCodeData } = useQuery({
    queryKey: ['latest-accepted-code', problem?.id],
    queryFn: () => submissionsApi.getLatestAccepted(problem!.id),
    enabled: !!problem?.id && isAuthenticated,
    staleTime: Infinity, // Only fetch once per problem session
  });

  useEffect(() => {
    if (latestCodeData?.data?.data) {
      const { code, language: lang } = latestCodeData.data.data;
      setCode(code);
      setLanguage(lang as Language);
    }
  }, [latestCodeData]);

  const { data: submissionDetailsData } = useQuery({
    queryKey: ['submission-details', result?.submissionId],
    queryFn: () => submissionsApi.getDetails(result!.submissionId!),
    enabled: !!result?.submissionId,
  });

  const { data: testCaseCountData } = useQuery({
    queryKey: ['test-case-count', problem?.id],
    queryFn: () => problemsApi.getTestCasesCount(problem!.id),
    enabled: !!problem?.id && !!result?.submissionId,
  });

  // Fetch sample (non-hidden) test cases from DB/S3 so we only show visible test results
  const { data: sampleTestCasesData } = useQuery({
    queryKey: ['problem-test-cases', problem?.id],
    queryFn: () => problemsApi.getTestCases(problem!.id, { includeHidden: false }),
    enabled: !!problem?.id,
  });

  const problemSubmissions = submissionsData?.data?.data || [];
  const submissionStats = statsData?.data?.data;
  const submissionDetails = submissionDetailsData?.data?.data;
  const allTestResults = result?.testResults ?? submissionDetails?.testResults ?? [];
  const sampleTestCases = (sampleTestCasesData?.data?.data || []) as { id: string; is_sample?: boolean }[];
  const sampleCount = (testCaseCountData?.data?.data as { sample?: number })?.sample ?? 0;
  const sampleTestCaseIdSet = new Set(sampleTestCases.map((tc) => tc.id));
  const sampleTestCaseOrder = new Map(sampleTestCases.map((tc, i) => [tc.id, i]));

  // Fetch input/output content from backend (reads from S3) for each sample test case
  const testCaseContentQueries = useQueries({
    queries: (sampleTestCases || []).map((tc) => ({
      queryKey: ['test-case-content', problem?.id, tc.id],
      queryFn: () => problemsApi.getTestCaseContent(problem!.id, tc.id),
      enabled: !!problem?.id && !!tc.id,
    })),
  });
  const testCaseContents = testCaseContentQueries.map((q) => {
    const d = q.data?.data?.data;
    return d ? { input: d.input, output: d.output } : null;
  });

  // Show all test results that belong to sample (non-hidden) test cases only
  const visibleTestResults =
    sampleTestCaseIdSet.size > 0
      ? allTestResults
        .filter((tr: { testCaseId?: string }) => tr.testCaseId && sampleTestCaseIdSet.has(tr.testCaseId))
        .sort(
          (a: { testCaseId?: string }, b: { testCaseId?: string }) =>
            (sampleTestCaseOrder.get(a.testCaseId!) ?? 0) - (sampleTestCaseOrder.get(b.testCaseId!) ?? 0)
        )
      : sampleCount > 0
        ? allTestResults.slice(0, sampleCount)
        : [];

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setCode(STARTERS[lang]);
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    if (!problem) return;
    setActiveTab('submissions'); // Switch to results/submissions view visually
    await submit({ problemId: problem.id, language, code });
  };

  const handleRun = async () => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    if (!problem) return;
    setActiveTab('submissions'); // Switch to results view visually as well
    await submit({ problemId: problem.id, language, code, isRunOnly: true });
  };

  const diffColor = problem?.difficulty === 'easy' ? '#00ff80' :
    problem?.difficulty === 'medium' ? '#f59e0b' : '#ef4444';

  const statusConf = result ? STATUS_CONFIG[result.status] : null;

  return (
    <div
      className="ml-quest-page"
      style={{
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Loading Overlay Overlay to Freeze Screen on Submit/Run */}
      {isSubmitting && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(2px)',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6"
            strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          <div style={{ marginTop: 16, color: '#f8fafc', fontWeight: 600, fontSize: 16, letterSpacing: 1 }}>
            Running tests...
          </div>
        </div>
      )}

      <Navbar />

      {/* Breadcrumb */}
      <div style={{
        flexShrink: 0,
        padding: '8px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        color: '#334155',
        fontFamily: "'Space Mono', monospace",
      }}>
        <Link href="/problems" style={{ color: '#475569', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.color = '#00ff80'}
          onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
          PROBLEMS
        </Link>
        <span>/</span>
        <span style={{ color: '#64748b' }}>{problem?.title || slug || '...'}</span>
      </div>

      {/* Main split layout */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT PANEL (Description + Test cases) ── */}
        <div style={{
          width: '42%',
          minWidth: 320,
          borderRight: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 0,
        }}>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '0 16px',
          }}>
            <button className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveTab('description')}>
              Description
            </button>
            <button className={`tab-btn ${activeTab === 'submissions' ? 'active' : ''}`}
              onClick={() => setActiveTab('submissions')}>
              Submissions
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '20px 24px' }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[80, 60, 100, 70, 90].map((w, i) => (
                  <div key={i} style={{
                    height: 14, borderRadius: 4, width: `${w}%`,
                    background: 'rgba(255,255,255,0.04)',
                    animation: 'pulse 1.5s ease infinite',
                  }} />
                ))}
              </div>
            ) : problem && activeTab === 'description' ? (
              <>
                {/* Title + difficulty */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.3, flex: 1, paddingRight: 12 }}>
                    {problem.title}
                  </h1>
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    padding: '4px 10px',
                    borderRadius: 4,
                    color: diffColor,
                    background: diffColor + '15',
                    border: `1px solid ${diffColor}30`,
                    flexShrink: 0,
                  }}>
                    {problem.difficulty}
                  </span>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                  {problem.tags?.map((tag: string) => (
                    <span key={tag} style={{
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontFamily: "'Space Mono', monospace",
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#475569',
                    }}>{tag}</span>
                  ))}
                </div>

                {/* Description */}
                <div style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  letterSpacing: 2,
                  color: '#334155',
                  marginBottom: 8,
                }}>
                  DESCRIPTION
                </div>
                <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.8, marginBottom: 24, whiteSpace: 'pre-wrap' }}>
                  {problem.description || 'No description available.'}
                </div>

                {/* Sample Test Cases / Examples */}
                <div style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  letterSpacing: 2,
                  color: '#334155',
                  marginBottom: 12,
                }}>
                  SAMPLE TEST CASES
                </div>
                {problem.examples?.length ? problem.examples.map((ex: any, i: number) => (
                  <div key={i} style={{ marginBottom: 20 }}>
                    <div style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 10,
                      letterSpacing: 2,
                      color: '#334155',
                      marginBottom: 10,
                    }}>EXAMPLE {i + 1}</div>
                    <div className="example-block">
                      <div>
                        <span style={{ color: '#475569' }}>Input:  </span>
                        <span style={{ color: '#e2e8f0' }}>{ex.input}</span>
                      </div>
                      <div>
                        <span style={{ color: '#475569' }}>Output: </span>
                        <span style={{ color: '#00ff80' }}>{ex.output}</span>
                      </div>
                      {ex.explanation && (
                        <div style={{ marginTop: 8, color: '#475569', fontSize: 11 }}>
                          {ex.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                )) : (
                  <div style={{ fontSize: 13, color: '#475569', marginBottom: 20 }}>
                    No sample test cases. Use the examples in the description above.
                  </div>
                )}

                {/* Constraints */}
                {problem.constraints && (
                  <>
                    <div style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 10, letterSpacing: 2, color: '#334155', marginBottom: 10,
                    }}>CONSTRAINTS</div>
                    <div className="example-block" style={{ color: '#64748b', whiteSpace: 'pre-wrap' }}>
                      {problem.constraints}
                    </div>
                  </>
                )}
              </>
            ) : activeTab === 'submissions' ? (
              <div>
                {!isAuthenticated ? (
                  <div style={{ textAlign: 'center', paddingTop: 60, color: '#334155' }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, marginBottom: 8 }}>
                      YOUR SUBMISSIONS
                    </div>
                    <div style={{ fontSize: 13, color: '#1e293b' }}>Sign in to see your submissions</div>
                  </div>
                ) : submissionStats && (submissionStats as { acceptedCount?: number }).acceptedCount ? (
                  <div style={{ marginBottom: 16 }}>
                    <span style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 10,
                      color: '#00ff80',
                      background: 'rgba(0,255,128,0.1)',
                      padding: '4px 10px',
                      borderRadius: 4,
                      fontWeight: 700,
                    }}>
                      ✓ Accepted
                    </span>
                  </div>
                ) : null}
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#334155', marginBottom: 12 }}>
                  YOUR SUBMISSIONS
                </div>
                {problemSubmissions.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#475569' }}>No submissions yet. Submit your code to see results here.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {problemSubmissions.map((sub: any) => {
                      const conf = STATUS_CONFIG[sub.status as keyof typeof STATUS_CONFIG];
                      return (
                        <div
                          key={sub.id}
                          onClick={() => handleViewSubmission(sub)}
                          style={{
                            padding: '12px 14px',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 8,
                            background: result?.id === sub.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = result?.id === sub.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: sub.status === 'running' || sub.status === 'pending' ? STATUS_CONFIG.running.color : (conf?.color ?? '#64748b'),
                              background: sub.status === 'running' || sub.status === 'pending' ? STATUS_CONFIG.running.bg : (conf?.bg ?? 'rgba(255,255,255,0.05)'),
                              padding: '3px 8px',
                              borderRadius: 4,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}>
                              {(sub.status === 'running' || sub.status === 'pending') && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                  strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
                                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                                </svg>
                              )}
                              {conf?.label ?? sub.status}
                            </span>
                            <span style={{ fontSize: 11, color: '#475569' }}>
                              {sub.language} · {sub.runtimeMs != null ? `${sub.runtimeMs}ms` : '—'}
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
            ) : null}
          </div>
        </div>

        {/* ── RIGHT PANEL (Editor + Run/Submit) ── */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>

          {/* Editor toolbar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(255,255,255,0.01)',
          }}>
            <select
              className="lang-select"
              value={language}
              onChange={e => handleLanguageChange(e.target.value as Language)}
            >
              <option value="python">Python 3</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="go">Go</option>
            </select>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {isSubmitting && progress && (
                <span style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  color: '#3b82f6',
                }}>
                  {progress.passed}/{progress.total} cases
                </span>
              )}
              <button
                type="button"
                onClick={handleRun}
                disabled={isSubmitting || isLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#080d08',
                  background: '#94a3b8',
                  border: 'none',
                  borderRadius: 8,
                  cursor: isSubmitting || isLoading ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting || isLoading ? 0.6 : 1,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Run
              </button>
              <button
                type="button"
                className="submit-btn"
                onClick={handleSubmit}
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                    Judging
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Submit
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Monaco Editor — fixed height so test results stay visible below */}
          <div style={{ flex: 1, minHeight: 500, overflow: 'hidden' }}>
            <MonacoEditor
              height="100%"
              language={language === 'cpp' ? 'cpp' : language}
              value={code}
              onChange={val => setCode(val || '')}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                tabSize: language === 'python' ? 4 : 2,
                automaticLayout: true,
                padding: { top: 12 },
                renderLineHighlight: 'none',
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
              }}
            />
          </div>

          {/* Result Panel — always visible below the code editor */}
          <div
            className="result-panel"
            style={{
              height: 400,
              flexShrink: 0,
              overflowY: 'auto',
              overflowX: 'auto',
              background: (isSubmitting || result) && statusConf ? statusConf.bg : 'rgba(255,255,255,0.02)',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              padding: '16px 20px',
            }}
          >
            {isSubmitting && !result ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6"
                  strokeWidth="2" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6', marginBottom: 4 }}>
                    Running test cases...
                  </div>
                  {progress && (
                    <>
                      <div style={{ fontSize: 11, color: '#475569', fontFamily: "'Space Mono', monospace" }}>
                        {progress.passed} / {progress.total} passed
                      </div>
                      <div className="progress-bar" style={{ marginTop: 6 }}>
                        <div className="progress-fill" style={{
                          width: `${progress.total ? (progress.passed / progress.total) * 100 : 0}%`
                        }} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: '4px 0' }}>
                {/* Execution Summary (if we have a result from running/submitting) */}
                {result && statusConf && (
                  <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: result.error ? 12 : 0 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: statusConf.color + '20', border: `1px solid ${statusConf.color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, color: statusConf.color, fontWeight: 700, flexShrink: 0,
                      }}>
                        {statusConf.icon}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: statusConf.color }}>
                          {statusConf.label}
                        </div>
                        <div style={{ fontSize: 12, color: '#475569', fontFamily: "'Space Mono', monospace", marginTop: 2 }}>
                          {result.passedTests}/{result.totalTests} test cases passed
                          {result.runtimeMs != null && ` · ${result.runtimeMs}ms`}
                        </div>
                      </div>
                    </div>
                    {result.error && (
                      <pre style={{
                        margin: 0, padding: '10px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 6,
                        fontSize: 11, color: '#fca5a5', fontFamily: "'Space Mono', monospace",
                        overflow: 'auto', maxHeight: 100, lineHeight: 1.6,
                      }}>
                        {result.error}
                      </pre>
                    )}
                  </div>
                )}

                {/* Combined Test Cases Section */}
                {sampleTestCases.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#64748b', marginBottom: 10 }}>
                      {result ? 'TEST CASE RESULTS' : 'TEST CASES'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: 12, overflowX: 'auto', paddingBottom: 8, width: '100%' }}>
                      {sampleTestCases.map((tc, i) => {
                        const content = testCaseContents[i];
                        const loading = testCaseContentQueries[i]?.isLoading;
                        // Match Test result for this test case
                        const tr = allTestResults.find((r: any) => r.testCaseId === tc.id);
                        const passed = tr?.status === 'passed';
                        const outcomeColor = passed ? '#00ff80' : '#ef4444';

                        return (
                          <div
                            key={tc.id}
                            style={{
                              padding: '12px 14px',
                              background: 'rgba(255,255,255,0.02)',
                              border: `1px solid ${tr ? outcomeColor + '30' : 'rgba(255,255,255,0.08)'}`,
                              borderRadius: 8, minWidth: 320, maxWidth: 400, flexShrink: 0,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
                                Test case {i + 1}
                              </div>
                              {tr && (
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: outcomeColor }}>{passed ? 'Passed' : 'Failed'}</span>
                                  {tr.runtimeMs != null && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#475569' }}>{tr.runtimeMs}ms</span>}
                                </div>
                              )}
                            </div>

                            {loading ? (
                              <div style={{ fontSize: 11, color: '#64748b' }}>Loading content…</div>
                            ) : content ? (
                              <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Space Mono', monospace" }}>
                                {tr?.errorMessage ? (
                                  <div style={{ color: '#fca5a5', marginBottom: 4 }}>{tr.errorMessage}</div>
                                ) : (
                                  <>
                                    <div style={{ marginBottom: 6 }}>
                                      <span style={{ fontSize: 10, color: '#475569', letterSpacing: 1 }}>Input:</span>
                                      <pre style={{ margin: '4px 0 0', padding: 8, background: 'rgba(0,0,0,0.25)', borderRadius: 4, fontFamily: "'Space Mono', monospace", whiteSpace: 'pre', overflow: 'auto', maxHeight: 80, color: '#e2e8f0' }}>{content.input || '(empty)'}</pre>
                                    </div>
                                    <div style={{ marginBottom: 6 }}>
                                      <span style={{ fontSize: 10, color: '#475569', letterSpacing: 1 }}>Expected output:</span>
                                      <pre style={{ margin: '4px 0 0', padding: 8, background: 'rgba(0,0,0,0.25)', borderRadius: 4, fontFamily: "'Space Mono', monospace", whiteSpace: 'pre', overflow: 'auto', maxHeight: 80, color: '#00ff80' }}>{(tr?.expectedOutput != null) ? tr.expectedOutput : content.output || '(empty)'}</pre>
                                    </div>
                                    {tr?.actualOutput != null && (
                                      <div>
                                        <span style={{ fontSize: 10, color: '#475569', letterSpacing: 1 }}>Your output:</span>
                                        <pre style={{ margin: '4px 0 0', padding: 8, background: 'rgba(0,0,0,0.25)', borderRadius: 4, fontFamily: "'Space Mono', monospace", whiteSpace: 'pre', overflow: 'auto', maxHeight: 80, color: outcomeColor }}>{tr.actualOutput}</pre>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            ) : (
                              <div style={{ fontSize: 11, color: '#64748b' }}>Unable to load</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!result && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: sampleTestCases.length > 0 ? 'flex-start' : 'center',
                    minHeight: sampleTestCases.length > 0 ? 0 : 140,
                    padding: 24, paddingBottom: 8, fontFamily: "'Space Mono', monospace", fontSize: 13, color: '#94a3b8', textAlign: 'center',
                  }}>
                    <span style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Test case results will appear here</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Run or Submit your code to see results</span>
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