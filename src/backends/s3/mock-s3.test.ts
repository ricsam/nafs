import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  mock,
} from 'bun:test';
import { createS3Fs } from './s3';

mock.module('./create-s3-client', () => {
  const fn = jest.fn();
  return { createS3Client: fn };
});

describe('s3Fs with mocked client', () => {
  let mockSend: jest.Mock;
  beforeEach(async () => {
    const { createS3Client } = await import('./create-s3-client');
    mockSend = jest.fn();
    (createS3Client as jest.Mock).mockReturnValue({
      send: mockSend,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should write a text file', async () => {
    const s3fs = createS3Fs('s3://test-bucket/prefix');
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
    const s3fs = createS3Fs('s3://test-bucket/prefix');
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
    const s3fs = createS3Fs('s3://test-bucket/base/path');
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
    const s3fs = createS3Fs('s3://test-bucket');
    mockSend.mockRejectedValueOnce(new Error('S3 error'));

    expect(s3fs.promises.readFile('non-existent.txt')).rejects.toThrow(
      'Error reading file from S3: S3 error'
    );
  });
});
