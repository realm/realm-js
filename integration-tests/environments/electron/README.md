# Realm JS tests running in an Electron enviroment

Currently this directory consists of:
- An electron app in `app` which has
  - `main.js` which starts a hidden `BrowserWindow` and either runs the tests itself (see --main flag below) or lets
    the render process do the heavy lifting.
  - `index.html` which requires `renderer.js`.
  - `renderer.js` detects if it's supposed to run the tests and runs them.
- A `runner.js` script, which uses [spectron](https://www.npmjs.com/package/spectron) to start the Electron app and read out the console from the Electron process, and console logging it.

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
