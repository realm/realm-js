#!/bin/bash

set -e

bump="$1"
test -z "$bump" && bump="minor"

templates_location="dirname $(readlink -e $0)/.."

for template in "$templates_location"/*-template-*; do
  pushd $template
    npm version --no-git-tag-version $bump
  popd
done
