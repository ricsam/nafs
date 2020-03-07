import express from 'express';
import { parse } from 'url';
import * as stream from 'stream';

export const expressMiddleware = (
  createReadStream: (fpath: string) => stream.Readable
): express.RequestHandler => {
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD');
      res.setHeader('Content-Length', '0');
      res.end();
      return;
    }
    const fpath = parse(req.url).pathname;

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
