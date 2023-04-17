const core = require("@actions/core");
const cache = require("@actions/cache");
const exec = require("@actions/exec");
const io = require("@actions/io");
const process = require("process");
const Configurations = require("./Configurations");

// most @actions toolkit packages have async methods
async function run() {
  try {
    const config = new Configurations(
      core.getInput("branch"),
      core.getInput("BUILD_LIST"),
      core.getInput("NO_CONTRIB"),
    );
    // core,imgproc,imgcodecs,videoio,highgui,video,calib3d,features2d,objdetect,dnn,ml,flann,photo,stitching,gapi,python3,ts,python_bindings_generator
    process.chdir("..");
    let cacheKey = undefined;
    const storeKey = config.storeKey;
    console.time("cache");
    if (!cache.isFeatureAvailable) {
      core.setOutput("Cache service is not availible");
    } else {
      cacheKey = await cache.restoreCache(
        config.cachePaths,
        storeKey,
        undefined,
        {},
      );
      console.log(`Lookup cache key: "${storeKey}" return ${cacheKey}`);
      if (cacheKey) {
        console.log(`restoreCache Success`);
        // core.setOutput("Cache Restored");
        console.timeEnd("cache");
        return;
      } else {
        console.log(
          `No cached value found for input keys: ${storeKey}, Building from sources`,
        );
      }
    }

    await exec.exec("git", [
      "clone",
      "--quiet",
      "--branch",
      config.branch,
      "--single-branch",
      "--depth",
      "1",
      "https://github.com/opencv/opencv.git",
      "opencv",
    ]);
    if (!config.NO_CONTRIB) {
      await exec.exec("git", [
        "clone",
        "--branch",
        config.branch,
        "--single-branch",
        "--depth",
        "1",
        "https://github.com/opencv/opencv_contrib.git",
        "opencv_contrib",
      ]);
    }
    await io.mkdirP("build");
    process.chdir("build");
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
    await exec.exec("cmake", cMakeArgs);
    await exec.exec("cmake", ["--build", "."]);
    process.chdir("..");
    console.log("start saveCache to key:", storeKey);
    const ret = await cache.saveCache(config.cachePaths, storeKey); // Cache Size: ~363 MB (380934981 B)
    console.log("saveCache return ", ret);
    console.timeEnd("cache");
  } catch (error) {
    console.error(error.message);
    core.setFailed(error.message);
  }
}
console.log("Start Plugin");
run();
