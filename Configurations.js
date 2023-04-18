const crypto = require("crypto");

class Configurations {
  /**
   * @param {string} branch
   * @param {string} BUILD_LIST
   * @param {string} NO_CONTRIB
   */
  constructor(branch, BUILD_LIST, NO_CONTRIB) {
    this.branch = branch || "4.6.0";
    this.BUILD_LIST = BUILD_LIST || "core,imgproc,imgcodecs,videoio,highgui,video,calib3d,features2d,objdetect,dnn,ml,photo,gapi,python3,python_bindings_generator";
    this.NO_CONTRIB = NO_CONTRIB || "";
    this.normalize();
  }

  normalize() {
    this.BUILD_LIST = this.BUILD_LIST
      .split(",")
      .filter((a) => a.trim())
      .sort()
      .join(",");
  }

  /**
   * @returns {string} md5 hash
   */
  get sig() {
    const hash = crypto.createHash("md5");
    hash.update(this.BUILD_LIST);
    return hash.digest("hex");
  }

  /**
   * @returns {string} cache key
   */
  get storeKey() {
    const platform = process.env.RUNNER_OS;
    return `opencv-${platform}-${this.branch}-${this.sig}${
      this.NO_CONTRIB ? "-no-contrib" : ""
    }`;
  }

  /**
   * @returns {string} opencv url
   */
  get openCVUrl() {
    return `https://github.com/opencv/opencv/archive/${this.branch}.zip`;
  }

  /**
   * @returns {string} opencv_contrib url
   */
  get openCVContribUrl() {
    return `https://github.com/opencv/opencv_contrib/archive/${this.branch}.zip`;
  }

  /**
   * @returns {string[]} cache paths
   */
  get cacheDir() {
    if (this.NO_CONTRIB) {
      return ["opencv", "build"];
    }
    return ["opencv", "opencv_contrib", "build"];
  }
}

module.exports = Configurations;
