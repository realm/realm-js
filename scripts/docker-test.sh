#!/bin/sh
# This is a wrapper script around ./scripts/test.sh which uses docker.  The 
# arguments are the same, as they are passed directly to test.sh.
# It can be used to locally check and debug the linux build process 
# outside of CI.

set -e

./scripts/docker_build_wrapper.sh ci/realm-js:build .

exec docker run --rm \
  -u $(id -u) \
  -e HOME=/tmp \
  -v $(pwd):/source \
  -w /source \
  ci/realm-js:build \
  ./scripts/test.sh $@

