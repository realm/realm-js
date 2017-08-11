# Realm JS tests running in an Electron enviroment

Currently this directory consists of:
- An electron app in `tests/electron/app` which has
  - `jasmine.js` that imports the jasmin lib, setup a console logger and exports an execute function.
  - `main.js` which starts a hidden `BrowserWindow` and either runs the tests itself (see --main flag below) or lets
    the render process do the heavy lifting.
  - `renderer.js` detects if it's supposed to run the tests and does that using the `jasmine.js`.
- `spec.js` in which imports and executes the tests exported by `tests/js/index.js`.
- A `test/electron/runner.js` script, which uses [spectron](https://www.npmjs.com/package/spectron) to start the Electron app and read out the console from the Electron process, and console logging it.

## Flags

To use these flags, you need to prepend them when calling `npm test` after the `--`, which indicates that the flag is
not ment for npm.

### Process

You can specify in which Electron process to run the tests:
- `--process=main` for the main process or
- `--process=render` the render process (which is default)

As an example, this runs all tests in the main process:

    npm test -- --process=main

### Filter

If you want to run only a subset of the tests, use the `--filter` flag, ex:

As an example, this runs only the suite named "UserTests":

    npm test -- --filter=UserTests

## Failing tests

These tests are failing at the moment:
- SessionTests (because REALM_MODULE_PATH is missing, due to `tests/spec/helpers` not loading correctly.
- AsyncTests (because of the same reason as SessionTests)
- GarbageCollectionTests (due to a bug that I'll be reporting soon)
