const core = require('@actions/core');
const cache = require('@actions/cache');
const exec = require('@actions/exec');
const io = require('@actions/io');
const process = require('process');

// const wait = require('./wait');

// most @actions toolkit packages have async methods
async function run() {
  try {
    let cacheKey = undefined;
    const branch = core.getInput('branch');
    console.log("branch:", branch);

    if (!cache.isFeatureAvailable) {
      console.log("NO CACHE");
      core.setOutput("Cache service is not availible");
    } else {
      console.log("Get Cache:");
      const platform = process.env.RUNNER_OS;
      console.log(`cahce key: opencv-${platform}-${branch}`);
      cacheKey = await cache.restoreCache(["opencv"], `opencv-${platform}-${branch}`);
      console.log(`cacheKey:${cacheKey}`);
    }
    if (cacheKey) {
      // done for now.
      core.setOutput("Cache Restored");
      return;
    }
    //await exec.exec("actions/checkout@v2", ['--branch', branch, '--repository', 'opencv/opencv', '--path', 'opencv']);
    await exec.exec("git", ['clone', '--branch', branch, '--single-branch', '--depth', '1', 'https://github.com/opencv/opencv.git', 'opencv']);
    //await exec.exec("git", ['clone', '--branch', branch, '--single-branch', '--depth', '1', 'https://github.com/opencv/opencv_contrib.git', 'opencv_contrib']);
    await io.mkdirP('build');
    process.chdir('build');
    // see doc: https://docs.opencv.org/4.x/db/d05/tutorial_config_reference.html
    //await exec.exec("cmake", [
    //  '-DCMAKE_BUILD_TYPE=Release',
    //  '-DOPENCV_ENABLE_NONFREE=ON',
    //  '-DOPENCV_EXTRA_MODULES_PATH=../opencv_contrib/modules',
    //  '-DBUILD_LIST=core,imgcodecs,calib3d,python3,python_bindings_generator',
    //  '../opencv',
    //]);
    // await exec.exec("cmake", [ '--build', '.']);
    process.chdir('..');
    await exec.exec("ls -l");

    // await wait(parseInt(ms));
    console.log((new Date()).toTimeString());
    core.setOutput('time', new Date().toTimeString());
  } catch (error) {
    console.error(error.message);
    core.setFailed(error.message);
  }
}
console.log("Start Plugin");
run();
