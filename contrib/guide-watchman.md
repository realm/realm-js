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

In the example above we're setting up a project-wide watch of our Realm JS repository and registering a subscription on all files exported by the Realm JS `package.json` which will execute an "rsync" command to ultimately, incrementally (not a full copy every time) synchronize changes made our Realm JS repository into the app's `node_modules/realm` directory.

When you the process is interrupted (<kbd>Ctrl</kbd>+<kbd>C</kbd>) the subscription is removed and the files are no longer being copied.

## The order of execution is important

In order for the CocoaPods to generate the right XCode project files, you'll need to run the watcher after `npm install` in the application but *before* running `pod install` in the `/ios` directory. If you mess this up, you'll have to re-run `pod install` after starting the `watch-from-dependency.js` script.

## Removing the project watch completely

After exiting the script, a project watch on the Realm JS project will still exist.
It won't be performing any operations on file change, so it's not a huge waste of resources, but if you see a need for it you might want to completely remove the watch on the project.

Simply run this in the root of this repository:

```
watchman watch-del .
```
