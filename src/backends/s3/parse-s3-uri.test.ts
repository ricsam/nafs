import { parseS3Uri } from './parse-s3-uri';
import { describe, expect, it, test } from 'bun:test';

describe('parseS3Uri', () => {
  describe('root paths', () => {
    it('should handle bucket without trailing slash', () => {
      const uri = 's3://bucket-name';
      expect(parseS3Uri(uri)).toEqual({
        bucket: 'bucket-name',
        key: '',
      });
    });

    it('should handle bucket with trailing slash', () => {
      const uri = 's3://bucket-name/';
      expect(parseS3Uri(uri)).toEqual({
        bucket: 'bucket-name',
        key: '',
      });
    });

    it('should handle root paths with credentials', () => {
      const uri = 's3://key:secret@us-east-1/bucket-name';
      expect(parseS3Uri(uri)).toEqual({
        credentials: {
          accessKeyId: 'key',
          secretAccessKey: 'secret',
        },
        region: 'us-east-1',
        bucket: 'bucket-name',
        key: '',
      });
    });

    it('should handle root paths with region', () => {
      const uri = 's3://us-east-1/bucket-name';
      expect(parseS3Uri(uri)).toEqual({
        region: 'us-east-1',
        bucket: 'bucket-name',
        key: '',
      });
    });
  });

  describe('full format (credentials + region)', () => {
    it('should parse URI with credentials and region', () => {
      const uri = 's3://accessKey:secretKey@us-east-1/bucket-name/some/path';
      expect(parseS3Uri(uri)).toEqual({
        credentials: {
          accessKeyId: 'accessKey',
          secretAccessKey: 'secretKey',
        },
        region: 'us-east-1',
        bucket: 'bucket-name',
        key: 'some/path',
      });
    });

    it('should handle special characters in credentials', () => {
      const uri = 's3://access+key:secret/key+123@us-east-1/bucket-name/path';
      expect(parseS3Uri(uri)).toEqual({
        credentials: {
          accessKeyId: 'access+key',
          secretAccessKey: 'secret/key+123',
        },
        region: 'us-east-1',
        bucket: 'bucket-name',
        key: 'path',
      });
    });
  });

  describe('region format', () => {
    it('should parse URI with region', () => {
      const uri = 's3://us-east-1/bucket-name/some/path';
      expect(parseS3Uri(uri)).toEqual({
        region: 'us-east-1',
        bucket: 'bucket-name',
        key: 'some/path',
      });
    });
  });

  describe('simple format', () => {
    it('should parse URI with just bucket and path', () => {
      const uri = 's3://bucket-name/some/path';
      expect(parseS3Uri(uri)).toEqual({
        bucket: 'bucket-name',
        key: 'some/path',
      });
    });
  });

  describe('error cases', () => {
    const invalidUris = [
      's3://',
      'not-s3://bucket/path',
      'http://bucket/path',
      's3://key@region/bucket/path', // missing secret
      's3://key:@region/bucket/path', // empty secret
      's3://@region/bucket/path', // missing credentials
    ];

    test.each(invalidUris)('should throw for invalid URI: %s', (uri) => {
      expect(() => parseS3Uri(uri)).toThrow('Invalid S3 URI format');
    });
  });
});
