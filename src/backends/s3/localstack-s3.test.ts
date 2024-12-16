import {
  CreateBucketCommand,
  GetObjectCommand,
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

  async function listObjects(prefix?: string) {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });
    const response = await s3Client.send(command);
    return response.Contents?.map((obj) => obj.Key) || [];
  }

  async function getObjectContent(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const response = await s3Client.send(command);
    return await response.Body!.transformToString();
  }

  describe('root bucket operations', () => {
    it('should write files to root when no prefix provided', async () => {
      const s3fs = new S3Fs(`s3://${BUCKET_NAME}`);
      await s3fs.promises.writeFile('test.txt', 'Hello World');

      const objects = await listObjects();
      expect(objects).toContain('test.txt');

      const content = await getObjectContent('test.txt');
      expect(content).toBe('Hello World');
    });

    it('should write files to root with trailing slash', async () => {
      const s3fs = new S3Fs(`s3://${BUCKET_NAME}/`);
      await s3fs.promises.writeFile('root.txt', 'Root file');

      const objects = await listObjects();
      expect(objects).toContain('root.txt');
    });
  });

  describe('prefixed operations', () => {
    const PREFIX = 'my/prefix';

    it('should write files under specified prefix', async () => {
      const s3fs = new S3Fs(`s3://${BUCKET_NAME}/${PREFIX}`);
      await s3fs.promises.writeFile('nested/file.txt', 'Nested content');

      const objects = await listObjects(PREFIX);
      expect(objects).toContain(`${PREFIX}/nested/file.txt`);

      const content = await getObjectContent(`${PREFIX}/nested/file.txt`);
      expect(content).toBe('Nested content');
    });

    it('should handle leading slashes in paths correctly', async () => {
      const s3fs = new S3Fs(`s3://${BUCKET_NAME}/${PREFIX}`);
      await s3fs.promises.writeFile('/absolute/path.txt', 'Absolute path');

      const objects = await listObjects(PREFIX);
      expect(objects).toContain(`${PREFIX}/absolute/path.txt`);
    });
  });

  describe('read operations', () => {
    it('should read previously written files', async () => {
      const s3fs = new S3Fs(`s3://${BUCKET_NAME}/read-test`);
      const testContent = 'Test content for reading';

      await s3fs.promises.writeFile('read.txt', testContent);
      const content = await s3fs.promises.readFile('read.txt', 'utf8');

      expect(content).toBe(testContent);
    });

    it('should handle binary files', async () => {
      const s3fs = new S3Fs(`s3://${BUCKET_NAME}/binary`);
      const binaryData = new Uint8Array([1, 2, 3, 4, 5]);

      await s3fs.promises.writeFile('binary.dat', binaryData, 'binary');
      const content = await s3fs.promises.readFile('binary.dat');

      expect(Buffer.isBuffer(content)).toBe(true);
      expect(content).toEqual(Buffer.from(binaryData));
    });
  });

  describe('error cases', () => {
    it('should handle reading non-existent files', async () => {
      const s3fs = new S3Fs(`s3://${BUCKET_NAME}`);
      expect(s3fs.promises.readFile('non-existent.txt')).rejects.toThrow();
    });

    it('should handle invalid paths', async () => {
      const s3fs = new S3Fs(`s3://${BUCKET_NAME}`);
      expect(s3fs.promises.writeFile('', 'content')).rejects.toThrow();
    });
  });

  describe('s3Fs.createWriteStream with Uint8Array', () => {
    it('should handle Uint8Array input', async () => {
      const s3fs = new S3Fs(
        `s3://${BUCKET_NAME}?endpoint=http://localhost:4566`
      );
      const writeStream = s3fs.createWriteStream('uint8array.txt');

      const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello" in ASCII
      writeStream.write(data);
      writeStream.end();

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      const content = await getObjectContent('uint8array.txt');
      expect(content).toBe('Hello');
    });

    it('should handle large Uint8Array inputs', async () => {
      const s3fs = new S3Fs(
        `s3://${BUCKET_NAME}?endpoint=http://localhost:4566`
      );
      const writeStream = s3fs.createWriteStream('large-uint8array.txt');

      // Create a 6MB Uint8Array
      const largePart = new Uint8Array(6 * 1024 * 1024).fill(65); // Fill with 'A'
      const smallPart = new Uint8Array([66, 67, 68]); // "BCD"

      writeStream.write(largePart);
      writeStream.write(smallPart);
      writeStream.end();

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: 'large-uint8array.txt',
        })
      );

      const content = await response.Body!.transformToByteArray();
      expect(content.length).toBe(largePart.length + smallPart.length);
      expect(content.slice(-3)).toEqual(new Uint8Array([66, 67, 68]));
    });

    it('should handle mixed input types', async () => {
      const s3fs = new S3Fs(
        `s3://${BUCKET_NAME}?endpoint=http://localhost:4566`
      );
      const writeStream = s3fs.createWriteStream('mixed-input.txt');

      writeStream.write('Hello '); // string
      writeStream.write(new Uint8Array([87, 111, 114, 108, 100])); // "World" as Uint8Array
      writeStream.end();

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      const content = await getObjectContent('mixed-input.txt');
      expect(content).toBe('Hello World');
    });
  });
});
