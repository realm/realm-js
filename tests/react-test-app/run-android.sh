#!/bin/bash
cp ../../react-native/android/app/build/outputs/aar/app-debug.aar android/app/lib/
rm -rf node_modules/realm node_modules/realm-tests
npm install realm realm-tests
cp ../../src/object-store/parser/queryTests.json node_modules/realm-tests/
react-native run-android
