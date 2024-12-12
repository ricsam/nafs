import type { IFs } from 'memfs';
import { fs } from 'memfs';
export const createMemFs = (): IFs => {
  return fs;
};
