#!/bin/bash
set -e

#enable for debugging
# set -x

SCRIPTS_DIR=$1
if test -z "$SCRIPTS_DIR"
then
    echo "error: This script requires a first argument to be the directory path where download-realm.js is located";
    exit 1;
fi

export NODE_COMMAND="node"

if ! which node > /dev/null; then
  echo "warning: node is not found in PATH. Looking for nvm in $HOME/.nvm"
  [ ! -d "$HOME/.nvm" ] && echo "error: node or nvm not found." && exit 1;
 
  #do not print nvm output. comment set +x if output is needed for debugging 
  # set +x
  [ -z "$NVM_DIR" ] && export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  export NODE_CURRENT_VERSION=$(nvm current);  
  echo "warning: nvm found. Using node version: $NODE_CURRENT_VERSION"
  # set -x
  
  #use nvm to invoke the current node
  export NODE_COMMAND="nvm run $NODE_CURRENT_VERSION"
fi

$NODE_COMMAND "${SCRIPTS_DIR}/download-realm.js" ios --sync

exit 0
