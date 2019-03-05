# Realm JS integration tests

This directory of the repository contains two sub-directories:
- [./tests](./tests): A suite of tests which are supposed to pass in all defined environments.
- [./environments](./environments): A number of environments in which the tests are supposed pass:
  - [Node.js](./environments/node/README.md)
  - [React Native](./environments/react-native/README.md)
  - [Electron](./environments/electron/README.md)

## Using the integration tests

Before installing the integration test package, ensure that you've installed the Realm JS package:

```bash
cd ..
npm install
```

All following commands assume that you've changed directory into the `./integration-tests` directory first.

### Installing the integration tests

The individual environments can be installed and run independently (see "Installing an environment on CI").
For convenience to developers, this directory contains a package that will produce a packaged version of Realm JS and install all environments:

```bash
npm install
```

This will first produce a `.tgz` package of the Realm JS library after which the development dependencies of the test suite and each of the environments will be installed. The Electron environment will automatically rebuild Realm's native module for the Electron runtime.

The environments consume Realm and the test suite as packaged `.tgz` files to resemble a more life-like scenario and to prevent symbolic linking, which can mess with the environments build tools as well as the `package-lock.json`s.

### Running the tests while developing

For rapid iteration on the test suite, use the "start" script to start mocha in `--watch` mode

```bash
npm start
```

When fixing a single failing test, it's beneficial to use mochas [`--grep`](https://mochajs.org/#-g---grep-pattern) runtime flag (which takes a regular expression matched against test titles) to select specific tests to run:

```bash
npm start -- --grep "Realm#constructor"
```

It's adviced to have two terminals open, one occationally running `npm run build-changes` when changes are made to the C++ source-code of Realm JS and another running `npm start` to continiously run the integration tests when code change.
The tests will re-run when the test suite changes and it has Realm JS installed as a symbolic link and will therefore run the latest Realm JS javascript code when the tests run. To reload the native module, you will however need to kill and restart the process running in the second terminal.

### Running the tests in all or specific environments

Start up both an Android and iOS emulator before running the React Native tests.

To run all the tests in parallel:

```bash
npm test
```

To run the tests for individual environments, change directory into the environment and run `npm test`, ex.

```bash
cd environment/node
npm test
```

If you're iterating on the tests to solve an issue which shows itself in a particular environment, the workflow could be:
1. Rebuild the Realm JS native module (if you're making changes to the C++ code), by running `npm run build-changes` in the project root.
2. Produce a packaged version of Realm JS, by running `npm run realm/pack` in the `./integration-tests` directory.
3. Re-install the packaged version of Realm JS, by running `npm install` in the environments directory. This will install Realm JS from the packaged version you've just created.

### How to write tests

Because of limitiations (see below), we need to explicit require in the files which defines the individual tests: To write a new test, simply add it in the relevant file in `test/src/` or create a new file and make sure to require that from `test/src/index.ts`.

Tests will have access to the following globals:

- [the Mocha hook globals](https://mochajs.org/#hooks) (define, it, after, before, etc.).
- `Realm` the Realm constructor.
- An `UndocumentedRealm` which extends the `Realm` constructor with some methods which are not documented or considered a part of the public Realm JS API.
- `fs` the lowest common denominator of the [`fs-extra`](https://www.npmjs.com/package/fs-extra) and [`react-native-fs`](https://www.npmjs.com/package/react-native-fs) APIs.
- `path` the lowest common denominator of the Node.js path interface and a [node-independent implementation of Node's path](https://www.npmjs.com/package/path-browserify) module.
- `it.skipIf` skips tests based on the environment, see `tests/src/utils/skip-if.js` for a detailed explanation.

There is no need to close or clean up Realms accessed during tests, as the `Realm.clearTestState` is called after each test, which closes and removes all Realm files in the default directory.

After writing tests, run the `npm run lint` command to check that the code complies with the code style that we've chosen for the integration tests.

## Installing an environment on CI

When installing on CI we don't want to install all environments for every executing environment, therefore the environments support installing individually too.

To install an environment on CI we simply ensure that a `realm-*.tgz` package is available in the `integration-tests` directory, either by unstashing a previously build package or package it again, running:

```bash
# Build the Android module
cd react-native/android && ./gradlew publishAndroid && cd -
# Archive the package
cd integration-tests
npm pack ..
```

To install the environment, simply change directory and install:

```bash
# Install the React Native environment
cd environments/react-native
npm install
```

## Current limitations

### We need to move or rewrite more tests

This is still very much a work in progress, currently we're missing:
1. Refactoring / rewriting of the tests in `../tests/js` into the `./tests` folder that uses Mocha in a more direct way.
2. When installing the `react-native` environment, the `node_modules/realm/android` is missing.

### Operating systems and environments

In it's current setup, all environments are not getting tested on all their available platforms:
- Node.js is not running tests on Windows.
- Electron is not running tests on Windows nor MacOS - and the tests running on Linux is running an intermediary version of the app, before it gets packaged, which is not ideal.
- React Native is not running tests in it's debug mode, which we have historically had issues with.

There should be no reason that it couldn't or shouldn't do that, except time spent setting it up (and maintaining it).

### No symbolic links in `./tests` nor `./environments/react-native`

Because React Native's packager (Metro) [does not support symbolic links](https://github.com/facebook/metro/issues/1), we need to install Realm JS and the shared test suite from archives. Fortunately this provides a more realistic test, with the downside of making it more difficult to iterate: You need to re-install the environments after each change to the integration test-suite.

### Don't call `require` with an expression in `./tests` nor `./environments/react-native`

Because React Native bundles its JavaScript source files into a single bundle, using the Metro bundler, we need to be explicit in the files we include in the test-suite. I.e. we cannot call the require function with a expression which value will only be known at runtime, such as iterating over a list of files, would be. Therefore `tests/src/index.js` must require all individual files in which our tests are defined: We cannot simply ask for all */**.tests.js files to be included.
