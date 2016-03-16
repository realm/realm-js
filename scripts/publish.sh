#!/bin/bash

set -e
set -o pipefail

die() {
  echo "$@" >&2
  exit 1
}

confirm() {
  local choice
  while true; do
    read -r -p "$1 (y/n) " -n 1 choice
    echo
    case "$choice" in
      y|Y ) return 0;;
      n|N ) return 1;;
      * ) echo "It's a simple yes or no question!" >&2
    esac
  done
}

has_clean_worktree() {
  git diff --ignore-submodules=none --no-ext-diff --quiet --exit-code HEAD
}

has_no_untracked_files() {
  test -z "$(git ls-files --others --exclude-standard)"
}

# Start in the root directory of the project.
cd "$(dirname "$0")/.."

# Check if the worktree (or submodules) are dirty.
has_clean_worktree || die 'Publishing requires a clean working tree.'

# Check if there are untracked files that may accidentally get published.
has_no_untracked_files || die 'Publishing requires no untracked files.'

# Make sure all npm modules are installed and updated.
npm install > /dev/null

# Get version in package.json and check if it looks semver compliant.
VERSION=$(npm --silent run get-version)
node_modules/.bin/semver "$VERSION" > /dev/null || die "Invalid version number: $VERSION"

# Update Xcode project to that version and make sure nothing changed.
xcrun agvtool new-version "$VERSION" > /dev/null
has_clean_worktree || die "Version ($VERSION) was not properly set."

# Make sure the CHANGELOG has been updated.
RELEASE_VERSION="${VERSION%%-*}"
grep -iq "^${RELEASE_VERSION//./\.} Release notes" CHANGELOG.md || die 'CHANGELOG needs to be updated.'

# Check that the current branch is valid.
BRANCH=$(git rev-parse --abbrev-ref HEAD)
VERSION_BRANCH="${RELEASE_VERSION%.*}.x"
[[ $BRANCH = 'master' || $BRANCH = $VERSION_BRANCH ]] || die "Must publish from master or $VERSION_BRANCH branch."

# Check that this master branch is up to date with GitHub.
git fetch origin || die 'Failed to fetch from git origin.'
[ -z "$(git rev-list origin/$BRANCH..HEAD)" ] || die 'Local commits are not pushed to origin.'

# Run all tests that must pass before publishing.
for test in eslint jsdoc realmjs react-example react-tests react-tests-android; do
  echo "RUNNING TEST: $test"
  echo '----------------------------------------'
  npm test "$test" || die "Test Failed: $test"
  echo
done

# Double check before actually publishing.
confirm "Are you sure you want to publish $VERSION?" || die "Aborted publishing $VERSION"

# This should fail if this tag already exists.
git tag "v$VERSION"

# Publish to npm, informing the prepublish script to build Android modules.
echo "Publishing $VERSION to npm..."
PRERELEASE=$(grep -Eio '[a-z]+' <<< "$VERSION")
REALM_BUILD_ANDROID=1 npm publish ${PRERELEASE:+--tag $PRERELEASE}

# Only push the tag to GitHub if the publish was successful.
echo "Pushing v$VERSION tag to GitHub..."
git push origin "v$VERSION"
