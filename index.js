const core = require('@actions/core');
const cache = require('@actions/cache');
const exec = require('@actions/exec');
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
    core.info(`Calling actions/checkout ...`);
    console.log("clonning");

    //await exec.exec("actions/checkout@v2", ['--branch', branch, '--repository', 'opencv/opencv', '--path', 'opencv']);
    await exec.exec("git", ['clone', '--branch', branch, 'https://github.com/opencv/opencv.git', 'opencv']);
    console.log("clonning Done");

    await exec.exec("git", ['clone', '--branch', branch, 'https://github.com/opencv/opencv_contrib.git', 'opencv_contrib']);

    core.setOutput('getExecOutput("ls -l")');
    const out = await exec.getExecOutput("ls -l");
    console.log(out.stdout);

    core.setOutput('exec("ls -l")');
    await  exec.exec("ls -l");

    // await wait(parseInt(ms));
    core.info((new Date()).toTimeString());
    console.log((new Date()).toTimeString());
    core.setOutput('time', new Date().toTimeString());
  } catch (error) {
    console.error(error.message);
    core.setFailed(error.message);
  }
}
console.log("Start Plugin");
run();
