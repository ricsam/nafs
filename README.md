# Node Active FS - nafs

Nafs is an abstraction of the [Node fs API](https://nodejs.org/api/fs.html) where you can choose to point the fs to a remote location like s3, postgres, logstash, kibana or locally like the local filesystem or in memory. Check the [compatiblility table](#supported-file-system-methods) to see which parts of the fs API has been implemented for each backend.

```bash
npm install nafs
```

[API docs](https://nafs-three.vercel.app/)\
[npm](https://npmjs.com/package/nafs)\
[Github](https://github.com/ricsam/nafs)


### Enable cache for remote data
```js
const remoteFs = nafs('s3://key:secret@us-east-1/bucket_name');
const localFs = nafs('/tmp/some_folder');

await remoteFs.promises.writeFile('/hello', 'Hello World');
await remoteFs.promises.readFile('/hello', 'utf8'); // Hello World

await localFs.promises.writeFile('/hello', 'Hello World');
await localFs.promises.readFile('/hello', 'utf8'); // Hello World
```

## Supported File System Methods

| Method               | File System | Memory | Amazon S3 | [Enstore](https://github.com/ricsam/enstore/tree/main/server) | Google Cloud Storage | Azure Storage |
|---------------------|-------------|---------|-----------|---------|---------------------|---------------|
| `promises.readFile` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `promises.writeFile` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `promises.unlink` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `promises.rmdir` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `promises.mkdir` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `promises.readdir` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `promises.stat` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `promises.lstat` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `promises.chmod` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `promises.chown` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `promises.utimes` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `promises.rename` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `promises.copyFile` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `promises.symlink` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `promises.readlink` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `promises.truncate` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `promises.access` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `createReadStream` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `createWriteStream` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

✅ - Implemented  
❌ - Not Implemented

File System and Memory implementations are provided via memfs and linkfs, supporting full Node.js fs API compatibility. Cloud storage implementations (Amazon S3, Google Cloud Storage, Azure Storage) are under development, with S3 currently supporting basic file reading and writing operations.
