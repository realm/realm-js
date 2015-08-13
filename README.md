# RealmJS

RealmJS contains Realm bindings for integrating with mobile apps built using javascript frameworks such as ReactNative and PhoneGap.

## ReactNative Example
There is a ReactNative sample project in `examples/ReactExample`. You must run `npm install` in this directory before running the example for the first time.

## ReactNative Project Setup
- Create a new ReactNative project `react-native init <project-name>` and open the generated XCode project.
- Drag `RealmJS.xcodeproj` into the `Libraries` folder in your project.
- In the target for your application, add `libRealmReact.a` in the `Link Binary with Library` build phase.
- Use Realm in your app.

