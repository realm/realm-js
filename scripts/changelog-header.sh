#!/bin/bash

set -e
set -o pipefail

CHANGELOG=$(cat <<EOF
x.x.x Release notes (yyyy-MM-dd)
=============================================================
### Enhancements
* None.

### Fixed
* <How to hit and notice issue? what was the impact?> ([#????](https://github.com/realm/realm-js/issues/????), since v?.?.?)
* None.

### Compatibility
* MongoDB Realm Cloud.
* APIs are backwards compatible with all previous releases of Realm JavaScript in the 10.x.y series.
* File format: generates Realms with format v20 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 for synced Realms).

### Internal
* None.

$(cat CHANGELOG.md)
EOF
)

echo "$CHANGELOG" > CHANGELOG.md
