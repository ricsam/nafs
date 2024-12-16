import { parseUri, proto } from './parse-uri';

export async function nafs(
  uri: `s3://${string}`,
  options?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  }
): Promise<typeof import('./backends/s3/s3fs').S3Fs>;
/**
 * @returns A [linkfs](https://github.com/ricsam/linkfs) instance
 */
export async function nafs(
  uri: `file://${string}`
): Promise<import('memfs').IFs>;
/**
 * @returns A [memfs](https://github.com/streamich/memfs) instance
 */
export async function nafs(uri: ':memory:'): Promise<import('memfs').IFs>;
export async function nafs(
  uri: string
): Promise<import('memfs').IFs | typeof import('./backends/s3/s3fs').S3Fs> {
  const parsed = parseUri(uri as any);

  switch (parsed.proto) {
    case 'memory': {
      const { createMemFs } = await import('./backends/local/memory');
      return createMemFs();
    }
    case 'file': {
      const { createFileFs } = await import('./backends/local/file');
      const lfs = createFileFs(parsed.uri);
      return lfs as any;
    }
    case 's3': {
      const { S3Fs } = await import('./backends/s3/s3fs');
      return new S3Fs(parsed.uri) as any;
    }
    default: {
      throw new Error('Invalid url supplied, the protocol is not supported');
    }
  }
}
