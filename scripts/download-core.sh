#!/bin/bash

set -e
set -o pipefail

: ${REALM_CORE_VERSION:=0.95.6} # set to "current" to always use the current build

download_core() {
	echo "Downloading dependency: core ${REALM_CORE_VERSION}"

	TMP_DIR="$TMPDIR/core_bin"
	mkdir -p "${TMP_DIR}"
	CORE_TMP_TAR="${TMP_DIR}/core-${REALM_CORE_VERSION}.tar.bz2.tmp"
	CORE_TAR="${TMP_DIR}/core-${REALM_CORE_VERSION}.tar.bz2"

	if [ ! -f "${CORE_TAR}" ]; then
		curl -f -L -s "https://static.realm.io/downloads/core/realm-core-${REALM_CORE_VERSION}.tar.bz2" -o "${CORE_TMP_TAR}" ||
			(echo "Downloading core failed. Please try again once you have an Internet connection." && exit 1)
		mv "${CORE_TMP_TAR}" "${CORE_TAR}"
    else
		echo "Using cached core from TEMPDIR"
	fi

	(
		cd "${TMP_DIR}"
		rm -rf core
		tar xjf "${CORE_TAR}"
		mv core core-${REALM_CORE_VERSION}
	)

	rm -rf core-${REALM_CORE_VERSION} core
	mv ${TMP_DIR}/core-${REALM_CORE_VERSION} .
	ln -s core-${REALM_CORE_VERSION} core
}
if [ -d core -a -d ../realm-core -a ! -L core ]; then
    # Allow newer versions than expected for local builds as testing
    # with unreleased versions is one of the reasons to use a local build
    if ! $(grep -i "${REALM_CORE_VERSION} Release notes" core/release_notes.txt >/dev/null); then
	    echo "Local build of core is out of date."
	    exit 1
    else
	    echo "The core library seems to be up to date."
    fi
elif ! [ -L core ]; then
	echo "core is not a symlink. Deleting..."
	rm -rf core
	download_core
	# With a prebuilt version we only want to check the first non-empty
	# line so that checking out an older commit will download the
	# appropriate version of core if the already-present version is too new
	elif ! $(grep -m 1 . core/release_notes.txt | grep -i "${REALM_CORE_VERSION} RELEASE NOTES" >/dev/null); then
		download_core
	else
		echo "The core library seems to be up to date."
fi

