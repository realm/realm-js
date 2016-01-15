#!/bin/bash
rm -rf node_modules/realm
npm install realm
adb forward tcp:8082 tcp:8082
adb reverse tcp:8081 tcp:8081
react-native run-android
