#!/bin/sh

set -e

VERSION="$(npm --silent run get-version)"

npm pack

# Add the build node-pre-gyp binary to the npm package
tar -xzf realm-$VERSION.tgz
mkdir package/compiled
cd package/compiled
tar -xzf ../../realm-*.tar.gz
cd ../..
tar -cz package > integration-tests/realm-$VERSION.tgz
rm -r package
