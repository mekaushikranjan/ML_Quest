'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { problemsApi } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Example {
    input: string;
    output: string;
    explanation: string;
}

interface TestCase {
    input: string;
    output: string;
    isSample: boolean;
}

interface FormData {
    title: string;
    slug: string;
    difficulty: 'easy' | 'medium' | 'hard';
    tags: string[];
    description: string;
    constraints: string;
    examples: Example[];
    testCases: TestCase[];
    isPremium: boolean;
}

const DIFF_COLORS = {
    easy: { color: '#00ff80', bg: 'rgba(0,255,128,0.08)', border: 'rgba(0,255,128,0.3)' },
    medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)' },
    hard: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)' },
};

const POPULAR_TAGS = ['array', 'string', 'hash-table', 'dynamic-programming', 'math', 'tree', 'graph', 'binary-search', 'sorting', 'two-pointers', 'sliding-window', 'stack', 'queue', 'recursion', 'backtracking', 'greedy', 'bit-manipulation', 'linked-list', 'matrix', 'heap'];

const STEPS = ['Basic Info', 'Content', 'Examples', 'Test Cases'];

// ─── Section Components ─────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
            {STEPS.map((step, i) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: i < current ? '#00ff80' : i === current ? 'rgba(0,255,128,0.15)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${i <= current ? '#00ff80' : 'rgba(255,255,255,0.1)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
                            color: i < current ? '#080d08' : i === current ? '#00ff80' : '#334155',
                            flexShrink: 0,
                            transition: 'all 0.3s',
                        }}>
                            {i < current ? '✓' : i + 1}
                        </div>
                        <span style={{
                            fontSize: 13, fontWeight: 600,
                            color: i === current ? '#e2e8f0' : i < current ? '#00ff80' : '#334155',
                            transition: 'color 0.3s',
                        }}>{step}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div style={{
                            width: 40, height: 1, margin: '0 12px',
                            background: i < current ? 'rgba(0,255,128,0.4)' : 'rgba(255,255,255,0.08)',
                            transition: 'background 0.3s',
                        }} />
                    )}
                </div>
            ))}
        </div>
    );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: "'Space Mono', monospace", letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {children}{required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
        </label>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, color: '#e2e8f0',
    fontSize: 14, outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: "'Syne', sans-serif",
    boxSizing: 'border-box',
};

const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: 'vertical',
    minHeight: 120,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 13,
    lineHeight: 1.6,
};

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function NewProblemPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();
    const [step, setStep] = useState(0);
    const [tagInput, setTagInput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitStep, setSubmitStep] = useState<'idle' | 'creating' | 'uploading' | 'done'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [createdProblemId, setCreatedProblemId] = useState<string | null>(null);

    const [form, setForm] = useState<FormData>({
        title: '',
        slug: '',
        difficulty: 'easy',
        tags: [],
        description: '',
        constraints: '',
        examples: [{ input: '', output: '', explanation: '' }],
        testCases: [{ input: '', output: '', isSample: true }],
        isPremium: false,
    });

    // Guard: only admin or editor
    useEffect(() => {
        if (!isAuthenticated) { router.push('/auth/login'); return; }
        if (user && user.role !== 'admin' && user.role !== 'editor') {
            router.push('/problems');
        }
    }, [isAuthenticated, user, router]);

    // Auto-generate slug from title
    useEffect(() => {
        setForm(f => ({
            ...f,
            slug: f.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim(),
        }));
    }, [form.title]);

    const set = (key: keyof FormData, val: any) => setForm(f => ({ ...f, [key]: val }));

    // Tag management
    const addTag = (tag: string) => {
        const t = tag.trim().toLowerCase().replace(/\s+/g, '-');
        if (t && !form.tags.includes(t) && form.tags.length < 10) {
            set('tags', [...form.tags, t]);
        }
        setTagInput('');
    };

    const removeTag = (tag: string) => set('tags', form.tags.filter(t => t !== tag));

    // Example management
    const setExample = (i: number, key: keyof Example, val: string) => {
        const ex = [...form.examples];
        ex[i] = { ...ex[i], [key]: val };
        set('examples', ex);
    };

    const addExample = () => set('examples', [...form.examples, { input: '', output: '', explanation: '' }]);
    const removeExample = (i: number) => set('examples', form.examples.filter((_, idx) => idx !== i));

    // Test case management
    const setTestCase = (i: number, key: keyof TestCase, val: any) => {
        const tc = [...form.testCases];
        tc[i] = { ...tc[i], [key]: val };
        set('testCases', tc);
    };

    const addTestCase = () => set('testCases', [...form.testCases, { input: '', output: '', isSample: false }]);
    const removeTestCase = (i: number) => set('testCases', form.testCases.filter((_, idx) => idx !== i));

    // Validate current step before advancing
    const validateStep = () => {
        if (step === 0) {
            if (!form.title.trim()) return 'Title is required';
            if (!form.slug.trim()) return 'Slug is required';
            if (form.tags.length === 0) return 'At least one tag is required';
        }
        if (step === 1) {
            if (!form.description.trim() || form.description.length < 10) return 'Description must be at least 10 characters';
        }
        if (step === 2) {
            for (const ex of form.examples) {
                if (!ex.input.trim() || !ex.output.trim()) return 'All examples must have input and output';
            }
        }
        if (step === 3) {
            for (const tc of form.testCases) {
                if (!tc.input.trim() || !tc.output.trim()) return 'All test cases must have input and output';
            }
        }
        return null;
    };

    const next = () => {
        const err = validateStep();
        if (err) { setError(err); return; }
        setError(null);
        setStep(s => s + 1);
    };

    const back = () => { setError(null); setStep(s => s - 1); };

    const handleSubmit = async () => {
        const err = validateStep();
        if (err) { setError(err); return; }
        setError(null);
        setSubmitting(true);
        setSubmitStep('creating');

        try {
            // ── Step 1: Create problem ──────────────────────────────────
            const problemPayload = {
                title: form.title,
                slug: form.slug,
                difficulty: form.difficulty,
                tags: form.tags,
                description: form.description,
                constraints: form.constraints || undefined,
                examples: form.examples,
                isPremium: form.isPremium,
            };

            const res = await problemsApi.create(problemPayload);
            const problemId = res.data?.data?.id;

            if (!problemId) throw new Error('Problem created but no ID was returned — check backend logs');
            setCreatedProblemId(problemId);

            // ── Step 2: Upload test cases ───────────────────────────────
            setSubmitStep('uploading');
            const testCases = form.testCases.map(tc => ({
                input: tc.input,
                output: tc.output,
                isSample: tc.isSample,
            }));

            await problemsApi.addTestCases(problemId, { testCases });

            setSubmitStep('done');
            // Redirect to the new problem page
            router.push(`/problems/${form.slug}`);
        } catch (e: any) {
            const msg =
                e?.response?.data?.error?.message ||
                e?.response?.data?.message ||
                e?.message ||
                'Something went wrong';
            setError(`[${submitStep === 'uploading' ? 'Test Cases' : 'Problem'}] ${msg}`);
            setSubmitStep('idle');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isAuthenticated || !user) return null;

    return (
        <div className="ml-quest-page ml-quest" style={{ color: '#e2e8f0', fontFamily: "'Syne', sans-serif" }}>
            <Navbar />
            <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 80px' }}>

                {/* Header */}
                <div style={{ marginBottom: 40 }}>
                    <Link href="/problems" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', textDecoration: 'none', fontSize: 13, marginBottom: 20 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                        onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                        ← Back to Problems
                    </Link>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 3, color: '#00ff80', marginBottom: 8 }}>
                        {user.role.toUpperCase()} · PROBLEM EDITOR
                    </div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', margin: 0 }}>
                        Create New Problem
                    </h1>
                </div>

                {/* Step indicator */}
                <StepIndicator current={step} />

                {/* Error */}
                {error && (
                    <div style={{ marginBottom: 24, padding: '14px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ flexShrink: 0 }}>⚠</span>
                        <span>{error}</span>
                    </div>
                )}

                {/* Submission progress banner */}
                {submitting && (
                    <div style={{ marginBottom: 24, padding: '14px 18px', background: 'rgba(0,255,128,0.05)', border: '1px solid rgba(0,255,128,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff80" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.9s linear infinite', flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="9" strokeDasharray="28 44" />
                        </svg>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#00ff80' }}>
                                {submitStep === 'creating' ? 'Creating problem statement…' : 'Uploading test cases to storage…'}
                            </div>
                            <div style={{ fontSize: 11, color: '#475569', marginTop: 2, fontFamily: "'Space Mono', monospace" }}>
                                {submitStep === 'creating' ? 'Step 1 / 2 — POST /problems' : 'Step 2 / 2 — POST /problems/{id}/test-cases'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Card container */}
                <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, background: 'rgba(255,255,255,0.01)', padding: 32 }}>

                    {/* ─── Step 0: Basic Info ─────────────────────────────── */}
                    {step === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div>
                                <FieldLabel required>Title</FieldLabel>
                                <input style={inputStyle} value={form.title} placeholder="Two Sum" onChange={e => set('title', e.target.value)}
                                    onFocus={e => e.target.style.borderColor = 'rgba(0,255,128,0.4)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>

                            <div>
                                <FieldLabel required>Slug</FieldLabel>
                                <input style={{ ...inputStyle, fontFamily: "'Space Mono', monospace", fontSize: 13 }}
                                    value={form.slug} placeholder="two-sum"
                                    onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    onFocus={e => e.target.style.borderColor = 'rgba(0,255,128,0.4)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                                <div style={{ marginTop: 6, fontSize: 12, color: '#334155', fontFamily: "'Space Mono', monospace" }}>
                                    /problems/<span style={{ color: '#00ff80' }}>{form.slug || '...'}</span>
                                </div>
                            </div>

                            <div>
                                <FieldLabel required>Difficulty</FieldLabel>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    {(['easy', 'medium', 'hard'] as const).map(d => (
                                        <button key={d} type="button"
                                            onClick={() => set('difficulty', d)}
                                            style={{
                                                padding: '10px 24px', borderRadius: 8, border: `1px solid ${form.difficulty === d ? DIFF_COLORS[d].border : 'rgba(255,255,255,0.1)'}`,
                                                background: form.difficulty === d ? DIFF_COLORS[d].bg : 'transparent',
                                                color: form.difficulty === d ? DIFF_COLORS[d].color : '#475569',
                                                fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize',
                                            }}>
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <FieldLabel required>Tags</FieldLabel>
                                {/* Selected tags */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                                    {form.tags.map(tag => (
                                        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(0,255,128,0.08)', border: '1px solid rgba(0,255,128,0.2)', borderRadius: 6, color: '#00ff80', fontSize: 12, fontFamily: "'Space Mono', monospace" }}>
                                            {tag}
                                            <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: '#00ff80', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                                        </span>
                                    ))}
                                </div>
                                {/* Tag input */}
                                <div style={{ position: 'relative' }}>
                                    <input style={inputStyle} value={tagInput} placeholder="Type a tag and press Enter…"
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(0,255,128,0.4)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                    />
                                </div>
                                {/* Popular tag chips */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                    {POPULAR_TAGS.filter(t => !form.tags.includes(t)).slice(0, 12).map(tag => (
                                        <button key={tag} type="button" onClick={() => addTag(tag)}
                                            style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#475569', fontSize: 11, cursor: 'pointer', fontFamily: "'Space Mono', monospace", transition: 'all 0.15s' }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,255,128,0.3)'; e.currentTarget.style.color = '#00ff80'; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#475569'; }}
                                        >
                                            + {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button type="button"
                                    onClick={() => set('isPremium', !form.isPremium)}
                                    style={{ width: 40, height: 22, borderRadius: 11, border: 'none', background: form.isPremium ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', padding: 0 }}>
                                    <div style={{ position: 'absolute', top: 3, left: form.isPremium ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: form.isPremium ? '#f59e0b' : '#475569', transition: 'all 0.2s' }} />
                                </button>
                                <span style={{ fontSize: 14, color: form.isPremium ? '#f59e0b' : '#475569' }}>Premium only</span>
                            </div>
                        </div>
                    )}

                    {/* ─── Step 1: Content ─────────────────────────────────── */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div>
                                <FieldLabel required>Problem Description</FieldLabel>
                                <div style={{ fontSize: 12, color: '#334155', marginBottom: 8 }}>Supports Markdown: **bold**, `code`, lists, etc.</div>
                                <textarea style={{ ...textareaStyle, minHeight: 200 }}
                                    value={form.description} placeholder="Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target..."
                                    onChange={e => set('description', e.target.value)}
                                    onFocus={e => e.target.style.borderColor = 'rgba(0,255,128,0.4)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                                <div style={{ marginTop: 6, fontSize: 12, color: form.description.length < 10 ? '#ef4444' : '#334155', fontFamily: "'Space Mono', monospace" }}>
                                    {form.description.length} chars {form.description.length < 10 ? '(min 10)' : '✓'}
                                </div>
                            </div>

                            <div>
                                <FieldLabel>Constraints</FieldLabel>
                                <textarea style={{ ...textareaStyle, minHeight: 80 }}
                                    value={form.constraints} placeholder="2 <= nums.length <= 10^4&#10;-10^9 <= nums[i] <= 10^9&#10;Only one valid answer exists."
                                    onChange={e => set('constraints', e.target.value)}
                                    onFocus={e => e.target.style.borderColor = 'rgba(0,255,128,0.4)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>
                        </div>
                    )}

                    {/* ─── Step 2: Examples ────────────────────────────────── */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div style={{ fontSize: 14, color: '#64748b' }}>
                                Examples are shown to users. Add at least one clear input/output pair.
                            </div>
                            {form.examples.map((ex, i) => (
                                <div key={i} style={{ padding: 20, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, background: 'rgba(255,255,255,0.01)', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#00ff80', letterSpacing: 1 }}>EXAMPLE {i + 1}</div>
                                        {form.examples.length > 1 && (
                                            <button type="button" onClick={() => removeExample(i)}
                                                style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', fontSize: 12, cursor: 'pointer', padding: '4px 10px' }}>
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div>
                                            <FieldLabel required>Input</FieldLabel>
                                            <textarea style={{ ...textareaStyle, minHeight: 80 }} value={ex.input} placeholder="nums = [2,7,11,15], target = 9"
                                                onChange={e => setExample(i, 'input', e.target.value)}
                                                onFocus={e => e.target.style.borderColor = 'rgba(0,255,128,0.4)'}
                                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                            />
                                        </div>
                                        <div>
                                            <FieldLabel required>Output</FieldLabel>
                                            <textarea style={{ ...textareaStyle, minHeight: 80 }} value={ex.output} placeholder="[0,1]"
                                                onChange={e => setExample(i, 'output', e.target.value)}
                                                onFocus={e => e.target.style.borderColor = 'rgba(0,255,128,0.4)'}
                                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 16 }}>
                                        <FieldLabel>Explanation (optional)</FieldLabel>
                                        <input style={inputStyle} value={ex.explanation} placeholder="Because nums[0] + nums[1] == 9, we return [0, 1]."
                                            onChange={e => setExample(i, 'explanation', e.target.value)}
                                            onFocus={e => e.target.style.borderColor = 'rgba(0,255,128,0.4)'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                        />
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={addExample}
                                style={{ padding: '12px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 10, background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: 14, transition: 'all 0.2s', width: '100%' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,255,128,0.3)'; e.currentTarget.style.color = '#00ff80'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#475569'; }}>
                                + Add Example
                            </button>
                        </div>
                    )}

                    {/* ─── Step 3: Test Cases ──────────────────────────────── */}
                    {step === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div style={{ padding: '12px 16px', background: 'rgba(0,255,128,0.04)', border: '1px solid rgba(0,255,128,0.1)', borderRadius: 8, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                                <strong style={{ color: '#00ff80' }}>Tip:</strong> Mark test cases as <strong style={{ color: '#94a3b8' }}>Sample</strong> to make them visible to users during "Run". Hidden test cases run only on full submission.
                            </div>

                            {/* Summary counts */}
                            <div style={{ display: 'flex', gap: 16 }}>
                                <div style={{ padding: '10px 16px', background: 'rgba(0,255,128,0.05)', border: '1px solid rgba(0,255,128,0.15)', borderRadius: 8, fontSize: 12, color: '#00ff80', fontFamily: "'Space Mono', monospace" }}>
                                    {form.testCases.filter(t => t.isSample).length} sample
                                </div>
                                <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, color: '#475569', fontFamily: "'Space Mono', monospace" }}>
                                    {form.testCases.filter(t => !t.isSample).length} hidden
                                </div>
                                <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, color: '#475569', fontFamily: "'Space Mono', monospace" }}>
                                    {form.testCases.length} total
                                </div>
                            </div>

                            {form.testCases.map((tc, i) => (
                                <div key={i} style={{ padding: 20, border: `1px solid ${tc.isSample ? 'rgba(0,255,128,0.15)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, background: tc.isSample ? 'rgba(0,255,128,0.02)' : 'rgba(255,255,255,0.01)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: tc.isSample ? '#00ff80' : '#475569', letterSpacing: 1 }}>
                                            TEST CASE {i + 1} · {tc.isSample ? 'SAMPLE' : 'HIDDEN'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            {/* Sample toggle */}
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#94a3b8' }}>
                                                <button type="button"
                                                    onClick={() => setTestCase(i, 'isSample', !tc.isSample)}
                                                    style={{ width: 36, height: 20, borderRadius: 10, border: 'none', background: tc.isSample ? 'rgba(0,255,128,0.5)' : 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', padding: 0, flexShrink: 0 }}>
                                                    <div style={{ position: 'absolute', top: 2, left: tc.isSample ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: tc.isSample ? '#00ff80' : '#475569', transition: 'all 0.2s' }} />
                                                </button>
                                                Sample
                                            </label>
                                            {form.testCases.length > 1 && (
                                                <button type="button" onClick={() => removeTestCase(i)}
                                                    style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', fontSize: 12, cursor: 'pointer', padding: '4px 10px' }}>
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div>
                                            <FieldLabel required>Input</FieldLabel>
                                            <textarea style={{ ...textareaStyle, minHeight: 80 }} value={tc.input} placeholder="[2,7,11,15]\n9"
                                                onChange={e => setTestCase(i, 'input', e.target.value)}
                                                onFocus={e => e.target.style.borderColor = 'rgba(0,255,128,0.4)'}
                                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                            />
                                        </div>
                                        <div>
                                            <FieldLabel required>Expected Output</FieldLabel>
                                            <textarea style={{ ...textareaStyle, minHeight: 80 }} value={tc.output} placeholder="[0,1]"
                                                onChange={e => setTestCase(i, 'output', e.target.value)}
                                                onFocus={e => e.target.style.borderColor = 'rgba(0,255,128,0.4)'}
                                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={addTestCase}
                                style={{ padding: '12px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 10, background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: 14, transition: 'all 0.2s', width: '100%' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,255,128,0.3)'; e.currentTarget.style.color = '#00ff80'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#475569'; }}>
                                + Add Test Case
                            </button>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
                    <button type="button" onClick={back} disabled={step === 0}
                        style={{ padding: '12px 28px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, background: 'transparent', color: step === 0 ? '#1e293b' : '#94a3b8', fontSize: 14, fontWeight: 600, cursor: step === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { if (step > 0) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                        ← Back
                    </button>

                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#334155' }}>
                        Step {step + 1} / {STEPS.length}
                    </div>

                    {step < STEPS.length - 1 ? (
                        <button type="button" onClick={next}
                            style={{ padding: '12px 32px', border: 'none', borderRadius: 8, background: '#00ff80', color: '#080d08', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#00e672'}
                            onMouseLeave={e => e.currentTarget.style.background = '#00ff80'}>
                            Next →
                        </button>
                    ) : (
                        <button type="button" onClick={handleSubmit} disabled={submitting}
                            style={{ padding: '12px 32px', border: 'none', borderRadius: 8, background: submitting ? 'rgba(0,255,128,0.4)' : '#00ff80', color: '#080d08', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {submitting ? (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.9s linear infinite' }}>
                                        <circle cx="12" cy="12" r="9" strokeDasharray="28 44" />
                                    </svg>
                                    {submitStep === 'creating' ? 'Creating Problem…' : 'Uploading Test Cases…'}
                                </>
                            ) : '🚀 Publish Problem'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
