const core = require('@actions/core');
const cache = require('@actions/cache');
const exec = require('@actions/exec');
const wait = require('./wait');


// most @actions toolkit packages have async methods
async function run() {
  try {
    let cacheKey = undefined;
    const branch = core.getInput('branch');
    if (!cache.isFeatureAvailable) {
      core.setOutput("Cache service is not availible");
    } else {
      const platform = process.env.RUNNER_OS;
      cacheKey = cache.restoreCache(["opencv"], `opencv-${platform}-${branch}`);
    }
    if (cacheKey) {
      // done for now.
      core.setOutput("Cache Restored");
      return;
    }
    core.info(`Calling actions/checkout ...`);
    await exec.exec("actions/checkout@v2", ['--branch', branch, '--repository', 'opencv/opencv', '--path', 'opencv']);

    core.setOutput('getExecOutput("ls -l")');
    await exec.getExecOutput("ls -l");
    core.setOutput('exec("ls -l")');
    await  exec.exec("ls -l");

    // await wait(parseInt(ms));
    core.info((new Date()).toTimeString());
    core.setOutput('time', new Date().toTimeString());
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
