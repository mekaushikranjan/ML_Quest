export interface User {
    id: string;
    email: string;
    username: string;
    tier: string;
    createdAt: string;
    updatedAt: string;
}
export interface JwtPayload {
    userId: string;
    email: string;
    tier: string;
    iat?: number;
    exp?: number;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
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
export type Language = "python" | "javascript" | "typescript" | "cpp" | "java" | "go" | "rust";
export type SubmissionStatus = "queued" | "running" | "accepted" | "wrong_answer" | "time_limit_exceeded" | "runtime_error" | "compile_error" | "internal_error";
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
    runtimeMs?: number;
    memoryMb?: number;
    message?: string;
    createdAt: string;
    updatedAt: string;
}
export interface JudgeResult {
    submissionId: string;
    status: SubmissionStatus;
    runtimeMs?: number;
    memoryMb?: number;
    details?: string;
}
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
    date: string;
    submissions: number;
    accepted: number;
}
export interface PaginationMeta {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}
export interface ApiError {
    message: string;
    code: string;
    details?: Record<string, string[]>;
}
export interface ApiResponse<T> {
    data: T | null;
    meta?: PaginationMeta;
    error?: ApiError;
}
export interface SubmissionJobPayload {
    submissionId: string;
    userId: string;
    problemId: string;
    language: Language;
}
