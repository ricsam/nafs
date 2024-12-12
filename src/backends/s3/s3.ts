import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { parseS3Uri } from './parse-s3-uri';
import { createS3Client } from './create-s3-client';

type ReadFileType = typeof import('fs').promises.readFile;
type WriteFileType = typeof import('fs').promises.writeFile;

type ArgType<
  F extends (...args: any) => any,
  N extends number,
> = Parameters<F>[N];

type s3Fs = {
  promises: {
    readFile: ReadFileType;
    writeFile: WriteFileType;
  };
};

export const createS3Fs = (bucketUri: string): s3Fs => {
  const client = createS3Client(bucketUri);
  const parsed = parseS3Uri(bucketUri);
  const basePath = parsed.key;

  const normalizePath = (path: string): { bucket: string; key: string } => {
    // Remove leading slash if present
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

    // Combine base path with provided path, avoiding double slashes
    const fullPath = basePath
      ? `${basePath.replace(/\/$/, '')}/${normalizedPath}`
      : normalizedPath;

    return {
      bucket: parsed.bucket,
      key: fullPath,
    };
  };

  const readFile = async (
    path: ArgType<ReadFileType, 0>,
    options?: ArgType<ReadFileType, 1>
  ): Promise<Buffer | string> => {
    const pathStr = path.toString();
    const { bucket, key } = normalizePath(pathStr);

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    try {
      const response = await client.send(command);

      if (!response.Body) {
        throw new Error('Empty response body');
      }

      // Convert the readable stream to a buffer
      const stream = response.Body;

      // Handle encoding if specified
      if (typeof options === 'string') {
        return stream.transformToString(options);
      } else if (options?.encoding) {
        return stream.transformToString(options.encoding);
      }

      return Buffer.from(await stream.transformToByteArray());
    } catch (error) {
      // Transform AWS errors to match fs.readFile error format
      const err = error instanceof Error ? error : new Error('Unknown error');
      err.message = `Error reading file from S3: ${err.message}`;
      throw err;
    }
  };

  const writeFile = async (
    path: ArgType<WriteFileType, 0>,
    data: ArgType<WriteFileType, 1>,
    options?: ArgType<WriteFileType, 2>
  ): Promise<void> => {
    const pathStr = path.toString();
    const { bucket, key } = normalizePath(pathStr);

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
      await client.send(command);
    } catch (error) {
      // Transform AWS errors to match fs.writeFile error format
      const err = error instanceof Error ? error : new Error('Unknown error');
      err.message = `Error writing file to S3: ${err.message}`;
      throw err;
    }
  };

  return {
    promises: {
      // because return type overloads are not the same as the union return type
      readFile: readFile as ReadFileType,
      writeFile,
    },
  };
};
