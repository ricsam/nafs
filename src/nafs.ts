import { parseUri } from './parse-uri';

export async function nafs(
  uri: `enstore://${string}`
): Promise<typeof import('@enstore/fs').EnstoreFs>;
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
): Promise<
  | import('memfs').IFs
  | typeof import('./backends/s3/s3fs').S3Fs
  | typeof import('@enstore/fs').EnstoreFs
>;
export async function nafs(
  uri: string
): Promise<
  | import('memfs').IFs
  | typeof import('./backends/s3/s3fs').S3Fs
  | typeof import('@enstore/fs').EnstoreFs
> {
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
    case 'enstore': {
      const { EnstoreFs } = await import('@enstore/fs');
      // enstore://username:password/some/folder/prefix?endpoint=http://localhost:3000/enstore
      const { parseEnstoreUri } = await import(
        './backends/enstore/parse-enstore-uri'
      );
      const options = parseEnstoreUri(parsed.uri);

      const fs = new EnstoreFs({
        endpoint: options.endpoint,
        password: options.password,
        username: options.username,
        pathPrefix: options.pathPrefix,
      });
      fs.createWriteStream('test.txt');
      return fs as any;
    }
    default: {
      throw new Error('Invalid url supplied, the protocol is not supported');
    }
  }
}
