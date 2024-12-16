import { fs, IFs } from 'memfs';

export const createMemFs = (): IFs => {
  return fs;
};
