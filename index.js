const core = require("@actions/core");
const cache = require("@actions/cache");
const exec = require("@actions/exec");
const io = require("@actions/io");
const process = require("process");
const crypto = require("crypto");
const httpm = require("@actions/http-client");
const fs = require("fs");
const zlib = require('zlib');
const { pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);

async function unzipFile(input, output) {
  const readStream = fs.createReadStream(input);
  const writeStream = fs.createWriteStream(output);
  const unzip = zlib.createUnzip();

  try {
    await pipelineAsync(readStream, unzip, writeStream);
    console.log('File unzipped successfully');
  } catch (error) {
    console.error('Failed to unzip the file:', error);
  }
}

async function downloadFile(url, dest) {
  const http = new httpm.HttpClient('Github actions client');
  const file = fs.createWriteStream(dest);
  await new Promise(resolve => {
    const req = http.get(url);
    req.then(({message}) => {
      message.pipe(file).on('close', () => { resolve()});
    })
  })
  return dest;
}

// const wait = require('./wait');

// most @actions toolkit packages have async methods
async function run() {
  try {
    const branch = core.getInput("branch");
    const BUILD_LIST = core.getInput("BUILD_LIST").split(",").filter((a) =>
      a.trim()
    ).sort().join(",");
    const NO_CONTRIB = core.getInput("NO_CONTRIB");

    const hash = crypto.createHash("md5");
    hash.update(BUILD_LIST);
    const sig = hash.digest("hex");
    // core,imgproc,imgcodecs,videoio,highgui,video,calib3d,features2d,objdetect,dnn,ml,flann,photo,stitching,gapi,python3,ts,python_bindings_generator
    const cachePaths = ["opencv", "opencv_contrib", "build"];
    await exec.exec("pwd");
    // get one LVL up
    process.chdir("..");

    let cacheKey = undefined;

    const platform = process.env.RUNNER_OS;
    const storeKey = `opencv-${platform}-${branch}-${sig}${
      NO_CONTRIB ? "-no-contrib" : ""
    }`;
    console.time("cache");
    if (!cache.isFeatureAvailable) {
      core.setOutput("Cache service is not availible");
    } else {
      cacheKey = await cache.restoreCache(cachePaths, storeKey, undefined, {
        lookupOnly: true,
      });
      console.log(`Lookup cache key: "${storeKey}" return ${cacheKey}`);

      if (cacheKey) {
        console.log(`Get Cache key: ${storeKey}`);
        cacheKey = await cache.restoreCache(cachePaths, storeKey, undefined, {
          downloadConcurrency: 4,
          timeoutInMs: 120000,
        });
        if (cacheKey) {
          console.log(`restoreCache Success`);
          // core.setOutput("Cache Restored");
          console.timeEnd("cache");
          return;
        }
        core.error(`restoreCache key: ${storeKey} Failed.`);
        core.setFailed(`restoreCache key: ${storeKey} Failed.`);
        process.exit(1);
      } else {
        console.log(
          `No cached value found for input keys: ${storeKey}, Building from sources`,
        );
      }
    }

    await downloadFile(`https://github.com/opencv/opencv/archive/${branch}.zip`, "opencv.zip");
    await unzipFile("opencv.zip", "opencv");
    // await exec.exec("git", [ "clone", "--quiet", "--branch", branch, "--single-branch", "--depth", "1", "https://github.com/opencv/opencv.git", "opencv" ]);

    if (!NO_CONTRIB) {
      await downloadFile(`https://github.com/opencv/opencv_contrib/archive/${branch}.zip`, "opencv_contrib.zip");
      await unzipFile("opencv_contrib.zip", "opencv_contrib"); 
      // await exec.exec("git", [ "clone", "--branch", branch, "--single-branch", "--depth", "1", "https://github.com/opencv/opencv_contrib.git", "opencv_contrib" ]);
    }

    await io.mkdirP("build");
    process.chdir("build");
    // see doc: https://docs.opencv.org/4.x/db/d05/tutorial_config_reference.html
    const cMakeArgs = [
      "-DCMAKE_BUILD_TYPE=Release",
      "-DOPENCV_ENABLE_NONFREE=ON",
      `-DBUILD_LIST=${BUILD_LIST}`,
    ];
    if (!NO_CONTRIB) {
      cMakeArgs.push("-DOPENCV_EXTRA_MODULES_PATH=../opencv_contrib/modules");
    }

    // cMakeArgs.push("../opencv");
    // await exec.exec("cmake", cMakeArgs);
    // await exec.exec("cmake", ["--build", "."]);
    // process.chdir("..");
    // console.log("start saveCache to key:", storeKey);
    // const ret = await cache.saveCache(cachePaths, storeKey); // Cache Size: ~363 MB (380934981 B)
    // console.log("saveCache return ", ret);
    // console.timeEnd("cache");
  } catch (error) {
    console.error(error.message);
    core.setFailed(error.message);
  }
}
console.log("Start Plugin");
run();
