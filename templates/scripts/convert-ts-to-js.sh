#!/bin/bash

# This script converts the TypeScript template apps to plain JavaScript, using detype
# (https://www.npmjs.com/package/detype) to preserve comments and formatting
# (which tsc does not do)

set -e
set -o pipefail

convert() {
  pushd $1
  # The Babel config causes detype to output non-ES2015 JS, so temporarily hide it
  mv babel.config.js babel.config.js.ignore
  # Delete any generated JS files in the target directory in case we have renamed or deleted something
  find $2/app -name "*.js" -exec rm {} +
  # Strip types from every .ts* file (except those in node_modules) and write the output
  # to the corresponding file in react-native-template-realm-js, with the extension changed
  # to ".js" (regardless of whether the original was ".tsx" or ".ts")
  for i in `find . -path ./node_modules -prune -o -name "*.ts*" -print`; do npx detype $i $2/${i/\.ts*/\.js} ; done
  # Move the Babel config back
  mv babel.config.js.ignore babel.config.js
  popd
}

convert "../react-native-template-realm-ts/template" "../../react-native-template-realm-js/template"
convert "../expo-template-ts" "../expo-template-js"