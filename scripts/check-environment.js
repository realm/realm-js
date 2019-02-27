'use strict';

const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

console.log('Checking setup...');

function successLog(msg) {
  console.log(` \x1b[32m✓\x1b[0m ${msg}`);
}

function validateEnvPath(envKey) {
  if (process.env.hasOwnProperty(envKey)) {
    const resolvedPath = path.resolve(process.env[envKey]);
    if (process.env[envKey].indexOf('~') !== -1 || resolvedPath !== process.env[envKey]) {
      console.error(`The ${envKey} environment variable is set to ${process.env[envKey]}.`)
      console.error('Since gyp doesn\'t expand user- and relative paths, this path will not work. Please use a fully resolved path');
      process.exit(-1);
    }

    successLog(`${envKey} set to ${process.env[envKey]}`);
  } else {
    successLog(`${envKey} not set, downloading binaries`);
  }
}

exec('npm --version', (err, stdout) => {
  const verRegex = /^(\d+\.)?(\d+\.)?(\*|\d+)$/;
  const npmVer = stdout.trim();
  if (!verRegex.test(npmVer)) {
    console.error(`npm --version returned '${npmVer}. Is Node installed?`);
    process.exit(-1);
  }
  successLog(`npm version is ${npmVer}`);

  const objectStoreDir = path.join(__dirname, '..', 'src', 'object-store');
  if (fs.existsSync(objectStoreDir)) {
    successLog('Object store submodule is checked out');
  } else {
    console.error('Object store folder not found. Did you remember to pull submodules?')
  }

  validateEnvPath('REALM_CORE_PREFIX');
  validateEnvPath('REALM_SYNC_PREFIX');

  // TODO: Check ANDROID_NDK and SDK for Android, and XCode for iOS.

});
