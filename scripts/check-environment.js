'use strict';

const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

console.log('Checking setup...');

function successLog(msg) {
  console.log(` \x1b[32m✓\x1b[0m ${msg}`);
}

exec('npm --version', (err, stdout) => {
  const verRegex = /^(\d+\.)?(\d+\.)?(\*|\d+)$/;
  const npmVer = stdout.trim();
  if (!verRegex.test(npmVer)) {
    console.error(`npm --version returned '${npmVer}. Is Node installed?`);
    process.exit(-1);
  }
  successLog(`npm version is ${npmVer}`);

  const objectStoreDir = path.join(__dirname, '..', 'vendor', 'realm-core');
  if (fs.existsSync(objectStoreDir)) {
    successLog('Realm Core submodule is checked out');
  } else {
    console.error('Realm Core folder not found. Did you remember to pull submodules?')
  }

  // TODO: Check ANDROID_NDK and SDK for Android, and XCode for iOS.

});
