// Change the working directory before importing ROS because the version of
// realm-js used by ROS captures the working directory on load (this has since
// been fixed)
const tmp = require('tmp');
const dataDir = tmp.dirSync().name;
process.chdir(dataDir);

const ROS = require('realm-object-server');
const NodeRSA = require('node-rsa');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Bypass the mandatory email prompt.
process.env.ROS_TOS_EMAIL_ADDRESS = 'ci@realm.io';
process.env.DOCKER_DATA_PATH = '/tmp';

// Don't bother calling fsync() because we're throwing away all the files
// between runs anyway
process.env.REALM_DISABLE_SYNC_TO_DISK = 'true';

// Workaround for <https://github.com/realm/realm-object-server-private/issues/950>.
process.env.ROS_SUPERAGENT_RETRY_DELAY = '0';

// Enable timestamps in the logs
process.env.ROS_LOG_TIMESTAMP = '1';

if (!process.env.SYNC_WORKER_FEATURE_TOKEN) {
    try {
        require(os.homedir() + '/.ros-feature-token.js');
    }
    catch (e) {
        console.error('ROS feature token not found. Running Object Server tests requires setting the SYNC_WORKER_FEATURE_TOKEN environment variable.');
        process.exit(1);
    }
}

fs.mkdirSync(`${dataDir}/keys`);
const jwtKey = new NodeRSA({b: 1024});
fs.writeFileSync(`${dataDir}/keys/jwt.pem`, jwtKey.exportKey('private'));

const server = new ROS.BasicServer();
server.start({
    // The desired logging threshold. Can be one of: all, trace, debug, detail, info, warn, error, fatal, off)
    logLevel: process.env.ROS_LOG_LEVEL || 'off',

    // For all the full list of configuration parameters see:
    // https://realm.io/docs/realm-object-server/latest/api/ros/interfaces/serverconfig.html

    address: '0.0.0.0',
    port: 9080,

    dataPath: dataDir,
    authProviders: [
        new ROS.auth.AnonymousAuthProvider(),
        new ROS.auth.NicknameAuthProvider(),
        new ROS.auth.DebugAuthProvider(),
        new ROS.auth.PasswordAuthProvider({
            autoCreateAdminUser: true,
        }),
        new ROS.auth.JwtAuthProvider({
            publicKey: jwtKey.exportKey('public')
        }),
    ],
    autoKeyGen: true,
}).then(() => {
    console.log(`Started: ${dataDir}`);
    fs.closeSync(1);
}).catch(err => {
    console.error(`Error starting Realm Object Server: ${err.message}`)
});
