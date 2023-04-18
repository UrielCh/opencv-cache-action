/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 1651:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Configurations = void 0;
const crypto = __webpack_require__(6113);
class Configurations {
    branch;
    BUILD_LIST;
    NO_CONTRIB;
    DO_SHRINK;
    constructor(branch, BUILD_LIST, NO_CONTRIB, DO_SHRINK) {
        this.branch = branch || "4.6.0";
        this.BUILD_LIST = BUILD_LIST || "core,imgproc,imgcodecs,videoio,highgui,video,calib3d,features2d,objdetect,dnn,ml,photo,gapi,python3,python_bindings_generator";
        this.NO_CONTRIB = NO_CONTRIB || "";
        this.DO_SHRINK = DO_SHRINK || "";
        this.normalize();
    }
    normalize() {
        this.BUILD_LIST = this.BUILD_LIST
            .split(",")
            .filter((a) => a.trim())
            .sort()
            .join(",");
    }
    get sig() {
        const hash = crypto.createHash("md5");
        hash.update(this.BUILD_LIST);
        return hash.digest("hex");
    }
    get storeKey() {
        const platform = process.env.RUNNER_OS;
        const ct = this.NO_CONTRIB ? "-no-contrib" : "";
        const shr = this.DO_SHRINK ? "-lt" : "";
        return `opencv-${platform}-${this.branch}-${this.sig}${ct}${shr}`;
    }
    get openCVUrl() {
        return `https://github.com/opencv/opencv/archive/${this.branch}.zip`;
    }
    get openCVContribUrl() {
        return `https://github.com/opencv/opencv_contrib/archive/${this.branch}.zip`;
    }
    get cacheDir() {
        if (this.NO_CONTRIB)
            return ["opencv", "build"];
        return ["opencv", "opencv_contrib", "build"];
    }
}
exports.Configurations = Configurations;


/***/ }),

/***/ 3607:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
const fs = __webpack_require__(7147);
const core = __webpack_require__(2225);
const cache = __webpack_require__(1188);
const process = __webpack_require__(7282);
const Configurations_1 = __webpack_require__(1651);
const utils_1 = __webpack_require__(8593);
const exec = __webpack_require__(27);
const glob = __webpack_require__(9535);
const io = __webpack_require__(484);
async function getCode(config) {
    await (0, utils_1.downloadFile)(config.openCVUrl, "opencv.zip");
    await (0, utils_1.unzipFile)("opencv.zip", "opencv");
    // await exec.exec("git", [ "clone", "--quiet", "--branch", branch, "--single-branch", "--depth", "1", "https://github.com/opencv/opencv.git", "opencv" ]);
    if (!config.NO_CONTRIB) {
        await (0, utils_1.downloadFile)(config.openCVContribUrl, "opencv_contrib.zip");
        await (0, utils_1.unzipFile)("opencv_contrib.zip", "opencv_contrib");
        // await exec.exec("git", [ "clone", "--branch", branch, "--single-branch", "--depth", "1", "https://github.com/opencv/opencv_contrib.git", "opencv_contrib" ]);
    }
    fs.mkdirSync('build', { recursive: true });
    // await io.mkdirP("build");
    console.log(`Files in the current folder (${process.cwd()}): `, fs.readdirSync('.'));
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
    await exec.exec("cmake", cMakeArgs, { cwd: workdir });
    console.log("start cmake build");
    await exec.exec("cmake", ["--build", "."], { cwd: workdir });
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
        const globber = await glob.create(patterns.join('\n'));
        const files = await globber.glob();
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
        const config = new Configurations_1.Configurations(core.getInput("branch"), core.getInput("BUILD_LIST"), core.getInput("NO_CONTRIB"), core.getInput("DO_SHRINK"));
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
        console.log(`No cached value found for input keys: ${storeKey}, Building from sources`);
        await getCode(config);
    }
    catch (error) {
        console.error(error);
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}
console.log("Start Plugin core:");
run();


/***/ }),

/***/ 8593:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.formatFileSize = exports.downloadFile = exports.unzipFile = void 0;
const httpm = __webpack_require__(4635);
const fs = __webpack_require__(7147);
const path = __webpack_require__(1017);
const unzipper = __webpack_require__(984);
async function unzipFile(input, dest) {
    const key = `unzip ${input}`;
    console.time(key);
    await new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(input);
        const createdDirs = new Set();
        function createDirIfNotExists(dir) {
            if (!createdDirs.has(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                createdDirs.add(dir);
            }
        }
        // Pipe the read stream to the unzipper.Extract stream, which will extract the contents to the destination folder
        readStream
            .pipe(unzipper.Parse())
            .on('entry', (entry) => {
            const newPath = entry.path.split('/').slice(1).join('/');
            const targetPath = path.join(dest, newPath);
            if (targetPath) {
                if (entry.type === 'Directory') {
                    createDirIfNotExists(targetPath);
                    entry.autodrain();
                }
                else {
                    const parentDir = targetPath.substring(0, targetPath.lastIndexOf(path.sep));
                    createDirIfNotExists(parentDir);
                    entry.pipe(fs.createWriteStream(targetPath));
                }
            }
            else {
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
exports.unzipFile = unzipFile;
async function downloadFile(url, dest) {
    const fulldest = path.resolve(process.cwd(), dest);
    if (fs.existsSync(fulldest))
        return fulldest;
    const key = `Downloading ${url} to ${fulldest} `;
    console.time(key);
    const http = new httpm.HttpClient('Github actions client');
    const file = fs.createWriteStream(dest);
    await new Promise(resolve => {
        const req = http.get(url);
        req.then(({ message }) => {
            message.pipe(file).on('close', () => { resolve(undefined); });
        });
    });
    console.timeEnd(key);
    const stat = fs.statSync(dest);
    console.log(`${fulldest} Size: ${formatFileSize(stat.size)}`);
    return fulldest;
}
exports.downloadFile = downloadFile;
function formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    let i;
    for (i = 0; bytes >= 1024 && i < units.length - 1; i++) {
        bytes /= 1024;
    }
    return `${parseFloat(bytes.toFixed(2))} ${units[i]}`;
}
exports.formatFileSize = formatFileSize;


/***/ }),

/***/ 9491:
/***/ ((module) => {

module.exports = require("assert");

/***/ }),

/***/ 4300:
/***/ ((module) => {

module.exports = require("buffer");

/***/ }),

/***/ 2081:
/***/ ((module) => {

module.exports = require("child_process");

/***/ }),

/***/ 2057:
/***/ ((module) => {

module.exports = require("constants");

/***/ }),

/***/ 6113:
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ 2361:
/***/ ((module) => {

module.exports = require("events");

/***/ }),

/***/ 7147:
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ 3685:
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ 5687:
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ 1808:
/***/ ((module) => {

module.exports = require("net");

/***/ }),

/***/ 2037:
/***/ ((module) => {

module.exports = require("os");

/***/ }),

/***/ 1017:
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ 7282:
/***/ ((module) => {

module.exports = require("process");

/***/ }),

/***/ 5477:
/***/ ((module) => {

module.exports = require("punycode");

/***/ }),

/***/ 2781:
/***/ ((module) => {

module.exports = require("stream");

/***/ }),

/***/ 1576:
/***/ ((module) => {

module.exports = require("string_decoder");

/***/ }),

/***/ 9512:
/***/ ((module) => {

module.exports = require("timers");

/***/ }),

/***/ 4404:
/***/ ((module) => {

module.exports = require("tls");

/***/ }),

/***/ 7310:
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ 3837:
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ 9796:
/***/ ((module) => {

module.exports = require("zlib");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/******/ 	// the startup function
/******/ 	__webpack_require__.x = () => {
/******/ 		// Load entry module and return exports
/******/ 		// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 		var __webpack_exports__ = __webpack_require__.O(undefined, [216], () => (__webpack_require__(3607)))
/******/ 		__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 		return __webpack_exports__;
/******/ 	};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks and sibling chunks for the entrypoint
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + "vendors" + ".bundle.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/node module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.nmd = (module) => {
/******/ 			module.paths = [];
/******/ 			if (!module.children) module.children = [];
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/require chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "loaded", otherwise not loaded yet
/******/ 		var installedChunks = {
/******/ 			179: 1
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.O.require = (chunkId) => (installedChunks[chunkId]);
/******/ 		
/******/ 		var installChunk = (chunk) => {
/******/ 			var moreModules = chunk.modules, chunkIds = chunk.ids, runtime = chunk.runtime;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			for(var i = 0; i < chunkIds.length; i++)
/******/ 				installedChunks[chunkIds[i]] = 1;
/******/ 			__webpack_require__.O();
/******/ 		};
/******/ 		
/******/ 		// require() chunk loading for javascript
/******/ 		__webpack_require__.f.require = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					installChunk(require("./" + __webpack_require__.u(chunkId)));
/******/ 				} else installedChunks[chunkId] = 1;
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		// no external install chunk
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/startup chunk dependencies */
/******/ 	(() => {
/******/ 		var next = __webpack_require__.x;
/******/ 		__webpack_require__.x = () => {
/******/ 			__webpack_require__.e(216);
/******/ 			return next();
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// run startup
/******/ 	var __webpack_exports__ = __webpack_require__.x();
/******/ 	
/******/ })()
;