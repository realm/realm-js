#!/bin/bash
SRCROOT=$(cd "$(dirname "$0")/../.." && pwd)

echo "test.sh: starting stitch"
if [ "$CI_RUN" == "true" ]; then
echo "CI Run detected, not manually starting a server"
return;
fi

if [[ -z "$(command -v docker)" ]]; then
echo "starting stitch requires docker"
exit 1
fi
EXISTING_STITCH=$(docker ps | grep "mongodb-realm-test-server.*9090")
if [[ -n "$EXISTING_STITCH" ]]; then
echo "found existing stitch running, not attempting to start another"
else
echo "no existing stitch instance running in docker, attempting to start one"
. "${SRCROOT}/dependencies.list"
stitch_apps_path="tests/mongodb"
DOCKER_VOLUMES=""
for app in $(ls -d $stitch_apps_path/*/ | cut -f3 -d'/'); do
    app_path="$stitch_apps_path/$app"
    if [[ -f "$app_path/config.json" ]]; then
    echo "Mounting folder '$app_path' as Stitch app."
    DOCKER_VOLUMES="$DOCKER_VOLUMES -v ${SRCROOT}/${app_path}:/apps/${app}"
    fi
done
echo "DOCKER_VOLUMES: $DOCKER_VOLUMES"
echo "using object-store stitch dependency: ${MDBREALM_TEST_SERVER_TAG}"
if [[ -n "$RUN_STITCH_IN_FORGROUND" ]]; then
    # we don't worry about tracking the STITCH_DOCKER_ID because without the -d flag, this docker is tied to the shell
    docker run $DOCKER_VOLUMES -p 9090:9090 -it "docker.pkg.github.com/realm/ci/mongodb-realm-test-server:${MDBREALM_TEST_SERVER_TAG}"
else
    STITCH_DOCKER_ID=$(docker run -d $BACKGROUND_FLAG $DOCKER_VOLUMES -p 9090:9090 -it "docker.pkg.github.com/realm/ci/mongodb-realm-test-server:${MDBREALM_TEST_SERVER_TAG}")
    echo "starting docker image $STITCH_DOCKER_ID"
    # wait for stitch to import apps and start serving before continuing
    docker logs --follow "$STITCH_DOCKER_ID" | grep -m 1 "Serving on.*9090" || true
    echo "Started stitch with docker id: ${STITCH_DOCKER_ID}"
fi
fi