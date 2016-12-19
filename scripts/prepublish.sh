#!/bin/bash

set -e
set -o pipefail
export REALM_CORE_VERSION=$(./scripts/download-core.sh --version)
echo "Core Version: $REALM_CORE_VERSION"
cd "$(dirname "$0")/.."

if [ -n "$REALM_BUILD_ANDROID" ]; then
  (cd react-native/android && ./gradlew publishAndroid -PbuildWithSync=true)
fi
