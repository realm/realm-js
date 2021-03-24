#/bin/bash
SRCROOT=$(cd "$(dirname "$0")/../.." && pwd)
npm run check-environment
#start_server

pushd "$SRCROOT/tests"
npm run test
popd
#stop_server
