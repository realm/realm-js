#!/bin/bash

set -eo pipefail

. dependencies.list

#use existing server if same version
if [ -f node_modules/realm-object-server/package.json ]; then
    if grep -q "\"version\": \"$REALM_OBJECT_SERVER_VERSION\"" node_modules/realm-object-server/package.json; then
        exit
    fi
fi

echo "Installing realm-object-server version: " $REALM_OBJECT_SERVER_VERSION
npm install --no-save realm-object-server@$REALM_OBJECT_SERVER_VERSION 

