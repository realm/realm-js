#!/bin/bash

node_versions=${@:-4.4.7 5.12.0 6.5.0 7.0.0}

topdir=$(cd $(dirname "$0")/..; pwd)

die() {
  echo $1
  exit 1
}

mkdir -p ${topdir}/out
: ${NVM_DIR=$topdir/.nvm}

if [ ! -d "$NVM_DIR" ]; then
  (
    git clone https://github.com/creationix/nvm.git "$NVM_DIR"
    cd "$NVM_DIR"
    git checkout `git describe --abbrev=0 --tags --match "v[0-9]*" origin`
  )
fi

if [ -f "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
else
  # we must be on mac and nvm was installed with brew
  # TODO: change the mac slaves to use manual nvm installation
  . "$(brew --prefix nvm)/nvm.sh"
fi

for node_version in ${node_versions}; do
  (
    rm -rf node_modules build

    nvm install ${node_version} || die "Could not install nodejs v${node_version}"
    nvm use ${node_version} || die "Could not load nodejs v${node_version}"

    npm install --build-from-source "$EXTRA_NPM_ARGUMENTS" || die "Could not build module"
    #./scripts/test.sh node || die "Unit tests for nodejs v${node_version} failed"
    ./node_modules/.bin/node-pre-gyp package || die "Could not package module"
    cp build/stage/node-pre-gyp/*.tar.gz ${topdir}/out/
  )
done

