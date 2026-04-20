'use client';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { submissionsApi } from '@/lib/api';
import type { SubmissionResult, Language } from '@/types';
import Cookies from 'js-cookie';

export const useSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState<{ passed: number; total: number } | null>(null);
  const queryClient = useQueryClient();

  const submit = async (data: {
    problemId: string;
    language: Language;
    code: string;
    isRunOnly?: boolean;
  }) => {
    setIsSubmitting(true);
    setResult(null);
    setProgress(null);

    try {
      // 1. Submit code — returns submissionId immediately
      const res = await submissionsApi.submit(data);
      const { id: submissionId } = res.data.data;

      // Use fetch-based SSE for auth header support
      const token = Cookies.get('accessToken');
      let finished = false;
      await streamResult(submissionId, token || '', (data) => {
        const terminal = ['accepted', 'wrong_answer', 'runtime_error', 'time_limit_exceeded', 'compilation_error'];

        if (data.status === 'running') {
          setProgress({
            passed: data.passedTests || 0,
            total: data.totalTests || 0,
          });
        } else if (terminal.includes(data.status)) {
          finished = true;
          setResult({ ...data, submissionId });
          setIsSubmitting(false);
        }
      });

      if (!finished) {
        // If stream drops, backend might have actually finished but we missed the Redis pub/sub message
        try {
          const finalState = await submissionsApi.getDetails(submissionId);
          const st = finalState.data?.data;
          const terminal = ['accepted', 'wrong_answer', 'runtime_error', 'time_limit_exceeded', 'compilation_error'];
          if (st && terminal.includes(st.status)) {
            finished = true;
            setResult({ ...st, submissionId });
            setIsSubmitting(false);
          }
        } catch (e) {
          console.error('Failed to get fallback details after stream drop', e);
        }

        if (!finished) {
          throw new Error('Connection to judge server lost before completion.');
        }
      }

    } catch (err: any) {
      console.error('Submission hook error:', err);
      setResult({
        status: 'runtime_error',
        passedTests: 0,
        totalTests: 0,
        error: err.response?.data?.error?.message || err.message || 'Submission failed',
      });
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, result, progress, setResult };
};

// Fetch-based SSE — supports Authorization header unlike EventSource
async function streamResult(
  submissionId: string,
  token: string,
  onData: (data: any) => void
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SUBMISSIONS_URL || 'http://localhost:3003';

  const response = await fetch(
    `${baseUrl}/submissions/${submissionId}/stream`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
    }
  );

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await response.json();
    if (json.success && json.data) {
      // It's already completed quickly! Just fetch normal full details!
      try {
        const detailedRes = await submissionsApi.getDetails(submissionId);
        if (detailedRes.data?.data) {
          onData(detailedRes.data.data);
        }
      } catch {
        onData(json.data);
      }
    }
    return;
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) return;

  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (value) {
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));

              const terminal = ['accepted', 'wrong_answer', 'runtime_error',
                'time_limit_exceeded', 'compilation_error'];
              if (terminal.includes(data.status)) {
                reader.cancel();
                // When we hit a terminal state, fetch full submission details including all testcase actualOutputs
                try {
                  const detailedRes = await submissionsApi.getDetails(submissionId);
                  if (detailedRes.data?.data) {
                    onData(detailedRes.data.data);
                    return;
                  }
                } catch (err) {
                  console.error('Failed to get final submission details', err);
                }
              }
              onData(data);
            } catch (e) {
              console.error('Failed to parse SSE line', trimmed, e);
            }
          }
        }
      }

      if (done) break;
    }
  } catch (err) {
    console.error('SSE Stream read error:', err);
    throw err;
  }
}
