#!/bin/bash
set -e

NODE_AUTH_TOKEN=$1

templates_location="$(dirname $(readlink -e $0))/.."

for template in "$templates_location"/*-template-*; do
  pushd $template
    npm publish
  popd
done
