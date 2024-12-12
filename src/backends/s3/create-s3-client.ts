import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { parseS3Uri } from './parse-s3-uri';

export function createS3Client(uri: string): S3Client {
  const parsed = parseS3Uri(uri);
  const config: S3ClientConfig = {};

  // Region precedence: URI > Environment Variable > Default
  if (parsed.region) {
    config.region = parsed.region;
  } else if (process.env.AWS_DEFAULT_REGION) {
    config.region = process.env.AWS_DEFAULT_REGION;
  }

  // Credentials precedence: URI > Environment Variables
  const accessKeyId =
    parsed.credentials?.accessKeyId ?? process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    parsed.credentials?.secretAccessKey ?? process.env.AWS_SECRET_ACCESS_KEY;

  if (accessKeyId && secretAccessKey) {
    config.credentials = {
      accessKeyId,
      secretAccessKey,
    };
  }

  config.endpoint =
    parsed.endpoint ??
    process.env.AWS_ENDPOINT_URL_S3 ??
    process.env.AWS_ENDPOINT_URL;

  config.logger = new console.Console({
    stdout: process.stdout,
    stderr: process.stderr,
  });
  process.stdout.write(JSON.stringify(config, null, 2));
  return new S3Client(config);
}
