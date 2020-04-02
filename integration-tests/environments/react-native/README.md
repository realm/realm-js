# Realm JS tests running in an React Native environment

Currently this directory consists of:
- A React-Native app with `android`, `ios` folders and `src` where:
  - `App.js` a simple component which creates a mocha remote client and displays progress.
  - `index.js` re-exports the `App` component.
- A test harness in `harness`, where:
  - `android-cli.js` wraps the Android specific `adb` and `emulator` CLIs.
  - `react-native-cli.js` wraps the `react-native` CLI.
  - `runner.js` starts a mocha remote server, the metro bundler and starts the app (using `react-native run-android` or `react-native run-android`)

To install this environment, simply run:

```bash
npm install
```

Before building for iOS ensure you've run `pod install` in the `./ios` directory

```bash
cd ios
pod install
```

To avoid integrity checks failing when NPM compares the SHA of the `realm` and `realm-integration-tests` archives with SHA in the package-lock.json we `npm install` the archives on `preinstall`.

## Running the tests

To run tests on Android, start an emulator and run:

    npm run test/android

To run tests on iOS:

    npm run test/ios

To run tests in both processes in sequence, start an Android emulator and run:

    npm test

## Running the tests in "watch mode"

When making rapid iterations on the tests or Realm JS, its important to shorten the latency from change to feedback.

To run the tests in watch mode, prepend the `--watch` runtime option when starting the tests:

On Android

    npm run test/android -- --watch

On iOS

    npm run test/ios -- --watch

This will keep the harness, metro server and mocha-remote servers running and connected to the device. When hot reloading (from an update to Realm JS, the tests or the app itself) the app will re-connect and rerun the tests.

While in watch mode, you can rebuild, repackage and reinstall the tests by running

    npm run update-tests

Because of https://github.com/facebook/metro/issues/1 we need this extra repackaging step.
