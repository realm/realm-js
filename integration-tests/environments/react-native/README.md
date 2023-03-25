# Realm JS tests running in an React Native environment

Currently this directory consists of:
- A React-Native app with `android`, `ios` folders and `src` where:
  - `App.js` a simple component which creates a mocha remote client and displays progress.
  - `index.js` re-exports the `App` component.
- A test harness in `harness`, where:
  - `runner.js` starts the metro bundler, starts the app (using `react-native run-android` or `react-native run-ios`) and optionally prints output from logcat (while running an Android application).
  - `android-cli.js` wraps the Android specific `adb` and `emulator` CLIs.
  - `react-native-cli.js` wraps the `react-native` CLI.
  - `xcode-cli.js` wraps the `react-native` CLI.
  - `puppeteer-log.js` implements a handler for logs used when running Chrome debugging headlessly.
- A `metro.config.js` which can resolve the symbolic links produced by Lerna.

To install this environment, run the following command from the root directory of repository:

```bash
npx lerna bootstrap --scope @realm/react-native-tests --include-dependencies
```

For iOS environments run 

```bash
cd ios
bundle install
bundle exec pod install
```

within the `integration-tests/environments/react-native` directory.

## Running the tests

To run tests on Android, start an emulator and run:

```bash
npm run test:android
```

To run tests on iOS:

```bash
npm run test:ios
```

To run tests in both processes in sequence, start an Android emulator and run:

```bash
npm test
```

## Running the tests in "watch mode"

When making rapid iterations on the tests or Realm JS, its important to shorten the latency from change to feedback.

To run the tests in watch mode, use the `watch:*` scripts:

On Android

```bash
npm run watch:android
```

On iOS

```bash
npm run watch:ios
```

This will keep the harness, metro server and mocha-remote servers running and connected to the device. When hot reloading (from an update to Realm JS, the tests or the app itself) the app will re-connect and rerun the tests.

## Running the tests via Xcode

Open the Xcode workspace

```bash
xed ios
```

As example: The following command will run the harness for tests with "Class models" in their title and skip tests that require a server, without starting the app in the simulator.

```
SKIP_RUNNER=true MOCHA_REMOTE_GREP="Class models" MOCHA_REMOTE_CONTEXT=missingServer npm run watch:ios
```

See the use of environment variables in the section below.

Now, simply run the app from Xcode.

## Environment variables

See the general documentation for [environment variables passed to Mocha Remote](../../README.md#setting-context).

- `SKIP_RUNNER=true` Instructs the harness to skip starting the app. This is useful when debugging the integration test app started via Xcode.

## Weird configurations

In an attempt to lower the time from change to the Realm JS source-code or the integration test suite, to a test being run, this React Native app has a couple of weird configurations.

Because we're not listing `realm` as a `dependency` of our `package.json` we can't rely on React Native auto-linking.
This gives us an opportunity to manually link to the root project, removing the need to reinstall the `realm` package or link build artifacts into the `node_modules/realm` directory.

### Metro bundler configuration

- Watch the Realm library and the integration test suite packages.
- Block any loading of packages from `node_modules` in the two packages.

### Android configuration

We've declared the project to the [settings.gradle](./android/settings.gradle):

```gradle
// [...]
// Manually linking the Realm package to the root project
include ':realm'
project(':realm').projectDir = new File(settingsDir, '../../../../react-native/android')
```

We're loading the project manually in the App's [build.gradle](./android/app/build.gradle):

```gradle
dependencies {
    // [...]
    implementation project(":realm")
    // [...]
}
```

We're manually loading the Realm package into the [MainApplication.java](./android/app/src/main/java/com/realmreactnativetests/MainApplication.java):

```java
// [...]
import io.realm.react.RealmReactPackage;

public class MainApplication extends Application implements ReactApplication {
  // [...]
  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    // [...]
    protected List<ReactPackage> getPackages() {
      // [...]
      packages.add(new RealmReactPackage());
      // [...]
    }
  }
}
```

### iOS Configuration

We're manually linking from the [Podfile](./ios/Podfile):

```ruby
# [...]
target 'RealmReactNativeTests' do
  # [...]
  pod 'RealmJS', :path => '../../../..'
  # [...]
end
```

### Automating setting app to run in debugging mode

Running in chrome debugging vs native mode can be switched manually in the app or alternatively via a Mocha Remote context parameter.
The package defines a couple of scripts for convenience:

```
npm run test:ios:chrome
npm run test:android:chrome
npm run watch:ios:chrome
npm run watch:android:chrome
```

### Upgrading the React Native version

In an attempt to keep the React Native environment updated, this is a small guide that can be followed to upgrade the app to the latest version of React Native.

First move the existing environment to a backup location that you can copy files from:

```bash
cd ./environments
mv react-native react-native-backup
```

Initialize a new React Native app into the `react-native` directory:

```bash
npx react-native init RealmReactNativeTests --directory react-native --npm
```

Clean up unneeded files

```bash
cd ./environments
rm -r react-native/__tests__
rm react-native/App.js react-native/.prettierrc.js
```

Copy over files related to the test harness

```bash
cd ./environments
cp -r react-native-backup/README.md react-native-backup/.eslintrc.js react-native-backup/harness react-native-backup/src react-native-backup/index.js react-native
```

Install additional dependencies:

```bash
cd react-native
npm install mocha mocha-junit-reporter mocha-remote-client react-native-fs path-browserify @react-native-community/art react-native-progress
npm install mocha-remote-server fs-extra promise-timeout --save-dev
```

Open the `package.json` of both `react-native` and `react-native-backup`:

1. compare (to see if any dependencies are missing from the list above),
2. copy over the scripts
3. delete anything "jest" related.

Install dependencies again to run the `prepare` script (from the root of the repository):

```bash
npx lerna bootstrap
```
