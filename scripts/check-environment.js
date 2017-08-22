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

  const matches = verRegex.exec(npmVer);
  const majorVer = +matches[1];

  if (majorVer >= 5) {
    console.error(`Installed version of npm (${npmVer}) which uses symbolic links for local packages.`);
    console.error('This is currently incompatible with our tests. Please use npm version 4 or less');
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

  // Check ANDROID_NDK version
  exec('which ndk-build', (err, stdout) => {
    if(err) {
      console.error("Android NDK (ndk-build) not found");
      console.error(err.message);
      process.exit(-1);
    }

    const ndkBuildPath = stdout.trim();
    const ndkDirPath = path.dirname(ndkBuildPath);
    const releaseTxtPath = path.join(ndkDirPath, "RELEASE.TXT");

    exec(`grep ^r10e ${releaseTxtPath}`, (err, stdout) => {
      if(err) {
        // RELEASE.TXT doesn't exist or version mismatch
        console.error("Incompatible Android NDK version found. NDK 10e is required.")
        process.exit(-1);
      }

      successLog('Android NDK 10e found');
    });
  });

  // TODO: Check SDK for Android, and XCode for iOS.
  
});
