import express from 'express';
import { nafs } from '../src/nafs';
import * as path from 'path';
import * as fs from 'fs';
import { expressMiddleware } from '../src/expressMiddleware';
import { config } from 'dotenv';

config({
  path: path.join(__dirname, '.env')
});

if (!process.env.AFS_S3) {
  throw new Error('process.env.AFS_S3 must be defined');
}

function tuple<A, B>(a: A, b: B): [A, B];
function tuple(...args: any[]) {
  return args;
}

const fetchPolicy:
  | 'cache-first'
  | 'cache-and-network'
  | 'network-only'
  | 'cache-only'
  | 'no-cache' = 'cache-and-network';

const storageDir = path.join(__dirname, '../testData');


const fileAfs = nafs('file://' + storageDir);
const s3Afs = nafs(
  `${process.env.AFS_S3}?cacheDir=${storageDir}&fetchPolicy=${fetchPolicy}`
);

const app = express();

const serves = tuple(tuple('file', fileAfs), tuple('s3', s3Afs));

serves.forEach(([key, { createReadStream, writeFile, readFile }]) => {
  app.use(`/static/${key}`, expressMiddleware(createReadStream));
  app.get(`/${key}/write/doc`, (req, res, next) => {
    writeFile('/written.html', `<h1>Written!</h1>`)
      .then(() => {
        res.send(
          `<a href="/static/${key}/written.html">View written file!</a>`
        );
      })
      .catch(next);
  });
  app.get(`/${key}/write/img`, (req, res, next) => {
    const jpeg = fs.readFileSync(path.join(__dirname, 'cat.jpeg'));
    writeFile('/cat.jpeg', jpeg)
      .then(() => {
        res.send(`<a href="/static/${key}/cat.jpeg">View written file!</a>`);
      })
      .catch(next);
  });
  app.get(`/${key}/read/img.jpeg`, (req, res, next) => {
    readFile('/cat.jpeg')
      .then((body: any) => {
        res.type('jpg');
        res.send(body);
      })
      .catch(next);
  });
});

app.get('/', (req, res) => {
  const links = serves
    .flatMap(([key]) => {
      return [
        `<a href="/${key}/write/doc">/${key}/write/doc</a>`,
        `<a href="/${key}/write/img">/${key}/write/img</a>`,
        `<a href="/${key}/read/img.jpeg">/${key}/read/img.jpeg</a>`,
      ];
    })
    .join('<br />');

  res.send(links);
});

app.listen(3000, () => {
  console.log('Listening on port 3000');
});
