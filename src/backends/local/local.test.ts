import { expect, test } from 'bun:test';
import { createFsFromVolume, Volume } from 'memfs';
import { createLinkFs } from './file';
import { createMemFs } from './memory';
import { toTreeSync } from 'memfs/lib/print';

test('memfs', async () => {
  const fs = createMemFs();
  await fs.promises.writeFile('/test', 'test');
  expect(await fs.promises.readFile('/test', 'utf-8')).toBe('test');
});

test('fs', async () => {
  const vol = new Volume();
  const memfs = createFsFromVolume(vol);
  const fs = createLinkFs('file:///tmp', memfs);
  await fs.promises.mkdir('/tmp', { recursive: true });
  await fs.promises.writeFile('/tmp/test', 'test');
  expect(await fs.promises.readFile('/tmp/test', 'utf-8')).toBe('test');
  expect(await memfs.promises.readFile('/tmp/tmp/test', 'utf-8')).toBe('test');
});
