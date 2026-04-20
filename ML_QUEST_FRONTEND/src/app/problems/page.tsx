'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { problemsApi } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import type { ProblemListItem, Difficulty } from '@/types';

const DIFFICULTY_STYLE: Record<Difficulty, { color: string; bg: string }> = {
  easy: { color: '#00ff80', bg: 'rgba(0,255,128,0.08)' },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  hard: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
};

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} style={{ padding: '16px 20px' }}>
          <div
            style={{
              height: 14,
              borderRadius: 4,
              background: 'rgba(255,255,255,0.04)',
              width: i === 2 ? '60%' : i === 1 ? '20px' : '40%',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function ProblemsPage() {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [selectedTag, setSelectedTag] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['problems', { search, difficulty, selectedTag, page }],
    queryFn: () =>
      problemsApi.getList({
        search: search || undefined,
        difficulty: difficulty || undefined,
        tags: selectedTag || undefined,
        page,
        limit: 20,
      }),
  });

  const problems: ProblemListItem[] = data?.data?.data?.problems || [];
  const meta = data?.data?.data?.meta;

  // Tags: from API (problems) merged with fallback so chips stay useful when filtering
  const FALLBACK_TAGS = ['array', 'string', 'hash-table', 'dynamic-programming', 'math', 'tree', 'graph', 'binary-search'];
  const tagsFromProblems = Array.from(new Set(problems.flatMap((p) => p.tags || []))).filter(Boolean);
  const popularTags = Array.from(new Set([...FALLBACK_TAGS, ...tagsFromProblems]));

  // Pagination: show up to 5 page numbers around current
  const totalPages = meta?.totalPages ?? 1;
  const pageStart = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pageEnd = Math.min(totalPages, pageStart + 4);
  const pageNumbers = Array.from(
    { length: pageEnd - pageStart + 1 },
    (_, i) => pageStart + i
  );

  return (
    <div
      className="ml-quest-page ml-quest"
      style={{ color: '#e2e8f0', fontFamily: "'Syne', sans-serif" }}
    >
      <Navbar />
      <div className="ml-quest-container-narrow">
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: 3,
              color: '#00ff80',
              marginBottom: 10,
            }}
          >
            PROBLEM SET
          </div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: '-1px',
              marginBottom: 8,
            }}
          >
            All Problems
          </h1>
          <p style={{ color: '#475569', fontSize: 14 }}>
            {meta
              ? `${meta.total} problems · Page ${page} of ${totalPages}`
              : 'Loading...'}
          </p>
        </div>

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative' }}>
            <svg
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#334155',
              }}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search problems..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['', 'easy', 'medium', 'hard'] as const).map((d) => (
              <button
                key={d}
                className={`filter-btn ${difficulty === d ? 'active' : ''}`}
                onClick={() => {
                  setDifficulty(d);
                  setPage(1);
                }}
                style={
                  d !== '' && difficulty === d
                    ? {
                      color: DIFFICULTY_STYLE[d].color,
                      background: DIFFICULTY_STYLE[d].bg,
                      borderColor: DIFFICULTY_STYLE[d].color + '50',
                    }
                    : {}
                }
              >
                {d === '' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tag chips */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}
        >
          {popularTags.map((tag) => (
            <button
              key={tag}
              className={`tag-chip ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => {
                setSelectedTag(selectedTag === tag ? '' : tag);
                setPage(1);
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Table */}
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.01)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: 52 }}>#</th>
                <th>Title</th>
                <th style={{ width: 110 }}>Difficulty</th>
                <th>Tags</th>
                <th style={{ width: 110, textAlign: 'right' }}>Acceptance</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))
              ) : problems.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: '60px 20px',
                      textAlign: 'center',
                      color: '#334155',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 12,
                        marginBottom: 8,
                      }}
                    >
                      NO PROBLEMS FOUND
                    </div>
                    <div style={{ fontSize: 13, color: '#1e293b' }}>
                      Try adjusting your filters
                    </div>
                  </td>
                </tr>
              ) : (
                problems.map((problem, idx) => {
                  const diff = DIFFICULTY_STYLE[problem.difficulty];
                  return (
                    <tr
                      key={problem.id}
                      className="problem-row"
                      style={{ animationDelay: `${idx * 0.03}s` }}
                    >
                      <td
                        style={{
                          color: '#334155',
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 12,
                        }}
                      >
                        {String((page - 1) * 20 + idx + 1).padStart(2, '0')}
                      </td>
                      <td>
                        <Link
                          href={`/problems/${problem.slug}`}
                          className="problem-title"
                        >
                          {problem.title}
                          {problem.is_premium && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 10,
                                color: '#f59e0b',
                              }}
                            >
                              PREMIUM
                            </span>
                          )}
                        </Link>
                      </td>
                      <td>
                        <span
                          className="difficulty-badge"
                          style={{
                            color: diff.color,
                            background: diff.bg,
                          }}
                        >
                          {problem.difficulty}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{
                            display: 'flex',
                            gap: 4,
                            flexWrap: 'wrap',
                          }}
                        >
                          {problem.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="inline-tag">
                              {tag}
                            </span>
                          ))}
                          {problem.tags.length > 2 && (
                            <span className="inline-tag">
                              +{problem.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontFamily: "'Space Mono', monospace",
                            fontSize: 12,
                            color:
                              problem.acceptance_rate === null || problem.acceptance_rate === 0
                                ? '#475569'
                                : problem.acceptance_rate > 50
                                  ? '#00ff80'
                                  : problem.acceptance_rate > 30
                                    ? '#f59e0b'
                                    : '#ef4444',
                          }}
                        >
                          {problem.acceptance_rate != null
                            ? problem.acceptance_rate === 0
                              ? '—'
                              : `${problem.acceptance_rate.toFixed(1)}%`
                            : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
              marginTop: 24,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="page-btn"
              disabled={page === 1}
              onClick={() => setPage(1)}
              aria-label="First page"
            >
              «
            </button>
            <button
              type="button"
              className="page-btn"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              ‹ Prev
            </button>
            {pageNumbers.map((p) => (
              <button
                type="button"
                key={p}
                className={`page-btn ${page === p ? 'current' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              Next ›
            </button>
            <button
              type="button"
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
              aria-label="Last page"
            >
              »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
