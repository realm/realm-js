set -o pipefail

DIRECTORY=${1:-"."}

if [ ! -f "${DIRECTORY}/package.json" ]; then
    echo "No package.json in ${DIRECTORY}"
    exit 1
fi
VERSION=`cat ${DIRECTORY}/package.json | awk '/"react-native": "(.+)",/ { print substr($2, 2, length($2)-3) }'`

if [ -f "${DIRECTORY}/node_modules/react-native/package.json" ]; then
    CURRENT_VERSION=`cat ${DIRECTORY}/node_modules/react-native/package.json | awk '/"version": "(.+)",/ { print substr($2, 2, length($2)-3) }'`
fi

pushd $DIRECTORY
if [ "$VERSION" != "$CURRENT_VERSION" ]; then
    echo "Upgrading react-native to version $VERSION"
    npm install react-native
fi
popd

