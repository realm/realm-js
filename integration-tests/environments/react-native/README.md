# Realm JS tests running in an React Native environment

Currently this directory consists of:
- A React-Native app with `android`, `ios` folders and `src` where:
  - `App.js` a simple component which creates a mocha remote client and displays progress.
  - `index.js` re-exports the `App` component.
- A test harness in `harness`, where:
  - `android-cli.js` wraps the Android specific `adb` and `emulator` CLIs.
  - `runner.js` starts a mocha remote server, the metro bundler and starts the app (using `react-native run-android` or `react-native run-android`)
  - `react-native-cli.js` wraps the `react-native` CLI.
  - `xcode-cli.js` wraps the `react-native` CLI.

To install this environment, simply run:

```bash
npm install
```

This will run `install-local` and `pod install` (in `./ios`) for you.

## Running the tests

To run tests on Android, start an emulator and run:

```bash
npm run test/android
```

To run tests on iOS:

```bash
npm run test/ios
```

To run tests in both processes in sequence, start an Android emulator and run:

```bash
npm test
```

## Running the tests in "watch mode"

When making rapid iterations on the tests or Realm JS, its important to shorten the latency from change to feedback.

To run the tests in watch mode, prepend the `--watch` runtime option when starting the tests:

On Android

```bash
npm run test/android -- --watch
```

On iOS

```bash
npm run test/ios -- --watch
```

This will keep the harness, metro server and mocha-remote servers running and connected to the device. When hot reloading (from an update to Realm JS, the tests or the app itself) the app will re-connect and rerun the tests.

## Weird configurations

In an attempt to lower the time from change to the Realm JS source-code or the integration test suite, to a test being run, this React Native app has a couple of weird configurations.

Because we're not listing `realm` as a `dependency` of our `package.json` we won't be relying on React Native auto-linking.
This gives us an opportunity to manually link to the root project, removing the need to reinstall the `realm` package or link build artifacts into the `node_modules/realm` directory.

### Metro bundler configuration

- Watch the Realm library and the integration test suite packages.
- Block any loading of packages from `node_modules` in the two packages.
- Use `install-local` install the dependencies of our two packages into the app.

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

### TODO: Automating setting app to run in debugging mode

On Android we can set the `remote_js_debug` preference by pushing a file via the ADB CLI:

```
adb shell
run-as com.realmreactnativetests
cat shared_prefs/com.realmreactnativetests_preferences.xml
```

On iOS 
