#!/bin/bash

set -e
set -o pipefail

: ${REALM_CORE_VERSION:=0.95.6} # set to "current" to always use the current build

echo "Downloading dependency: core ${REALM_CORE_VERSION}"

TMP_DIR="$TMPDIR/core_bin"
mkdir -p "${TMP_DIR}"
CORE_TMP_TAR="${TMP_DIR}/core-${REALM_CORE_VERSION}.tar.bz2.tmp"
CORE_TAR="${TMP_DIR}/core-${REALM_CORE_VERSION}.tar.bz2"

if [ ! -f "${CORE_TAR}" ]; then
	curl -f -L -s "https://static.realm.io/downloads/core/realm-core-${REALM_CORE_VERSION}.tar.bz2" -o "${CORE_TMP_TAR}" ||
		(echo "Downloading core failed. Please try again once you have an Internet connection." && exit 1)
	mv "${CORE_TMP_TAR}" "${CORE_TAR}"
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
