const core = require('@actions/core');
const cache = require('@actions/cache');
const exec = require('@actions/exec');
const io = require('@actions/io');
const process = require('process');

// const wait = require('./wait');

// most @actions toolkit packages have async methods
async function run() {
  try {
    const cachePaths = ["opencv", "opencv_contrib", "build"];
    await exec.exec("pwd");
    // get one LVL up
    process.chdir('..');

    let cacheKey = undefined;
    const branch = core.getInput('branch');
    const platform = process.env.RUNNER_OS;
    const storeKey = `opencv-${platform}-${branch}`;
    console.time('cache');
    if (!cache.isFeatureAvailable) {
      console.log("NO CACHE");
      core.setOutput("Cache service is not availible");
    } else {
      console.log("Get Cache:");
      console.log(`cache key: ${storeKey}`);
      cacheKey = await cache.restoreCache(cachePaths, storeKey);
      console.log(`restoreCache return ${cacheKey}`);
    }

    if (cacheKey) {
      // done for now.
      core.setOutput("Cache Restored");
      console.timeEnd('cache');
      return;
    }

    await exec.exec("git", ['clone', '--quiet', '--branch', branch, '--single-branch', '--depth', '1', 'https://github.com/opencv/opencv.git', 'opencv']);
    await exec.exec("git", ['clone', '--branch', branch, '--single-branch', '--depth', '1', 'https://github.com/opencv/opencv_contrib.git', 'opencv_contrib']);
    await io.mkdirP('build');
    process.chdir('build');
    // see doc: https://docs.opencv.org/4.x/db/d05/tutorial_config_reference.html
    await exec.exec("cmake", [
      '-DCMAKE_BUILD_TYPE=Release',
      '-DOPENCV_ENABLE_NONFREE=ON',
      '-DOPENCV_EXTRA_MODULES_PATH=../opencv_contrib/modules',
      '-DBUILD_LIST=core,imgcodecs,calib3d,python3,python_bindings_generator',
      '../opencv',
    ]);
    await exec.exec("cmake", [ '--build', '.']);
    process.chdir('..');
    // await exec.exec("ls -l"); // build opencv opencv_contrib
    console.log('start saveCache to key:', storeKey);
    const ret = await cache.saveCache(cachePaths, storeKey); // Cache Size: ~363 MB (380934981 B)
    // await wait(parseInt(ms));
    console.log('saveCache return ', ret);
    // core.setOutput('time', new Date().toTimeString());
    console.timeEnd('cache');
  } catch (error) {
    console.error(error.message);
    core.setFailed(error.message);
  }
}
console.log("Start Plugin");
run();
