export interface ParsedS3Uri {
  region?: string;
  bucket: string;
  key: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey?: string;
  };
  endpoint?: string;
}

type UriFormat =
  | 'full' // s3://key:secret@region/bucket/path
  | 'region' // s3://region/bucket/path
  | 'simple'; // s3://bucket/path

export function parseS3Uri(uri: string): ParsedS3Uri {
  // Split URI and query params
  const [baseUri, queryString] = uri.split('?');

  // Parse query params if present
  const endpoint =
    queryString
      ?.split('&')
      .map((param) => param.split('='))
      .find(([key]) => key === 'endpoint')?.[1] ??
    process.env.AWS_ENDPOINT_URL_S3 ??
    process.env.AWS_ENDPOINT_URL;

  if (!baseUri.startsWith('s3://')) {
    throw new Error('Invalid S3 URI format');
  }

  // Remove s3:// prefix
  const path = baseUri.slice(5);

  // Determine URI format
  const format: UriFormat = path.includes('@')
    ? 'full'
    : path.split('/')[0].match(/^[a-z]+-[a-z]+-\d+$/)
      ? 'region'
      : 'simple';

  switch (format) {
    case 'full': {
      const [credentials, remainder] = path.split('@');
      const [accessKeyId, secretAccessKey] = credentials.split(':');
      const [region, bucket, ...keyParts] = remainder.split('/');

      if (!accessKeyId || !secretAccessKey || !region || !bucket) {
        throw new Error('Invalid S3 URI format');
      }

      return {
        credentials: { accessKeyId, secretAccessKey },
        region,
        bucket,
        key: keyParts.join('/') || '',
        ...(endpoint && { endpoint: decodeURIComponent(endpoint) }),
      };
    }

    case 'region': {
      const [region, bucket, ...keyParts] = path.split('/');

      if (!region || !bucket) {
        throw new Error('Invalid S3 URI format');
      }

      return {
        region,
        bucket,
        key: keyParts.join('/') || '',
        ...(endpoint && { endpoint: decodeURIComponent(endpoint) }),
      };
    }

    case 'simple': {
      const [bucket, ...keyParts] = path.split('/');

      if (!bucket) {
        throw new Error('Invalid S3 URI format');
      }

      return {
        bucket,
        key: keyParts.join('/') || '',
        ...(endpoint && { endpoint: decodeURIComponent(endpoint) }),
      };
    }
  }
}
