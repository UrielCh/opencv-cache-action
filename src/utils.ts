import httpm from "@actions/http-client";
import fs from "fs";
import zlib from 'zlib';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);

export async function unzipFile(input: string, output: string) {
    const key = `Unzip ${input}`;
    const readStream = fs.createReadStream(input);
    const writeStream = fs.createWriteStream(output);
    const unzip = zlib.createUnzip();
    console.time(key);
    try {
        await pipelineAsync(readStream, unzip, writeStream);
        console.log('File unzipped successfully');
    } catch (error) {
        console.error('Failed to unzip the file:', error);
    }
    console.timeEnd(key);
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
    return dest;
}


