import { link } from '@ricsam/linkfs';
import type { IFs } from 'memfs';
import * as path from 'path';
import * as realFs from 'fs';

export const createFileFs = (uri: string, fs?: IFs): IFs | typeof realFs => {
  const lfs = link(fs ?? realFs, [
    '/',
    uri.startsWith('/') ? uri : path.join(process.cwd(), uri),
  ]);
  return lfs;
};
