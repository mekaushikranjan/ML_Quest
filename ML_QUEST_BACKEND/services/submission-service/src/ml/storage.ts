import * as dotenv from 'dotenv';
import * as path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import type { MLAnalysisResult } from './types';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const S3_BUCKET = process.env.S3_BUCKET!;
const RESULTS_PREFIX = process.env.ML_S3_RESULTS_PREFIX || 'ml-results';
const S3_TIMEOUT_MS = 12_000; // fail fast — never block the ML pipeline

/** Race any S3 promise against a hard timeout */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
            () => reject(new Error(`S3 ${label} timed out after ${ms}ms`)),
            ms
        );
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export class MLStorage {
    private s3: S3Client;

    constructor() {
        const region = process.env.S3_REGION || 'eu-north-1';
        const endpoint = process.env.S3_ENDPOINT;

        this.s3 = new S3Client({
            region,
            endpoint: endpoint || undefined,
            forcePathStyle: !!endpoint, // Usually needed for custom endpoints like Minio
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY!,
                secretAccessKey: process.env.S3_SECRET_KEY!,
            },
            // Node-level socket timeout as secondary safeguard
            maxAttempts: 2, // Allow a single retry for transient network issues
        });
    }

    /** Uploads analysis JSON to S3 (times out in 12 s) */
    async saveMLResult(submissionId: string, result: MLAnalysisResult): Promise<string> {
        const key = `${RESULTS_PREFIX}/${submissionId}/analysis.json`;

        await withTimeout(
            this.s3.send(
                new PutObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: key,
                    Body: JSON.stringify(result, null, 2),
                    ContentType: 'application/json',
                })
            ),
            S3_TIMEOUT_MS,
            'PutObject'
        );

        return key;
    }

    /** Downloads and parses an ML analysis result from S3 (times out in 12 s) */
    async getMLResult(s3Key: string): Promise<MLAnalysisResult> {
        const response = await withTimeout(
            this.s3.send(
                new GetObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: s3Key,
                })
            ),
            S3_TIMEOUT_MS,
            'GetObject'
        );

        const chunks: Buffer[] = [];
        for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
            chunks.push(Buffer.from(chunk));
        }

        return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as MLAnalysisResult;
    }
}
