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

var shell = require("shelljs");

shell.set("-e");

shell.pushd("./tests/react-test-app");

shell.exec("npm install");

if (process.platform !== "win32") { 
    shell.env["PATH"] = "/opt/android-sdk-linux/platform-tools:$PATH"
}

if (shell.env["REALM_BUILD_ANDROID"]) {
    shell.echo("Realm is already installed");
} else {
    shell.env["REALM_BUILD_ANDROID"] = 1;
    shell.exec("npm install realm");
    shell.exec("npm install realm-tests");
}

shell.cp("../../src/object-store/tests/query.json", "node_modules/realm-tests/query-tests.json");

shell.echo("Uninstalling old apk");
shell.exec("adb uninstall io.realm.react.testapp");

shell.set("+e");
shell.echo("Reversing port for physical device");
shell.exec("adb reverse tcp:8081 tcp:8081");

shell.echo("Reversing port for Realm Object Server");
shell.exec("adb reverse tcp:9080 tcp:9080");

shell.set("-e");

shell.echo("Building Release APK");
shell.pushd("android");
shell.exec("gradlew assembleRelease");

shell.echo("Installing APK");
shell.exec("adb install app/build/outputs/apk/app-release.apk");

shell.echo("Starting the Main Activity");
shell.exec("adb shell am start -n io.realm.react.testapp/.MainActivity");

shell.popd();

shell.exec("adb shell \"logcat -c && logcat | grep -m 1 __REALM_JS_TESTS_COMPLETED__\"");

shell.exec("adb pull /sdcard/tests.xml");