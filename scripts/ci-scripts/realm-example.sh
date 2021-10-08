#!/bin/bash
pushd examples/ReactExample
npm ci
./node_modules/.bin/install-local

pushd ios
pod install
xctest ReactExample
popd