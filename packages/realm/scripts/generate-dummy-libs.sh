#!/bin/bash

BUILD_DIR=react-native/ios/build
LIB_DIR=react-native/ios/lib

rm -rf $LIB_DIR
mkdir $LIB_DIR
pushd $LIB_DIR

touch librealm.a librealm-sync.a librealm-parser.a librealm-object-store.a
popd

# Wiping the build dir.  If this is being called, then this will ensure the phase script is executed again.
rm -rf $BUILD_DIR
