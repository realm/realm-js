#!/bin/bash

REALM_CORE_SRC=bindgen/vendor/realm-core/src
INPUT_FILELIST=react-native/ios/input-files.xcfilelist

# Clear the file list
> $INPUT_FILELIST

find "$REALM_CORE_SRC" -type f \( -name "*.h" -o -name "*.cpp" -o -name "*.hpp" \) | while read -r file; do
    echo "\$(SRCROOT)/$file" >> "$INPUT_FILELIST"
done

echo "\$(SRCROOT)/bindgen/vendor/realm-core/dependencies.list" >> "$INPUT_FILELIST"
