# Realm JS integration tests

This directory of the repository is contains two sub-directories:
- `test`: A suite of tests which are supposed to pass in all defined environments.
- `environments`: A couple of environments in which the tests are supposed pass:
  - [Node.js](./environments/node/README.md)
  - [React Native](./environments/react-native/README.md)
  - [Electron](./environments/electron/README.md)

## Using the integration tests

First install the root project at `..` and change directory back to the integration tests.

    cd ..
    npm install
    cd integration-tests

### Installing the environments

Install all the environments by installing the package in this directory:

    npm install

This will package Realm JS, into `integration-tests/realm-*.tgz` making it ready for consumption by the environments:

- Each environment installs the `realm` packages from the packaged version to simulate a realistic install.
- The Electron environment will rebuild realm-js's native module for the Electron runtime.

### Running the tests

Start up both an Android and iOS emulator before running the React Native tests.

To run all the tests in parallel:

    npm test

To run the tests for individual environments, change directory into the environment and run `npm test`, ex.

    cd environment/node
    npm test

### How to write tests

Because React Native bundles it's JavaScript source files into a single bundle, using the Metro bundler, we need to be
explicit in the files we include in the test-suite. I.e. we cannot call the require function with a variable that is
only known at runtime, such as iterating over a list of files, would be. Therefore `tests/src/index.js` must require all
individual files in which our tests are defined: We cannot simply ask for all */**.tests.js files to be included.

To write a new test, simply add it in the relevant file in `test/src/` or create a new file and make sure to require
that from `test/src/index.js`.

## Current limitations

This is still very much a work in progress, currently we're missing:
1. Refactoring / rewriting of the tests in `../tests/js` into the `./tests` folder that uses Mocha in a more direct way.
2. When installing the `react-native` environment, the `node_modules/realm/android` is missing.
