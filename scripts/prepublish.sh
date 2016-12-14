#!/bin/bash

set -e
set -o pipefail
export REALM_CORE_VERSION=$(./scripts/download-core.sh --version)
echo "Core Version: $REALM_CORE_VERSION"
cd "$(dirname "$0")/.."

if [ -n "$REALM_BUILD_ANDROID" ]; then
  rm -rf android
  ls -alh react-native/android/src/main/jni/src/object-store/.dockerignore
  (cd react-native/android && ./gradlew --stacktrace publishAndroid -PbuildWithSync=true)
fi
