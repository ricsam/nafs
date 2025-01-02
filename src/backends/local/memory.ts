import { IFs, memfs } from 'memfs';

export const createMemFs = (): IFs => {
  return memfs().fs;
};
