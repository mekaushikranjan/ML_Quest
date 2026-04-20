import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { readFileSync } from 'fs';
import type { Logger } from '@ml-quest/shared';

export class S3Service {
  private s3Client: S3Client;
  private bucket: string;

  constructor(
    private logger: Logger
  ) {
    const region = process.env.S3_REGION || 'eu-north-1';
    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;
    this.bucket = process.env.S3_BUCKET || 'ml-quest';

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn('S3 credentials not configured');
    }

    const endpoint = process.env.S3_ENDPOINT;

    this.s3Client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle: !!endpoint,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
      maxAttempts: 2,
    });
  }

  async uploadTestCase(
    problemId: string,
    testCaseId: string,
    fileType: 'input' | 'output',
    data: string
  ): Promise<string> {
    const key = `test-cases/${problemId}/${testCaseId}/${fileType}.txt`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: 'text/plain',
      });

      await this.s3Client.send(command);
      this.logger.info({ key }, 'Test case uploaded to S3');
      return key;
    } catch (err) {
      this.logger.error({ err, key }, 'Failed to upload test case to S3');
      throw err;
    }
  }

  async getTestCase(key: string): Promise<string> {
    // Handle local file paths (development/Docker with local files)
    if (key.startsWith('/')) {
      try {
        const data = readFileSync(key, 'utf-8');
        this.logger.info({ key }, 'Test case read from local filesystem');
        return data;
      } catch (err) {
        this.logger.error({ err, key }, 'Failed to read test case from local filesystem');
        throw err;
      }
    }

    // Handle S3 paths
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const data = await response.Body?.transformToString();
      return data || '';
    } catch (err) {
      this.logger.error({ err, key }, 'Failed to fetch test case from S3');
      throw err;
    }
  }

  async deleteTestCase(problemId: string, testCaseId: string): Promise<void> {
    const keys = [
      `test-cases/${problemId}/${testCaseId}/input.txt`,
      `test-cases/${problemId}/${testCaseId}/output.txt`,
    ];

    try {
      for (const key of keys) {
        const command = new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        });
        await this.s3Client.send(command);
      }
      this.logger.info({ problemId, testCaseId }, 'Test case deleted from S3');
    } catch (err) {
      this.logger.error({ err, problemId, testCaseId }, 'Failed to delete test case from S3');
      throw err;
    }
  }

  async getPreSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (err) {
      this.logger.error({ err, key }, 'Failed to generate presigned URL');
      throw err;
    }
  }
}
