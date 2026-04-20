'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { mlProblemsApi } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';

const TASK_TYPE_LABEL: Record<string, string> = {
    clustering: 'Clustering',
    regression: 'Regression',
    classification: 'Classification',
    dataframe_analysis: 'DataFrame',
    neural_network: 'Neural Net',
    dimensionality_reduction: 'Dim. Reduction',
    general: 'General',
};

const TASK_TYPE_COLOR: Record<string, { color: string; bg: string }> = {
    clustering: { color: '#38bdf8', bg: 'rgba(56,189,248,0.10)' },
    regression: { color: '#fb923c', bg: 'rgba(251,146,60,0.10)' },
    classification: { color: '#4ade80', bg: 'rgba(74,222,128,0.10)' },
    dataframe_analysis: { color: '#facc15', bg: 'rgba(250,204,21,0.10)' },
    neural_network: { color: '#f472b6', bg: 'rgba(244,114,182,0.10)' },
    dimensionality_reduction: { color: '#a78bfa', bg: 'rgba(167,139,250,0.10)' },
    general: { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' },
};

const DIFFICULTY_STYLE: Record<string, { color: string; bg: string }> = {
    easy: { color: '#00ff80', bg: 'rgba(0,255,128,0.08)' },
    medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    hard: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
};

const ALL_TASK_TYPES = [
    'clustering', 'regression', 'classification',
    'dataframe_analysis', 'neural_network', 'dimensionality_reduction',
];

export default function MLPracticePage() {
    const [search, setSearch] = useState('');
    const [taskType, setTaskType] = useState('');
    const [difficulty, setDifficulty] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['ml-problems', { search, taskType, difficulty }],
        queryFn: () => mlProblemsApi.getList({
            search: search || undefined,
            taskType: taskType || undefined,
            difficulty: (difficulty as any) || undefined,
        }),
    });

    const problems: any[] = data?.data?.data?.problems || [];

    return (
        <div
            className="ml-quest-page ml-quest"
            style={{ color: '#e2e8f0', fontFamily: "'Syne', sans-serif", minHeight: '100vh' }}
        >
            <Navbar />
            <div className="ml-quest-container-narrow">

                {/* Header */}
                <div style={{ marginBottom: 36 }}>
                    <div style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 10, letterSpacing: 3,
                        color: '#a78bfa', marginBottom: 10,
                    }}>
                        ML PRACTICE
                    </div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 }}>
                        ML Challenges
                    </h1>
                    <p style={{ color: '#475569', fontSize: 14 }}>
                        Solve real machine learning problems using Python & scikit-learn. Submit your code and get instant structured analysis.
                    </p>
                </div>

                {/* Search */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#334155' }}
                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search ML problems..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {/* Difficulty filter */}
                    <div style={{ display: 'flex', gap: 6 }}>
                        {(['', 'easy', 'medium', 'hard'] as const).map((d) => (
                            <button
                                key={d}
                                className={`filter-btn ${difficulty === d ? 'active' : ''}`}
                                onClick={() => setDifficulty(d)}
                                style={d !== '' && difficulty === d ? {
                                    color: DIFFICULTY_STYLE[d].color,
                                    background: DIFFICULTY_STYLE[d].bg,
                                    borderColor: DIFFICULTY_STYLE[d].color + '50',
                                } : {}}
                            >
                                {d === '' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Task type chips */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 28 }}>
                    <button
                        className={`tag-chip ${taskType === '' ? 'active' : ''}`}
                        onClick={() => setTaskType('')}
                    >
                        All Types
                    </button>
                    {ALL_TASK_TYPES.map((t) => {
                        const style = TASK_TYPE_COLOR[t];
                        return (
                            <button
                                key={t}
                                className={`tag-chip ${taskType === t ? 'active' : ''}`}
                                onClick={() => setTaskType(taskType === t ? '' : t)}
                                style={taskType === t ? { color: style.color, background: style.bg, borderColor: style.color + '50' } : {}}
                            >
                                {TASK_TYPE_LABEL[t]}
                            </button>
                        );
                    })}
                </div>

                {/* Problem Cards Grid */}
                {isLoading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} style={{
                                height: 200, borderRadius: 12,
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                animation: 'pulse 1.5s ease infinite',
                            }} />
                        ))}
                    </div>
                ) : problems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 0' }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#334155', marginBottom: 8 }}>
                            NO PROBLEMS FOUND
                        </div>
                        <div style={{ fontSize: 13, color: '#1e293b' }}>Try adjusting your filters</div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                        {problems.map((problem, idx) => {
                            const taskStyle = TASK_TYPE_COLOR[problem.taskType] || TASK_TYPE_COLOR.general;
                            const diffStyle = DIFFICULTY_STYLE[problem.difficulty];
                            return (
                                <Link
                                    key={problem.id}
                                    href={`/ml-practice/${problem.slug}`}
                                    style={{ textDecoration: 'none' }}
                                >
                                    <div
                                        style={{
                                            padding: '20px 22px',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            borderRadius: 12,
                                            background: 'rgba(255,255,255,0.013)',
                                            cursor: 'pointer',
                                            transition: 'border-color 0.2s, background 0.2s, transform 0.15s',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 12,
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLElement).style.borderColor = taskStyle.color + '40';
                                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                                            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.013)';
                                            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                        }}
                                    >
                                        {/* Top row */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                            <span style={{
                                                fontFamily: "'Space Mono', monospace",
                                                fontSize: 10, color: '#334155',
                                            }}>
                                                {String(idx + 1).padStart(2, '0')}
                                            </span>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <span style={{
                                                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                                                    color: taskStyle.color, background: taskStyle.bg,
                                                    fontFamily: "'Space Mono', monospace",
                                                }}>
                                                    {TASK_TYPE_LABEL[problem.taskType] || problem.taskType}
                                                </span>
                                                <span style={{
                                                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                                                    color: diffStyle.color, background: diffStyle.bg,
                                                    fontFamily: "'Space Mono', monospace",
                                                }}>
                                                    {problem.difficulty}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.3 }}>
                                            {problem.title}
                                        </div>

                                        {/* Description preview */}
                                        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, flex: 1 }}>
                                            {problem.description.replace(/\*\*[^*]+\*\*/g, '').split('\n')[0].slice(0, 120)}…
                                        </div>

                                        {/* Tags */}
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {(problem.tags || []).slice(0, 3).map((tag: string) => (
                                                <span key={tag} style={{
                                                    padding: '2px 7px', borderRadius: 4, fontSize: 10,
                                                    fontFamily: "'Space Mono', monospace",
                                                    background: 'rgba(255,255,255,0.04)',
                                                    border: '1px solid rgba(255,255,255,0.07)',
                                                    color: '#475569',
                                                }}>
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>

                                        {/* CTA */}
                                        <div style={{
                                            fontSize: 12, fontWeight: 600, color: taskStyle.color,
                                            display: 'flex', alignItems: 'center', gap: 6,
                                        }}>
                                            Solve Challenge
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M5 12h14M12 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
