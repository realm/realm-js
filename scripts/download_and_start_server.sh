#!/bin/bash

set -o pipefail
set -e
echo "Downloading and starting ROS. Current directory: " $(pwd)
sh scripts/download-object-server.sh && export ROS_SKIP_PROMPTS=true && ./node_modules/.bin/ros start --data realm-object-server-data && echo \"Server PID: $!\"
