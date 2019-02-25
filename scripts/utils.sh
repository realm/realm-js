#!/bin/bash
set -euo pipefail

usage() {
cat <<EOF
Usage: bash $0 command

command:
release-notes-prerelease: replace "# NEXT VERSION" with the current version
release-notes-postrelease: add the "# NEXT VERSION" section to the changelog
get-version: get current version
EOF
}

if [ $# -lt 1 ]; then
    usage
    exit 1
fi

COMMAND="$1"
[ $# -gt 0 ] && shift

case "$COMMAND" in
    "release-notes-prerelease")
        RELEASE_HEADER="# $(sh scripts/utils.sh get-version) Release notes" && \
        sed -i.bak "1s/.*/$RELEASE_HEADER/" CHANGELOG.md || exit 1
        rm CHANGELOG.md.bak
        exit 0
        ;;

    "release-notes-postrelease")
        if [ $(head -1 CHANGELOG.md | grep -c "NEXT RELEASE") -eq 0 ]; then
            cat docs/release_notes_template.md CHANGELOG.md > CHANGELOG.md.new && \
            mv CHANGELOG.md.new CHANGELOG.md || exit 1
        fi
        exit 0
        ;;

    "get-version")
        version="$(grep -F "\"version\": " package.json | awk -F'"' '{print $4}')" || exit 1
        echo "$version"
        exit 0
        ;;

    "set-version")
        version="$1"
        sed -i.bck "s/\"version\": \".*/\"version\": \"$version\",/" package.json && rm -f package.json.bck
        # update dependencies.list
        sed -i.bck "s/^VERSION.*/VERSION=$version/" dependencies.list && rm -f dependencies.list.bck
        exit 0
        ;;
    *)
        echo "Unknown command '$COMMAND'"
        usage
        exit 1
        ;;
esac
