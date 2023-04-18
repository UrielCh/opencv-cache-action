import * as fs from "fs";
import * as core from "@actions/core";
import * as cache from "@actions/cache";
import * as process from "process";
import { Configurations } from "./Configurations";
import { downloadFile, unzipFile } from "./utils";
import * as exec from "@actions/exec";
import * as glob from "@actions/glob";
import * as io from "@actions/io";

async function getCode(config: Configurations) {
  await downloadFile(config.openCVUrl, "opencv.zip");
  await unzipFile("opencv.zip", "opencv");
  // await exec.exec("git", [ "clone", "--quiet", "--branch", branch, "--single-branch", "--depth", "1", "https://github.com/opencv/opencv.git", "opencv" ]);

  if (!config.NO_CONTRIB) {
    await downloadFile(config.openCVContribUrl, "opencv_contrib.zip");
    await unzipFile("opencv_contrib.zip", "opencv_contrib");
    // await exec.exec("git", [ "clone", "--branch", branch, "--single-branch", "--depth", "1", "https://github.com/opencv/opencv_contrib.git", "opencv_contrib" ]);
  }

  fs.mkdirSync('build', { recursive: true });
  // await io.mkdirP("build");
  console.log(`Files in the current folder (${process.cwd()}): `, fs.readdirSync('.'))
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
  console.log("start cmake with args:", cMakeArgs);
  await exec.exec("cmake", cMakeArgs, {cwd: workdir});
  console.log("start cmake build");
  await exec.exec("cmake", ["--build", "."], {cwd: workdir});
  // process.chdir("..");
  console.log(`stay in folder ${process.cwd()}`);

  if (config.DO_SHRINK) {
    const patterns = [
      'opencv/samples',
      'opencv/doc',
      "opencv/modules/*/test",
      "opencv_contrib/samples",
      "opencv_contrib/doc",
      "opencv_contrib/modules/*/test",
      "opencv_contrib/modules/*/samples",
      "opencv_contrib/modules/*/tutorials",
    ];
    const globber = await glob.create(patterns.join('\n'))
    const files = await globber.glob()
    for (const file of files) {
      await io.rmRF(file);
    }
  }

  // console.log("start saveCache to key:", storeKey);
  if (cache.isFeatureAvailable()) {
    console.time("upload cache");
    const ret = await cache.saveCache(config.cacheDir, config.storeKey); // Cache Size: ~363 MB (380934981 B)
    console.log("saveCache return ", ret);
    console.timeEnd("upload cache");
  }
}

// most @actions toolkit packages have async methods
async function run() {
  try {
    if (!core)
      throw new Error("core is undefined");
    const config = new Configurations(core.getInput("branch"), core.getInput("BUILD_LIST"), core.getInput("NO_CONTRIB"), core.getInput("DO_SHRINK"));
    // core,imgproc,imgcodecs,videoio,highgui,video,calib3d,features2d,objdetect,dnn,ml,flann,photo,stitching,gapi,python3,ts,python_bindings_generator
    console.log(`current PWD: ${process.cwd()}`);
    // get one LVL up
    process.chdir("..");
    console.log(`changing directory to: ${process.cwd()}`);
    if (!cache.isFeatureAvailable()) {
      console.log("Cache service is not availible");
      await getCode(config);
      return;
    }
    const storeKey = config.storeKey;
    console.log(`Get Cache key: ${storeKey}`);
    console.time("get cache");
    const cacheKey = await cache.restoreCache(config.cacheDir, storeKey, undefined, {
      downloadConcurrency: 4,
      timeoutInMs: 120000,
    });
    console.timeEnd("get cache");
    if (cacheKey) {
      console.log(`restoreCache Success`);
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
