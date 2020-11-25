# Guide: Setting up watchman to copy changes from this package to an app

You're debugging an issue reproduced in a React Native app, which uses Realm JS. You want to interate fast, such that a change in the Realm JS source code gets reflected in the library used in the app, as fast as possible.

## Prerequisites

You'll need "watchman" and "rsync" installed on your system.

## Why is this even needed

1. React Native's Metro bundler has the long standing issue that it's not following symbolic links: https://github.com/facebook/metro/issues/1.
2. The CocoaPod "`pod install`" command won't consider source files that are symbolically linked into the project, when generating XCode projects for a development pod.

For these reasons we cannot rely on a simple `npm link` but have to copy files from Realm JS to the app's `node_modules/realm` directory as we iterate on our code.

## The `watch-from-dependency` script

The script is located in `scripts/watch-from-dependency.js` (relative to the root of this repository) and it takes a single runtime option `-p` the path of the React Native application package that depends on the `realm` package.

```
./scripts/watch-from-dependency.js -p ~/Projects/my-awesome-app
```

In the example above we're setting up a project-wide watch of our Realm JS repository and registering triggers on relevant directories (`/src`, `/lib` and `/react-native` at the time of writing) which will execute an "rsync" command to ultimately, incrementally (not a full copy every time) synchronize changes made our Realm JS repository into the app's `node_modules/realm` directory.

## Stop watching

To stop watching, simply delete the watch from watchman (from the realm-js project root directory)

```
watchman watch-del .
```
