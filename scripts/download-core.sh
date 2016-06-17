#!/bin/bash

set -e
set -o pipefail

# Set to "latest" for the latest build.
: ${REALM_CORE_VERSION:=1.1.2}

if [ "$1" = '--version' ]; then
    echo "$REALM_CORE_VERSION"
    exit 0
fi

# The 'node' argument will result in realm-node build being downloaded.
if [ "$1" = 'node' ]; then
    CORE_DIR="core-node"

    if [ "$(uname)" = 'Darwin' ]; then
        CORE_DOWNLOAD_FILE="realm-core-node-osx-$REALM_CORE_VERSION.tar.gz"
    else
        CORE_DOWNLOAD_FILE="realm-core-node-linux-$REALM_CORE_VERSION.tar.gz"
    fi
else
    CORE_DIR='core'
    CORE_DOWNLOAD_FILE="realm-core-$REALM_CORE_VERSION.tar.bz2"
fi

# Start current working directory at the root of the project.
cd "$(dirname "$0")/.."

die() {
    echo "$@" >&2
    exit 1
}

download_core() {
    echo "Downloading dependency: $CORE_DIR $REALM_CORE_VERSION"

    local TMP_DIR="${TMPDIR:-/tmp}/core_bin"
    local CORE_TAR="$TMP_DIR/$CORE_DOWNLOAD_FILE"
    local CORE_TMP_TAR="$CORE_TAR.tmp"

    mkdir -p "$TMP_DIR"

    if [ ! -f "$CORE_TAR" ]; then
        curl -f -L -s "https://static.realm.io/downloads/core/$CORE_DOWNLOAD_FILE" -o "$CORE_TMP_TAR" ||
            die "Downloading $CORE_DIR failed. Please try again once you have an Internet connection."
        mv "$CORE_TMP_TAR" "$CORE_TAR"
    else
        echo "Using cached $CORE_DIR from TMPDIR"
    fi

    (
        cd "$TMP_DIR"
        rm -rf "$CORE_DIR"
        tar -xzf "$CORE_TAR"
        mv core "$CORE_DIR-$REALM_CORE_VERSION"
    )

    rm -rf "$CORE_DIR-$REALM_CORE_VERSION" "$CORE_DIR"
    mv "$TMP_DIR/$CORE_DIR-$REALM_CORE_VERSION" .
    ln -s "$CORE_DIR-$REALM_CORE_VERSION" "$CORE_DIR"
}

check_release_notes() {
    grep -Fqi "$REALM_CORE_VERSION RELEASE NOTES" "$@"
}

if [ ! -e "$CORE_DIR" ]; then
    download_core
elif [ -d "$CORE_DIR" -a -d ../realm-core -a ! -L "$CORE_DIR" ]; then
    # Allow newer versions than expected for local builds as testing
    # with unreleased versions is one of the reasons to use a local build
    if ! check_release_notes "$CORE_DIR/release_notes.txt"; then
        die "Local build of core is out of date."
    else
        echo "The core library seems to be up to date."
    fi
elif [ ! -L "$CORE_DIR" ]; then
    echo "$CORE_DIR is not a symlink. Deleting..."
    rm -rf "$CORE_DIR"
    download_core
# With a prebuilt version we only want to check the first non-empty
# line so that checking out an older commit will download the
# appropriate version of core if the already-present version is too new
elif ! grep -m 1 . "$CORE_DIR/release_notes.txt" | check_release_notes; then
    download_core
else
    echo "The core library seems to be up to date."
fi
