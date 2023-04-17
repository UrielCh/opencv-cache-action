import * as httpm from "@actions/http-client";
import * as fs from "fs";
import * as zlib from 'zlib';
import * as unzipper from 'unzipper';
import { pipeline } from 'stream';
import { promisify } from 'util';

export async function unzipFile(input: string, dest: string) {
    return new Promise<undefined>((resolve, reject) => {
      // Create a read stream for the input file
      const readStream = fs.createReadStream(input);
  
      // Pipe the read stream to the unzipper.Extract stream, which will extract the contents to the destination folder
      readStream
        .pipe(unzipper.Extract({ path: dest }))
        .on('close', () => resolve(undefined))
        .on('error', (err) => reject(err));
  
      // Handle read stream error
      readStream.on('error', (err) => reject(err));
    });
  }

export async function downloadFile(url: string, dest: string) {
    const key = `Downloading ${url}`;
    console.time(key);
    const http = new httpm.HttpClient('Github actions client');
    const file = fs.createWriteStream(dest);
    await new Promise<undefined>(resolve => {
        const req = http.get(url);
        req.then(({ message }) => {
            message.pipe(file).on('close', () => { resolve(undefined) });
        })
    })
    console.timeEnd(key);
    const stat = fs.statSync(dest);
    console.log(`file Size: ${stat.size/1024} Kbytes`)
    return dest;
}


