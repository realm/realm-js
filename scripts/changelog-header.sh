#!/bin/bash

set -e
set -o pipefail

CHANGELOG=$(cat <<EOF
x.x.x Release notes (yyyy-MM-dd)
=============================================================
### Breaking changes
* None

### Enhancements
* None

### Bugfixes
* None

$(cat CHANGELOG.md)
EOF
)

echo "$CHANGELOG" > CHANGELOG.md
