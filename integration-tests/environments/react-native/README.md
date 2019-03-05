# Realm JS tests running in an React Native environment

Currently this directory consists of:
- A React-Native app with `android`, `ios` folders and `src` where:
  - `App.js` a simple component which creates a mocha remote client and displays progress.
  - `index.js` re-exports the `App` component.
- A test harness in `harness`, where:
  - `android-cli.js` wraps the Android specific `adb` and `emulator` CLIs.
  - `react-native-cli.js` wraps the `react-native` CLI.
  - `runner.js` starts a mocha remote server, the metro bundler and starts the app (using `react-native run-android` or `react-native run-android`)

```bash
npm install
```

## Running the tests

To run tests on Android, start an emulator and run:

    npm run test/android

To run tests on iOS:

    npm run test/ios

To run tests in both processes in sequence, start an Android emulator and run:

    npm test
