////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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

def onAndroid() {
  return {
    node('docker && android') {
      // Unstash the files in the repository
      unstash 'source'
      // Build the image and run inside of it (again)
      docker.build(
        'ci/realm-js:android-build',
        '-f Dockerfile.android .'
      ).inside(
        // Mounting ~/.android/adbkey(.pub) to reuse the adb keys
        // Mounting ~/gradle-cache as ~/.gradle to prevent gradle from being redownloaded
        // Mounting ~/ccache as ~/.ccache to reuse the C-Cache across builds
        // Mounting /dev/bus/usb with --privileged to allow connecting to the device via USB
        "-v ${HOME}/.android/adbkey:/home/jenkins/.android/adbkey:ro -v ${HOME}/.android/adbkey.pub:/home/jenkins/.android/adbkey.pub:ro -v ${HOME}/gradle-cache:/home/jenkins/.gradle -v ${HOME}/ccache:/home/jenkins/.ccache -v /dev/bus/usb:/dev/bus/usb --privileged"
      ) {
        // Locking the Android device to prevent other jobs from interfering
        lock("${NODE_NAME}-android") {
          dir('integration-tests') {
            unstash 'package'
          }
          // Install the packaged version of realm into the app and run the tests
          dir('integration-tests/environments/react-native') {
            // Installing the package will also pack up the tests and install them together with the Realm JS package
            sh 'npm install'
            try {
              // Wait for the device
              timeout(15) { // minutes
                  // In case the tests fail, it's nice to have an idea on the devices attached to the machine
                  sh 'adb devices'
                  sh 'adb wait-for-device'
              }
              // Uninstall any other installations of this package before trying to install it again
              sh 'adb uninstall io.realm.tests.reactnative || true' // '|| true' to prevent a build failure
              sh 'npm run test/android -- test-results.xml'
            } finally {
              junit(
                allowEmptyResults: true,
                testResults: 'test-results.xml',
              )
              // Read out the logs in case we want some more information to debug from
              sh 'adb logcat -d -s ReactNativeJS:*'
            }
          }
        }
      }
    }
  }
}

def onIOS(Map args=[:]) {
  def nodeVersion = args.get('nodeVersion', '10')
  return {
    node('macos') {
      // Unstash the files in the repository
      unstash 'source'
      nvm(nodeVersion) {
        // Unstash the package produced when packaging
        dir('integration-tests') {
          unstash 'package'
        }
        // Install the packaged version of realm into the app and run the tests
        dir('integration-tests/environments/react-native') {
          // Installing the package will also pack up the tests and install them together with the Realm JS package
          sh 'npm install'
          try {
            sh 'npm run test/ios -- test-results.xml'
          } finally {
            junit(
              allowEmptyResults: true,
              testResults: 'test-results.xml',
            )
          }
        }
      }
    }
  }
}

return this
