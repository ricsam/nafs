import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import stream, { Writable } from 'node:stream';
import { createS3Client } from './create-s3-client';
import { createWriteStream } from './create-write-stream';
import { ParsedS3Uri, parseS3Uri } from './parse-s3-uri';

class S3BaseFs {
  protected client: S3Client;
  private parsed: ParsedS3Uri;
  constructor(protected bucketUri: `s3://${string}`) {
    const client = createS3Client(bucketUri);
    this.parsed = parseS3Uri(bucketUri);
    this.client = client;
  }
  protected normalizePath(path: string): { bucket: string; key: string } {
    const basePath = this.parsed.key;

    // Remove leading slash if present
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

    // Combine base path with provided path, avoiding double slashes
    const fullPath = basePath
      ? `${basePath.replace(/\/$/, '')}/${normalizedPath}`
      : normalizedPath;

    return {
      bucket: this.parsed.bucket,
      key: fullPath,
    };
  }
}

export class S3PromiseFs extends S3BaseFs {
  public async writeFile(
    path: string,
    data:
      | string
      | NodeJS.ArrayBufferView
      | Iterable<string | NodeJS.ArrayBufferView>
      | AsyncIterable<string | NodeJS.ArrayBufferView>
      | stream.Stream,
    options?:
      | BufferEncoding
      | {
          encoding?: BufferEncoding;
        }
  ): Promise<void> {
    const { bucket, key } = this.normalizePath(path);

    let buffer: Buffer;
    if (typeof data === 'string') {
      const encoding =
        typeof options === 'string' ? options : options?.encoding;

      buffer = Buffer.from(data, encoding ?? 'utf8');
    } else {
      buffer = Buffer.from(data as Uint8Array);
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentLength: buffer.length,
    });

    try {
      await this.client.send(command);
    } catch (error) {
      // Transform AWS errors to match fs.writeFile error format
      const err = error instanceof Error ? error : new Error('Unknown error');
      err.message = `Error writing file to S3: ${err.message}`;
      throw err;
    }
  }

  public async readFile(path: string): Promise<Buffer>;
  public async readFile(
    path: string,
    options: {
      encoding: BufferEncoding;
    }
  ): Promise<string>;
  public async readFile(path: string, options: BufferEncoding): Promise<string>;
  public async readFile(
    path: string,
    options?:
      | BufferEncoding
      | {
          encoding?: BufferEncoding;
        }
  ): Promise<string | Buffer> {
    const pathStr = path.toString();
    const { bucket, key } = this.normalizePath(pathStr);

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    try {
      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error('Empty response body');
      }

      // Convert the readable stream to a buffer
      const stream = response.Body;

      // Handle encoding if specified
      if (typeof options === 'string') {
        return stream.transformToString(options);
      } else if (options && typeof options?.encoding === 'string') {
        return stream.transformToString(options.encoding);
      }

      return Buffer.from(await stream.transformToByteArray());
    } catch (error) {
      // Transform AWS errors to match fs.readFile error format
      const err = error instanceof Error ? error : new Error('Unknown error');
      err.message = `Error reading file from S3: ${err.message}`;
      throw err;
    }
  }
}

export class S3Fs extends S3BaseFs {
  public promises: S3PromiseFs = new S3PromiseFs(this.bucketUri);
  public createWriteStream(path: string): Writable {
    const { bucket, key } = this.normalizePath(path);
    return createWriteStream(this.client, bucket, key);
  }
}
