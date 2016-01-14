#!/bin/bash
cp ../../react-native/android/app/build/outputs/aar/app-debug.aar android/app/lib/
rm -rf node_modules/realm node_modules/realm-tests
npm install realm
adb forward tcp:8082 tcp:8082
adb reverse tcp:8081 tcp:8081
react-native run-android
