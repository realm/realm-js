#!/bin/bash

set -e
set -o pipefail

if [ "$1" = '--force' ]; then
  FORCE=true
  shift
else
  FORCE=false
fi

VERSION="$1"

cd "$(dirname "$0")/.."

# Check that the version looks semver compliant.
if ! node_modules/.bin/semver "$VERSION" > /dev/null; then
  echo "Invalid version number: $VERSION" >&2
  exit 1
fi

# Update the version in package.json (unless --force and version is unchanged).
if ! $FORCE || [ "$VERSION" != "$(npm --silent run get-version)" ]; then
  npm --no-git-tag-version version "$VERSION"
fi

# Update CURRENT_PROJECT_VERSION and DYLIB_CURRENT_VERSION in the Xcode project.
cd src/ios
xcrun agvtool new-version "${VERSION%%-*}"
