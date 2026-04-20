// ─── ML Task Types ────────────────────────────────────────────────────────────

export enum MLTaskType {
    CLUSTERING = 'clustering',
    REGRESSION = 'regression',
    CLASSIFICATION = 'classification',
    DATAFRAME_ANALYSIS = 'dataframe_analysis',
    NEURAL_NETWORK = 'neural_network',
    DIMENSIONALITY_REDUCTION = 'dimensionality_reduction',
    GENERAL = 'general',
}

// ─── Supported Task List (for API consumers) ──────────────────────────────────

export const SUPPORTED_ML_TASK_TYPES: MLTaskType[] = [
    MLTaskType.CLUSTERING,
    MLTaskType.REGRESSION,
    MLTaskType.CLASSIFICATION,
    MLTaskType.DATAFRAME_ANALYSIS,
    MLTaskType.NEURAL_NETWORK,
    MLTaskType.DIMENSIONALITY_REDUCTION,
    MLTaskType.GENERAL,
];

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface MLSubmissionDto {
    userId: string;
    problemId?: string;
    code: string;
    /** Optional hint from the user / frontend to bias detection */
    taskTypeHint?: MLTaskType;
}

export interface MLSubmissionJobData {
    mlSubmissionId: string;
    userId: string;
    code: string;
    taskTypeHint?: MLTaskType;
    problemId?: string;           // forwarded from the submission so workers can look up test cases
}

// ─── Execution Output ─────────────────────────────────────────────────────────

export interface MLExecutionOutput {
    stdout: string;
    stderr: string;
    runtimeMs: number;
    memoryMb: number;
    /** Parsed from the __ML_RESULTS__ JSON block injected by the wrapper */
    mlResults?: Record<string, unknown>;
    timedOut: boolean;
    exitCode: number | null;
}

// ─── Analysis Result ──────────────────────────────────────────────────────────

export interface MLMetric {
    label: string;
    value: string | number | boolean | null;
    unit?: string;
}

export interface MLAnalysisResult {
    taskType: MLTaskType;
    summary: string;
    metrics: MLMetric[];
    insights: string[];
    warnings: string[];
    rawOutput: string;
}

// ─── DB Status ────────────────────────────────────────────────────────────────

export type MLSubmissionStatus =
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'timeout'
    | 'runtime_error';

// ─── Full Submission Record (returned from DB) ────────────────────────────────

export interface MLSubmissionRecord {
    id: string;
    userId: string;
    problemId?: string;
    taskType: MLTaskType;
    status: MLSubmissionStatus;
    s3ResultKey?: string;
    errorMessage?: string;
    runtimeMs?: number;
    memoryMb?: number;
    createdAt: string;
    updatedAt: string;
}

export interface MLSubmissionResultRecord {
    id: string;
    submissionId: string;
    taskType: MLTaskType;
    summary: string;
    metrics: MLMetric[];
    insights: string[];
    warnings: string[];
    rawOutput: string;   // JSON-stringified { stdout, testCaseResults }
    testCaseResults?: Array<{
        id: string;
        description: string;
        expectedOutput: string;
        passed: boolean;
        actualHint?: string;
    }>;
    createdAt: string;
}
