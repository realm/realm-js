1.0.2 Release notes (2017-2-7)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* Proactively refresh sync user tokens to avoid a reconnect delay (#840)

1.0.1 Release notes (2017-2-2)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* Fix crash when the sync user token expires (#839)

1.0.0 Release notes (2017-2-2)
=============================================================
### Breaking changes
* None

### Enhancements
* Add the Management Realm accessor on the User class, and its schema (#779)

### Bug fixes
* None

0.15.4 Release notes (2017-1-11)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bug fixes
* Always download Node binaries except on Windows, for unit testing (#789)


0.15.3 Release notes (2017-1-10)
=============================================================
### Breaking changes
* None

### Enhancements
* More specific error message when setting a property to a wrong type (#730)

### Bug fixes
* Fix chrome debugging on React Native 0.39 and up (#766)


0.15.2 Release notes (2016-12-29)
=============================================================
### Breaking changes
* None

### Enhancements
* More explicit handling of missing constructor (#742)

### Bugfixes
* Realm open on another thread (#473)
* symbol() variable not found (#761)


0.15.1 Release notes (2016-11-22)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bugfixes
* Fix compile error for collection notification in chrome debug mode

0.15.0 Release notes (2016-11-15)
=============================================================
### Breaking changes
* None

### Enhancements
* Node.js support
* Support for fine grained notifications on `List` and `Results` objects
* Updated test and examples for react-natve v0.37.0

### Bugfixes
* None

0.14.3 Release notes (2016-8-8)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bugfixes
* Support for react-native v0.31.0 

0.14.2 Release notes (2016-8-3)
=============================================================
### Breaking changes
* Deprecate `Realm.Types`. Please specify the type name as lowercase string instead.

### Enhancements
* None

### Bugfixes
* None

0.14.2 Release notes (2016-7-11)
=============================================================
### Breaking changes
* Please use `rnpm 1.9.0` or later to link your project. Older versions are no longer supported.
* ReactNative versions older than v0.14.0 are no longer supported

### Enhancements
* Support for ReactNative versions v0.28.0+
* Added support for debugging in Visual Studio Code.

### Bugfixes
* None

0.14.1 Release notes (2016-6-28)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bugfixes
* Fix linker error when building for minimum target version of iOS 7.
* Fix for failure in `strip` command when building an archive.

0.14.0 Release notes (2016-6-22)
=============================================================
### Breaking changes
* None

### Enhancements
* Added `isValid()` method to `List` and `Results` to check for deleted or invalidated objects
* Added `objectForPrimaryKey(type, key)` method to `Realm`

### Bugfixes
* Fix for crash when setting object properties to objects from other Realms
* Fix for exception sometimes thrown when reloading in Chrome debug mode

0.13.2 Release notes (2016-5-26)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bugfixes
* Fix for crash when updating Realms with optional date properties to the new file format

0.13.1 Release notes (2016-5-24)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bugfixes
* Fix for crash when inserting dates from before the epoch
* Fix for crash when using collection snapshot after realm.deleteAll()

0.13.0 Release notes (2016-5-19)
=============================================================
### Breaking changes
* With this release we have switched over to a new cross platform compatible date format.
  This change will only require action from users who are using both the JS and Cocoa or Android
  bindings simultaneously and accessing Realm files from both bindings. In these cases you need to
  open the Realm file with the latest version of the iOS or Android bindings before accessing the
  Realm from JS to prevent an unnecessary conversion.

### Enhancements
* None

### Bugfixes
* Date properties are now stored in a format compatible with the Realm Browser and other bindings.
* Fix for using `class MyObject extends Realm.Object` in a React Native project.
* Fix a memory leak caused by constructing a Realm instance of an already opened Realm.
* Fix for better supporting hot module reloading.
* Fix for some warnings when using `ListView` with React Native 0.25+
* Fix for queries that use a keypath starting with "not".

0.12.0 Release notes (2016-5-4)
=============================================================
### Breaking changes
* None

### Enhancements
* Support for queries comparing optional properties to `null`
* `object.isValid()` has been added to enable checking if an object has been deleted
  - **Note:** Custom object classes can extend `Realm.Object` to inherit this method
* Support opening a Realm as read-only with the `readOnly` configuration option
* Support for providing a custom migration function (please see the docs for details)
* Added `path`, `readOnly`, `schema`, and `schemaVersion` properties to `Realm` instances
* Optional and list properties are no longer required when creating objects

### Bugfixes
* When accessing an empty Results `undefined` is returned rather than throwing an exception
* Accessing a deleted object throws a JS exception rather than crashing
* Accessing an invalidated Results snapshot throws a JS exception rather than crashing
* Fix for error message when specifying properties with invalid object types
* Fix memory leak when reloading an app in debug mode
* Setting non-persisted properties now works as expected

0.11.1 Release notes (2016-3-29)
=============================================================
### Bugfixes
* Fix for using Android Studio to build app using Realm
* Fix for sharing Realm between JS and Objective-C/Swift

0.11.0 Release notes (2016-3-24)
=============================================================
### Breaking changes
* Realm for React Native is now packaged as a static library for iOS
  - Remove the reference to `RealmJS.xcodeproj` from your Xcode project
    (under the `Libraries` group)
  - Make sure `rnpm` is installed and up-to-date: `npm install -g rnpm`
  - Run `rnpm link realm` from your app's root directory

### Enhancements
* Support for encrypted Realms
* List and Results now inherit from Realm.Collection
* List and Results is now iterable (e.g. supports `for...of` loops)
* Add common Array methods to List and Results
* Accept constructor in create() and objects() methods
* Support relative paths when opening Realms
* Support case insensitive queries by adding `[c]` after operators
* Support for indexed `bool`, `string`, and `int` properties
* Added `Realm.schemaVersion` method, which supports unopened Realms

### Bugfixes
* Fix for crash on Android when initializing the Realm module
* Fix for using Chrome debug mode from a device
* Fix for List splice method not accepting a single argument
* Don't download or unpack core libraries unnecessarily


0.10.0 Release notes (2016-2-22)
=============================================================
### Enhancements
* Initial Release
