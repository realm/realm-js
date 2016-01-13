#!/bin/bash

set -e
set -o pipefail

cd "$(dirname "$0")/.."

# Check if the worktree (or submodules) are dirty.
if ! git diff --ignore-submodules=none --no-ext-diff --quiet --exit-code HEAD; then
	echo 'Publishing requires a clean work tree!' >&2
	exit 1
fi

GIT_AUTHOR_NAME=$(git config --get user.name)
GIT_AUTHOR_EMAIL=$(git config --get user.email)
GIT_ORIGIN_URL=$(git ls-remote --get-url origin)

# Reset these variables just in case they were inherited from the environment.
TEMP_DIR=
PACKAGE=

# Cleanup before this script exits.
trap 'rm -rf "$TEMP_DIR" "$PACKAGE"' EXIT

TEMP_DIR=$(mktemp -d -t realm-js)
PACKAGE=$(npm pack | tail -n 1)

tar -xf "$PACKAGE" -C "$TEMP_DIR"

(
	cd "$TEMP_DIR/package"

	export GIT_AUTHOR_NAME
	export GIT_AUTHOR_EMAIL
	export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
	export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"

	git init
	git add .
	git commit -m 'Beta build'
	git remote add origin "$GIT_ORIGIN_URL"
	git push -f origin master:beta
)
