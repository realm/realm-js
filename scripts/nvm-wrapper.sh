#!/bin/bash

usage() {
cat <<EOF
Usage: bash $0 nodeVersion command [arguments]
This will use nvm to setup node with the version given as and argument and then run your command.
Example: bash $0 v4 npm test 
EOF
}

die() {
  echo "Error: $1"
  exit 1
}

if [[ $# -lt 2 ]]; then
  usage
  exit 1
fi

if [ "$(uname)" = 'Darwin' ]; then
  source "$(brew --prefix nvm)/nvm.sh"
else
  source $NVM_DIR/nvm.sh
fi

node_version=$1
shift

npm config delete prefix
nvm install $node_version || die "Could not install node $node_version"

nvm use $node_version || die "Could not install node $node_version"

yarn=$(which yarn)
if [ "$yarn" = "" ]; then
  npm install -g yarn || die "Could not install yarn"
fi

exec $@
