// Shared TypeScript domain types used across all services
// This file is compiled with the root tsconfig.base.json and consumed via path aliases in each service.

// ---------- Auth / User ----------

export interface User {
  id: string;
  email: string;
  username: string;
  // e.g. 'free' | 'premium' | 'enterprise'
  tier: string;
  role: "admin" | "editor" | "user";
  // ISO timestamp strings
  createdAt: string;
  updatedAt: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  tier: string;
  role: "admin" | "editor" | "user";
  // issued at / expiry (seconds since epoch)
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ---------- Problems ----------

export interface ProblemExample {
  id: string;
  input: string;
  output: string;
  explanation?: string;
}

export interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  content: string;
  constraints?: string;
  examples: ProblemExample[];
  createdAt: string;
  updatedAt: string;
}

export interface ProblemListItem {
  id: string;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  // aggregate stats used by listing UIs
  acceptanceRate?: number;
  totalSubmissions?: number;
  solved?: boolean;
}

export interface ProblemFilters {
  search?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: "newest" | "oldest" | "difficulty" | "acceptance";
}

// ---------- Submissions / Judge ----------

export type Language = "python" | "javascript" | "typescript" | "cpp" | "java" | "go" | "rust";

export type SubmissionStatus =
  | "queued"
  | "running"
  | "accepted"
  | "wrong_answer"
  | "time_limit_exceeded"
  | "runtime_error"
  | "compile_error"
  | "internal_error";

export interface SubmissionRequest {
  problemId: string;
  language: Language;
  code: string;
}

export interface Submission {
  id: string;
  userId: string;
  problemId: string;
  language: Language;
  code: string;
  status: SubmissionStatus;
  // milliseconds
  runtimeMs?: number;
  // megabytes
  memoryMb?: number;
  // optional judge details / error message
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JudgeResult {
  submissionId: string;
  status: SubmissionStatus;
  runtimeMs?: number;
  memoryMb?: number;
  // raw result log / stderr summary
  details?: string;
}

// ---------- Stats / Analytics ----------

export interface UserStats {
  userId: string;
  totalSolved: number;
  totalAttempted: number;
  streakDays: number;
  lastSubmissionAt?: string;
}

export interface ProblemStats {
  problemId: string;
  totalSubmissions: number;
  totalAccepted: number;
}

export interface HeatmapEntry {
  // YYYY-MM-DD date string
  date: string;
  submissions: number;
  accepted: number;
}

// ---------- API helpers ----------

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code: string;
  // optional field-level errors
  details?: Record<string, string[]>;
}

export interface ApiResponse<T> {
  data: T | null;
  meta?: PaginationMeta;
  error?: ApiError;
}

// ---------- Queue / Jobs ----------

// Payload for submission-judge jobs in BullMQ
export interface SubmissionJobPayload {
  submissionId: string;
  userId: string;
  problemId: string;
  language: Language;
}

