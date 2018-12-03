#!/bin/sh

node_version="8.3.0"

function parseVersion() {
    # major
    eval $2=$(echo $1 | cut -d. -f1 | cut -c2-)
    # minor
    eval $3=$(echo $1 | cut -d. -f2)
    # patch
    eval $4=$(echo $1 | cut -d. -f3)
}

function versionLT() {
    local major_A=0
    local minor_A=0
    local patch_A=0

    local major_B=0
    local minor_B=0
    local patch_B=0

    parseVersion $1 major_A minor_A patch_A
    parseVersion $2 major_B minor_B patch_B

    if [ $major_A -lt $major_B ]; then
        return 1
    fi

    if [ $major_A -eq $major_B -a $minor_A -lt $minor_B ]; then
        return 1
    fi

    if [ $major_A -eq $major_B -a $minor_A -eq $minor_B -a $patch_A -lt $patch_B ]; then
        return 1
    fi

    return 0
}

if [[ -d "$HOME/.asdf/shims" ]]; then
    export PATH=$HOME/.asdf/shims:$PATH
fi

if [[ -d "$HOME/.n" ]]; then
    export N_PREFIX="$HOME/.n"; [[ :$PATH: == *":$N_PREFIX/bin:"* ]] || PATH+=":$N_PREFIX/bin"
fi

[ -z "$NVM_DIR" ] && export NVM_DIR="$HOME/.nvm"

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
    . "$HOME/.nvm/nvm.sh"
elif [[ -x "$(command -v brew)" && -s "$(brew --prefix nvm)/nvm.sh" ]]; then
    . "$(brew --prefix nvm)/nvm.sh"
fi

# Hack to help Realm CI; xcode doesn't inherit nvm
if [[ ! -z "$(command -v nvm)" ]]; then
    nvm use ${REALM_CI_NODE_VERSION}
fi

if [ -z "$(command -v node)" ]; then
    echo "Realm JavaScript requires node installed. Either install node or use a node version mananger (n or nvm)."
    exit 1
fi

versionLT "$(node --version)" "v${node_version}"
if [ $? -eq 1 ]; then
    echo "Realm JavaScript requires node v${node_version} - found $(node --version) in $(command -v node)"
    exit 1
fi

node ../scripts/download-realm.js ios --sync
