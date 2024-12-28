import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export function createReadStream(
  client: S3Client,
  bucket: string,
  key: string
): Readable {
  let isReading = false;
  let bodyStream: Readable | null = null;

  const stream = new Readable({
    async read(size: number) {
      if (isReading) return;
      isReading = true;

      try {
        if (!bodyStream) {
          const response = await client.send(
            new GetObjectCommand({
              Bucket: bucket,
              Key: key,
            })
          );

          if (!response.Body) {
            this.push(null);
            return;
          }

          bodyStream = response.Body as Readable;

          bodyStream.on('data', (chunk: Uint8Array) => {
            this.push(chunk);
          });

          bodyStream.on('end', () => {
            this.push(null);
          });

          bodyStream.on('error', (err) => {
            this.destroy(err);
          });
        }
      } catch (err) {
        this.destroy(err instanceof Error ? err : new Error(String(err)));
      } finally {
        isReading = false;
      }
    },

    destroy(error: Error | null, callback: (error: Error | null) => void) {
      bodyStream?.destroy();
      callback(error);
    },
  });

  return stream;
}
