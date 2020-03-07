# Node Active FS - nafs

```
npm install nafs
yarn add nafs
```

### Example

```js
const { nafs, expressMiddleware } = require('nafs');
const express = require('express');

const localFs = nafs('file:///tmp/dev_storage');
const remoteFs = nafs('s3:///key:secret@us-east-1/bucket_name/some/path');

const app = express();

app.use('/local-files', expressMiddleware(localFs.createReadStream));
app.use('/remote-files', expressMiddleware(remoteFs.createReadStream));

app.get('/', (req, res) => {
  remoteFs.writeFile('/hello', 'Hello World').then(() => {
    res.send('saved file to s3, check it out on /remote-files/hello or /read');
  });
});
app.get('/read', (req, res) => {
  removeFs.readFile('/hello').then((file) => {
    res.send(file);
  });
});

```

### Enable cache for remote data
```js
const remoteFs = nafs('s3:///key:secret@us-east-1/bucket_name?cacheDir=/tmp/images');

console.time('hello');
remoteFs.readFile('/hello').then(() => {
  console.timeEnd('hello'); /* 70 ms */
});
/* now cached */
console.time('hello');
remoteFs.readFile('/hello').then(() => {
  console.timeEnd('hello'); /* 2 ms */
});

```

