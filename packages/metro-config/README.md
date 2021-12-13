# Realm Metro Config

## How it works

Metro bundler does not support symlinks (see https://github.com/facebook/metro/issues/1).
In order to link to our local version of Realm JS in a way which Metro can follow, we need to instead add the module to `resolver.blockList`, and then in `resolver.extraNodeModules`, override the locations for any symlinked modules by specifying a mapping from their name to their actual location on disk.

In order to achieve this, we recursively check if each file/directory in `node_modules` is a symlink or not. If it is, and if it is specified in our main `package.json` (i.e. it is a direct dependency of our app), we add it to the `blockList` and add a mapping for it. We also add it to the list of watched folders, so that any changes to it are picked up by hot reloading.
