#!/bin/bash

set -o pipefail
set -e

cd "$(dirname "$0")"

CONFIGURATION="${1:-"Release"}"
PATH="$(cd ../../node_modules/.bin && pwd):$PATH"

if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  . "${HOME}/.nvm/nvm.sh"
  nvm use 5.4.0 || true
fi

node-gyp configure

# Being explicit about debug mode rather than relying on defaults.
if [[ $CONFIGURATION == 'Debug' ]]; then
  node-gyp build --debug
else
  node-gyp build --no-debug
fi

# Link to the appropriate module in the build directory.
cd ../..
mkdir -p build
ln -fs "../src/node/build/$CONFIGURATION/realm.node" build/
