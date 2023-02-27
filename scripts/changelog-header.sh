#!/bin/bash

set -e
set -o pipefail

CHANGELOG=$(cat <<EOF
## vNext (TBD)

### Deprecations
* None

### Enhancements
* None

### Fixed
* <How to hit and notice issue? what was the impact?> ([#????](https://github.com/realm/realm-js/issues/????), since v?.?.?)
* None

### Compatibility
* React Native >= v0.71.0
* Realm Studio v13.0.0.
* File format: generates Realms with format v23 (reads and upgrades file format v5 or later for non-synced Realm, upgrades file format v10 or later for synced Realms).

### Internal
<!-- * Either mention core version or upgrade -->
<!-- * Using Realm Core vX.Y.Z -->
<!-- * Upgraded Realm Core from vX.Y.Z to vA.B.C -->

$(cat CHANGELOG.md)
EOF
)

echo "$CHANGELOG" > CHANGELOG.md
