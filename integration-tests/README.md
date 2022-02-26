# Realm JS integration tests

## Prerequisites

Before installing the integration test package, ensure that you've installed the root package dependencies (`cd .. && npm install`) and built the native module for the environments in which you intent to run tests.

Building the native module for Node.js in debug mode:

```bash
npm run build
```

Building the native module (xcframework) for the iOS simulator in debug mode:

```bash
./scripts/build-ios.sh -c Debug simulator
```

Building the native module (.so) for the Android simulator in debug mode:

```bash
node scripts/build-android.js --arch=x86 --build-type=Debug
```

## Installing the integration tests and environments

This repository is an NPM workspaces mono-repository, meaning that individual packages are installed and interdependent packages are automatically linked. To install and link packages, simply run NPM's install command from the root of the repository:

```bash
npm install
```

It's advised to have two terminals open, one occasionally running `npm run build-changes` (from the project root directory) when changes are made to the C++ source-code of Realm JS and another running `npm start` (from the `./tests` directory) to continuously run the integration tests when code change.
The tests will re-run when the test suite changes and it has Realm JS installed as a symbolic link and will therefore run the latest Realm JS javascript code when the tests run. To reload the native module, you will however need to kill and restart the process running in the second terminal.

## Running the tests across all environments

With this directory (`./integration-tests`) as working directory, run:

```
npm test
```

### Running the tests during development

For rapid iteration on the test suite, use the "start" script to run mocha in "watch" mode. With this directory (`./integration-tests`) as working directory, run:

```bash
npm start
```

When fixing a single failing test, it's beneficial to use the [`--grep`](https://mochajs.org/#-g---grep-pattern) runtime flag (which takes a regular expression matched against test titles) to select specific tests to run:

```bash
npm start -- --grep "Realm#constructor"
```

It's advised to use two open terminals:
* One running `npm start --prefix tests` (from the `integration-tests` directory) to continuously run the integration tests when code change.
* Another occasionally running `npm run build` (from the project root directory) when changes are made to the C++ source-code of Realm JS

The tests will re-run when the test suite changes and it has Realm JS installed as a symbolic link and will therefore run the latest Realm JS javascript code when the tests run. To reload the native module, you will however need to kill and restart the process running in the second terminal.

### Setting context

The test suite expects "context" variables to determine what tests to skip, based on platform etc.

This is controlled via an environment variable:
- `CONTEXT` when running from the `./tests` directory.
- `MOCHA_REMOTE_CONTEXT` when running from a `./environments/*` directory.

To set context variables, simply set the environment variable (seperate multiple values with comma `,` and keys from values with equal-sign `=`). You can skip the `=` and value to indicate a `true` boolean value. As an example: To set the value `key1` to `value1` and `key2` to `true`, run with the context environment variable set to `key1=value1,key2`.

Examples of context variables used:
- `missingServer`: Skip tests that require a running BaaS server.
- `performance`: Disabled skipping of the "Performance tests" suite.
- `integration=false`: Skip the integration test (which performance tests are not considered a part of).
- `preserveAppAfterRun`: Skip deleting the Realm app after the test run
- `syncLogLevel=all`: Set the sync client log level to help debugging sync client issues.
- `realmBaseUrl=https://localhost:9090`: Set the base URL used when connecting the the server.
- `mongodbClusterName=Cluster0`: Set the name of the cluster, used when setting up the "mongodb-atlas" service on imported apps.
- The "react-native" environment looks for additional context variables (use the `./environment/react-native` NPM scripts to control this):
  - `mode=native`: Run the tests natively (default)
  - `mode=chrome-debugging`: Run tests using the legacy chrome-debugger.

As an example, to iterate on the performence tests, run the `./tests` (on Node.js) skipping tests that require a server as well as the integration tests and enable performance tests:

```bash
CONTEXT=missingServer,integration=false,performance npm start --prefix ./tests
```

### Running tests in a specific environment

When debugging an error happening only on a specific environment, it's useful to run the tests only for that. Each environment package has a couple of test related NPM scripts. Consult their individual README.md files for instructions on using them.

## Running tests with a C++ debugger attached

In order to debug the tests with `lldb` attached to debug C++, you can use the VS Code launch configuration `LLDB Debug Integration Tests`.

This bypasses the usual startup script (as this spawns a child process for the tests, which stops `lldb` working), so you need to have the app importer running separately when doing this: `npm run app-importer` from the `integration-tests/tests` directory.

---

## Maintaining the tests

This directory of the repository contains three sub-directories:
- [./tests](./tests): A suite of tests which are supposed to pass in all defined environments.
- [./environments](./environments): A number of environments in which the tests are supposed pass:
  - [Node.js](./environments/node/README.md)
  - [React Native](./environments/react-native/README.md)
  - [Electron](./environments/electron/README.md)
- [./realm-apps](./realm-apps): A directory of importable app configurations made available to the tests.

### How to write tests

Because of limitations (see below), we need to explicitly require in the files defining the tests: To write a new test, simply add it in the relevant file in `test/src/tests/` or create a new file and make sure to require that from `test/src/index.ts`.

Tests will have access to the following globals:

- [the Mocha hook globals](https://mochajs.org/#hooks) (describe, it, after, before, etc.).
- `fs` the lowest common denominator of the [`fs-extra`](https://www.npmjs.com/package/fs-extra) and [`react-native-fs`](https://www.npmjs.com/package/react-native-fs) APIs.
- `path` the lowest common denominator of the Node.js path interface and a [node-independent implementation of Node's path](https://www.npmjs.com/package/path-browserify) module.
- `it.skipIf` and `describe.skipIf` skips tests based on the environment, see `tests/src/utils/skip-if.js` for a detailed explanation.

Remember to close or clean up Realms accessed during tests.
The `Realm.clearTestState` can be called after each test, which closes and removes all Realm files in the default directory.

### Current limitations

These tests have been designed for increased developer experience and productivity over completeness. Which means that the environments are not consuming the Realm JS package exactly like an end user would, but we gain the ability watch and rerun tests as files change on the filesystem.

- We need to move or rewrite more tests from `../tests/js` into the `./tests` directory.
- All environments are not getting tested on all their available platforms on CI:
  - Electron is not running tests on Windows nor MacOS - and the tests running on Linux is running an intermediary version of the app, before it gets packaged, which might produce false negative results.
  - React Native tests are not running in React Native "release" mode.
- Because React Native bundles its JavaScript source files into a single bundle, using the Metro bundler, we need to be explicit in the files we include in the test-suite. I.e. we cannot call the require function with a expression which value will only be known at runtime, such as iterating over a list of files, would be. Therefore `tests/src/index.ts` must require all individual files in which our tests are defined: We cannot simply ask for all `*/**.tests.js` files to be included.
