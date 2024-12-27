export type proto = 'file' | 's3' | 'memory';

export type ParsedUri =
  | {
      proto: 'file';
      path: string;
      uri: `file://${string}`;
    }
  | {
      proto: 's3';
      path: string;
      uri: `s3://${string}`;
    }
  | {
      proto: 'memory';
      path: ':memory:';
      uri: ':memory:';
    }
  | {
      proto: 'enstore';
      path: string;
      uri: `enstore://${string}`;
    };

export function parseUri(uri: `${proto}://${string}` | ':memory:'): ParsedUri {
  let proto: string;
  let path: string;
  const r = uri.match(/^([^:]+):\/\/(.+)/);
  if (r) {
    proto = r[1];
    path = r[2];
  } else {
    throw new Error('Invalid URI');
  }
  return { proto, path, uri } as any;
}
