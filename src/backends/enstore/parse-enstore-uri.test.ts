import { describe, test, expect } from 'bun:test';
import { parseEnstoreUri } from './parse-enstore-uri';

describe('parseEnstoreUri', () => {
  test('parses URL with all components', () => {
    const url =
      'enstore://user:pass123/some/folder/prefix?endpoint=http://localhost:3000/enstore';
    expect(parseEnstoreUri(url)).toEqual({
      username: 'user',
      password: 'pass123',
      pathPrefix: '/some/folder/prefix',
      endpoint: 'http://localhost:3000/enstore',
    });
  });

  test('parses URL with complex password containing special characters', () => {
    const url =
      'enstore://user:pass:123/folder?endpoint=http://localhost:3000/enstore';
    expect(parseEnstoreUri(url)).toEqual({
      username: 'user',
      password: 'pass:123',
      pathPrefix: '/folder',
      endpoint: 'http://localhost:3000/enstore',
    });
  });

  test('parses URL without credentials', () => {
    const url =
      'enstore:///some/folder/prefix?endpoint=http://localhost:3000/enstore';
    expect(parseEnstoreUri(url)).toEqual({
      pathPrefix: '/some/folder/prefix',
      endpoint: 'http://localhost:3000/enstore',
    });
  });

  test('parses URL with only endpoint', () => {
    const url = 'enstore://?endpoint=http://localhost:3000/enstore';
    expect(parseEnstoreUri(url)).toEqual({
      pathPrefix: '',
      endpoint: 'http://localhost:3000/enstore',
    });
  });

  test('parses minimal URL', () => {
    const url = 'enstore://';
    expect(parseEnstoreUri(url)).toEqual({
      pathPrefix: '',
    });
  });

  test('parses URL with credentials but no path', () => {
    const url = 'enstore://user:pass?endpoint=http://localhost:3000/enstore';
    expect(parseEnstoreUri(url)).toEqual({
      username: 'user',
      password: 'pass',
      pathPrefix: '',
      endpoint: 'http://localhost:3000/enstore',
    });
  });

  test('parses URL with credentials and trailing slash', () => {
    const url = 'enstore://user:pass/?endpoint=http://localhost:3000/enstore';
    expect(parseEnstoreUri(url)).toEqual({
      username: 'user',
      password: 'pass',
      pathPrefix: '',
      endpoint: 'http://localhost:3000/enstore',
    });
  });

  test('handles URL-encoded characters in credentials', () => {
    const url =
      'enstore://user:pass%2Fword%3F123/folder?endpoint=http://localhost:3000/enstore';
    expect(parseEnstoreUri(url)).toEqual({
      username: 'user',
      password: 'pass/word?123',
      pathPrefix: '/folder',
      endpoint: 'http://localhost:3000/enstore',
    });
  });

  test('throws error for invalid protocol', () => {
    const url = 'http://user:pass/folder';
    expect(() => parseEnstoreUri(url as any)).toThrow(
      'Invalid enstore URL: must start with enstore://'
    );
  });

  test('throws error for URLs using @ in credentials', () => {
    const url = 'enstore://user@pass/folder';
    expect(() => parseEnstoreUri(url)).toThrow(
      'Invalid enstore URL: use : for credentials, not @'
    );
  });
});
