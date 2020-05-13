import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import mkdirp from 'mkdirp';
import * as path from 'path';
import * as queryString from 'query-string';
import * as stream from 'stream';

type NAFS = {
  writeFile: (fpath: string, body: any) => Promise<any>;
  readFile: (fpath: string) => Promise<Buffer | string>;
  createReadStream: (fpath: string) => stream.Readable;
  createWriteStream: (fpath: string) => stream.Writable;
};

type NAFSFactory = (url: string) => NAFS;

const streamToPromise = (stream: stream) => {
  return new Promise<Buffer | string>((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    stream.on('end', () => {
      const body = Buffer.concat(chunks);
      resolve(body);
    });

    stream.on('error', (error) => {
      reject(error);
    });
  });
};

const activeStorageFileServe: NAFSFactory = (url: string) => {
  let rootPath: string;
  const r = url.match(/^file:\/\/(.*)$/);
  if (r) {
    rootPath = r[1];
  } else {
    throw new Error('Invalid URL');
  }

  const createReadStream = (fpath: string) =>
    fs.createReadStream(path.join(rootPath, fpath));
  const createWriteStream = (fpath: string) =>
    fs.createWriteStream(path.join(rootPath, fpath));

  return {
    createReadStream,
    writeFile: (fpath: string, fileContent: any) =>
      new Promise((resolve, reject) => {
        fs.writeFile(path.join(rootPath, fpath), fileContent, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }),
    readFile: (fpath: string) =>
      new Promise((resolve, reject) => {
        fs.readFile(path.join(rootPath, fpath), (err, file) => {
          if (err) {
            reject(err);
          } else {
            resolve(file);
          }
        });
      }),
    createWriteStream,
  };
};

// pass a into b
const forwardStream = (a: stream.Readable, b: stream.PassThrough) => {
  a.pipe(b);
  a.on('close', () => {
    b.emit('close');
  });
  a.on('end', () => {
    b.emit('end');
  });
  a.on('error', (err) => {
    b.emit('error', err);
  });
};

const activeStorageS3Serve: NAFSFactory = (url) => {
  let apiKey: string;
  let secret: string;
  let region: string;
  let bucket: string;
  let rootPath: string;
  let cacheDir: string | undefined;

  let fetchPolicy:
    | 'cache-first'
    | 'cache-and-network'
    | 'network-only'
    | 'cache-only'
    | 'no-cache' = 'cache-first';

  const r = url.match(
    /^s3:\/\/([^:]+):([^@]+)@([^/]+)\/([^/?]+)\/?([^?]*)(\?.+)?$/
  );

  if (r) {
    let queryParams: string;
    [, apiKey, secret, region, bucket, rootPath = '/', queryParams] = r;
    if (queryParams) {
      ({ cacheDir, fetchPolicy } = queryString.parse(queryParams) as any);
    }
  } else {
    throw new Error(
      'Invalid URL, should conform to s3://key:secret@eu-central-1/bucket_name/some/path/in/bucket?cacheDir=/tmp/img_data&fetchPolicy=network-only'
    );
  }

  const s3 = new AWS.S3({
    accessKeyId: apiKey,
    secretAccessKey: secret,
    region,
  });

  const getS3Path = (fpath: string) =>
    path.join(rootPath, fpath).replace(/^\//, '');

  const readRemoteStream = (fpath: string) => {
    return s3
      .getObject({
        Bucket: bucket,
        Key: getS3Path(fpath),
      })
      .createReadStream();
  };

  let cachePath: string | undefined;
  if (cacheDir) {
    cachePath = path.resolve(path.join(cacheDir, rootPath));
  }

  const writeFileToCache = async (fpath: string, body: any) => {
    if (cachePath) {
      const cacheFpath = path.join(cachePath, fpath);
      await mkdirp(path.dirname(cacheFpath));
      return fs.promises.writeFile(cacheFpath, body);
    }
  };

  const writeStreamToCache = async (
    fpath: string,
    stream: NodeJS.ReadableStream
  ) => {
    if (cachePath) {
      const cacheFpath = path.join(cachePath, fpath);
      await mkdirp(path.dirname(cacheFpath));
      const fstream = fs.createWriteStream(cacheFpath);
      stream.pipe(fstream);
      return new Promise((resolve, reject) => {
        const onError = (err: any) => {
          fs.unlink(cacheFpath, () => {
            reject(err);
          });
        };
        stream.once('error', onError);
        fstream.once('end', () => {
          resolve();
        });
        fstream.once('error', onError);
      });
    }
  };

  const createReadStream = (fpath: string) => {
    const passStream = new stream.PassThrough();
    if (cachePath) {
      const cacheFpath = path.join(cachePath, fpath);
      if (fetchPolicy === 'cache-first') {
        fs.promises
          .access(cacheFpath)
          .then(() => {
            forwardStream(fs.createReadStream(cacheFpath), passStream);
          })
          .catch(() => {
            const stream = readRemoteStream(fpath);
            writeStreamToCache(fpath, stream).catch((err) => {
              throw err;
            });
            forwardStream(stream, passStream);
          });
      } else if (fetchPolicy === 'cache-and-network') {
        const remoteStream = readRemoteStream(fpath);
        writeStreamToCache(fpath, remoteStream).catch((err) => {
          // ignore error here
        });
        fs.promises
          .access(cacheFpath)
          .then(() => {
            forwardStream(fs.createReadStream(cacheFpath), passStream);
          })
          .catch((err) => {
            forwardStream(remoteStream, passStream);
          });
      } else if (fetchPolicy === 'cache-only') {
        return fs.createReadStream(cacheFpath);
      } else if (fetchPolicy === 'network-only') {
        const stream = readRemoteStream(fpath);
        writeStreamToCache(fpath, stream).catch((err) => {
          // ignore error here
        });
        forwardStream(stream, passStream);
      } else if (fetchPolicy === 'no-cache') {
        return readRemoteStream(fpath);
      }
    } else {
      return readRemoteStream(fpath);
    }
    return passStream;
  };

  const createWriteStream = (fpath: string) => {
    const ptStream = new stream.PassThrough();
    const s3Stream = new stream.PassThrough();
    const cacheStream = new stream.PassThrough();
    ptStream.pipe(s3Stream);
    ptStream.pipe(cacheStream);
    s3.upload({
      Bucket: bucket,
      Key: getS3Path(fpath),
      Body: s3Stream,
    }, (err) => {
      if (err) {
        throw err;
      }
    });
    writeStreamToCache(fpath, cacheStream);
    return ptStream;
  };

  return {
    readFile: async (fpath) => {
      const stream = createReadStream(fpath);
      return streamToPromise(stream);
    },
    writeFile: async (fpath, body) => {
      await Promise.all([
        writeFileToCache(fpath, body),
        s3
          .putObject({
            Bucket: bucket,
            Key: getS3Path(fpath),
            Body: body,
          })
          .promise(),
      ]);
    },
    createReadStream,
    createWriteStream,
  };
};

export const nafs: NAFSFactory = (url: string) => {
  let proto: string;

  const r = url.match(/([^:])+(?=:\/\/)/);
  if (r) {
    proto = r[0];
  } else {
    throw new Error('Invalid url');
  }

  switch (proto) {
    case 'file': {
      return activeStorageFileServe(url);
    }
    case 's3': {
      return activeStorageS3Serve(url);
    }
    default: {
      throw new Error('Invalid url supplied, the protocol is not supported');
    }
  }
};
