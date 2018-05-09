#!/bin/sh

# Get the script dir which contains the Dockerfile
DOCKERFILE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

ROS_VERSION=$(grep REALM_OBJECT_SERVER_VERSION $DOCKERFILE_DIR/../../dependencies.list | cut -d'=' -f2)

TMP_DIR=$(mktemp -d /tmp/sync-test.XXXX) || { echo "Failed to mktemp $TEST_TEMP_DIR" ; exit 1 ; }

if [ "$1" = "-android" ]; then
    echo "Port forwarding for Android"
    adb reverse tcp:9443 tcp:9443 && \
    adb reverse tcp:9080 tcp:9080 && \
    adb reverse tcp:8888 tcp:8888 || { echo "Failed to reverse adb port." ; exit 1 ; }
fi

docker build $DOCKERFILE_DIR --build-arg ROS_VERSION=$ROS_VERSION -t sync-test-server || { echo "Failed to build Docker image." ; exit 1 ; }

echo "See log files in $TMP_DIR"
docker run -p 9080:9080 -p 9443:9443 -p 8888:8888 -v$TMP_DIR:/tmp --name sync-test-server sync-test-server
