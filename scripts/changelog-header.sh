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
* APIs are backwards compatible with all previous release of Realm JavaScript in the 4.x.y series.
* File format: generates Realms with format v10 (reads and upgrades file format v5 or later).

### Internal
* None.

$(cat CHANGELOG.md)
EOF
)

echo "$CHANGELOG" > CHANGELOG.md
