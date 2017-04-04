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

shell.exec("adb shell \"logcat -c && logcat | grep -m 1 __REALM_REACT_ANDROID_TESTS_COMPLETED__\"");

shell.exec("adb pull /sdcard/tests.xml");