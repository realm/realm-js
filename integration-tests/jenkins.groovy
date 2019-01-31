
def reactNativeOnAndroid() {
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

def reactNativeOnIOS(Map args=[:]) {
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

def nodeJSOnMacOS(Map args=[:]) {
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
        dir('integration-tests/environments/node') {
          sh 'npm install'
          try {
            sh 'npm test -- --reporter mocha-junit-reporter'
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

def nodeJSOnLinux(Map args=[:]) {
  def nodeVersion = args.get('nodeVersion', '10')
  return {
    node('docker') {
      // Unstash the files in the repository
      unstash 'source'
      docker.image(
        "node:${nodeVersion}"
      ).inside(
        '-e HOME=/tmp' // NPM will create folders in ~/.npm
      ) {
        // Unstash the package produced when packaging
        dir('integration-tests') {
          unstash 'package'
        }
        // Install the packaged version of realm into the app and run the tests
        dir('integration-tests/environments/node') {
          sh 'npm install'
          try {
            sh 'npm test -- --reporter mocha-junit-reporter'
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

def electronOnLinux() {
  return {
    node('docker') {
      // Unstash the files in the repository
      unstash 'source'
      docker.build(
        'ci/realm-js:electron',
        // Based on node:10, installing xvbf
        '-f integration-tests/environments/electron/Dockerfile.android .'
      ).inside(
        '-e HOME=/tmp' // NPM will create folders in ~/.npm
      ) {
        // Unstash the package produced when packaging
        dir('integration-tests') {
          unstash 'package'
        }
        // Install the packaged version of realm into the app and run the tests
        dir('integration-tests/environments/electron') {
          sh 'npm install'
          // Run both main and renderer tests catching any errors
          def error = null;
          // First the main process
          try {
            // Using xvfb to allow Electron to open a window
            sh 'xvfb-run npm run test/main -- main-test-results.xml'
          } catch (Exception e) {
            error = e;
          }
          // Then the renderer process
          try {
            // Using xvfb to allow Electron to open a window
            sh 'xvfb-run npm run test/renderer -- renderer-test-results.xml'
          } catch (Exception e) {
            error = e;
          }
          // Archive all test results
          junit(
            allowEmptyResults: true,
            testResults: '*-test-results.xml',
          )
          // Throw any errors that might have occurred
          if (error) {
            throw error
          }
        }
      }
    }
  }
}

return this;
