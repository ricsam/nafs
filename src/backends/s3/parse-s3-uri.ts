export interface ParsedS3Uri {
  region?: string;
  bucket: string;
  key: string;
  forcePathStyle?: boolean;
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
  const params = new URLSearchParams(queryString);
  const endpoint = params.get('endpoint') ?? undefined;
  const forcePathStyle = params.has('forcePathStyle')
    ? !['no', 'false'].includes(params.get('forcePathStyle') ?? '')
    : undefined;

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
        endpoint,
        forcePathStyle,
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
        endpoint,
        forcePathStyle,
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
        endpoint,
        forcePathStyle,
      };
    }
  }
}
