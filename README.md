# RealmJS

RealmJS contains Realm bindings for integrating with mobile apps built using javascript frameworks such as ReactNative and PhoneGap.

## ReactNative Setup
- Create a new ReactNative project `react-native init <project-name>` and open the generated XCode project.
- Drag `RealmJS.xcodeproj` into the `Libraries` folder in your project.
- In the target for your application, add `libRealmReact.a` in the `Link Binary with Library` build phase.
- Use Realm in your app.

