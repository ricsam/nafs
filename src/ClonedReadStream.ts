import * as stream from 'stream';

export class ClonedReadStream extends stream.Readable {
  constructor(
    readableStream: stream.Readable,
    options?: stream.ReadableOptions
  ) {
    super(options);

    readableStream.on('data', (chunk) => {
      this.push(chunk);
    });

    readableStream.on('end', () => {
      this.push(null);
    });

    readableStream.on('error', (err) => {
      this.emit('error', err);
    });
  }
  _read() {
    /*  */
  }
}
