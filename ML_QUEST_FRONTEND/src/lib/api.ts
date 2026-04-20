import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { useAuthStore } from '@/store/auth.store';

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3001';
const PROBLEMS_URL = process.env.NEXT_PUBLIC_PROBLEMS_URL || 'http://localhost:3002';
const SUBMISSIONS_URL = process.env.NEXT_PUBLIC_SUBMISSIONS_URL || 'http://localhost:3003';

function createClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = Cookies.get('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status === 401 && !original._retry) {
        original._retry = true;

        try {
          const refreshToken = Cookies.get('refreshToken');
          if (!refreshToken) throw new Error('No refresh token');

          const res = await axios.post(
            `${AUTH_URL}/auth/refresh`,
            { refreshToken }
          );

          const { accessToken } = res.data.data;
          Cookies.set('accessToken', accessToken, { expires: 1 / 96 });

          original.headers.Authorization = `Bearer ${accessToken}`;
          return client(original);
        } catch {
          // Clear everything — cookies AND Zustand store (localStorage persisted state)
          useAuthStore.getState().clearAuth();
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}

const authClient = createClient(AUTH_URL);
const problemsClient = createClient(PROBLEMS_URL);
const submissionsClient = createClient(SUBMISSIONS_URL);

// ─── AUTH ─────────────────────────────────────────────────
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    authClient.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    authClient.post('/auth/login', data),

  logout: (refreshToken: string) =>
    authClient.post('/auth/logout', { refreshToken }),

  refresh: (refreshToken: string) =>
    authClient.post('/auth/refresh', { refreshToken }),

  me: () => authClient.get('/auth/me'),

  // Admin
  getUsers: (params?: { page?: number; limit?: number }) =>
    authClient.get('/auth/users', { params }),

  updateUserRole: (userId: string, role: 'admin' | 'editor' | 'user') =>
    authClient.patch(`/auth/users/${userId}/role`, { role }),
};

// ─── PROBLEMS ─────────────────────────────────────────────
export const problemsApi = {
  getList: (params?: {
    difficulty?: string;
    tags?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => problemsClient.get('/problems', { params }),

  getBySlug: (slug: string) => problemsClient.get(`/problems/${slug}`),

  getTestCases: (problemId: string, params?: { includeHidden?: boolean }) =>
    problemsClient.get(`/problems/${problemId}/test-cases`, { params }),

  getTestCasesCount: (problemId: string) =>
    problemsClient.get(`/problems/${problemId}/test-cases/count`),

  getTestCaseContent: (problemId: string, testCaseId: string) =>
    problemsClient.get<{ success: boolean; data: { input: string; output: string } }>(`/problems/${problemId}/test-cases/${testCaseId}/content`),

  create: (data: any) => problemsClient.post('/problems', data),

  addTestCases: (problemId: string, data: { testCases: { input: string; output: string; isSample: boolean }[] }) =>
    problemsClient.post(`/problems/${problemId}/test-cases`, data),

  deleteProblem: (problemId: string) => problemsClient.delete(`/problems/${problemId}`),
};

// ─── SUBMISSIONS ──────────────────────────────────────────
export const submissionsApi = {
  submit: (data: { problemId: string; language: string; code: string; isRunOnly?: boolean }) =>
    submissionsClient.post('/submissions', data),

  getById: (id: string) => submissionsClient.get(`/submissions/${id}`),

  getDetails: (id: string) => submissionsClient.get(`/submissions/${id}/details`),

  getUserSubmissions: (params?: {
    problemId?: string;
    limit?: number;
    offset?: number;
  }) => submissionsClient.get('/submissions', { params }),

  getSubmissionStats: (problemId: string) =>
    submissionsClient.get(`/submissions/${problemId}/stats`),

  getLatestAccepted: (problemId: string) =>
    submissionsClient.get<{ success: boolean; data: { code: string; language: string } | null }>(`/submissions/${problemId}/latest`),
};

// ─── ML PROBLEMS ───────────────────────────────────────────
export const mlProblemsApi = {
  getList: (params?: { taskType?: string; difficulty?: string; search?: string }) =>
    submissionsClient.get('/ml-problems', { params }),

  getById: (id: string) =>
    submissionsClient.get(`/ml-problems/${id}`),
};

// ─── ML SUBMISSIONS ────────────────────────────────────────
export const mlApi = {
  submit: (data: { code: string; problemId?: string; taskTypeHint?: string }) =>
    submissionsClient.post('/ml-submissions', data),

  getById: (id: string) =>
    submissionsClient.get(`/ml-submissions/${id}`),

  getResults: (id: string) =>
    submissionsClient.get(`/ml-submissions/${id}/results`),

  getUserSubmissions: (params?: { limit?: number; offset?: number }) =>
    submissionsClient.get('/ml-submissions', { params }),

  getLatestAccepted: (problemId: string) =>
    submissionsClient.get<{ success: boolean; data: { code: string } | null }>(`/ml-submissions/${problemId}/latest`),
};

export default authClient;
