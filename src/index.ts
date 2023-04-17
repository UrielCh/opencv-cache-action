import * as fs from "fs";
import * as path from "path";
import * as core from "@actions/core";
import * as cache from "@actions/cache";
import * as io from "@actions/io";
import * as process from "process";
import { Configurations } from "./Configurations";
import { downloadFile, unzipFile } from "./utils";
import * as exec from "@actions/exec";

async function getCode(config: Configurations) {
  await downloadFile(config.openCVUrl, "opencv.zip");
  await unzipFile("opencv.zip", "opencv");
  // await exec.exec("git", [ "clone", "--quiet", "--branch", branch, "--single-branch", "--depth", "1", "https://github.com/opencv/opencv.git", "opencv" ]);

  if (!config.NO_CONTRIB) {
    await downloadFile(config.openCVContribUrl, "opencv_contrib.zip");
    await unzipFile("opencv_contrib.zip", "opencv_contrib");
    // await exec.exec("git", [ "clone", "--branch", branch, "--single-branch", "--depth", "1", "https://github.com/opencv/opencv_contrib.git", "opencv_contrib" ]);
  }

  console.log('Files in the current folder: ', fs.readdirSync('.'))

  console.log('Mk dir build')
  fs.mkdirSync('build');
  // await io.mkdirP("build");
  console.log(`Files in the current folder (${process.cwd}): `, fs.readdirSync('.'))

  const workdir = "build";

  // process.chdir(path.join(process.cwd) "build");

  //process.chdir(`Now in the folder ${process.cwd()}`);
  
  // see doc: https://docs.opencv.org/4.x/db/d05/tutorial_config_reference.html
  const cMakeArgs = [
    "-DCMAKE_BUILD_TYPE=Release",
    "-DOPENCV_ENABLE_NONFREE=ON",
    `-DBUILD_LIST=${config.BUILD_LIST}`,
  ];
  if (!config.NO_CONTRIB) {
    cMakeArgs.push("-DOPENCV_EXTRA_MODULES_PATH=../opencv_contrib/modules");
  }
  cMakeArgs.push("../opencv");
  await exec.exec("cmake", cMakeArgs, {cwd: workdir});
  await exec.exec("cmake", ["--build", "."], {cwd: workdir});
  // process.chdir("..");

  process.chdir(`back to folder ${process.cwd()}`);

  // console.log("start saveCache to key:", storeKey);
  const ret = await cache.saveCache(config.cacheDir, config.storeKey); // Cache Size: ~363 MB (380934981 B)
  console.log("saveCache return ", ret);
  console.timeEnd("cache");
}

// most @actions toolkit packages have async methods
async function run() {
  try {
    if (!core)
      throw new Error("core is undefined");
    const config = new Configurations(core.getInput("branch"), core.getInput("BUILD_LIST"), core.getInput("NO_CONTRIB"));
    config.normalize();
    // core,imgproc,imgcodecs,videoio,highgui,video,calib3d,features2d,objdetect,dnn,ml,flann,photo,stitching,gapi,python3,ts,python_bindings_generator
    console.log(`current PWD: ${process.cwd()}`);
    // get one LVL up
    process.chdir("..");
    console.log(`changing directory to: ${process.cwd()}`);
    if (!cache.isFeatureAvailable) {
      console.log("Cache service is not availible");
      await getCode(config);
      return;
    }
    console.time("cache");
    const storeKey = config.storeKey;
    console.log(`Get Cache key: ${storeKey}`);
    const cacheKey = await cache.restoreCache(config.cacheDir, storeKey, undefined, {
      downloadConcurrency: 4,
      timeoutInMs: 120000,
    });
    if (cacheKey) {
      console.log(`restoreCache Success`);
      console.timeEnd("cache");
      return;
    }
    console.log(
      `No cached value found for input keys: ${storeKey}, Building from sources`,
    );
    await getCode(config);
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}
console.log("Start Plugin core:");
run();
