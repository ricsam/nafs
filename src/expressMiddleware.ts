import { IncomingMessage, OutgoingMessage } from 'http';
import * as stream from 'stream';
import { parse } from 'url';

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
      return;
    }
    const fpath = parse(req.url as string).pathname;

    if (!fpath) {
      next(new Error('Invalid path'));
      return;
    }

    const stream = createReadStream(fpath);
    stream.on('error', function error(err) {
      next(err);
    });
    stream.pipe(res);
  };
};
