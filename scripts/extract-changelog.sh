#!/bin/bash

set -e
set -o pipefail

VERSION="$1"
ESCAPED_VERSION="$(echo -n "$VERSION" | sed -e 's|\.|\\.|g')"
sed '/^## '"${ESCAPED_VERSION}"'/,/^## /!d;/## /d' CHANGELOG.md
