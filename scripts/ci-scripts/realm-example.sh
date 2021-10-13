#!/bin/bash
pushd examples/ReactExample
./node_modules/.bin/install-local

pushd ios
pod install
xctest ReactExample
popd
