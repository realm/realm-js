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

# Get version in package.json (stripping prerelease qualifier for the "release" version).
VERSION=$(npm --silent run get-version)
RELEASE_VERSION="${VERSION%%-*}"

# Update Xcode project to that version and make sure nothing changed.
npm --silent run set-version -- --force "$VERSION"
has_clean_worktree || die "Version $RELEASE_VERSION was not properly set on Xcode project."

# Make sure the CHANGELOG has been updated.
grep -iq "^${RELEASE_VERSION//./\.} Release notes" CHANGELOG.md || die 'CHANGELOG needs to be updated.'

# Check that the current branch is valid.
BRANCH=$(git rev-parse --abbrev-ref HEAD)
VERSION_BRANCH="${RELEASE_VERSION%.*}.x"
[[ $BRANCH = 'master' || $BRANCH = $VERSION_BRANCH ]] || die "Must publish from master or $VERSION_BRANCH branch."

# Check that this master branch is up to date with GitHub.
git fetch origin || die 'Failed to fetch from git origin.'
[ -z "$(git rev-list origin/$BRANCH..HEAD)" ] || die 'Local commits are not pushed to origin.'

# Double check before actually publishing.
confirm "Are you sure you want to publish $VERSION? (Did you run all tests)?" || die "Aborted publishing $VERSION"

# This should fail if this tag already exists.
git tag "v$VERSION"

# Delete Android build directory so no stale files are accidentally included.
rm -rf react-native/android/build

# Publish to npm, informing the prepublish script to build Android modules.
echo "Publishing $VERSION to npm..."
PRERELEASE=$(grep -Eio '[a-z]+' <<< "$VERSION" || true)
npm publish ${PRERELEASE:+--tag $PRERELEASE}

# Only push the tag to GitHub if the publish was successful.
echo "Pushing v$VERSION tag to GitHub..."
git push origin "v$VERSION"

# Add the changelog templates
echo "Adding changelog template"
./scripts/changelog-header.sh
git add CHANGELOG.md
git commit -m "Adding changelog template"
git push origin "$BRANCH"

echo "Done. Now, you should update the documentation!"
