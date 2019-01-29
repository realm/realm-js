#!/usr/bin/env bash
${ANDROID_HOME}/platform-tools/adb -H host.docker.internal "$@"
