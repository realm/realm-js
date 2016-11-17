#!/bin/sh
# This is a wrapper script which uses docker.  It allows you to run commands
# in a docker environment.

set -e

cmd=${@:-/bin/bash}

./scripts/docker_build_wrapper.sh ci/realm-js:build .

exec docker run --rm \
  -u $(id -u) \
  -e HOME=/tmp \
  -v $(pwd):/source \
  -w /source \
  ci/realm-js:build \
  ${cmd}
