import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { Writable } from 'stream';

const MINIMUM_PART_SIZE = 5 * 1024 * 1024; // 5MB minimum for multipart upload

function concatenateUint8Arrays(
  arrays: Uint8Array<ArrayBuffer>[]
): Uint8Array<ArrayBuffer> {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}

type State = 'uploading' | 'initializing' | 'error' | 'finishing' | 'finished';

export function createWriteStream(
  client: S3Client,
  bucket: string,
  key: string
): Writable {
  let uploadId: string;
  let partNumber = 1;
  let buffer = new Uint8Array(0);
  const uploadedParts: { PartNumber: number; ETag: string }[] = [];
  let state: State = 'initializing';

  const updateState = (newState: State) => {
    if (state === 'error') {
      throw new Error('can not transition from error state');
    }
    if (newState === 'uploading') {
      if (state !== 'initializing' && state !== 'uploading') {
        throw new Error('can only transition to uploading from initializing, not from ' + state);
      }
    }
    state = newState;
  };

  const stream = new Writable({
    async write(
      chunk: Buffer | string | Uint8Array,
      encoding: BufferEncoding,
      callback: (error?: Error | null) => void
    ) {
      updateState('uploading');
      try {
        // Initialize multipart upload if not already done
        if (!uploadId) {
          const { UploadId } = await client.send(
            new CreateMultipartUploadCommand({
              Bucket: bucket,
              Key: key,
            })
          );
          uploadId = UploadId!;
        }

        // Convert chunk to Uint8Array
        let data: Uint8Array<ArrayBuffer>;
        if (chunk instanceof Uint8Array) {
          data = new Uint8Array(chunk);
        } else if (typeof chunk === 'string') {
          data = new TextEncoder().encode(chunk) as Uint8Array<ArrayBuffer>;
        } else {
          throw new Error('Unsupported input type');
        }

        // Append to existing buffer
        buffer = concatenateUint8Arrays([buffer, data]);

        // Upload parts when we have enough data
        while (buffer.length >= MINIMUM_PART_SIZE) {
          const partBuffer = buffer.slice(0, MINIMUM_PART_SIZE);
          buffer = buffer.slice(MINIMUM_PART_SIZE);

          const { ETag } = await client.send(
            new UploadPartCommand({
              Bucket: bucket,
              Key: key,
              UploadId: uploadId,
              PartNumber: partNumber,
              Body: partBuffer,
            })
          );

          uploadedParts.push({
            PartNumber: partNumber,
            ETag: ETag!,
          });

          partNumber++;
        }

        callback();
      } catch (err) {
        updateState('error');
        callback(err instanceof Error ? err : new Error(String(err)));
      }
    },

    async final(callback: (error?: Error | null) => void) {
      try {
        updateState('finishing')
        // Upload any remaining data as the last part
        if (buffer.length > 0 || uploadedParts.length === 0) {
          const { ETag } = await client.send(
            new UploadPartCommand({
              Bucket: bucket,
              Key: key,
              UploadId: uploadId,
              PartNumber: partNumber,
              Body: buffer,
            })
          );

          uploadedParts.push({
            PartNumber: partNumber,
            ETag: ETag!,
          });
        }

        // Complete the multipart upload
        await client.send(
          new CompleteMultipartUploadCommand({
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: {
              Parts: uploadedParts,
            },
          })
        );
        updateState('finished')

        callback();
      } catch (err) {
        // Try to abort the upload if something goes wrong
        updateState('error');
        try {
          if (uploadId) {
            await client.send(
              new AbortMultipartUploadCommand({
                Bucket: bucket,
                Key: key,
                UploadId: uploadId,
              })
            );
          }
        } catch (abortErr) {
          console.error(
            'Failed to abort multipart upload:',
            abortErr,
            'when handling error:',
            err
          );
        }

        callback(err instanceof Error ? err : new Error(String(err)));
      }
    },

    destroy(error: Error | null, callback: (error: Error | null) => void) {
      if (state === 'finished' || state === 'finishing') {
        callback(null);
        return;
      }
      if (uploadId) {
        client
          .send(
            new AbortMultipartUploadCommand({
              Bucket: bucket,
              Key: key,
              UploadId: uploadId,
            })
          )
          .then(() => callback(error))
          .catch((err) => {
            console.error('Failed to abort multipart upload:', err);
            callback(error);
          });
      } else {
        callback(error);
      }
    },
  });

  return stream;
}
