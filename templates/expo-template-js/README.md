# Expo Template Realm JavaScript
<p>
  <!-- iOS -->
  <img alt="Supports Expo iOS" longdesc="Supports Expo iOS" src="https://img.shields.io/badge/iOS-4630EB.svg?style=flat-square&logo=APPLE&labelColor=999999&logoColor=fff" />
  <!-- Android -->
  <img alt="Supports Expo Android" longdesc="Supports Expo Android" src="https://img.shields.io/badge/Android-4630EB.svg?style=flat-square&logo=ANDROID&labelColor=A4C639&logoColor=fff" />
</p>

Simple Expo template to quickly get started with Realm and Realm types.

## 🚀 How to use

> `npx create-react-native-app MyAwesomeRealmApp -t https://github.com/realm/realm-js --template-path packages/expo-template-js

- Run `expo start --dev-client`, try it out.

## 🏗 Build with EAS

You can easily use this project with `EAS` - just follow the steps below.

### ⚙️ Prepare project

- adjust value of `ios.bundleIdentifier` and `android.package` in `app.json`
- run `eas build:configure`

### 💪 Build whatever you want

This example comes with two pre-configured build types: `release` (a production version of your app - ready to be uploaded to stores), `with-dev-client` (a development version of your app that can be shared with your teammates).

To build the app with the dev client, just run `eas build --profile with-dev-client`.

> **Note**: the `with-dev-client` uses the **internal distribution** on **iOS**. That's why, you need to add your device to be able to install the built app. To do it, you can use `eas device:create`.

**For more information about EAS, check out [documentation](https://docs.expo.dev/eas/).**

## 📝 Notes

- [Development Client docs](https://docs.expo.dev/clients/introduction/)
