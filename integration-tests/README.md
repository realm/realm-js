# Realm JS integration tests

This directory of the repository is contains two sub-directories:
- [./tests](./tests): A suite of tests which are supposed to pass in all defined environments.
- [./environments](./environments): A couple of environments in which the tests are supposed pass:
  - [Node.js](./environments/node/README.md)
  - [React Native](./environments/react-native/README.md)
  - [Electron](./environments/electron/README.md)

## Using the integration tests

Before installing the integration test package, ensure that you've installed the Realm JS package:

```bash
cd ..
npm install
cd integration-tests
```

### Installing the integration test "meta-package"

For convenience a single install script is provided in this directory:

```bash
npm install
```

This will first produce a .tgz package of the Realm JS library after which the development dependencies of the test
suite and each of the environments will be installed. The Electron environment will rebuild realm's native module
for the Electron runtime.

The environments consume Realm and the test suite as packaged .tgz files to resemble a more life-like scenario and
to prevent symbolic linking, which can mess with the environments build tools as well as the `package-lock.json`s.

### Installing an environment on CI

When installing on CI we don't want to install all environments for every executing environment, therefore the
environments support installing individually too.

To install an environment on CI we simply ensure that a `realm-*.tgz` package is available in the `integration-tests`
directory, change directory to the particular environment and install the package

```bash
# Ensure a packaged archive
cd integration-tests
REALM_BUILD_ANDROID=1 npm pack ..
# Install the React Native environment
cd environments/react-native
npm install
```

### Running the tests

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

### How to write tests

Because of limitiations (see below), we need to explicit require in the files which defines the individual tests: To
write a new test, simply add it in the relevant file in `test/src/` or create a new file and make sure to require
that from `test/src/index.js`.

For rapid iteration on the test suite, use the "start" script to start mocha in `--watch` mode

```bash
npm start
```

Tests will have access to the following globals:

- [the Mocha hook globals](https://mochajs.org/#hooks) (define, it, after, before, etc.).
- `Realm` the Realm constructor.
- `fs` the lowest common denominator of the [`fs-extra`](https://www.npmjs.com/package/fs-extra) and
  [`react-native-fs`](https://www.npmjs.com/package/react-native-fs) APIs.
- `path` the lowest common denominator of the Node.js path interface and a
  [node-independent implementation of Node's path](https://www.npmjs.com/package/path-browserify) module.
- `it.environment` lets us skip tests in specific environments.

There is no need to clean up Realms accessed during tests, as the `Realm.clearTestState` is called after each test,
which removes all Realm files in the default directory.

After writing tests, run the `npm run lint` command to check that the code complies with the code style that we've
chosen for the integration tests.

## Current limitations

### We need to move or rewrite more tests

This is still very much a work in progress, currently we're missing:
1. Refactoring / rewriting of the tests in `../tests/js` into the `./tests` folder that uses Mocha in a more direct way.
2. When installing the `react-native` environment, the `node_modules/realm/android` is missing.

### Operating systems

In its current state the integration tests are note setup to run with Node.js nor Electron on Windows:
There should be no reason that it couldn't or shouldn't do that, except time spent setting it up (and maintaining it).

### No symbolic links in `./tests` nor `./environments/react-native`

Because React Native's packager (Metro) [does not support symbolic links](https://github.com/facebook/metro/issues/1),
we need to install Realm JS and the shared test suite from archives. Fortunately this provides a more realistic test,
with the downside of making it more difficult to iterate: You need to re-install the environments after each change to
the integration test-suite.

### Don't call `require` with an expression in `./tests` nor `./environments/react-native`

Because React Native bundles its JavaScript source files into a single bundle, using the Metro bundler, we need to be
explicit in the files we include in the test-suite. I.e. we cannot call the require function with a expression which
value will only be known at runtime, such as iterating over a list of files, would be. Therefore `tests/src/index.js`
must require all individual files in which our tests are defined: We cannot simply ask for all */**.tests.js files to
be included.
