import * as httpm from "@actions/http-client";
import * as fs from "fs";
import * as path from "path";
import * as unzipper from 'unzipper';

export async function unzipFile(input: string, dest: string): Promise<void> {
  const key = `unzip ${input}`;
  console.time(key);
  await new Promise<void>((resolve, reject) => {
    const readStream = fs.createReadStream(input);

    const createdDirs = new Set();
    function createDirIfNotExists(dir: string) {
      if (!createdDirs.has(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        createdDirs.add(dir);
      }
    }

    // Pipe the read stream to the unzipper.Extract stream, which will extract the contents to the destination folder
    readStream
      .pipe(unzipper.Parse())
      .on('entry', (entry: unzipper.Entry) => {
        const newPath = entry.path.split('/').slice(1).join('/');
        const targetPath = path.join(dest, newPath);
        if (targetPath) {
          if (entry.type === 'Directory') {
            createDirIfNotExists(targetPath);
            entry.autodrain();
          } else {
            const parentDir = targetPath.substring(0, targetPath.lastIndexOf(path.sep));
            createDirIfNotExists(parentDir);
            entry.pipe(fs.createWriteStream(targetPath));
          }
        } else {
          entry.autodrain();
        }
      })
      // .pipe(unzipper.Extract({ path: dest }))
      .on('close', () => resolve())
      .on('error', (err) => reject(err));

    // Handle read stream error
    readStream.on('error', (err) => reject(err));
  });
  console.timeEnd(key);
}

export async function downloadFile(url: string, dest: string) {
  const fulldest = path.resolve(process.cwd(), dest);
  if (fs.existsSync(fulldest))
    return fulldest;
  const key = `Downloading ${url} to ${fulldest} `;
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
  console.log(`${fulldest} Size: ${formatFileSize(stat.size)}`)
  return fulldest;
}

export function formatFileSize(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let i;
  for (i = 0; bytes >= 1024 && i < units.length - 1; i++) {
    bytes /= 1024;
  }
  return `${parseFloat(bytes.toFixed(2))} ${units[i]}`;
}
