import { nafs } from './src';
import realfs from 'fs';

const fs = await nafs('somestring');
fs.createReadStream;
fs.createWriteStream;
fs.promises.readFile;
fs.promises.writeFile;
fs.promises.mkdir;
