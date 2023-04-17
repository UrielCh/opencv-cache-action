import crypto from "crypto";

export class Configurations {
    constructor( public branch: string,
      public BUILD_LIST: string,
      public NO_CONTRIB: string,
    ) {}
    normalize() {
      this.BUILD_LIST = this.BUILD_LIST
      .split(",")
      .filter((a) =>a.trim() )
      .sort()
      .join(",");
    }

    get sig(): string {
        const hash = crypto.createHash("md5");
        hash.update(this.BUILD_LIST);
        return hash.digest("hex");
    }

    get storeKey(): string{
        const platform = process.env.RUNNER_OS;
        return `opencv-${platform}-${this.branch}-${this.sig}${this.NO_CONTRIB ? "-no-contrib" : ""}`;
    }

    get openCVUrl(): string {
        return `https://github.com/opencv/opencv/archive/${this.branch}.zip`;
    }

    get openCVContribUrl(): string {
        return `https://github.com/opencv/opencv_contrib/archive/${this.branch}.zip`;
    }

}
  
  