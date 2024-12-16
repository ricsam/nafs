import { link } from '@ricsam/linkfs';
import * as path from 'path';
import * as realfs from 'fs';
import { parseUri } from '../../parse-uri';

export const createLinkFs = <T>(uri: `file://${string}`, fs: T): T => {
  const parsed = parseUri(uri);
  const lfs = link(fs, [
    '/',
    parsed.path.startsWith('/')
      ? parsed.path
      : path.join(process.cwd(), parsed.path),
  ]);
  return lfs;
};
export function createFileFs(uri: `file://${string}`): typeof realfs {
  return createLinkFs(uri, realfs);
}
