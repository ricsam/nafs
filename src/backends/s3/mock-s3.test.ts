import { S3Client } from '@aws-sdk/client-s3';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  spyOn,
} from 'bun:test';
import { S3Fs } from './s3fs';

describe('s3Fs with mocked client', () => {
  let mockSend: jest.Mock;
  let spy: jest.Mock;

  beforeEach(async () => {
    const m = await import('./create-s3-client');
    spy = spyOn(m, 'createS3Client').mockImplementation((): S3Client => {
      mockSend = jest.fn();
      return { send: mockSend } as any;
    });
  });

  afterEach(() => {
    spy.mockRestore();
    jest.restoreAllMocks();
  });

  it('should write a text file', async () => {
    const s3fs = new S3Fs('s3://test-bucket/prefix');
    mockSend.mockResolvedValueOnce({});

    await s3fs.promises.writeFile('test.txt', 'Hello World', 'utf8');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Bucket: 'test-bucket',
          Key: 'prefix/test.txt',
          Body: expect.any(Buffer),
          ContentLength: 11,
        },
      })
    );
  });

  it('should read a text file', async () => {
    const s3fs = new S3Fs('s3://test-bucket/prefix');
    const mockBody = {
      transformToString: jest.fn().mockResolvedValue('Hello World'),
      transformToByteArray: jest
        .fn()
        .mockResolvedValue(new Uint8Array(Buffer.from('Hello World'))),
    };

    mockSend.mockResolvedValueOnce({
      Body: mockBody,
    });

    const result = await s3fs.promises.readFile('test.txt', 'utf8');
    expect(result).toBe('Hello World');
    expect(mockBody.transformToString).toHaveBeenCalledWith('utf8');
  });

  it('should handle paths correctly', async () => {
    const s3fs = new S3Fs('s3://test-bucket/base/path');
    mockSend.mockResolvedValueOnce({});

    await s3fs.promises.writeFile('/some/nested/file.txt', 'content');

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Bucket: 'test-bucket',
          Key: 'base/path/some/nested/file.txt',
          Body: expect.any(Buffer),
          ContentLength: 7,
        },
      })
    );
  });

  it('should handle errors', async () => {
    const s3fs = new S3Fs('s3://test-bucket');
    mockSend.mockRejectedValueOnce(new Error('S3 error'));

    expect(s3fs.promises.readFile('non-existent.txt')).rejects.toThrow(
      'Error reading file from S3: S3 error'
    );
  });
});
