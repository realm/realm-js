#!/bin/bash
set -e

FRAMEWORK_DIR="$1"

if test -z "$FRAMEWORK_DIR"; then
  echo "Missing xcframework location argument"
  exit 1
fi

while read LIB; do
  HEADERS="$(dirname $LIB)/Headers/realm-js-ios"
  ARGS="-library $LIB -headers $HEADERS $ARGS"
done < <(find "$FRAMEWORK_DIR" -name '*.a')

xcodebuild -create-xcframework $ARGS -output temp.xcframework
cp -v temp.xcframework/Info.plist $FRAMEWORK_DIR/
