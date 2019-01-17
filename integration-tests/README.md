# Realm JS integration tests

This directory of the repository is contains two sub-directories:
- `test`: A suite of tests which are supposed to pass in all defined environments.
- `environments`: A couple of environments in which the tests are supposed pass.

## How to run the tests

First install the root project at `..`:

    cd ..
    npm install

Change directory back to the integration tests

    cd integration-tests

Install all the environments, run npm install command in this directory:

    npm install

This will iterate all the available environments and run their install scripts, specifically:

- Each of the environments will install the `realm` packages as a symbolic link pointing back to the root project
  folder and building it's native module from source, which allows for rapid iteration when fixing a bug.
- The Electron environment will rebuild realm-js's native module for the Electron runtime.
- The React Native environment will run `./gradlew publishAndroid` to publish the Android native module as part of its
  postinstall script.

Then run all the tests in sequence by running the npm test command, also from within this directory:

    npm test

## How to write tests

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
