////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

'use strict';

const fs = require('fs');
const path = require('path');
const exec = require('child_process').execFileSync;

const dependencies = ini(fs.readFileSync(path.resolve(__dirname, '../dependencies.list'), 'utf8'));
console.log(`Core version: ${dependencies.REALM_CORE_VERSION}`);
console.log(`Sync version: ${dependencies.REALM_SYNC_VERSION}`);

if ('REALM_BUILD_ANDROID' in process.env) {
    const gradlew = process.platform === 'win32' ? 'gradlew.bat' : 'gradlew';
    const androidPath = path.resolve(__dirname, '../react-native/android');

    exec(`${androidPath}/${gradlew}`, ['publishAndroid'], { cwd: androidPath, stdio: 'inherit' });
}

function ini(string) {
    const result = Object.create(null);
    for (const line of string.split(/\r?\n/)) {
        const parts = line.split('=');
        result[parts[0]] = parts[1];
    }

    return result;
}