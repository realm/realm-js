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
* Realm Object Server: 3.23.1 or later.
* Realm Studio: 3.11 or later.
* APIs are backwards compatible with all previous release of Realm JavaScript in the 6.x.y series.
* File format: Generates Realms with format v11 (reads and upgrades previous file format).

### Internal
* None.

$(cat CHANGELOG.md)
EOF
)

echo "$CHANGELOG" > CHANGELOG.md
