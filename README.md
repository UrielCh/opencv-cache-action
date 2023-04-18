# opencv-cache-action
This GitHub Action, UrielCh/opencv-cache-action@V0, is designed to download, build, and cache OpenCV, significantly improving the speed of your GitHub Actions workflows. Building OpenCV from source usually takes about an hour, but with this action, the process is reduced to just a few seconds.

## Usage
To use this action in your GitHub Actions workflow, simply add the following step:

```yaml

steps:
  - name: Cache OpenCV
    uses: UrielCh/opencv-cache-action@V0
    with:
      branch: 4.x
      BUILD_LIST: core
      NO_CONTRIB: ''
```

## Configuration
The action has several input parameters to customize the OpenCV build process:

### Inputs

> branch
* Description: Branch to checkout (default is `"4.x"`).
* Required: true
* Default: `"4.x"`

> BUILD_LIST
* Description: List of features to compile. The fewer features you select, the smaller the image will be.
* Required: true
* Default: `"core"`

> NO_CONTRIB
* Description: Disable OpenCV contrib.
* Default: `""`



## Output Directories
The opencv-cache-action creates three directories one level above your checked-out code:

1. `opencv`: Contains the OpenCV source files.
1. `opencv_contrib`: Contains the OpenCV contrib source files. This directory will not be present if the `NO_CONTRIB` input is set.
1. `build`: Contains the compiled OpenCV libraries.

These directories are created to provide you with access to the OpenCV source code and the compiled libraries, making it easier for you to integrate OpenCV into your projects without the need to build it from source in each workflow run.

Here is the directory structure created by the action:

```
your_workflow_root/
├─ opencv/
│  ├─ ...
├─ opencv_contrib/
│  ├─ ...
├─ build/
│  ├─ ...
└─ your_repository_contents/
   ├─ ...
```

You can use the contents of the `build` directory in your subsequent steps, which will have the compiled OpenCV libraries ready to use, greatly reducing the time required for your workflows.

## Example Workflow

Here's an example of a complete GitHub Actions workflow that utilizes the `opencv-cache-action`:

```yaml
name: Build and Cache OpenCV

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout Repository
      uses: actions/checkout@v2

    - name: Cache OpenCV
      uses: UrielCh/opencv-cache-action@V0
      with:
        branch: 4.x
        BUILD_LIST: core
        NO_CONTRIB: ''

    # Your additional steps using the cached OpenCV build...
```

By integrating this action into your GitHub Actions workflows, you can save a significant amount of time that would otherwise be spent building OpenCV from source.