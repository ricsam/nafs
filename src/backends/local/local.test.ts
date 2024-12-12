import { expect, test } from 'bun:test';
import { createFsFromVolume, memfs, Volume } from 'memfs';
import { nafs } from '../../nafs';

test('memfs', async () => {
  const fs = await nafs(':memory:');
  await fs.promises.writeFile('/test', 'test');
  expect(await fs.promises.readFile('/test', 'utf-8')).toBe('test');
});

test('fs', async () => {
  const vol = new Volume();
  const realFs = createFsFromVolume(vol);
  const fs = await nafs('file:///tmp', {
    fs: realFs,
  });
  await fs.promises.mkdir('/tmp', { recursive: true });
  await fs.promises.writeFile('/tmp/test', 'test');
  expect(await fs.promises.readFile('/tmp/test', 'utf-8')).toBe('test');
  expect(await realFs.promises.readFile('/tmp/tmp/test', 'utf-8')).toBe('test');
});
