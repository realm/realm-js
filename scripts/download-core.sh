#!/bin/bash

set -e
set -o pipefail

: ${REALM_CORE_VERSION:=0.100.2} # set to "current" to always use the current build

# Start current working directory at the root of the project.
cd "$(dirname "$0")/.."

die() {
    echo "$@" >&2
    exit 1
}

download_core() {
    echo "Downloading dependency: core $REALM_CORE_VERSION"

    local TMP_DIR="$TMPDIR/core_bin"
    local CORE_TAR="$TMP_DIR/core-$REALM_CORE_VERSION.tar.bz2"
    local CORE_TMP_TAR="$CORE_TAR.tmp"

    mkdir -p "$TMP_DIR"

    if [ ! -f "$CORE_TAR" ]; then
        curl -f -L -s "https://static.realm.io/downloads/core/realm-core-$REALM_CORE_VERSION.tar.bz2" -o "$CORE_TMP_TAR" ||
            die "Downloading core failed. Please try again once you have an Internet connection."
        mv "$CORE_TMP_TAR" "$CORE_TAR"
    else
        echo "Using cached core from TMPDIR"
    fi

    (
        cd "$TMP_DIR"
        rm -rf core
        tar xjf "$CORE_TAR"
        mv core "core-$REALM_CORE_VERSION"
    )

    rm -rf "core-$REALM_CORE_VERSION" core
    mv "$TMP_DIR/core-$REALM_CORE_VERSION" .
    ln -s "core-$REALM_CORE_VERSION" core
}

check_release_notes() {
    grep -Fqi "$REALM_CORE_VERSION RELEASE NOTES" "$@"
}

if [[ $1 = "--version" ]]; then
    echo $REALM_CORE_VERSION
    exit 0
fi

if [ ! -e core ]; then
    download_core
elif [ -d core -a -d ../realm-core -a ! -L core ]; then
    # Allow newer versions than expected for local builds as testing
    # with unreleased versions is one of the reasons to use a local build
    if ! check_release_notes core/release_notes.txt; then
        die "Local build of core is out of date."
    else
        echo "The core library seems to be up to date."
    fi
elif [ ! -L core ]; then
    echo "core is not a symlink. Deleting..."
    rm -rf core
    download_core
# With a prebuilt version we only want to check the first non-empty
# line so that checking out an older commit will download the
# appropriate version of core if the already-present version is too new
elif ! grep -m 1 . core/release_notes.txt | check_release_notes; then
    download_core
else
    echo "The core library seems to be up to date."
fi
