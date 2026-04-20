export interface User {
  id: string;
  username: string;
  email: string;
  tier: 'free' | 'premium';
  role: 'admin' | 'editor' | 'user';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Language = 'python' | 'javascript' | 'java' | 'cpp' | 'go';
export type SubmissionStatus =
  | 'pending'
  | 'running'
  | 'accepted'
  | 'wrong_answer'
  | 'runtime_error'
  | 'time_limit_exceeded'
  | 'compilation_error';

export interface Problem {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  tags: string[];
  constraints?: string;
  examples: ProblemExample[];
  acceptanceRate: number;
  isPremium: boolean;
}

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface ProblemListItem {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  acceptance_rate: number;
  is_premium: boolean;
}

export interface Submission {
  id: string;
  userId: string;
  problemId: string;
  language: Language;
  status: SubmissionStatus;
  passedTests: number;
  totalTests: number;
  runtimeMs?: number;
  memoryMb?: number;
  errorMessage?: string;
  createdAt: string;
}

export interface SubmissionResult {
  status: SubmissionStatus;
  passedTests: number;
  totalTests: number;
  runtimeMs?: number;
  error?: string;
  submissionId?: string;
}

export interface TestCaseResult {
  id: string;
  testCaseId: string;
  status: string;
  actualOutput?: string;
  expectedOutput?: string;
  errorMessage?: string;
  runtimeMs?: number;
  memoryMb?: number;
}
