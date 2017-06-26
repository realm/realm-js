#!/bin/bash

set -eo pipefail

[ "$(uname -s)" != "Darwin" ] && exit

. dependencies.list

if [ -f object-server-for-testing/node_modules/realm-object-server-developer/package.json ]; then
    if grep -q "\"version\": \"$REALM_OBJECT_SERVER_VERSION\"" object-server-for-testing/node_modules/realm-object-server-developer/package.json; then
        echo -e "yes\n" | object-server-for-testing/reset-server-realms.command
        exit
    fi
fi

object_server_bundle="realm-object-server-bundled_node_darwin-developer-$REALM_OBJECT_SERVER_VERSION.tar.gz"
curl -f -L "https://static.realm.io/downloads/object-server/$object_server_bundle" -o "$object_server_bundle"
rm -rf object-server-for-testing
mkdir object-server-for-testing
tar -C object-server-for-testing -xf "$object_server_bundle"
rm "$object_server_bundle"

echo -e "enterprise:\n  skip_setup: true\n" >> "object-server-for-testing/object-server/configuration.yml"
touch "object-server-for-testing/object-server/do_not_open_browser"