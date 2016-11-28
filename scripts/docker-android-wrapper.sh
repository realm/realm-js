#!/bin/sh
# This is a wrapper script which uses docker.  It is used in CI, but can also
# be used locally if you have your ~/.android directory setup and access to 
# /dev/bus/usb.
# 
# ./scripts/docker-android-wrapper.sh ./scripts/test.sh react-tests-android
#

set -e

./scripts/docker_build_wrapper.sh ci/realm-js:build .

exec docker run --rm \
  -u $(id -u) \
  --privileged \
  --net=host \
  -e HOME=/tmp \
  -e _JAVA_OPTIONS=-Duser.home=/tmp \
  -v /etc/passwd:/etc/passwd:ro \
  -v /dev/bus/usb:/dev/bus/usb \
  -v $HOME/.android:/tmp/.android \
  -v $(pwd):/source \
  -w /source \
  ci/realm-js:build \
  "${@}"
