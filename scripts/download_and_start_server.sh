#!/bin/bash

set -o pipefail
set -e
echo $(pwd)
sh scripts/download-object-server.sh && sh object-server-for-testing/start-object-server.command -f && echo \"Server PID: $!\"