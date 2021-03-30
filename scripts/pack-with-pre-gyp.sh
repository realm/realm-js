#!/bin/sh

set -e
echo "Packing a full realm package with prebuid binaries"

VERSION="$(npm --silent run get-version)"

echo "Packing Realm package"
npm pack

echo "extracting the packed realm package"
tar -xzf realm-$VERSION.tgz

echo "creating temporary director for the prebuild realm binaries"
mkdir package || true
cd package

echo "extracting the prebuild realm binaries archive"
tar -xzf ../realm-*.tar.gz
cd ..

echo "creating the full realm package including the prebuild realm binaries"
tar -cz package > integration-tests/realm-$VERSION.tgz
rm -r package
