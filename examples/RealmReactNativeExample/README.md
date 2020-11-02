# Realm React Native example app

## How to update this app

One way is to move this directory to a backup location, initialize another app and copy over this file:

```
mv RealmReactNativeExample RealmReactNativeExample-backup
npx react-native init RealmReactNativeExample
cp RealmReactNativeExample/README.md RealmReactNativeExample-backup/
```

Add any dependencies from the existing app.

```
npm install @react-navigation/native @react-navigation/stack
```

Add the peer dependencies required by https://reactnavigation.org/docs/getting-started/

```
npm install react-native-reanimated react-native-gesture-handler react-native-screens react-native-safe-area-context @react-native-community/masked-view
```

Install the `install-local` package as a dev dependency.

```
npm install install-local --save-dev
```

Add a local dependency on the root project to the package.json:

```
"localDependencies": {
  "realm": "../.."
},
```

Add a prepare script to the package.json which installs the local dependency and runs "pod install" in the ios directory:

```
"prepare": "install-local && cd ios && pod install",
```

The React Native `use_native_modules` function iterates the packages listed in the "dependencies" of the package, but our dependency on "realm" is not listed there. Add the following dependency to the package.json to resolve that issue:

```
"realm": null
```

Copy over the "components" directory from the backup,

```
cp -r ../RealmReactNativeExample-backup/components .
```

delete the new App.js

```
rm App.js
```

and adjust the new index.js to mount the todo-app component:

```
import App from './components/todo-app';
```

Now, test that everthing works by NPM installing and running the app:

```
npm install
npm run ios
```
