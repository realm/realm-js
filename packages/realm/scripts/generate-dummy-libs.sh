#!/bin/bash

LIB_DIR=react-native/ios/lib

rm -rf $LIB_DIR
mkdir $LIB_DIR
pushd $LIB_DIR

touch librealm.a librealm-sync.a librealm-parser.a librealm-object-store.a
popd
