import type { IFs } from 'memfs';

type NAFSOptions = {
  /**
   * only used when the storage is a file://
   */
  fs?: IFs;
  /**
   * only used when the storage is a s3://
   */
  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
};

export const nafs = async (
  storage: string,
  options?: NAFSOptions
): Promise<IFs> => {
  if (storage === ':memory:') {
    const { createMemFs } = await import('./backends/local/memory');
    return createMemFs();
  }

  let proto: string;
  let uri: string;
  const r = storage.match(/^([^:]+):\/\/(.+)/);
  if (r) {
    proto = r[1];
    uri = r[2];
  } else {
    throw new Error('Invalid url');
  }

  switch (proto) {
    case 'file': {
      const { createFileFs } = await import('./backends/local/file');
      const lfs = createFileFs(uri, options?.fs);
      return lfs as any;
    }
    case 's3': {
      const { createS3Fs } = await import('./backends/s3/s3');
      return createS3Fs(uri) as any;
    }
    default: {
      throw new Error('Invalid url supplied, the protocol is not supported');
    }
  }
};
