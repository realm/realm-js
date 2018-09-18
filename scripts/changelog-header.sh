#!/bin/bash

set -e
set -o pipefail

CHANGELOG=$(cat <<EOF
x.x.x Release notes (yyyy-MM-dd)
=============================================================
## Enhancements
* None

### Fixes
* None

### Compatibility
* File format: ver. 7 (upgrades automatically from previous formats)
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
 
 ### Internal
* None

$(cat CHANGELOG.md)
EOF
)

echo "$CHANGELOG" > CHANGELOG.md
