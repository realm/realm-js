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
* Realm Object Server: 3.11.0 or later.
* APIs are backwards compatible with all previous release of realm in the 2.x.y series.
* File format: Generates Realms with format v9 (Reads and upgrades all previous formats)

### Internal
* None.

$(cat CHANGELOG.md)
EOF
)

echo "$CHANGELOG" > CHANGELOG.md
