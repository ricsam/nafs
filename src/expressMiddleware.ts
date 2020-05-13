import { IncomingMessage, OutgoingMessage } from 'http';
import * as stream from 'stream';
import { parse } from 'url';
import { ClonedReadStream } from './ClonedReadStream';

export const expressMiddleware = (
  createReadStream: (fpath: string) => stream.Readable
) => {
  return (
    req: IncomingMessage,
    res: OutgoingMessage,
    next: (err?: any) => void
  ): any => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      /* exists on express req */
      (res as any).statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD');
      res.setHeader('Content-Length', '0');
      res.end();
      next();
      return;
    }
    const fpath = parse(req.url as string).pathname;

    if (!fpath) {
      next(new Error('Invalid path'));
      return;
    }

    const stream = createReadStream(fpath);
    stream.once('error', function error(err) {
      // next(err);
      if (err.name === 'NoSuchKey') {
        (res as any).statusCode = 404;
        res.write('Not found');
        res.end();
      } else {
        next(err);
      }
    });
    new ClonedReadStream(stream).pipe(res);
  };
};
