import {
  CreateBucketCommand,
  GetObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { S3Fs } from './s3fs';

describe('s3Fs LocalStack integration', () => {
  const LOCALSTACK_ENDPOINT = 'http://127.0.0.1:4566';
  const BUCKET_NAME = 'test-bucket';
  let s3Client: S3Client;

  beforeEach(() => {
    process.env.AWS_DEFAULT_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'test';
    process.env.AWS_SECRET_ACCESS_KEY = 'test';
    process.env.AWS_ENDPOINT_URL = LOCALSTACK_ENDPOINT;
  });

  beforeAll(async () => {
    // Create a client for test verification
    s3Client = new S3Client({
      endpoint: LOCALSTACK_ENDPOINT,
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
      forcePathStyle: true,
    });

    // Create test bucket
    try {
      await s3Client.send(
        new CreateBucketCommand({
          Bucket: BUCKET_NAME,
        })
      );
    } catch (err) {
      // Bucket might already exist
    }
  });

  it('should connect', async () => {
    const command = new ListBucketsCommand();
    const response = await s3Client.send(command);
    expect(response.Buckets?.map(({ Name }) => Name)).toContain(BUCKET_NAME);
  });
});
